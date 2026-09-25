// ===================================================
// FUSION MUSHROOM BARS EU - ORDER PRICING SERVICE
// Authoritative Pre-Order Price Resolution & Verification
// ===================================================

import { CartCalculationResult, ClientCartItemInput, CurrencyCode } from '@/types';
import { CartCalculationParams, CartPricingService } from '@/domain/cart/CartPricingService';

export class OrderPricingService {
  /**
   * Generates authoritative pricing for an order creation payload.
   * Completely bypasses any prices sent from the client.
   */
  static async resolveOrderPricing(
    items: ClientCartItemInput[],
    currency: CurrencyCode,
    destinationCountry: string,
    shippingMethodCode: 'STANDARD' | 'EXPRESS',
    fetchVariantsByIds: CartCalculationParams['fetchVariantsByIds'],
    couponCode?: string,
    fetchCouponByCode?: (code: string) => Promise<any>
  ): Promise<CartCalculationResult> {
    let coupon = null;
    if (couponCode && fetchCouponByCode) {
      coupon = await fetchCouponByCode(couponCode);
    }

    return await CartPricingService.calculateCart({
      items,
      currency,
      destinationCountry,
      selectedShippingMethod: shippingMethodCode,
      coupon,
      fetchVariantsByIds,
    });
  }
}
