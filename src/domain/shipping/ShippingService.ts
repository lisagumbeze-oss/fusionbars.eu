// ===================================================
// FUSION MUSHROOM BARS EU - SHIPPING ENGINE
// Multi-Hub European Routing & Pricing Rules
// ===================================================

import { CurrencyCode, FulfilmentHubCode, MinorUnits, ShippingMethodOption } from '@/types';
import { MoneyEngine } from '@/lib/money';

export interface ShippingCalculationRequest {
  subtotal: MinorUnits;
  currency: CurrencyCode;
  destinationCountry: string; // ISO 2-letter
  selectedMethodCode?: 'STANDARD' | 'EXPRESS';
}

export interface ShippingCalculationResponse {
  methods: ShippingMethodOption[];
  selectedMethod: ShippingMethodOption;
  qualifiesForFreeShipping: boolean;
  freeShippingThreshold: MinorUnits;
  amountNeededForFreeShipping: MinorUnits;
  discreetPackaging: boolean;
  fulfilmentHub: FulfilmentHubCode;
}

export class ShippingService {
  // Fulfilment Hubs (Origins)
  public static readonly FULFILMENT_HUBS: Record<FulfilmentHubCode, { name: string; country: string }> = {
    NL: { name: 'Netherlands Fulfilment Hub', country: 'NL' },
    ES: { name: 'Spain Fulfilment Hub', country: 'ES' },
    DE: { name: 'Germany Fulfilment Hub', country: 'DE' },
    FR: { name: 'France Fulfilment Hub', country: 'FR' },
  };

  // Base Pricing Matrix in Minor Units
  public static readonly RATES = {
    EUR: {
      STANDARD: 1500, // €15.00
      EXPRESS: 2000,  // €20.00
      FREE_THRESHOLD: 30000, // €300.00
    },
    GBP: {
      STANDARD: 1300, // £13.00 (configurable)
      EXPRESS: 1750,  // £17.50 (configurable)
      FREE_THRESHOLD: 26000, // £260.00 (configurable)
    },
  };

  /**
   * Deterministically assigns the closest / optimal dispatch origin hub.
   */
  static resolveOptimalFulfilmentHub(destinationCountry: string): FulfilmentHubCode {
    const dest = destinationCountry.toUpperCase();
    if (['NL', 'BE', 'LU', 'DK', 'SE', 'NO', 'FI', 'IS'].includes(dest)) return 'NL';
    if (['ES', 'PT', 'AD'].includes(dest)) return 'ES';
    if (['DE', 'AT', 'CH', 'PL', 'CZ', 'SK', 'HU'].includes(dest)) return 'DE';
    if (['FR', 'IT', 'MC', 'GR', 'IE', 'GB'].includes(dest)) return 'FR';
    return 'NL'; // Default European hub
  }

  /**
   * Calculates all available shipping methods, pricing, and free shipping eligibility.
   */
  static calculateShipping(request: ShippingCalculationRequest): ShippingCalculationResponse {
    const currency = request.currency;
    const rates = this.RATES[currency] || this.RATES.EUR;
    const threshold = rates.FREE_THRESHOLD;

    const qualifiesForFreeShipping = request.subtotal >= threshold;
    const amountNeededForFreeShipping = qualifiesForFreeShipping
      ? 0
      : MoneyEngine.subtract(threshold, request.subtotal);

    const standardCost = qualifiesForFreeShipping ? 0 : rates.STANDARD;
    const expressCost = rates.EXPRESS;

    const methods: ShippingMethodOption[] = [
      {
        id: 'ship-standard',
        code: 'STANDARD',
        name: 'Standard Discreet Courier',
        estimatedDays: '2-4 business days',
        cost: standardCost,
        currency,
        isFree: qualifiesForFreeShipping,
      },
      {
        id: 'ship-express',
        code: 'EXPRESS',
        name: 'Express Priority Courier',
        estimatedDays: '1-2 business days',
        cost: expressCost,
        currency,
        isFree: false,
      },
    ];

    const selectedCode = request.selectedMethodCode || 'STANDARD';
    const selectedMethod = methods.find((m) => m.code === selectedCode) || methods[0];
    const hub = this.resolveOptimalFulfilmentHub(request.destinationCountry);

    return {
      methods,
      selectedMethod,
      qualifiesForFreeShipping,
      freeShippingThreshold: threshold,
      amountNeededForFreeShipping,
      discreetPackaging: true, // Always true by default
      fulfilmentHub: hub,
    };
  }
}
