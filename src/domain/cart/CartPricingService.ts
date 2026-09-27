// ===================================================
// FUSION MUSHROOM BARS EU - CART PRICING ENGINE
// Authoritative Server-Side Calculation
// Zero Trust of Client-Submitted Monetary Values
// ===================================================

import {
  CartCalculationResult,
  ClientCartItemInput,
  CurrencyCode,
  MinorUnits,
  ValidatedLineItem,
} from '@/types';
import { MoneyEngine } from '@/lib/money';
import { VariantPricingSource } from '@/domain/currency/CurrencyService';
import { PricingEngine } from '@/domain/commercial/PricingEngine';
import { ShippingService } from '@/domain/shipping/ShippingService';
import { ProductAvailabilityService } from '@/domain/catalog/ProductAvailabilityService';
import { ProductPurchaseEligibilityService } from '@/domain/catalog/ProductPurchaseEligibilityService';

export interface CartProductVariantRecord extends VariantPricingSource {
  id: string;
  sku: string;
  name: string;
  weightGrams?: number | null;
  stockLevel: number;
  product: {
    id: string;
    slug: string;
    status: any;
    complianceClassification?: any;
    availabilityType: any;
    allowedCountries?: string[];
    countryOverrides?: Record<string, { status: any; internalNote?: string | null }>;
    images?: Array<{ url: string; isPrimary: boolean }>;
  };
}

export interface CouponRule {
  code: string;
  discount: number; // e.g. 10 (10%) or fixed minor units
  isPercent: boolean;
  minSpendEUR: MinorUnits;
  isActive: boolean;
  expiresAt?: Date | null;
}

export interface CartCalculationParams {
  items: ClientCartItemInput[];
  currency: CurrencyCode;
  destinationCountry: string; // ISO 2-letter
  selectedShippingMethod?: 'STANDARD' | 'EXPRESS';
  coupon?: CouponRule | null;
  
  // Database lookup function injected for dependency isolation and testability
  fetchVariantsByIds: (ids: string[]) => Promise<CartProductVariantRecord[]>;
}

export class CartPricingService {
  /**
   * Authoritatively evaluates a shopping cart:
   * 1. Fetches real DB records for each variant
   * 2. Verifies product publication & country availability
   * 3. Calculates line totals using integer arithmetic
   * 4. Evaluates coupon conditions
   * 5. Computes European shipping costs and free shipping thresholds
   * 6. Returns tamper-proof price breakdown
   */
  static async calculateCart(params: CartCalculationParams): Promise<CartCalculationResult> {
    const { items, currency, destinationCountry, selectedShippingMethod, coupon, fetchVariantsByIds } = params;

    if (!items || items.length === 0) {
      const shipInfo = ShippingService.calculateShipping({
        subtotal: 0,
        currency,
        destinationCountry,
        selectedMethodCode: selectedShippingMethod,
      });

      return {
        items: [],
        currency,
        subtotal: 0,
        discountAmount: 0,
        shippingAmount: 0,
        totalAmount: 0,
        qualifiesForFreeShipping: false,
        freeShippingThreshold: shipInfo.freeShippingThreshold,
        amountNeededForFreeShipping: shipInfo.freeShippingThreshold,
      };
    }

    // 1. Fetch fresh DB records
    const variantIds = items.map((i) => i.variantId);
    const dbVariants = await fetchVariantsByIds(variantIds);
    const variantMap = new Map(dbVariants.map((v) => [v.id, v]));

    let subtotal: MinorUnits = 0;
    const validatedItems: ValidatedLineItem[] = [];
    const slugs = new Set<string>();

    for (const item of items) {
      if (
        typeof item.quantity !== 'number' ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > 999 ||
        Number.isNaN(item.quantity)
      ) {
        throw new Error(`Invalid item quantity specified: ${item.quantity}. Quantity must be a positive integer between 1 and 999.`);
      }

      const variant = variantMap.get(item.variantId);
      if (!variant) {
        throw new Error(`Variant ${item.variantId} was not found in catalog.`);
      }

      // Verify product purchase eligibility for target country and compliance status
      const eligibility = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: variant.product.status,
          complianceClassification: variant.product.complianceClassification,
          availabilityType: variant.product.availabilityType,
          allowedCountries: variant.product.allowedCountries,
          countryOverrides: variant.product.countryOverrides,
          stockLevel: variant.stockLevel,
        },
        destinationCountry
      );

      if (!eligibility.eligible) {
        throw new Error(
          `Item "${variant.name}" cannot be purchased for delivery to ${destinationCountry}: ${eligibility.customerMessage}`
        );
      }

      slugs.add(variant.product.slug);
      const authoritativeUnitPrice = PricingEngine.resolveUnitPrice({
        slug: variant.product.slug,
        variantId: variant.id,
        catalogue: variant,
        currency,
      }).amountMinor;
      const lineTotal = MoneyEngine.multiply(authoritativeUnitPrice, item.quantity);

      subtotal = MoneyEngine.add(subtotal, lineTotal);

      validatedItems.push({
        productId: variant.product.id,
        variantId: variant.id,
        sku: variant.sku,
        name: variant.name,
        variantName: variant.name,
        unitPrice: authoritativeUnitPrice,
        quantity: item.quantity,
        lineTotal,
        weightGrams: variant.weightGrams,
        imageUrl: variant.product.images?.find((img) => img.isPrimary)?.url || variant.product.images?.[0]?.url || null,
      });
    }

    // 2. Coupon evaluation
    let discountAmount: MinorUnits = 0;
    let appliedCouponInfo: CartCalculationResult['appliedCoupon'] = undefined;

    const couponResult = PricingEngine.applySingleCoupon(subtotal, coupon || null);
    discountAmount = couponResult.discountAmount;
    appliedCouponInfo = couponResult.applied;

    const subtotalAfterDiscount = MoneyEngine.subtract(subtotal, discountAmount);

    // 3. Shipping evaluation
    const shippingResponse = ShippingService.calculateShipping({
      subtotal: subtotalAfterDiscount,
      currency,
      destinationCountry,
      selectedMethodCode: selectedShippingMethod,
    });

    const shippingAmount = shippingResponse.selectedMethod.cost;
    const commercial = PricingEngine.finalize({
      subtotal,
      discountAmount,
      shippingAmount,
      currency,
      destinationCountry,
      productSlug: slugs.size === 1 ? [...slugs][0] : undefined,
    });

    return {
      items: validatedItems,
      currency,
      subtotal,
      discountAmount,
      shippingAmount,
      totalAmount: commercial.totalAmount,
      taxAmount: commercial.taxAmount,
      taxStatus: commercial.taxStatus,
      taxTreatment: commercial.taxTreatment,
      taxableAmount: commercial.taxableAmount,
      configurationVersion: commercial.configurationVersion,
      qualifiesForFreeShipping: shippingResponse.qualifiesForFreeShipping,
      freeShippingThreshold: shippingResponse.freeShippingThreshold,
      amountNeededForFreeShipping: shippingResponse.amountNeededForFreeShipping,
      appliedCoupon: appliedCouponInfo,
    };
  }
}
