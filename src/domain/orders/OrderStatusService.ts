// ===================================================
// FUSION MUSHROOM BARS EU - ORDER STATUS SERVICE
// Strict Finite State Machine & RBAC Transition Guard
// ===================================================

import { OrderStatus, RoleName } from '@/types';

export interface TransitionContext {
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  userRole: RoleName | 'SYSTEM' | 'CUSTOMER';
}

export class OrderStatusService {
  // Canonical state graph transitions
  private static readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    DRAFT: ['PENDING_PAYMENT', 'CANCELLED'],
    PENDING_PAYMENT: ['PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'CANCELLED'],
    PAYMENT_SUBMITTED: ['PAYMENT_VERIFIED', 'PENDING_PAYMENT', 'CANCELLED'],
    PAYMENT_VERIFIED: ['PROCESSING', 'REFUNDED'],
    PROCESSING: ['SHIPPED', 'CANCELLED', 'REFUNDED'],
    SHIPPED: ['DELIVERED', 'REFUNDED'],
    DELIVERED: ['REFUNDED'],
    CANCELLED: [], // Terminal
    REFUNDED: [],  // Terminal
  };

  /**
   * Validates whether an order in a given state can be cancelled.
   * Allowed ONLY in DRAFT, PENDING_PAYMENT, PAYMENT_SUBMITTED, or PROCESSING (prior to dispatch/shipping).
   * Once SHIPPED or DELIVERED, order cannot be cancelled.
   */
  static canOrderBeCancelled(status: OrderStatus): boolean {
    return ['DRAFT', 'PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PROCESSING'].includes(status);
  }

  /**
   * Validates whether an order can be refunded.
   * STRICT RULE: Cannot refund DRAFT, PENDING_PAYMENT, or PAYMENT_SUBMITTED (unconfirmed funds).
   * Only orders with verified payment (PAYMENT_VERIFIED, PROCESSING, SHIPPED, DELIVERED) can be refunded.
   */
  static canOrderBeRefunded(status: OrderStatus): boolean {
    return ['PAYMENT_VERIFIED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status);
  }

  /**
   * Validates whether a requested transition is structurally permitted.
   */
  static isTransitionAllowed(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) return true; // Idempotent
    const allowedTargets = this.ALLOWED_TRANSITIONS[from];
    return allowedTargets ? allowedTargets.includes(to) : false;
  }

  /**
   * Validates whether the actor's role is authorized to perform the state change.
   */
  static canRolePerformTransition(context: TransitionContext): { allowed: boolean; reason?: string } {
    const { fromStatus, toStatus, userRole } = context;

    // Cancellation check
    if (toStatus === 'CANCELLED' && !this.canOrderBeCancelled(fromStatus)) {
      return {
        allowed: false,
        reason: `Order in status ${fromStatus} cannot be cancelled as it has already entered dispatch or terminal state.`,
      };
    }

    // Refund check
    if (toStatus === 'REFUNDED' && !this.canOrderBeRefunded(fromStatus)) {
      return {
        allowed: false,
        reason: `Order in status ${fromStatus} cannot be refunded as payment has not been confirmed.`,
      };
    }

    // The operations desk is Super Admin and may advance a saved order
    // straight to the status selected in the admin form.
    if (userRole === 'SUPER_ADMIN') {
      return { allowed: true };
    }

    if (!this.isTransitionAllowed(fromStatus, toStatus)) {
      return {
        allowed: false,
        reason: `Illegal state transition from ${fromStatus} to ${toStatus}.`,
      };
    }

    // Customer can only submit payment proof
    if (userRole === 'CUSTOMER') {
      if (fromStatus === 'PENDING_PAYMENT' && toStatus === 'PAYMENT_SUBMITTED') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Customers are not permitted to alter administrative order states.',
      };
    }

    // System can transition automatically (e.g. timeout cancellation)
    if (userRole === 'SYSTEM') {
      return { allowed: true };
    }

    // Finance Manager can verify payment or flag rejection / process refunds
    if (userRole === 'FINANCE_MANAGER') {
      if (['PAYMENT_VERIFIED', 'PENDING_PAYMENT', 'CANCELLED', 'REFUNDED'].includes(toStatus)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Finance managers only manage payment verification and refund states.',
      };
    }

    // Order Manager can process and dispatch shipments
    if (userRole === 'ORDER_MANAGER') {
      if (['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(toStatus)) {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Order managers cannot directly confirm payment without financial clearance.',
      };
    }

    return {
      allowed: false,
      reason: `Role ${userRole} is unauthorized for this order transition.`,
    };
  }
}
