import { deliveryLogExposesSecrets } from '@/domain/admin/EmailDeliveryLog';
import { RoleName } from '@/types';

export type EmailLifecycleStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED';

export interface EmailAttempt {
  eventId: string;
  template: string;
  recipient: string;
  provider: string;
  messageId: string | null;
  status: EmailLifecycleStatus;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  failureReason: string | null;
  retryCount: number;
  retryPending: boolean;
  orderNumber: string | null;
  bounceCategory: string | null;
  providerDelivery: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED' | 'UNKNOWN';
}

function scrub(value?: string | null): string | null {
  if (!value) return null;
  return deliveryLogExposesSecrets(value) ? 'Delivery failed' : value.slice(0, 300);
}

export class EmailDeliveryLedger {
  private static attempts = new Map<string, EmailAttempt>();
  private static suppressed = new Set<string>();

  static resetForTests(): void {
    this.attempts.clear();
    this.suppressed.clear();
  }

  static isSuppressed(recipient: string): boolean {
    return this.suppressed.has(recipient.trim().toLowerCase());
  }

  static claim(eventId: string, meta: { template: string; recipient: string; provider: string; orderNumber?: string | null }): boolean {
    const existing = this.attempts.get(eventId);
    if (existing && !existing.retryPending) return false;
    const now = new Date().toISOString();
    this.attempts.set(eventId, {
      eventId,
      template: meta.template,
      recipient: meta.recipient,
      provider: meta.provider,
      messageId: existing?.messageId || null,
      status: 'QUEUED',
      createdAt: existing?.createdAt || now,
      sentAt: null,
      deliveredAt: null,
      failureReason: null,
      retryCount: existing?.retryCount || 0,
      retryPending: false,
      orderNumber: meta.orderNumber || existing?.orderNumber || null,
      bounceCategory: existing?.bounceCategory || null,
      providerDelivery: 'QUEUED',
    });
    return true;
  }

  static complete(eventId: string, result: { success: boolean; messageId?: string; error?: string }): void {
    const attempt = this.attempts.get(eventId);
    if (!attempt) return;
    attempt.status = result.success ? 'SENT' : 'FAILED';
    attempt.messageId = result.messageId || attempt.messageId;
    attempt.sentAt = result.success ? new Date().toISOString() : null;
    attempt.deliveredAt = null;
    attempt.providerDelivery = result.success ? 'SENT' : 'FAILED';
    attempt.failureReason = result.success ? null : scrub(result.error);
  }

  static applyProviderStatus(eventId: string, status: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED' | 'UNKNOWN'): void {
    const attempt = this.attempts.get(eventId);
    if (!attempt) return;
    attempt.providerDelivery = status;
    if (status === 'DELIVERED') {
      attempt.status = 'DELIVERED';
      attempt.deliveredAt = new Date().toISOString();
      return;
    }
    if (status === 'BOUNCED') {
      attempt.status = 'BOUNCED';
      return;
    }
    if (status === 'FAILED' || status === 'REJECTED') {
      attempt.status = 'FAILED';
    }
  }

  static recordBounce(params: { recipient: string; messageId?: string; category?: string; reason?: string; permanent?: boolean; orderNumber?: string }): EmailAttempt {
    const recipient = params.recipient.trim().toLowerCase();
    if (params.permanent) this.suppressed.add(recipient);
    const eventId = params.messageId || `bounce-${recipient}`;
    const attempt: EmailAttempt = {
      eventId,
      template: 'bounce',
      recipient,
      provider: 'provider',
      messageId: params.messageId || null,
      status: 'BOUNCED',
      createdAt: new Date().toISOString(),
      sentAt: null,
      deliveredAt: null,
      failureReason: scrub(params.reason),
      retryCount: 0,
      retryPending: false,
      orderNumber: params.orderNumber || null,
      bounceCategory: params.category || null,
      providerDelivery: 'BOUNCED',
    };
    this.attempts.set(eventId, attempt);
    return attempt;
  }

  static permitRetry(params: { eventId: string; role: RoleName; confirmation: string; stillValid: boolean; recipientValid: boolean }): { allowed: true } | { allowed: false; error: string } {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'ORDER_MANAGER') return { allowed: false, error: 'Unauthorized email retry.' };
    if (params.confirmation !== 'RETRY_EMAIL') return { allowed: false, error: 'Explicit retry confirmation is required.' };
    const attempt = this.attempts.get(params.eventId);
    if (!attempt) return { allowed: false, error: 'Email attempt not found.' };
    if (attempt.status !== 'FAILED') return { allowed: false, error: 'Only a failed email can be retried.' };
    if (!params.stillValid) return { allowed: false, error: 'The underlying order state is no longer valid for this email.' };
    if (!params.recipientValid || this.isSuppressed(attempt.recipient)) return { allowed: false, error: 'Recipient is not eligible for another send.' };
    attempt.retryCount += 1;
    attempt.retryPending = true;
    return { allowed: true };
  }

  static list(): EmailAttempt[] {
    return [...this.attempts.values()].map((attempt) => ({ ...attempt }));
  }
}
