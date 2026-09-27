// Single commercial calculation layer. Source prices are never treated as approved selling prices.

import { CurrencyCode, MinorUnits } from '@/types';
import { MoneyEngine } from '@/lib/money';
import { CommercialConfigurationService, CommercialPriceStatus, CommercialPriceVersion, RoundingStrategy, TaxClass } from '@/domain/commercial/CommercialConfigurationService';
import { TaxEngine } from '@/domain/commercial/TaxEngine';
import { CurrencyConversionService } from '@/domain/commercial/CurrencyConversionService';
import firstBatchSeed from '@/data/catalogue-first-batch-state.json';
import specialistSeed from '@/data/catalogue-specialist-review-state.json';

const PILOT = ((firstBatchSeed as { selectedSlugs?: string[] }).selectedSlugs || []).slice(0, 10);

export interface CataloguePriceSource {
  priceEUR: MinorUnits;
  priceGBP?: MinorUnits | null;
}

export interface PromotionInput {
  id: string;
  kind: 'PERCENT' | 'FIXED' | 'PRODUCT' | 'CATEGORY' | 'COUPON' | 'THRESHOLD';
  percent?: number;
  amountMinor?: number;
  productSlug?: string;
  category?: string;
  code?: string;
  thresholdMinor?: number;
  active: boolean;
}

export class PricingEngine {
  static readonly CALCULATION_ORDER = [
    'Product base price',
    'Variant or approved commercial price',
    'Promotion or discount',
    'Tax or VAT treatment',
    'Shipping',
    'Final order total',
  ] as const;

  static round(amountMinor: MinorUnits, strategy: RoundingStrategy = CommercialConfigurationService.get().roundingStrategy): MinorUnits {
    if (!Number.isInteger(amountMinor)) throw new Error('Rounding requires an integer minor-unit amount.');
    if (strategy === 'NONE' || strategy === 'NEAREST_0_01') return amountMinor;
    if (strategy === 'NEAREST_0_05') return Math.round(amountMinor / 5) * 5;
    if (strategy === 'PSYCHOLOGICAL') {
      if (amountMinor < 100) return amountMinor;
      const major = Math.floor(amountMinor / 100) * 100;
      return Math.max(0, major - 1);
    }
    throw new Error('Unsupported rounding strategy.');
  }

  static specialistStatus(slug: string): CommercialPriceStatus | null {
    const products = (specialistSeed as { products?: Record<string, { pricing?: { state?: CommercialPriceStatus } }> }).products || {};
    return products[slug]?.pricing?.state || null;
  }

  static blocksPublication(status: CommercialPriceStatus | null): boolean {
    return status == null || status === 'PRICE_REVIEW_PENDING' || status === 'PRICE_DRAFT' || status === 'PRICE_DEFERRED' || status === 'PRICE_REJECTED' || status === 'PRICE_NOT_APPLICABLE';
  }

  static activeApprovedPrice(slug: string, variantId: string | null, currency: CurrencyCode, at: string): CommercialPriceVersion | null {
    const stamp = Date.parse(at);
    const matches = CommercialConfigurationService.get().prices.filter((row) => {
      if (row.productSlug !== slug || row.currency !== currency || row.status !== 'PRICE_APPROVED') return false;
      if (variantId && row.variantId && row.variantId !== variantId) return false;
      if (!variantId && row.variantId) return false;
      return Date.parse(row.effectiveFrom) <= stamp && (!row.effectiveTo || Date.parse(row.effectiveTo) > stamp);
    });
    matches.sort((a, b) => (b.variantId ? 1 : 0) - (a.variantId ? 1 : 0) || b.version - a.version);
    return matches[0] || null;
  }

  static resolveUnitPrice(params: { slug: string; variantId?: string | null; catalogue: CataloguePriceSource; currency: CurrencyCode; at?: string }): { amountMinor: MinorUnits; pricingVersion: string; basis: 'COMMERCIAL' | 'CATALOGUE' } {
    const at = params.at || new Date().toISOString();
    if (params.currency !== 'EUR' && params.currency !== 'GBP') throw new Error('Unsupported currency.');
    const specialist = this.specialistStatus(params.slug);
    if (specialist && specialist !== 'PRICE_APPROVED') {
      throw new Error(`CONFIGURATION_REQUIRED: ${params.slug} is ${specialist}.`);
    }
    const approved = this.activeApprovedPrice(params.slug, params.variantId || null, params.currency, at);
    if (approved) return { amountMinor: this.round(approved.amountMinor), pricingVersion: approved.id, basis: 'COMMERCIAL' };
    const blocked = CommercialConfigurationService.get().prices.find((row) => row.productSlug === params.slug && row.currency === params.currency && row.status !== 'PRICE_APPROVED' && row.status !== 'PRICE_DRAFT');
    if (blocked && !approved) throw new Error(`CONFIGURATION_REQUIRED: ${params.slug} is ${blocked.status}.`);
    if (params.currency === 'GBP') {
      if (params.catalogue.priceGBP != null && params.catalogue.priceGBP > 0) {
        return { amountMinor: params.catalogue.priceGBP, pricingVersion: 'CATALOGUE_UNAPPROVED', basis: 'CATALOGUE' };
      }
      if (CommercialConfigurationService.get().currency.pricingMode === 'FX_DERIVED') {
        const converted = CurrencyConversionService.convert({ amountMinor: params.catalogue.priceEUR, sourceCurrency: 'EUR', targetCurrency: 'GBP', at });
        return { amountMinor: this.round(converted.amountMinor), pricingVersion: converted.version, basis: 'COMMERCIAL' };
      }
      throw new Error('CONFIGURATION_REQUIRED: GBP price is not configured.');
    }
    if (!Number.isInteger(params.catalogue.priceEUR) || params.catalogue.priceEUR <= 0) {
      throw new Error('CONFIGURATION_REQUIRED: EUR price is not configured.');
    }
    return { amountMinor: params.catalogue.priceEUR, pricingVersion: 'CATALOGUE_UNAPPROVED', basis: 'CATALOGUE' };
  }

  static structuredOffer(slug: string, variantId: string | null, at = new Date().toISOString()): { '@type': 'Offer'; priceCurrency: 'EUR'; price: string } | null {
    const approved = this.activeApprovedPrice(slug, variantId, 'EUR', at);
    if (!approved) return null;
    return { '@type': 'Offer', priceCurrency: 'EUR', price: (approved.amountMinor / 100).toFixed(2) };
  }

  static applySingleCoupon(subtotal: MinorUnits, coupon: { code: string; discount: number; isPercent: boolean; minSpendEUR: MinorUnits; isActive: boolean; expiresAt?: Date | null } | null) {
    if (!coupon || !coupon.isActive) return { discountAmount: 0 as MinorUnits, applied: undefined as undefined };
    const notExpired = !coupon.expiresAt || new Date(coupon.expiresAt) > new Date();
    if (!notExpired || subtotal < coupon.minSpendEUR) return { discountAmount: 0 as MinorUnits, applied: undefined };
    const discountAmount = coupon.isPercent
      ? MoneyEngine.applyPercentageDiscount(subtotal, coupon.discount)
      : Math.min(subtotal, coupon.discount);
    return { discountAmount, applied: { code: coupon.code, discount: coupon.discount, isPercent: coupon.isPercent } };
  }

  static applyPromotions(subtotal: MinorUnits, rules: PromotionInput[], context: { productSlug?: string; category?: string } = {}): MinorUnits {
    const state = CommercialConfigurationService.get();
    const eligible = rules.filter((rule) => rule.active && this.promotionMatches(rule, subtotal, context));
    const selected = state.promotions.stacking === 'SEQUENTIAL' ? eligible : eligible.slice(0, 1);
    let remaining = subtotal;
    let discount = 0;
    for (const rule of selected) {
      const portion = rule.kind === 'PERCENT' || (rule.kind === 'COUPON' && rule.percent != null)
        ? MoneyEngine.applyPercentageDiscount(remaining, rule.percent || 0)
        : Math.min(remaining, rule.amountMinor || 0);
      discount = MoneyEngine.add(discount, portion);
      remaining = MoneyEngine.subtract(remaining, portion);
    }
    if (!state.promotions.allowBelowZero && discount > subtotal) return subtotal;
    return discount;
  }

  static finalize(params: { subtotal: MinorUnits; discountAmount: MinorUnits; shippingAmount: MinorUnits; currency: CurrencyCode; destinationCountry: string; productSlug?: string; at?: string }) {
    const at = params.at || new Date().toISOString();
    const taxable = MoneyEngine.subtract(params.subtotal, params.discountAmount);
    const taxClass = (params.productSlug && CommercialConfigurationService.get().tax.productClasses[params.productSlug]) || 'NOT_CONFIGURED';
    const tax = TaxEngine.resolve({ country: params.destinationCountry, taxClass, taxableMinor: taxable, at });
    const exclusive = tax.status === 'CONFIGURED' && tax.treatment === 'TAX_EXCLUDED' ? tax.taxMinor || 0 : 0;
    return {
      taxableAmount: tax.status === 'TAX_CONFIGURATION_REQUIRED' ? null : taxable,
      taxAmount: tax.taxMinor,
      taxStatus: tax.status,
      taxTreatment: tax.treatment,
      taxClass,
      taxRateBps: tax.rateBps,
      totalAmount: MoneyEngine.add(MoneyEngine.add(taxable, params.shippingAmount), exclusive),
      configurationVersion: CommercialConfigurationService.get().version,
    };
  }

  static assertSettlementReady(quote: { taxStatus: string }): void {
    if (quote.taxStatus === 'TAX_CONFIGURATION_REQUIRED') throw new Error('TAX_CONFIGURATION_REQUIRED');
  }

  static priceChanged(previous: MinorUnits, next: MinorUnits): boolean {
    return previous !== next;
  }

  static cohortReport() {
    const products = (specialistSeed as { products?: Record<string, { pricing?: { state?: CommercialPriceStatus } }> }).products || {};
    const rows = PILOT.map((slug) => ({ slug, status: products[slug]?.pricing?.state || 'PRICE_REVIEW_PENDING' }));
    return {
      products: rows,
      approvedEur: CommercialConfigurationService.get().prices.filter((row) => row.status === 'PRICE_APPROVED' && row.currency === 'EUR' && PILOT.includes(row.productSlug)).length,
      approvedGbp: CommercialConfigurationService.get().prices.filter((row) => row.status === 'PRICE_APPROVED' && row.currency === 'GBP' && PILOT.includes(row.productSlug)).length,
      pending: rows.filter((row) => row.status === 'PRICE_REVIEW_PENDING').length,
      deferred: rows.filter((row) => row.status === 'PRICE_DEFERRED').length,
      rejected: rows.filter((row) => row.status === 'PRICE_REJECTED').length,
      notApplicable: rows.filter((row) => row.status === 'PRICE_NOT_APPLICABLE').length,
    };
  }

  static commercialSummary() {
    const state = CommercialConfigurationService.get();
    const approved = state.prices.filter((row) => row.status === 'PRICE_APPROVED');
    return {
      approvedEur: approved.filter((row) => row.currency === 'EUR').length,
      approvedGbp: approved.filter((row) => row.currency === 'GBP').length,
      pending: state.prices.filter((row) => row.status === 'PRICE_REVIEW_PENDING' || row.status === 'PRICE_DRAFT').length,
      deferred: state.prices.filter((row) => row.status === 'PRICE_DEFERRED').length,
      rejected: state.prices.filter((row) => row.status === 'PRICE_REJECTED').length,
      pricingMode: state.currency.pricingMode,
      primaryCurrency: state.currency.primary,
      supportedCurrencies: state.currency.supported,
      fxStatus: state.fx.status,
      fxMaxAgeHours: state.fx.maxAgeHours,
      taxDisplayMode: state.tax.displayMode,
      jurisdictions: state.tax.jurisdictions,
      taxClasses: state.tax.classes,
      vatRates: state.tax.rates.length,
      productTaxClasses: Object.keys(state.tax.productClasses).length,
      shipping: state.shipping,
      promotions: state.promotions,
      auditEvents: state.audit.length,
      calculationOrder: this.CALCULATION_ORDER,
      priceLock: state.priceLock,
      fourEyes: state.fourEyes,
      roundingStrategy: state.roundingStrategy,
    };
  }

  static metricsFromOrders(orders: Array<{ currency: string; subtotalAmount: number; discountAmount: number; shippingAmount: number; totalAmount: number; commercialSnapshot?: { taxAmount?: number | null } }>) {
    const byCurrency: Record<string, { revenue: number; discounts: number; shipping: number; tax: number; orders: number }> = {};
    for (const order of orders) {
      const bucket = byCurrency[order.currency] || { revenue: 0, discounts: 0, shipping: 0, tax: 0, orders: 0 };
      bucket.revenue = MoneyEngine.add(bucket.revenue, order.totalAmount);
      bucket.discounts = MoneyEngine.add(bucket.discounts, order.discountAmount);
      bucket.shipping = MoneyEngine.add(bucket.shipping, order.shippingAmount);
      bucket.tax = MoneyEngine.add(bucket.tax, order.commercialSnapshot?.taxAmount || 0);
      bucket.orders += 1;
      byCurrency[order.currency] = bucket;
    }
    return byCurrency;
  }

  private static promotionMatches(rule: PromotionInput, subtotal: MinorUnits, context: { productSlug?: string; category?: string }) {
    if (rule.kind === 'PRODUCT') return rule.productSlug === context.productSlug;
    if (rule.kind === 'CATEGORY') return rule.category === context.category;
    if (rule.kind === 'THRESHOLD') return subtotal >= (rule.thresholdMinor || 0);
    return true;
  }
}
