'use server';

import { CurrencyCode } from '../types';
import { CurrencyService } from '../domain/currency/CurrencyService';
import { PricingEngine } from '@/domain/commercial/PricingEngine';

export interface ResolveCurrencyInput {
  targetCurrency: CurrencyCode;
  priceEUR: number;
  priceGBP?: number | null;
}

export async function resolveCurrencyPriceAction(input: ResolveCurrencyInput) {
  try {
    const resolved = PricingEngine.resolveUnitPrice({
      slug: 'currency-display',
      catalogue: { priceEUR: input.priceEUR, priceGBP: input.priceGBP },
      currency: input.targetCurrency,
    });
    return {
      success: true as const,
      data: {
        currency: input.targetCurrency,
        price: resolved.amountMinor,
        basis: resolved.basis,
        formatted: CurrencyService.format(resolved.amountMinor, input.targetCurrency),
      },
    };
  } catch (err: any) {
    return { success: false as const, error: err.message || 'CONFIGURATION_REQUIRED' };
  }
}
