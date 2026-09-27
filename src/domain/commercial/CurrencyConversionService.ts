import { MinorUnits } from '@/types';
import { CommercialConfigurationService } from '@/domain/commercial/CommercialConfigurationService';
import { MoneyEngine } from '@/lib/money';

export class CurrencyConversionService {
  static convert(params: { amountMinor: MinorUnits; sourceCurrency: string; targetCurrency: string; at: string }): { amountMinor: MinorUnits; rateScaled: number; provider: string; rateTimestamp: string; markupBps: number; version: string } {
    const state = CommercialConfigurationService.get();
    if (state.currency.pricingMode !== 'FX_DERIVED') throw new Error('FX pricing is not enabled.');
    const at = Date.parse(params.at);
    const rate = state.fx.rates
      .filter((row) => row.sourceCurrency === params.sourceCurrency && row.targetCurrency === params.targetCurrency && Date.parse(row.effectiveFrom) <= at && (!row.effectiveTo || Date.parse(row.effectiveTo) > at))
      .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
    if (!rate) throw new Error('CONFIGURATION_REQUIRED: no stored FX rate is available.');
    if (state.fx.maxAgeHours != null) {
      const ageMs = at - Date.parse(rate.rateTimestamp);
      if (ageMs > state.fx.maxAgeHours * 60 * 60 * 1000) throw new Error('FX_RATE_STALE');
    }
    const converted = Math.round((params.amountMinor * rate.rateScaled) / 1000000);
    const withMarkup = rate.markupBps ? converted + Math.round((converted * rate.markupBps) / 10000) : converted;
    return {
      amountMinor: MoneyEngine.add(withMarkup, 0),
      rateScaled: rate.rateScaled,
      provider: rate.provider,
      rateTimestamp: rate.rateTimestamp,
      markupBps: rate.markupBps,
      version: rate.id,
    };
  }
}
