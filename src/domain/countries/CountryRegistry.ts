// ===================================================
// FUSION MUSHROOM BARS EU - COUNTRY REGISTRY
// European Destination Markets & Global Country Model
// ===================================================

import { CountryCategory, CountryInfo, CurrencyCode } from '@/types';

export class CountryRegistry {
  private static readonly COUNTRIES: Record<string, CountryInfo> = {
    // ----------------------------------------------------
    // 1. EU MEMBER STATES (27 Countries)
    // ----------------------------------------------------
    AT: { code: 'AT', name: 'Austria', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    BE: { code: 'BE', name: 'Belgium', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    BG: { code: 'BG', name: 'Bulgaria', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    HR: { code: 'HR', name: 'Croatia', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    CY: { code: 'CY', name: 'Cyprus', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    CZ: { code: 'CZ', name: 'Czech Republic', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    DK: { code: 'DK', name: 'Denmark', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    EE: { code: 'EE', name: 'Estonia', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    FI: { code: 'FI', name: 'Finland', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    FR: { code: 'FR', name: 'France', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    DE: { code: 'DE', name: 'Germany', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    GR: { code: 'GR', name: 'Greece', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    HU: { code: 'HU', name: 'Hungary', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    IE: { code: 'IE', name: 'Ireland', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    IT: { code: 'IT', name: 'Italy', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    LV: { code: 'LV', name: 'Latvia', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    LT: { code: 'LT', name: 'Lithuania', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    LU: { code: 'LU', name: 'Luxembourg', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    MT: { code: 'MT', name: 'Malta', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    NL: { code: 'NL', name: 'Netherlands', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    PL: { code: 'PL', name: 'Poland', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    PT: { code: 'PT', name: 'Portugal', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    RO: { code: 'RO', name: 'Romania', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    SK: { code: 'SK', name: 'Slovakia', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    SI: { code: 'SI', name: 'Slovenia', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    ES: { code: 'ES', name: 'Spain', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },
    SE: { code: 'SE', name: 'Sweden', category: 'EU_MEMBER_STATE', isEuropean: true, isEUMember: true, currency: 'EUR', active: true },

    // ----------------------------------------------------
    // 2. UNITED KINGDOM
    // ----------------------------------------------------
    GB: { code: 'GB', name: 'United Kingdom', category: 'UNITED_KINGDOM', isEuropean: true, isEUMember: false, currency: 'GBP', active: true },

    // ----------------------------------------------------
    // 3. EEA / EFTA COUNTRIES
    // ----------------------------------------------------
    NO: { code: 'NO', name: 'Norway', category: 'EEA_EFTA', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },
    IS: { code: 'IS', name: 'Iceland', category: 'EEA_EFTA', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },
    LI: { code: 'LI', name: 'Liechtenstein', category: 'EEA_EFTA', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },

    // ----------------------------------------------------
    // 4. EUROPEAN MICROSTATES
    // ----------------------------------------------------
    AD: { code: 'AD', name: 'Andorra', category: 'EUROPEAN_MICROSTATE', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },
    MC: { code: 'MC', name: 'Monaco', category: 'EUROPEAN_MICROSTATE', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },
    SM: { code: 'SM', name: 'San Marino', category: 'EUROPEAN_MICROSTATE', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },
    VA: { code: 'VA', name: 'Vatican City', category: 'EUROPEAN_MICROSTATE', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },

    // ----------------------------------------------------
    // 5. OTHER EUROPEAN TERRITORIES
    // ----------------------------------------------------
    CH: { code: 'CH', name: 'Switzerland', category: 'OTHER_EUROPEAN', isEuropean: true, isEUMember: false, currency: 'EUR', active: true },

    // ----------------------------------------------------
    // 6. REST OF WORLD (For future configuration & explicit blocking)
    // ----------------------------------------------------
    US: { code: 'US', name: 'United States', category: 'REST_OF_WORLD', isEuropean: false, isEUMember: false, currency: 'EUR', active: false },
    CA: { code: 'CA', name: 'Canada', category: 'REST_OF_WORLD', isEuropean: false, isEUMember: false, currency: 'EUR', active: false },
    AU: { code: 'AU', name: 'Australia', category: 'REST_OF_WORLD', isEuropean: false, isEUMember: false, currency: 'EUR', active: false },
    JP: { code: 'JP', name: 'Japan', category: 'REST_OF_WORLD', isEuropean: false, isEUMember: false, currency: 'EUR', active: false },
  };

  /**
   * Retrieves country info by ISO-2 code (case-insensitive).
   */
  static getCountry(code: string): CountryInfo | undefined {
    return this.COUNTRIES[code.toUpperCase()];
  }

  /**
   * Checks if country is a valid known destination.
   */
  static isKnown(code: string): boolean {
    return !!this.COUNTRIES[code.toUpperCase()];
  }

  /**
   * Returns true if country is European (EU, UK, EEA, Microstates, CH).
   */
  static isEuropean(code: string): boolean {
    const c = this.getCountry(code);
    return c ? c.isEuropean : false;
  }

  /**
   * Returns true if country is an official EU member state (27 states).
   */
  static isEUMember(code: string): boolean {
    const c = this.getCountry(code);
    return c ? c.isEUMember : false;
  }

  /**
   * Returns all active shipping destinations for customer selection.
   */
  static getActiveDestinations(): CountryInfo[] {
    return Object.values(this.COUNTRIES)
      .filter((c) => c.active)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Alias for getActiveDestinations.
   */
  static getAllSupportedCountries(): CountryInfo[] {
    return this.getActiveDestinations();
  }

  /**
   * Returns all countries in registry.
   */
  static getAllCountries(): CountryInfo[] {
    return Object.values(this.COUNTRIES).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Returns default currency for destination.
   */
  static getDefaultCurrency(code: string): CurrencyCode {
    const c = this.getCountry(code);
    return c?.currency || 'EUR';
  }

  static getAlpha3(code: string): string | null {
    return ALPHA3[code.toUpperCase()] || null;
  }

  /** Store shipping configuration only. This is not a legal or product eligibility decision. */
  static storeDestinationStatus(code: string): 'ENABLED' | 'DISABLED' | 'NOT_CONFIGURED' {
    const country = this.getCountry(code);
    if (!country) return 'NOT_CONFIGURED';
    return country.active ? 'ENABLED' : 'DISABLED';
  }
}

const ALPHA3: Record<string, string> = {
  AT: 'AUT', BE: 'BEL', BG: 'BGR', HR: 'HRV', CY: 'CYP', CZ: 'CZE', DK: 'DNK', EE: 'EST', FI: 'FIN', FR: 'FRA',
  DE: 'DEU', GR: 'GRC', HU: 'HUN', IE: 'IRL', IT: 'ITA', LV: 'LVA', LT: 'LTU', LU: 'LUX', MT: 'MLT', NL: 'NLD',
  PL: 'POL', PT: 'PRT', RO: 'ROU', SK: 'SVK', SI: 'SVN', ES: 'ESP', SE: 'SWE', GB: 'GBR', NO: 'NOR', IS: 'ISL',
  LI: 'LIE', AD: 'AND', MC: 'MCO', SM: 'SMR', VA: 'VAT', CH: 'CHE', US: 'USA', CA: 'CAN', AU: 'AUS', JP: 'JPN',
};
