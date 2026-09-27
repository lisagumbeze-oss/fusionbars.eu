import { EmailTemplates } from '@/emails/templates';

export type EmailAudience = 'CUSTOMER' | 'ADMIN';

export interface EmailTemplateSummary {
  id: string;
  name: string;
  purpose: string;
  trigger: string;
  recipient: string;
  audience: EmailAudience;
  variables: string[];
  active: boolean;
  lastUpdated: string;
}

export interface EmailTemplatePreview extends EmailTemplateSummary {
  subject: string;
  text: string;
  html: string;
}

const UPDATED = 'Maintained in the transactional template module';

const ORDER = {
  customerName: 'Preview Customer',
  orderNumber: 'FB-PREVIEW-1001',
  totalAmount: 2499,
  currency: 'EUR' as const,
  items: [{ name: 'Preview item', quantity: 1, price: 2499 }],
  supportEmail: 'sales@fusionbars.eu',
};

const TEMPLATES: EmailTemplateSummary[] = [
  { id: 'sepa-order-confirmation', name: 'SEPA / IBAN order confirmation', purpose: 'Give the customer bank-transfer instructions after checkout.', trigger: 'Order placed with bank transfer', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'totalAmount', 'currency', 'items', 'iban', 'bic', 'bankName', 'accountHolder'], active: true, lastUpdated: UPDATED },
  { id: 'crypto-order-confirmation', name: 'Crypto order confirmation', purpose: 'Give the customer cryptocurrency payment instructions after checkout.', trigger: 'Order placed with cryptocurrency', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'totalAmount', 'currency', 'cryptoName', 'network', 'receivingAddress'], active: true, lastUpdated: UPDATED },
  { id: 'payment-proof-submitted', name: 'Payment proof submitted', purpose: 'Acknowledge that payment evidence was received.', trigger: 'Customer submits payment proof', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'referenceOrTxid'], active: true, lastUpdated: UPDATED },
  { id: 'payment-verified', name: 'Payment verified', purpose: 'Tell the customer finance verified the payment.', trigger: 'Finance verifies a payment', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber'], active: true, lastUpdated: UPDATED },
  { id: 'payment-rejected', name: 'Payment rejected', purpose: 'Tell the customer a payment could not be verified.', trigger: 'Finance rejects a payment', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'reason', 'orderStatusUrl'], active: true, lastUpdated: UPDATED },
  { id: 'order-processing', name: 'Order processing', purpose: 'Tell the customer the order is being prepared.', trigger: 'Order enters PROCESSING', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'orderStatusUrl'], active: true, lastUpdated: UPDATED },
  { id: 'order-shipped', name: 'Order shipped', purpose: 'Tell the customer the order has shipped.', trigger: 'Order enters SHIPPED', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'trackingNumber', 'carrierName', 'hubCode'], active: true, lastUpdated: UPDATED },
  { id: 'order-delivered', name: 'Order delivered', purpose: 'Tell the customer the order was delivered.', trigger: 'Order enters DELIVERED', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber'], active: true, lastUpdated: UPDATED },
  { id: 'order-cancelled', name: 'Order cancelled', purpose: 'Tell the customer an order was cancelled.', trigger: 'Order enters CANCELLED', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'reason'], active: true, lastUpdated: UPDATED },
  { id: 'order-refunded', name: 'Order refunded', purpose: 'Tell the customer a refund was recorded.', trigger: 'Order enters REFUNDED', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'orderNumber', 'refundAmountFormatted', 'reason'], active: true, lastUpdated: UPDATED },
  { id: 'customer-welcome', name: 'Customer welcome', purpose: 'Welcome a newly registered customer.', trigger: 'Account registration', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'accountUrl'], active: true, lastUpdated: UPDATED },
  { id: 'password-reset', name: 'Password reset', purpose: 'Send a password reset link.', trigger: 'Customer requests a password reset', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'resetUrl'], active: true, lastUpdated: UPDATED },
  { id: 'email-verification', name: 'Email verification', purpose: 'Ask the customer to verify an email address.', trigger: 'Account email verification', recipient: 'Customer', audience: 'CUSTOMER', variables: ['customerName', 'verifyUrl'], active: true, lastUpdated: UPDATED },
  { id: 'admin-operational-alert', name: 'Admin operational alert', purpose: 'Notify staff that a new order needs attention.', trigger: 'New order created', recipient: 'Operations', audience: 'ADMIN', variables: ['customerName', 'orderNumber', 'totalAmount', 'currency', 'paymentMethodName'], active: true, lastUpdated: UPDATED },
];

function render(id: string): { subject: string; text: string; html: string } {
  switch (id) {
    case 'sepa-order-confirmation':
      return EmailTemplates.renderSepaOrderConfirmation({
        ...ORDER,
        iban: 'Preview IBAN — configured at send time',
        bic: 'Preview BIC',
        bankName: 'Preview bank',
        accountHolder: 'Preview account holder',
      });
    case 'crypto-order-confirmation':
      return EmailTemplates.renderCryptoOrderConfirmation({
        ...ORDER,
        cryptoName: 'Preview asset',
        network: 'Preview network',
        receivingAddress: 'preview-address-not-a-live-wallet',
      });
    case 'payment-proof-submitted':
      return EmailTemplates.renderPaymentProofSubmittedNotice({ ...ORDER, referenceOrTxid: 'PREVIEW-REF' });
    case 'payment-verified':
      return EmailTemplates.renderPaymentVerifiedNotice(ORDER);
    case 'payment-rejected':
      return EmailTemplates.renderPaymentRejectedNotice({ ...ORDER, reason: 'Preview reason', orderStatusUrl: 'https://fusionbars.eu/en/order-status/preview' });
    case 'order-processing':
      return EmailTemplates.renderOrderProcessingNotice({ ...ORDER, orderStatusUrl: 'https://fusionbars.eu/en/order-status/preview' });
    case 'order-shipped':
      return EmailTemplates.renderOrderShippedNotice({ ...ORDER, trackingNumber: 'PREVIEW-TRACK', carrierName: 'Preview carrier', hubCode: 'NL' });
    case 'order-delivered':
      return EmailTemplates.renderOrderDeliveredNotice(ORDER);
    case 'order-cancelled':
      return EmailTemplates.renderOrderCancelledNotice({ ...ORDER, reason: 'Preview cancellation' });
    case 'order-refunded':
      return EmailTemplates.renderOrderRefundedNotice({ ...ORDER, refundAmountFormatted: '€24.99', reason: 'Preview refund' });
    case 'customer-welcome':
      return EmailTemplates.renderCustomerWelcomeNotice({ customerName: ORDER.customerName, accountUrl: 'https://fusionbars.eu/en/account', supportEmail: ORDER.supportEmail });
    case 'password-reset':
      return EmailTemplates.renderPasswordResetEmail({ customerName: ORDER.customerName, resetUrl: 'https://fusionbars.eu/en/account/reset/preview', supportEmail: ORDER.supportEmail });
    case 'email-verification':
      return EmailTemplates.renderEmailVerificationEmail({ customerName: ORDER.customerName, verifyUrl: 'https://fusionbars.eu/en/account/verify/preview', supportEmail: ORDER.supportEmail });
    case 'admin-operational-alert':
      return EmailTemplates.renderAdminOrderAlert({ ...ORDER, paymentMethodName: 'Bank transfer' });
    default:
      throw new Error('Unknown email template');
  }
}

export class EmailTemplateRegistry {
  static list(): EmailTemplateSummary[] {
    return TEMPLATES.map((template) => ({ ...template, variables: [...template.variables] }));
  }

  static get(id: string): EmailTemplateSummary | undefined {
    return this.list().find((template) => template.id === id);
  }

  static preview(id: string): EmailTemplatePreview | null {
    const summary = this.get(id);
    if (!summary) return null;
    const rendered = render(id);
    return { ...summary, ...rendered };
  }
}
