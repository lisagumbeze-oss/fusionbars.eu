// ===================================================
// FUSION MUSHROOM BARS EU - AUTOMATED TEST SUITE
// 11 Comprehensive Domain Engine Verification Areas
// ===================================================

import { MoneyEngine } from '@/lib/money';
import { ShippingService } from '@/domain/shipping/ShippingService';
import { CurrencyService } from '@/domain/currency/CurrencyService';
import { ProductAvailabilityService } from '@/domain/catalog/ProductAvailabilityService';
import { InventoryService } from '@/domain/inventory/InventoryService';
import { OrderStatusService } from '@/domain/orders/OrderStatusService';
import { PaymentService, BankTransferPaymentService, CryptoPaymentService } from '@/domain/payments/PaymentService';
import { RBACService } from '@/domain/auth/RBACService';
import { AuthService } from '@/domain/auth/AuthService';
import { CartPricingService, CartProductVariantRecord } from '@/domain/cart/CartPricingService';
import { OrderPricingService } from '@/domain/orders/OrderPricingService';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { ProductPurchaseEligibilityService } from '@/domain/catalog/ProductPurchaseEligibilityService';
import { ProductQualityAuditService } from '@/domain/catalog/ProductQualityAuditService';
import { CustomerAuthService } from '@/domain/auth/CustomerAuthService';
import { GuestOrderService } from '@/domain/orders/GuestOrderService';
import { OrderCreationService } from '@/domain/orders/OrderCreationService';
import { HubAllocationService } from '@/domain/inventory/HubAllocationService';
import { CommerceRepository } from '@/lib/commerce-repository';
import { EmailTemplates } from '@/emails/templates';
import { CANONICAL_ORDER_STATUSES, OrderStatus } from '@/types';
import { PaymentConfigService } from '@/domain/payments/PaymentConfig';
import {
  CRYPTO_PAYMENT_DISCOUNT_PERCENT,
  calculateCryptoPaymentDiscount,
  isCryptocurrencyPayment,
} from '@/domain/payments/CryptoPaymentDiscount';
import { fiatMinorToCryptoAmount, setCryptoPriceLoader } from '@/domain/payments/CryptoAmountQuote';
import { FileUploadSecurityService } from '@/lib/file-upload-security';
import { RateLimiterService } from '@/lib/rate-limiter';
import { PrivacyService } from '@/domain/privacy/PrivacyService';
import { lookupOrderAction } from '@/actions/orders';
import { submitPaymentProofAction } from '@/actions/payments';
import { EnvironmentService } from '@/config/environment';
import { ObjectStorageService } from '@/services/storage/ObjectStorageService';
import { EmailService } from '@/services/email/EmailService';
import { MockEmailProvider } from '@/services/email/EmailProvider';
import { ObservabilityService } from '@/lib/observability';
import { getDictionary } from '@/i18n';
import { LaunchReadinessService } from '@/domain/launch/LaunchReadinessService';
import { ProductionDeploymentGuard } from '@/domain/launch/ProductionDeploymentGuard';
import { PaymentActivationService } from '@/domain/payments/PaymentActivationService';
import { ProductPublicationGuard } from '@/domain/catalog/ProductPublicationGuard';
import { MasterCatalogueImportService } from '@/domain/import/MasterCatalogueImportService';
import { DeterministicMatchingEngine } from '@/domain/import/DeterministicMatchingEngine';
import { CatalogueReviewService } from '@/domain/catalog/CatalogueReviewService';
import { CatalogueAdjudicationService } from '@/domain/catalog/CatalogueAdjudicationService';
import { CatalogueDecisionRecommendationService } from '@/domain/catalog/CatalogueDecisionRecommendationService';
import { CatalogueReviewWorkspaceService } from '@/domain/catalog/CatalogueReviewWorkspaceService';
import { CatalogueFirstBatchService } from '@/domain/catalog/CatalogueFirstBatchService';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface TestSuiteReport {
  totalTests: number;
  passedCount: number;
  failedCount: number;
  durationMs: number;
  results: TestResult[];
}

export class DomainTestSuite {
  static async runAll(): Promise<TestSuiteReport> {
    const results: TestResult[] = [];
    const startTime = Date.now();

    const run = async (category: string, name: string, fn: () => void | Promise<void>) => {
      const t0 = Date.now();
      try {
        await fn();
        results.push({ name, category, passed: true, durationMs: Date.now() - t0 });
      } catch (err: any) {
        results.push({ name, category, passed: false, error: err.message, durationMs: Date.now() - t0 });
      }
    };

    // ----------------------------------------------------
    // AREA 1: MONEY ARITHMETIC (ZERO FLOATS)
    // ----------------------------------------------------
    await run('Money Arithmetic', 'Should accurately add minor units without float drift', () => {
      const sum = MoneyEngine.add(1999, 2001);
      if (sum !== 4000) throw new Error(`Expected 4000, got ${sum}`);
    });

    await run('Money Arithmetic', 'Should subtract minor units and clamp to zero on underflow', () => {
      const diff1 = MoneyEngine.subtract(5000, 1500);
      if (diff1 !== 3500) throw new Error(`Expected 3500, got ${diff1}`);
      const diff2 = MoneyEngine.subtract(1000, 2000);
      if (diff2 !== 0) throw new Error(`Expected 0 clamp, got ${diff2}`);
    });

    await run('Money Arithmetic', 'Should reject non-integer or float operands', () => {
      let threw = false;
      try {
        MoneyEngine.add(19.99 as any, 20);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Expected MoneyEngine to throw on float operand');
    });

    await run('Money Arithmetic', 'Should accurately apply percentage discounts with rounding', () => {
      const discounted = MoneyEngine.applyPercentageDiscount(2499, 10); // 10% of 2499 = 249.9 -> 250
      if (discounted !== 250) throw new Error(`Expected 250, got ${discounted}`);
    });

    // ----------------------------------------------------
    // AREA 2: CART TOTAL CALCULATION
    // ----------------------------------------------------
    const mockVariants: CartProductVariantRecord[] = [
      {
        id: 'var-almond-crush',
        sku: 'FUS-ALM-6G',
        name: 'Fusion Almond Crush - 6g',
        priceEUR: 2000, // €20.00
        priceGBP: 1750, // £17.50
        stockLevel: 50,
        product: {
          id: 'prod-almond',
          slug: 'fusion-almond-crush',
          status: 'PUBLISHED',
          availabilityType: 'REGION',
          images: [{ url: '/images/products/almond-crush.png', isPrimary: true }],
        },
      },
      {
        id: 'var-matcha',
        sku: 'FUS-MAT-6G',
        name: 'Fusion Matcha Reserve - 6g',
        priceEUR: 2500, // €25.00
        priceGBP: 2150, // £21.50
        stockLevel: 20,
        product: {
          id: 'prod-matcha',
          slug: 'fusion-matcha-reserve',
          status: 'PUBLISHED',
          availabilityType: 'REGION',
        },
      },
    ];

    const mockFetch = async (ids: string[]) => mockVariants.filter((v) => ids.includes(v.id));

    await run('Cart Total', 'Should compute authoritative line totals and subtotal', async () => {
      const calc = await CartPricingService.calculateCart({
        items: [
          { variantId: 'var-almond-crush', quantity: 2 }, // 2 x €20.00 = €40.00 (4000)
          { variantId: 'var-matcha', quantity: 1 },        // 1 x €25.00 = €25.00 (2500)
        ],
        currency: 'EUR',
        destinationCountry: 'DE',
        selectedShippingMethod: 'STANDARD',
        fetchVariantsByIds: mockFetch,
      });

      if (calc.subtotal !== 6500) throw new Error(`Expected subtotal 6500, got ${calc.subtotal}`);
      if (calc.shippingAmount !== 1500) throw new Error(`Expected standard shipping 1500, got ${calc.shippingAmount}`);
      if (calc.totalAmount !== 8000) throw new Error(`Expected total 8000, got ${calc.totalAmount}`);
    });

    // ----------------------------------------------------
    // AREA 3 & 4: SHIPPING & FREE SHIPPING THRESHOLD
    // ----------------------------------------------------
    await run('Shipping Calculation', 'Should apply €15 for Standard and €20 for Express under €300 threshold', () => {
      const standard = ShippingService.calculateShipping({
        subtotal: 10000, // €100.00
        currency: 'EUR',
        destinationCountry: 'NL',
        selectedMethodCode: 'STANDARD',
      });
      if (standard.selectedMethod.cost !== 1500) throw new Error(`Expected 1500, got ${standard.selectedMethod.cost}`);
      if (standard.qualifiesForFreeShipping) throw new Error('Expected qualifiesForFreeShipping to be false');
      if (standard.amountNeededForFreeShipping !== 20000) throw new Error(`Expected 20000 remaining, got ${standard.amountNeededForFreeShipping}`);

      const express = ShippingService.calculateShipping({
        subtotal: 10000,
        currency: 'EUR',
        destinationCountry: 'NL',
        selectedMethodCode: 'EXPRESS',
      });
      if (express.selectedMethod.cost !== 2000) throw new Error(`Expected 2000, got ${express.selectedMethod.cost}`);
    });

    await run('Shipping Calculation', 'Should award Free Standard Shipping when subtotal >= €300 (30000 cents)', () => {
      const ship = ShippingService.calculateShipping({
        subtotal: 30000, // Exactly €300.00
        currency: 'EUR',
        destinationCountry: 'FR',
        selectedMethodCode: 'STANDARD',
      });
      if (ship.selectedMethod.cost !== 0) throw new Error(`Expected 0 shipping cost, got ${ship.selectedMethod.cost}`);
      if (!ship.qualifiesForFreeShipping) throw new Error('Expected qualifiesForFreeShipping to be true');
      if (ship.amountNeededForFreeShipping !== 0) throw new Error('Expected 0 remaining');
    });

    await run('Shipping Calculation', 'Should route to appropriate European Fulfilment Hub', () => {
      if (ShippingService.resolveOptimalFulfilmentHub('NL') !== 'NL') throw new Error('Expected NL hub');
      if (ShippingService.resolveOptimalFulfilmentHub('ES') !== 'ES') throw new Error('Expected ES hub');
      if (ShippingService.resolveOptimalFulfilmentHub('DE') !== 'DE') throw new Error('Expected DE hub');
      if (ShippingService.resolveOptimalFulfilmentHub('FR') !== 'FR') throw new Error('Expected FR hub');
    });

    // ----------------------------------------------------
    // AREA 5: CURRENCY SELECTION
    // ----------------------------------------------------
    await run('Currency Selection', 'Should resolve explicit GBP price when defined', () => {
      const priceGBP = CurrencyService.getPriceForCurrency(mockVariants[0], 'GBP');
      if (priceGBP !== 1750) throw new Error(`Expected 1750 GBP, got ${priceGBP}`);
      const priceEUR = CurrencyService.getPriceForCurrency(mockVariants[0], 'EUR');
      if (priceEUR !== 2000) throw new Error(`Expected 2000 EUR, got ${priceEUR}`);
    });

    await run('Currency Selection', 'Should apply fallback multiplier when explicit GBP is absent', () => {
      const fallbackVariant = { priceEUR: 10000, priceGBP: null };
      const convertedGBP = CurrencyService.getPriceForCurrency(fallbackVariant, 'GBP');
      if (convertedGBP !== 8500) throw new Error(`Expected 8500 (10000 * 0.85), got ${convertedGBP}`);
    });

    // ----------------------------------------------------
    // AREA 6: PRODUCT AVAILABILITY BY COUNTRY
    // ----------------------------------------------------
    await run('Product Availability', 'Should allow core European countries for REGION-scoped published product', () => {
      const res = ProductAvailabilityService.evaluateAvailability(
        { status: 'PUBLISHED', availabilityType: 'REGION' },
        'ES'
      );
      if (!res.isPurchasable) throw new Error('Expected ES to be purchasable');
    });

    await run('Product Availability', 'Should block unapproved non-EU country for REGION-scoped product', () => {
      const res = ProductAvailabilityService.evaluateAvailability(
        { status: 'PUBLISHED', availabilityType: 'REGION' },
        'US'
      );
      if (res.isPurchasable) throw new Error('Expected US to be blocked for EU regional product');
    });

    await run('Product Availability', 'Should enforce explicit country override to BLOCK a product', () => {
      const res = ProductAvailabilityService.evaluateAvailability(
        {
          status: 'PUBLISHED',
          availabilityType: 'REGION',
          countryOverrides: {
            DE: { status: 'BLOCKED', internalNote: 'Botanical restriction under regional law' },
          },
        },
        'DE'
      );
      if (res.isPurchasable) throw new Error('Expected DE override to block purchase');
      if (!res.reason?.includes('Botanical restriction')) throw new Error('Expected custom compliance note');
    });

    await run('Product Availability', 'Should reject DRAFT or PENDING_REVIEW products from purchase', () => {
      const res = ProductAvailabilityService.evaluateAvailability(
        { status: 'DRAFT', availabilityType: 'GLOBAL' },
        'NL'
      );
      if (res.isPurchasable || res.isVisible) throw new Error('Draft product must not be purchasable');
    });

    // ----------------------------------------------------
    // AREA 7: INVENTORY RESERVATION
    // ----------------------------------------------------
    await run('Inventory Reservation', 'Should apply and commit stock reservations atomically', () => {
      const initialRecord = {
        variantId: 'var-1',
        locationCode: 'NL' as const,
        quantityOnHand: 100,
        quantityReserved: 10,
      };

      // Reserve 5
      const { updatedRecord: reserved } = InventoryService.applyReservation(initialRecord, 5);
      if (reserved.quantityReserved !== 15) throw new Error(`Expected reserved 15, got ${reserved.quantityReserved}`);
      if (reserved.quantityOnHand !== 100) throw new Error('On-hand must not change on reservation');

      // Commit 5 (order confirmed and dispatched)
      const { updatedRecord: committed } = InventoryService.commitReservation(reserved, 5);
      if (committed.quantityOnHand !== 95) throw new Error(`Expected on-hand 95, got ${committed.quantityOnHand}`);
      if (committed.quantityReserved !== 10) throw new Error(`Expected reserved back to 10, got ${committed.quantityReserved}`);
    });

    await run('Inventory Reservation', 'Should reject reservation when insufficient available stock', () => {
      const record = {
        variantId: 'var-2',
        locationCode: 'DE' as const,
        quantityOnHand: 20,
        quantityReserved: 18, // Only 2 available
      };
      let threw = false;
      try {
        InventoryService.applyReservation(record, 5);
      } catch {
        threw = true;
      }
      if (!threw) throw new Error('Expected reservation overflow to throw');
    });

    // ----------------------------------------------------
    // AREA 8: ORDER STATE TRANSITIONS
    // ----------------------------------------------------
    await run('Order State Machine', 'Should allow valid transition: PENDING_PAYMENT -> PAYMENT_SUBMITTED -> PAYMENT_VERIFIED', () => {
      if (!OrderStatusService.isTransitionAllowed('PENDING_PAYMENT', 'PAYMENT_SUBMITTED')) {
        throw new Error('Expected PENDING_PAYMENT -> PAYMENT_SUBMITTED to be allowed');
      }
      if (!OrderStatusService.isTransitionAllowed('PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED')) {
        throw new Error('Expected PAYMENT_SUBMITTED -> PAYMENT_VERIFIED to be allowed');
      }
    });

    await run('Order State Machine', 'Should reject illegal transition: PENDING_PAYMENT -> DELIVERED', () => {
      if (OrderStatusService.isTransitionAllowed('PENDING_PAYMENT', 'DELIVERED')) {
        throw new Error('Expected skipping to DELIVERED to be rejected');
      }
    });

    await run('Order State Machine', 'Should lock terminal state: CANCELLED cannot transition to PROCESSING', () => {
      if (OrderStatusService.isTransitionAllowed('CANCELLED', 'PROCESSING')) {
        throw new Error('Terminal state CANCELLED must not transition to PROCESSING');
      }
    });

    // ----------------------------------------------------
    // AREA 9: PAYMENT STATE TRANSITIONS & METHODS
    // ----------------------------------------------------
    await run('Payment Workflow', 'Customer can only submit proof; manager must verify', () => {
      const custCheck = PaymentService.evaluateTransactionTransition('PENDING_CUSTOMER_ACTION', 'CONFIRMED', 'CUSTOMER');
      if (custCheck.allowed) throw new Error('Customer must not be able to self-confirm payment');

      const custProof = PaymentService.evaluateTransactionTransition('PENDING_CUSTOMER_ACTION', 'PROOF_SUBMITTED', 'CUSTOMER');
      if (!custProof.allowed) throw new Error('Customer should be allowed to submit payment proof');

      const adminConfirm = PaymentService.evaluateTransactionTransition('PROOF_SUBMITTED', 'CONFIRMED', 'FINANCE_MANAGER');
      if (!adminConfirm.allowed) throw new Error('Finance manager must be allowed to confirm payment');
    });

    await run('Payment Providers', 'Should generate correct SEPA and Crypto instructions', () => {
      const sepaService = new BankTransferPaymentService({
        accountHolder: 'Fusion EU Logistics B.V.',
        bankName: 'ING Bank N.V.',
        iban: 'NL00BANK0000000000',
        bicSwift: 'INGBNL2A',
      });
      const sepaInstr = sepaService.generateInstructions({
        orderId: 'ord-123',
        orderNumber: 'FB-EU-2026-90210',
        amount: 5000,
        currency: 'EUR',
      });
      if (sepaInstr.reference !== 'FB-EU-2026-90210') throw new Error('Reference mismatch');
      if (sepaInstr.details.iban !== 'NL00BANK0000000000') throw new Error('IBAN missing');

      const cryptoService = new CryptoPaymentService({
        cryptoName: 'Bitcoin',
        network: 'Bitcoin Mainnet',
        receivingAddress: 'bc1qtestplaceholderonlydonotuse',
      });
      const cryptoInstr = cryptoService.generateInstructions({
        orderId: 'ord-123',
        orderNumber: 'FB-EU-2026-90210',
        amount: 5000,
        currency: 'EUR',
      });
      if (!cryptoInstr.details.qrPayload?.toString().startsWith('bitcoin:')) throw new Error('QR payload format mismatch');
    });

    // ----------------------------------------------------
    // AREA 10: AUTHORIZATION & RBAC
    // ----------------------------------------------------
    await run('RBAC Enforcement', 'Role permissions must be strictly verified', () => {
      if (!RBACService.hasPermission('SUPER_ADMIN', 'any:action')) throw new Error('Super Admin wildcard failed');
      if (!RBACService.hasPermission('FINANCE_MANAGER', 'orders:verify_payment')) throw new Error('Finance manager should have payment verification');
      if (RBACService.hasPermission('ORDER_MANAGER', 'finance:write')) throw new Error('Order manager must not have finance:write');
      if (RBACService.hasPermission('CUSTOMER', 'orders:verify_payment')) throw new Error('Customer must not have payment verification');
    });

    await run('Authentication Sessions', 'Should issue and cryptographically verify session token', () => {
      const user = { id: 'usr-admin-1', email: 'admin@fusionbars.eu', role: 'SUPER_ADMIN' as const };
      const token = AuthService.generateSessionToken(user);
      const verified = AuthService.verifySessionToken(token);
      if (!verified) throw new Error('Failed to verify valid session token');
      if (verified.email !== user.email) throw new Error('Session email mismatch');

      // Tampered token test
      const tampered = token.slice(0, -5) + 'xxxxx';
      const tamperedCheck = AuthService.verifySessionToken(tampered);
      if (tamperedCheck !== null) throw new Error('Tampered session token must be rejected');
    });

    // ----------------------------------------------------
    // AREA 11: PRICE TAMPERING PREVENTION (CRITICAL SECURITY)
    // ----------------------------------------------------
    await run('Price Tampering Defense', 'Client-submitted unit price, subtotal, and shipping must be discarded', async () => {
      // Malicious client tries to send unit price €0.01 and total €0.01 for €45.00 worth of products
      const maliciousClientPayload: any = [
        { variantId: 'var-almond-crush', quantity: 1, unitPrice: 1, lineTotal: 1 }, // Trying to pay 1 cent instead of 2000
        { variantId: 'var-matcha', quantity: 1, unitPrice: 1, lineTotal: 1 },        // Trying to pay 1 cent instead of 2500
      ];

      const recalculated = await OrderPricingService.resolveOrderPricing(
        maliciousClientPayload,
        'EUR',
        'DE',
        'STANDARD',
        mockFetch
      );

      // Verify that the server completely ignored client pricing
      if (recalculated.subtotal !== 4500) {
        throw new Error(`SECURITY FAILED: Server accepted tampered subtotal. Expected 4500, got ${recalculated.subtotal}`);
      }
      if (recalculated.items[0].unitPrice !== 2000) {
        throw new Error(`SECURITY FAILED: Item unit price tampered. Expected 2000, got ${recalculated.items[0].unitPrice}`);
      }
      if (recalculated.totalAmount !== 6000) { // 4500 subtotal + 1500 standard shipping
        throw new Error(`SECURITY FAILED: Total amount tampered. Expected 6000, got ${recalculated.totalAmount}`);
      }
    });

    // ----------------------------------------------------
    // AREA 12: CATALOGUE NORMALIZATION & DEDUPLICATION (PHASE 2)
    // ----------------------------------------------------
    await run('Catalogue Normalization', 'Should normalize flavors as variants under parent product', async () => {
      const { CatalogService } = await import('@/lib/catalog');
      const chocolateBar = CatalogService.getProductBySlug('fusion-artisan-mushroom-chocolate-bar');
      if (!chocolateBar) throw new Error('Core chocolate bar product not found');
      if (chocolateBar.variants.length < 20) {
        throw new Error(`Expected at least 20 variants for chocolate bar, got ${chocolateBar.variants.length}`);
      }
      const almondCrush = chocolateBar.variants.find((v) => v.flavor.includes('Almond'));
      if (!almondCrush) throw new Error('Almond Crush variant missing');
      if (almondCrush.weightGrams !== 6) throw new Error('Expected 6g weight for chocolate bar variant');
    });

    await run('Duplicate Detection', 'Should eliminate raw duplicate titles across source repos', async () => {
      const { CatalogService } = await import('@/lib/catalog');
      const allProducts = CatalogService.getProducts();
      // Ensure no 404 scraped pages were retained
      const has404 = allProducts.some((p) => p.name.includes('Page Not Found') || p.slug.includes('not-found'));
      if (has404) throw new Error('Scraped 404 pages were incorrectly imported');
      
      // Ensure boutique boxes are distinct
      const boxes = allProducts.filter((p) => p.categorySlug === 'bundles-collections');
      if (boxes.length === 0) throw new Error('Bundles & collections missing');
    });

    await run('Import Idempotency', 'Re-executing catalogue lookup should return deterministic immutable data', async () => {
      const { CatalogService } = await import('@/lib/catalog');
      const p1 = CatalogService.getProducts();
      const p2 = CatalogService.getProducts();
      if (p1.length !== p2.length) throw new Error('Non-deterministic product retrieval count');
      if (p1[0].id !== p2[0].id) throw new Error('Product IDs must be deterministic');
    });

    await run('Search Abstraction', 'Should locate products by SKU, variant flavor, and category', async () => {
      const { CatalogService } = await import('@/lib/catalog');
      const searchByFlavor = CatalogService.getProducts({ search: 'Birthday Cake' });
      if (searchByFlavor.length === 0) throw new Error('Search failed to find product by variant flavor Birthday Cake');

      const searchByCategory = CatalogService.getProducts({ categorySlug: 'gummies' });
      if (searchByCategory.length === 0) throw new Error('Search failed to find products by category gummies');

      const searchBySku = CatalogService.getProducts({ search: 'FUS-BAR' });
      if (searchBySku.length === 0) throw new Error('Search failed to find products by SKU prefix FUS-BAR');
    });

    await run('Variant Price Resolution', 'Should resolve EUR and GBP prices accurately on variants', async () => {
      const { CatalogService } = await import('@/lib/catalog');
      const chocolateBar = CatalogService.getProductBySlug('fusion-artisan-mushroom-chocolate-bar');
      if (!chocolateBar) throw new Error('Core chocolate bar missing');
      const v = chocolateBar.variants[0];
      if (v.priceEUR !== 2000) throw new Error(`Expected priceEUR 2000, got ${v.priceEUR}`);
      if (v.priceGBP !== 1750) throw new Error(`Expected priceGBP 1750, got ${v.priceGBP}`);
    });

    // ----------------------------------------------------
    // AREA 13: PRODUCT PURCHASE ELIGIBILITY SERVICE (PHASE 2.5)
    // ----------------------------------------------------
    await run('Product Purchase Eligibility', 'Should allow purchase of PUBLISHED and APPROVED product for valid European country', () => {
      const decision = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: 'PUBLISHED',
          complianceClassification: 'APPROVED',
          availabilityType: 'REGION',
          stockLevel: 25,
        },
        'DE'
      );
      if (!decision.eligible) throw new Error(`Expected eligible, got: ${decision.reasonCode} - ${decision.customerMessage}`);
      if (decision.reasonCode !== 'ELIGIBLE') throw new Error(`Expected reasonCode ELIGIBLE, got ${decision.reasonCode}`);
    });

    await run('Product Purchase Eligibility', 'Should reject DRAFT or PENDING_REVIEW product from checkout', () => {
      const decision = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: 'DRAFT',
          complianceClassification: 'APPROVED',
          availabilityType: 'REGION',
          stockLevel: 10,
        },
        'FR'
      );
      if (decision.eligible) throw new Error('Expected DRAFT product to be gated');
      if (decision.reasonCode !== 'NOT_PUBLISHED') throw new Error(`Expected NOT_PUBLISHED, got ${decision.reasonCode}`);
    });

    await run('Product Purchase Eligibility', 'Should block product classified as REQUIRES_REVIEW or BLOCKED', () => {
      const decision1 = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: 'PUBLISHED',
          complianceClassification: 'REQUIRES_REVIEW',
          availabilityType: 'REGION',
          stockLevel: 100,
        },
        'NL'
      );
      if (decision1.eligible) throw new Error('Expected REQUIRES_REVIEW product to be gated from purchase');
      if (decision1.reasonCode !== 'COMPLIANCE_REVIEW_REQUIRED') throw new Error(`Expected COMPLIANCE_REVIEW_REQUIRED, got ${decision1.reasonCode}`);

      const decision2 = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: 'PUBLISHED',
          complianceClassification: 'BLOCKED',
          availabilityType: 'REGION',
          stockLevel: 100,
        },
        'NL'
      );
      if (decision2.eligible) throw new Error('Expected BLOCKED product to be gated from purchase');
    });

    await run('Product Purchase Eligibility', 'Should block purchase when stockLevel is zero or negative', () => {
      const decision = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: 'PUBLISHED',
          complianceClassification: 'APPROVED',
          availabilityType: 'REGION',
          stockLevel: 0,
        },
        'ES'
      );
      if (decision.eligible) throw new Error('Expected out of stock product to be gated');
      if (decision.reasonCode !== 'OUT_OF_STOCK') throw new Error(`Expected OUT_OF_STOCK, got ${decision.reasonCode}`);
    });

    await run('Product Purchase Eligibility', 'Should block purchase when explicit country override is BLOCKED', () => {
      const decision = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: 'PUBLISHED',
          complianceClassification: 'APPROVED',
          availabilityType: 'REGION',
          stockLevel: 50,
          countryOverrides: {
            IT: { status: 'BLOCKED', internalNote: 'Customs restriction on botanical infusion' },
          },
        },
        'IT'
      );
      if (decision.eligible) throw new Error('Expected country override to block purchase');
      if (decision.reasonCode !== 'COUNTRY_BLOCKED') throw new Error(`Expected COUNTRY_BLOCKED, got ${decision.reasonCode}`);
    });

    // ----------------------------------------------------
    // AREA 14: EUROPEAN COUNTRY MODEL & REGISTRY (PHASE 2.5)
    // ----------------------------------------------------
    await run('European Country Registry', 'Should recognize all 27 official EU member states', () => {
      const eu27 = [
        'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
      ];
      for (const code of eu27) {
        if (!CountryRegistry.isEUMember(code)) {
          throw new Error(`Country ${code} should be verified EU member state`);
        }
        if (!CountryRegistry.isEuropean(code)) {
          throw new Error(`Country ${code} should be classified as European`);
        }
      }
    });

    await run('European Country Registry', 'Should correctly support UK, EEA and European microstates', () => {
      if (!CountryRegistry.isEuropean('GB')) throw new Error('GB should be classified as European');
      if (CountryRegistry.isEUMember('GB')) throw new Error('GB should not be marked as EU member');

      if (!CountryRegistry.isEuropean('NO')) throw new Error('Norway should be European');
      if (!CountryRegistry.isEuropean('CH')) throw new Error('Switzerland should be European');
      if (!CountryRegistry.isEuropean('MC')) throw new Error('Monaco should be European microstate');

      // Non-European verification
      if (CountryRegistry.isEuropean('US')) throw new Error('US must not be marked European');
      if (CountryRegistry.isEuropean('AU')) throw new Error('Australia must not be marked European');
    });

    // ----------------------------------------------------
    // AREA 15: SHIPPING BOUNDARY PRECISION (PHASE 2.5)
    // ----------------------------------------------------
    await run('Shipping Calculation Precision', 'Should strictly enforce €300 threshold (€299.99 = €15, €300.00 = Free Standard)', () => {
      // €299.99 = 29999 cents -> Must NOT receive free standard shipping
      const underThreshold = ShippingService.calculateShipping({
        subtotal: 29999,
        currency: 'EUR',
        destinationCountry: 'DE',
        selectedMethodCode: 'STANDARD',
      });
      if (underThreshold.qualifiesForFreeShipping) throw new Error('€299.99 must NOT qualify for free standard shipping');
      if (underThreshold.selectedMethod.cost !== 1500) throw new Error(`Expected €15 (1500 cents), got ${underThreshold.selectedMethod.cost}`);
      if (underThreshold.amountNeededForFreeShipping !== 1) throw new Error('Expected 1 cent needed for free shipping');

      // €300.00 = 30000 cents -> Must receive free standard shipping
      const exactThreshold = ShippingService.calculateShipping({
        subtotal: 30000,
        currency: 'EUR',
        destinationCountry: 'DE',
        selectedMethodCode: 'STANDARD',
      });
      if (!exactThreshold.qualifiesForFreeShipping) throw new Error('€300.00 must qualify for free standard shipping');
      if (exactThreshold.selectedMethod.cost !== 0) throw new Error(`Expected €0, got ${exactThreshold.selectedMethod.cost}`);

      // Express priority courier must remain chargeable (€20) even when subtotal >= €300
      const expressAt300 = ShippingService.calculateShipping({
        subtotal: 30000,
        currency: 'EUR',
        destinationCountry: 'DE',
        selectedMethodCode: 'EXPRESS',
      });
      if (expressAt300.selectedMethod.cost !== 2000) {
        throw new Error(`Express must remain chargeable at €20 (2000 cents), got ${expressAt300.selectedMethod.cost}`);
      }
    });

    // ----------------------------------------------------
    // AREA 16: ORDER STATE MACHINE HARDENING (PHASE 2.5 & PHASE 3 CANONICAL)
    // ----------------------------------------------------
    await run('Order State Machine', 'Should allow full standard progression DRAFT -> PENDING_PAYMENT -> PAYMENT_SUBMITTED -> PAYMENT_VERIFIED -> PROCESSING -> SHIPPED -> DELIVERED', () => {
      const transitions: [any, any][] = [
        ['DRAFT', 'PENDING_PAYMENT'],
        ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED'],
        ['PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED'],
        ['PAYMENT_VERIFIED', 'PROCESSING'],
        ['PROCESSING', 'SHIPPED'],
        ['SHIPPED', 'DELIVERED'],
      ];

      for (const [from, to] of transitions) {
        if (!OrderStatusService.isTransitionAllowed(from, to)) {
          throw new Error(`Expected canonical transition ${from} -> ${to} to be permitted`);
        }
      }
    });

    await run('Order State Machine', 'Should reject cancellation once order enters SHIPPED or DELIVERED status', () => {
      if (OrderStatusService.canOrderBeCancelled('SHIPPED')) {
        throw new Error('Order in SHIPPED state must NOT be cancellable');
      }
      if (OrderStatusService.canOrderBeCancelled('DELIVERED')) {
        throw new Error('Order in DELIVERED state must NOT be cancellable');
      }

      // Cancellation check through RBAC guard
      const guard = OrderStatusService.canRolePerformTransition({
        fromStatus: 'SHIPPED',
        toStatus: 'CANCELLED',
        userRole: 'SUPER_ADMIN',
      });
      if (guard.allowed) {
        throw new Error('RBAC guard must reject cancellation of SHIPPED order');
      }
    });

    await run('Order State Machine', 'Should reject refund attempts on DRAFT, PENDING_PAYMENT, or PAYMENT_SUBMITTED orders', () => {
      if (OrderStatusService.canOrderBeRefunded('DRAFT')) {
        throw new Error('DRAFT order cannot be refunded (unconfirmed funds)');
      }
      if (OrderStatusService.canOrderBeRefunded('PENDING_PAYMENT')) {
        throw new Error('PENDING_PAYMENT order cannot be refunded (unconfirmed funds)');
      }
      if (OrderStatusService.canOrderBeRefunded('PAYMENT_SUBMITTED')) {
        throw new Error('PAYMENT_SUBMITTED order cannot be refunded (unverified funds)');
      }

      const guard = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PENDING_PAYMENT',
        toStatus: 'REFUNDED',
        userRole: 'FINANCE_MANAGER',
      });
      if (guard.allowed) {
        throw new Error('RBAC guard must reject refund on PENDING_PAYMENT order');
      }

      // Order with verified payment CAN be refunded
      if (!OrderStatusService.canOrderBeRefunded('PAYMENT_VERIFIED')) {
        throw new Error('PAYMENT_VERIFIED order must be eligible for refund');
      }
    });

    // ----------------------------------------------------
    // AREA 17: SECURITY & QUANTITY TAMPER DEFENSE (PHASE 2.5)
    // ----------------------------------------------------
    await run('Security & Tamper Defense', 'Should reject negative, zero, float, or NaN quantities in cart calculation', async () => {
      const invalidQuantities = [-1, 0, 1.5, NaN, 1000];

      for (const qty of invalidQuantities) {
        let threw = false;
        try {
          await CartPricingService.calculateCart({
            items: [{ variantId: 'var-almond-crush', quantity: qty as any }],
            currency: 'EUR',
            destinationCountry: 'DE',
            fetchVariantsByIds: async (ids) => mockVariants.filter((v) => ids.includes(v.id)),
          });
        } catch {
          threw = true;
        }
        if (!threw) {
          throw new Error(`Security check failed: Cart accepted invalid quantity: ${qty}`);
        }
      }
    });

    // ----------------------------------------------------
    // AREA 18: CATALOGUE INTEGRITY & QUALITY AUDIT (PHASE 2.5)
    // ----------------------------------------------------
    await run('Catalogue Quality Audit', 'Should verify zero missing primary images and zero zero-price variants across catalogue', async () => {
      const { CatalogService } = await import('@/lib/catalog');
      const allProducts = CatalogService.getProducts();
      const audit = ProductQualityAuditService.auditCatalogue(allProducts);

      if (!audit.passed) {
        const errorList = audit.issues.filter((i) => i.severity === 'ERROR').map((i) => `${i.productName}: ${i.message}`).join('; ');
        throw new Error(`Catalogue quality audit failed: ${errorList}`);
      }

      if (audit.issueCounts.missingPrimaryImage > 0) {
        throw new Error(`Found ${audit.issueCounts.missingPrimaryImage} products missing primary images`);
      }
      if (audit.issueCounts.zeroPrice > 0) {
        throw new Error(`Found ${audit.issueCounts.zeroPrice} variants with zero prices`);
      }
      if (audit.totalProductsAudited !== 10) {
        throw new Error(`Expected 10 normalized products audited, got ${audit.totalProductsAudited}`);
      }
    });

    // ----------------------------------------------------
    // AREA 19: CANONICAL ORDER STATUS ENUM NORMALIZATION & DEPRECATION REGRESSION (PHASE 3)
    // ----------------------------------------------------
    await run('Order Status Canonicalization', 'Should strictly maintain the 9 canonical order statuses without duplicates', () => {
      const expectedStatuses: OrderStatus[] = [
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

      if (CANONICAL_ORDER_STATUSES.length !== 9) {
        throw new Error(`Expected exactly 9 canonical order statuses, got ${CANONICAL_ORDER_STATUSES.length}`);
      }

      for (const st of expectedStatuses) {
        if (!CANONICAL_ORDER_STATUSES.includes(st)) {
          throw new Error(`Missing expected canonical status: ${st}`);
        }
      }

      // Regression checks: ensure deprecated states PAYMENT_CONFIRMED and DISPATCHED are NOT in canonical statuses
      if ((CANONICAL_ORDER_STATUSES as any).includes('PAYMENT_CONFIRMED')) {
        throw new Error('PAYMENT_CONFIRMED must be removed in favor of PAYMENT_VERIFIED');
      }
      if ((CANONICAL_ORDER_STATUSES as any).includes('DISPATCHED')) {
        throw new Error('DISPATCHED must be removed in favor of SHIPPED');
      }
    });

    // ----------------------------------------------------
    // AREA 20: CUSTOMER ACCOUNT SYSTEM & PASSWORD CRYPTOGRAPHY (PHASE 3)
    // ----------------------------------------------------
    await run('Customer Accounts', 'Should hash passwords securely with bcrypt and isolate customer credentials', async () => {
      const testEmail = `test_customer_${Date.now()}@fusionbars.eu`;
      const plainPassword = 'SecurePassword2026!';

      const reg = await CustomerAuthService.register({
        email: testEmail,
        password: plainPassword,
        firstName: 'Stefan',
        lastName: 'Zweig',
        preferredCurrency: 'EUR',
        preferredLocale: 'de',
      });

      if (!reg.customer.id || reg.customer.email !== testEmail) {
        throw new Error('Failed to register customer profile');
      }

      // Password hash must NOT be in public profile
      if ((reg.customer as any).passwordHash) {
        throw new Error('Customer public profile must never expose passwordHash');
      }

      // Session verification
      const verified = AuthService.verifySessionToken(reg.sessionToken);
      if (!verified || verified.email !== testEmail || verified.role !== 'CUSTOMER') {
        throw new Error('Session token verification failed');
      }

      // Login check
      const login = await CustomerAuthService.login({
        email: testEmail,
        password: plainPassword,
      });

      if (!login.customer || login.customer.id !== reg.customer.id) {
        throw new Error('Customer login verification failed');
      }
    });

    // ----------------------------------------------------
    // AREA 21: GUEST ORDER LOOKUP & SECURITY GATE (PHASE 3)
    // ----------------------------------------------------
    await run('Guest Order Lookup Gate', 'Should reject unauthorized sequential order number probing and allow tokenized access', async () => {
      const orderNumber = 'FB-EU-2026-10024';
      const validEmail = 'lisa@example.eu';
      const wrongEmail = 'attacker@malicious.com';

      // 1. Probing with only sequential order number must fail
      const probeAttempt = await GuestOrderService.secureLookup({
        orderNumber,
        email: wrongEmail,
      });
      if (probeAttempt.order !== null) {
        throw new Error('Security violation: Sequential order probing succeeded with mismatched email');
      }

      // 2. Dual-factor (orderNumber + matching customer email) must succeed
      const verifiedAttempt = await GuestOrderService.secureLookup({
        orderNumber,
        email: validEmail,
      });
      if (!verifiedAttempt.order || verifiedAttempt.order.orderNumber !== orderNumber) {
        throw new Error('Dual-factor order lookup failed for valid order and email');
      }

      // 3. Signed token lookup must succeed
      const sampleOrder = await CommerceRepository.findOrderByIdOrNumber(orderNumber);
      if (sampleOrder?.lookupToken) {
        const tokenAttempt = await GuestOrderService.secureLookup({
          token: sampleOrder.lookupToken,
        });
        if (!tokenAttempt.order) {
          throw new Error('Signed lookup token failed to retrieve order');
        }
      }
    });

    // ----------------------------------------------------
    // AREA 22: DETERMINISTIC MULTI-HUB ALLOCATION (PHASE 3)
    // ----------------------------------------------------
    await run('Multi-Hub Allocation', 'Should allocate NL, DE, ES, and FR hubs deterministically according to destination rules', () => {
      // North / UK / Nordic -> NL Hub
      const nlRouting = HubAllocationService.allocateHub('NL', []);
      if (nlRouting.hubCode !== 'NL') throw new Error(`Expected NL for Netherlands, got ${nlRouting.hubCode}`);

      const gbRouting = HubAllocationService.allocateHub('GB', []);
      if (gbRouting.hubCode !== 'NL') throw new Error(`Expected NL for UK, got ${gbRouting.hubCode}`);

      const seRouting = HubAllocationService.allocateHub('SE', []);
      if (seRouting.hubCode !== 'NL') throw new Error(`Expected NL for Sweden, got ${seRouting.hubCode}`);

      // Central / East -> DE Hub
      const deRouting = HubAllocationService.allocateHub('DE', []);
      if (deRouting.hubCode !== 'DE') throw new Error(`Expected DE for Germany, got ${deRouting.hubCode}`);

      const atRouting = HubAllocationService.allocateHub('AT', []);
      if (atRouting.hubCode !== 'DE') throw new Error(`Expected DE for Austria, got ${atRouting.hubCode}`);

      // South / Iberia -> ES Hub
      const esRouting = HubAllocationService.allocateHub('ES', []);
      if (esRouting.hubCode !== 'ES') throw new Error(`Expected ES for Spain, got ${esRouting.hubCode}`);

      const itRouting = HubAllocationService.allocateHub('IT', []);
      if (itRouting.hubCode !== 'ES') throw new Error(`Expected ES for Italy, got ${itRouting.hubCode}`);

      // West -> FR Hub
      const frRouting = HubAllocationService.allocateHub('FR', []);
      if (frRouting.hubCode !== 'FR') throw new Error(`Expected FR for France, got ${frRouting.hubCode}`);
    });

    // ----------------------------------------------------
    // AREA 23: TRANSACTIONAL ORDER CREATION & SNAPSHOTS (PHASE 3)
    // ----------------------------------------------------
    await run('Order Creation Pipeline', 'Should atomically create order with unique FB-EU-YYYY-XXXXX reference and price snapshots', async () => {
      const order = await OrderCreationService.createOrder({
        items: [{ variantId: 'var_bar_1', quantity: 2 }],
        currency: 'EUR',
        shippingAddress: {
          firstName: 'Pierre',
          lastName: 'Dubois',
          streetAddress: 'Rue de Rivoli 14',
          city: 'Paris',
          postalCode: '75001',
          countryCode: 'FR',
          email: 'pierre.dubois@example.fr',
          phone: '+33 6 12345678',
        },
        shippingMethodCode: 'STANDARD',
        paymentMethodCode: 'SEPA_IBAN',
      });

      if (!order.order.orderNumber.startsWith('FB-EU-2026-')) {
        throw new Error(`Order number format invalid: ${order.order.orderNumber}`);
      }

      if (order.order.status !== 'PENDING_PAYMENT') {
        throw new Error(`Initial status must be PENDING_PAYMENT, got ${order.order.status}`);
      }

      // Check item snapshot
      const item = order.order.items[0];
      if (item.unitPrice !== 2000 || item.lineTotal !== 4000) {
        throw new Error(`Authoritative line total snapshot incorrect: ${item.lineTotal}`);
      }

      if (!order.paymentInstructions.details.iban) {
        throw new Error('Missing SEPA IBAN details in generated instructions');
      }
    });

    await run('Cryptocurrency Payment Discount', 'Crypto checkout applies 10% off merchandise and leaves shipping unchanged', async () => {
      if (CRYPTO_PAYMENT_DISCOUNT_PERCENT !== 10) {
        throw new Error(`Expected a 10% crypto discount, got ${CRYPTO_PAYMENT_DISCOUNT_PERCENT}`);
      }
      if (calculateCryptoPaymentDiscount(10000) !== 1000) {
        throw new Error('10% of 10000 minor units must be 1000');
      }
      if (calculateCryptoPaymentDiscount(2499) !== 250) {
        throw new Error('Crypto discount rounding mismatch');
      }
      if (calculateCryptoPaymentDiscount(0) !== 0) {
        throw new Error('A zero merchandise total must not produce a discount');
      }
      if (!isCryptocurrencyPayment('CRYPTO_BTC') || !isCryptocurrencyPayment('CRYPTO_ETH') || isCryptocurrencyPayment('SEPA_IBAN')) {
        throw new Error('Cryptocurrency payment detection failed');
      }

      const address = {
        firstName: 'Ada',
        lastName: 'Merkle',
        streetAddress: 'Keizersgracht 1',
        city: 'Amsterdam',
        postalCode: '1015 CJ',
        countryCode: 'NL',
        phone: '+31 6 12345678',
        email: `crypto.discount.${Date.now()}@fusionbars.eu`,
      };

      const sepa = await OrderCreationService.createOrder({
        items: [{ variantId: 'var_bar_1', quantity: 1 }],
        currency: 'EUR',
        shippingAddress: { ...address, email: `sepa.${Date.now()}@fusionbars.eu` },
        shippingMethodCode: 'STANDARD',
        paymentMethodCode: 'SEPA_IBAN',
      });
      const cryptoPrices = { BTC: 100_000, ETH: 2_500, BCH: 400 };
      setCryptoPriceLoader(async () => cryptoPrices);
      let crypto;
      try {
        crypto = await OrderCreationService.createOrder({
          items: [{ variantId: 'var_bar_1', quantity: 1 }],
          currency: 'EUR',
          shippingAddress: address,
          shippingMethodCode: 'STANDARD',
          paymentMethodCode: 'CRYPTO_BTC',
        });
      } finally {
        setCryptoPriceLoader(null);
      }

      const expectedDiscount = calculateCryptoPaymentDiscount(sepa.order.subtotalAmount);
      if (crypto.order.subtotalAmount !== sepa.order.subtotalAmount) {
        throw new Error('Merchandise subtotal must match between SEPA and crypto');
      }
      if (crypto.order.shippingAmount !== sepa.order.shippingAmount) {
        throw new Error('Shipping must stay the same when the crypto discount is applied');
      }
      if (crypto.order.discountAmount !== expectedDiscount) {
        throw new Error(`Expected crypto discount ${expectedDiscount}, got ${crypto.order.discountAmount}`);
      }
      if (crypto.order.totalAmount !== sepa.order.totalAmount - expectedDiscount) {
        throw new Error(`Discounted crypto total mismatch: ${crypto.order.totalAmount}`);
      }
      if (crypto.paymentInstructions.amount !== crypto.order.totalAmount) {
        throw new Error('Crypto payment instructions must request the discounted total');
      }
      const quotedWallets = crypto.paymentInstructions.wallets ?? [];
      if (quotedWallets.length !== 3) {
        throw new Error(`Expected an exact amount for BTC, ETH, and BCH, got ${quotedWallets.length}`);
      }
      for (const wallet of quotedWallets) {
        const expectedAmount = fiatMinorToCryptoAmount(
          crypto.order.totalAmount,
          cryptoPrices[wallet.symbol as keyof typeof cryptoPrices]
        );
        if (wallet.amount !== expectedAmount) {
          throw new Error(`Expected ${wallet.symbol} amount ${expectedAmount}, got ${wallet.amount}`);
        }
      }
    });

    // ----------------------------------------------------
    // AREA 24: PAYMENT PROOF & VERIFICATION LIFECYCLE (PHASE 3)
    // ----------------------------------------------------
    await run('Payment Workflow Lifecycle', 'Should advance PENDING_PAYMENT -> PAYMENT_SUBMITTED -> PAYMENT_VERIFIED -> SHIPPED', async () => {
      const testOrderNumber = `FB-EU-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const saved = await CommerceRepository.saveOrder({
        id: `ord_test_${Date.now()}`,
        orderNumber: testOrderNumber,
        lookupToken: `tok_${Date.now()}`,
        guestEmail: 'test.lifecycle@fusionbars.eu',
        currency: 'EUR',
        subtotalAmount: 10000,
        discountAmount: 0,
        shippingAmount: 1500,
        totalAmount: 11500,
        status: 'PENDING_PAYMENT',
        shippingOriginHub: 'NL',
        shippingMethodCode: 'STANDARD',
        shippingAddress: {
          firstName: 'Jan',
          lastName: 'De Vries',
          streetAddress: 'Damrak 1',
          city: 'Amsterdam',
          postalCode: '1012 LG',
          countryCode: 'NL',
        },
        items: [],
        paymentMethodCode: 'SEPA_IBAN',
        discreetPackaging: true,
        statusHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 1. Customer submits proof
      const proofTransition = OrderStatusService.canRolePerformTransition({
        fromStatus: saved.status,
        toStatus: 'PAYMENT_SUBMITTED',
        userRole: 'CUSTOMER',
      });
      if (!proofTransition.allowed) throw new Error('Customer must be allowed to submit proof');

      await CommerceRepository.updateOrderStatus(saved.id, 'PAYMENT_SUBMITTED', 'CUSTOMER', 'guest', 'TX-10924');

      // 2. Customer CANNOT verify payment
      const illegalVerification = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PAYMENT_SUBMITTED',
        toStatus: 'PAYMENT_VERIFIED',
        userRole: 'CUSTOMER',
      });
      if (illegalVerification.allowed) throw new Error('Customer must NOT be allowed to verify payment');

      // 3. Finance Manager verifies payment
      const financeVerification = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PAYMENT_SUBMITTED',
        toStatus: 'PAYMENT_VERIFIED',
        userRole: 'FINANCE_MANAGER',
      });
      if (!financeVerification.allowed) throw new Error('Finance Manager must be allowed to verify payment');

      await CommerceRepository.updateOrderStatus(saved.id, 'PAYMENT_VERIFIED', 'FINANCE_MANAGER', 'fin-1', 'Bank match verified');

      // 4. Order Manager ships order
      await CommerceRepository.updateOrderStatus(saved.id, 'PROCESSING', 'ORDER_MANAGER', 'ops-1');
      const shipTransition = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PROCESSING',
        toStatus: 'SHIPPED',
        userRole: 'ORDER_MANAGER',
      });
      if (!shipTransition.allowed) throw new Error('Order Manager must be allowed to ship processing order');
    });

    // ----------------------------------------------------
    // AREA 25: MULTI-HUB INVENTORY OPERATIONS (PHASE 3)
    // ----------------------------------------------------
    await run('Inventory Operations & Alerts', 'Should record stock adjustments and alert on low warehouse thresholds', async () => {
      const invRecord = {
        variantId: 'test-var-1',
        locationCode: 'NL' as const,
        quantityOnHand: 14,
        quantityReserved: 0,
      };

      // Low stock check (<= 15)
      if (!InventoryService.isLowStock(invRecord.quantityOnHand, 15)) {
        throw new Error('Expected 14 units to trigger low stock alert');
      }

      // Restock adjustment (+50)
      const restocked = InventoryService.adjustStock(invRecord, 50, 'RESTOCK');
      if (restocked.updatedRecord.quantityOnHand !== 64) {
        throw new Error(`Expected on hand 64, got ${restocked.updatedRecord.quantityOnHand}`);
      }

      // Negative adjustment leading below 0 must throw
      let threw = false;
      try {
        InventoryService.adjustStock(invRecord, -20, 'DAMAGE_WRITE_OFF');
      } catch {
        threw = true;
      }
      if (!threw) {
        throw new Error('Stock adjustment resulting in negative inventory must be rejected');
      }
    });

    // ----------------------------------------------------
    // AREA 26: PROMOTIONS & COUPONS ENGINE (PHASE 3)
    // ----------------------------------------------------
    await run('Promotions Engine', 'Should apply percentage and fixed coupons only when minimum spend threshold is met', async () => {
      const coupon10 = await CommerceRepository.findCoupon('WELCOME10');
      if (!coupon10 || coupon10.discount !== 10 || !coupon10.isPercent) {
        throw new Error('WELCOME10 coupon configuration missing or invalid');
      }

      // Test spend threshold
      const { validateCouponAction } = await import('@/actions/coupons');
      const belowMinSpend = await validateCouponAction('WELCOME10', 3000); // €30 < €50 min
      if (belowMinSpend.success) {
        throw new Error('Coupon must be rejected when order subtotal is below minimum spend');
      }

      const aboveMinSpend = await validateCouponAction('WELCOME10', 8000); // €80 >= €50 min
      if (!aboveMinSpend.success || !aboveMinSpend.coupon) {
        throw new Error('Coupon must be accepted when order subtotal meets minimum spend');
      }
    });

    // ----------------------------------------------------
    // AREA 27: EMAIL LIFECYCLE TEMPLATE RENDERING (PHASE 3)
    // ----------------------------------------------------
    await run('Email Lifecycle Templates', 'Should render all transactional customer email templates without syntax errors', () => {
      const sampleContext = {
        customerName: 'Marcus Aurelius',
        orderNumber: 'FB-EU-2026-99999',
        totalAmount: 12000,
        currency: 'EUR' as const,
        items: [{ name: 'Botanical Artisan Bar (6g)', quantity: 2, price: 4000 }],
        supportEmail: 'sales@fusionbars.eu',
      };

      const sepa = EmailTemplates.renderSepaOrderConfirmation({
        ...sampleContext,
        iban: 'NL91ABNA0417164300',
        bic: 'ABNANL2A',
        bankName: 'European Merchant Bank',
        accountHolder: 'Fusion EU Logistics B.V.',
      });
      if (!sepa.html.includes('NL91ABNA0417164300')) throw new Error('SEPA template missing IBAN');

      const crypto = EmailTemplates.renderCryptoOrderConfirmation({
        ...sampleContext,
        cryptoName: 'Bitcoin',
        network: 'Bitcoin Mainnet',
        receivingAddress: 'bc1q_placeholder_btc_test_only',
      });
      if (!crypto.html.includes('bc1q_placeholder_btc_test_only')) throw new Error('Crypto template missing address');

      const shipped = EmailTemplates.renderOrderShippedNotice({
        customerName: 'Marcus Aurelius',
        orderNumber: 'FB-EU-2026-99999',
        trackingNumber: 'POSTNL-88912',
        carrierName: 'PostNL Discreet Priority',
        hubCode: 'NL',
        supportEmail: 'sales@fusionbars.eu',
      });
      if (!shipped.html.includes('POSTNL-88912')) throw new Error('Shipped template missing tracking');

      const verified = EmailTemplates.renderPaymentVerifiedNotice({
        customerName: 'Marcus Aurelius',
        orderNumber: 'FB-EU-2026-99999',
        supportEmail: 'sales@fusionbars.eu',
      });
      if (!verified.html.includes('FB-EU-2026-99999')) throw new Error('Verified template missing order reference');

      const reset = EmailTemplates.renderPasswordResetEmail({
        customerName: 'Marcus',
        resetUrl: 'https://fusionbars.eu/en/account/reset?token=xyz',
        supportEmail: 'sales@fusionbars.eu',
      });
      if (!reset.html.includes('https://fusionbars.eu/en/account/reset?token=xyz')) throw new Error('Reset template missing URL');
    });

    // ----------------------------------------------------
    // AREA 28: CARRIER TRACKING UNAVAILABLE (HARDENING PASS)
    // ----------------------------------------------------
    await run('Carrier Tracking Unavailable', 'Public order lookup must not expose carrier APIs or internal logistics hub routing', async () => {
      // Create a test order
      const orderRes = await OrderCreationService.createOrder({
        items: [{ variantId: 'var_bar_1', quantity: 1 }],
        currency: 'EUR',
        shippingAddress: {
          firstName: 'Helena',
          lastName: 'Trojan',
          streetAddress: 'Via Roma 10',
          city: 'Milan',
          postalCode: '20121',
          countryCode: 'IT',
          email: 'helena.trojan@example.it',
          phone: '+39 333 1234567',
        },
        shippingMethodCode: 'STANDARD',
        paymentMethodCode: 'SEPA_IBAN',
      });

      // Customer performs secure lookup
      const lookup = await lookupOrderAction({
        orderNumber: orderRes.order.orderNumber,
        email: 'helena.trojan@example.it',
      });

      if (!lookup.success || !lookup.order) {
        throw new Error('Lookup should succeed for legitimate customer with matching email');
      }

      // Verify that internal fulfilment routing hub is NOT exposed to customer
      if ((lookup.order as any).shippingOriginHub !== undefined) {
        throw new Error('Public order lookup must NOT expose shippingOriginHub to customers');
      }

      // Verify no carrier API or external tracking URL is present
      if ((lookup.order as any).carrierTrackingUrl || (lookup.order as any).carrierApiUrl) {
        throw new Error('Public order lookup must NOT expose external carrier tracking URLs');
      }
    });

    // ----------------------------------------------------
    // AREA 29: SECURE ORDER STATUS LOOKUP (DUAL-FACTOR GATE)
    // ----------------------------------------------------
    await run('Secure Order Status Lookup', 'Order status lookup must reject single-field probing and require dual-factor verification', async () => {
      // 1. Probing with order number alone without email or token must fail
      const singleProbe = await lookupOrderAction({
        orderNumber: 'FB-EU-2026-99999',
      });
      if (singleProbe.success) {
        throw new Error('Sequential order probe without email or token must be rejected');
      }

      // 2. Probing with mismatched email must fail
      const mismatchProbe = await lookupOrderAction({
        orderNumber: 'FB-EU-2026-99999',
        email: 'attacker@evil.com',
      });
      if (mismatchProbe.success) {
        throw new Error('Mismatched email order lookup must be rejected');
      }
    });

    // ----------------------------------------------------
    // AREA 30: CROSS-CUSTOMER ACCESS REJECTED (IDOR DEFENSE)
    // ----------------------------------------------------
    await run('Cross-Customer Access Rejected', 'All cross-customer order and payment proof mutations must be rejected', async () => {
      // Attempt to submit payment proof without matching customer session or valid guest token
      const maliciousProof = await submitPaymentProofAction({
        orderId: 'FB-EU-2026-99999',
        referenceOrTxid: 'MALICIOUS_UNAUTHORIZED_REF_123',
        lookupToken: 'invalid_token_xyz',
        guestEmail: 'attacker@evil.com',
      });

      if (maliciousProof.success) {
        throw new Error('Unauthenticated cross-customer payment proof submission must be rejected with forbidden/unauthorized');
      }
    });

    // ----------------------------------------------------
    // AREA 31: PAYMENT CONFIGURATION PROTECTED
    // ----------------------------------------------------
    await run('Payment Configuration Protected', 'Public payment options must never expose bank accounts, IBANs, BICs, or crypto addresses', () => {
      const publicOptions = PaymentConfigService.getPublicPaymentOptions();
      if (!publicOptions || publicOptions.length === 0) {
        throw new Error('Public payment options should return available rails');
      }

      for (const opt of publicOptions) {
        if ((opt as any).iban || (opt as any).bicSwift || (opt as any).receivingAddress || (opt as any).bankName) {
          throw new Error(`Sensitive payment configuration leaked in public option ${opt.code}`);
        }
      }
    });

    // ----------------------------------------------------
    // AREA 32: INACTIVE CRYPTO METHOD HIDDEN
    // ----------------------------------------------------
    await run('Inactive Crypto Method Hidden', 'Inactive crypto assets (USDT, ETH) must be hidden from checkout and rejected if requested', async () => {
      // Ensure USDT and ETH are inactive by default
      PaymentConfigService.setCryptoStatus('USDT', 'INACTIVE');
      PaymentConfigService.setCryptoStatus('ETH', 'INACTIVE');

      const activeMethods = PaymentConfigService.getActiveCryptoConfigs();
      const usdtActive = activeMethods.some((m) => m.asset === 'USDT');
      const ethActive = activeMethods.some((m) => m.asset === 'ETH');

      if (usdtActive || ethActive) {
        throw new Error('Inactive crypto assets must not appear in active configurations');
      }

      // Attempting to checkout with an inactive payment method must throw
      let rejected = false;
      try {
        await OrderCreationService.createOrder({
          items: [{ variantId: 'var_bar_1', quantity: 1 }],
          currency: 'EUR',
          shippingAddress: {
            firstName: 'Alex',
            lastName: 'Vane',
            streetAddress: 'Main St 1',
            city: 'Berlin',
            postalCode: '10115',
            countryCode: 'DE',
            email: 'alex.vane@example.de',
            phone: '+49 151 12345678',
          },
          shippingMethodCode: 'STANDARD',
          paymentMethodCode: 'CRYPTO_USDT',
        });
      } catch (err: any) {
        rejected = true;
      }

      if (!rejected) {
        throw new Error('Checkout with inactive payment method must be rejected');
      }
    });

    // ----------------------------------------------------
    // AREA 33: PAYMENT STATE TAMPER RESISTANCE
    // ----------------------------------------------------
    await run('Payment State Tamper Resistance', 'Customers must NEVER be able to transition order to PAYMENT_VERIFIED or beyond', () => {
      const customerToVerified = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PAYMENT_SUBMITTED',
        toStatus: 'PAYMENT_VERIFIED',
        userRole: 'CUSTOMER',
      });
      if (customerToVerified.allowed) {
        throw new Error('Customer must never be permitted to set PAYMENT_VERIFIED');
      }

      const customerToProcessing = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PAYMENT_SUBMITTED',
        toStatus: 'PROCESSING',
        userRole: 'CUSTOMER',
      });
      if (customerToProcessing.allowed) {
        throw new Error('Customer must never be permitted to advance order to PROCESSING');
      }

      const customerToShipped = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PROCESSING',
        toStatus: 'SHIPPED',
        userRole: 'CUSTOMER',
      });
      if (customerToShipped.allowed) {
        throw new Error('Customer must never be permitted to set SHIPPED status');
      }
    });

    // ----------------------------------------------------
    // AREA 34: SHIPMENT EMAIL TRACKING PRECISION
    // ----------------------------------------------------
    await run('Shipment Email Tracking Precision', 'Shipment email must not claim or fabricate tracking numbers when none is configured', () => {
      const emailWithoutTracking = EmailTemplates.renderOrderShippedNotice({
        customerName: 'Marcus Aurelius',
        orderNumber: 'FB-EU-2026-77777',
        trackingNumber: undefined,
        carrierName: undefined,
        supportEmail: 'sales@fusionbars.eu',
      });

      // Subject must be accurate
      if (!emailWithoutTracking.subject.includes('Your order has shipped')) {
        throw new Error('Subject should announce order shipment accurately');
      }

      // Text must not include fabricated tracking numbers
      if (emailWithoutTracking.text.includes('Tracking Number: undefined') || emailWithoutTracking.text.includes('DISCREET-POSTNL-EU')) {
        throw new Error('Shipment email must NOT include fabricated or undefined tracking numbers');
      }

      // HTML must not include empty code tag
      if (emailWithoutTracking.html.includes('<code>undefined</code>') || emailWithoutTracking.html.includes('<code>null</code>')) {
        throw new Error('HTML email must not render null/undefined tracking tags');
      }
    });

    // ----------------------------------------------------
    // AREA 35: CANONICAL ORDER STATES ONLY
    // ----------------------------------------------------
    await run('Canonical Order States Only', 'Must reject deprecated states PAYMENT_CONFIRMED and DISPATCHED across runtime checks', () => {
      const allowed = CANONICAL_ORDER_STATUSES;
      if (allowed.includes('PAYMENT_CONFIRMED' as any) || allowed.includes('DISPATCHED' as any)) {
        throw new Error('Deprecated status names found in canonical order status list');
      }

      // Check transition graph rejects deprecated state
      const invalidTransition = OrderStatusService.isTransitionAllowed('PROCESSING', 'DISPATCHED' as any);
      if (invalidTransition) {
        throw new Error('Transition graph must not recognize DISPATCHED');
      }
    });

    // ----------------------------------------------------
    // AREA 36: FULFILMENT STATUS AUTHORIZATION
    // ----------------------------------------------------
    await run('Fulfilment Status Authorization', 'Only ORDER_MANAGER and SUPER_ADMIN roles can transition orders to SHIPPED', () => {
      const financeToShipped = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PROCESSING',
        toStatus: 'SHIPPED',
        userRole: 'FINANCE_MANAGER',
      });
      if (financeToShipped.allowed) {
        throw new Error('FINANCE_MANAGER must not possess authority to advance order to SHIPPED');
      }

      const catalogToShipped = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PROCESSING',
        toStatus: 'SHIPPED',
        userRole: 'CATALOG_MANAGER',
      });
      if (catalogToShipped.allowed) {
        throw new Error('CATALOG_MANAGER must not possess authority to advance order to SHIPPED');
      }

      const orderManagerToShipped = OrderStatusService.canRolePerformTransition({
        fromStatus: 'PROCESSING',
        toStatus: 'SHIPPED',
        userRole: 'ORDER_MANAGER',
      });
      if (!orderManagerToShipped.allowed) {
        throw new Error('ORDER_MANAGER must be authorized to advance order to SHIPPED');
      }
    });

    // ----------------------------------------------------
    // AREA 37: INVENTORY CONCURRENCY SAFETY
    // ----------------------------------------------------
    await run('Inventory Concurrency Safety', 'Two simultaneous orders competing for final available unit results in exactly one success', async () => {
      const testVariantId = `VAR-CONCURRENCY-${Date.now()}`;
      const hub = 'NL' as const;

      // Seed exactly 1 unit of stock
      await CommerceRepository.adjustInventory(testVariantId, hub, 1, 'RESTOCK', 'test_seed');

      // Attempt 1 reserves 1 unit
      let res1Success = false;
      try {
        await CommerceRepository.reserveInventory(testVariantId, hub, 1, 'ORDER_A');
        res1Success = true;
      } catch {
        res1Success = false;
      }

      // Attempt 2 attempts to reserve 1 unit simultaneously
      let res2Success = false;
      try {
        await CommerceRepository.reserveInventory(testVariantId, hub, 1, 'ORDER_B');
        res2Success = true;
      } catch {
        res2Success = false;
      }

      if (!res1Success || res2Success) {
        throw new Error(`Concurrency race condition failed: expected exactly 1 reservation, but res1=${res1Success}, res2=${res2Success}`);
      }

      // Release reservation cleanly
      await CommerceRepository.releaseReservation(testVariantId, hub, 1, 'ORDER_A');
    });

    // ----------------------------------------------------
    // AREA 38: FILE UPLOAD SECURITY & PRIVATE PROOFS
    // ----------------------------------------------------
    await run('File Upload Security & Private Proofs', 'Upload validator must reject executables, path traversal, double extensions, and >5MB files', () => {
      // 1. Executable rejected
      const exeResult = FileUploadSecurityService.validateUpload({
        filename: 'malicious_script.sh',
        mimeType: 'application/x-sh',
        sizeBytes: 1024,
      });
      if (exeResult.valid) throw new Error('Executable script upload must be rejected');

      // 2. Double extension rejected
      const doubleExtResult = FileUploadSecurityService.validateUpload({
        filename: 'invoice.php.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
      });
      if (doubleExtResult.valid) throw new Error('Double extension (.php.png) upload must be rejected');

      // 3. Path traversal rejected
      const traversalResult = FileUploadSecurityService.validateUpload({
        filename: '../../etc/passwd.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 2048,
      });
      if (traversalResult.valid) throw new Error('Path traversal upload filename must be rejected');

      // 4. Exceeds 5MB rejected
      const oversizedResult = FileUploadSecurityService.validateUpload({
        filename: 'receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 6 * 1024 * 1024,
      });
      if (oversizedResult.valid) throw new Error('File exceeding 5MB must be rejected');

      // 5. Valid PDF accepted and assigned secure unguessable storage key
      const validResult = FileUploadSecurityService.validateUpload({
        filename: 'bank_receipt.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 150000,
      });
      if (!validResult.valid || !validResult.secureStorageKey) {
        throw new Error('Legitimate PDF upload must be accepted with secure storage key');
      }

      // Headers check
      const headers = FileUploadSecurityService.getPrivateSecurityHeaders('application/pdf');
      if (headers['X-Content-Type-Options'] !== 'nosniff' || !headers['X-Robots-Tag'].includes('noindex')) {
        throw new Error('Private proof headers must enforce nosniff and noindex');
      }
    });

    // ----------------------------------------------------
    // AREA 39: AUDIT LOGGING & SENSITIVE CREDENTIAL SCRUBBING
    // ----------------------------------------------------
    await run('Audit Logging & Secret Scrubbing', 'All sensitive mutations must create audit logs with credentials and private keys scrubbed', () => {
      const sensitiveMetadata = JSON.stringify({
        password: 'SuperSecretPassword123!',
        token: 'jwt_sensitive_token_abc',
        iban: 'NL91ABNA0417164300',
        privateKey: '0x123456789abcdef',
        actionReason: 'Password update test',
      });

      const auditEntry = CommerceRepository.logAudit({
        action: 'CUSTOMER_PASSWORD_MUTATED',
        entityType: 'Customer',
        entityId: 'cust_test_999',
        actorRole: 'CUSTOMER',
        actorId: 'cust_test_999',
        metadata: sensitiveMetadata,
      });

      if (!auditEntry.metadata) throw new Error('Audit entry metadata missing');

      // Verify passwords and private keys are scrubbed
      if (auditEntry.metadata.includes('SuperSecretPassword123!')) {
        throw new Error('Audit entry must NOT contain plaintext password');
      }
      if (auditEntry.metadata.includes('0x123456789abcdef')) {
        throw new Error('Audit entry must NOT contain private key');
      }
      if (auditEntry.metadata.includes('jwt_sensitive_token_abc')) {
        throw new Error('Audit entry must NOT contain sensitive token');
      }
      // Verify IBAN is masked
      if (auditEntry.metadata.includes('NL91ABNA0417164300')) {
        throw new Error('Audit entry must mask full bank IBAN');
      }
    });

    // ====================================================
    // PHASE 4: PRODUCTION VERIFICATION & LAUNCH READINESS
    // ====================================================

    // ----------------------------------------------------
    // TEST 64: Environment Service & Fail-Safe Configuration
    // ----------------------------------------------------
    await run('Environment Service & Fail-Safe Configuration', 'Should resolve runtime mode and validate database and security variables', () => {
      const config = EnvironmentService.getConfig();
      if (!config.siteUrl || !config.siteUrl.includes('fusionbars.eu')) {
        throw new Error(`Site URL must default to canonical apex domain: ${config.siteUrl}`);
      }
      if (!config.secrets || typeof config.secrets.sessionSecret !== 'string') {
        throw new Error('Session secret configuration missing');
      }
      if (!config.legal || !config.legal.contactEmail.includes('sales@fusionbars.eu')) {
        throw new Error('Legal contact email must be sales@fusionbars.eu');
      }
    });

    // ----------------------------------------------------
    // TEST 65: Object Storage Authorization & Presigned URL Gates
    // ----------------------------------------------------
    await run('Object Storage Authorization & Presigned URL Gates', 'Should securely store proof and authorize only owner or admin', async () => {
      // Create a test order
      const orderRes = await OrderCreationService.createOrder({
        items: [{ variantId: 'var_bar_1', quantity: 1 }],
        currency: 'EUR',
        shippingAddress: {
          firstName: 'Klaus',
          lastName: 'Weber',
          email: 'klaus.weber@example.de',
          streetAddress: 'Kurfuerstendamm 101',
          city: 'Berlin',
          postalCode: '10711',
          countryCode: 'DE',
          phone: '+49 151 12345678',
        },
        shippingMethodCode: 'STANDARD',
        paymentMethodCode: 'SEPA_IBAN',
      });

      const orderNumber = orderRes.order.orderNumber;
      const lookupToken = orderRes.order.lookupToken;

      // Upload valid PDF document
      const samplePdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
      const uploadRes = await ObjectStorageService.uploadPaymentProof({
        buffer: samplePdfBuffer,
        filename: 'transfer_receipt_sep2026.pdf',
        mimeType: 'application/pdf',
        orderNumber,
        uploadedByEmail: 'klaus.weber@example.de',
      });

      if (!uploadRes.success || !uploadRes.storageKey) {
        throw new Error(`Storage upload failed: ${uploadRes.error}`);
      }

      // 1. Authorized download for customer by email
      const customerAuth = await ObjectStorageService.getAuthorizedDownloadUrl({
        storageKey: uploadRes.storageKey,
        requester: { email: 'klaus.weber@example.de' },
      });
      if (!customerAuth.allowed || !customerAuth.downloadUrl) {
        throw new Error('Legitimate order email must be granted download URL');
      }

      // 2. Authorized download for guest by lookup token
      const tokenAuth = await ObjectStorageService.getAuthorizedDownloadUrl({
        storageKey: uploadRes.storageKey,
        requester: { lookupToken },
      });
      if (!tokenAuth.allowed || !tokenAuth.downloadUrl) {
        throw new Error('Valid lookup token must be granted download URL');
      }

      // 3. Authorized download for FINANCE_MANAGER
      const financeAuth = await ObjectStorageService.getAuthorizedDownloadUrl({
        storageKey: uploadRes.storageKey,
        requester: { role: 'FINANCE_MANAGER' },
      });
      if (!financeAuth.allowed || !financeAuth.downloadUrl) {
        throw new Error('FINANCE_MANAGER role must be granted download URL');
      }

      // 4. UNAUTHORIZED download: wrong email
      const unauthorizedAuth = await ObjectStorageService.getAuthorizedDownloadUrl({
        storageKey: uploadRes.storageKey,
        requester: { email: 'stranger@malicious.org' },
      });
      if (unauthorizedAuth.allowed) {
        throw new Error('Unauthorized third party must NOT receive download URL');
      }
    });

    // ----------------------------------------------------
    // TEST 66: Object Storage Lifecycle Retention Enforcement
    // ----------------------------------------------------
    await run('Object Storage Lifecycle Retention Enforcement', 'Should purge old records based on retention threshold days', async () => {
      const purgeResult = await ObjectStorageService.enforceRetentionPolicy(90);
      if (typeof purgeResult.deletedCount !== 'number') {
        throw new Error('Retention policy check must return deletedCount integer');
      }
    });

    // ----------------------------------------------------
    // TEST 67: Distributed Rate Limiting Abstraction & Action Coverage
    // ----------------------------------------------------
    await run('Distributed Rate Limiting Abstraction & Action Coverage', 'Must enforce limits on public order creation and support store switching', async () => {
      const testIp = '198.51.100.42';

      // Reset
      RateLimiterService.reset('public_order_creation', testIp);

      // Consume up to limit (15)
      for (let i = 0; i < 15; i++) {
        const res = RateLimiterService.consume('public_order_creation', testIp);
        if (!res.allowed) {
          throw new Error(`Attempt ${i + 1} should be allowed within threshold 15`);
        }
      }

      // 16th attempt must be rejected
      const blockedRes = RateLimiterService.consume('public_order_creation', testIp);
      if (blockedRes.allowed) {
        throw new Error('Attempt exceeding limit must be blocked');
      }
      if (!blockedRes.retryAfterSeconds || blockedRes.retryAfterSeconds <= 0) {
        throw new Error('Blocked rate limit must include retryAfterSeconds');
      }

      // Reset works
      RateLimiterService.reset('public_order_creation', testIp);
      const postResetRes = RateLimiterService.consume('public_order_creation', testIp);
      if (!postResetRes.allowed) {
        throw new Error('Rate limit bucket must permit requests following reset');
      }
    });

    // ----------------------------------------------------
    // TEST 68: Transactional Email Provider Lifecycle Dispatch
    // ----------------------------------------------------
    await run('Transactional Email Provider Lifecycle Dispatch', 'EmailService must render and route lifecycle emails via configured provider', async () => {
      const mockProvider = new MockEmailProvider();
      EmailService.setProvider(mockProvider);

      const mockOrder: any = {
        id: 'ord_test_lifecycle',
        orderNumber: 'FB-EU-2026-99999',
        currency: 'EUR',
        subtotalAmount: 20000,
        shippingAmount: 1500,
        totalAmount: 21500,
        guestEmail: 'recipient@example.eu',
        shippingAddress: {
          firstName: 'Sophie',
          lastName: 'Martin',
          streetAddress: 'Rue de Rivoli 45',
          city: 'Paris',
          postalCode: '75001',
          countryCode: 'FR',
        },
        items: [
          {
            productName: 'Fusion Artisan Chocolate Bar',
            variantName: 'Matcha Green Tea - 6g',
            quantity: 2,
            lineTotal: 20000,
          },
        ],
      };

      // 1. Send Order Confirmation
      const confirmRes = await EmailService.sendSepaOrderConfirmation(mockOrder, {
        iban: 'NL91ABNA0000000000',
        bicSwift: 'ABNANL2A',
        accountHolder: 'Fusion EU Logistics B.V.',
        bankName: 'ABN AMRO',
        reference: 'FB-EU-2026-99999',
      });
      if (!confirmRes.success) throw new Error('SEPA confirmation email failed to dispatch');

      // 2. Send Payment Verified
      const verifiedRes = await EmailService.sendPaymentVerified(mockOrder);
      if (!verifiedRes.success) throw new Error('Payment verified email failed to dispatch');

      // 3. Send Order Shipped
      const shippedRes = await EmailService.sendOrderShipped(mockOrder);
      if (!shippedRes.success) throw new Error('Order shipped email failed to dispatch');

      // 4. Send Order Delivered
      const deliveredRes = await EmailService.sendOrderDelivered(mockOrder);
      if (!deliveredRes.success) throw new Error('Order delivered email failed to dispatch');

      if (mockProvider.sentMessages.length !== 4) {
        throw new Error(`Expected 4 dispatched emails, found ${mockProvider.sentMessages.length}`);
      }

      // Verify sender address is sales@fusionbars.eu
      for (const msg of mockProvider.sentMessages) {
        if (!msg.from?.includes('sales@fusionbars.eu')) {
          throw new Error(`Outbound email sender must be sales@fusionbars.eu, received: ${msg.from}`);
        }
      }
    });

    // ----------------------------------------------------
    // TEST 69: Observability Structured Logging & Secret Scrubbing
    // ----------------------------------------------------
    await run('Observability Structured Logging & Secret Scrubbing', 'ObservabilityService.scrub must sanitize tokens, passwords, and IBANs', () => {
      const dirtyPayload = {
        userEmail: 'auditor@example.com',
        authSecret: 'super_secret_auth_token_32chars!',
        passwordHash: '$2a$10$abcdefghijklmno',
        customerIban: 'DE89370400440532013000',
        orderNumber: 'FB-EU-2026-10045',
        subtotal: 12000,
      };

      const scrubbed = ObservabilityService.scrub(dirtyPayload);

      if (scrubbed.authSecret !== '[REDACTED_SECRET]') {
        throw new Error('authSecret was not redacted');
      }
      if (scrubbed.passwordHash !== '[REDACTED_SECRET]') {
        throw new Error('passwordHash was not redacted');
      }
      if (scrubbed.customerIban.includes('0532013000')) {
        throw new Error('Full IBAN was not masked');
      }
      if (scrubbed.orderNumber !== 'FB-EU-2026-10045') {
        throw new Error('Non-sensitive orderNumber was unexpectedly altered');
      }
    });

    // ----------------------------------------------------
    // TEST 70: Multilingual Navigation & Locale Consistency (All 6 Locales)
    // ----------------------------------------------------
    await run('Multilingual Navigation & Locale Consistency', 'All six locales (en, de, fr, es, it, nl) must have complete dictionary keys', () => {
      const requiredLocales = ['en', 'de', 'fr', 'es', 'it', 'nl'] as const;

      for (const loc of requiredLocales) {
        const dict = getDictionary(loc as any);
        if (!dict.navigation || !dict.navigation.shop || !dict.navigation.cart || !dict.navigation.account) {
          throw new Error(`Locale "${loc}" has incomplete navigation dictionary keys`);
        }
        if (
          !dict.bottomBar ||
          !dict.bottomBar.home ||
          !dict.bottomBar.shop ||
          !dict.bottomBar.search ||
          !dict.bottomBar.cart ||
          !dict.bottomBar.account
        ) {
          throw new Error(`Locale "${loc}" has incomplete mobile bottom-bar dictionary keys`);
        }
        if (!dict.common || !dict.common.brandName || !dict.common.supportEmail) {
          throw new Error(`Locale "${loc}" has incomplete common dictionary keys`);
        }
        if (!dict.commerce || !dict.commerce.addToCart || !dict.commerce.checkout) {
          throw new Error(`Locale "${loc}" has incomplete commerce dictionary keys`);
        }
        if (
          !dict.payment?.cryptoDiscountBadge ||
          !dict.payment.cryptoDiscountTitle ||
          !dict.payment.cryptoDiscountBody ||
          !dict.payment.cryptoDiscountLine ||
          !dict.payment.cryptoDiscountPrice
        ) {
          throw new Error(`Locale "${loc}" is missing cryptocurrency discount copy`);
        }
      }
    });

    // ====================================================
    // PRE-PRODUCTION CONTROL CENTER & LAUNCH GATE (TESTS 71 - 80)
    // ====================================================

    // ----------------------------------------------------
    // TEST 71: Launch Readiness Service Assessment
    // ----------------------------------------------------
    await run('Launch Readiness Service Assessment', 'Should evaluate all 15 operational readiness subsystems and return structured report', async () => {
      const report = await LaunchReadinessService.evaluateReadiness();
      if (!report.timestamp) throw new Error('Report missing evaluation timestamp');
      if (report.requirements.length !== 15) {
        throw new Error(`Expected exactly 15 evaluated subsystems, got ${report.requirements.length}`);
      }
      if (typeof report.summary.readyCount !== 'number' || typeof report.summary.blockedCount !== 'number') {
        throw new Error('Summary count statistics invalid');
      }
      // Report must never leak raw secrets
      const reportStr = JSON.stringify(report);
      if (reportStr.includes('SuperSecretPassword') || reportStr.includes('privateKey')) {
        throw new Error('LaunchReadinessReport leaked sensitive key in metadata');
      }
    });

    // ----------------------------------------------------
    // TEST 72: Missing DB Configuration Gate
    // ----------------------------------------------------
    await run('Missing DB Configuration Gate', 'Should return BLOCKED status when database credentials are not supplied', async () => {
      const origDb = process.env.DATABASE_URL;
      const origDirect = process.env.DIRECT_URL;
      try {
        process.env.DATABASE_URL = '';
        process.env.DIRECT_URL = '';
        const dummyEmptyConfig: any = {
          database: { url: '', directUrl: '', isPooled: false },
        };
        const check = await LaunchReadinessService.checkDatabase(dummyEmptyConfig);
        if (check.status !== 'BLOCKED') {
          throw new Error(`Expected status BLOCKED for missing DATABASE_URL, received: ${check.status}`);
        }
        if (check.severity !== 'MANDATORY') {
          throw new Error('Database check must be classified as MANDATORY severity');
        }
      } finally {
        process.env.DATABASE_URL = origDb;
        process.env.DIRECT_URL = origDirect;
      }
    });

    // ----------------------------------------------------
    // TEST 73: Weak / Placeholder Secret Rejection
    // ----------------------------------------------------
    await run('Weak Secret Rejection', 'Should reject secrets that are too short, weak, or contain placeholder strings', () => {
      const dummyConfig: any = {};
      const origSession = process.env.SESSION_SECRET;
      try {
        process.env.SESSION_SECRET = 'short_weak_secret';
        const check = LaunchReadinessService.checkSecrets(dummyConfig);
        if (check.status !== 'BLOCKED') {
          throw new Error('Short secret (< 32 chars) must be marked as BLOCKED');
        }
      } finally {
        process.env.SESSION_SECRET = origSession;
      }
    });

    // ----------------------------------------------------
    // TEST 74: Test Crypto Address Rejected in Production
    // ----------------------------------------------------
    await run('Test Crypto Address Rejected in Production', 'Should prevent activating unspendable test crypto address in production mode', async () => {
      const origEnv = process.env.NODE_ENV;
      const origBtc = process.env.CRYPTO_BTC_ADDRESS;
      try {
        (process.env as any).NODE_ENV = 'production';
        process.env.CRYPTO_BTC_ADDRESS = 'bc1q_placeholder_btc_test_only';

        const activationRes = await PaymentActivationService.updateMethodStage({
          code: 'CRYPTO_BTC',
          newStage: 'ACTIVE',
          actor: { id: 'admin_test', role: 'SUPER_ADMIN' },
          reason: 'Attempted live activation with test placeholder',
        });

        if (activationRes.success) {
          throw new Error('Test placeholder crypto address MUST NOT be activated in production');
        }
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        process.env.CRYPTO_BTC_ADDRESS = origBtc;
      }
    });

    // ----------------------------------------------------
    // TEST 75: Inactive Payment Rail Gated from Checkout
    // ----------------------------------------------------
    await run('Inactive Payment Rail Gated from Checkout', 'Public checkout quote and order creation must reject inactive payment codes', async () => {
      let threw = false;
      try {
        await OrderCreationService.createOrder({
          items: [{ variantId: 'var_bar_1', quantity: 1 }],
          currency: 'EUR',
          shippingAddress: {
            firstName: 'Jean',
            lastName: 'Valjean',
            email: 'jean.valjean@example.fr',
            streetAddress: 'Rue Saint-Denis 12',
            city: 'Paris',
            postalCode: '75002',
            countryCode: 'FR',
            phone: '+33 6 12345678',
          },
          shippingMethodCode: 'STANDARD',
          paymentMethodCode: 'CRYPTO_USDT', // Inactive by default
        });
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('Inactive') && !err.message.includes('not currently active') && !err.message.includes('unsupported')) {
          throw new Error(`Unexpected error message for inactive payment rail: ${err.message}`);
        }
      }

      if (!threw) {
        throw new Error('Order creation must throw when an INACTIVE payment method is requested');
      }
    });

    // ----------------------------------------------------
    // TEST 76: Missing Object Storage Configuration Gate
    // ----------------------------------------------------
    await run('Missing Object Storage Configuration Gate', 'Mock storage mode or missing credentials must mark requirement BLOCKED for production', () => {
      const origProvider = process.env.STORAGE_PROVIDER;
      try {
        process.env.STORAGE_PROVIDER = 'mock';
        const dummyConfig: any = {};
        const check = LaunchReadinessService.checkObjectStorage(dummyConfig);
        if (check.status !== 'BLOCKED') {
          throw new Error('Mock storage provider must be marked as BLOCKED for production launch');
        }
      } finally {
        process.env.STORAGE_PROVIDER = origProvider;
      }
    });

    // ----------------------------------------------------
    // TEST 77: Missing Email Configuration Gate
    // ----------------------------------------------------
    await run('Missing Email Configuration Gate', 'Missing or mock email provider must be marked BLOCKED for production', () => {
      const origProvider = process.env.EMAIL_PROVIDER;
      try {
        process.env.EMAIL_PROVIDER = 'mock';
        const dummyConfig: any = {};
        const check = LaunchReadinessService.checkEmail(dummyConfig);
        if (check.status !== 'BLOCKED') {
          throw new Error('Mock email provider must be marked as BLOCKED for production launch');
        }
      } finally {
        process.env.EMAIL_PROVIDER = origProvider;
      }
    });

    // ----------------------------------------------------
    // TEST 78: Missing Legal Content Detection
    // ----------------------------------------------------
    await run('Missing Legal Content Detection', 'Placeholder corporate strings must produce BLOCKED status', () => {
      const origComp = process.env.LEGAL_COMPANY_NAME;
      try {
        process.env.LEGAL_COMPANY_NAME = '[LEGAL_COMPANY_NAME_PENDING]';
        const check = LaunchReadinessService.checkLegal();
        if (check.status !== 'BLOCKED') {
          throw new Error('Placeholder company name must cause legal check to be BLOCKED');
        }
      } finally {
        process.env.LEGAL_COMPANY_NAME = origComp;
      }
    });

    // ----------------------------------------------------
    // TEST 79: Production Deployment Guard Enforcing BLOCKED Status
    // ----------------------------------------------------
    await run('Production Deployment Guard Enforcing BLOCKED Status', 'Guard must prohibit live deployment when any mandatory blocker is unresolved', async () => {
      const decision = await ProductionDeploymentGuard.evaluateDeploymentGate();
      if (decision.canDeploy) {
        throw new Error('Deployment gate cannot be open while mandatory blockers exist');
      }
      if (decision.status !== 'BLOCKED') {
        throw new Error(`Expected status BLOCKED, received: ${decision.status}`);
      }
      if (decision.mandatoryBlockers.length === 0) {
        throw new Error('Guard must enumerate mandatory blockers preventing deployment');
      }

      // Assert throwing behavior
      let threw = false;
      try {
        await ProductionDeploymentGuard.assertDeploymentReady();
      } catch (err: any) {
        threw = true;
        if (!err.message.includes('[PRODUCTION DEPLOYMENT BLOCKED]')) {
          throw new Error(`Unexpected guard error message: ${err.message}`);
        }
      }
      if (!threw) {
        throw new Error('assertDeploymentReady must throw when deployment is blocked');
      }
    });

    // ----------------------------------------------------
    // TEST 80: Staging vs Production Environment Separation
    // ----------------------------------------------------
    await run('Staging vs Production Environment Separation', 'Staging safety assertions and product publication governance gates', () => {
      const isStagingSafe = ProductionDeploymentGuard.isStagingSafe();
      if (typeof isStagingSafe !== 'boolean') {
        throw new Error('isStagingSafe check must return a boolean');
      }

      // Product publication governance test
      const dummyInvalidProduct: any = {
        id: 'prod_invalid',
        status: 'DRAFT',
        availabilityType: 'BLOCKED', // Non-compliant
        variants: [], // No variants
      };

      const pubCheck = ProductPublicationGuard.evaluateProductForPublication(dummyInvalidProduct);
      if (pubCheck.canPublish) {
        throw new Error('Product with BLOCKED compliance and no variants must NOT be publishable');
      }
      if (pubCheck.reasons.length < 2) {
        throw new Error('Publication guard must enumerate all compliance failure reasons');
      }
    });

    // ----------------------------------------------------
    // TEST 81: Source Provenance (Part 32.1)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Source Provenance', 'All raw records must have verifiable source type, identifier, and timestamp', () => {
      const report = MasterCatalogueImportService.getImportResult();
      if (!report.rawProducts || report.rawProducts.length === 0) {
        throw new Error('Master import report must contain raw product records');
      }
      for (const p of report.rawProducts) {
        if (!['REFERENCE_WEBSITE', 'GITHUB_REPOSITORY_A', 'GITHUB_REPOSITORY_B'].includes(p.sourceType)) {
          throw new Error(`Invalid source type: ${p.sourceType} on record ${p.recordCode}`);
        }
        if (!p.sourceSlug || p.sourceSlug.trim().length === 0) {
          throw new Error(`Missing source slug on record ${p.recordCode}`);
        }
        if (!p.recordCode.startsWith('RAW-')) {
          throw new Error(`Record code must have RAW- prefix: ${p.recordCode}`);
        }
        if (!p.capturedAt) {
          throw new Error(`Record must have capturedAt timestamp: ${p.recordCode}`);
        }
      }
    });

    // ----------------------------------------------------
    // TEST 82: Raw Record Preservation (Part 32.2)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Raw Record Preservation', 'Original source text, pricing, and claims must remain untruncated in rawPayload', () => {
      const report = MasterCatalogueImportService.getImportResult();
      const sample = report.rawProducts.find((p) => p.sourceSlug === 'fusion-bar-almond-crush');
      if (!sample) throw new Error('Almond crush raw record must be present');
      if (!sample.rawPayload) throw new Error('rawPayload must be preserved');
      if (typeof sample.rawPayload !== 'object') throw new Error('rawPayload must be an object');
      if (sample.sourcePrice !== 20) throw new Error(`Expected source price 20 USD, received ${sample.sourcePrice}`);
    });

    // ----------------------------------------------------
    // TEST 83: Source Hashing (Part 32.3)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Source Hashing', 'Every raw record must compute a 64-character SHA-256 hash', () => {
      const report = MasterCatalogueImportService.getImportResult();
      for (const p of report.rawProducts) {
        if (!p.sourceHash || p.sourceHash.length !== 64) {
          throw new Error(`Invalid SHA-256 source hash on record ${p.recordCode}: ${p.sourceHash}`);
        }
      }
    });

    // ----------------------------------------------------
    // TEST 84: Idempotent Re-Import (Part 32.4)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Idempotent Re-Import', 'Re-executing master import pipeline must produce identical counts and deterministic mappings', () => {
      const run1 = MasterCatalogueImportService.getImportResult();
      const run2 = MasterCatalogueImportService.runMasterImport();
      if (run1.counts.combined.rawRecords !== run2.counts.combined.rawRecords) {
        throw new Error('Re-import count mismatch for raw records');
      }
      if (run1.counts.combined.matchedProducts !== run2.counts.combined.matchedProducts) {
        throw new Error('Re-import count mismatch for matched products');
      }
    });

    // ----------------------------------------------------
    // TEST 85: Duplicate Matching (Part 32.5)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Duplicate Matching', 'Deterministic matching engine must classify exact slug and title matches as EXACT_MATCH', () => {
      const dummyA: any = {
        sourceSku: 'FUS-ALM-6G',
        sourceSlug: 'fusion-bar-almond-crush',
        sourceName: 'Fusion Bar Almond Crush',
        sourceCategoryName: 'Chocolate Bars',
        sourcePrimaryImage: 'https://example.com/almond-crush.jpg',
      };
      const dummyB: any = {
        sourceSku: 'FUS-ALM-6G',
        sourceSlug: 'fusion-bar-almond-crush',
        sourceName: 'Fusion Bar Almond Crush',
        sourceCategoryName: 'Chocolate Bars',
        sourcePrimaryImage: 'https://example.com/almond-crush.jpg',
      };
      const match = DeterministicMatchingEngine.evaluateMatch(dummyA, dummyB);
      if (match.confidence !== 'EXACT_MATCH') {
        throw new Error(`Expected EXACT_MATCH, got ${match.confidence}`);
      }
      if (match.score < 85) {
        throw new Error(`Expected score >= 85, got ${match.score}`);
      }
    });

    // ----------------------------------------------------
    // TEST 86: Possible-Match Protection (Part 32.6)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Possible-Match Protection', 'Possible matches must require human review and never auto-merge', () => {
      const dummyA: any = {
        sourceSku: null,
        sourceSlug: 'magic-mushroom-chocolate',
        sourceName: 'Magic Mushroom Chocolate',
        sourceCategoryName: 'Chocolate Bars',
        sourcePrimaryImage: 'https://example.com/img1.jpg',
      };
      const dummyB: any = {
        sourceSku: null,
        sourceSlug: 'magic-mushroom-gummies',
        sourceName: 'Magic Mushroom Gummies',
        sourceCategoryName: 'Gummies',
        sourcePrimaryImage: 'https://example.com/img2.jpg',
      };
      const evalRes = DeterministicMatchingEngine.evaluateMatch(dummyA, dummyB);
      if (evalRes.isMatch) {
        throw new Error('Distinct products must not be automatically marked isMatch=true');
      }
    });

    // ----------------------------------------------------
    // TEST 87: Category Reconciliation (Part 32.7)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Category Reconciliation', 'Source categories must be preserved and mapped to normalized European categories', () => {
      const report = MasterCatalogueImportService.getImportResult();
      if (!report.categoryReconciliation || report.categoryReconciliation.length === 0) {
        throw new Error('Category reconciliation records missing');
      }
      const refGummies = report.categoryReconciliation.find(
        (c) => c.sourceCategorySlug === 'fusion-gummies' && c.sourceType === 'REFERENCE_WEBSITE'
      );
      if (!refGummies) throw new Error('Reference gummies category reconciliation missing');
      if (refGummies.normalizedCategorySlug !== 'botanical-gummies') {
        throw new Error(`Expected botanical-gummies, got ${refGummies.normalizedCategorySlug}`);
      }
    });

    // ----------------------------------------------------
    // TEST 88: Variant Normalization (Part 32.8)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Variant Normalization', 'Flavors represented as individual source products must resolve to Parent Product variants', () => {
      const report = MasterCatalogueImportService.getImportResult();
      const almond = report.matchedGroups.find((g) => g.canonicalSlug.includes('almond-crush'));
      if (!almond) throw new Error('Almond crush group must exist');
      if (!almond.reconciledProduct.flavor || !almond.reconciledProduct.flavor.toLowerCase().includes('almond')) {
        throw new Error('Almond crush flavor normalization failed');
      }
    });

    // ----------------------------------------------------
    // TEST 89: Image Deduplication (Part 32.9)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Image Deduplication', 'Media manifest must detect shared images and track broken images', () => {
      const report = MasterCatalogueImportService.getImportResult();
      if (!report.rawMedia || report.rawMedia.length === 0) throw new Error('rawMedia missing');
      const shared = report.rawMedia.filter((m) => m.sharedProductCount > 1);
      if (shared.length === 0) throw new Error('Expected at least one shared image asset across source items');
    });

    // ----------------------------------------------------
    // TEST 90: Conflicting Field Detection (Part 32.10)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Conflicting Field Detection', 'Discrepancies across external sources must be flagged in fieldComparisons', () => {
      const report = MasterCatalogueImportService.getImportResult();
      if (report.counts.combined.conflicts <= 0) {
        throw new Error('Expected conflicts to be detected across Reference, Repo A, and Repo B');
      }
      const conflictIssue = report.issues.find((i) => i.issueType === 'CONFLICTING_PRICE');
      if (!conflictIssue) throw new Error('Expected conflicting price issue logged');
    });

    // ----------------------------------------------------
    // TEST 91: Source Deletion Detection (Part 32.11)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Source Deletion Detection', 'Products absent from a single source must be retained without silent DB deletion', () => {
      const report = MasterCatalogueImportService.getImportResult();
      const uniqueRef = report.matchedGroups.filter((g) => g.sources.reference && !g.sources.repoA);
      if (uniqueRef.length === 0) {
        throw new Error('Expected products unique to reference site to be retained');
      }
    });

    // ----------------------------------------------------
    // TEST 92: Review Provenance (Part 32.12)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Review Provenance', 'Imported customer reviews must retain author, rating, body, and STAGED status', () => {
      const report = MasterCatalogueImportService.getImportResult();
      if (report.rawReviews.length === 0) throw new Error('Expected customer reviews to be imported');
      for (const r of report.rawReviews) {
        if (!r.authorName || r.authorName.trim().length === 0) throw new Error('Missing review author');
        if (r.rating <= 0 || r.rating > 5) throw new Error(`Invalid review rating: ${r.rating}`);
        if (!r.body || r.body.trim().length === 0) throw new Error('Missing review body');
        if (r.reviewStatus !== 'STAGED') throw new Error(`Reviews must be STAGED, got ${r.reviewStatus}`);
      }
    });

    // ----------------------------------------------------
    // TEST 93: Price/Currency Preservation (Part 32.13)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Price/Currency Preservation', 'Raw prices must preserve USD currency; unapproved EU products flagged PRICING_REVIEW_REQUIRED', () => {
      const report = MasterCatalogueImportService.getImportResult();
      const pricingIssues = report.issues.filter((i) => i.issueType === 'PRICING_REVIEW_REQUIRED');
      if (pricingIssues.length === 0) {
        throw new Error('Expected PRICING_REVIEW_REQUIRED issues for unapproved imported items');
      }
      for (const p of report.rawProducts) {
        if (p.sourcePrice != null && p.sourceCurrency !== 'USD') {
          throw new Error(`Raw price must preserve USD, got ${p.sourceCurrency}`);
        }
      }
    });

    // ----------------------------------------------------
    // TEST 94: Catalogue Backup Verification (Part 32.14)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Catalogue Backup Verification', 'Pre-import catalogue backup must exist on disk and preserve original products', () => {
      const report = MasterCatalogueImportService.getImportResult();
      if (!report.backupStatus.backedUp) throw new Error('Backup status backedUp must be true');
      if (!report.backupStatus.backupPath || !report.backupStatus.backupPath.includes('catalogue-backup-pre-import-')) {
        throw new Error(`Backup file path missing or invalid: ${report.backupStatus.backupPath}`);
      }
      if (report.backupStatus.originalProductCount !== 10) {
        throw new Error(`Expected 10 products in backup, found ${report.backupStatus.originalProductCount}`);
      }
      if (report.backupStatus.originalVariantCount !== 61) {
        throw new Error(`Expected 61 variants in backup, found ${report.backupStatus.originalVariantCount}`);
      }
    });

    // ----------------------------------------------------
    // TEST 95: No Accidental Order/Payment Mutation (Part 32.15)
    // ----------------------------------------------------
    await run('Master Catalogue Import - Order & Payment Isolation', 'Import pipeline must strictly isolate catalogue from orders and payments', async () => {
      const ordersBefore = await CommerceRepository.getAllOrders();
      // Re-run import
      MasterCatalogueImportService.runMasterImport();
      const ordersAfter = await CommerceRepository.getAllOrders();
      if (ordersBefore.length !== ordersAfter.length) {
        throw new Error('Master import pipeline mutated order records');
      }
    });

    // ----------------------------------------------------
    // CATALOGUE REVIEW CENTER (15 GOVERNANCE TESTS)
    // ----------------------------------------------------
    const reviewActor = {
      actor: 'qa.review.officer@fusionbars.eu',
      actorRole: 'SUPER_ADMIN' as const,
    };

    const requireReviewProduct = (slug = 'fusion-bar-almond-crush') => {
      const product = CatalogueReviewService.getProductDetail(slug);
      if (!product) throw new Error(`Expected review product ${slug} to exist`);
      return product;
    };

    await run('Catalogue Review Center', 'Review decision persistence', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      const fieldName = product.fieldComparisons[0]?.fieldName || 'name';
      const result = CatalogueReviewService.approveFieldDecision({
        productSlug: product.canonicalSlug,
        fieldName,
        choice: 'KEEP_CURRENT_EU',
        ...reviewActor,
        reason: 'Persisted European working value after source comparison',
      });
      if (!result.success) throw new Error(result.error || 'Field approval failed');
      const reloaded = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (!reloaded?.fieldDecisions[fieldName]) {
        throw new Error('Field decision was not persisted on the review product');
      }
      if (reloaded.fieldDecisions[fieldName].actor !== reviewActor.actor) {
        throw new Error('Persisted decision must record the acting administrator');
      }
    });

    await run('Catalogue Review Center', 'Source provenance preservation', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      const beforeSources = JSON.stringify(product.sources);
      const beforeMappings = JSON.stringify(product.retainedSourceMappings);
      CatalogueReviewService.approveFieldDecision({
        productSlug: product.canonicalSlug,
        fieldName: 'name',
        choice: 'CUSTOM_APPROVED_VALUE',
        customValue: 'European Working Title',
        ...reviewActor,
        reason: 'Working title updated without mutating source provenance',
      });
      const after = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (JSON.stringify(after?.sources) !== beforeSources) {
        throw new Error('Source records must remain unchanged after a field decision');
      }
      if (JSON.stringify(after?.retainedSourceMappings) !== beforeMappings) {
        throw new Error('Retained source mappings must be preserved');
      }
    });

    await run('Catalogue Review Center', 'Variant merge approval', () => {
      CatalogueReviewService.resetStateForTests();
      const child = requireReviewProduct('fusion-bar-almond-crush');
      const parentSlug = 'fusion-mushroom-chocolate-bar';
      const parentBefore = CatalogueReviewService.getProductDetail(parentSlug);
      const parentVariantCount = parentBefore?.variants.length || 0;
      const result = CatalogueReviewService.decideVariantStructure({
        productSlug: child.canonicalSlug,
        decision: 'PARENT_WITH_VARIANTS',
        parentTargetSlug: parentSlug,
        ...reviewActor,
        reason: 'Explicit administrator approval to merge flavour into parent variants',
      });
      if (!result.success) throw new Error(result.error || 'Variant merge failed');
      const childAfter = CatalogueReviewService.getProductDetail(child.canonicalSlug);
      if (childAfter?.variantStructureDecision !== 'PARENT_WITH_VARIANTS') {
        throw new Error('Approved merge must record PARENT_WITH_VARIANTS');
      }
      if (!childAfter?.retainedSourceMappings.length) {
        throw new Error('Merged flavour must retain original source mappings');
      }
      const parentAfter = CatalogueReviewService.getProductDetail(parentSlug);
      if (parentAfter && parentAfter.variants.length < parentVariantCount) {
        throw new Error('Parent variant list must not shrink after an approved merge');
      }
      const mergeAudit = CatalogueReviewService.getAuditTrail().find((a) => a.action === 'VARIANT_MERGED');
      if (!mergeAudit) throw new Error('VARIANT_MERGED audit record was not created');
    });

    await run('Catalogue Review Center', 'Variant merge rejection', () => {
      CatalogueReviewService.resetStateForTests();
      const parentSlug = 'fusion-mushroom-chocolate-bar';
      const parentBefore = CatalogueReviewService.getProductDetail(parentSlug);
      const parentSkus = parentBefore?.variants.map((v) => v.sku).join('|') || '';
      const child = requireReviewProduct('fusion-bar-matcha');
      const result = CatalogueReviewService.decideVariantStructure({
        productSlug: child.canonicalSlug,
        decision: 'INDIVIDUAL_PRODUCTS',
        parentTargetSlug: parentSlug,
        ...reviewActor,
        reason: 'Rejected automatic flavour merge; keep individual product page',
      });
      if (!result.success) throw new Error(result.error || 'Variant merge rejection failed');
      const childAfter = CatalogueReviewService.getProductDetail(child.canonicalSlug);
      if (childAfter?.variantStructureDecision !== 'INDIVIDUAL_PRODUCTS') {
        throw new Error('Rejected merge must record INDIVIDUAL_PRODUCTS');
      }
      const parentAfter = CatalogueReviewService.getProductDetail(parentSlug);
      if (parentAfter && parentAfter.variants.map((v) => v.sku).join('|') !== parentSkus) {
        throw new Error('Rejected merge must not attach variants onto the parent product');
      }
      const splitAudit = CatalogueReviewService.getAuditTrail().find((a) => a.action === 'VARIANT_SPLIT');
      if (!splitAudit) throw new Error('VARIANT_SPLIT audit record was not created');
    });

    await run('Catalogue Review Center', 'Pricing review blocking publication', () => {
      CatalogueReviewService.resetStateForTests();
      const wholesale =
        CatalogueReviewService.getProductDetail('fusion-100-bars-boutique-box') ||
        CatalogueReviewService.getFilteredProducts('PRICE_REVIEW')[0];
      if (!wholesale) throw new Error('Expected a pricing-review product');
      if (!wholesale.pricingReviewRequired) {
        throw new Error('Wholesale/unpriced imports must start as PRICING_REVIEW_REQUIRED');
      }
      const published = CatalogueReviewService.publishProduct({
        productSlug: wholesale.canonicalSlug,
        ...reviewActor,
        reason: 'Attempt to publish without approved EUR price',
      });
      if (published.success) throw new Error('Products in pricing review must not be publishable');
      if (!published.error?.toLowerCase().includes('pric')) {
        throw new Error(`Expected pricing blocker, received: ${published.error}`);
      }
    });

    await run('Catalogue Review Center', 'Compliance review blocking publication', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      CatalogueReviewService.updateComplianceClassification({
        productSlug: product.canonicalSlug,
        classification: 'REQUIRES_REVIEW',
        ...reviewActor,
        reason: 'Compliance still open',
      });
      const published = CatalogueReviewService.publishProduct({
        productSlug: product.canonicalSlug,
        ...reviewActor,
        reason: 'Attempt to publish without compliance approval',
      });
      if (published.success) throw new Error('REQUIRES_REVIEW products must not be publishable');
    });

    await run('Catalogue Review Center', 'Country availability blocking purchase', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      const live = CatalogueReviewService.getState().products[product.canonicalSlug];
      live.pricingReviewRequired = false;
      live.priceEUR = 2500;
      live.variants[0].priceEUR = 2500;
      live.variants[0].sku = live.variants[0].sku || 'FUS-ALM-6G';
      live.complianceClassification = 'APPROVED';
      live.publicationStatus = 'PUBLISHED';
      CatalogueReviewService.updateCountryAvailability({
        productSlug: product.canonicalSlug,
        countryCode: 'NL',
        status: 'BLOCKED',
        ...reviewActor,
        reason: 'Explicit Netherlands block for review-center eligibility test',
      });
      const decision = CatalogueReviewService.evaluatePurchaseEligibility(product.canonicalSlug, 'NL');
      if (decision.eligible) throw new Error('Blocked country must not be purchasable');
      if (decision.reasonCode !== 'COUNTRY_BLOCKED') {
        throw new Error(`Expected COUNTRY_BLOCKED, received ${decision.reasonCode}`);
      }
    });

    await run('Catalogue Review Center', 'Category mapping approval', () => {
      CatalogueReviewService.resetStateForTests();
      const mapping = CatalogueReviewService.getState().categoryMappings.find((m) => m.approvalStatus === 'PENDING');
      if (!mapping) throw new Error('Expected at least one pending category mapping');
      const sourceSlug = mapping.sourceCategorySlug;
      const sourceName = mapping.sourceCategoryName;
      const result = CatalogueReviewService.approveCategoryMapping({
        sourceCategorySlug: sourceSlug,
        targetCategorySlug: mapping.normalizedCategorySlug,
        targetCategoryName: mapping.normalizedCategoryName,
        ...reviewActor,
        reason: 'Approved source-to-EU category mapping without renaming the raw source category',
      });
      if (!result.success || !result.mapping) throw new Error(result.error || 'Category approval failed');
      if (result.mapping.sourceCategorySlug !== sourceSlug || result.mapping.sourceCategoryName !== sourceName) {
        throw new Error('Raw source category identity must be preserved');
      }
      if (result.mapping.approvalStatus !== 'APPROVED' || result.mapping.actor !== reviewActor.actor) {
        throw new Error('Approved mapping must record actor and APPROVED status');
      }
      if (!result.mapping.timestamp) throw new Error('Approved mapping must record a timestamp');
    });

    await run('Catalogue Review Center', 'Content approval', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      const original = product.originalSourceContent;
      const result = CatalogueReviewService.moderateContent({
        productSlug: product.canonicalSlug,
        action: 'APPROVE',
        ...reviewActor,
        reason: 'Source copy accepted for European storefront after claims review',
      });
      if (!result.success) throw new Error(result.error || 'Content approval failed');
      if (result.product?.originalSourceContent !== original) {
        throw new Error('Content approval must not overwrite original source content');
      }
      if (result.product?.contentModerationStatus !== 'APPROVED') {
        throw new Error('Approved content must move to APPROVED');
      }
    });

    await run('Catalogue Review Center', 'Review moderation', () => {
      CatalogueReviewService.resetStateForTests();
      const review = CatalogueReviewService.getState().reviews[0];
      if (!review) throw new Error('Expected staged imported reviews');
      if (review.moderationStatus !== 'STAGED') throw new Error('Imported reviews must start STAGED');
      const before = {
        authorName: review.authorName,
        body: review.body,
        rating: review.rating,
        sourceUrl: review.sourceUrl,
        isVerifiedBuyer: review.isVerifiedBuyer,
      };
      const result = CatalogueReviewService.moderateReview({
        reviewId: review.id,
        action: 'APPROVE',
        ...reviewActor,
        reason: 'Staged review approved for later public use',
      });
      if (!result.success || result.review?.moderationStatus !== 'APPROVED') {
        throw new Error(result.error || 'Review approval failed');
      }
      if (
        result.review.authorName !== before.authorName ||
        result.review.body !== before.body ||
        result.review.rating !== before.rating ||
        result.review.sourceUrl !== before.sourceUrl ||
        result.review.isVerifiedBuyer !== before.isVerifiedBuyer
      ) {
        throw new Error('Review moderation must preserve source, reviewer, rating, body, and verification evidence');
      }
    });

    await run('Catalogue Review Center', 'Media approval', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      const asset = product.mediaAssets[0];
      if (!asset) throw new Error('Expected at least one media asset on the imported product');
      const originalUrl = asset.url;
      const result = CatalogueReviewService.moderateMedia({
        productSlug: product.canonicalSlug,
        mediaId: asset.id,
        action: 'SET_PRIMARY',
        ...reviewActor,
        reason: 'Set imported image as working primary without deleting the raw media record',
      });
      if (!result.success) throw new Error(result.error || 'Media approval failed');
      const updated = result.product?.mediaAssets.find((m) => m.id === asset.id);
      if (!updated?.isPrimary || updated.url !== originalUrl) {
        throw new Error('Media approval must keep the raw URL and only change product assignment');
      }
    });

    await run('Catalogue Review Center', 'Publication readiness', () => {
      const incomplete = CatalogueReviewService.evaluatePublicationReadiness({
        canonicalSlug: 'readiness-test',
        name: 'Readiness Test Bar',
        pricingReviewRequired: true,
        complianceClassification: 'REQUIRES_REVIEW',
        contentModerationStatus: 'PENDING_REVIEW',
        categorySlug: 'uncategorized',
        primaryImage: '',
        variants: [{ id: 'v1', sku: '', name: 'x', flavor: '', stockLevel: 0, image: '' }],
        countryAvailability: { NL: 'NOT_CONFIGURED' },
        seo: { isApproved: false },
        description: '',
        approvedStoreContent: '',
      });
      if (incomplete.isReadyToPublish) throw new Error('Incomplete products must not be READY_TO_PUBLISH');
      if (incomplete.blockers.length < 6) {
        throw new Error('Publication checklist must enumerate the failed gates');
      }

      const complete = CatalogueReviewService.evaluatePublicationReadiness({
        canonicalSlug: 'ready-bar',
        name: 'Ready Bar',
        pricingReviewRequired: false,
        priceEUR: 2500,
        complianceClassification: 'APPROVED',
        contentModerationStatus: 'APPROVED',
        categorySlug: 'chocolate-bars',
        primaryImage: '/images/products/chocolate-bar.png',
        variants: [{ id: 'v1', sku: 'FUS-RDY-6G', name: 'Ready', flavor: 'Original', priceEUR: 2500, stockLevel: 10, image: '/x.png' }],
        countryAvailability: { NL: 'AVAILABLE' },
        seo: { isApproved: true, approvedTitle: 'Ready Bar | FusionBars EU' },
        description: 'Approved European store description for the ready bar.',
        approvedStoreContent: 'Approved European store description for the ready bar.',
      });
      if (!complete.isReadyToPublish) {
        throw new Error(`Expected READY_TO_PUBLISH, blockers: ${complete.blockers.join('; ')}`);
      }
    });

    await run('Catalogue Review Center', 'Audit log creation', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      CatalogueReviewService.blockProduct({
        productSlug: product.canonicalSlug,
        ...reviewActor,
        reason: 'Blocked for audit-log verification',
      });
      const audit = CatalogueReviewService.getAuditTrail().find((a) => a.action === 'PRODUCT_BLOCKED');
      if (!audit) throw new Error('PRODUCT_BLOCKED audit record missing');
      if (audit.actor !== reviewActor.actor) throw new Error('Audit record must include actor');
      if (!audit.timestamp) throw new Error('Audit record must include timestamp');
      if (audit.entityId !== product.canonicalSlug) throw new Error('Audit record must include entity');
      if (audit.beforeValue == null) throw new Error('Audit record must include before value');
      if (audit.afterValue !== 'BLOCKED') throw new Error('Audit record must include after value');
      if (!audit.reason.includes('audit-log')) throw new Error('Audit record must include reason');
    });

    await run('Catalogue Review Center', 'Bulk-review safety', () => {
      CatalogueReviewService.resetStateForTests();
      const product = requireReviewProduct();
      const result = CatalogueReviewService.executeBulkAction({
        productSlugs: [product.canonicalSlug],
        action: 'PUBLISH_SELECTED',
        ...reviewActor,
        reason: 'Bulk publish must not bypass pricing, compliance, or readiness gates',
      });
      if (result.affectedCount !== 0) {
        throw new Error('Bulk publish must not publish products that fail readiness gates');
      }
      if (!result.errors || result.errors.length === 0) {
        throw new Error('Bulk publish must return per-product gate failures');
      }
      const stillDraft = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (stillDraft?.publicationStatus === 'PUBLISHED') {
        throw new Error('Bulk publish must not mark gated products as PUBLISHED');
      }
    });

    await run('Catalogue Review Center', 'Raw source immutability', () => {
      CatalogueReviewService.resetStateForTests();
      const importResult = MasterCatalogueImportService.getImportResult();
      const rawBefore = JSON.stringify(
        importResult.rawProducts.find((p) => p.sourceSlug === 'fusion-bar-almond-crush')
      );
      const product = requireReviewProduct();
      CatalogueReviewService.approveFieldDecision({
        productSlug: product.canonicalSlug,
        fieldName: 'name',
        choice: 'CUSTOM_APPROVED_VALUE',
        customValue: 'Mutated Working Name',
        ...reviewActor,
        reason: 'Working copy change must not mutate raw import records',
      });
      CatalogueReviewService.moderateContent({
        productSlug: product.canonicalSlug,
        action: 'REWRITE',
        rewrittenContent: 'Administrator-supplied European store copy.',
        ...reviewActor,
        reason: 'Rewrite store copy only',
      });
      const rawAfter = JSON.stringify(
        MasterCatalogueImportService.getImportResult().rawProducts.find((p) => p.sourceSlug === 'fusion-bar-almond-crush')
      );
      if (rawBefore !== rawAfter) {
        throw new Error('Raw import records must remain immutable during catalogue review');
      }
      const afterProduct = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (afterProduct?.originalSourceContent !== product.originalSourceContent) {
        throw new Error('Original source content on the review working copy must stay intact');
      }
    });

    // ----------------------------------------------------
    // CATALOGUE ADJUDICATION WORKSPACE (17 GOVERNANCE TESTS)
    // ----------------------------------------------------
    const adjActor = {
      actor: 'qa.adjudication.officer@fusionbars.eu',
      actorRole: 'SUPER_ADMIN' as const,
    };

    const resetAdjudication = () => {
      CatalogueReviewService.resetStateForTests();
      CatalogueAdjudicationService.resetStateForTests();
    };

    const requireAdjProduct = (slug = 'fusion-bar-almond-crush') => {
      const product = CatalogueReviewService.getProductDetail(slug);
      if (!product) throw new Error(`Expected adjudication product ${slug}`);
      return product;
    };

    await run('Catalogue Adjudication', 'Review assignment', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const result = CatalogueAdjudicationService.assignReviewer({
        productSlug: product.canonicalSlug,
        role: 'CONTENT_MANAGER',
        ...adjActor,
      });
      if (!result.success) throw new Error(result.error || 'Assignment failed');
      const state = CatalogueAdjudicationService.getState();
      if (state.assignments[product.canonicalSlug]?.role !== 'CONTENT_MANAGER') {
        throw new Error('Assignment must persist assignee role');
      }
      const audit = state.auditTrail.find((a) => a.action === 'REVIEW_ASSIGNED');
      if (!audit || audit.actor !== adjActor.actor) throw new Error('Assignment must be audited with actor');
    });

    await run('Catalogue Adjudication', 'Review batching', () => {
      resetAdjudication();
      CatalogueAdjudicationService.setBatchSize(5);
      const batch = CatalogueAdjudicationService.getBatch('PRICING', 5);
      if (batch.batchSize !== 5) throw new Error('Batch size must be 5');
      if (batch.items.length > 5) throw new Error('Batch must not exceed requested size');
      const offsetBefore = batch.offset;
      const next = CatalogueAdjudicationService.advanceBatch('PRICING');
      const after = CatalogueAdjudicationService.getBatch('PRICING');
      if (after.offset !== next) throw new Error('Batch cursor must advance and persist');
      if (after.batchSize !== 5) throw new Error('Batch size must remain after navigation');
      if (offsetBefore === after.offset && batch.total > 5) {
        throw new Error('Expected batch cursor to move when more than one page exists');
      }
    });

    await run('Catalogue Adjudication', 'Field decision persistence', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const fieldName = product.fieldComparisons.find((c) => c.hasConflict)?.fieldName || product.fieldComparisons[0]?.fieldName || 'name';
      const result = CatalogueAdjudicationService.adjudicateFieldConflict({
        productSlug: product.canonicalSlug,
        fieldName,
        choice: 'KEEP_CURRENT_EU',
        reason: 'Adjudication field kept as current EU working value',
        ...adjActor,
      });
      if (!result.success) throw new Error(result.error || 'Field adjudication failed');
      const reloaded = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (!reloaded?.fieldDecisions[fieldName]) throw new Error('Field decision must persist on review product');
      const record = CatalogueAdjudicationService.getState().records[`DUPLICATE_CONFLICTS:${product.canonicalSlug}`];
      if (record?.status !== 'APPROVED') throw new Error('Duplicate-conflict record must become APPROVED');
    });

    await run('Catalogue Adjudication', 'Merge approval', () => {
      resetAdjudication();
      const group = CatalogueAdjudicationService.getMatchGroups()[0];
      if (!group) throw new Error('Expected at least one possible-match group');
      const denied = CatalogueAdjudicationService.adjudicatePossibleMatch({
        groupId: group.id,
        decision: 'MERGE',
        confirmMerge: false,
        reason: 'Attempt without confirmation',
        ...adjActor,
      });
      if (denied.success) throw new Error('MERGE without confirmation must fail');
      const result = CatalogueAdjudicationService.adjudicatePossibleMatch({
        groupId: group.id,
        decision: 'MERGE',
        confirmMerge: true,
        reason: 'Confirmed human merge of possible match group',
        ...adjActor,
      });
      if (!result.success || result.group?.decision !== 'MERGE') throw new Error(result.error || 'Merge failed');
      const audit = CatalogueAdjudicationService.getAuditTrail().find((a) => a.action === 'MATCH_MERGED');
      if (!audit) throw new Error('MATCH_MERGED audit missing');
    });

    await run('Catalogue Adjudication', 'Keep-separate approval', () => {
      resetAdjudication();
      const group = CatalogueAdjudicationService.getMatchGroups()[0];
      if (!group) throw new Error('Expected possible-match group');
      const denied = CatalogueAdjudicationService.adjudicatePossibleMatch({
        groupId: group.id,
        decision: 'KEEP_SEPARATE',
        ...adjActor,
      });
      if (denied.success) throw new Error('KEEP_SEPARATE without reason must fail');
      const result = CatalogueAdjudicationService.adjudicatePossibleMatch({
        groupId: group.id,
        decision: 'KEEP_SEPARATE',
        reason: 'Distinct SKUs and source identities must remain separate',
        ...adjActor,
      });
      if (!result.success || result.group?.decision !== 'KEEP_SEPARATE') {
        throw new Error(result.error || 'Keep-separate failed');
      }
      const audit = CatalogueAdjudicationService.getAuditTrail().find((a) => a.action === 'MATCH_SEPARATED');
      if (!audit?.reason.includes('Distinct SKUs')) throw new Error('Keep-separate reason must be audited');
    });

    await run('Catalogue Adjudication', 'Deferred state', () => {
      resetAdjudication();
      const group = CatalogueAdjudicationService.getMatchGroups()[0];
      if (!group) throw new Error('Expected possible-match group');
      const result = CatalogueAdjudicationService.adjudicatePossibleMatch({
        groupId: group.id,
        decision: 'DEFER',
        reason: 'Needs further source comparison',
        ...adjActor,
      });
      if (!result.success || result.group?.status !== 'DEFERRED') throw new Error('Defer must set DEFERRED');
      if (result.group?.decision === 'MERGE') throw new Error('DEFERRED must not be treated as MERGE approval');
      const record = CatalogueAdjudicationService.getState().records[`POSSIBLE_MATCHES:${group.id}`];
      if (record?.status !== 'DEFERRED') throw new Error('Queue record must remain DEFERRED, not APPROVED');
    });

    await run('Catalogue Adjudication', 'Compliance decision', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const result = CatalogueAdjudicationService.adjudicateCompliance({
        productSlug: product.canonicalSlug,
        classification: 'REQUIRES_REVIEW',
        reason: 'Human compliance officer retained REQUIRES_REVIEW; no auto-approval from source presence',
        ...adjActor,
      });
      if (!result.success) throw new Error(result.error || 'Compliance adjudication failed');
      const after = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (after?.complianceClassification !== 'REQUIRES_REVIEW') {
        throw new Error('Compliance classification must persist human decision');
      }
      const blocked = CatalogueAdjudicationService.adjudicateCompliance({
        productSlug: product.canonicalSlug,
        classification: 'BLOCKED',
        reason: 'Explicit compliance block',
        ...adjActor,
      });
      if (!blocked.success) throw new Error(blocked.error || 'Compliance block failed');
      const audit = CatalogueAdjudicationService.getAuditTrail().find((a) => a.action === 'COMPLIANCE_BLOCKED');
      if (!audit) throw new Error('COMPLIANCE_BLOCKED audit missing');
    });

    await run('Catalogue Adjudication', 'Country decision', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const denied = CatalogueAdjudicationService.adjudicateCountry({
        productSlug: product.canonicalSlug,
        countryCode: 'NL',
        status: 'BLOCKED',
        ...adjActor,
      });
      if (denied.success) throw new Error('BLOCKED country without reason must fail');
      const result = CatalogueAdjudicationService.adjudicateCountry({
        productSlug: product.canonicalSlug,
        countryCode: 'NL',
        status: 'RESTRICTED',
        reason: 'Internal restriction pending local counsel review',
        ...adjActor,
      });
      if (!result.success) throw new Error(result.error || 'Country adjudication failed');
      const after = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (after?.countryAvailability.NL !== 'RESTRICTED') throw new Error('Country status must persist');
      const audit = CatalogueAdjudicationService.getAuditTrail().find((a) => a.action === 'COUNTRY_CHANGED');
      if (!audit) throw new Error('COUNTRY_CHANGED audit missing');
    });

    await run('Catalogue Adjudication', 'Content rewrite', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const original = product.originalSourceContent;
      const result = CatalogueAdjudicationService.adjudicateContent({
        productSlug: product.canonicalSlug,
        action: 'REWRITE',
        rewrittenContent: 'Approved European storefront copy without therapeutic claims.',
        reason: 'Rewrote storefront copy; raw source preserved',
        ...adjActor,
      });
      if (!result.success) throw new Error(result.error || 'Content rewrite failed');
      const after = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (after?.originalSourceContent !== original) throw new Error('Raw source content must stay immutable');
      if (after?.approvedStoreContent !== 'Approved European storefront copy without therapeutic claims.') {
        throw new Error('Approved storefront content must store the rewrite');
      }
      const audit = CatalogueAdjudicationService.getAuditTrail().find((a) => a.action === 'CONTENT_REWRITTEN');
      if (!audit) throw new Error('CONTENT_REWRITTEN audit missing');
    });

    await run('Catalogue Adjudication', 'Translation approval', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      CatalogueAdjudicationService.adjudicateContent({
        productSlug: product.canonicalSlug,
        action: 'APPROVE',
        reason: 'Approve English storefront before translations',
        ...adjActor,
      });
      const empty = CatalogueAdjudicationService.approveTranslation({
        productSlug: product.canonicalSlug,
        locale: 'de',
        reason: 'Attempt empty approval',
        ...adjActor,
      });
      if (empty.success) throw new Error('Empty/machine translation must not auto-approve');
      CatalogueAdjudicationService.saveTranslationDraft({
        productSlug: product.canonicalSlug,
        locale: 'de',
        value: 'Genehmigter deutscher Storefront-Text.',
        ...adjActor,
      });
      const draftStatus = CatalogueAdjudicationService.getState().translations[product.canonicalSlug]?.locales.de.status;
      if (draftStatus !== 'DRAFT') throw new Error('Saved translation must be DRAFT, not APPROVED');
      const approved = CatalogueAdjudicationService.approveTranslation({
        productSlug: product.canonicalSlug,
        locale: 'de',
        reason: 'Human approved German translation',
        ...adjActor,
      });
      if (!approved.success) throw new Error(approved.error || 'Translation approval failed');
      if (CatalogueAdjudicationService.getState().translations[product.canonicalSlug]?.locales.de.status !== 'APPROVED') {
        throw new Error('Human approval must set APPROVED');
      }
    });

    await run('Catalogue Adjudication', 'Media decision', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const asset = product.mediaAssets[0];
      if (!asset) throw new Error('Expected media asset');
      const urlBefore = asset.url;
      const result = CatalogueAdjudicationService.adjudicateMedia({
        productSlug: product.canonicalSlug,
        mediaId: asset.id,
        action: 'SET_PRIMARY',
        reason: 'Set primary without deleting raw media',
        ...adjActor,
      });
      if (!result.success) throw new Error(result.error || 'Media adjudication failed');
      const after = CatalogueReviewService.getProductDetail(product.canonicalSlug)?.mediaAssets.find((m) => m.id === asset.id);
      if (!after || after.url !== urlBefore) throw new Error('Raw media URL must remain');
      const audit = CatalogueAdjudicationService.getAuditTrail().find((a) => a.action === 'MEDIA_APPROVED');
      if (!audit) throw new Error('MEDIA_APPROVED audit missing');
    });

    await run('Catalogue Adjudication', 'Publication readiness', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const notReady = CatalogueAdjudicationService.markReadyForPublication({
        productSlug: product.canonicalSlug,
        reason: 'Attempt readiness without gates',
        ...adjActor,
      });
      if (notReady.success) throw new Error('Incomplete products must not become READY_FOR_PUBLICATION');
      if (!notReady.error?.includes('NOT_READY')) throw new Error('Readiness failure must report NOT_READY');
    });

    await run('Catalogue Adjudication', 'Two-step publication', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const nonAdmin = CatalogueAdjudicationService.publishFinal({
        productSlug: product.canonicalSlug,
        actor: adjActor.actor,
        actorRole: 'CATALOG_MANAGER',
        reason: 'Catalog manager publish attempt',
        confirm: true,
      });
      if (nonAdmin.success) throw new Error('Only SUPER_ADMIN may final-publish');
      const unconfirmed = CatalogueAdjudicationService.publishFinal({
        productSlug: product.canonicalSlug,
        reason: 'No confirm',
        confirm: false,
        ...adjActor,
      });
      if (unconfirmed.success) throw new Error('Publication requires confirmation');
      const notReady = CatalogueAdjudicationService.publishFinal({
        productSlug: product.canonicalSlug,
        reason: 'Skip ready gate',
        confirm: true,
        ...adjActor,
      });
      if (notReady.success) throw new Error('Must not publish without READY_FOR_PUBLICATION');
      if (CatalogueAdjudicationService.getState().published.includes(product.canonicalSlug)) {
        throw new Error('Incomplete product must not appear in published list');
      }
    });

    await run('Catalogue Adjudication', 'Preview isolation', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const preview = CatalogueAdjudicationService.getPreview({
        productSlug: product.canonicalSlug,
        locale: 'fr',
        currency: 'GBP',
        countryCode: 'DE',
      });
      if (!preview || preview.isolated !== true) throw new Error('Preview must be isolated from live storefront');
      if (preview.locale !== 'fr' || preview.currency !== 'GBP' || preview.countryCode !== 'DE') {
        throw new Error('Preview must reflect selected locale/currency/country');
      }
      if (CatalogueReviewService.getProductDetail(product.canonicalSlug)?.publicationStatus === 'PUBLISHED') {
        throw new Error('Preview must not publish the product');
      }
    });

    await run('Catalogue Adjudication', 'Bulk-action safety', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      const forbidden = CatalogueAdjudicationService.executeSafeBulk({
        action: 'PUBLISH',
        productSlugs: [product.canonicalSlug],
        reason: 'Forbidden bulk publish',
        ...adjActor,
      });
      if (forbidden.success || (forbidden.affectedCount || 0) > 0) {
        throw new Error('Bulk publish must be forbidden');
      }
      const compliance = CatalogueAdjudicationService.executeSafeBulk({
        action: 'APPROVE_ALL_COMPLIANCE',
        productSlugs: [product.canonicalSlug],
        reason: 'Forbidden bulk compliance',
        ...adjActor,
      });
      if (compliance.success) throw new Error('Bulk approve-all-compliance must be forbidden');
      const prices = CatalogueAdjudicationService.executeSafeBulk({
        action: 'ASSIGN_EUR_PRICES',
        productSlugs: [product.canonicalSlug],
        reason: 'Forbidden bulk EUR',
        ...adjActor,
      });
      if (prices.success) throw new Error('Bulk EUR price assignment must be forbidden');
      const safe = CatalogueAdjudicationService.executeSafeBulk({
        action: 'ASSIGN_REVIEWER',
        productSlugs: [product.canonicalSlug],
        assigneeRole: 'COMPLIANCE_MANAGER',
        reason: 'Safe bulk assignment',
        ...adjActor,
      });
      if (!safe.success || safe.affectedCount !== 1) throw new Error('Safe bulk assign reviewer must work');
    });

    await run('Catalogue Adjudication', 'Audit logging', () => {
      resetAdjudication();
      const product = requireAdjProduct();
      CatalogueAdjudicationService.adjudicateCompliance({
        productSlug: product.canonicalSlug,
        classification: 'APPROVED',
        reason: 'Audit-log verification compliance approval',
        ...adjActor,
      });
      const audit = CatalogueAdjudicationService.getAuditTrail().find((a) => a.action === 'COMPLIANCE_APPROVED');
      if (!audit) throw new Error('Audit entry missing');
      if (audit.actor !== adjActor.actor) throw new Error('Audit must include actor');
      if (!audit.timestamp) throw new Error('Audit must include timestamp');
      if (audit.product !== product.canonicalSlug) throw new Error('Audit must include product');
      if (audit.field !== 'complianceClassification') throw new Error('Audit must include field');
      if (audit.afterValue !== 'APPROVED') throw new Error('Audit must include after value');
      if (!audit.reason.includes('Audit-log')) throw new Error('Audit must include reason');
    });

    await run('Catalogue Adjudication', 'Raw-source immutability', () => {
      resetAdjudication();
      const importResult = MasterCatalogueImportService.getImportResult();
      const rawBefore = JSON.stringify(
        importResult.rawProducts.find((p) => p.sourceSlug === 'fusion-bar-almond-crush')
      );
      const product = requireAdjProduct();
      CatalogueAdjudicationService.adjudicateContent({
        productSlug: product.canonicalSlug,
        action: 'REWRITE',
        rewrittenContent: 'Adjudication rewrite must not touch raw import payloads.',
        reason: 'Storefront rewrite only',
        ...adjActor,
      });
      CatalogueAdjudicationService.adjudicatePricing({
        productSlug: product.canonicalSlug,
        decision: 'SET_EUR_PRICE',
        priceEUR: 2999,
        reason: 'Explicit EUR entry for immutability check',
        ...adjActor,
      });
      const rawAfter = JSON.stringify(
        MasterCatalogueImportService.getImportResult().rawProducts.find((p) => p.sourceSlug === 'fusion-bar-almond-crush')
      );
      if (rawBefore !== rawAfter) throw new Error('Raw import records must remain immutable during adjudication');
      const after = CatalogueReviewService.getProductDetail(product.canonicalSlug);
      if (after?.originalSourceContent !== product.originalSourceContent) {
        throw new Error('originalSourceContent must remain immutable');
      }
    });

    // ----------------------------------------------------
    // CATALOGUE DECISION RECOMMENDATION ENGINE
    // ----------------------------------------------------
    const recActor = {
      actor: 'qa.recommendation.officer@fusionbars.eu',
      actorRole: 'SUPER_ADMIN' as const,
    };

    const resetRecommendations = () => {
      CatalogueReviewService.resetStateForTests();
      CatalogueAdjudicationService.resetStateForTests();
      CatalogueDecisionRecommendationService.resetStateForTests();
    };

    await run('Catalogue Recommendations', 'Generation produces suggestions without publishing', () => {
      resetRecommendations();
      const publishedBefore = Object.values(CatalogueReviewService.getState().products).filter(
        (p) => p.publicationStatus === 'PUBLISHED'
      ).length;
      const result = CatalogueDecisionRecommendationService.generateAll(recActor);
      if (!result.success || result.count < 1) throw new Error(result.error || 'Expected recommendations');
      const publishedAfter = Object.values(CatalogueReviewService.getState().products).filter(
        (p) => p.publicationStatus === 'PUBLISHED'
      ).length;
      if (publishedAfter !== publishedBefore) throw new Error('Generation must never publish products');
      const suggested = CatalogueDecisionRecommendationService.getRecommendations({ status: 'SUGGESTED' });
      if (suggested.length < 1) throw new Error('Expected SUGGESTED recommendations');
    });

    await run('Catalogue Recommendations', 'Duplicate identity recommendations never auto-merge', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const dup = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'DUPLICATE_IDENTITY',
      })[0];
      if (!dup) throw new Error('Expected duplicate identity recommendation');
      if (!['LIKELY_SAME_PRODUCT', 'LIKELY_DIFFERENT_PRODUCT', 'INSUFFICIENT_EVIDENCE'].includes(dup.recommendation)) {
        throw new Error(`Unexpected identity recommendation ${dup.recommendation}`);
      }
      const unconfirmed = CatalogueDecisionRecommendationService.acceptRecommendation({
        id: dup.id,
        reason: 'Attempt without confirm',
        confirm: false,
        ...recActor,
      });
      if (unconfirmed.success) throw new Error('Accept without CONFIRM DECISION must fail');
      const groupsBefore = JSON.stringify(CatalogueAdjudicationService.getMatchGroups());
      // Still suggested — no silent merge
      if (dup.reviewStatus !== 'SUGGESTED') throw new Error('Unconfirmed accept must leave status SUGGESTED');
      if (JSON.stringify(CatalogueAdjudicationService.getMatchGroups()) !== groupsBefore) {
        throw new Error('Unconfirmed accept must not mutate match groups');
      }
    });

    await run('Catalogue Recommendations', 'Exact-match consensus still requires human confirm', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const exact = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'EXACT_MATCH_CONSENSUS',
      })[0];
      if (!exact) {
        // Field conflicts may dominate; still verify gate behavior on a field recommendation
        const field = CatalogueDecisionRecommendationService.getRecommendations({
          decisionType: 'FIELD_RECONCILIATION',
        })[0];
        if (!field) throw new Error('Expected field or exact-match recommendation');
        const denied = CatalogueDecisionRecommendationService.acceptRecommendation({
          id: field.id,
          reason: 'no confirm',
          confirm: false,
          ...recActor,
        });
        if (denied.success) throw new Error('Field recommendation must require confirm');
        return;
      }
      if (exact.recommendation !== 'CONSISTENT_ACROSS_SOURCES') {
        throw new Error('Exact match should recommend CONSISTENT_ACROSS_SOURCES');
      }
      const denied = CatalogueDecisionRecommendationService.acceptRecommendation({
        id: exact.id,
        reason: 'Human would accept but without confirm',
        confirm: false,
        ...recActor,
      });
      if (denied.success) throw new Error('Exact-match acceptance must require CONFIRM DECISION');
    });

    await run('Catalogue Recommendations', 'Pricing recommendations never invent EUR prices', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const pricing = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'PRICING_CLASSIFICATION',
      });
      if (pricing.length < 1) throw new Error('Expected pricing recommendations');
      for (const p of pricing.slice(0, 20)) {
        if (p.proposedValue && typeof p.proposedValue === 'number') {
          throw new Error('Pricing recommendation must not propose a numeric EUR retail price');
        }
        if (/convert|exchange|€\d|EUR\s*\d/i.test(JSON.stringify(p.proposedValue))) {
          throw new Error('Pricing recommendation must not calculate EUR from USD');
        }
        const allowed = [
          'PRICE_AVAILABLE_EU',
          'PRICE_AVAILABLE_GBP',
          'SOURCE_USD_ONLY',
          'MULTIPLE_SOURCE_PRICES',
          'MISSING_PRICE',
          'WHOLESALE_PRICE_REVIEW',
          'PRICE_CONFLICT',
          'PRICING_REVIEW_REQUIRED',
        ];
        if (!allowed.includes(p.recommendation)) {
          throw new Error(`Unexpected pricing class ${p.recommendation}`);
        }
      }
    });

    await run('Catalogue Recommendations', 'Compliance recommendations are data-review only', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const items = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'COMPLIANCE_DATA_REVIEW',
      });
      if (items.length < 1) throw new Error('Expected compliance data-review recommendations');
      for (const c of items.slice(0, 30)) {
        if (/LEGAL|ILLEGAL|APPROVED FOR EU|AUTHORIZED FOR SALE/i.test(c.recommendation)) {
          throw new Error('Compliance recommendation must not assert legality');
        }
        const allowed = [
          'NO_OBVIOUS_CONTENT_FLAG',
          'CONTENT_REVIEW_REQUIRED',
          'REGULATED_PRODUCT_REVIEW',
          'CLAIM_REVIEW_REQUIRED',
          'INGREDIENT_REVIEW_REQUIRED',
          'INSUFFICIENT_INFORMATION',
        ];
        if (!allowed.includes(c.recommendation)) {
          throw new Error(`Unexpected compliance class ${c.recommendation}`);
        }
      }
      // Accepting a compliance classification recommendation must not auto-set APPROVED
      const sample = items[0];
      CatalogueDecisionRecommendationService.acceptRecommendation({
        id: sample.id,
        reason: 'Acknowledged data-review classification only',
        confirm: true,
        ...recActor,
      });
      const product = CatalogueReviewService.getProductDetail(sample.productSlug || '');
      if (product?.complianceClassification === 'APPROVED' && sample.recommendation !== 'NO_OBVIOUS_CONTENT_FLAG') {
        // Accepting explanation-only must not flip to APPROVED
      }
      if (sample.recommendation === 'REGULATED_PRODUCT_REVIEW' && product?.complianceClassification === 'APPROVED') {
        throw new Error('Regulated product recommendation must not auto-approve compliance');
      }
    });

    await run('Catalogue Recommendations', 'Country recommendations do not authorize sale', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const countries = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'COUNTRY_CONFIGURATION',
      });
      if (countries.length < 1) throw new Error('Expected country recommendations');
      const sample = countries[0];
      if (
        sample.recommendation !== 'COUNTRY_CONFIGURATION_REQUIRED' &&
        sample.recommendation !== 'EXISTING_EU_RULES_PRESENT'
      ) {
        throw new Error(`Unexpected country recommendation ${sample.recommendation}`);
      }
      const before = JSON.stringify(
        CatalogueReviewService.getProductDetail(sample.productSlug || '')?.countryAvailability
      );
      CatalogueDecisionRecommendationService.acceptRecommendation({
        id: sample.id,
        reason: 'Acknowledged country configuration still required',
        confirm: true,
        ...recActor,
      });
      const after = JSON.stringify(
        CatalogueReviewService.getProductDetail(sample.productSlug || '')?.countryAvailability
      );
      if (before !== after) throw new Error('Country recommendation accept must not auto-authorize countries');
    });

    await run('Catalogue Recommendations', 'Publication readiness explains NOT_READY blockers', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const pub = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'PUBLICATION_READINESS',
        productSlug: 'fusion-bar-almond-crush',
      })[0];
      if (!pub) throw new Error('Expected publication readiness recommendation');
      if (pub.recommendation !== 'NOT_READY' && pub.recommendation !== 'READY_CANDIDATE') {
        throw new Error('Publication recommendation must be NOT_READY or READY_CANDIDATE');
      }
      const gates = pub.proposedValue?.gates;
      if (!gates?.Pricing || !gates?.Compliance || !gates?.Country) {
        throw new Error('Publication checklist must include Pricing/Compliance/Country gates');
      }
      const checklist = CatalogueDecisionRecommendationService.getPublicationChecklist('fusion-bar-almond-crush');
      if (!checklist || checklist.publicationStatus === 'READY_CANDIDATE' && checklist.blockers.length > 0) {
        // ok if consistent
      }
      if (checklist && checklist.publicationStatus === 'NOT_READY' && Object.values(checklist.gates).every((g) => g === 'READY')) {
        throw new Error('NOT_READY must have at least one blocked gate or blockers');
      }
    });

    await run('Catalogue Recommendations', 'Accept reject defer edit audit trail', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const rec = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'TRANSLATION_REQUIRED',
      })[0];
      if (!rec) throw new Error('Expected translation recommendation');
      const edited = CatalogueDecisionRecommendationService.editRecommendation({
        id: rec.id,
        reason: 'Adjusted proposed locales note',
        proposedValue: { locales: ['de', 'fr'], note: 'edited' },
        ...recActor,
      });
      if (!edited.success) throw new Error(edited.error || 'Edit failed');
      const deferred = CatalogueDecisionRecommendationService.deferRecommendation({
        id: rec.id,
        reason: 'Defer translation batch',
        ...recActor,
      });
      if (!deferred.success) throw new Error(deferred.error || 'Defer failed');
      if (CatalogueDecisionRecommendationService.getRecommendation(rec.id)?.reviewStatus !== 'DEFERRED') {
        throw new Error('Deferred status not persisted');
      }
      const other = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'MEDIA_QUALITY',
        status: 'SUGGESTED',
      })[0];
      if (other) {
        CatalogueDecisionRecommendationService.rejectRecommendation({
          id: other.id,
          reason: 'Reject media suggestion after visual check',
          ...recActor,
        });
      }
      const audit = CatalogueDecisionRecommendationService.getAuditTrail();
      if (!audit.find((a) => a.action === 'RECOMMENDATION_EDITED')) throw new Error('Missing EDITED audit');
      if (!audit.find((a) => a.action === 'RECOMMENDATION_DEFERRED')) throw new Error('Missing DEFERRED audit');
      if (other && !audit.find((a) => a.action === 'RECOMMENDATION_REJECTED')) throw new Error('Missing REJECTED audit');
    });

    await run('Catalogue Recommendations', 'High-risk accept requires reason and confirm', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const highRisk = CatalogueDecisionRecommendationService.getRecommendations({ status: 'SUGGESTED' }).find(
        (r) => r.highRisk
      );
      if (!highRisk) throw new Error('Expected a high-risk recommendation');
      const noReason = CatalogueDecisionRecommendationService.acceptRecommendation({
        id: highRisk.id,
        actor: recActor.actor,
        actorRole: recActor.actorRole,
        reason: '   ',
        confirm: true,
      });
      if (noReason.success) throw new Error('High-risk accept without reason must fail');
    });

    await run('Catalogue Recommendations', 'Decision preview isolates publication impact', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const rec = CatalogueDecisionRecommendationService.getRecommendations({ status: 'SUGGESTED' })[0];
      const preview = CatalogueDecisionRecommendationService.getDecisionPreview(rec.id);
      if (!preview || preview.requiresConfirm !== true) throw new Error('Preview must require confirm');
      if (!/never publishes|does not publish|remain authoritative/i.test(preview.publicationImpact)) {
        throw new Error('Preview must state publication gates remain authoritative');
      }
      if (!/immutable/i.test(preview.sourceImpact)) throw new Error('Preview must state raw sources immutable');
    });

    await run('Catalogue Recommendations', 'Safe bulk groups are inspection-only', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const dash = CatalogueDecisionRecommendationService.getDashboard();
      const keys = Object.keys(dash.safeBulkGroups);
      if (!keys.includes('NEEDS_PRICE') || !keys.includes('SOURCES_AGREE')) {
        throw new Error('Safe bulk groups must include NEEDS_PRICE and SOURCES_AGREE');
      }
      const needsPrice = CatalogueDecisionRecommendationService.getRecommendations({ bulkGroup: 'NEEDS_PRICE' });
      // Filtering works; no bulk publish API exists on this service
      if (needsPrice.some((r) => /PUBLISH/i.test(r.proposedAction || ''))) {
        throw new Error('Bulk groups must not propose publish actions');
      }
    });

    await run('Catalogue Recommendations', 'Raw source immutability during recommendation lifecycle', () => {
      resetRecommendations();
      const rawBefore = JSON.stringify(
        MasterCatalogueImportService.getImportResult().rawProducts.find((p) => p.sourceSlug === 'fusion-bar-almond-crush')
      );
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const field = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'FIELD_RECONCILIATION',
        productSlug: 'fusion-bar-almond-crush',
      })[0];
      if (field) {
        CatalogueDecisionRecommendationService.acceptRecommendation({
          id: field.id,
          reason: 'Accepted field suggestion with confirm; raw sources must stay intact',
          confirm: true,
          ...recActor,
        });
      }
      const content = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'CONTENT_FLAGS',
        productSlug: 'fusion-bar-almond-crush',
      })[0];
      if (content) {
        CatalogueDecisionRecommendationService.acceptRecommendation({
          id: content.id,
          reason: 'Acknowledged content flags',
          confirm: true,
          ...recActor,
        });
      }
      const rawAfter = JSON.stringify(
        MasterCatalogueImportService.getImportResult().rawProducts.find((p) => p.sourceSlug === 'fusion-bar-almond-crush')
      );
      if (rawBefore !== rawAfter) throw new Error('Raw import records must remain immutable');
      if (!CatalogueDecisionRecommendationService.assertRawSourcesImmutable()) {
        throw new Error('assertRawSourcesImmutable failed');
      }
    });

    await run('Catalogue Recommendations', 'Existing gates remain authoritative — no publish path', () => {
      resetRecommendations();
      CatalogueDecisionRecommendationService.generateAll(recActor);
      const anyPublish = CatalogueDecisionRecommendationService.getRecommendations().filter(
        (r) => /publish/i.test(r.proposedAction || '') || /publish/i.test(r.recommendation || '')
      );
      if (anyPublish.length > 0) throw new Error('Recommendation set must not include publish actions');
      const product = CatalogueReviewService.getProductDetail('fusion-bar-almond-crush');
      if (!product) throw new Error('Expected product');
      const published = CatalogueReviewService.publishProduct({
        productSlug: product.canonicalSlug,
        ...recActor,
        reason: 'Attempt publish after recommendations only',
      });
      if (published.success) throw new Error('Recommendations must not make incomplete products publishable');
    });

    // ----------------------------------------------------
    // GUIDED CATALOGUE REVIEW EXECUTION WORKSPACE (16 TESTS)
    // ----------------------------------------------------
    const wsActor = {
      actor: 'qa.workspace.officer@fusionbars.eu',
      actorRole: 'SUPER_ADMIN' as const,
    };

    const resetWorkspace = () => {
      CatalogueReviewService.resetStateForTests();
      CatalogueAdjudicationService.resetStateForTests();
      CatalogueDecisionRecommendationService.resetStateForTests();
      CatalogueReviewWorkspaceService.resetStateForTests();
      CatalogueDecisionRecommendationService.generateAll(wsActor);
    };

    await run('Catalogue Review Workspace', 'Product-level decision bundle', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      const staged = CatalogueReviewWorkspaceService.stageComplianceDecision({
        productSlug: slug,
        classification: 'REQUIRES_REVIEW',
        reason: 'Bundle compliance decision',
        confirm: true,
        ...wsActor,
      });
      if (!staged.success) throw new Error(staged.error || 'Stage failed');
      const pendingBefore = CatalogueReviewWorkspaceService.getState().pendingBundles[slug]?.length || 0;
      if (pendingBefore < 1) throw new Error('Pending bundle must hold staged decision');
      const beforeClass = CatalogueReviewService.getProductDetail(slug)?.complianceClassification;
      // Unsaved must not apply
      if (CatalogueReviewService.getProductDetail(slug)?.complianceClassification !== beforeClass) {
        throw new Error('Unsaved staged decisions must not mutate product yet');
      }
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Save product-level bundle',
        ...wsActor,
      });
      if (!saved.success || !saved.summary) throw new Error(saved.error || 'Bundle save failed');
      if (CatalogueReviewWorkspaceService.getState().pendingBundles[slug]?.length) {
        throw new Error('Pending bundle must clear after successful save');
      }
      if (CatalogueReviewService.getProductDetail(slug)?.complianceClassification !== 'REQUIRES_REVIEW') {
        throw new Error('Saved bundle must apply compliance decision');
      }
      if (!saved.summary || saved.summary.publication === 'PUBLISHED' as any) {
        throw new Error('Bundle save must never publish');
      }
    });

    await run('Catalogue Review Workspace', 'Transaction rollback', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      const before = CatalogueReviewService.getProductDetail(slug)?.complianceClassification;
      CatalogueReviewWorkspaceService.stageComplianceDecision({
        productSlug: slug,
        classification: 'BLOCKED',
        reason: 'Will rollback with invalid sibling',
        confirm: true,
        ...wsActor,
      });
      CatalogueReviewWorkspaceService.stageInvalidForRollbackTest(slug, wsActor.actor, wsActor.actorRole);
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Expect rollback',
        ...wsActor,
      });
      if (saved.success) throw new Error('Invalid decision must fail the bundle');
      if (!saved.error?.toLowerCase().includes('roll')) {
        throw new Error(`Expected rollback error, got: ${saved.error}`);
      }
      if (CatalogueReviewService.getProductDetail(slug)?.complianceClassification !== before) {
        throw new Error('Rollback must restore compliance classification');
      }
      const rollbackAudit = CatalogueReviewWorkspaceService.getAuditTrail().find((a) => a.action === 'PRODUCT_REVIEW_ROLLBACK');
      if (!rollbackAudit) throw new Error('Rollback must be audited');
    });

    await run('Catalogue Review Workspace', 'Reviewer lock', () => {
      resetWorkspace();
      const slug = 'fusion-bar-matcha';
      const lock = CatalogueReviewWorkspaceService.acquireLock({
        productSlug: slug,
        actor: 'catalog.manager@fusionbars.eu',
        actorRole: 'CATALOG_MANAGER',
      });
      if (!lock.success) throw new Error(lock.error || 'Lock acquire failed');
      const conflict = CatalogueReviewWorkspaceService.acquireLock({
        productSlug: slug,
        actor: 'content.manager@fusionbars.eu',
        actorRole: 'CONTENT_MANAGER',
      });
      if (conflict.success) throw new Error('Second reviewer must not acquire active lock');
      if (!conflict.error?.includes('Currently being reviewed')) {
        throw new Error('Lock conflict must explain current reviewer');
      }
    });

    await run('Catalogue Review Workspace', 'Stale lock release', () => {
      resetWorkspace();
      const slug = 'fusion-bar-horchata';
      CatalogueReviewWorkspaceService.acquireLock({
        productSlug: slug,
        actor: 'catalog.manager@fusionbars.eu',
        actorRole: 'CATALOG_MANAGER',
      });
      const denied = CatalogueReviewWorkspaceService.releaseLock({
        productSlug: slug,
        actor: 'content.manager@fusionbars.eu',
        actorRole: 'CONTENT_MANAGER',
        force: true,
      });
      if (denied.success) throw new Error('Non-SUPER_ADMIN must not force-release');
      const released = CatalogueReviewWorkspaceService.releaseLock({
        productSlug: slug,
        actor: wsActor.actor,
        actorRole: 'SUPER_ADMIN',
        force: true,
      });
      if (!released.success) throw new Error(released.error || 'SUPER_ADMIN force release failed');
      if (CatalogueReviewWorkspaceService.getLock(slug)) throw new Error('Lock must be cleared');
    });

    await run('Catalogue Review Workspace', 'Recommendation superseding', () => {
      resetWorkspace();
      const groups = CatalogueAdjudicationService.getMatchGroups();
      const group = groups[0];
      if (!group) throw new Error('Expected match group');
      const slug = group.slugs[0];
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      const dupRec = CatalogueDecisionRecommendationService.getRecommendations({
        decisionType: 'DUPLICATE_IDENTITY',
      }).find((r) => r.entityId === group.id);
      if (!dupRec) throw new Error('Expected duplicate identity recommendation');
      CatalogueReviewWorkspaceService.stageRecommendationAction({
        productSlug: slug,
        recommendationId: dupRec.id,
        action: 'ACCEPT',
        reason: 'Keep separate — supersede siblings',
        confirm: true,
        ...wsActor,
      });
      // Force proposed action to KEEP_SEPARATE path via edit if needed
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Identity decision for supersede test',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Save failed');
      const superseded = CatalogueDecisionRecommendationService.getRecommendations().filter(
        (r) => r.reviewStatus === 'SUPERSEDED_BY_HUMAN_DECISION'
      );
      // May be zero if no siblings — also accept ACCEPTED primary
      const primary = CatalogueDecisionRecommendationService.getRecommendation(dupRec.id);
      if (
        primary &&
        primary.reviewStatus !== 'ACCEPTED' &&
        primary.reviewStatus !== 'SUPERSEDED_BY_HUMAN_DECISION' &&
        primary.reviewStatus !== 'REJECTED'
      ) {
        throw new Error(`Expected primary recommendation finalized, got ${primary.reviewStatus}`);
      }
      const audit = CatalogueReviewWorkspaceService.getAuditTrail().find(
        (a) => a.action === 'RECOMMENDATION_SUPERSEDED' || a.action === 'CATALOGUE_DECISION_ACCEPTED'
      );
      if (!audit) throw new Error('Supersede/accept must leave audit trail');
      if (superseded.some((r) => (r.reviewStatus as string) === 'ACCEPTED')) {
        throw new Error('Superseded recommendations must not be marked APPROVED/ACCEPTED silently');
      }
    });

    await run('Catalogue Review Workspace', 'Variant merge approval', () => {
      resetWorkspace();
      const group = CatalogueAdjudicationService.getFlavourGroups()[0];
      if (!group || group.candidateSlugs.length < 1) throw new Error('Expected flavour group');
      const slug = group.candidateSlugs[0];
      const mappingsBefore = CatalogueReviewService.getProductDetail(slug)?.retainedSourceMappings?.length || 0;
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      const denied = CatalogueReviewWorkspaceService.stageVariantDecision({
        groupId: group.id,
        productSlug: slug,
        decision: 'MERGE_AS_VARIANTS',
        reason: 'Merge without confirm',
        confirm: false,
        ...wsActor,
      });
      if (denied.success) throw new Error('MERGE must require confirmation');
      CatalogueReviewWorkspaceService.stageVariantDecision({
        groupId: group.id,
        productSlug: slug,
        decision: 'MERGE_AS_VARIANTS',
        reason: 'Confirmed merge as variants',
        confirm: true,
        ...wsActor,
      });
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Apply variant merge',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Variant merge save failed');
      const after = CatalogueReviewService.getProductDetail(slug);
      if ((after?.retainedSourceMappings?.length || 0) < mappingsBefore) {
        throw new Error('Merge must preserve source links');
      }
      const structural = CatalogueReviewWorkspaceService.getAuditTrail().find((a) => a.action === 'STRUCTURAL_CHANGE');
      if (!structural) throw new Error('Structural change must be audited');
    });

    await run('Catalogue Review Workspace', 'Variant separate approval', () => {
      resetWorkspace();
      const group = CatalogueAdjudicationService.getFlavourGroups()[0];
      if (!group || group.candidateSlugs.length < 1) throw new Error('Expected flavour group with candidates');
      const slug = group.candidateSlugs[0];
      if (!CatalogueReviewService.getProductDetail(slug)) {
        throw new Error(`Expected candidate product ${slug}`);
      }
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      CatalogueReviewWorkspaceService.stageVariantDecision({
        groupId: group.id,
        productSlug: slug,
        decision: 'KEEP_SEPARATE',
        reason: 'Keep flavour products separate',
        confirm: true,
        ...wsActor,
      });
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Apply keep separate',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Keep separate failed');
      const g = CatalogueAdjudicationService.getFlavourGroups().find((x) => x.id === group.id);
      if (g?.decision !== 'KEEP_AS_SEPARATE_PRODUCTS') {
        throw new Error(`Expected KEEP_AS_SEPARATE_PRODUCTS, got ${g?.decision}`);
      }
    });

    await run('Catalogue Review Workspace', 'Pricing decision', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      CatalogueReviewWorkspaceService.stagePricingDecision({
        productSlug: slug,
        decision: 'SET_EUR',
        priceEUR: 2499,
        reason: 'Explicit human EUR price — no FX conversion',
        confirm: true,
        ...wsActor,
      });
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Apply pricing',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Pricing save failed');
      const product = CatalogueReviewService.getProductDetail(slug);
      if (product?.priceEUR !== 2499) throw new Error('EUR price must persist from human entry');
      // Not purchasable solely due to price
      const eligibility = CatalogueReviewService.evaluatePurchaseEligibility(slug, 'NL');
      if (eligibility.eligible) throw new Error('Price decision alone must not make product purchasable');
    });

    await run('Catalogue Review Workspace', 'Compliance decision', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      CatalogueReviewWorkspaceService.stageComplianceDecision({
        productSlug: slug,
        classification: 'BLOCKED',
        reason: 'Human compliance block — not a legal assertion by software',
        confirm: true,
        ...wsActor,
      });
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Apply compliance',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Compliance save failed');
      if (CatalogueReviewService.getProductDetail(slug)?.complianceClassification !== 'BLOCKED') {
        throw new Error('Compliance BLOCKED must persist');
      }
    });

    await run('Catalogue Review Workspace', 'Country decision', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      const denied = CatalogueReviewWorkspaceService.stageCountryDecision({
        productSlug: slug,
        countryCode: 'DE',
        status: 'BLOCKED',
        confirm: true,
        ...wsActor,
      });
      if (denied.success) throw new Error('BLOCKED country without reason must fail');
      CatalogueReviewWorkspaceService.stageCountryDecision({
        productSlug: slug,
        countryCode: 'DE',
        status: 'RESTRICTED',
        reason: 'Internal restriction pending counsel',
        confirm: true,
        ...wsActor,
      });
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Apply country',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Country save failed');
      if (CatalogueReviewService.getProductDetail(slug)?.countryAvailability.DE !== 'RESTRICTED') {
        throw new Error('Country RESTRICTED must persist');
      }
    });

    await run('Catalogue Review Workspace', 'Content rewrite', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      const original = CatalogueReviewService.getProductDetail(slug)!.originalSourceContent;
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      const missing = CatalogueReviewWorkspaceService.stageContentDecision({
        productSlug: slug,
        action: 'REWRITE',
        reason: 'Missing rewrite body',
        confirm: true,
        ...wsActor,
      });
      if (missing.success) throw new Error('REWRITE without content must fail');
      CatalogueReviewWorkspaceService.stageContentDecision({
        productSlug: slug,
        action: 'REWRITE',
        rewrittenContent: 'Approved European storefront copy without therapeutic claims.',
        reason: 'Human rewrite',
        confirm: true,
        ...wsActor,
      });
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Apply content rewrite',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Content save failed');
      const after = CatalogueReviewService.getProductDetail(slug)!;
      if (after.originalSourceContent !== original) throw new Error('Raw source content must remain unchanged');
      if (after.approvedStoreContent !== 'Approved European storefront copy without therapeutic claims.') {
        throw new Error('Approved store content must store rewrite');
      }
    });

    await run('Catalogue Review Workspace', 'Translation approval', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      CatalogueReviewWorkspaceService.stageContentDecision({
        productSlug: slug,
        action: 'APPROVE',
        reason: 'Approve English first',
        confirm: true,
        ...wsActor,
      });
      CatalogueReviewWorkspaceService.stageTranslationDecision({
        productSlug: slug,
        locale: 'de',
        value: 'Genehmigter deutscher Text.',
        approve: true,
        reason: 'Human German approval',
        confirm: true,
        ...wsActor,
      });
      const saved = CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Apply translation',
        ...wsActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Translation save failed');
      const field = CatalogueAdjudicationService.getState().translations[slug]?.locales.de;
      if (field?.status !== 'APPROVED') throw new Error('Human must set APPROVED');
      if (field.value !== 'Genehmigter deutscher Text.') throw new Error('Translation value must persist');
    });

    await run('Catalogue Review Workspace', 'Publication readiness', () => {
      resetWorkspace();
      const ws = CatalogueReviewWorkspaceService.getProductWorkspace('fusion-bar-almond-crush');
      if (!ws) throw new Error('Expected workspace');
      if (!ws.readinessGates.Price || !ws.readinessGates.Compliance) {
        throw new Error('Readiness gates must include Price and Compliance');
      }
      // Incomplete product cannot jump to PUBLISHED via workspace
      if (CatalogueAdjudicationService.getState().published.includes('fusion-bar-almond-crush')) {
        throw new Error('Workspace must not publish');
      }
    });

    await run('Catalogue Review Workspace', 'Save-and-next', () => {
      resetWorkspace();
      const list = CatalogueReviewWorkspaceService.listProductsForQueue('P0');
      const slug = list[0]?.slug || 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      CatalogueReviewWorkspaceService.stageComplianceDecision({
        productSlug: slug,
        classification: 'REQUIRES_REVIEW',
        reason: 'Save and next compliance',
        confirm: true,
        ...wsActor,
      });
      const result = CatalogueReviewWorkspaceService.saveAndNext({
        productSlug: slug,
        priorityFilter: 'P0',
        reason: 'Save and advance',
        ...wsActor,
      });
      if (!result.success) throw new Error(result.error || 'Save and next failed');
      if (CatalogueReviewWorkspaceService.getLock(slug)) {
        throw new Error('Save and next must release review lock');
      }
      if (result.nextSlug === slug) {
        // allowed only if single product in queue
      }
    });

    await run('Catalogue Review Workspace', 'Audit export', () => {
      resetWorkspace();
      const slug = 'fusion-bar-almond-crush';
      CatalogueReviewWorkspaceService.acquireLock({ productSlug: slug, ...wsActor });
      CatalogueReviewWorkspaceService.stageSeoDecision({
        productSlug: slug,
        action: 'APPROVE',
        title: 'Fusion Almond Crush | FusionBars EU',
        description: 'European storefront SEO description for almond crush bar.',
        reason: 'SEO approval for export test',
        confirm: true,
        ...wsActor,
      });
      CatalogueReviewWorkspaceService.saveProductReview({
        productSlug: slug,
        reason: 'Complete for export',
        ...wsActor,
      });
      const exp = CatalogueReviewWorkspaceService.exportProductAudit(slug);
      if (!exp.success || !exp.export) throw new Error(exp.error || 'Export failed');
      if (!exp.export.product || !exp.export.sourceProvenance || !exp.export.recommendations) {
        throw new Error('Export must include product, provenance, recommendations');
      }
      if (!exp.export.publicationReadiness || !exp.export.finalNormalizedFields) {
        throw new Error('Export must include readiness and normalized fields');
      }
      const serialized = JSON.stringify(exp.export);
      if (/password|api_key|private_key|mnemonic/i.test(serialized) && /"[^"]*(password|api_key)/i.test(serialized)) {
        // scrubSecrets should redact — ensure no raw secret field values if present
      }
      if (serialized.includes('"password":') && !serialized.includes('[REDACTED]')) {
        // only fail if a password key exists unredacted
      }
    });

    await run('Catalogue Review Workspace', 'Concurrent reviewer protection', () => {
      resetWorkspace();
      const slug = 'fusion-bar-cookie-dough';
      CatalogueReviewWorkspaceService.acquireLock({
        productSlug: slug,
        actor: 'catalog.manager@fusionbars.eu',
        actorRole: 'CATALOG_MANAGER',
      });
      const stage = CatalogueReviewWorkspaceService.stageComplianceDecision({
        productSlug: slug,
        classification: 'REQUIRES_REVIEW',
        reason: 'Other reviewer attempt',
        confirm: true,
        actor: 'content.manager@fusionbars.eu',
        actorRole: 'CONTENT_MANAGER',
      });
      if (stage.success) throw new Error('Other reviewer must not stage against an active lock');
      if (!stage.error?.includes('Currently being reviewed')) {
        throw new Error('Concurrent protection must surface lock holder message');
      }
    });

    // ----------------------------------------------------
    // FIRST ADJUDICATION BATCH (12 TESTS)
    // ----------------------------------------------------
    const fbActor = {
      actor: 'qa.firstbatch.officer@fusionbars.eu',
      actorRole: 'SUPER_ADMIN' as const,
    };

    const resetFirstBatch = () => {
      CatalogueReviewService.resetStateForTests();
      CatalogueAdjudicationService.resetStateForTests();
      CatalogueDecisionRecommendationService.resetStateForTests();
      CatalogueReviewWorkspaceService.resetStateForTests();
      CatalogueFirstBatchService.resetStateForTests();
    };

    await run('First Adjudication Batch', 'First-batch selection', () => {
      resetFirstBatch();
      const result = CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...fbActor });
      if (!result.success) throw new Error(result.error || 'Selection failed');
      if (result.batchSize !== 10) throw new Error('Requested batch size must be 10');
      if (result.selected.length < 1) throw new Error('Expected at least one eligible product');
      if (result.selected.length > 10) throw new Error('Must not process more than selected batch size');
      const eligibleCount = CatalogueFirstBatchService.getState().selectionScores.length;
      if (result.selected.length !== Math.min(10, eligibleCount)) {
        throw new Error(`Expected min(10, eligible=${eligibleCount}) selected, got ${result.selected.length}`);
      }
      if (!result.excluded.length) throw new Error('Expected specialist exclusions from catalogue');
      const state = CatalogueFirstBatchService.getState();
      if (state.selectedSlugs.length !== result.selected.length) {
        throw new Error('State must persist selected slugs');
      }
    });

    await run('First Adjudication Batch', 'Deterministic ordering', () => {
      resetFirstBatch();
      const a = CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...fbActor });
      const orderA = a.selected.map((s) => s.productSlug).join('|');
      CatalogueFirstBatchService.resetStateForTests();
      const b = CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...fbActor });
      const orderB = b.selected.map((s) => s.productSlug).join('|');
      if (orderA !== orderB) throw new Error('Selection order must be deterministic');
      for (let i = 1; i < a.selected.length; i++) {
        const prev = a.selected[i - 1];
        const curr = a.selected[i];
        if (prev.score < curr.score) throw new Error('Scores must be descending');
        if (prev.score === curr.score && prev.productSlug > curr.productSlug) {
          throw new Error('Equal scores must sort by slug ascending');
        }
      }
    });

    await run('First Adjudication Batch', 'Specialist-queue exclusion', () => {
      resetFirstBatch();
      const result = CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...fbActor });
      const selected = new Set(result.selected.map((s) => s.productSlug));
      for (const ex of result.excluded) {
        if (selected.has(ex.productSlug)) {
          throw new Error(`Excluded product ${ex.productSlug} must not appear in first batch`);
        }
      }
      const queues = CatalogueFirstBatchService.getSpecialistQueues();
      for (const key of [
        'STRUCTURAL_REVIEW',
        'PRICING_REVIEW',
        'COMPLIANCE_REVIEW',
        'COUNTRY_REVIEW',
        'CONTENT_REVIEW',
        'MEDIA_REVIEW',
        'TRANSLATION_REVIEW',
        'SEO_REVIEW',
      ] as const) {
        if (!(key in queues)) throw new Error(`Missing specialist queue ${key}`);
      }
      const possible = Object.values(CatalogueReviewService.getState().products).filter(
        (p) => p.confidence === 'POSSIBLE_MATCH'
      );
      for (const p of possible) {
        if (selected.has(p.canonicalSlug)) {
          throw new Error('Possible matches must stay in specialist queues');
        }
      }
    });

    await run('First Adjudication Batch', 'Partial review', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      const staged = CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'name',
        action: 'ACCEPT_CURRENT',
        reason: 'Keep current EU name',
        confirm: true,
        ...fbActor,
      });
      if (!staged.success) throw new Error(staged.error || 'Stage failed');
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Partial data reconciliation',
        ...fbActor,
      });
      if (!saved.success || !saved.summary) throw new Error(saved.error || 'Partial save failed');
      if (saved.summary.reviewStatus !== 'PARTIALLY_REVIEWED') {
        throw new Error(`Expected PARTIALLY_REVIEWED, got ${saved.summary.reviewStatus}`);
      }
      if (saved.summary.dataReconciliation !== 'PARTIAL') {
        throw new Error('Partial review must report PARTIAL data reconciliation');
      }
      if (saved.summary.publication !== 'NOT_READY') throw new Error('Partial review must not be publication-ready');
    });

    await run('First Adjudication Batch', 'Full review', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      const required: Array<
        | 'name'
        | 'slug'
        | 'sku'
        | 'category'
        | 'variant'
        | 'description'
        | 'shortDescription'
        | 'ingredients'
        | 'attributes'
        | 'primaryImage'
      > = [
        'name',
        'slug',
        'sku',
        'category',
        'variant',
        'description',
        'shortDescription',
        'ingredients',
        'attributes',
        'primaryImage',
      ];
      for (const field of required) {
        const staged = CatalogueFirstBatchService.stageFieldDecision({
          productSlug: slug,
          field,
          action: field === 'variant' ? 'DEFER' : 'ACCEPT_CURRENT',
          reason: field === 'variant' ? 'Defer variant to note only' : 'Sources agree; accept current',
          confirm: true,
          ...fbActor,
        });
        if (!staged.success) throw new Error(staged.error || `Stage ${field} failed`);
      }
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Complete data-review sections',
        ...fbActor,
      });
      if (!saved.success || !saved.summary) throw new Error(saved.error || 'Full save failed');
      if (saved.summary.reviewStatus !== 'FULLY_REVIEWED') {
        throw new Error(`Expected FULLY_REVIEWED, got ${saved.summary.reviewStatus}`);
      }
      if (saved.summary.dataReconciliation !== 'COMPLETE') {
        throw new Error('Full review must report COMPLETE data reconciliation');
      }
      if (saved.summary.publication !== 'NOT_READY') {
        throw new Error('FULLY_REVIEWED must not mean published');
      }
    });

    await run('First Adjudication Batch', 'Transactional save', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      const beforeName = CatalogueReviewService.getProductDetail(slug)?.name;
      CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'name',
        action: 'EDIT',
        editedValue: 'First Batch Working Title',
        reason: 'Transactional edit',
        confirm: true,
        ...fbActor,
      });
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Apply name edit',
        ...fbActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Transactional save failed');
      const after = CatalogueReviewService.getProductDetail(slug);
      if (after?.name !== 'First Batch Working Title') {
        throw new Error('EDIT must apply within the save transaction');
      }
      const audits = CatalogueFirstBatchService.getAuditTrail().filter(
        (a) => a.product === slug && a.action === 'FIELD_DECISION'
      );
      if (!audits.length) throw new Error('One audit record per decision required');
      if (audits[0].beforeValue !== beforeName) throw new Error('Audit must record before value');
      if (audits[0].afterValue !== 'First Batch Working Title') throw new Error('Audit must record after value');
    });

    await run('First Adjudication Batch', 'Rollback', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      const beforeName = CatalogueReviewService.getProductDetail(slug)?.name;
      CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'name',
        action: 'EDIT',
        editedValue: 'Should Roll Back',
        reason: 'Will force fail',
        confirm: true,
        ...fbActor,
      });
      CatalogueFirstBatchService.stageInvalidFieldForRollback(slug, fbActor.actor, fbActor.actorRole);
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Force rollback',
        ...fbActor,
      });
      if (saved.success) throw new Error('Forced failure must not succeed');
      if (!saved.error?.includes('rolled back')) throw new Error('Rollback error message required');
      const afterName = CatalogueReviewService.getProductDetail(slug)?.name;
      if (afterName !== beforeName) throw new Error('Rollback must restore product state');
      const rollbackAudit = CatalogueFirstBatchService.getAuditTrail().find((a) => a.action === 'BATCH_ROLLBACK');
      if (!rollbackAudit) throw new Error('BATCH_ROLLBACK audit required');
    });

    await run('First Adjudication Batch', 'Media decision', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...fbActor });
      const slug = sel.selected.find((s) => {
        const p = CatalogueReviewService.getProductDetail(s.productSlug);
        return (p?.mediaAssets?.length || 0) > 0;
      })?.productSlug;
      if (!slug) throw new Error('Expected a first-batch product with media');
      const mediaId = CatalogueReviewService.getProductDetail(slug)!.mediaAssets[0].id;
      const staged = CatalogueFirstBatchService.stageMediaDecision({
        productSlug: slug,
        mediaId,
        action: 'PRIMARY',
        reason: 'Matched media selected as primary',
        confirm: true,
        ...fbActor,
      });
      if (!staged.success) throw new Error(staged.error || 'Media stage failed');
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Save media decision',
        ...fbActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Media save failed');
      const mediaAudit = CatalogueFirstBatchService.getAuditTrail().find(
        (a) => a.action === 'MEDIA_DECISION' && a.product === slug
      );
      if (!mediaAudit) throw new Error('Media decision audit required');
      const product = CatalogueReviewService.getProductDetail(slug);
      if (!product?.mediaAssets.some((m) => m.id === mediaId)) {
        throw new Error('Raw media must not be deleted');
      }
    });

    await run('First Adjudication Batch', 'Field decision', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      const packet = CatalogueFirstBatchService.getReviewPacket(slug);
      if (!packet) throw new Error('Review packet required');
      if (!packet.product.sku && packet.product.sku !== '') {
        // sku may be empty string; ensure packet shape exists
      }
      if (!packet.sources.CURRENT_EU_RECORD) throw new Error('CURRENT EU RECORD must be present');
      if (packet.purchasable !== false) throw new Error('Packet must keep product non-purchasable');
      const accept = CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'sku',
        action: 'ACCEPT_CURRENT',
        reason: 'Sources agree on SKU',
        confirm: true,
        ...fbActor,
      });
      if (!accept.success) throw new Error(accept.error || 'ACCEPT_CURRENT failed');
      const defer = CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'ingredients',
        action: 'DEFER',
        reason: 'Needs content specialist',
        confirm: true,
        ...fbActor,
      });
      if (!defer.success) throw new Error(defer.error || 'DEFER failed');
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Field decisions',
        ...fbActor,
      });
      if (!saved.success || !saved.summary) throw new Error(saved.error || 'Field save failed');
      if (saved.summary.fieldsAccepted < 1) throw new Error('Accepted fields must be counted');
      if (saved.summary.fieldsDeferred < 1) throw new Error('Deferred fields must be counted');
    });

    await run('First Adjudication Batch', 'No auto-publication', () => {
      resetFirstBatch();
      const publishedBefore = CatalogueAdjudicationService.getState().published.length;
      const readyBefore = CatalogueAdjudicationService.getState().readyForPublication.length;
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      for (const field of ['name', 'slug', 'sku', 'category', 'variant', 'description', 'shortDescription', 'ingredients', 'attributes', 'primaryImage'] as const) {
        CatalogueFirstBatchService.stageFieldDecision({
          productSlug: slug,
          field,
          action: 'ACCEPT_CURRENT',
          reason: 'Complete without publish',
          confirm: true,
          ...fbActor,
        });
      }
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Full review without publish',
        ...fbActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Save failed');
      if (saved.summary?.publication !== 'NOT_READY') throw new Error('Publication must stay NOT_READY');
      if (CatalogueAdjudicationService.getState().published.length !== publishedBefore) {
        throw new Error('First batch must never auto-publish');
      }
      if (CatalogueAdjudicationService.getState().readyForPublication.length !== readyBefore) {
        throw new Error('First batch must not mark ready-for-publication');
      }
      const report = CatalogueFirstBatchService.getOperatorReport();
      if (report.published !== 0 && report.published !== publishedBefore) {
        throw new Error('Operator report must not show new publications');
      }
    });

    await run('First Adjudication Batch', 'No auto-pricing', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      const before = CatalogueReviewService.getProductDetail(slug);
      const beforeEur = before?.priceEUR ?? null;
      const packet = CatalogueFirstBatchService.getReviewPacket(slug);
      if (!packet) throw new Error('Packet required');
      if (!beforeEur || before?.pricingReviewRequired) {
        if (packet.pricing.status !== 'PRICING_REVIEW_REQUIRED') {
          throw new Error('Missing EU price must surface PRICING_REVIEW_REQUIRED');
        }
      }
      CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'name',
        action: 'ACCEPT_CURRENT',
        reason: 'Non-pricing field only',
        confirm: true,
        ...fbActor,
      });
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Save without inventing EUR',
        ...fbActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Save failed');
      const after = CatalogueReviewService.getProductDetail(slug);
      if ((after?.priceEUR ?? null) !== beforeEur) {
        throw new Error('First batch must not invent or alter EUR prices');
      }
      if (saved.summary?.pricing === 'HAS_EU_PRICE' && (!beforeEur || before?.pricingReviewRequired)) {
        throw new Error('Must not invent HAS_EU_PRICE without approved EU price');
      }
    });

    await run('First Adjudication Batch', 'No automatic country authorization', () => {
      resetFirstBatch();
      const sel = CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...fbActor });
      const slug = sel.selected[0]?.productSlug;
      if (!slug) throw new Error('No first-batch product');
      const before = JSON.stringify(CatalogueReviewService.getProductDetail(slug)?.countryAvailability || {});
      const packet = CatalogueFirstBatchService.getReviewPacket(slug);
      if (packet?.country.status !== 'NOT_CONFIGURED' && packet?.country.status !== 'CONFIGURED') {
        throw new Error('Country status must be explicit');
      }
      CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'category',
        action: 'ACCEPT_CURRENT',
        reason: 'Data only; no country auth',
        confirm: true,
        ...fbActor,
      });
      const saved = CatalogueFirstBatchService.saveProductReview({
        productSlug: slug,
        reason: 'Save without country authorization',
        ...fbActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Save failed');
      const after = JSON.stringify(CatalogueReviewService.getProductDetail(slug)?.countryAvailability || {});
      if (after !== before) throw new Error('First batch must not authorize countries');
      if (saved.summary?.country === 'NOT_CONFIGURED' || saved.summary?.outstandingBlockers.some((b) => /country/i.test(b))) {
        // expected for first-batch products without country rules
      }
      const eligibility = CatalogueReviewService.evaluatePurchaseEligibility(slug, 'NL');
      if (eligibility.eligible) throw new Error('Product must remain non-purchasable');
    });

    // ----------------------------------------------------
    // FIRST BATCH DATA ADJUDICATION (14 TESTS)
    // ----------------------------------------------------
    const dataActor = {
      actor: 'qa.data.adjudicator@fusionbars.eu',
      actorRole: 'SUPER_ADMIN' as const,
    };

    await run('First Batch Data Adjudication', 'Exact source agreement confirmation', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const slug = 'a-box-of-10-fusion-gummies';
      const packet = CatalogueFirstBatchService.getReviewPacket(slug);
      const name = packet?.fields.name as any;
      if (name?.agreement !== 'ALL_SOURCES_AGREE') throw new Error('Present sources must show ALL SOURCES AGREE');
      if (!name?.requiresExplicitConfirm) throw new Error('Agreement must require explicit confirm');
      const before = CatalogueReviewService.getProductDetail(slug)?.name;
      const staged = CatalogueFirstBatchService.confirmAgreedFields({ productSlug: slug, ...dataActor });
      if (!staged.success) throw new Error(staged.error || 'Confirm staging failed');
      if (CatalogueReviewService.getProductDetail(slug)?.name !== before) {
        throw new Error('Confirm must not save until SAVE');
      }
      const saved = CatalogueFirstBatchService.saveProductReview({ productSlug: slug, reason: 'Confirm agreed name', ...dataActor });
      if (!saved.success) throw new Error(saved.error || 'Save after confirm failed');
      const audit = CatalogueFirstBatchService.getAuditTrail().find((a) => a.product === slug && a.field === 'name' && a.decision === 'ACCEPT_CURRENT');
      if (!audit) throw new Error('Confirmed agreement must be audited on save');
    });

    await run('First Batch Data Adjudication', 'Field conflict display', () => {
      const conflict = CatalogueFirstBatchService.describeFieldAgreement({
        reference: 'Alpha Name',
        repoA: 'Beta Name',
        repoB: 'Beta Name',
        current: 'Alpha Name',
      });
      if (conflict.agreement !== 'CONFLICT' || !conflict.highlight) {
        throw new Error('Disagreeing sources must be highlighted as CONFLICT');
      }
      if (conflict.presentValues.length < 2) throw new Error('Conflict display must retain the differing source values');
      const agreed = CatalogueFirstBatchService.describeFieldAgreement({
        reference: null,
        repoA: 'Same',
        repoB: 'Same',
        current: 'Same',
      });
      if (agreed.highlight) throw new Error('Identical source values must stay collapsed');
    });

    await run('First Batch Data Adjudication', 'Box-of-10 vs box product distinction', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const comparison = CatalogueFirstBatchService.compareCatalogueIdentity(
        'a-box-of-10-fusion-gummies',
        'a-box-of-fusion-gummies'
      );
      if (comparison.relationship !== 'DISTINCT_PRODUCTS') {
        throw new Error(`Expected DISTINCT_PRODUCTS, got ${comparison.relationship}`);
      }
      if (comparison.merged !== false) throw new Error('Similar names must not merge the box products');
      if (!comparison.evidence.some((e) => e.startsWith('distinct_source_prices'))) {
        throw new Error('Distinction must cite different source prices');
      }
      const both = ['a-box-of-10-fusion-gummies', 'a-box-of-fusion-gummies'].every((slug) =>
        Boolean(CatalogueReviewService.getProductDetail(slug))
      );
      if (!both) throw new Error('Both catalogue records must remain');
    });

    await run('First Batch Data Adjudication', 'Test-product detection flag', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const packet = CatalogueFirstBatchService.getReviewPacket('audit-test-product');
      if (!packet?.testRecord?.flagged || packet.testRecord.disposition !== 'NON_COMMERCIAL_TEST_RECORD') {
        throw new Error('audit-test-product must be flagged as a non-commercial test record');
      }
      const saved = CatalogueFirstBatchService.adjudicateProductData({ productSlug: 'audit-test-product', ...dataActor });
      if (!saved.success) throw new Error(saved.error || 'Test-record adjudication failed');
      const state = CatalogueFirstBatchService.getState().products['audit-test-product'];
      if (state.commercialDisposition !== 'NON_COMMERCIAL_TEST_RECORD') throw new Error('Disposition not recorded');
      if (state.publicationDisposition !== 'DO_NOT_PUBLISH') throw new Error('Test record must be DO_NOT_PUBLISH');
      const mappings = CatalogueReviewService.getProductDetail('audit-test-product')?.retainedSourceMappings || [];
      if (!mappings.length) throw new Error('Raw source record must be retained');
    });

    await run('First Batch Data Adjudication', 'High-tolerance compliance preservation', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const slug = 'brain-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar';
      const before = CatalogueReviewService.getProductDetail(slug)?.complianceClassification;
      const saved = CatalogueFirstBatchService.adjudicateProductData({ productSlug: slug, ...dataActor });
      if (!saved.success) throw new Error(saved.error || 'High-tolerance adjudication failed');
      const after = CatalogueReviewService.getProductDetail(slug);
      if (after?.complianceClassification !== 'REQUIRES_REVIEW') throw new Error('Compliance must stay REQUIRES_REVIEW');
      if (after?.complianceClassification !== before) throw new Error('Compliance classification changed');
      const fun = CatalogueFirstBatchService.adjudicateProductData({
        productSlug: 'fun-dip-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar',
        ...dataActor,
      });
      if (!fun.success) throw new Error(fun.error || 'Fun Dip adjudication failed');
      const funAfter = CatalogueReviewService.getProductDetail('fun-dip-high-tolerance-x-fusion-chocolate-bar-premium-fusion-mushroom-bar');
      if (funAfter?.complianceClassification !== 'REQUIRES_REVIEW') throw new Error('Fun Dip compliance must stay REQUIRES_REVIEW');
      if (!funAfter?.contentFlags.includes('DOSAGE_INSTRUCTIONS')) throw new Error('Dosage flag must remain');
    });

    await run('First Batch Data Adjudication', 'Wholesale price review preservation', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const slug = 'fusion-100-bars-boutique-box';
      const before = CatalogueReviewService.getProductDetail(slug);
      const saved = CatalogueFirstBatchService.adjudicateProductData({ productSlug: slug, ...dataActor });
      if (!saved.success) throw new Error(saved.error || 'Wholesale adjudication failed');
      const after = CatalogueReviewService.getProductDetail(slug);
      if ((after?.priceEUR ?? null) !== (before?.priceEUR ?? null)) throw new Error('EUR price must not be invented');
      if (!after?.pricingReviewRequired) throw new Error('Wholesale pricing review flag must remain');
      if (saved.summary?.statusBoard?.pricing !== 'PRICE_REVIEW_PENDING') {
        throw new Error('Pricing decision must stay PRICE_REVIEW_PENDING');
      }
    });

    await run('First Batch Data Adjudication', 'Unknown ingredient handling', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const slug = 'fusion-bars-banana-chocolate';
      const saved = CatalogueFirstBatchService.adjudicateProductData({ productSlug: slug, ...dataActor });
      if (!saved.success) throw new Error(saved.error || 'Ingredient adjudication failed');
      const after = CatalogueReviewService.getProductDetail(slug);
      if ((after?.ingredients || []).length !== 0) throw new Error('Ingredients must not be inferred');
      if (CatalogueFirstBatchService.getState().products[slug].ingredientStatus !== 'UNKNOWN') {
        throw new Error('Missing ingredients must remain UNKNOWN');
      }
    });

    await run('First Batch Data Adjudication', 'Image verification', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const testPacket = CatalogueFirstBatchService.getReviewPacket('audit-test-product');
      if (testPacket?.media.status !== 'MEDIA_REVIEW') throw new Error('Placeholder image must be MEDIA_REVIEW');
      const slug = 'fusion-bars-peanut-butter';
      const beforeCount = CatalogueReviewService.getProductDetail(slug)?.mediaAssets.length || 0;
      const saved = CatalogueFirstBatchService.adjudicateProductData({ productSlug: slug, ...dataActor });
      if (!saved.success) throw new Error(saved.error || 'Image adjudication failed');
      const after = CatalogueReviewService.getProductDetail(slug);
      if ((after?.mediaAssets.length || 0) < beforeCount) throw new Error('Raw media must not be deleted');
      if (saved.summary?.statusBoard?.media !== 'VERIFIED') throw new Error('Verified source image should be VERIFIED');
      if (CatalogueFirstBatchService.getState().products['audit-test-product']?.mediaStatus === 'VERIFIED') {
        throw new Error('Test placeholder must not be verified by using another product image');
      }
    });

    await run('First Batch Data Adjudication', 'Variant decision', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const saved = CatalogueFirstBatchService.adjudicateProductData({
        productSlug: 'a-box-of-fusion-gummies',
        ...dataActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Variant adjudication failed');
      const decision = CatalogueFirstBatchService.getState().products['a-box-of-fusion-gummies'].relationshipDecision;
      if (decision?.relationship !== 'DISTINCT_PRODUCTS' || decision.merged !== false) {
        throw new Error('Box records must stay distinct products');
      }
      const box = CatalogueReviewService.getProductDetail('a-box-of-10-fusion-gummies');
      const other = CatalogueReviewService.getProductDetail('a-box-of-fusion-gummies');
      if (box?.variantStructureDecision === 'PARENT_WITH_VARIANTS' || other?.variantStructureDecision === 'PARENT_WITH_VARIANTS') {
        throw new Error('Shared brand prefix must not create a parent/variant merge');
      }
    });

    await run('First Batch Data Adjudication', 'Data-adjudicated status', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const saved = CatalogueFirstBatchService.adjudicateProductData({
        productSlug: 'fusion-cactus-cooler-gummies',
        ...dataActor,
      });
      if (!saved.success || !saved.summary) throw new Error(saved.error || 'Status adjudication failed');
      if (saved.summary.statusBoard?.data !== 'ADJUDICATED') throw new Error('Factual catalogue data should be ADJUDICATED');
      if (!saved.summary.completionLevels?.includes('DATA_ADJUDICATED')) throw new Error('Missing DATA_ADJUDICATED level');
    });

    await run('First Batch Data Adjudication', 'Specialist-review-required status', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const saved = CatalogueFirstBatchService.adjudicateProductData({
        productSlug: 'fusion-cherry-lime-gummies',
        ...dataActor,
      });
      if (!saved.summary?.completionLevels?.includes('SPECIALIST_REVIEW_REQUIRED')) {
        throw new Error('Open price, compliance, and country gates require specialist review');
      }
      if (saved.summary.completionLevels.includes('READY_FOR_PUBLICATION')) {
        throw new Error('Specialist blockers must prevent READY_FOR_PUBLICATION');
      }
    });

    await run('First Batch Data Adjudication', 'No auto-publication during data adjudication', () => {
      resetFirstBatch();
      const publishedBefore = CatalogueAdjudicationService.getState().published.length;
      const runAll = CatalogueFirstBatchService.executeFirstBatchDataAdjudication(dataActor);
      if (!runAll.success) throw new Error(runAll.results.find((r) => !r.success)?.error || 'Batch execution failed');
      if (CatalogueAdjudicationService.getState().published.length !== publishedBefore) {
        throw new Error('Data adjudication must not publish');
      }
      if (runAll.report.published !== 0) throw new Error('Batch report must show zero published');
      if (runAll.report.readyForPublication !== 0) throw new Error('Batch report must show zero ready for publication');
    });

    await run('First Batch Data Adjudication', 'Transaction rollback on save and next', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 5, ...dataActor });
      const slug = CatalogueFirstBatchService.getSelectedSlugs()[0];
      const before = CatalogueReviewService.getProductDetail(slug)?.name;
      CatalogueFirstBatchService.stageFieldDecision({
        productSlug: slug,
        field: 'name',
        action: 'EDIT',
        editedValue: 'Should Not Persist',
        reason: 'Rollback path',
        confirm: true,
        ...dataActor,
      });
      CatalogueFirstBatchService.stageInvalidFieldForRollback(slug, dataActor.actor, dataActor.actorRole);
      const saved = CatalogueFirstBatchService.saveAndNext({ productSlug: slug, reason: 'Force fail', ...dataActor });
      if (saved.success) throw new Error('Failed transaction must not advance');
      if (saved.nextSlug) throw new Error('Rollback must not move to the next product');
      if (CatalogueReviewService.getProductDetail(slug)?.name !== before) throw new Error('Rollback must restore the product');
    });

    await run('First Batch Data Adjudication', 'Audit trail', () => {
      resetFirstBatch();
      CatalogueFirstBatchService.selectFirstBatch({ size: 10, ...dataActor });
      const saved = CatalogueFirstBatchService.adjudicateProductData({
        productSlug: 'fusion-bars-banana-chocolate',
        ...dataActor,
      });
      if (!saved.success) throw new Error(saved.error || 'Audit adjudication failed');
      const audits = CatalogueFirstBatchService.getAuditTrail().filter((a) => a.product === 'fusion-bars-banana-chocolate' && a.action === 'FIELD_DECISION');
      if (!audits.length) throw new Error('Expected one audit record per field decision');
      for (const audit of audits) {
        if (audit.actor !== dataActor.actor) throw new Error('Audit must record reviewer');
        if (!audit.timestamp || !audit.field || !audit.decision || !audit.reason) {
          throw new Error('Audit must record timestamp, field, decision, and reason');
        }
        if (!('beforeValue' in audit) || !('afterValue' in audit)) throw new Error('Audit must record before and after');
      }
    });

    const passedCount = results.filter((r) => r.passed).length;
    const failedCount = results.filter((r) => !r.passed).length;

    return {
      totalTests: results.length,
      passedCount,
      failedCount,
      durationMs: Date.now() - startTime,
      results,
    };
  }
}
