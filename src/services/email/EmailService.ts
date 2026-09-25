// ==============================================================================
// FUSION MUSHROOM BARS EU - TRANSACTIONAL EMAIL SERVICE
// Full E-commerce Lifecycle Notifications
// ==============================================================================

import { EmailTemplates, EmailRenderContext } from '@/emails/templates';
import { ITransactionalEmailProvider, MockEmailProvider, ResendEmailProvider, PostmarkEmailProvider, SendEmailResult } from './EmailProvider';
import { DbOrder } from '@/lib/commerce-repository';

export class EmailService {
  private static provider: ITransactionalEmailProvider = new MockEmailProvider();
  private static defaultFrom: string = 'sales@fusionbars.eu';
  private static defaultReplyTo: string = 'sales@fusionbars.eu';
  private static baseUrl: string = 'https://fusionbars.eu';

  /**
   * Initializes the email provider based on environment variables or explicit provider.
   */
  static initializeFromConfig(config?: {
    providerName?: string;
    apiKey?: string;
    from?: string;
    replyTo?: string;
    baseUrl?: string;
  }): void {
    const providerName = config?.providerName || process.env.EMAIL_PROVIDER || 'mock';
    const apiKey = config?.apiKey || process.env.EMAIL_PROVIDER_KEY || '';
    if (config?.from) this.defaultFrom = config.from;
    if (config?.replyTo) this.defaultReplyTo = config.replyTo;
    if (config?.baseUrl) this.baseUrl = config.baseUrl;

    if (providerName === 'resend' && apiKey) {
      this.provider = new ResendEmailProvider(apiKey, this.defaultFrom);
    } else if (providerName === 'postmark' && apiKey) {
      this.provider = new PostmarkEmailProvider(apiKey, this.defaultFrom);
    } else {
      this.provider = new MockEmailProvider();
    }
  }

  static setProvider(provider: ITransactionalEmailProvider): void {
    this.provider = provider;
  }

  static getProvider(): ITransactionalEmailProvider {
    return this.provider;
  }

  private static buildRenderContext(order: DbOrder): EmailRenderContext {
    const customerName = `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 'Customer';
    const items = (order.items || []).map((it) => ({
      name: `${it.productName} (${it.variantName})`,
      quantity: it.quantity,
      price: it.unitPrice || Math.round((it.lineTotal || 0) / (it.quantity || 1)),
    }));

    return {
      orderNumber: order.orderNumber,
      customerName,
      totalAmount: order.totalAmount,
      currency: (order.currency as any) || 'EUR',
      items,
      supportEmail: this.defaultReplyTo,
    };
  }

  // 1. Order Confirmation (SEPA)
  static async sendSepaOrderConfirmation(order: DbOrder, sepaDetails: {
    iban: string;
    bicSwift?: string;
    bic?: string;
    accountHolder: string;
    bankName: string;
    reference: string;
  }): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const rendered = EmailTemplates.renderSepaOrderConfirmation({
      ...ctx,
      iban: sepaDetails.iban,
      bic: sepaDetails.bic || sepaDetails.bicSwift || 'ABNANL2A',
      bankName: sepaDetails.bankName,
      accountHolder: sepaDetails.accountHolder,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 2. Order Confirmation (Crypto)
  static async sendCryptoOrderConfirmation(order: DbOrder, cryptoDetails: {
    cryptoName: string;
    network: string;
    receivingAddress: string;
  }): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const rendered = EmailTemplates.renderCryptoOrderConfirmation({
      ...ctx,
      ...cryptoDetails,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 3. Payment Submitted Notice
  static async sendPaymentProofSubmitted(order: DbOrder, proofReference: string): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const rendered = EmailTemplates.renderPaymentProofSubmittedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      referenceOrTxid: proofReference,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 4. Payment Verified Notice
  static async sendPaymentVerified(order: DbOrder): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const rendered = EmailTemplates.renderPaymentVerifiedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 5. Payment Rejected Notice
  static async sendPaymentRejected(order: DbOrder, reason?: string): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const orderStatusUrl = `${this.baseUrl}/en/orders/lookup?orderNumber=${order.orderNumber}`;
    const rendered = EmailTemplates.renderPaymentRejectedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      reason,
      orderStatusUrl,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 6. Order Processing Notice
  static async sendOrderProcessing(order: DbOrder): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const orderStatusUrl = `${this.baseUrl}/en/orders/lookup?orderNumber=${order.orderNumber}`;
    const rendered = EmailTemplates.renderOrderProcessingNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      orderStatusUrl,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 7. Order Shipped Notice
  static async sendOrderShipped(order: DbOrder): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const rendered = EmailTemplates.renderOrderShippedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      trackingNumber: order.trackingNumber,
      carrierName: order.carrierName,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 8. Order Delivered Notice
  static async sendOrderDelivered(order: DbOrder): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const rendered = EmailTemplates.renderOrderDeliveredNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 9. Order Cancelled Notice
  static async sendOrderCancelled(order: DbOrder, reason?: string): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const rendered = EmailTemplates.renderOrderCancelledNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      reason: reason || 'Order cancelled by customer or operations',
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 10. Order Refunded Notice
  static async sendOrderRefunded(order: DbOrder, reason?: string): Promise<SendEmailResult> {
    const ctx = this.buildRenderContext(order);
    const recipient = order.guestEmail || '';
    const refundAmountFormatted = `€${((order.totalAmount || 0) / 100).toFixed(2)}`;
    const rendered = EmailTemplates.renderOrderRefundedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      refundAmountFormatted,
      reason,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: recipient,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 11. Customer Welcome Notice
  static async sendCustomerWelcome(email: string, firstName: string): Promise<SendEmailResult> {
    const rendered = EmailTemplates.renderCustomerWelcomeNotice({
      customerName: firstName,
      accountUrl: `${this.baseUrl}/en/account`,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: email,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 12. Password Reset
  static async sendPasswordReset(email: string, firstName: string, token: string): Promise<SendEmailResult> {
    const rendered = EmailTemplates.renderPasswordResetEmail({
      customerName: firstName,
      resetUrl: `${this.baseUrl}/en/account?token=${token}&action=reset`,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: email,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  // 13. Email Verification
  static async sendEmailVerification(email: string, firstName: string, token: string): Promise<SendEmailResult> {
    const rendered = EmailTemplates.renderEmailVerificationEmail({
      customerName: firstName,
      verifyUrl: `${this.baseUrl}/en/account?verifyToken=${token}`,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: email,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }
}
