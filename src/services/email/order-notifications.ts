import { DbOrder } from '@/lib/commerce-repository';
import { OrderStatus } from '@/types';
import { EmailService } from './EmailService';
import { EmailDeliveryLedger } from './EmailDeliveryLedger';

async function sendOnce(
  order: DbOrder,
  status: OrderStatus,
  template: string,
  send: () => Promise<{ success: boolean; messageId?: string; error?: string }>
): Promise<void> {
  const recipient = (order.guestEmail || '').trim();
  const eventId = `${order.orderNumber}:${status}:${template}`;
  if (!recipient || EmailDeliveryLedger.isSuppressed(recipient)) {
    EmailDeliveryLedger.claim(eventId, { template, recipient: recipient || 'missing', provider: 'suppressed', orderNumber: order.orderNumber });
    EmailDeliveryLedger.complete(eventId, { success: false, error: 'Recipient is not eligible for this email.' });
    return;
  }
  if (!EmailDeliveryLedger.claim(eventId, { template, recipient, provider: EmailService.getProvider().name, orderNumber: order.orderNumber })) {
    return;
  }
  try {
    EmailDeliveryLedger.complete(eventId, await send());
  } catch (error) {
    EmailDeliveryLedger.complete(eventId, { success: false, error: error instanceof Error ? error.message : 'Email send failed' });
  }
}

export async function dispatchOrderStatusEmail(
  order: DbOrder,
  newStatus: OrderStatus,
  options?: { reason?: string; locale?: string; previousStatus?: OrderStatus }
): Promise<void> {
  const locale = options?.locale || 'en';
  const reason = options?.reason;

  switch (newStatus) {
    case 'PAYMENT_VERIFIED':
      await sendOnce(order, newStatus, 'payment-verified', () => EmailService.sendPaymentVerified(order));
      break;
    case 'PROCESSING':
      await sendOnce(order, newStatus, 'order-processing', () => EmailService.sendOrderProcessing(order, locale));
      break;
    case 'SHIPPED':
      await sendOnce(order, newStatus, 'order-shipped', () => EmailService.sendOrderShipped(order));
      break;
    case 'DELIVERED':
      await sendOnce(order, newStatus, 'order-delivered', () => EmailService.sendOrderDelivered(order));
      break;
    case 'CANCELLED':
      if (options?.previousStatus === 'PAYMENT_SUBMITTED') {
        await sendOnce(order, newStatus, 'payment-rejected', () => EmailService.sendPaymentRejected(order, reason, locale));
      } else {
        await sendOnce(order, newStatus, 'order-cancelled', () => EmailService.sendOrderCancelled(order, reason));
      }
      break;
    case 'REFUNDED':
      await sendOnce(order, newStatus, 'order-refunded', () => EmailService.sendOrderRefunded(order, reason));
      break;
    default:
      break;
  }
}
