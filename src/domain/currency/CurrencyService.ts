// ===================================================
// FUSION MUSHROOM BARS EU - CURRENCY SERVICE
// Dual-Currency Server Abstraction (EUR / GBP)
// ===================================================

import { CurrencyCode, LocaleCode, MinorUnits } from '@/types';
import { MoneyEngine } from '@/lib/money';

export interface VariantPricingSource {
  priceEUR: MinorUnits;
  priceGBP?: MinorUnits | null;
  compareAtEUR?: MinorUnits | null;
  compareAtGBP?: MinorUnits | null;
}

export class CurrencyService {
  public static readonly DEFAULT_CURRENCY: CurrencyCode = 'EUR';
  public static readonly SUPPORTED_CURRENCIES: CurrencyCode[] = ['EUR', 'GBP'];
  public static readonly DEFAULT_EUR_TO_GBP_RATE = 0.85;

  /**
   * Resolves the authoritative unit price for a variant in the requested currency.
   */
  static getPriceForCurrency(variant: VariantPricingSource, currency: CurrencyCode): MinorUnits {
    if (currency === 'GBP') {
      if (variant.priceGBP !== null && variant.priceGBP !== undefined && variant.priceGBP > 0) {
        return variant.priceGBP;
      }
      // Fallback: apply configured rate multiplier to EUR base
      return Math.round(variant.priceEUR * this.DEFAULT_EUR_TO_GBP_RATE);
    }
    return variant.priceEUR;
  }

  /**
   * Resolves compare-at price in the requested currency if present.
   */
  static getCompareAtPrice(variant: VariantPricingSource, currency: CurrencyCode): MinorUnits | null {
    if (currency === 'GBP') {
      if (variant.compareAtGBP) return variant.compareAtGBP;
      if (variant.compareAtEUR) return Math.round(variant.compareAtEUR * this.DEFAULT_EUR_TO_GBP_RATE);
      return null;
    }
    return variant.compareAtEUR ?? null;
  }

  /**
   * Validates if a currency string is supported.
   */
  static isSupported(currency: string): currency is CurrencyCode {
    return this.SUPPORTED_CURRENCIES.includes(currency as CurrencyCode);
  }

  /**
   * Formats a minor units value into a display string.
   */
  static format(amount: MinorUnits, currency: CurrencyCode = 'EUR', locale: LocaleCode = 'en'): string {
    return MoneyEngine.format(amount, currency, locale);
  }
}
