'use server';

export const maxDuration = 60;

import { cookies } from 'next/headers';
import { createOrderSchema, guestOrderLookupSchema, orderStatusTransitionSchema } from '../validation/schemas';
import { OrderCreationService } from '../domain/orders/OrderCreationService';
import { GuestOrderService } from '../domain/orders/GuestOrderService';
import { OrderStatusService } from '../domain/orders/OrderStatusService';
import { RBACService } from '../domain/auth/RBACService';
import { AuthService } from '../domain/auth/AuthService';
import { CommerceRepository, DbOrder } from '../lib/commerce-repository';
import { OrderStatus, RoleName } from '../types';
import { ensureAdminOverridesLoaded } from '@/domain/admin/AdminOverrideStore';
import { RateLimiterService } from '@/lib/rate-limiter';

/**
 * Server Action: Atomically creates an order with full server-authoritative calculations,
 * stock reservation, and payment instruction generation.
 */
export async function createOrderAction(rawInput: unknown) {
  try {
    ensureAdminOverridesLoaded();
    const validated = createOrderSchema.parse(rawInput);
    const limited = await RateLimiterService.enforce('public_order_creation', validated.shippingAddress.email);
    if (!limited.allowed) return { success: false, error: limited.error };
    const result = await OrderCreationService.createOrder({
      items: validated.items,
      currency: validated.currency,
      shippingAddress: validated.shippingAddress,
      shippingMethodCode: validated.shippingMethodCode,
      paymentMethodCode: validated.paymentMethodCode,
      couponCode: validated.couponCode,
      customerNotes: validated.customerNotes,
    });

    return {
      success: true,
      data: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        lookupToken: result.order.lookupToken,
        lookupUrl: result.lookupUrl,
        status: result.order.status,
        currency: result.order.currency,
        subtotalAmount: result.order.subtotalAmount,
        shippingAmount: result.order.shippingAmount,
        discountAmount: result.order.discountAmount,
        totalAmount: result.order.totalAmount,
        shippingOriginHub: result.order.shippingOriginHub,
        paymentMethodCode: result.order.paymentMethodCode,
        paymentInstructions: result.paymentInstructions,
        items: result.order.items,
        shippingAddress: result.order.shippingAddress,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Order creation failed' };
  }
}

/**
 * Server Action: Secure Guest / Customer Order Lookup.
 * Enforces dual-factor protection: requires either a signed lookup token OR matching orderNumber + email.
 */
export async function lookupOrderAction(input: {
  token?: string;
  orderNumber?: string;
  email?: string;
}) {
  try {
    if (!input.token && (!input.orderNumber || !input.email)) {
      return { success: false, error: 'Please provide both your order reference and email address.' };
    }
    const lookupKey = input.email || input.orderNumber || 'token';
    const limited = await RateLimiterService.enforce('guest_order_lookup', lookupKey);
    if (!limited.allowed) return { success: false, error: limited.error };

    if (input.orderNumber && input.email) {
      guestOrderLookupSchema.parse({
        orderNumber: input.orderNumber,
        email: input.email,
      });
    }

    const { order, error } = await GuestOrderService.secureLookup(input);
    if (!order || error) {
      return { success: false, error: error || 'Order not found or credentials do not match.' };
    }

    return {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        currency: order.currency,
        subtotalAmount: order.subtotalAmount,
        shippingAmount: order.shippingAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        shippingMethodCode: order.shippingMethodCode,
        shippingAddress: order.shippingAddress,
        items: order.items,
        paymentMethodCode: order.paymentMethodCode,
        paymentReference: order.paymentReference,
        trackingNumber: order.trackingNumber,
        statusHistory: order.statusHistory?.map((h) => ({
          fromStatus: h.fromStatus,
          toStatus: h.toStatus,
          createdAt: h.createdAt,
        })),
        createdAt: order.createdAt,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Order lookup failed' };
  }
}

/**
 * Server Action: Retrieves all orders for an authenticated customer.
 * IDOR Protected: strictly binds to the caller's verified cryptographic session.
 */
export async function getCustomerOrdersAction(customerIdOrEmail?: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('fb_session')?.value;
    if (!token) {
      return { success: false, orders: [], error: 'Authentication required to access customer orders.' };
    }

    const session = AuthService.verifySessionToken(token);
    if (!session) {
      return { success: false, orders: [], error: 'Invalid or expired session token.' };
    }

    // IDOR Protection: Caller can NEVER query another customer's orders
    if (
      customerIdOrEmail &&
      customerIdOrEmail.trim().toLowerCase() !== session.email.toLowerCase() &&
      customerIdOrEmail !== session.id
    ) {
      return {
        success: false,
        orders: [],
        error: 'Forbidden: You cannot access order records belonging to another customer.',
      };
    }

    const orders = await CommerceRepository.findCustomerOrders(session.email);
    return { success: true, orders };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve orders' };
  }
}

/**
 * Server Action: Admin portal order listing.
 */
export async function getAllOrdersAdminAction(actorRole: RoleName = 'SUPER_ADMIN') {
  try {
    const hasPermission = RBACService.hasPermission(actorRole, 'orders:read');
    if (!hasPermission) {
      return { success: false, error: `Role ${actorRole} unauthorized for order management.` };
    }

    const orders = await CommerceRepository.getAllOrders();
    return { success: true, orders };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to retrieve admin orders' };
  }
}

/**
 * Server Action: Administrative order status transition with state machine & RBAC enforcement.
 */
export async function updateOrderStatusAdminAction(input: {
  orderId: string;
  newStatus: OrderStatus;
  actorRole: RoleName;
  actorId: string;
  note?: string;
  trackingNumber?: string;
  carrierName?: string;
}) {
  try {
    const validated = orderStatusTransitionSchema.parse({
      orderId: input.orderId,
      newStatus: input.newStatus,
      actorRole: input.actorRole,
      actorId: input.actorId,
      note: input.note,
    });

    const order = await CommerceRepository.findOrderByIdOrNumber(input.orderId);
    if (!order) {
      return { success: false, error: `Order ${input.orderId} not found.` };
    }

    // Finite State Machine & Role Guard
    const guard = OrderStatusService.canRolePerformTransition({
      fromStatus: order.status,
      toStatus: validated.newStatus,
      userRole: validated.actorRole,
    });

    if (!guard.allowed) {
      return { success: false, error: guard.reason || 'Status transition not permitted.' };
    }

    if (input.trackingNumber) {
      order.trackingNumber = input.trackingNumber.trim();
    }
    if (input.carrierName) {
      order.carrierName = input.carrierName.trim();
    }

    const previousStatus = order.status;

    const updated = await CommerceRepository.updateOrderStatus(
      order.id,
      validated.newStatus,
      validated.actorRole,
      validated.actorId,
      validated.note
    );

    const { dispatchOrderStatusEmail } = await import('@/services/email/order-notifications');
    await dispatchOrderStatusEmail(order, validated.newStatus, {
      previousStatus,
      reason: validated.note,
    });

    CommerceRepository.logAudit({
      action: 'ORDER_STATUS_CHANGED',
      entityType: 'Order',
      entityId: order.id,
      actorRole: validated.actorRole,
      actorId: validated.actorId,
      metadata: JSON.stringify({ from: order.status, to: validated.newStatus, note: validated.note }),
    });

    return {
      success: true,
      order: updated,
      message: `Order transitioned from ${order.status} to ${validated.newStatus}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Status transition failed' };
  }
}
