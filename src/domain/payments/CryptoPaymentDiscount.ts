import { MinorUnits } from '@/types';
import { MoneyEngine } from '@/lib/money';

/** Merchandise discount applied when the customer pays with cryptocurrency. */
export const CRYPTO_PAYMENT_DISCOUNT_PERCENT = 10;

export function isCryptocurrencyPayment(paymentMethodCode: string): boolean {
  return paymentMethodCode.startsWith('CRYPTO_');
}

/**
 * 10% of the merchandise subtotal after any coupon, in minor units.
 * Shipping is excluded so the courier charge and free-shipping threshold stay unchanged.
 */
export function calculateCryptoPaymentDiscount(merchandiseSubtotalAfterCoupons: MinorUnits): MinorUnits {
  if (merchandiseSubtotalAfterCoupons <= 0) {
    return 0;
  }
  return MoneyEngine.applyPercentageDiscount(
    merchandiseSubtotalAfterCoupons,
    CRYPTO_PAYMENT_DISCOUNT_PERCENT
  );
}
