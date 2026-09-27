'use server';

import { cookies } from 'next/headers';
import { paymentProofSubmissionSchema } from '../validation/schemas';
import { OrderStatusService } from '../domain/orders/OrderStatusService';
import { RBACService } from '../domain/auth/RBACService';
import { AuthService } from '../domain/auth/AuthService';
import { RoleName } from '../types';
import { CommerceRepository } from '../lib/commerce-repository';
import { dispatchEmailSafely, EmailService } from '@/services/email/EmailService';
import { dispatchOrderStatusEmail } from '@/services/email/order-notifications';

/**
 * Server Action: Customer submits payment proof (Bank transfer reference, wire slip, or Crypto TXID).
 * Protected against IDOR: requires authenticated ownership or valid guest lookup credentials.
 */
export async function submitPaymentProofAction(rawInput: unknown) {
  try {
    const validated = paymentProofSubmissionSchema.parse(rawInput);
    const { orderId, referenceOrTxid, senderAccountName, proofFileUrl, lookupToken, guestEmail } = validated;

    const order = await CommerceRepository.findOrderByIdOrNumber(orderId);
    if (!order) {
      return { success: false, error: 'Order not found.' };
    }

    // Ownership & IDOR Verification
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('fb_session')?.value;
    let isAuthorized = false;

    if (sessionToken) {
      const session = AuthService.verifySessionToken(sessionToken);
      if (session) {
        if (
          (order.customerId && session.id === order.customerId) ||
          (order.guestEmail && session.email.toLowerCase() === order.guestEmail.toLowerCase())
        ) {
          isAuthorized = true;
        }
      }
    }

    // Guest verification fallback
    if (!isAuthorized) {
      if (lookupToken && lookupToken === order.lookupToken) {
        isAuthorized = true;
      } else if (guestEmail && guestEmail.trim().toLowerCase() === order.guestEmail.toLowerCase()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Forbidden: You are not authorized to submit payment proof for this order.',
      };
    }

    if (proofFileUrl && /^https?:\/\//i.test(proofFileUrl)) {
      return { success: false, error: 'Payment evidence cannot use a public URL.' };
    }

    const existingOrders = await CommerceRepository.getAllOrders();
    if (existingOrders.some((existing) => existing.id !== order.id && existing.paymentReference === referenceOrTxid)) {
      return { success: false, error: 'Duplicate payment reference.' };
    }

    // Validate that order can transition from PENDING_PAYMENT to PAYMENT_SUBMITTED by CUSTOMER
    const transitionCheck = OrderStatusService.canRolePerformTransition({
      fromStatus: order.status,
      toStatus: 'PAYMENT_SUBMITTED',
      userRole: 'CUSTOMER',
    });

    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason || 'Status transition not allowed.' };
    }

    order.paymentReference = referenceOrTxid;
    order.proofFileUrl = proofFileUrl;

    await CommerceRepository.updateOrderStatus(
      order.id,
      'PAYMENT_SUBMITTED',
      'CUSTOMER',
      order.customerId || 'GUEST',
      `Payment reference submitted: ${referenceOrTxid}${senderAccountName ? ` (Account: ${senderAccountName})` : ''}`
    );

    await dispatchEmailSafely('payment_proof_submitted', () =>
      EmailService.sendPaymentProofSubmitted(order, referenceOrTxid)
    );

    CommerceRepository.logAudit({
      action: 'PAYMENT_PROOF_SUBMITTED',
      entityType: 'Order',
      entityId: order.id,
      actorRole: 'CUSTOMER',
      actorId: order.customerId || 'GUEST',
      metadata: JSON.stringify({ reference: referenceOrTxid, sender: senderAccountName }),
    });

    return {
      success: true,
      message: 'Payment proof submitted successfully. Your payment is pending administrative audit.',
      status: 'PAYMENT_SUBMITTED',
      referenceOrTxid,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Payment proof submission failed' };
  }
}

export interface VerifyPaymentInput {
  orderId: string;
  targetStatus: 'PAYMENT_VERIFIED' | 'CANCELLED';
  actorRole: RoleName;
  actorId: string;
  notes?: string;
  submittedAmount?: number | null;
}

/**
 * Server Action: Finance Manager or Super Admin confirms payment match.
 */
export async function verifyPaymentStatusAction(input: VerifyPaymentInput) {
  try {
    const { orderId, targetStatus, actorRole, actorId, notes } = input;

    // Strict RBAC permission verification
    const hasOrderPermission =
      RBACService.hasPermission(actorRole, 'orders:verify_payment') ||
      RBACService.hasPermission(actorRole, 'orders:status:edit') ||
      actorRole === 'SUPER_ADMIN' ||
      actorRole === 'FINANCE_MANAGER';

    if (!hasOrderPermission) {
      return { success: false, error: `Role ${actorRole} does not possess authority to verify payments.` };
    }

    const order = await CommerceRepository.findOrderByIdOrNumber(orderId);
    if (!order) {
      return { success: false, error: `Order ${orderId} not found.` };
    }

    if (order.status === 'PAYMENT_VERIFIED' && targetStatus === 'PAYMENT_VERIFIED') {
      return {
        success: true,
        message: `Order ${order.orderNumber} is already verified.`,
        orderId: order.id,
        newStatus: 'PAYMENT_VERIFIED',
        idempotent: true,
      };
    }

    if (input.submittedAmount != null && input.submittedAmount !== order.totalAmount) {
      return { success: false, error: 'AMOUNT_MISMATCH' };
    }

    if (targetStatus === 'CANCELLED' && !notes?.trim()) {
      return { success: false, error: 'Rejection requires a reason.' };
    }

    const previousStatus = order.status;

    // Finite State Machine verification
    const transitionCheck = OrderStatusService.canRolePerformTransition({
      fromStatus: order.status,
      toStatus: targetStatus,
      userRole: actorRole,
    });

    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason || 'Status transition rejected by State Machine' };
    }

    order.paymentVerifiedAt = new Date().toISOString();
    order.paymentVerifiedBy = actorRole;

    await CommerceRepository.updateOrderStatus(
      order.id,
      targetStatus,
      actorRole,
      actorId,
      notes || `Payment audited and confirmed by ${actorRole}`
    );

    await dispatchOrderStatusEmail(order, targetStatus, {
      previousStatus,
      reason: notes,
    });

    CommerceRepository.logAudit({
      action: 'PAYMENT_VERIFIED',
      entityType: 'Order',
      entityId: order.id,
      actorRole,
      actorId,
      metadata: JSON.stringify({ verifiedTo: targetStatus, note: notes }),
    });

    return {
      success: true,
      message: `Order ${order.orderNumber} successfully marked as ${targetStatus}.`,
      orderId: order.id,
      newStatus: targetStatus,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Payment verification failed' };
  }
}
