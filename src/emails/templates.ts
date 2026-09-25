// ===================================================
// FUSION MUSHROOM BARS EU - EMAIL TEMPLATES
// Clean HTML & React Email Representations
// Sender: sales@fusionbars.eu
// ===================================================

import { CurrencyCode, MinorUnits } from '@/types';
import { MoneyEngine } from '@/lib/money';

export interface EmailRenderContext {
  customerName: string;
  orderNumber: string;
  totalAmount: MinorUnits;
  currency: CurrencyCode;
  items: Array<{ name: string; quantity: number; price: MinorUnits }>;
  supportEmail: string;
}

export class EmailTemplates {
  public static readonly SENDER_SUPPORT = 'Fusion Mushroom Bars EU <sales@fusionbars.eu>';
  public static readonly SENDER_ORDERS = 'Fusion EU Orders <sales@fusionbars.eu>';

  /**
   * Generates order confirmation with SEPA / Bank instructions.
   */
  static renderSepaOrderConfirmation(
    context: EmailRenderContext & {
      iban: string;
      bic: string;
      bankName: string;
      accountHolder: string;
    }
  ): { subject: string; text: string; html: string } {
    const formattedTotal = MoneyEngine.format(context.totalAmount, context.currency);
    const subject = `Order Confirmed: ${context.orderNumber} - Bank Transfer Details`;

    const itemsText = context.items
      .map((i) => ` - ${i.quantity}x ${i.name} (${MoneyEngine.format(i.price, context.currency)})`)
      .join('\n');

    const text = `
Hello ${context.customerName},

Thank you for your order with Fusion Mushroom Bars EU (${context.orderNumber}).

Total Amount Due: ${formattedTotal}

Items Ordered:
${itemsText}

=== SEPA / IBAN PAYMENT INSTRUCTIONS ===
Beneficiary: ${context.accountHolder}
Bank: ${context.bankName}
IBAN: ${context.iban}
BIC / SWIFT: ${context.bic}
Mandatory Reference: ${context.orderNumber}

IMPORTANT: You must include "${context.orderNumber}" in your transfer description/memo so we can match your payment.

Once sent, your order will be prepared for discreet European dispatch.
Questions? Contact: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #2d3748; padding-bottom: 12px; margin-bottom: 24px;">
    <h2 style="margin: 0; color: #1a202c; font-size: 20px; letter-spacing: 0.05em;">FUSION MUSHROOM BARS EU</h2>
    <p style="margin: 4px 0 0; font-size: 13px; color: #718096;">Discreet Fulfilment Hubs: NL &bull; ES &bull; DE &bull; FR</p>
  </div>
  <p>Dear ${context.customerName},</p>
  <p>Thank you for placing order <strong>${context.orderNumber}</strong>. Please complete your bank transfer below:</p>
  
  <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
    <h3 style="margin-top: 0; font-size: 15px; color: #2d3748;">SEPA / IBAN Payment Details</h3>
    <p style="margin: 6px 0;"><strong>Beneficiary:</strong> ${context.accountHolder}</p>
    <p style="margin: 6px 0;"><strong>Bank Name:</strong> ${context.bankName}</p>
    <p style="margin: 6px 0;"><strong>IBAN:</strong> <code style="background: #edf2f7; padding: 2px 6px; border-radius: 4px;">${context.iban}</code></p>
    <p style="margin: 6px 0;"><strong>BIC / SWIFT:</strong> ${context.bic}</p>
    <p style="margin: 6px 0; color: #c53030;"><strong>Payment Reference:</strong> <strong>${context.orderNumber}</strong></p>
    <p style="margin: 6px 0;"><strong>Total Due:</strong> <strong>${formattedTotal}</strong></p>
  </div>

  <p style="font-size: 12px; color: #718096;">All dispatches are fulfilled in 100% odorless, unbranded discreet packaging. For support contact <a href="mailto:${context.supportEmail}">${context.supportEmail}</a>.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Generates order confirmation with Crypto instructions.
   */
  static renderCryptoOrderConfirmation(
    context: EmailRenderContext & {
      cryptoName: string;
      network: string;
      receivingAddress: string;
    }
  ): { subject: string; text: string; html: string } {
    const formattedTotal = MoneyEngine.format(context.totalAmount, context.currency);
    const subject = `Order Confirmed: ${context.orderNumber} - ${context.cryptoName} Instructions`;

    const text = `
Hello ${context.customerName},

Thank you for your order with Fusion Mushroom Bars EU (${context.orderNumber}).

Total Amount: ${formattedTotal}

=== CRYPTOCURRENCY PAYMENT INSTRUCTIONS ===
Asset: ${context.cryptoName}
Network: ${context.network}
Receiving Address: ${context.receivingAddress}
Order Reference: ${context.orderNumber}

Please broadcast your transaction and retain your Transaction Hash (TXID) for confirmation.
Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="border-bottom: 2px solid #2d3748; padding-bottom: 12px; margin-bottom: 24px;">
    <h2 style="margin: 0; color: #1a202c; font-size: 20px;">FUSION MUSHROOM BARS EU</h2>
  </div>
  <p>Dear ${context.customerName},</p>
  <p>Your order <strong>${context.orderNumber}</strong> has been created. Please complete your crypto transfer:</p>
  
  <div style="background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 20px 0;">
    <h3 style="margin-top: 0; font-size: 15px;">Cryptocurrency Details (${context.cryptoName})</h3>
    <p style="margin: 6px 0;"><strong>Network:</strong> ${context.network}</p>
    <p style="margin: 6px 0;"><strong>Receiving Address:</strong> <br/><code style="word-break: break-all; background: #edf2f7; padding: 4px 6px; border-radius: 4px; display: inline-block; margin-top: 4px;">${context.receivingAddress}</code></p>
    <p style="margin: 6px 0;"><strong>Total Equivalent:</strong> <strong>${formattedTotal}</strong></p>
  </div>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Generates admin alert when a new order is received.
   */
  static renderAdminOrderAlert(context: EmailRenderContext & { paymentMethodName: string }): {
    subject: string;
    text: string;
  } {
    const formattedTotal = MoneyEngine.format(context.totalAmount, context.currency);
    return {
      subject: `[NEW ORDER] ${context.orderNumber} - ${formattedTotal} (${context.paymentMethodName})`,
      text: `A new order has been received: ${context.orderNumber} for ${formattedTotal} by ${context.customerName}.`,
    };
  }

  /**
   * Generates customer notice when payment proof has been submitted.
   */
  static renderPaymentProofSubmittedNotice(context: {
    customerName: string;
    orderNumber: string;
    referenceOrTxid: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Payment Proof Received: ${context.orderNumber}`;
    const text = `
Hello ${context.customerName},

We have received your payment reference: ${context.referenceOrTxid} for order ${context.orderNumber}.
Our finance reconciliation desk is auditing the transaction. Once verified, your parcel will transition to processing and discreet dispatch.

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Payment Proof Received</h2>
  <p>Dear ${context.customerName},</p>
  <p>We have successfully logged your payment reference for order <strong>${context.orderNumber}</strong>:</p>
  <p style="background: #f7fafc; padding: 12px; border-left: 4px solid #4A5D4E; font-family: monospace;">${context.referenceOrTxid}</p>
  <p>Our European finance desk will reconcile the funds shortly and update your order to <strong>PAYMENT_VERIFIED</strong>.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Generates notice when payment has been officially verified by finance.
   */
  static renderPaymentVerifiedNotice(context: {
    customerName: string;
    orderNumber: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Payment Verified: ${context.orderNumber} - Preparing for Dispatch`;
    const text = `
Hello ${context.customerName},

Great news! Payment for order ${context.orderNumber} has been verified by our finance desk.
Your order is now moving into fulfillment at our European logistics facility.

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2F855A;">Payment Cleared &amp; Verified</h2>
  <p>Dear ${context.customerName},</p>
  <p>Payment for order <strong>${context.orderNumber}</strong> has been officially confirmed by our European treasury.</p>
  <p>Your order is now being transferred to fulfillment for discreet, odorless packaging and courier dispatch.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Generates notice when order has shipped from facility.
   */
  static renderOrderShippedNotice(context: {
    customerName: string;
    orderNumber: string;
    trackingNumber?: string | null;
    carrierName?: string | null;
    hubCode?: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Your order has shipped: ${context.orderNumber} status update`;
    const hasTracking = Boolean(context.trackingNumber && context.trackingNumber.trim().length > 0);

    const trackingText = hasTracking
      ? `\nShipment Reference: ${context.trackingNumber}${context.carrierName ? `\nCourier: ${context.carrierName}` : ''}`
      : '\nDelivery: In transit via European Priority Logistics in plain, unmarked parcel.';

    const text = `
Hello ${context.customerName},

Your order ${context.orderNumber} has shipped from our European logistics facility.
${trackingText}

Packaging Note: All shipments are dispatched in 100% plain, unbranded, odorless packaging for total customer privacy.

Support: ${context.supportEmail}
`.trim();

    const trackingHtml = hasTracking
      ? `<div style="background: #f7fafc; padding: 14px; border-radius: 6px; margin: 16px 0;">
    ${context.carrierName ? `<p style="margin: 4px 0;"><strong>Courier:</strong> ${context.carrierName}</p>` : ''}
    <p style="margin: 4px 0;"><strong>Shipment Reference:</strong> <code>${context.trackingNumber}</code></p>
  </div>`
      : `<div style="background: #f7fafc; padding: 14px; border-radius: 6px; margin: 16px 0;">
    <p style="margin: 4px 0;">Your parcel is in transit via our European logistics network in plain, unbranded packaging.</p>
  </div>`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Your Order Has Shipped</h2>
  <p>Dear ${context.customerName},</p>
  <p>Order <strong>${context.orderNumber}</strong> has shipped from our European facility.</p>
  ${trackingHtml}
  <p style="font-size: 13px; color: #4A5568;">Privacy Guarantee: Neutral exterior, no external product references, fully discreet.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Generates notice when order is confirmed delivered.
   */
  static renderOrderDeliveredNotice(context: {
    customerName: string;
    orderNumber: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Delivered: Order ${context.orderNumber}`;
    const text = `
Hello ${context.customerName},

Your order ${context.orderNumber} has been delivered.
Thank you for choosing Fusion Mushroom Bars EU.

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Order Delivered</h2>
  <p>Dear ${context.customerName},</p>
  <p>Your delivery for order <strong>${context.orderNumber}</strong> has been completed.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Generates notice when order is cancelled.
   */
  static renderOrderCancelledNotice(context: {
    customerName: string;
    orderNumber: string;
    reason: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Order Cancelled: ${context.orderNumber}`;
    const text = `
Hello ${context.customerName},

Your order ${context.orderNumber} has been cancelled.
Reason: ${context.reason}

If you believe this was an error, please contact: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #C53030;">Order Cancellation Notice</h2>
  <p>Dear ${context.customerName},</p>
  <p>Order <strong>${context.orderNumber}</strong> has been cancelled.</p>
  <p><strong>Reason:</strong> ${context.reason}</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Password reset email.
   */
  static renderPasswordResetEmail(context: {
    customerName: string;
    resetUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Password Reset Request - Fusion Mushroom Bars EU`;
    const text = `
Hello ${context.customerName},

We received a request to reset your password. Use the secure link below:
${context.resetUrl}

This link is valid for 1 hour. If you did not request this, ignore this email.

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Password Reset Request</h2>
  <p>Dear ${context.customerName},</p>
  <p>Click the link below to choose a new password for your account:</p>
  <p><a href="${context.resetUrl}" style="display: inline-block; background: #4A5D4E; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
  <p style="font-size: 12px; color: #718096;">Link expires in 60 minutes. If you did not request this, no action is required.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Email verification email.
   */
  static renderEmailVerificationEmail(context: {
    customerName: string;
    verifyUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Verify Your Email Address - Fusion Mushroom Bars EU`;
    const text = `
Hello ${context.customerName},

Welcome to Fusion Mushroom Bars EU! Please confirm your email address:
${context.verifyUrl}

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Verify Your Email Address</h2>
  <p>Dear ${context.customerName},</p>
  <p>Please confirm your account email address by clicking below:</p>
  <p><a href="${context.verifyUrl}" style="display: inline-block; background: #4A5D4E; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Verify Email</a></p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Payment Rejected notice.
   */
  static renderPaymentRejectedNotice(context: {
    customerName: string;
    orderNumber: string;
    reason?: string;
    orderStatusUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Payment Verification Update: ${context.orderNumber}`;
    const text = `
Hello ${context.customerName},

We were unable to verify your payment for order ${context.orderNumber}.
${context.reason ? `Reason: ${context.reason}\n` : ''}
Please review your payment submission or contact customer support:
${context.orderStatusUrl}

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #9B2C2C;">Payment Verification Update</h2>
  <p>Dear ${context.customerName},</p>
  <p>We were unable to reconcile the payment submission for order <strong>${context.orderNumber}</strong>.</p>
  ${context.reason ? `<p style="background: #FFF5F5; padding: 10px; border-left: 4px solid #E53E3E;"><strong>Note:</strong> ${context.reason}</p>` : ''}
  <p><a href="${context.orderStatusUrl}" style="display: inline-block; background: #4A5D4E; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Review Order Status</a></p>
  <p>If you believe this is in error, please reply with your transfer receipt or bank slip.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Order Processing notice.
   */
  static renderOrderProcessingNotice(context: {
    customerName: string;
    orderNumber: string;
    orderStatusUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Your order ${context.orderNumber} is being prepared`;
    const text = `
Hello ${context.customerName},

Your order ${context.orderNumber} has entered preparation and discreet climate-controlled packing.
Review status: ${context.orderStatusUrl}

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Order In Preparation</h2>
  <p>Dear ${context.customerName},</p>
  <p>Your order <strong>${context.orderNumber}</strong> has been assigned for confection assembly and discreet packaging.</p>
  <p><a href="${context.orderStatusUrl}" style="display: inline-block; background: #4A5D4E; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Check Order Status</a></p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Order Refunded notice.
   */
  static renderOrderRefundedNotice(context: {
    customerName: string;
    orderNumber: string;
    refundAmountFormatted: string;
    reason?: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Refund Processed for Order ${context.orderNumber}`;
    const text = `
Hello ${context.customerName},

A refund of ${context.refundAmountFormatted} has been processed for order ${context.orderNumber}.
${context.reason ? `Reason: ${context.reason}\n` : ''}

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Refund Notification</h2>
  <p>Dear ${context.customerName},</p>
  <p>A refund of <strong>${context.refundAmountFormatted}</strong> has been processed for order <strong>${context.orderNumber}</strong>.</p>
  ${context.reason ? `<p><strong>Details:</strong> ${context.reason}</p>` : ''}
  <p>Depending on your financial institution, funds typically reflect within 2 to 5 business days.</p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }

  /**
   * Customer Registration Welcome notice.
   */
  static renderCustomerWelcomeNotice(context: {
    customerName: string;
    accountUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Welcome to Fusion Mushroom Bars EU`;
    const text = `
Hello ${context.customerName},

Welcome to Fusion Mushroom Bars EU. Your customer account is active.
Access your dashboard: ${context.accountUrl}

Support: ${context.supportEmail}
`.trim();

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Welcome to Fusion Mushroom Bars EU</h2>
  <p>Dear ${context.customerName},</p>
  <p>Your member account has been registered. You may now manage your delivery destinations, view active order statuses, and access European batch allocations.</p>
  <p><a href="${context.accountUrl}" style="display: inline-block; background: #4A5D4E; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Access Account Portal</a></p>
</body>
</html>
`.trim();

    return { subject, text, html };
  }
}
