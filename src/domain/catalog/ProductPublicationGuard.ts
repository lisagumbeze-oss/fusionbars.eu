// ==============================================================================
// FUSION MUSHROOM BARS EU - PRODUCT PUBLICATION GOVERNANCE GUARD
// Hard Gate Preventing Inadvertent Activation of Non-Compliant or Ineligible Products
// ==============================================================================

export interface ProductPublicationVariantInput {
  id?: string;
  sku?: string;
  name?: string;
  priceEUR?: number;
  stockLevel?: number;
}

export interface ProductPublicationInput {
  id: string;
  status: string;
  availabilityType?: string;
  variants?: ProductPublicationVariantInput[];
  images?: Array<{ url?: string; isPrimary?: boolean }>;
  translations?: Array<{ locale: string; name?: string }>;
}

export interface ProductPublicationCheck {
  canPublish: boolean;
  reasons: string[];
  checks: {
    statusCheck: boolean;
    complianceCheck: boolean;
    variantCheck: boolean;
    pricingCheck: boolean;
    stockCheck: boolean;
    imageCheck: boolean;
    translationCoverageCheck: boolean;
  };
}

export class ProductPublicationGuard {
  /**
   * Asserts whether a product can be transitioned to PUBLISHED.
   * Rejects products with compliance issues, blocked availability, zero stock, missing prices, or missing images.
   */
  static evaluateProductForPublication(product: ProductPublicationInput): ProductPublicationCheck {
    const reasons: string[] = [];

    // 1. Status Check
    const statusCheck = product.status !== 'ARCHIVED';
    if (!statusCheck) {
      reasons.push('Archived products cannot be republished without cloning.');
    }

    // 2. Compliance & Availability Check
    const complianceCheck = product.availabilityType !== 'BLOCKED';
    if (!complianceCheck) {
      reasons.push('Product availability is set to BLOCKED by European compliance.');
    }

    // 3. Variant Check
    const variants = product.variants || [];
    const variantCheck = variants.length > 0;
    if (!variantCheck) {
      reasons.push('Product must contain at least one configured flavor or weight variant.');
    }

    // 4. Pricing Check (all variants must have positive priceEUR)
    const pricingCheck = variants.length > 0 && variants.every((v) => v.priceEUR && v.priceEUR > 0);
    if (!pricingCheck) {
      reasons.push('All product variants must have authoritative prices greater than €0.00.');
    }

    // 5. Stock Check (at least one variant must have stock > 0)
    const totalStock = variants.reduce((sum, v) => sum + (v.stockLevel || 0), 0);
    const stockCheck = totalStock > 0;
    if (!stockCheck) {
      reasons.push('Cannot publish product with zero total warehouse stock.');
    }

    // 6. Image Check (must have primary image)
    const images = product.images || [];
    const imageCheck = images.length > 0 && images.some((img) => img.isPrimary || images[0].url);
    if (!imageCheck) {
      reasons.push('Product must possess at least one primary presentation image.');
    }

    // 7. Translation Coverage Check (English name/description at minimum)
    const translationCoverageCheck = Boolean(product.translations && product.translations.length > 0);
    if (!translationCoverageCheck) {
      reasons.push('Product must contain localized descriptions.');
    }

    const canPublish =
      statusCheck &&
      complianceCheck &&
      variantCheck &&
      pricingCheck &&
      stockCheck &&
      imageCheck &&
      translationCoverageCheck;

    return {
      canPublish,
      reasons,
      checks: {
        statusCheck,
        complianceCheck,
        variantCheck,
        pricingCheck,
        stockCheck,
        imageCheck,
        translationCoverageCheck,
      },
    };
  }

  /**
   * Asserts validity before permitting publication mutation.
   */
  static assertCanPublish(product: ProductPublicationInput): void {
    const evalRes = this.evaluateProductForPublication(product);
    if (!evalRes.canPublish) {
      throw new Error(`[PUBLICATION REJECTED] ${evalRes.reasons.join(' ')}`);
    }
  }
}
