// ==============================================================================
// FUSION MUSHROOM BARS EU - TRANSACTIONAL EMAIL SERVICE
// ==============================================================================

import { EmailTemplates, EmailRenderContext } from '@/emails/templates';
import { buildOrderStatusUrl } from '@/emails/shell';
import { EmailProductionReadinessService } from '@/services/email/EmailProductionReadinessService';
import {
  ITransactionalEmailProvider,
  MockEmailProvider,
  ResendEmailProvider,
  PostmarkEmailProvider,
  SendEmailResult,
  SendEmailOptions,
} from './EmailProvider';
import { DbOrder } from '@/lib/commerce-repository';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';

export class EmailService {
  private static provider: ITransactionalEmailProvider = new MockEmailProvider();
  private static defaultFrom: string = 'Fusion Mushroom Bars EU <sales@fusionbars.eu>';
  private static defaultReplyTo: string = 'sales@fusionbars.eu';
  private static opsInbox: string = 'sales@fusionbars.eu';
  private static baseUrl: string = 'https://fusionbars.eu';
  private static initialized = false;

  static resolveProviderName(input: { vercelEnv?: string; configured?: string }): string {
    if (input.vercelEnv === 'preview') return 'mock';
    return input.configured || 'mock';
  }

  static initializeFromConfig(config?: {
    providerName?: string;
    apiKey?: string;
    from?: string;
    replyTo?: string;
    opsInbox?: string;
    baseUrl?: string;
  }): void {
    const providerName = this.resolveProviderName({
      vercelEnv: process.env.VERCEL_ENV,
      configured: config?.providerName || process.env.EMAIL_PROVIDER || 'mock',
    });
    const apiKey = providerName === 'mock' ? '' : (config?.apiKey || process.env.EMAIL_PROVIDER_KEY || '');
    this.defaultFrom =
      config?.from ||
      process.env.EMAIL_FROM ||
      'Fusion Mushroom Bars EU <sales@fusionbars.eu>';
    this.defaultReplyTo = config?.replyTo || process.env.EMAIL_REPLY_TO || 'sales@fusionbars.eu';
    this.opsInbox = config?.opsInbox || process.env.EMAIL_OPS_INBOX || this.defaultReplyTo;
    this.baseUrl = 'https://fusionbars.eu';

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

  private static async deliver(options: SendEmailOptions, purpose: 'transactional' | 'controlled' = 'transactional'): Promise<SendEmailResult> {
    this.ensureReady();
    const recipient = options.to?.trim() || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || /[\r\n,]/.test(recipient)) {
      return { success: false, error: 'Recipient is not valid.' };
    }
    if (this.provider.name !== 'mock') {
      if (!EmailProductionReadinessService.sender().matchesCanonical) {
        return { success: false, error: 'Sender is not the production sender.' };
      }
      if (purpose === 'transactional' && EmailProductionReadinessService.state() !== 'ACTIVE') {
        return { success: false, error: 'Production email is not active.' };
      }
      if (purpose === 'controlled' && !EmailProductionReadinessService.controlledTestPermitted()) {
        return { success: false, error: 'Controlled production email is not permitted until the provider and DNS checks pass.' };
      }
    }
    const replyTo = options.replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(options.replyTo) && !/[\r\n]/.test(options.replyTo)
      ? options.replyTo
      : this.defaultReplyTo;
    return this.provider.sendEmail({ ...options, to: recipient, from: this.defaultFrom, replyTo });
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

    return this.deliver({
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

    return this.deliver({
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
    const address = order.shippingAddress;
    const country = CountryRegistry.getCountry(address.countryCode);
    const rendered = EmailTemplates.renderAdminOrderAlert({
      ...ctx,
      firstName: address.firstName,
      lastName: address.lastName,
      paymentMethodName,
      email: order.guestEmail,
      phone: address.phone || order.guestPhone || '',
      streetAddress: address.streetAddress,
      houseNumber: address.houseNumber,
      postalCode: address.postalCode,
      city: address.city,
      country: country ? `${country.name} (${address.countryCode})` : address.countryCode,
      shippingMethod: order.shippingMethodCode === 'EXPRESS' ? 'Express Priority Courier' : 'Standard Discreet Courier',
    });

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    return this.deliver({
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

    const customer = await this.deliver({
      to: input.email,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: customerRendered.subject,
      html: customerRendered.html,
      text: customerRendered.text,
      tags: [{ name: 'template', value: 'contact-confirmation' }],
    });

    const ops = await this.deliver({
      to: this.opsInbox,
      from: this.defaultFrom,
      replyTo: input.email,
      subject: opsRendered.subject,
      html: opsRendered.html,
      text: opsRendered.text,
      tags: [{ name: 'template', value: 'contact-ops-alert' }],
    });

    if (!customer.success) {
      console.error('[EmailService] contact confirmation failed:', customer.error);
    }
    if (!ops.success) {
      console.error('[EmailService] contact ops alert failed:', ops.error);
    }

    return { customer, ops };
  }

  static async sendNewsletterConfirmation(email: string, locale = 'en'): Promise<{ subscriber: SendEmailResult; ops: SendEmailResult }> {
    this.ensureReady();
    const rendered = EmailTemplates.renderNewsletterConfirmation({
      email,
      supportEmail: this.defaultReplyTo,
    });
    const opsRendered = EmailTemplates.renderNewsletterOpsAlert({ email, locale });

    const subscriber = await this.deliver({
      to: email,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [{ name: 'template', value: 'newsletter-confirmation' }],
    });
    const ops = await this.deliver({
      to: this.opsInbox,
      from: this.defaultFrom,
      replyTo: email,
      subject: opsRendered.subject,
      html: opsRendered.html,
      text: opsRendered.text,
      tags: [{ name: 'template', value: 'newsletter-ops-alert' }],
    });

    if (!subscriber.success) console.error('[EmailService] newsletter confirmation failed:', subscriber.error);
    if (!ops.success) console.error('[EmailService] newsletter ops alert failed:', ops.error);

    return { subscriber, ops };
  }

  static async sendTestProbe(input: {
    recipientEmail: string;
    initiatedBy: string;
    templateName?: string;
  }): Promise<SendEmailResult> {
    this.ensureReady();
    if (/[\r\n]/.test(input.recipientEmail) || input.recipientEmail.includes(',')) {
      return { success: false, error: 'Recipient is not valid.' };
    }
    const rendered = EmailTemplates.renderTestEmailProbe({
      recipientEmail: input.recipientEmail,
      providerName: this.provider.name,
      initiatedBy: input.initiatedBy,
      templateName: input.templateName,
    });

    const eventId = `fusion-production-email-test:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
    const result = await this.deliver({
      to: input.recipientEmail,
      from: this.defaultFrom,
      replyTo: this.defaultReplyTo,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    }, 'controlled');
    return { ...result, eventId };
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
