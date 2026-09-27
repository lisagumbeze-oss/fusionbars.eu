import { MinorUnits } from '@/types';
import { MoneyEngine } from '@/lib/money';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';

/** Merchandise discount applied when the customer pays with cryptocurrency. */
export const CRYPTO_PAYMENT_DISCOUNT_PERCENT = 10;

export function isCryptocurrencyPayment(paymentMethodCode: string): boolean {
  return paymentMethodCode.startsWith('CRYPTO_');
}

/** Bank transfer is offered only when merchandise is at least 100.00 in the order currency. */
export const BANK_TRANSFER_MINIMUM_MINOR = 10_000;

export function isBankTransferAvailable(merchandiseSubtotalMinor: MinorUnits): boolean {
  return merchandiseSubtotalMinor >= BANK_TRANSFER_MINIMUM_MINOR;
}

/**
 * 10% of the merchandise subtotal after any coupon, in minor units.
 * Shipping is excluded so the courier charge and free-shipping threshold stay unchanged.
 */
export function cryptoDiscountPercent(): number {
  if (!AdminOverrides.settingsSaved()) return CRYPTO_PAYMENT_DISCOUNT_PERCENT;
  return AdminOverrides.settings().cryptoDiscountPercent;
}

/** Keeps localized “10%” copy aligned when an admin changes the cryptocurrency discount. */
export function applyCryptoDiscountCopy(text: string): string {
  const percent = cryptoDiscountPercent();
  if (percent === CRYPTO_PAYMENT_DISCOUNT_PERCENT) return text;
  return text.replace(/10(\s*)%/g, `${percent}$1%`);
}

export function calculateCryptoPaymentDiscount(merchandiseSubtotalAfterCoupons: MinorUnits): MinorUnits {
  if (merchandiseSubtotalAfterCoupons <= 0) {
    return 0;
  }
  return MoneyEngine.applyPercentageDiscount(merchandiseSubtotalAfterCoupons, cryptoDiscountPercent());
}
