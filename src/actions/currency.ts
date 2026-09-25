'use server';

import { CurrencyCode } from '../types';
import { CurrencyService } from '../domain/currency/CurrencyService';

export interface ResolveCurrencyInput {
  targetCurrency: CurrencyCode;
  priceEUR: number;
  priceGBP?: number | null;
}

export async function resolveCurrencyPriceAction(input: ResolveCurrencyInput) {
  const price = CurrencyService.getPriceForCurrency(
    {
      priceEUR: input.priceEUR,
      priceGBP: input.priceGBP,
    },
    input.targetCurrency
  );

  return {
    success: true,
    data: {
      currency: input.targetCurrency,
      price,
      formatted: CurrencyService.format(price, input.targetCurrency),
    },
  };
}
