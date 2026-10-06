// ==============================================================================
// FUSION MUSHROOM BARS EU - TRANSACTIONAL EMAIL PROVIDER ABSTRACTION
// ==============================================================================

export interface SendEmailOptions {
  to: string;
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  eventId?: string;
}

export type ProviderDeliveryStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED' | 'UNKNOWN';

export interface ITransactionalEmailProvider {
  name: string;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
  getDeliveryStatus(messageId: string): Promise<{ status: ProviderDeliveryStatus }>;
  validateConfiguration(): { valid: boolean; missing: string[] };
}

/**
 * Mock email provider for local development, test environments, and CI.
 * Keeps an in-memory queue of dispatched messages for verification assertions.
 */
const deliveryJournal: Array<Record<string, unknown>> = [];

export function recordDelivery(entry: Record<string, unknown>): void {
  deliveryJournal.unshift({
    ...entry,
    sentAt: new Date().toISOString(),
  });
  if (deliveryJournal.length > 50) deliveryJournal.pop();
}

export function recentDeliveries(): Array<Record<string, unknown>> {
  return deliveryJournal.slice();
}

export class MockEmailProvider implements ITransactionalEmailProvider {
  name = 'mock';
  public sentMessages: SendEmailOptions[] = [];

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    this.sentMessages.push(options);
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  async getDeliveryStatus(_messageId: string): Promise<{ status: ProviderDeliveryStatus }> {
    return { status: 'SENT' };
  }

  validateConfiguration(): { valid: boolean; missing: string[] } {
    return { valid: false, missing: ['production provider'] };
  }

  clear(): void {
    this.sentMessages = [];
  }
}

/**
 * Resend Email Provider using HTTP REST endpoint.
 * Zero external vendor library dependency.
 */
export class ResendEmailProvider implements ITransactionalEmailProvider {
  name = 'resend';
  constructor(private apiKey: string, private defaultFrom: string = 'sales@fusionbars.eu') {}

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || this.defaultFrom,
          to: [options.to],
          reply_to: options.replyTo || this.defaultFrom,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        let detail = '';
        try {
          const parsed = JSON.parse(body) as { message?: string; error?: string };
          detail = typeof parsed.message === 'string' ? parsed.message : typeof parsed.error === 'string' ? parsed.error : '';
        } catch {
          detail = '';
        }
        if (/re_[A-Za-z0-9]/.test(detail)) detail = '';
        detail = detail.replace(/\s+/g, ' ').trim().slice(0, 180);
        const error = detail
          ? `Resend could not send the email: ${detail}`
          : `Resend could not send the email (HTTP ${response.status}).`;
        recordDelivery({
          to: options.to,
          subject: options.subject,
          tags: options.tags,
          provider: 'resend',
          status: 'failed',
          error,
          messageId: `failed-${Date.now()}`,
        });
        return { success: false, error };
      }

      const data = (await response.json()) as { id: string };
      recordDelivery({
        to: options.to,
        subject: options.subject,
        tags: options.tags,
        provider: 'resend',
        status: 'success',
        messageId: data.id,
      });
      return { success: true, messageId: data.id };
    } catch (e: any) {
      return { success: false, error: e.message || 'Resend request failed' };
    }
  }

  async getDeliveryStatus(_messageId: string): Promise<{ status: ProviderDeliveryStatus }> {
    return { status: 'UNKNOWN' };
  }

  validateConfiguration(): { valid: boolean; missing: string[] } {
    return this.apiKey && this.apiKey.length >= 16
      ? { valid: true, missing: [] }
      : { valid: false, missing: ['EMAIL_PROVIDER_KEY'] };
  }
}

/**
 * Postmark Email Provider using Postmark Server API.
 */
export class PostmarkEmailProvider implements ITransactionalEmailProvider {
  name = 'postmark';
  constructor(private serverToken: string, private defaultFrom: string = 'sales@fusionbars.eu') {}

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.serverToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: options.from || this.defaultFrom,
          To: options.to,
          ReplyTo: options.replyTo || this.defaultFrom,
          Subject: options.subject,
          HtmlBody: options.html,
          TextBody: options.text,
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Postmark HTTP ${response.status}` };
      }

      const data = (await response.json()) as { MessageID: string };
      return { success: true, messageId: data.MessageID };
    } catch (e: any) {
      return { success: false, error: e.message || 'Postmark request failed' };
    }
  }

  async getDeliveryStatus(_messageId: string): Promise<{ status: ProviderDeliveryStatus }> {
    return { status: 'UNKNOWN' };
  }

  validateConfiguration(): { valid: boolean; missing: string[] } {
    return this.serverToken && this.serverToken.length >= 16
      ? { valid: true, missing: [] }
      : { valid: false, missing: ['EMAIL_PROVIDER_KEY'] };
  }
}

export class SmtpEmailProvider implements ITransactionalEmailProvider {
  name = 'smtp';

  validateConfiguration(): { valid: boolean; missing: string[] } {
    const missing = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'].filter((name) => !process.env[name]?.trim());
    return { valid: missing.length === 0, missing };
  }

  async sendEmail(): Promise<SendEmailResult> {
    const configuration = this.validateConfiguration();
    if (!configuration.valid) return { success: false, error: 'SMTP configuration is incomplete.' };
    return { success: false, error: 'SMTP delivery is not activated.' };
  }

  async getDeliveryStatus(_messageId: string): Promise<{ status: ProviderDeliveryStatus }> {
    return { status: 'UNKNOWN' };
  }
}
