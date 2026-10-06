import { DbOrder } from '@/lib/commerce-repository';
import { OrderStatus } from '@/types';
import { EmailService } from './EmailService';
import { EmailDeliveryLedger } from './EmailDeliveryLedger';

async function sendOnce(
  order: DbOrder,
  status: OrderStatus,
  template: string,
  send: () => Promise<{ success: boolean; messageId?: string; error?: string }>
): Promise<{ sent: boolean; error?: string }> {
  const recipient = (order.guestEmail || '').trim();
  const eventId = `${order.orderNumber}:${status}:${template}`;
  if (!recipient || EmailDeliveryLedger.isSuppressed(recipient)) {
    EmailDeliveryLedger.claim(eventId, { template, recipient: recipient || 'missing', provider: 'suppressed', orderNumber: order.orderNumber });
    const error = recipient ? 'The customer address cannot receive email.' : 'The order has no customer email.';
    EmailDeliveryLedger.complete(eventId, { success: false, error });
    return { sent: false, error };
  }
  if (!EmailDeliveryLedger.claim(eventId, { template, recipient, provider: EmailService.getProvider().name, orderNumber: order.orderNumber })) {
    return { sent: true };
  }
  try {
    const result = await send();
    EmailDeliveryLedger.complete(eventId, result);
    return result.success
      ? { sent: true }
      : { sent: false, error: result.error || 'The customer email was not accepted.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email send failed';
    EmailDeliveryLedger.complete(eventId, { success: false, error: message });
    return { sent: false, error: message };
  }
}

export async function dispatchOrderStatusEmail(
  order: DbOrder,
  newStatus: OrderStatus,
  options?: { reason?: string; locale?: string; previousStatus?: OrderStatus }
): Promise<{ sent: boolean; error?: string }> {
  const locale = options?.locale || 'en';
  const reason = options?.reason;

  switch (newStatus) {
    case 'PAYMENT_VERIFIED':
      return sendOnce(order, newStatus, 'payment-verified', () => EmailService.sendPaymentVerified(order));
    case 'PROCESSING':
      return sendOnce(order, newStatus, 'order-processing', () => EmailService.sendOrderProcessing(order, locale));
    case 'SHIPPED':
      return sendOnce(order, newStatus, 'order-shipped', () => EmailService.sendOrderShipped(order));
    case 'DELIVERED':
      return sendOnce(order, newStatus, 'order-delivered', () => EmailService.sendOrderDelivered(order));
    case 'CANCELLED':
      if (options?.previousStatus === 'PAYMENT_SUBMITTED') {
        return sendOnce(order, newStatus, 'payment-rejected', () => EmailService.sendPaymentRejected(order, reason, locale));
      }
      return sendOnce(order, newStatus, 'order-cancelled', () => EmailService.sendOrderCancelled(order, reason));
    case 'REFUNDED':
      return sendOnce(order, newStatus, 'order-refunded', () => EmailService.sendOrderRefunded(order, reason));
    default:
      return { sent: false, error: 'This status does not send a customer email.' };
  }
}
