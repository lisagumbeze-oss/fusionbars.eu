// Payment decisions stay separate from product readiness. Amounts come from the order.

import { RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';
import { PublicationReadinessService } from '@/domain/catalog/PublicationReadinessService';
import { DestinationEngine } from '@/domain/shipping/DestinationEngine';

export type PaymentDecision = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

interface Attempt {
  id: string;
  orderNumber: string;
  reference: string;
  state: PaymentDecision;
  expectedAmount: number;
  submittedAmount: number | null;
  evidenceKey: string | null;
  history: Array<{ at: string; from: PaymentDecision | null; to: PaymentDecision; actor: string; reason: string }>;
  notificationSent: Record<string, boolean>;
}

const PUBLIC_URL = /^https?:\/\//i;

export class PaymentVerificationService {
  private static attempts: Attempt[] = [];
  private static references = new Set<string>();
  private static transactionHashes = new Set<string>();
  private static events: string[] = [];

  static resetForTests(): void {
    this.attempts = [];
    this.references.clear();
    this.transactionHashes.clear();
    this.events = [];
  }

  static authoritativeAmount(orderTotal: number, clientAmount: number | null): number {
    if (!Number.isInteger(orderTotal) || orderTotal <= 0) throw new Error('Order total is not payable.');
    if (clientAmount != null && clientAmount !== orderTotal) throw new Error('Payment amount is not accepted from the client.');
    return orderTotal;
  }

  static assertReceivingAddress(configured: string, clientAddress: string | null): string {
    if (clientAddress && clientAddress !== configured) throw new Error('Receiving address cannot be changed by the client.');
    return configured;
  }

  static assertPayable(order: { status: string; slug?: string; country?: string }): void {
    if (['CANCELLED', 'REFUNDED', 'DRAFT', 'DELIVERED'].includes(order.status)) {
      throw new Error('This order is not payable.');
    }
    if (order.status === 'PAYMENT_VERIFIED') throw new Error('This order is already paid.');
    if (order.slug) {
      const publication = PublicationReadinessService.customerPurchaseDecision(order.slug);
      if (!publication.allowed) throw new Error(publication.customerMessage);
      if (order.country) {
        const destination = DestinationEngine.evaluate({ slug: order.slug, country: order.country });
        if (destination.blockCheckout && !destination.unresolved) throw new Error(destination.customerMessage);
      }
    }
  }

  static registerProof(params: { orderNumber: string; reference: string; expectedAmount: number; submittedAmount?: number | null; evidenceKey?: string | null; transactionHash?: string | null }): Attempt {
    if (PUBLIC_URL.test(params.evidenceKey || '')) throw new Error('Payment evidence cannot use a public URL.');
    if (this.references.has(params.reference)) throw new Error('Duplicate payment reference.');
    const hash = params.transactionHash?.trim().toLowerCase();
    if (hash && this.transactionHashes.has(hash)) throw new Error('Duplicate transaction reference.');
    const attempt: Attempt = {
      id: `pay-${this.attempts.length + 1}`,
      orderNumber: params.orderNumber,
      reference: params.reference,
      state: 'SUBMITTED',
      expectedAmount: params.expectedAmount,
      submittedAmount: params.submittedAmount ?? null,
      evidenceKey: params.evidenceKey || null,
      history: [{ at: new Date().toISOString(), from: null, to: 'SUBMITTED', actor: 'CUSTOMER', reason: 'Proof submitted' }],
      notificationSent: { PaymentProofSubmitted: true },
    };
    this.references.add(params.reference);
    if (hash) this.transactionHashes.add(hash);
    this.attempts.push(attempt);
    this.events.push('PaymentProofSubmitted');
    return attempt;
  }

  static review(params: { orderNumber: string; actor: string; role: RoleName; decision: 'VERIFIED' | 'REJECTED'; submittedAmount?: number | null; reason?: string; idempotencyKey?: string }): { state: PaymentDecision; code?: 'AMOUNT_MISMATCH'; idempotent?: boolean; notified?: boolean; previousEvidence?: string | null; expected?: number; submitted?: number; difference?: number } {
    if (!RBACService.hasPermission(params.role, 'orders:verify_payment') && params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') {
      throw new Error('Unauthorized payment verification.');
    }
    const attempt = [...this.attempts].reverse().find((row) => row.orderNumber === params.orderNumber);
    if (!attempt) throw new Error('No payment attempt exists for this order.');
    if (attempt.state === 'VERIFIED' && params.decision === 'VERIFIED') {
      return { state: 'VERIFIED' as const, idempotent: true, notified: false };
    }
    if (params.decision === 'VERIFIED') {
      if (!params.reason?.trim()) throw new Error('Verification requires a reviewer note.');
      if (params.submittedAmount != null && params.submittedAmount !== attempt.expectedAmount) {
        this.events.push('AmountMismatch');
        return { state: attempt.state, code: 'AMOUNT_MISMATCH' as const, expected: attempt.expectedAmount, submitted: params.submittedAmount, difference: params.submittedAmount - attempt.expectedAmount };
      }
      this.move(attempt, 'VERIFIED', params.actor, params.reason);
      if (!attempt.notificationSent.PaymentVerified) {
        attempt.notificationSent.PaymentVerified = true;
        this.events.push('PaymentVerified');
      }
      return { state: 'VERIFIED' as const, idempotent: false, notified: true };
    }
    if (!params.reason?.trim()) throw new Error('Rejection requires a reason.');
    const previous = attempt.evidenceKey;
    this.move(attempt, 'REJECTED', params.actor, params.reason);
    this.events.push('PaymentRejected');
    return { state: 'REJECTED' as const, previousEvidence: previous };
  }

  static resubmit(params: { orderNumber: string; reference: string; evidenceKey: string }): Attempt {
    const previous = [...this.attempts].reverse().find((row) => row.orderNumber === params.orderNumber);
    if (!previous || previous.state !== 'REJECTED') throw new Error('Only a rejected payment can be resubmitted.');
    if (previous.evidenceKey === params.evidenceKey) throw new Error('Resubmission must keep the previous evidence and add a new record.');
    return this.registerProof({ orderNumber: params.orderNumber, reference: params.reference, expectedAmount: previous.expectedAmount, evidenceKey: params.evidenceKey });
  }

  static eventsRecorded(): string[] {
    return [...this.events];
  }

  static operationsSummary() {
    return {
      submitted: this.attempts.filter((attempt) => attempt.state === 'SUBMITTED').length,
      rejected: this.attempts.filter((attempt) => attempt.state === 'REJECTED').length,
      verified: this.attempts.filter((attempt) => attempt.state === 'VERIFIED').length,
      mismatches: this.events.filter((event) => event === 'AmountMismatch').length,
    };
  }

  private static move(attempt: Attempt, to: PaymentDecision, actor: string, reason: string): void {
    attempt.history.push({ at: new Date().toISOString(), from: attempt.state, to, actor, reason });
    attempt.state = to;
  }
}
