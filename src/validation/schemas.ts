// ===================================================
// FUSION MUSHROOM BARS EU - ZOD VALIDATION SCHEMAS
// Strict Inbound Request Sanitization
// ===================================================

import { z } from 'zod';

export const currencySchema = z.enum(['EUR', 'GBP']);
export const localeSchema = z.enum(['en', 'de', 'fr', 'es', 'it', 'nl']);

export const clientCartItemSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  quantity: z.number().int().positive('Quantity must be an integer greater than 0').max(100),
});

export const cartCalculationRequestSchema = z.object({
  items: z.array(clientCartItemSchema),
  currency: currencySchema.default('EUR'),
  destinationCountry: z.string().length(2, 'Country code must be ISO 2-letter format').toUpperCase(),
  selectedShippingMethod: z.enum(['STANDARD', 'EXPRESS']).optional(),
  couponCode: z.string().optional(),
});

export const shippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(100).optional(),
  streetAddress: z.string().min(3, 'Street address is required').max(255),
  houseNumber: z.string().max(20).optional(),
  apartmentUnit: z.string().max(20).optional(),
  city: z.string().min(1, 'City is required').max(100),
  stateProvince: z.string().max(100).optional(),
  postalCode: z.string().min(3, 'Valid postal code is required').max(20),
  countryCode: z.string().length(2, 'Country code must be ISO 2-letter format').toUpperCase(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Valid email address is required'),
});

export const createOrderSchema = z.object({
  items: z.array(clientCartItemSchema).min(1, 'Cart cannot be empty'),
  currency: currencySchema.default('EUR'),
  shippingAddress: shippingAddressSchema,
  shippingMethodCode: z.enum(['STANDARD', 'EXPRESS']).default('STANDARD'),
  paymentMethodCode: z.enum(['SEPA_IBAN', 'CRYPTO_BTC', 'CRYPTO_USDT', 'CRYPTO_ETH']),
  couponCode: z.string().optional(),
  customerNotes: z.string().max(500).optional(),
});

export const paymentProofSubmissionSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  referenceOrTxid: z.string().min(4, 'Reference or TXID is required').max(255),
  senderAccountName: z.string().max(100).optional(),
  proofFileUrl: z.string().url('Proof file must be a valid URL').optional(),
  lookupToken: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

export const orderStatusTransitionSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  newStatus: z.enum([
    'DRAFT',
    'PENDING_PAYMENT',
    'PAYMENT_SUBMITTED',
    'PAYMENT_VERIFIED',
    'PROCESSING',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUNDED',
  ]),
  actorRole: z.enum([
    'SUPER_ADMIN',
    'CATALOG_MANAGER',
    'ORDER_MANAGER',
    'FINANCE_MANAGER',
    'CONTENT_MANAGER',
    'CUSTOMER',
    'SYSTEM',
  ]).default('FINANCE_MANAGER'),
  actorId: z.string().default('admin-staff'),
  note: z.string().max(500).optional(),
});

export const customerRegisterSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(30).optional(),
  preferredLocale: z.enum(['en', 'de', 'fr', 'es', 'it', 'nl']).default('en'),
  preferredCurrency: z.enum(['EUR', 'GBP']).default('EUR'),
});

export const customerLoginSchema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(1, 'Password is required'),
});

export const customerProfileUpdateSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(30).optional(),
  preferredLocale: z.enum(['en', 'de', 'fr', 'es', 'it', 'nl']).default('en'),
  preferredCurrency: z.enum(['EUR', 'GBP']).default('EUR'),
});

export const customerAddressSchema = z.object({
  id: z.string().optional(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(100).optional(),
  streetAddress: z.string().min(3, 'Street address is required').max(255),
  houseNumber: z.string().max(20).optional(),
  apartmentUnit: z.string().max(20).optional(),
  city: z.string().min(1, 'City is required').max(100),
  stateProvince: z.string().max(100).optional(),
  postalCode: z.string().min(3, 'Valid postal code required').max(20),
  countryCode: z.string().length(2, 'ISO 2-letter country code required').toUpperCase(),
  phone: z.string().max(30).optional(),
  isDefault: z.boolean().default(false),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email('Valid email address required'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(16, 'Invalid or expired reset token'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const guestOrderLookupSchema = z.object({
  orderNumber: z.string().min(8, 'Order number is required (FB-EU-YYYY-XXXXX)'),
  email: z.string().email('Customer or guest email address is required'),
});

export const inventoryAdjustmentSchema = z.object({
  variantId: z.string().min(1, 'Variant ID is required'),
  locationCode: z.enum(['NL', 'ES', 'DE', 'FR']),
  quantityDelta: z.number().int().refine((val) => val !== 0, 'Quantity delta cannot be zero'),
  reason: z.enum(['RESTOCK', 'CYCLE_COUNT', 'DAMAGE_WRITE_OFF', 'INTERNAL_TRANSFER', 'RETURN_RESTOCK']),
  referenceId: z.string().optional(),
  notes: z.string().max(255).optional(),
});

export const couponCreateSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters').toUpperCase(),
  discount: z.number().int().positive('Discount value must be positive'),
  isPercent: z.boolean().default(true),
  minSpendEUR: z.number().int().nonnegative().default(0),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export const contactInquirySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email address required'),
  subjectCategory: z.string().min(1).max(120),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
  locale: localeSchema.default('en'),
});

export const newsletterSubscribeSchema = z.object({
  email: z.string().email('Valid email address required'),
  locale: localeSchema.default('en'),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Valid admin email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const productCountryOverrideSchema = z.object({
  productId: z.string().min(1),
  countryCode: z.string().length(2).toUpperCase(),
  status: z.enum(['AVAILABLE', 'RESTRICTED', 'BLOCKED']),
  internalNote: z.string().max(255).optional(),
});
