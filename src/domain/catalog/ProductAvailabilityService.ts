// ===================================================
// FUSION MUSHROOM BARS EU - PRODUCT AVAILABILITY SERVICE
// Country-by-Country Legal & Compliance Verification
// ===================================================

import { AvailabilityType, ComplianceClassification, CountryAvailabilityStatus, ProductStatus } from '@/types';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';

export interface ProductComplianceInput {
  status: ProductStatus;
  complianceClassification?: ComplianceClassification;
  availabilityType: AvailabilityType;
  countryOverrides?: Record<string, { status: CountryAvailabilityStatus; internalNote?: string | null }>;
}

export interface AvailabilityCheckResult {
  isPurchasable: boolean;
  isVisible: boolean;
  status: CountryAvailabilityStatus;
  reason?: string;
}

export class ProductAvailabilityService {
  // Standard approved European destination market
  private static readonly CORE_EU_COUNTRIES = new Set([
    'NL', 'DE', 'ES', 'FR', 'IT', 'BE', 'AT', 'PT', 'IE', 'LU', 'DK', 'SE', 'FI', 'PL', 'CZ', 'SK', 'GR',
  ]);

  /**
   * Authoritatively determines if a product is visible and purchasable in a destination country.
   */
  static evaluateAvailability(
    product: ProductComplianceInput,
    countryCode: string
  ): AvailabilityCheckResult {
    const normalizedCountry = countryCode.toUpperCase();

    // 1. Unpublished / Draft products are never purchasable on the public storefront
    if (product.status !== 'PUBLISHED') {
      return {
        isPurchasable: false,
        isVisible: false,
        status: 'BLOCKED',
        reason: `Product status is ${product.status}`,
      };
    }

    // 2. Compliance check: BLOCKED or REQUIRES_REVIEW products cannot be purchased
    if (product.complianceClassification === 'BLOCKED') {
      return {
        isPurchasable: false,
        isVisible: false,
        status: 'BLOCKED',
        reason: 'Product is blocked under European compliance governance',
      };
    }

    if (product.complianceClassification === 'REQUIRES_REVIEW') {
      return {
        isPurchasable: false,
        isVisible: true, // Visible in admin/catalog preview with review banner
        status: 'RESTRICTED',
        reason: 'Product requires administrative compliance clearance',
      };
    }

    // 3. Check for explicit country-level override first (takes highest precedence)
    const override = product.countryOverrides?.[normalizedCountry];
    if (override) {
      if (override.status === 'BLOCKED') {
        return {
          isPurchasable: false,
          isVisible: false,
          status: 'BLOCKED',
          reason: override.internalNote || `Explicitly prohibited for import into ${normalizedCountry}`,
        };
      }
      if (override.status === 'RESTRICTED') {
        return {
          isPurchasable: true,
          isVisible: true,
          status: 'RESTRICTED',
          reason: override.internalNote || `Subject to regulatory quantity limits in ${normalizedCountry}`,
        };
      }
      return {
        isPurchasable: true,
        isVisible: true,
        status: 'AVAILABLE',
      };
    }

    // 4. Fallback to product-level availability type
    switch (product.availabilityType) {
      case 'BLOCKED':
        return {
          isPurchasable: false,
          isVisible: false,
          status: 'BLOCKED',
          reason: 'Product is globally suspended pending compliance review',
        };

      case 'GLOBAL':
        return {
          isPurchasable: true,
          isVisible: true,
          status: 'AVAILABLE',
        };

      case 'REGION':
        // Region-based: core European countries permitted
        if (this.CORE_EU_COUNTRIES.has(normalizedCountry) || CountryRegistry.isEUMember(normalizedCountry)) {
          return {
            isPurchasable: true,
            isVisible: true,
            status: 'AVAILABLE',
          };
        }
        return {
          isPurchasable: false,
          isVisible: false,
          status: 'BLOCKED',
          reason: `Fulfillment not currently supported for destination ${normalizedCountry}`,
        };

      case 'COUNTRY':
        // Strict whitelist required via countryOverrides
        return {
          isPurchasable: false,
          isVisible: false,
          status: 'BLOCKED',
          reason: `Requires explicit jurisdictional clearance for ${normalizedCountry}`,
        };

      default:
        return {
          isPurchasable: false,
          isVisible: false,
          status: 'BLOCKED',
          reason: 'Unknown availability specification',
        };
    }
  }
}
