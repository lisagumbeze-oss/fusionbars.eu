// ===================================================
// FUSION MUSHROOM BARS EU - HUB ALLOCATION SERVICE
// Deterministic Multi-Hub European Routing
// Hubs: NL (Netherlands), ES (Spain), DE (Germany), FR (France)
// ===================================================

import { FulfilmentHubCode } from '@/types';

export interface HubStockQuery {
  variantId: string;
  quantity: number;
}

export interface HubAllocationResult {
  hubCode: FulfilmentHubCode;
  hubName: string;
  reason: string;
  isFallback: boolean;
}

export class HubAllocationService {
  public static readonly HUBS: Record<FulfilmentHubCode, { code: FulfilmentHubCode; name: string; countryCode: string }> = {
    NL: { code: 'NL', name: 'Netherlands Fulfilment Hub (North / Central Europe)', countryCode: 'NL' },
    DE: { code: 'DE', name: 'Germany Fulfilment Hub (Central / Eastern Europe)', countryCode: 'DE' },
    ES: { code: 'ES', name: 'Spain Fulfilment Hub (Southern Europe / Iberia)', countryCode: 'ES' },
    FR: { code: 'FR', name: 'France Fulfilment Hub (Western Europe)', countryCode: 'FR' },
  };

  // Primary routing rules by destination ISO country code
  private static readonly DESTINATION_PRIMARY_MAP: Record<string, FulfilmentHubCode> = {
    // Netherlands Hub
    NL: 'NL',
    BE: 'NL',
    LU: 'NL',
    GB: 'NL',
    IE: 'NL',
    DK: 'NL',
    SE: 'NL',
    NO: 'NL',
    FI: 'NL',
    IS: 'NL',
    EE: 'NL',
    LV: 'NL',
    LT: 'NL',

    // Germany Hub
    DE: 'DE',
    AT: 'DE',
    CH: 'DE',
    PL: 'DE',
    CZ: 'DE',
    SK: 'DE',
    HU: 'DE',
    SI: 'DE',
    HR: 'DE',
    RO: 'DE',
    BG: 'DE',
    LI: 'DE',

    // Spain Hub
    ES: 'ES',
    PT: 'ES',
    IT: 'ES',
    GR: 'ES',
    CY: 'ES',
    MT: 'ES',
    AD: 'ES',
    SM: 'ES',
    VA: 'ES',
    GI: 'ES',

    // France Hub
    FR: 'FR',
    MC: 'FR',
  };

  // Ordered fallback preference when primary hub lacks inventory
  private static readonly FALLBACK_PRIORITY_ORDER: Record<FulfilmentHubCode, FulfilmentHubCode[]> = {
    NL: ['DE', 'FR', 'ES'],
    DE: ['NL', 'FR', 'ES'],
    ES: ['FR', 'NL', 'DE'],
    FR: ['NL', 'DE', 'ES'],
  };

  /**
   * Resolves the primary preferred hub based strictly on destination country code.
   */
  static getPreferredHub(destinationCountry: string): FulfilmentHubCode {
    const code = destinationCountry.toUpperCase();
    return this.DESTINATION_PRIMARY_MAP[code] || 'NL';
  }

  /**
   * Deterministically allocates a fulfilment hub taking into account:
   * 1. Destination Country Proximity Rule
   * 2. Stock Availability in the hub
   * 3. Configured Fallback Priority
   */
  static allocateHub(
    destinationCountry: string,
    items: HubStockQuery[],
    hubStockChecker?: (hub: FulfilmentHubCode, items: HubStockQuery[]) => boolean
  ): HubAllocationResult {
    const preferredHub = this.getPreferredHub(destinationCountry);

    // If no stock checker provided, return primary destination hub
    if (!hubStockChecker || items.length === 0) {
      return {
        hubCode: preferredHub,
        hubName: this.HUBS[preferredHub].name,
        reason: `Primary European fulfilment hub for ${destinationCountry.toUpperCase()}`,
        isFallback: false,
      };
    }

    // 1. Check primary hub availability
    if (hubStockChecker(preferredHub, items)) {
      return {
        hubCode: preferredHub,
        hubName: this.HUBS[preferredHub].name,
        reason: `Primary European fulfilment hub for ${destinationCountry.toUpperCase()} has full stock`,
        isFallback: false,
      };
    }

    // 2. Iterate fallback hubs in strict deterministic priority order
    const fallbackList = this.FALLBACK_PRIORITY_ORDER[preferredHub];
    for (const candidateHub of fallbackList) {
      if (hubStockChecker(candidateHub, items)) {
        return {
          hubCode: candidateHub,
          hubName: this.HUBS[candidateHub].name,
          reason: `Routing to ${candidateHub} hub: primary hub ${preferredHub} stock exhausted for order items`,
          isFallback: true,
        };
      }
    }

    // 3. If all hubs are constrained, return preferred hub for backorder / queuing
    return {
      hubCode: preferredHub,
      hubName: this.HUBS[preferredHub].name,
      reason: `Defaulting to primary hub ${preferredHub} (inventory replenishment required)`,
      isFallback: false,
    };
  }
}
