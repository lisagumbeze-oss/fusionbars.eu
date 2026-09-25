// ===================================================
// FUSION MUSHROOM BARS EU - CORE TYPE DEFINITIONS
// Strict Domain Types & Interfaces
// ===================================================

export type CurrencyCode = 'EUR' | 'GBP';
export type LocaleCode = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';

export type ProductStatus = 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type AvailabilityType = 'GLOBAL' | 'REGION' | 'COUNTRY' | 'BLOCKED';
export type CountryAvailabilityStatus = 'AVAILABLE' | 'RESTRICTED' | 'BLOCKED';
export type ComplianceClassification = 'APPROVED' | 'REQUIRES_REVIEW' | 'BLOCKED';

export type OrderStatus =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'PAYMENT_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export const CANONICAL_ORDER_STATUSES: OrderStatus[] = [
  'DRAFT',
  'PENDING_PAYMENT',
  'PAYMENT_SUBMITTED',
  'PAYMENT_VERIFIED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export type EligibilityReasonCode =
  | 'ELIGIBLE'
  | 'NOT_PUBLISHED'
  | 'COUNTRY_BLOCKED'
  | 'COUNTRY_RESTRICTED'
  | 'COMPLIANCE_REVIEW_REQUIRED'
  | 'OUT_OF_STOCK'
  | 'VARIANT_UNAVAILABLE'
  | 'INVALID_DESTINATION';

export interface PurchaseEligibilityDecision {
  eligible: boolean;
  reasonCode: EligibilityReasonCode;
  customerMessage: string;
  internalNote?: string;
}

export type CountryCategory =
  | 'EU_MEMBER_STATE'
  | 'UNITED_KINGDOM'
  | 'EEA_EFTA'
  | 'EUROPEAN_MICROSTATE'
  | 'OTHER_EUROPEAN'
  | 'REST_OF_WORLD';

export interface CountryInfo {
  code: string; // ISO 2-letter uppercase
  name: string;
  category: CountryCategory;
  isEuropean: boolean;
  isEUMember: boolean;
  currency: CurrencyCode;
  active: boolean;
}

export type PaymentMethodType = 'BANK_TRANSFER' | 'CRYPTOCURRENCY';
export type TransactionStatus = 'PENDING_CUSTOMER_ACTION' | 'PROOF_SUBMITTED' | 'CONFIRMED' | 'REJECTED';

export type RoleName =
  | 'SUPER_ADMIN'
  | 'CATALOG_MANAGER'
  | 'ORDER_MANAGER'
  | 'FINANCE_MANAGER'
  | 'CONTENT_MANAGER'
  | 'CUSTOMER'
  | 'SYSTEM';

export type FulfilmentHubCode = 'NL' | 'ES' | 'DE' | 'FR';

// Money Representation: Always integer minor units (cents / pence)
export type MinorUnits = number; // e.g., 2000 = €20.00 / £20.00

export interface Money {
  amount: MinorUnits;
  currency: CurrencyCode;
}

export interface ClientCartItemInput {
  variantId: string;
  quantity: number;
}

export interface ValidatedLineItem {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantName: string;
  unitPrice: MinorUnits;
  quantity: number;
  lineTotal: MinorUnits;
  weightGrams?: number | null;
  imageUrl?: string | null;
}

export interface CartCalculationResult {
  items: ValidatedLineItem[];
  currency: CurrencyCode;
  subtotal: MinorUnits;
  discountAmount: MinorUnits;
  shippingAmount: MinorUnits;
  totalAmount: MinorUnits;
  qualifiesForFreeShipping: boolean;
  freeShippingThreshold: MinorUnits;
  amountNeededForFreeShipping: MinorUnits;
  appliedCoupon?: {
    code: string;
    discount: number;
    isPercent: boolean;
  };
}

export interface ShippingMethodOption {
  id: string;
  code: 'STANDARD' | 'EXPRESS';
  name: string;
  estimatedDays: string;
  cost: MinorUnits;
  currency: CurrencyCode;
  isFree: boolean;
}

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  company?: string;
  streetAddress: string;
  houseNumber?: string;
  apartmentUnit?: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  countryCode: string; // ISO 2-letter
  phone?: string;
  email: string;
}

export interface BankTransferDetails {
  beneficiary: string;
  bankName: string;
  iban: string;
  bicSwift: string;
  reference: string;
  amount: MinorUnits;
  currency: CurrencyCode;
  instructions: string;
}

export interface CryptoTransferDetails {
  cryptoName: string;
  network: string;
  address: string;
  amount: MinorUnits;
  currency: CurrencyCode;
  qrPayload: string;
  reference: string;
  instructions: string;
}

export interface AuthSessionUser {
  id: string;
  email: string;
  name?: string | null;
  role: RoleName;
  permissions: string[];
}

export interface NormalizedVariant {
  id: string;
  sku: string;
  name: string;
  flavor: string;
  weightGrams: number;
  weightLabel: string;
  priceEUR: number; // in cents
  priceGBP: number; // in pence
  compareAtEUR?: number | null;
  compareAtGBP?: number | null;
  stockLevel: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  image: string;
  provenance: string[];
}

export interface NormalizedProduct {
  id: string;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryName: string;
  headline: string;
  shortDescription: string;
  description: string;
  productType: 'CHOCOLATE_BAR' | 'GUMMIES' | 'DISPOSABLE' | 'BUNDLE' | 'CAPSULE';
  status: 'PUBLISHED' | 'PENDING_REVIEW' | 'DRAFT';
  reviewStatus: 'APPROVED' | 'REQUIRES_REVIEW';
  complianceClassification?: ComplianceClassification;
  dosageLanguageDetected?: boolean;
  reviewNotes: string;
  availabilityType: 'REGION' | 'GLOBAL' | 'COUNTRY' | 'BLOCKED';
  allowedCountries: string[];
  primaryImage: string;
  hoverImage?: string;
  galleryImages: string[];
  variants: NormalizedVariant[];
  ingredients: string[];
  allergens: string[];
  dietaryAttributes: string[];
  isNovelFoodEU: boolean;
  complianceNotes: string;
  laboratoryTesting: string;
  sourceCount: number;
  sourceRepositories: string[];
}

