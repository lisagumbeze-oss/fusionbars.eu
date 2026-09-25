// ===================================================
// FUSION MUSHROOM BARS EU - PRODUCT PURCHASE ELIGIBILITY SERVICE
// Authoritative Regulatory & Destination Purchase Gate
// ===================================================

import {
  AvailabilityType,
  ComplianceClassification,
  CountryAvailabilityStatus,
  EligibilityReasonCode,
  ProductStatus,
  PurchaseEligibilityDecision,
} from '@/types';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';

export interface ProductEligibilityCheckInput {
  status: ProductStatus;
  complianceClassification?: ComplianceClassification;
  availabilityType: AvailabilityType;
  allowedCountries?: string[];
  countryOverrides?: Record<string, { status: CountryAvailabilityStatus; internalNote?: string | null }>;
  stockLevel?: number;
  variantId?: string;
  isVariantAvailable?: boolean;
}

export class ProductPurchaseEligibilityService {
  /**
   * Authoritatively evaluates whether a product/variant is purchasable for a customer's destination country.
   *
   * Gate Evaluation Pipeline:
   * 1. Product Publication Status (must be PUBLISHED)
   * 2. Compliance Classification (APPROVED vs REQUIRES_REVIEW vs BLOCKED)
   * 3. Destination Country Validity
   * 4. Explicit Country Overrides (BLOCKED / RESTRICTED / AVAILABLE)
   * 5. Product Availability Type (REGION, GLOBAL, COUNTRY, BLOCKED)
   * 6. Variant Validity
   * 7. Real-Time Inventory Stock Level
   *
   * IMPORTANT: Customer-facing messages remain generic and neutral.
   * Internal compliance notes are NEVER exposed in customerMessage.
   */
  static evaluatePurchaseEligibility(
    product: ProductEligibilityCheckInput,
    destinationCountryCode: string
  ): PurchaseEligibilityDecision {
    const country = destinationCountryCode?.toUpperCase()?.trim();

    // Gate 1: Publication Status
    if (product.status !== 'PUBLISHED') {
      return {
        eligible: false,
        reasonCode: 'NOT_PUBLISHED',
        customerMessage: 'This item is currently not available for purchase.',
        internalNote: `Product publication status is ${product.status}. Only PUBLISHED items may be purchased.`,
      };
    }

    // Gate 2: Product Compliance Classification
    if (product.complianceClassification === 'BLOCKED') {
      return {
        eligible: false,
        reasonCode: 'COMPLIANCE_REVIEW_REQUIRED',
        customerMessage: 'This product is currently unavailable for order in this region.',
        internalNote: 'Product is classified as BLOCKED under European regulatory content governance.',
      };
    }

    if (product.complianceClassification === 'REQUIRES_REVIEW') {
      return {
        eligible: false,
        reasonCode: 'COMPLIANCE_REVIEW_REQUIRED',
        customerMessage: 'This product is currently pending catalogue review and cannot be ordered.',
        internalNote: 'Product requires administrative compliance clearance before commercial checkout.',
      };
    }

    // Gate 3: Destination Country Verification
    if (!country || !CountryRegistry.isKnown(country)) {
      return {
        eligible: false,
        reasonCode: 'INVALID_DESTINATION',
        customerMessage: 'Delivery is not supported for the entered destination country.',
        internalNote: `Unrecognized ISO-2 country code: ${country}`,
      };
    }

    // Gate 4: Explicit Country Overrides (Highest Precedence)
    const override = product.countryOverrides?.[country];
    if (override) {
      if (override.status === 'BLOCKED') {
        return {
          eligible: false,
          reasonCode: 'COUNTRY_BLOCKED',
          customerMessage: 'This product is not available for dispatch to your selected destination country.',
          internalNote: override.internalNote || `Explicit administrator block for country ${country}`,
        };
      }

      if (override.status === 'RESTRICTED') {
        return {
          eligible: false,
          reasonCode: 'COUNTRY_RESTRICTED',
          customerMessage: 'This product is subject to regulatory restrictions in your destination country.',
          internalNote: override.internalNote || `Jurisdictional restrictions applied to ${country}`,
        };
      }
    }

    // Gate 5: Availability Type Policy
    switch (product.availabilityType) {
      case 'BLOCKED':
        return {
          eligible: false,
          reasonCode: 'COUNTRY_BLOCKED',
          customerMessage: 'This product is currently unavailable for order.',
          internalNote: 'Global availabilityType is BLOCKED.',
        };

      case 'REGION':
        // European regional scope: Must be European (EU member state, UK, EEA, or microstate)
        if (!CountryRegistry.isEuropean(country)) {
          return {
            eligible: false,
            reasonCode: 'COUNTRY_BLOCKED',
            customerMessage: 'This product is only available for delivery within Europe.',
            internalNote: `Destination ${country} is outside the approved European regional perimeter.`,
          };
        }
        break;

      case 'COUNTRY':
        // Strict explicit whitelist
        const allowed = product.allowedCountries?.map((c) => c.toUpperCase()) || [];
        if (!allowed.includes(country)) {
          return {
            eligible: false,
            reasonCode: 'COUNTRY_BLOCKED',
            customerMessage: 'This product is not available for delivery in your country.',
            internalNote: `Country ${country} is not included in the explicit whitelist: [${allowed.join(', ')}].`,
          };
        }
        break;

      case 'GLOBAL':
        // Allowed if destination is supported
        break;

      default:
        return {
          eligible: false,
          reasonCode: 'COUNTRY_BLOCKED',
          customerMessage: 'This product is currently unavailable for delivery.',
          internalNote: `Unrecognized availabilityType: ${product.availabilityType}`,
        };
    }

    // Gate 6: Variant Validation
    if (product.isVariantAvailable === false) {
      return {
        eligible: false,
        reasonCode: 'VARIANT_UNAVAILABLE',
        customerMessage: 'The selected product variant is currently unavailable.',
        internalNote: 'Variant was flagged as unavailable or removed from catalogue.',
      };
    }

    // Gate 7: Inventory Availability
    if (product.stockLevel !== undefined && product.stockLevel <= 0) {
      return {
        eligible: false,
        reasonCode: 'OUT_OF_STOCK',
        customerMessage: 'This item is currently out of stock.',
        internalNote: `Physical inventory stockLevel is ${product.stockLevel}.`,
      };
    }

    // Passed All Commercial & Compliance Gates
    return {
      eligible: true,
      reasonCode: 'ELIGIBLE',
      customerMessage: 'Product is available for purchase and delivery.',
    };
  }
}
