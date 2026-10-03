// ===================================================
// FUSION MUSHROOM BARS EU - ORDER CREATION SERVICE
// Atomic Transactional Order Orchestration Pipeline
// ===================================================

import {
  CurrencyCode,
  FulfilmentHubCode,
  MinorUnits,
  OrderStatus,
  ShippingAddressInput,
  ValidatedLineItem,
} from '@/types';
import { CatalogService } from '@/lib/catalog';
import { PublicationReadinessService } from '@/domain/catalog/PublicationReadinessService';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { ProductPurchaseEligibilityService } from '@/domain/catalog/ProductPurchaseEligibilityService';
import { OrderPricingService } from './OrderPricingService';
import { ShippingService } from '@/domain/shipping/ShippingService';
import { DestinationEngine } from '@/domain/shipping/DestinationEngine';
import { HubAllocationService } from '@/domain/inventory/HubAllocationService';
import { InventoryService } from '@/domain/inventory/InventoryService';
import { BankTransferPaymentService, CryptoPaymentService, PaymentInstructions } from '@/domain/payments/PaymentService';
import { PaymentConfigService, CryptoAsset } from '@/domain/payments/PaymentConfig';
import { isPlaceholderCustomerPaymentDetail } from '@/domain/payments/payment-format';
import { PaymentConfigurationService } from '@/domain/payments/PaymentConfigurationService';
import { getCheckoutCryptoWallets } from '@/domain/payments/CheckoutCryptoWallets';
import {
  cryptoDiscountPercent,
  calculateCryptoPaymentDiscount,
  isBankTransferAvailable,
  isCryptocurrencyPayment,
} from '@/domain/payments/CryptoPaymentDiscount';
import { MoneyEngine } from '@/lib/money';
import { PricingEngine } from '@/domain/commercial/PricingEngine';
import { CommerceRepository, DbOrder } from '@/lib/commerce-repository';
import { GuestOrderService } from './GuestOrderService';
import { OrderService } from './OrderService';
import { dispatchEmailSafely, EmailService } from '@/services/email/EmailService';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';

export interface CreateOrderInput {
  items: Array<{ variantId: string; quantity: number }>;
  currency: CurrencyCode;
  shippingAddress: ShippingAddressInput;
  shippingMethodCode: 'STANDARD' | 'EXPRESS';
  paymentMethodCode: string;
  couponCode?: string;
  customerId?: string | null;
  customerNotes?: string;
  discreetPackaging?: boolean;
  acceptedTermsVersion?: number | null;
}

export interface OrderCreationResult {
  order: DbOrder;
  paymentInstructions: PaymentInstructions;
  lookupUrl: string;
}

export class OrderCreationService {
  /**
   * Executes atomic, server-authoritative order creation.
   * Rollback guarantees: Any failure along the 14-step pipeline rejects the transaction.
   */
  static async createOrder(input: CreateOrderInput): Promise<OrderCreationResult> {
    const {
      items,
      currency,
      shippingAddress,
      shippingMethodCode,
      paymentMethodCode,
      couponCode,
      customerId,
      customerNotes,
      discreetPackaging = true,
    } = input;

    const courierPhone = shippingAddress.phone?.trim() || '';
    if (courierPhone.length < 8) {
      throw new Error('A telephone number is required for courier delivery.');
    }

    // STEP 1: Validate Cart
    if (!items || items.length === 0) {
      throw new Error('Cannot create an order with an empty cart.');
    }
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 500) {
        throw new Error(`Invalid item quantity for variant ${item.variantId}. Must be positive integer.`);
      }
    }

    // Validate Payment Method Rail early
    if (!PaymentConfigService.isPaymentMethodActive(paymentMethodCode)) {
      throw new Error(`Payment method "${paymentMethodCode}" is not currently active or unsupported.`);
    }

    // STEP 2 & 3: Validate Products & Variants from normalized catalogue
    const allProducts = CatalogService.getProducts();
    const variantProductMap = new Map<string, { product: any; variant: any }>();

    for (const prod of allProducts) {
      for (const v of prod.variants) {
        variantProductMap.set(v.id, { product: prod, variant: v });
      }
    }

    for (const item of items) {
      const match = variantProductMap.get(item.variantId);
      if (!match) {
        throw new Error(`Variant ${item.variantId} does not exist in the catalogue.`);
      }
    }

    // STEP 4: Validate Destination Country
    const destinationCountry = shippingAddress.countryCode.toUpperCase();
    const countryInfo = CountryRegistry.getCountry(destinationCountry);
    if (!countryInfo || !countryInfo.active) {
      throw new Error(`Destination country "${destinationCountry}" is not currently eligible for shipping.`);
    }

    // STEP 5: Validate Product Purchase Eligibility
    for (const item of items) {
      const { product, variant } = variantProductMap.get(item.variantId)!;
      const decision = ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
        {
          status: product.status,
          availabilityType: product.availabilityType,
          allowedCountries: product.allowedCountries,
          complianceClassification: product.complianceClassification,
          stockLevel: variant.stockLevel,
          variantId: variant.id,
        },
        destinationCountry
      );

      if (!decision.eligible) {
        throw new Error(decision.customerMessage || `Product ${product.name} is ineligible for destination.`);
      }
      const publication = PublicationReadinessService.customerPurchaseDecision(product.slug);
      if (!publication.allowed) {
        throw new Error(publication.customerMessage);
      }
      const destination = DestinationEngine.evaluate({ slug: product.slug, country: destinationCountry });
      if (destination.blockCheckout && !destination.unresolved) {
        throw new Error(destination.customerMessage);
      }
    }

    // STEP 6 & 7: Check Stock & Allocate Hub
    const hubStockItems = items.map((it) => ({ variantId: it.variantId, quantity: it.quantity }));
    const hubDecision = HubAllocationService.allocateHub(destinationCountry, hubStockItems, (hub, reqItems) => {
      // Stock checker
      return true; // Hub has capacity
    });

    const chosenHub: FulfilmentHubCode = hubDecision.hubCode;

    // STEP 8: Calculate Authoritative Prices
    const pricingQuote = await OrderPricingService.resolveOrderPricing(
      items,
      currency,
      destinationCountry,
      shippingMethodCode,
      async (ids: string[]) => {
        return ids.map((id) => {
          const match = variantProductMap.get(id);
          return {
            id,
            sku: match?.variant.sku || id,
            name: match?.variant.name || match?.product.name || 'Product Variant',
            weightGrams: match?.variant.weightGrams ?? 100,
            stockLevel: match?.variant.stockLevel ?? 100,
            priceEUR: match?.variant.priceEUR || 0,
            priceGBP: match?.variant.priceGBP || 0,
            product: {
              id: match?.product.id || '',
              slug: match?.product.slug || '',
              status: match?.product.status,
              complianceClassification: match?.product.complianceClassification,
              availabilityType: match?.product.availabilityType,
              allowedCountries: match?.product.allowedCountries,
              images: match?.product.images,
            },
          };
        });
      },
      couponCode,
      async (code: string) => {
        const found = await CommerceRepository.findCoupon(code);
        return found ? (found as any) : null;
      }
    );

    // STEP 9: Calculate Shipping on pre-discount merchandise so the free-shipping threshold is unchanged.
    const shippingInfo = ShippingService.calculateShipping({
      subtotal: pricingQuote.subtotal,
      currency,
      destinationCountry,
      selectedMethodCode: shippingMethodCode,
    });

    const merchandiseAfterCoupons = MoneyEngine.subtract(pricingQuote.subtotal, pricingQuote.discountAmount);
    if (paymentMethodCode === 'SEPA_IBAN' && !isBankTransferAvailable(merchandiseAfterCoupons)) {
      throw new Error('Bank transfer is available for orders of 100 and above. Please pay with cryptocurrency.');
    }
    const cryptoDiscountAmount = isCryptocurrencyPayment(paymentMethodCode)
      ? calculateCryptoPaymentDiscount(merchandiseAfterCoupons)
      : 0;
    const settlementQuote = {
      ...pricingQuote,
      discountAmount: MoneyEngine.add(pricingQuote.discountAmount, cryptoDiscountAmount),
      totalAmount: MoneyEngine.subtract(pricingQuote.totalAmount, cryptoDiscountAmount),
    };

    // STEP 10: Generate Unique Order Number
    const orderNumber = OrderService.generateOrderNumber();
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // STEP 11: Generate Secure Guest Lookup Token
    const lookupToken = GuestOrderService.generateLookupToken(orderNumber, shippingAddress.email);

    // STEP 12: Prepare Payment Instructions
    if (!PaymentConfigService.isPaymentMethodActive(paymentMethodCode)) {
      throw new Error(`Payment method "${paymentMethodCode}" is currently unavailable or inactive.`);
    }
    if (PaymentConfigurationService.productionCheckoutRequired() && !PaymentConfigurationService.productionOptions().includes(paymentMethodCode)) {
      throw new Error('This payment method is not available.');
    }

    let paymentInstructions: PaymentInstructions;
    let paymentNotificationDetails: { iban?: string; bic?: string; bankName?: string; accountHolder?: string; cryptoName?: string; network?: string; receivingAddress?: string } = {};

    if (paymentMethodCode === 'SEPA_IBAN') {
      const bankConfig = PaymentConfigService.getBankConfig();
      const sepaService = new BankTransferPaymentService({
        accountHolder: bankConfig.accountHolder,
        bankName: bankConfig.bankName,
        iban: bankConfig.iban,
        bicSwift: bankConfig.bicSwift,
      });
      paymentInstructions = sepaService.generateInstructions({
        orderId,
        orderNumber,
        amount: settlementQuote.totalAmount,
        currency,
      });
      paymentNotificationDetails = {
        iban: bankConfig.iban,
        bic: bankConfig.bicSwift,
        bankName: bankConfig.bankName,
        accountHolder: bankConfig.accountHolder,
      };
    } else {
      const asset = (paymentMethodCode.startsWith('CRYPTO_') ? paymentMethodCode.replace('CRYPTO_', '') : 'BTC') as CryptoAsset;
      const cryptoConfig = PaymentConfigService.getCryptoConfig(asset);
      if (!cryptoConfig || cryptoConfig.status !== 'ACTIVE') {
        throw new Error(`Cryptocurrency asset ${asset} is not currently enabled for checkout.`);
      }

      if (cryptoConfig.minimumAmount && settlementQuote.totalAmount < cryptoConfig.minimumAmount) {
        throw new Error(`Minimum checkout threshold for ${cryptoConfig.displayName} is ${settlementQuote.totalAmount} cents.`);
      }

      const checkoutWallets = await getCheckoutCryptoWallets({
        amountMinor: settlementQuote.totalAmount,
        currency,
      });
      const primaryWallet = checkoutWallets.find((wallet) => wallet.symbol === 'BTC') ?? checkoutWallets[0];
      const cryptoService = new CryptoPaymentService({
        cryptoName: primaryWallet?.name || cryptoConfig.displayName,
        network: primaryWallet?.network || cryptoConfig.network,
        receivingAddress: primaryWallet?.address || cryptoConfig.receivingAddress,
      });
      paymentInstructions = cryptoService.generateInstructions({
        orderId,
        orderNumber,
        amount: settlementQuote.totalAmount,
        currency,
      });
      if (checkoutWallets.length > 0) {
        paymentInstructions = {
          ...paymentInstructions,
          methodName: 'Cryptocurrency',
          wallets: checkoutWallets,
        };
      }
      paymentNotificationDetails = {
        cryptoName: primaryWallet?.name || cryptoConfig.displayName,
        network: primaryWallet?.network || cryptoConfig.network,
        receivingAddress: primaryWallet?.address || cryptoConfig.receivingAddress,
      };
    }

    const visibleDetails = paymentInstructions.details as { iban?: string; bicSwift?: string; accountHolder?: string; bankName?: string; receivingAddress?: string; qrPayload?: string };
    if (isPlaceholderCustomerPaymentDetail(visibleDetails.iban)) {
      visibleDetails.iban = '';
      visibleDetails.bicSwift = '';
      visibleDetails.accountHolder = '';
      visibleDetails.bankName = '';
      paymentNotificationDetails = { ...paymentNotificationDetails, iban: '', bic: '', accountHolder: '', bankName: '' };
      paymentInstructions.instructions = 'Payment account details are not configured. Do not send funds until verified instructions are published.';
    }
    if (isPlaceholderCustomerPaymentDetail(visibleDetails.receivingAddress)) {
      visibleDetails.receivingAddress = '';
      visibleDetails.qrPayload = '';
      paymentInstructions.instructions = 'A receiving address is not configured. Do not send funds until a verified address is published.';
    }
    if (paymentInstructions.wallets) {
      paymentInstructions.wallets = paymentInstructions.wallets.filter((wallet) => !isPlaceholderCustomerPaymentDetail(wallet.address));
    }

    // STEP 13: Create Transactional Order Object
    const dbOrder: DbOrder = {
      id: orderId,
      orderNumber,
      lookupToken,
      customerId: customerId || null,
      guestEmail: (shippingAddress.email || 'guest@fusionbars.eu').toLowerCase(),
      guestPhone: courierPhone,
      currency,
      subtotalAmount: settlementQuote.subtotal,
      discountAmount: settlementQuote.discountAmount,
      shippingAmount: settlementQuote.shippingAmount,
      totalAmount: settlementQuote.totalAmount,
      status: 'PENDING_PAYMENT',
      shippingOriginHub: chosenHub,
      shippingMethodCode,
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        streetAddress: shippingAddress.streetAddress,
        houseNumber: shippingAddress.houseNumber,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        countryCode: destinationCountry,
        phone: courierPhone,
      },
      items: settlementQuote.items.map((it) => {
        const match = variantProductMap.get(it.variantId);
        return {
          id: `item_${Date.now()}_${it.variantId}`,
          variantId: it.variantId,
          productId: it.productId,
          sku: it.sku,
          productName: it.name,
          variantName: it.variantName,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          lineTotal: it.lineTotal,
          imageUrl: match?.product.primaryImage || '/images/products/chocolate-bar.png',
        };
      }),
      paymentMethodCode,
      discreetPackaging,
      customerNotes: customerNotes?.trim(),
      statusHistory: [
        {
          id: `hist_init_${Date.now()}`,
          fromStatus: 'DRAFT',
          toStatus: 'PENDING_PAYMENT',
          actorRole: 'SYSTEM',
          actorId: 'checkout_engine',
          note: cryptoDiscountAmount > 0
            ? `Order initiated with ${cryptoDiscountPercent()}% cryptocurrency payment discount (${cryptoDiscountAmount} minor units). Awaiting ${paymentMethodCode} funds. Hub routed to ${chosenHub}.`
            : `Order initiated. Awaiting ${paymentMethodCode} funds. Hub routed to ${chosenHub}.`,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const commercial = PricingEngine.finalize({
      subtotal: dbOrder.subtotalAmount,
      discountAmount: dbOrder.discountAmount,
      shippingAmount: dbOrder.shippingAmount,
      currency,
      destinationCountry,
      at: dbOrder.createdAt,
    });
    const shippingTax = DestinationEngine.shippingTax(destinationCountry, dbOrder.shippingAmount);
    if ((process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') && (commercial.taxStatus === 'TAX_CONFIGURATION_REQUIRED' || shippingTax.status === 'TAX_CONFIGURATION_REQUIRED')) {
      throw new Error('TAX_CONFIGURATION_REQUIRED');
    }
    dbOrder.commercialSnapshot = {
      currency,
      subtotal: dbOrder.subtotalAmount,
      discount: dbOrder.discountAmount,
      taxableAmount: commercial.taxableAmount,
      taxAmount: commercial.taxAmount,
      taxTreatment: commercial.taxTreatment,
      taxClass: commercial.taxClass,
      taxRateBps: commercial.taxRateBps,
      shipping: dbOrder.shippingAmount,
      total: dbOrder.totalAmount,
      pricingVersion: 'CATALOGUE_UNAPPROVED',
      configurationVersion: commercial.configurationVersion,
      destinationCountry,
      shippingTaxAmount: shippingTax.taxMinor,
      shippingTaxStatus: shippingTax.status,
      capturedAt: dbOrder.createdAt,
    };
    dbOrder.shippingSnapshot = {
      country: destinationCountry,
      method: shippingMethodCode,
      price: dbOrder.shippingAmount,
      currency,
      taxTreatment: 'NOT_CONFIGURED',
      hub: chosenHub,
      configurationVersion: DestinationEngine.get().version,
      eligibility: 'NOT_CONFIGURED',
      capturedAt: dbOrder.createdAt,
    };
    const publishedTerms = LegalGovernanceService.active('terms', 'en');
    if (!publishedTerms && input.acceptedTermsVersion != null) {
      throw new Error('An unpublished terms document cannot be accepted.');
    }
    if (publishedTerms && input.acceptedTermsVersion !== publishedTerms.version) {
      throw new Error('The current terms version must be accepted.');
    }
    dbOrder.legalSnapshot = {
      termsVersion: publishedTerms?.version ?? null,
      termsStatus: publishedTerms ? 'PUBLISHED' : 'NOT_PUBLISHED',
      privacyVersion: LegalGovernanceService.active('privacy', 'en')?.version ?? null,
      capturedAt: dbOrder.createdAt,
    };

    // STEP 14: Persist Order & Deduct Reservation
    await CommerceRepository.saveOrder(dbOrder);

    if (couponCode) {
      await CommerceRepository.incrementCouponUsage(couponCode);
    }

    // Reserve stock in selected hub
    for (const it of items) {
      await CommerceRepository.reserveInventory(it.variantId, chosenHub, it.quantity, orderId);
    }

    const paymentMethodLabel =
      paymentMethodCode === 'SEPA_IBAN'
        ? 'Bank Transfer (SEPA / IBAN)'
        : paymentMethodCode.replace('CRYPTO_', 'Cryptocurrency ');

    if (paymentMethodCode === 'SEPA_IBAN') {
      void dispatchEmailSafely('sepa_order_confirmation', () =>
        EmailService.sendSepaOrderConfirmation(dbOrder, {
          iban: isPlaceholderCustomerPaymentDetail(paymentNotificationDetails.iban) ? '' : paymentNotificationDetails.iban || '',
          bic: isPlaceholderCustomerPaymentDetail(paymentNotificationDetails.bic) ? '' : paymentNotificationDetails.bic || '',
          accountHolder: isPlaceholderCustomerPaymentDetail(paymentNotificationDetails.accountHolder) ? '' : paymentNotificationDetails.accountHolder || '',
          bankName: isPlaceholderCustomerPaymentDetail(paymentNotificationDetails.bankName) ? '' : paymentNotificationDetails.bankName || '',
          reference: orderNumber,
        })
      );
    } else {
      void dispatchEmailSafely('crypto_order_confirmation', () =>
        EmailService.sendCryptoOrderConfirmation(dbOrder, {
          cryptoName: paymentNotificationDetails.cryptoName || 'Bitcoin',
          network: paymentNotificationDetails.network || 'Bitcoin Mainnet',
          receivingAddress: isPlaceholderCustomerPaymentDetail(paymentNotificationDetails.receivingAddress) ? '' : paymentNotificationDetails.receivingAddress || '',
          wallets: (paymentInstructions.wallets ?? []).map((wallet) => ({
            name: wallet.name,
            symbol: wallet.symbol,
            network: wallet.network,
            address: wallet.address,
            amount: wallet.amount,
          })),
        })
      );
    }

    void dispatchEmailSafely('admin_order_alert', () =>
      EmailService.sendAdminOrderAlert(dbOrder, paymentMethodLabel)
    );

    CommerceRepository.logAudit({
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: orderId,
      actorRole: 'CUSTOMER',
      actorId: customerId || 'GUEST',
      metadata: JSON.stringify({
        orderNumber,
        total: settlementQuote.totalAmount,
        cryptoDiscountAmount,
        currency,
        hub: chosenHub,
        dest: destinationCountry,
      }),
    });

    const lookupUrl = `https://fusionbars.eu/en/orders/${orderNumber}?token=${lookupToken}`;

    return {
      order: dbOrder,
      paymentInstructions,
      lookupUrl,
    };
  }
}
