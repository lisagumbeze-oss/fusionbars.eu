import { MinorUnits } from '@/types';
import { CommercialConfigurationService, TaxClass } from '@/domain/commercial/CommercialConfigurationService';

export interface TaxQuote {
  status: 'CONFIGURED' | 'TAX_CONFIGURATION_REQUIRED' | 'EXEMPT';
  treatment: 'NOT_CONFIGURED' | 'TAX_INCLUDED' | 'TAX_EXCLUDED' | 'EXEMPT';
  taxClass: TaxClass;
  rateBps: number | null;
  taxableMinor: MinorUnits | null;
  taxMinor: MinorUnits | null;
  country: string;
}

export class TaxEngine {
  static resolve(params: { country: string; taxClass: TaxClass; taxableMinor: MinorUnits; at: string }): TaxQuote {
    const state = CommercialConfigurationService.get();
    const treatment = state.tax.displayMode;
    if (treatment === 'NOT_CONFIGURED' || params.taxClass === 'NOT_CONFIGURED') {
      return this.required(params.country, params.taxClass);
    }
    const at = Date.parse(params.at);
    if (params.taxClass === 'EXEMPT') {
      const exemption = state.tax.exemptions.find((row) => row.country === params.country && row.taxClass === 'EXEMPT' && Date.parse(row.effectiveFrom) <= at && (!row.effectiveTo || Date.parse(row.effectiveTo) > at));
      if (!exemption) return this.required(params.country, params.taxClass);
      return { status: 'EXEMPT', treatment: 'EXEMPT', taxClass: params.taxClass, rateBps: 0, taxableMinor: params.taxableMinor, taxMinor: 0, country: params.country };
    }
    const rate = state.tax.rates
      .filter((row) => row.status === 'ACTIVE' && row.country === params.country && row.taxClass === params.taxClass && Date.parse(row.effectiveFrom) <= at && (!row.effectiveTo || Date.parse(row.effectiveTo) > at))
      .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
    if (!rate) return this.required(params.country, params.taxClass);
    const taxMinor = this.taxMinor(params.taxableMinor, rate.rateBps, treatment);
    return {
      status: 'CONFIGURED',
      treatment,
      taxClass: params.taxClass,
      rateBps: rate.rateBps,
      taxableMinor: params.taxableMinor,
      taxMinor,
      country: params.country,
    };
  }

  static taxMinor(taxableMinor: MinorUnits, rateBps: number, treatment: 'TAX_INCLUDED' | 'TAX_EXCLUDED'): MinorUnits {
    if (!Number.isInteger(taxableMinor) || !Number.isInteger(rateBps)) throw new Error('Tax calculation requires integer minor units and basis points.');
    if (treatment === 'TAX_INCLUDED') return Math.round((taxableMinor * rateBps) / (10000 + rateBps));
    return Math.round((taxableMinor * rateBps) / 10000);
  }

  private static required(country: string, taxClass: TaxClass): TaxQuote {
    return {
      status: 'TAX_CONFIGURATION_REQUIRED',
      treatment: 'NOT_CONFIGURED',
      taxClass,
      rateBps: null,
      taxableMinor: null,
      taxMinor: null,
      country,
    };
  }
}
