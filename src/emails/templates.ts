// ===================================================
// FUSION MUSHROOM BARS EU - EMAIL TEMPLATES
// Branded HTML + plain-text transactional messages
// ===================================================

import { CurrencyCode, MinorUnits } from '@/types';
import { MoneyEngine } from '@/lib/money';
import {
  buildOrderStatusUrl,
  escapeHtml,
  renderAccentPanel,
  renderDetailRow,
  renderEmailShell,
  renderHeading,
  renderPrimaryButton,
} from '@/emails/shell';

export interface EmailRenderContext {
  customerName: string;
  orderNumber: string;
  totalAmount: MinorUnits;
  currency: CurrencyCode;
  items: Array<{ name: string; quantity: number; price: MinorUnits }>;
  supportEmail: string;
}

function itemsTextBlock(
  items: EmailRenderContext['items'],
  currency: CurrencyCode
): string {
  return items
    .map((i) => ` - ${i.quantity}x ${i.name} (${MoneyEngine.format(i.price, currency)})`)
    .join('\n');
}

function itemsHtmlBlock(
  items: EmailRenderContext['items'],
  currency: CurrencyCode
): string {
  const rows = items
    .map(
      (i) =>
        `<li style="margin:0 0 6px;">${escapeHtml(String(i.quantity))}× ${escapeHtml(i.name)} — ${escapeHtml(MoneyEngine.format(i.price, currency))}</li>`
    )
    .join('');
  return `<ul style="margin:12px 0 0;padding-left:20px;">${rows}</ul>`;
}

type OrderFacts = {
  statusLabel?: string;
  totalAmount?: MinorUnits;
  currency?: CurrencyCode;
  items?: EmailRenderContext['items'];
};

function orderFacts(context: OrderFacts): { text: string; html: string } {
  const lines: string[] = [];
  const rows: string[] = [];
  if (context.statusLabel) {
    lines.push(`Status: ${context.statusLabel}`);
    rows.push(renderDetailRow('Status', context.statusLabel));
  }
  if (context.totalAmount != null && context.currency) {
    const formatted = MoneyEngine.format(context.totalAmount, context.currency);
    lines.push(`Total: ${formatted}`);
    rows.push(renderDetailRow('Total', formatted));
  }
  const items = context.items || [];
  const currency = context.currency || 'EUR';
  const itemText = items.length ? `\nItems:\n${itemsTextBlock(items, currency)}` : '';
  const itemHtml = items.length
    ? `<p style="font-size:14px;color:#5C5852;margin:16px 0 8px;"><strong>Items</strong></p>${itemsHtmlBlock(items, currency)}`
    : '';
  return {
    text: `${lines.join('\n')}${itemText}`.trim(),
    html: `${rows.length ? renderAccentPanel('Order details', rows.join('')) : ''}${itemHtml}`,
  };
}

export class EmailTemplates {
  public static readonly SENDER_SUPPORT = 'Fusion Mushroom Bars EU <sales@fusionbars.eu>';
  public static readonly SENDER_ORDERS = 'Fusion EU Orders <sales@fusionbars.eu>';

  static renderSepaOrderConfirmation(
    context: EmailRenderContext & {
      iban: string;
      bic: string;
      bankName: string;
      accountHolder: string;
    }
  ): { subject: string; text: string; html: string } {
    const formattedTotal = MoneyEngine.format(context.totalAmount, context.currency);
    const subject = `Order Confirmed: ${context.orderNumber} — Contact us for bank transfer details`;
    const text = `
Hello ${context.customerName},

Thank you for your order with Fusion Mushroom Bars EU (${context.orderNumber}).

Total Amount Due: ${formattedTotal}

Items Ordered:
${itemsTextBlock(context.items, context.currency)}

=== SEPA / IBAN PAYMENT DETAILS ===
Bank account details are not included in this email.
Contact the admin for SEPA / IBAN payment details and quote order ${context.orderNumber}.

Payment reference: ${context.orderNumber}
Total due: ${formattedTotal}

Support: ${context.supportEmail}
`.trim();

    const panel = renderAccentPanel(
      'SEPA / IBAN Payment Details',
      [
        `<p style="margin:0 0 12px;font-size:14px;line-height:1.5;">Contact the admin for SEPA / IBAN payment details. Quote your order number when you write. Bank account details are not included here.</p>`,
        renderDetailRow('Payment reference', context.orderNumber, true),
        renderDetailRow('Total due', formattedTotal),
        `<p style="margin:12px 0 0;font-size:14px;line-height:1.5;">Email <a href="mailto:${escapeHtml(context.supportEmail)}">${escapeHtml(context.supportEmail)}</a>.</p>`,
      ].join('')
    );

    const html = renderEmailShell({
      title: subject,
      preheader: `Contact us for the bank transfer details for order ${context.orderNumber}.`,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Order confirmed')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Thank you for placing order <strong>${escapeHtml(context.orderNumber)}</strong>. Contact the admin for the SEPA / IBAN payment details.</p>
        ${panel}
        <p style="font-size:14px;color:#5C5852;margin:0 0 8px;"><strong>Items ordered</strong></p>
        ${itemsHtmlBlock(context.items, context.currency)}
      `,
    });

    return { subject, text, html };
  }

  static renderCryptoOrderConfirmation(
    context: EmailRenderContext & {
      cryptoName: string;
      network: string;
      receivingAddress: string;
      wallets?: Array<{ name: string; symbol: string; network: string; address: string; amount?: string }>;
    }
  ): { subject: string; text: string; html: string } {
    const formattedTotal = MoneyEngine.format(context.totalAmount, context.currency);
    const wallets = context.wallets?.filter((wallet) => wallet.address.trim()) ?? [];
    const subject = `Order Confirmed: ${context.orderNumber} — Cryptocurrency Instructions`;
    const walletText = wallets.length > 0
      ? wallets.map((wallet) => `${wallet.name} (${wallet.symbol}) — ${wallet.network}${wallet.amount ? `\nSend exactly: ${wallet.amount} ${wallet.symbol}` : ''}\nReceiving Address: ${wallet.address}`).join('\n\n')
      : `Asset: ${context.cryptoName}\nNetwork: ${context.network}\nReceiving Address: ${context.receivingAddress}`;
    const walletRows = wallets.length > 0
      ? wallets.map((wallet) => [
          renderDetailRow(wallet.name, `${wallet.symbol} · ${wallet.network}`),
          ...(wallet.amount ? [renderDetailRow('Send exactly', `${wallet.amount} ${wallet.symbol}`, true)] : []),
          renderDetailRow('Receiving address', wallet.address, true),
        ].join('')).join('')
      : [
          renderDetailRow('Network', context.network),
          renderDetailRow('Receiving address', context.receivingAddress, true),
        ].join('');
    const text = `
Hello ${context.customerName},

Thank you for your order (${context.orderNumber}).

Total Amount: ${formattedTotal}
A 10% cryptocurrency payment discount has already been applied to the merchandise subtotal. Shipping is unchanged.

${walletText}
Order Reference: ${context.orderNumber}

Support: ${context.supportEmail}
`.trim();

    const panel = renderAccentPanel(
      'Cryptocurrency payment details',
      [
        walletRows,
        renderDetailRow('Order reference', context.orderNumber, true),
        renderDetailRow('Total equivalent', formattedTotal),
      ].join('')
    );

    const html = renderEmailShell({
      title: subject,
      preheader: `Crypto payment instructions for ${context.orderNumber}.`,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Order confirmed')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Your order <strong>${escapeHtml(context.orderNumber)}</strong> is ready for payment. A 10% cryptocurrency discount has already been applied to the merchandise subtotal.</p>
        ${panel}
      `,
    });

    return { subject, text, html };
  }

  static renderAdminOrderAlert(
    context: EmailRenderContext & {
      firstName: string;
      lastName: string;
      paymentMethodName: string;
      email: string;
      phone: string;
      streetAddress: string;
      houseNumber?: string;
      postalCode: string;
      city: string;
      country: string;
      shippingMethod: string;
    }
  ): { subject: string; text: string; html: string } {
    const formattedTotal = MoneyEngine.format(context.totalAmount, context.currency);
    const subject = `[NEW ORDER] ${context.orderNumber} — ${formattedTotal} (${context.paymentMethodName})`;
    const houseLine = context.houseNumber?.trim() ? `House / unit: ${context.houseNumber.trim()}\n` : '';
    const text = `
New order ${context.orderNumber} for ${formattedTotal}.

Customer
First name: ${context.firstName}
Last name: ${context.lastName}
Email: ${context.email}
Telephone: ${context.phone}

Delivery
Street: ${context.streetAddress}
${houseLine}Postal code: ${context.postalCode}
City: ${context.city}
Country: ${context.country}
Courier: ${context.shippingMethod}

Payment: ${context.paymentMethodName}
Total: ${formattedTotal}

Items:
${itemsTextBlock(context.items, context.currency)}
`.trim();
    const html = renderEmailShell({
      title: subject,
      preheader: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('New order received', 'success')}
        ${renderAccentPanel(
          'Checkout details',
          [
            renderDetailRow('Order', context.orderNumber, true),
            renderDetailRow('First name', context.firstName),
            renderDetailRow('Last name', context.lastName),
            renderDetailRow('Email', context.email),
            renderDetailRow('Telephone', context.phone || '—'),
            renderDetailRow('Street', context.streetAddress),
            context.houseNumber?.trim() ? renderDetailRow('House / unit', context.houseNumber.trim()) : '',
            renderDetailRow('Postal code', context.postalCode),
            renderDetailRow('City', context.city),
            renderDetailRow('Country', context.country),
            renderDetailRow('Courier', context.shippingMethod),
            renderDetailRow('Payment method', context.paymentMethodName),
            renderDetailRow('Total', formattedTotal),
          ].join('')
        )}
        <p style="font-size:14px;color:#5C5852;margin:16px 0 8px;"><strong>Items ordered</strong></p>
        ${itemsHtmlBlock(context.items, context.currency)}
      `,
    });
    return { subject, text, html };
  }

  static renderPaymentProofSubmittedNotice(context: {
    customerName: string;
    orderNumber: string;
    referenceOrTxid: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = `Payment Proof Received: ${context.orderNumber}`;
    const text = `
Hello ${context.customerName},

We received your payment reference ${context.referenceOrTxid} for order ${context.orderNumber}.
Our finance desk is reconciling the transaction.

Support: ${context.supportEmail}
`.trim();

    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Payment proof received')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>We logged your submission for order <strong>${escapeHtml(context.orderNumber)}</strong>.</p>
        ${renderAccentPanel('Reference logged', renderDetailRow('Reference / TXID', context.referenceOrTxid, true))}
        <p>Once verified, your order moves to fulfilment.</p>
      `,
    });
    return { subject, text, html };
  }

  static renderPaymentVerifiedNotice(context: {
    customerName: string;
    orderNumber: string;
    supportEmail: string;
  } & OrderFacts): { subject: string; text: string; html: string } {
    const facts = orderFacts(context);
    const subject = `Payment Verified: ${context.orderNumber}`;
    const text = `Hello ${context.customerName}, payment for ${context.orderNumber} is verified. Your order is entering fulfilment.\n\n${facts.text}\n\nSupport: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Payment cleared', 'success')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Payment for order <strong>${escapeHtml(context.orderNumber)}</strong> has been confirmed.</p>
        <p>Your order is now being prepared for discreet European dispatch.</p>
        ${facts.html}
      `,
    });
    return { subject, text, html };
  }

  static renderOrderShippedNotice(context: {
    customerName: string;
    orderNumber: string;
    trackingNumber?: string | null;
    carrierName?: string | null;
    hubCode?: string;
    supportEmail: string;
  } & OrderFacts): { subject: string; text: string; html: string } {
    const hasTracking = Boolean(context.trackingNumber && context.trackingNumber.trim().length > 0);
    const subject = `Your order has shipped: ${context.orderNumber}`;
    const trackingText = hasTracking
      ? `Shipment reference: ${context.trackingNumber}${context.carrierName ? `\nCourier: ${context.carrierName}` : ''}`
      : 'In transit via European priority logistics in plain, unmarked packaging.';

    const facts = orderFacts(context);
    const text = `
Hello ${context.customerName},

Order ${context.orderNumber} has shipped.
${trackingText}
${facts.text ? `\n${facts.text}\n` : ''}
Support: ${context.supportEmail}
`.trim();

    const panelContent = hasTracking
      ? [
          context.carrierName ? renderDetailRow('Courier', context.carrierName) : '',
          renderDetailRow('Shipment reference', context.trackingNumber || '', true),
        ].join('')
      : renderDetailRow('Status', 'In transit — discreet unbranded packaging');

    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Your order has shipped')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Order <strong>${escapeHtml(context.orderNumber)}</strong> has left our European facility.</p>
        ${renderAccentPanel('Shipment update', panelContent)}
        ${facts.html}
      `,
    });
    return { subject, text, html };
  }

  static renderOrderDeliveredNotice(context: {
    customerName: string;
    orderNumber: string;
    supportEmail: string;
  } & OrderFacts): { subject: string; text: string; html: string } {
    const facts = orderFacts(context);
    const subject = `Delivered: Order ${context.orderNumber}`;
    const text = `Hello ${context.customerName}, order ${context.orderNumber} has been delivered. Thank you for choosing Fusion Mushroom Bars EU.\n\n${facts.text}\n\nSupport: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Delivery complete', 'success')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Your delivery for order <strong>${escapeHtml(context.orderNumber)}</strong> is complete.</p>
        ${facts.html}
        <p>Thank you for choosing Fusion Mushroom Bars EU.</p>
      `,
    });
    return { subject, text, html };
  }

  static renderOrderCancelledNotice(context: {
    customerName: string;
    orderNumber: string;
    reason: string;
    supportEmail: string;
  } & OrderFacts): { subject: string; text: string; html: string } {
    const facts = orderFacts(context);
    const subject = `Order Cancelled: ${context.orderNumber}`;
    const text = `Hello ${context.customerName}, order ${context.orderNumber} was cancelled. Reason: ${context.reason}.\n\n${facts.text}\n\nSupport: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Order cancelled', 'danger')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Order <strong>${escapeHtml(context.orderNumber)}</strong> has been cancelled.</p>
        ${renderAccentPanel('Reason', renderDetailRow('Details', context.reason))}
        ${facts.html}
      `,
    });
    return { subject, text, html };
  }

  static renderPasswordResetEmail(context: {
    customerName: string;
    resetUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = 'Password Reset — Fusion Mushroom Bars EU';
    const text = `Hello ${context.customerName}, reset your password: ${context.resetUrl} (valid 1 hour). Support: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Reset your password')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Use the secure link below to choose a new password. This link expires in 60 minutes.</p>
        ${renderPrimaryButton('Reset password', context.resetUrl)}
      `,
    });
    return { subject, text, html };
  }

  static renderEmailVerificationEmail(context: {
    customerName: string;
    verifyUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = 'Verify Your Email — Fusion Mushroom Bars EU';
    const text = `Hello ${context.customerName}, verify your email: ${context.verifyUrl}. Support: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Verify your email')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Welcome to Fusion Mushroom Bars EU. Please confirm your email address.</p>
        ${renderPrimaryButton('Verify email', context.verifyUrl)}
      `,
    });
    return { subject, text, html };
  }

  static renderPaymentRejectedNotice(context: {
    customerName: string;
    orderNumber: string;
    reason?: string;
    orderStatusUrl: string;
    supportEmail: string;
  } & OrderFacts): { subject: string; text: string; html: string } {
    const subject = `Payment Verification Update: ${context.orderNumber}`;
    const facts = orderFacts(context);
    const text = `
Hello ${context.customerName},
We could not verify payment for ${context.orderNumber}.
${context.reason ? `Reason: ${context.reason}\n` : ''}${facts.text ? `${facts.text}\n` : ''}
Review: ${context.orderStatusUrl}
Support: ${context.supportEmail}
`.trim();
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Payment verification update', 'danger')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>We could not reconcile the payment for order <strong>${escapeHtml(context.orderNumber)}</strong>.</p>
        ${context.reason ? renderAccentPanel('Note', renderDetailRow('Details', context.reason)) : ''}
        ${facts.html}
        ${renderPrimaryButton('Review order status', context.orderStatusUrl)}
      `,
    });
    return { subject, text, html };
  }

  static renderOrderProcessingNotice(context: {
    customerName: string;
    orderNumber: string;
    orderStatusUrl: string;
    supportEmail: string;
  } & OrderFacts): { subject: string; text: string; html: string } {
    const facts = orderFacts(context);
    const subject = `Order ${context.orderNumber} is being prepared`;
    const text = `Hello ${context.customerName}, order ${context.orderNumber} is in preparation. Status: ${context.orderStatusUrl}.\n\n${facts.text}\n\nSupport: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Order in preparation')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Order <strong>${escapeHtml(context.orderNumber)}</strong> is being assembled and packed discreetly.</p>
        ${facts.html}
        ${renderPrimaryButton('Check order status', context.orderStatusUrl)}
      `,
    });
    return { subject, text, html };
  }

  static renderOrderRefundedNotice(context: {
    customerName: string;
    orderNumber: string;
    refundAmountFormatted: string;
    reason?: string;
    supportEmail: string;
  } & OrderFacts): { subject: string; text: string; html: string } {
    const facts = orderFacts(context);
    const subject = `Refund Processed: ${context.orderNumber}`;
    const text = `Hello ${context.customerName}, refund ${context.refundAmountFormatted} for ${context.orderNumber}.${context.reason ? ` Reason: ${context.reason}` : ''}\n\n${facts.text}\n\nSupport: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Refund processed')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>A refund of <strong>${escapeHtml(context.refundAmountFormatted)}</strong> was processed for order <strong>${escapeHtml(context.orderNumber)}</strong>.</p>
        ${context.reason ? renderAccentPanel('Details', renderDetailRow('Reason', context.reason)) : ''}
        ${facts.html}
        <p style="font-size:13px;color:#5C5852;">Funds typically appear within 2–5 business days depending on your bank.</p>
      `,
    });
    return { subject, text, html };
  }

  static renderCustomerWelcomeNotice(context: {
    customerName: string;
    accountUrl: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = 'Welcome to Fusion Mushroom Bars EU';
    const text = `Hello ${context.customerName}, your account is active: ${context.accountUrl}. Support: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Welcome')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Your member account is ready. Manage orders, addresses, and dispatch preferences from your portal.</p>
        ${renderPrimaryButton('Open account', context.accountUrl)}
      `,
    });
    return { subject, text, html };
  }

  static renderContactInquiryConfirmation(context: {
    customerName: string;
    subjectCategory: string;
    supportEmail: string;
    message?: string;
  }): { subject: string; text: string; html: string } {
    const subject = 'We received your inquiry — Fusion Mushroom Bars EU';
    const messageText = context.message?.trim() ? `\n\nYour message:\n${context.message.trim()}` : '';
    const text = `Hello ${context.customerName}, we received your ${context.subjectCategory} inquiry. Our desk responds within 24 business hours.${messageText}\n\nSupport: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Inquiry received')}
        <p>Dear ${escapeHtml(context.customerName)},</p>
        <p>Thank you for contacting European operations. We received your message regarding <strong>${escapeHtml(context.subjectCategory)}</strong>.</p>
        ${context.message?.trim() ? renderAccentPanel('Your message', `<p style="margin:0;white-space:pre-wrap;">${escapeHtml(context.message.trim())}</p>`) : ''}
        <p>Our member support desk will review your inquiry within <strong>24 business hours</strong>.</p>
      `,
    });
    return { subject, text, html };
  }

  static renderContactInquiryOpsAlert(context: {
    customerName: string;
    customerEmail: string;
    subjectCategory: string;
    message: string;
    locale: string;
  }): { subject: string; text: string; html: string } {
    const subject = `[CONTACT] ${context.subjectCategory} — ${context.customerName}`;
    const text = `
Contact inquiry (${context.locale})
From: ${context.customerName} <${context.customerEmail}>
Category: ${context.subjectCategory}

${context.message}
`.trim();
    const html = renderEmailShell({
      title: subject,
      supportEmail: 'sales@fusionbars.eu',
      bodyHtml: `
        ${renderHeading('New contact inquiry')}
        ${renderAccentPanel(
          'Inquiry details',
          [
            renderDetailRow('Name', context.customerName),
            renderDetailRow('Email', context.customerEmail),
            renderDetailRow('Category', context.subjectCategory),
            renderDetailRow('Locale', context.locale),
          ].join('')
        )}
        <p style="font-size:14px;white-space:pre-wrap;margin:0;">${escapeHtml(context.message)}</p>
      `,
    });
    return { subject, text, html };
  }

  static renderNewsletterOpsAlert(context: {
    email: string;
    locale: string;
  }): { subject: string; text: string; html: string } {
    const subject = `[NEWSLETTER] ${context.email}`;
    const text = `New newsletter subscription (${context.locale}): ${context.email}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: 'sales@fusionbars.eu',
      bodyHtml: `
        ${renderHeading('New newsletter subscription')}
        ${renderAccentPanel(
          'Subscriber',
          [
            renderDetailRow('Email', context.email),
            renderDetailRow('Locale', context.locale),
          ].join('')
        )}
      `,
    });
    return { subject, text, html };
  }

  static renderNewsletterConfirmation(context: {
    email: string;
    supportEmail: string;
  }): { subject: string; text: string; html: string } {
    const subject = 'Subscription confirmed — Fusion Mushroom Bars EU';
    const text = `Your subscription to Fusion Mushroom Bars EU bulletins is confirmed for ${context.email}. Support: ${context.supportEmail}`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: context.supportEmail,
      bodyHtml: `
        ${renderHeading('Subscription confirmed', 'success')}
        <p>You are subscribed to laboratory release bulletins and European dispatch notices for <strong>${escapeHtml(context.email)}</strong>.</p>
        <p style="font-size:13px;color:#5C5852;">You can unsubscribe at any time by replying to this message.</p>
      `,
    });
    return { subject, text, html };
  }

  static renderTestEmailProbe(context: {
    recipientEmail: string;
    providerName: string;
    initiatedBy: string;
    templateName?: string;
  }): { subject: string; text: string; html: string } {
    const subject = 'FUSION PRODUCTION EMAIL TEST — TEST EMAIL';
    const text = `FUSION PRODUCTION EMAIL TEST. TEST EMAIL to ${context.recipientEmail} via ${context.providerName}, initiated by ${context.initiatedBy} at ${new Date().toISOString()}.`;
    const html = renderEmailShell({
      title: subject,
      supportEmail: 'sales@fusionbars.eu',
      bodyHtml: `
        ${renderHeading('FUSION PRODUCTION EMAIL TEST', 'success')}
        <p>This controlled verification was initiated by <strong>${escapeHtml(context.initiatedBy)}</strong>.</p>
        ${renderAccentPanel(
          'Probe details',
          [
            renderDetailRow('Recipient', context.recipientEmail),
            renderDetailRow('Template', context.templateName || 'test-email'),
            renderDetailRow('Provider', context.providerName),
            renderDetailRow('Timestamp', new Date().toISOString()),
          ].join('')
        )}
      `,
    });
    return { subject, text, html };
  }
}

export { buildOrderStatusUrl };
