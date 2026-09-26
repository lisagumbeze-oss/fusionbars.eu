import { DbOrder } from '@/lib/commerce-repository';
import { OrderStatus } from '@/types';
import { dispatchEmailSafely, EmailService } from './EmailService';

export async function dispatchOrderStatusEmail(
  order: DbOrder,
  newStatus: OrderStatus,
  options?: { reason?: string; locale?: string; previousStatus?: OrderStatus }
): Promise<void> {
  const locale = options?.locale || 'en';
  const reason = options?.reason;

  switch (newStatus) {
    case 'PAYMENT_VERIFIED':
      await dispatchEmailSafely('payment_verified', () => EmailService.sendPaymentVerified(order));
      break;
    case 'PROCESSING':
      await dispatchEmailSafely('order_processing', () => EmailService.sendOrderProcessing(order, locale));
      break;
    case 'SHIPPED':
      await dispatchEmailSafely('order_shipped', () => EmailService.sendOrderShipped(order));
      break;
    case 'DELIVERED':
      await dispatchEmailSafely('order_delivered', () => EmailService.sendOrderDelivered(order));
      break;
    case 'CANCELLED':
      if (options?.previousStatus === 'PAYMENT_SUBMITTED') {
        await dispatchEmailSafely('payment_rejected', () =>
          EmailService.sendPaymentRejected(order, reason, locale)
        );
      } else {
        await dispatchEmailSafely('order_cancelled', () => EmailService.sendOrderCancelled(order, reason));
      }
      break;
    case 'REFUNDED':
      await dispatchEmailSafely('order_refunded', () => EmailService.sendOrderRefunded(order, reason));
      break;
    default:
      break;
  }
}
