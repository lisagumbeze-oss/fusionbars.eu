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
}

export interface ITransactionalEmailProvider {
  name: string;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}

/**
 * Mock email provider for local development, test environments, and CI.
 * Keeps an in-memory queue of dispatched messages for verification assertions.
 */
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
        const errText = await response.text();
        return { success: false, error: `Resend HTTP ${response.status}: ${errText}` };
      }

      const data = (await response.json()) as { id: string };
      return { success: true, messageId: data.id };
    } catch (e: any) {
      return { success: false, error: e.message || 'Resend request failed' };
    }
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
        const errText = await response.text();
        return { success: false, error: `Postmark HTTP ${response.status}: ${errText}` };
      }

      const data = (await response.json()) as { MessageID: string };
      return { success: true, messageId: data.MessageID };
    } catch (e: any) {
      return { success: false, error: e.message || 'Postmark request failed' };
    }
  }
}
