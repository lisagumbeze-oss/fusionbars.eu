// ==============================================================================
// FUSION MUSHROOM BARS EU - TRANSACTIONAL EMAIL SERVICE
// ==============================================================================

import { EmailTemplates, EmailRenderContext } from '@/emails/templates';
import { buildOrderStatusUrl } from '@/emails/shell';
import {
  ITransactionalEmailProvider,
  MockEmailProvider,
  ResendEmailProvider,
  PostmarkEmailProvider,
  SendEmailResult,
} from './EmailProvider';
import { DbOrder } from '@/lib/commerce-repository';
export class EmailService {
  private static provider: ITransactionalEmailProvider = new MockEmailProvider();
  private static defaultFrom: string = 'Fusion Mushroom Bars EU <sales@fusionbars.eu>';
  private static defaultReplyTo: string = 'sales@fusionbars.eu';
  private static opsInbox: string = 'sales@fusionbars.eu';
  private static baseUrl: string = 'https://fusionbars.eu';
  private static initialized = false;

  static initializeFromConfig(config?: {
    providerName?: string;
    apiKey?: string;
    from?: string;
    replyTo?: string;
    opsInbox?: string;
    baseUrl?: string;
  }): void {
    const providerName = config?.providerName || process.env.EMAIL_PROVIDER || 'mock';
    const apiKey = config?.apiKey || process.env.EMAIL_PROVIDER_KEY || '';
    this.defaultFrom =
      config?.from ||
      process.env.EMAIL_FROM ||
      'Fusion Mushroom Bars EU <sales@fusionbars.eu>';
    this.defaultReplyTo = config?.replyTo || process.env.EMAIL_REPLY_TO || 'sales@fusionbars.eu';
    this.opsInbox = config?.opsInbox || process.env.EMAIL_OPS_INBOX || this.defaultReplyTo;
    this.baseUrl =
      config?.baseUrl ||
      process.env.SITE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://fusionbars.eu';

    if (providerName === 'resend' && apiKey) {
      this.provider = new ResendEmailProvider(apiKey, this.defaultFrom);
    } else if (providerName === 'postmark' && apiKey) {
      this.provider = new PostmarkEmailProvider(apiKey, this.defaultFrom);
    } else {
      if (process.env.NODE_ENV === 'production' && providerName === 'resend' && !apiKey) {
        console.error('[EmailService] EMAIL_PROVIDER_KEY is missing in production; falling back to mock provider.');
      }
      this.provider = new MockEmailProvider();
    }
    this.initialized = true;
  }

  private static ensureReady(): void {
    if (!this.initialized) {
      this.initializeFromConfig();
    }
  }

  static setProvider(provider: ITransactionalEmailProvider): void {
    this.provider = provider;
    this.initialized = true;
  }

  static getProvider(): ITransactionalEmailProvider {
    this.ensureReady();
    return this.provider;
  }

  static getOpsInbox(): string {
    this.ensureReady();
    return this.opsInbox;
  }

  static getBaseUrl(): string {
    this.ensureReady();
    return this.baseUrl;
  }

  private static orderStatusUrl(orderNumber: string, locale = 'en'): string {
    return buildOrderStatusUrl(this.baseUrl, locale, orderNumber);
  }

  private static buildRenderContext(order: DbOrder): EmailRenderContext {
    const customerName =
      `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() ||
      'Customer';
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

  private static recipientForOrder(order: DbOrder): string {
    return (order.guestEmail || '').trim();
  }

  static async sendSepaOrderConfirmation(
    order: DbOrder,
    sepaDetails: {
      iban: string;
      bicSwift?: string;
      bic?: string;
      accountHolder: string;
      bankName: string;
      reference: string;
    }
  ): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderSepaOrderConfirmation({
      ...ctx,
      iban: sepaDetails.iban,
      bic: sepaDetails.bic || sepaDetails.bicSwift || 'ABNANL2A',
      bankName: sepaDetails.bankName,
      accountHolder: sepaDetails.accountHolder,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: 'type', value: 'order_sepa_confirmation' }],
    });
  }

  static async sendCryptoOrderConfirmation(
    order: DbOrder,
    cryptoDetails: {
      cryptoName: string;
      network: string;
      receivingAddress: string;
      wallets?: Array<{ name: string; symbol: string; network: string; address: string; amount?: string }>;
    }
  ): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderCryptoOrderConfirmation({ ...ctx, ...cryptoDetails });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: 'type', value: 'order_crypto_confirmation' }],
    });
  }

  static async sendAdminOrderAlert(
    order: DbOrder,
    paymentMethodName: string
  ): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderAdminOrderAlert({
      ...ctx,
      paymentMethodName,
    });

    return this.provider.sendEmail({
      to: this.opsInbox,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: 'type', value: 'admin_order_alert' }],
    });
  }

  static async sendPaymentProofSubmitted(order: DbOrder, proofReference: string): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderPaymentProofSubmittedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      referenceOrTxid: proofReference,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendPaymentVerified(order: DbOrder): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderPaymentVerifiedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendPaymentRejected(order: DbOrder, reason?: string, locale = 'en'): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderPaymentRejectedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      reason,
      orderStatusUrl: this.orderStatusUrl(order.orderNumber, locale),
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendOrderProcessing(order: DbOrder, locale = 'en'): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderOrderProcessingNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      orderStatusUrl: this.orderStatusUrl(order.orderNumber, locale),
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendOrderShipped(order: DbOrder): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderOrderShippedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      trackingNumber: order.trackingNumber,
      carrierName: order.carrierName,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendOrderDelivered(order: DbOrder): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderOrderDeliveredNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendOrderCancelled(order: DbOrder, reason?: string): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const rendered = EmailTemplates.renderOrderCancelledNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      reason: reason || 'Order cancelled by customer or operations',
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendOrderRefunded(order: DbOrder, reason?: string): Promise<SendEmailResult> {
    this.ensureReady();
    const ctx = this.buildRenderContext(order);
    const refundAmountFormatted = MoneyFormat(order.totalAmount || 0, order.currency);
    const rendered = EmailTemplates.renderOrderRefundedNotice({
      orderNumber: order.orderNumber,
      customerName: ctx.customerName,
      refundAmountFormatted,
      reason,
      supportEmail: this.defaultReplyTo,
    });

    return this.provider.sendEmail({
      to: this.recipientForOrder(order),
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  static async sendCustomerWelcome(email: string, firstName: string, locale = 'en'): Promise<SendEmailResult> {
    this.ensureReady();
    const rendered = EmailTemplates.renderCustomerWelcomeNotice({
      customerName: firstName,
      accountUrl: `${this.baseUrl.replace(/\/$/, '')}/${locale}/account`,
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

  static async sendPasswordReset(
    email: string,
    firstName: string,
    resetUrl: string
  ): Promise<SendEmailResult> {
    this.ensureReady();
    const rendered = EmailTemplates.renderPasswordResetEmail({
      customerName: firstName,
      resetUrl,
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

  static async sendEmailVerification(
    email: string,
    firstName: string,
    verifyUrl: string
  ): Promise<SendEmailResult> {
    this.ensureReady();
    const rendered = EmailTemplates.renderEmailVerificationEmail({
      customerName: firstName,
      verifyUrl,
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

  static async sendContactInquiryEmails(input: {
    name: string;
    email: string;
    subjectCategory: string;
    message: string;
    locale: string;
  }): Promise<{ customer: SendEmailResult; ops: SendEmailResult }> {
    this.ensureReady();
    const customerRendered = EmailTemplates.renderContactInquiryConfirmation({
      customerName: input.name,
      subjectCategory: input.subjectCategory,
      supportEmail: this.defaultReplyTo,
    });
    const opsRendered = EmailTemplates.renderContactInquiryOpsAlert({
      customerName: input.name,
      customerEmail: input.email,
      subjectCategory: input.subjectCategory,
      message: input.message,
      locale: input.locale,
    });

    const customer = await this.provider.sendEmail({
      to: input.email,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: customerRendered.subject,
      html: customerRendered.html,
      text: customerRendered.text,
    });

    const ops = await this.provider.sendEmail({
      to: this.opsInbox,
      from: this.defaultFrom,
      replyTo: input.email,
      subject: opsRendered.subject,
      html: opsRendered.html,
      text: opsRendered.text,
    });

    return { customer, ops };
  }

  static async sendNewsletterConfirmation(email: string): Promise<SendEmailResult> {
    this.ensureReady();
    const rendered = EmailTemplates.renderNewsletterConfirmation({
      email,
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

  static async sendTestProbe(input: {
    recipientEmail: string;
    initiatedBy: string;
  }): Promise<SendEmailResult> {
    this.ensureReady();
    const rendered = EmailTemplates.renderTestEmailProbe({
      recipientEmail: input.recipientEmail,
      providerName: this.provider.name,
      initiatedBy: input.initiatedBy,
    });

    return this.provider.sendEmail({
      to: input.recipientEmail,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }
}

function MoneyFormat(amount: number, currency?: string): string {
  const code = currency === 'GBP' ? 'GBP' : 'EUR';
  const symbol = code === 'GBP' ? '£' : '€';
  return `${symbol}${(amount / 100).toFixed(2)}`;
}

/** Fire-and-forget helper — never throws to callers. */
export async function dispatchEmailSafely(
  label: string,
  task: () => Promise<SendEmailResult>
): Promise<void> {
  try {
    const result = await task();
    if (!result.success) {
      console.error(`[EmailService] ${label} failed:`, result.error);
    }
  } catch (error) {
    console.error(`[EmailService] ${label} threw:`, error);
  }
}

// Auto-init on module load for serverless handlers
EmailService.initializeFromConfig();
