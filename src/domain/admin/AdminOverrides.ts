export interface ProductCommercialOverride {
  name?: string;
  headline?: string;
  description?: string;
  priceEUR?: number;
}

export interface CustomerDirectoryOverride {
  name?: string;
  phone?: string;
  note?: string;
}

export interface StoreOperationsSettings {
  storeName: string;
  supportEmail: string;
  standardShippingCents: number;
  expressShippingCents: number;
  freeShippingThresholdCents: number;
  cryptoDiscountPercent: number;
}

const DEFAULT_SETTINGS: StoreOperationsSettings = {
  storeName: 'Fusion Mushroom Bars EU',
  supportEmail: 'sales@fusionbars.eu',
  standardShippingCents: 1500,
  expressShippingCents: 2000,
  freeShippingThresholdCents: 30000,
  cryptoDiscountPercent: 10,
};

const products = new Map<string, ProductCommercialOverride>();
const customers = new Map<string, CustomerDirectoryOverride>();
let settings: StoreOperationsSettings | null = null;

export class AdminOverrides {
  static product(slug: string): ProductCommercialOverride | undefined {
    return products.get(slug);
  }

  static saveProduct(slug: string, patch: ProductCommercialOverride) {
    const next = { ...(products.get(slug) || {}), ...patch };
    products.set(slug, next);
    return next;
  }

  static customer(email: string): CustomerDirectoryOverride | undefined {
    return customers.get(email.toLowerCase());
  }

  static saveCustomer(email: string, patch: CustomerDirectoryOverride) {
    const key = email.toLowerCase();
    const next = { ...(customers.get(key) || {}), ...patch };
    customers.set(key, next);
    return next;
  }

  static settingsSaved(): boolean {
    return settings !== null;
  }

  static settings(): StoreOperationsSettings {
    return settings ? { ...settings } : { ...DEFAULT_SETTINGS };
  }

  static saveSettings(patch: Partial<StoreOperationsSettings>) {
    settings = { ...this.settings(), ...patch };
    return { ...settings };
  }

  /** Copy server settings into this runtime so client previews match checkout. */
  static hydrate(snapshot: StoreOperationsSettings) {
    settings = { ...snapshot };
  }

  static dump() {
    return {
      settings: settings ? { ...settings } : null,
      products: Object.fromEntries(products),
      customers: Object.fromEntries(customers),
    };
  }
}
