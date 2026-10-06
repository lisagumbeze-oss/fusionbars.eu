// ===================================================
// FUSION MUSHROOM BARS EU - COMMERCE DATA REPOSITORY
// Unified Persistence with Resilient Memory Store
// ===================================================

import bcrypt from 'bcryptjs';
import catalogueData from '../data/consolidated-catalogue.json';
import {
  CurrencyCode,
  FulfilmentHubCode,
  MinorUnits,
  OrderStatus,
  RoleName,
  ValidatedLineItem,
} from '@/types';
import { prisma } from './prisma';
import { OrderDatabasePersistence } from '@/domain/orders/OrderDatabasePersistence';

export interface DbCustomer {
  id: string;
  userId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  languageCode: string;
  preferredCurrency: CurrencyCode;
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbAddress {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  company?: string;
  streetAddress: string;
  houseNumber?: string;
  apartmentUnit?: string;
  city: string;
  stateProvince?: string;
  postalCode: string;
  countryCode: string;
  phone?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface DbOrder {
  id: string;
  orderNumber: string;
  lookupToken: string;
  customerId?: string | null;
  guestEmail: string;
  guestPhone?: string | null;
  currency: CurrencyCode;
  subtotalAmount: MinorUnits;
  discountAmount: MinorUnits;
  shippingAmount: MinorUnits;
  totalAmount: MinorUnits;
  status: OrderStatus;
  shippingOriginHub: FulfilmentHubCode;
  shippingMethodCode: 'STANDARD' | 'EXPRESS';
  shippingAddress: {
    firstName: string;
    lastName: string;
    streetAddress: string;
    houseNumber?: string;
    city: string;
    postalCode: string;
    countryCode: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    variantId: string;
    productId: string;
    sku: string;
    productName: string;
    variantName: string;
    unitPrice: MinorUnits;
    quantity: number;
    lineTotal: MinorUnits;
    imageUrl?: string | null;
  }>;
  paymentMethodCode: string;
  paymentReference?: string | null;
  proofFileUrl?: string | null;
  paymentVerifiedAt?: string | null;
  paymentVerifiedBy?: string | null;
  discreetPackaging: boolean;
  trackingNumber?: string | null;
  carrierName?: string | null;
  customerNotes?: string | null;
  internalNotes?: string | null;
  statusHistory: Array<{
    id: string;
    fromStatus: OrderStatus;
    toStatus: OrderStatus;
    actorRole: string;
    actorId: string;
    note?: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  commercialSnapshot?: {
    currency: CurrencyCode;
    subtotal: MinorUnits;
    discount: MinorUnits;
    taxableAmount: MinorUnits | null;
    taxAmount: MinorUnits | null;
    taxTreatment: string;
    taxClass: string;
    taxRateBps: number | null;
    shipping: MinorUnits;
    total: MinorUnits;
    pricingVersion: string;
    configurationVersion: number;
    destinationCountry: string;
    shippingTaxAmount?: MinorUnits | null;
    shippingTaxStatus?: string;
    capturedAt: string;
  };
  legalSnapshot?: {
    termsVersion: number | null;
    termsStatus: string;
    privacyVersion: number | null;
    capturedAt: string;
  };
  shippingSnapshot?: {
    country: string;
    method: string;
    price: MinorUnits;
    currency: CurrencyCode;
    taxTreatment: string;
    hub: string;
    configurationVersion: number;
    eligibility: string;
    capturedAt: string;
  };
}

export interface DbInventoryRecord {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string;
  locationCode: FulfilmentHubCode;
  quantityOnHand: number;
  quantityReserved: number;
  lowStockThreshold: number;
}

export interface DbCoupon {
  code: string;
  discount: number; // Percentage or cents
  isPercent: boolean;
  minSpendEUR: MinorUnits;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  isActive: boolean;
}

export interface DbAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorRole: string;
  actorId: string;
  metadata?: string;
  createdAt: string;
}

// Memory Store Singletons
class CommerceStore {
  customers: Map<string, DbCustomer> = new Map();
  addresses: Map<string, DbAddress> = new Map();
  orders: Map<string, DbOrder> = new Map();
  inventory: Map<string, DbInventoryRecord> = new Map(); // key: `${variantId}_${locationCode}`
  coupons: Map<string, DbCoupon> = new Map();
  auditLogs: DbAuditLog[] = [];
  isInitialized = false;

  constructor() {
    this.initializeSeed();
  }

  private initializeSeed() {
    if (this.isInitialized) return;

    // 1. Seed Coupons
    this.coupons.set('WELCOME10', {
      code: 'WELCOME10',
      discount: 10,
      isPercent: true,
      minSpendEUR: 5000, // €50.00
      maxUses: 1000,
      usedCount: 14,
      isActive: true,
    });
    this.coupons.set('EUROPE25', {
      code: 'EUROPE25',
      discount: 2500, // €25.00
      isPercent: false,
      minSpendEUR: 15000, // €150.00
      maxUses: 500,
      usedCount: 22,
      isActive: true,
    });
    this.coupons.set('VIP15', {
      code: 'VIP15',
      discount: 15,
      isPercent: true,
      minSpendEUR: 10000, // €100.00
      maxUses: 200,
      usedCount: 45,
      isActive: true,
    });

    // 2. Seed Default Customer
    const customerPasswordHash = bcrypt.hashSync('CustomerPass2026!', 10);
    const defaultCustomerId = 'cust_lisa_2026';
    const defaultCustomer: DbCustomer = {
      id: defaultCustomerId,
      userId: 'user_lisa_2026',
      email: 'lisa@example.eu',
      passwordHash: customerPasswordHash,
      firstName: 'Lisa',
      lastName: 'Gumbeze',
      phone: '+31 6 1234 5678',
      languageCode: 'en',
      preferredCurrency: 'EUR',
      isEmailVerified: true,
      createdAt: new Date('2026-09-01T10:00:00Z').toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.customers.set(defaultCustomer.email.toLowerCase(), defaultCustomer);
    this.customers.set(defaultCustomer.id, defaultCustomer);

    // 3. Seed Addresses for Default Customer
    const defaultAddress: DbAddress = {
      id: 'addr_lisa_nl',
      customerId: defaultCustomerId,
      firstName: 'Lisa',
      lastName: 'Gumbeze',
      streetAddress: 'Keizersgracht 421',
      houseNumber: '421',
      city: 'Amsterdam',
      postalCode: '1016 EK',
      countryCode: 'NL',
      phone: '+31 6 1234 5678',
      isDefault: true,
      createdAt: new Date('2026-09-01T10:00:00Z').toISOString(),
    };
    this.addresses.set(defaultAddress.id, defaultAddress);

    // 4. Seed Multi-Hub Inventory from Catalogue Variants
    const hubs: FulfilmentHubCode[] = ['NL', 'ES', 'DE', 'FR'];
    const products: any[] = (catalogueData as any).products || [];

    for (const prod of products) {
      for (const variant of prod.variants || []) {
        for (const hub of hubs) {
          const key = `${variant.id}_${hub}`;
          // Allocate healthy initial stock per hub
          const baseOnHand = hub === 'NL' ? 75 : hub === 'DE' ? 60 : hub === 'ES' ? 45 : 40;
          this.inventory.set(key, {
            variantId: variant.id,
            sku: variant.sku,
            productName: prod.name,
            variantName: variant.name,
            locationCode: hub,
            quantityOnHand: baseOnHand,
            quantityReserved: 0,
            lowStockThreshold: 15,
          });
        }
      }
    }

    // 5. Seed Historical Orders
    const sampleOrder1: DbOrder = {
      id: 'ord_sample_101',
      orderNumber: 'FB-EU-2026-10024',
      lookupToken: 'tok_sec_99182a17f6',
      customerId: defaultCustomerId,
      guestEmail: 'lisa@example.eu',
      currency: 'EUR',
      subtotalAmount: 12000,
      discountAmount: 1200,
      shippingAmount: 1500,
      totalAmount: 12300,
      status: 'SHIPPED',
      shippingOriginHub: 'NL',
      shippingMethodCode: 'STANDARD',
      shippingAddress: {
        firstName: 'Lisa',
        lastName: 'Gumbeze',
        streetAddress: 'Keizersgracht 421',
        city: 'Amsterdam',
        postalCode: '1016 EK',
        countryCode: 'NL',
      },
      items: [
        {
          id: 'item_101',
          variantId: 'var_bar_birthday_cake_6g',
          productId: 'prod_fusion_artisan_chocolate_bar_6g',
          sku: 'FUS-BAR-BDAY-6G',
          productName: 'Fusion Artisan Botanical Chocolate Bar (6g)',
          variantName: 'Birthday Cake - 6g',
          unitPrice: 4000,
          quantity: 3,
          lineTotal: 12000,
        },
      ],
      paymentMethodCode: 'SEPA_IBAN',
      paymentReference: 'FB-EU-2026-10024-TRF',
      paymentVerifiedAt: new Date('2026-09-20T14:30:00Z').toISOString(),
      paymentVerifiedBy: 'FINANCE_MANAGER',
      discreetPackaging: true,
      trackingNumber: 'POSTNL-EU-8829104',
      carrierName: 'PostNL Discreet International',
      statusHistory: [
        {
          id: 'hist_1',
          fromStatus: 'DRAFT',
          toStatus: 'PENDING_PAYMENT',
          actorRole: 'SYSTEM',
          actorId: 'checkout',
          createdAt: new Date('2026-09-20T10:00:00Z').toISOString(),
        },
        {
          id: 'hist_2',
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'PAYMENT_SUBMITTED',
          actorRole: 'CUSTOMER',
          actorId: defaultCustomerId,
          note: 'SEPA transfer initiated via ABN AMRO',
          createdAt: new Date('2026-09-20T11:00:00Z').toISOString(),
        },
        {
          id: 'hist_3',
          fromStatus: 'PAYMENT_SUBMITTED',
          toStatus: 'PAYMENT_VERIFIED',
          actorRole: 'FINANCE_MANAGER',
          actorId: 'finance-staff',
          note: 'Bank reconciliation match confirmed',
          createdAt: new Date('2026-09-20T14:30:00Z').toISOString(),
        },
        {
          id: 'hist_4',
          fromStatus: 'PAYMENT_VERIFIED',
          toStatus: 'PROCESSING',
          actorRole: 'ORDER_MANAGER',
          actorId: 'logistics-staff',
          note: 'Discreet packaging queue assigned to NL Hub',
          createdAt: new Date('2026-09-21T08:00:00Z').toISOString(),
        },
        {
          id: 'hist_5',
          fromStatus: 'PROCESSING',
          toStatus: 'SHIPPED',
          actorRole: 'ORDER_MANAGER',
          actorId: 'logistics-staff',
          note: 'Handed over to PostNL with neutral outer packaging',
          createdAt: new Date('2026-09-21T16:00:00Z').toISOString(),
        },
      ],
      createdAt: new Date('2026-09-20T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-09-21T16:00:00Z').toISOString(),
    };

    const sampleOrder2: DbOrder = {
      id: 'ord_sample_102',
      orderNumber: 'FB-EU-2026-30491',
      lookupToken: 'tok_sec_7781b29a',
      customerId: defaultCustomerId,
      guestEmail: 'lisa@example.eu',
      currency: 'EUR',
      subtotalAmount: 32000,
      discountAmount: 0,
      shippingAmount: 0, // Free standard >= €300
      totalAmount: 32000,
      status: 'PAYMENT_SUBMITTED',
      shippingOriginHub: 'NL',
      shippingMethodCode: 'STANDARD',
      shippingAddress: {
        firstName: 'Lisa',
        lastName: 'Gumbeze',
        streetAddress: 'Keizersgracht 421',
        city: 'Amsterdam',
        postalCode: '1016 EK',
        countryCode: 'NL',
      },
      items: [
        {
          id: 'item_102',
          variantId: 'var_box_10_assorted',
          productId: 'prod_fusion_10_bar_connoisseur_box',
          sku: 'FUS-BOX-10-ASST',
          productName: 'Fusion 10-Bar Connoisseur Box',
          variantName: '10-Bar Assorted Box',
          unitPrice: 32000,
          quantity: 1,
          lineTotal: 32000,
        },
      ],
      paymentMethodCode: 'CRYPTO_BTC',
      paymentReference: '7a192bc5824982fa102048bcae91823746a0928120391203',
      discreetPackaging: true,
      statusHistory: [
        {
          id: 'hist_201',
          fromStatus: 'DRAFT',
          toStatus: 'PENDING_PAYMENT',
          actorRole: 'SYSTEM',
          actorId: 'checkout',
          createdAt: new Date('2026-09-24T18:00:00Z').toISOString(),
        },
        {
          id: 'hist_202',
          fromStatus: 'PENDING_PAYMENT',
          toStatus: 'PAYMENT_SUBMITTED',
          actorRole: 'CUSTOMER',
          actorId: defaultCustomerId,
          note: 'Bitcoin TXID broadcast on mainnet',
          createdAt: new Date('2026-09-24T18:30:00Z').toISOString(),
        },
      ],
      createdAt: new Date('2026-09-24T18:00:00Z').toISOString(),
      updatedAt: new Date('2026-09-24T18:30:00Z').toISOString(),
    };

    this.orders.set(sampleOrder1.id, sampleOrder1);
    this.orders.set(sampleOrder1.orderNumber, sampleOrder1);
    this.orders.set(sampleOrder1.lookupToken, sampleOrder1);
    this.orders.set(sampleOrder2.id, sampleOrder2);
    this.orders.set(sampleOrder2.orderNumber, sampleOrder2);
    this.orders.set(sampleOrder2.lookupToken, sampleOrder2);

    this.isInitialized = true;
  }
}

const store = new CommerceStore();

let isDbAvailable: boolean | null = null;
async function checkDb(): Promise<boolean> {
  if (isDbAvailable === true) return true;
  // If in sandbox development environment with default localhost:5432, avoid timeout log
  if (process.env.DATABASE_URL?.includes('localhost:5432')) {
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    isDbAvailable = true;
    return true;
  } catch {
    return false;
  }
}

export class CommerceRepository {
  // ----------------------------------------------------
  // CUSTOMER OPERATIONS
  // ----------------------------------------------------

  static async findCustomerByEmail(email: string): Promise<DbCustomer | null> {
    if (await checkDb()) {
      try {
        const found = await prisma.customer.findUnique({
          where: { email: email.toLowerCase() },
          include: { user: true },
        });
        if (found && found.user) {
          return {
            id: found.id,
            userId: found.userId || found.user.id,
            email: found.email,
            passwordHash: found.user.passwordHash,
            firstName: found.firstName,
            lastName: found.lastName,
            phone: found.phone || undefined,
            languageCode: found.languageCode,
            preferredCurrency: (found as any).preferredCurrency || 'EUR',
            isEmailVerified: (found as any).isEmailVerified ?? true,
            createdAt: found.createdAt.toISOString(),
            updatedAt: found.updatedAt.toISOString(),
          };
        }
      } catch {
        // Fallback to memory store
      }
    }

    return store.customers.get(email.toLowerCase()) || null;
  }

  static async findCustomerById(id: string): Promise<DbCustomer | null> {
    if (await checkDb()) {
      try {
        const found = await prisma.customer.findUnique({
          where: { id },
          include: { user: true },
        });
        if (found && found.user) {
          return {
            id: found.id,
            userId: found.userId || found.user.id,
            email: found.email,
            passwordHash: found.user.passwordHash,
            firstName: found.firstName,
            lastName: found.lastName,
            phone: found.phone || undefined,
            languageCode: found.languageCode,
            preferredCurrency: (found as any).preferredCurrency || 'EUR',
            isEmailVerified: (found as any).isEmailVerified ?? true,
            createdAt: found.createdAt.toISOString(),
            updatedAt: found.updatedAt.toISOString(),
          };
        }
      } catch {
        // Fallback
      }
    }

    return store.customers.get(id) || null;
  }

  static async createCustomer(input: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string;
    languageCode?: string;
    preferredCurrency?: CurrencyCode;
    verificationToken?: string;
  }): Promise<DbCustomer> {
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: DbCustomer = {
      id: customerId,
      userId,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      languageCode: input.languageCode || 'en',
      preferredCurrency: input.preferredCurrency || 'EUR',
      isEmailVerified: false,
      emailVerificationToken: input.verificationToken,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.customers.set(record.email, record);
    store.customers.set(record.id, record);

    if (await checkDb()) {
      try {
        // Create role if needed or connect to CUSTOMER role
        let role = await prisma.role.findUnique({ where: { name: 'CUSTOMER' } });
        if (!role) {
          role = await prisma.role.create({ data: { name: 'CUSTOMER', description: 'Storefront Customer' } });
        }
        await prisma.user.create({
          data: {
            id: userId,
            email: record.email,
            passwordHash: record.passwordHash,
            name: `${record.firstName} ${record.lastName}`,
            roleId: role.id,
            customerProfile: {
              create: {
                id: customerId,
                email: record.email,
                firstName: record.firstName,
                lastName: record.lastName,
                phone: record.phone,
                languageCode: record.languageCode,
              },
            },
          },
        });
      } catch {
        // Resilient fallback mode
      }
    }

    return record;
  }

  static async updateCustomerProfile(
    customerId: string,
    updates: Partial<Pick<DbCustomer, 'firstName' | 'lastName' | 'phone' | 'languageCode' | 'preferredCurrency' | 'isEmailVerified' | 'passwordHash'>>
  ): Promise<DbCustomer> {
    const existing = await this.findCustomerById(customerId);
    if (!existing) throw new Error('Customer not found');

    const updated: DbCustomer = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    store.customers.set(updated.email, updated);
    store.customers.set(updated.id, updated);

    try {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          firstName: updated.firstName,
          lastName: updated.lastName,
          phone: updated.phone,
          languageCode: updated.languageCode,
        },
      });
    } catch {
      // Fallback
    }

    return updated;
  }

  // ----------------------------------------------------
  // ADDRESS OPERATIONS
  // ----------------------------------------------------

  static async getCustomerAddresses(customerId: string): Promise<DbAddress[]> {
    try {
      const addresses = await prisma.orderAddress.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      if (addresses && addresses.length > 0) {
        return addresses.map((a) => ({
          id: a.id,
          customerId: a.customerId || customerId,
          firstName: a.firstName,
          lastName: a.lastName,
          company: a.company || undefined,
          streetAddress: a.streetAddress,
          houseNumber: a.houseNumber || undefined,
          apartmentUnit: a.apartmentUnit || undefined,
          city: a.city,
          stateProvince: a.stateProvince || undefined,
          postalCode: a.postalCode,
          countryCode: a.countryCode,
          phone: a.phone || undefined,
          isDefault: (a as any).isDefault ?? false,
          createdAt: a.createdAt.toISOString(),
        }));
      }
    } catch {
      // Fallback
    }

    return Array.from(store.addresses.values()).filter((a) => a.customerId === customerId);
  }

  static async saveCustomerAddress(customerId: string, input: Omit<DbAddress, 'id' | 'customerId' | 'createdAt'>): Promise<DbAddress> {
    const id = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const address: DbAddress = {
      id,
      customerId,
      ...input,
      createdAt: new Date().toISOString(),
    };

    // If marked default, unset other defaults
    if (address.isDefault) {
      for (const [k, v] of store.addresses.entries()) {
        if (v.customerId === customerId) {
          store.addresses.set(k, { ...v, isDefault: false });
        }
      }
    }

    store.addresses.set(id, address);

    try {
      await prisma.orderAddress.create({
        data: {
          id,
          customerId,
          firstName: address.firstName,
          lastName: address.lastName,
          company: address.company,
          streetAddress: address.streetAddress,
          houseNumber: address.houseNumber,
          apartmentUnit: address.apartmentUnit,
          city: address.city,
          stateProvince: address.stateProvince,
          postalCode: address.postalCode,
          countryCode: address.countryCode,
          phone: address.phone,
        },
      });
    } catch {
      // Fallback
    }

    return address;
  }

  static async deleteCustomerAddress(customerId: string, addressId: string): Promise<boolean> {
    const addr = store.addresses.get(addressId);
    if (!addr || addr.customerId !== customerId) return false;
    store.addresses.delete(addressId);
    return true;
  }

  // ----------------------------------------------------
  // ORDER OPERATIONS
  // ----------------------------------------------------

  static async saveOrder(order: DbOrder): Promise<DbOrder> {
    store.orders.set(order.id, order);
    store.orders.set(order.orderNumber, order);
    store.orders.set(order.lookupToken, order);

    if (process.env.NODE_ENV === 'production') {
      if (!(await checkDb())) {
        store.orders.delete(order.id);
        store.orders.delete(order.orderNumber);
        store.orders.delete(order.lookupToken);
        throw new Error('DATABASE_UNAVAILABLE');
      }
      try {
        await OrderDatabasePersistence.persist(order);
      } catch (error) {
        store.orders.delete(order.id);
        store.orders.delete(order.orderNumber);
        store.orders.delete(order.lookupToken);
        throw error;
      }
    }

    return order;
  }

  static async findOrderByIdOrNumber(identifier: string): Promise<DbOrder | null> {
    return store.orders.get(identifier) || null;
  }

  static async findOrderByLookupToken(token: string): Promise<DbOrder | null> {
    return store.orders.get(token) || null;
  }

  static async findCustomerOrders(customerIdOrEmail: string): Promise<DbOrder[]> {
    const results: DbOrder[] = [];
    const seen = new Set<string>();

    for (const ord of store.orders.values()) {
      if (
        (ord.customerId === customerIdOrEmail || ord.guestEmail.toLowerCase() === customerIdOrEmail.toLowerCase()) &&
        !seen.has(ord.id)
      ) {
        seen.add(ord.id);
        results.push(ord);
      }
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async getAllOrders(): Promise<DbOrder[]> {
    const list: DbOrder[] = [];
    const seen = new Set<string>();

    for (const ord of store.orders.values()) {
      if (!seen.has(ord.id)) {
        seen.add(ord.id);
        list.push(ord);
      }
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  static async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    actorRole: string,
    actorId: string,
    note?: string
  ): Promise<DbOrder | null> {
    const order = await this.findOrderByIdOrNumber(orderId);
    if (!order) return null;

    const fromStatus = order.status;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();

    // Inventory Lifecycle Transition Hooks
    if (newStatus === 'CANCELLED' && ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'DRAFT'].includes(fromStatus)) {
      // Release reserved stock on order cancellation
      for (const item of order.items) {
        try {
          await this.releaseReservation(item.variantId, order.shippingOriginHub, item.quantity, order.id);
        } catch {
          // Continue gracefully
        }
      }
    } else if (newStatus === 'PROCESSING' && ['PAYMENT_VERIFIED', 'PAYMENT_SUBMITTED', 'PENDING_PAYMENT'].includes(fromStatus)) {
      // Commit reserved stock when moving to processing
      for (const item of order.items) {
        try {
          await this.commitReservation(item.variantId, order.shippingOriginHub, item.quantity, order.id);
        } catch {
          // Continue gracefully
        }
      }
    }

    order.statusHistory.push({
      id: `hist_${Date.now()}`,
      fromStatus,
      toStatus: newStatus,
      actorRole,
      actorId,
      note,
      createdAt: new Date().toISOString(),
    });

    store.orders.set(order.id, order);
    store.orders.set(order.orderNumber, order);
    store.orders.set(order.lookupToken, order);

    return order;
  }

  // ----------------------------------------------------
  // INVENTORY OPERATIONS
  // ----------------------------------------------------

  static async getInventoryMatrix(): Promise<DbInventoryRecord[]> {
    return Array.from(store.inventory.values());
  }

  static async getHubStock(variantId: string, hub: FulfilmentHubCode): Promise<DbInventoryRecord | null> {
    const key = `${variantId}_${hub}`;
    return store.inventory.get(key) || null;
  }

  /**
   * Atomically reserves stock in a specific warehouse hub.
   * Throws if available stock (onHand - reserved) is insufficient.
   */
  static async reserveInventory(
    variantId: string,
    hub: FulfilmentHubCode,
    quantity: number,
    orderId: string
  ): Promise<DbInventoryRecord> {
    const key = `${variantId}_${hub}`;
    let record = store.inventory.get(key);

    if (!record) {
      record = {
        variantId,
        sku: variantId,
        productName: 'Botanical Product',
        variantName: 'Default',
        locationCode: hub,
        quantityOnHand: 100, // Default seed
        quantityReserved: 0,
        lowStockThreshold: 15,
      };
      store.inventory.set(key, record);
    }

    const available = record.quantityOnHand - record.quantityReserved;
    if (available < quantity) {
      throw new Error(
        `Insufficient available stock for variant ${variantId} at European Hub ${hub}. Available: ${available}, Requested: ${quantity}`
      );
    }

    record.quantityReserved += quantity;
    store.inventory.set(key, record);

    this.logAudit({
      action: 'STOCK_RESERVED',
      entityType: 'Inventory',
      entityId: key,
      actorRole: 'SYSTEM',
      actorId: orderId,
      metadata: JSON.stringify({ hub, reservedQuantity: quantity, newReservedTotal: record.quantityReserved }),
    });

    return record;
  }

  /**
   * Releases an active stock reservation (e.g. on order cancellation).
   */
  static async releaseReservation(
    variantId: string,
    hub: FulfilmentHubCode,
    quantity: number,
    orderId: string
  ): Promise<DbInventoryRecord> {
    const key = `${variantId}_${hub}`;
    const record = store.inventory.get(key);
    if (!record) return null as any;

    const toRelease = Math.min(record.quantityReserved, quantity);
    record.quantityReserved = Math.max(0, record.quantityReserved - toRelease);
    store.inventory.set(key, record);

    this.logAudit({
      action: 'STOCK_RESERVATION_RELEASED',
      entityType: 'Inventory',
      entityId: key,
      actorRole: 'SYSTEM',
      actorId: orderId,
      metadata: JSON.stringify({ hub, releasedQuantity: toRelease, remainingReserved: record.quantityReserved }),
    });

    return record;
  }

  /**
   * Commits reserved stock permanently decrements both onHand and reserved.
   */
  static async commitReservation(
    variantId: string,
    hub: FulfilmentHubCode,
    quantity: number,
    orderId: string
  ): Promise<DbInventoryRecord> {
    const key = `${variantId}_${hub}`;
    const record = store.inventory.get(key);
    if (!record) return null as any;

    const toCommit = Math.min(record.quantityOnHand, quantity);
    record.quantityOnHand = Math.max(0, record.quantityOnHand - toCommit);
    record.quantityReserved = Math.max(0, record.quantityReserved - toCommit);
    store.inventory.set(key, record);

    this.logAudit({
      action: 'STOCK_COMMITTED',
      entityType: 'Inventory',
      entityId: key,
      actorRole: 'ORDER_MANAGER',
      actorId: orderId,
      metadata: JSON.stringify({
        hub,
        committedQuantity: toCommit,
        newOnHand: record.quantityOnHand,
        newReserved: record.quantityReserved,
      }),
    });

    return record;
  }

  static async adjustInventory(
    variantId: string,
    hub: FulfilmentHubCode,
    delta: number,
    reason: string,
    actorId: string = 'admin'
  ): Promise<DbInventoryRecord> {
    const key = `${variantId}_${hub}`;
    let record = store.inventory.get(key);

    if (!record) {
      record = {
        variantId,
        sku: variantId,
        productName: 'Unknown',
        variantName: 'Default',
        locationCode: hub,
        quantityOnHand: 0,
        quantityReserved: 0,
        lowStockThreshold: 15,
      };
    }

    const newOnHand = record.quantityOnHand + delta;
    if (newOnHand < 0) {
      throw new Error(`Adjustment would result in negative stock for ${variantId} at ${hub}`);
    }

    record.quantityOnHand = newOnHand;
    store.inventory.set(key, record);

    this.logAudit({
      action: 'STOCK_ADJUSTMENT',
      entityType: 'Inventory',
      entityId: key,
      actorRole: 'LOGISTICS_MANAGER',
      actorId,
      metadata: JSON.stringify({ hub, delta, reason, newOnHand }),
    });

    return record;
  }

  // ----------------------------------------------------
  // COUPONS & AUDIT LOGS
  // ----------------------------------------------------

  static async findCoupon(code: string): Promise<DbCoupon | null> {
    return store.coupons.get(code.toUpperCase().trim()) || null;
  }

  static async listCoupons(): Promise<DbCoupon[]> {
    return Array.from(store.coupons.values());
  }

  static async saveCoupon(coupon: DbCoupon): Promise<DbCoupon> {
    store.coupons.set(coupon.code.toUpperCase(), coupon);
    this.logAudit({
      action: 'COUPON_MUTATED',
      entityType: 'Coupon',
      entityId: coupon.code,
      actorRole: 'SUPER_ADMIN',
      actorId: 'admin',
      metadata: JSON.stringify({ code: coupon.code, discount: coupon.discount, isPercent: coupon.isPercent, minSpendEUR: coupon.minSpendEUR }),
    });
    return coupon;
  }

  static async incrementCouponUsage(code: string): Promise<void> {
    const c = store.coupons.get(code.toUpperCase());
    if (c) {
      c.usedCount += 1;
      store.coupons.set(code.toUpperCase(), c);
    }
  }

  /**
   * Sanitizes metadata to scrub credentials, private keys, IBANs, and auth tokens.
   */
  private static sanitizeAuditMetadata(metadata?: string): string | undefined {
    if (!metadata) return undefined;
    try {
      // Regex replace sensitive keys and values
      let sanitized = metadata
        .replace(/"(password|token|secret|privateKey|seedPhrase|cardNumber|cvv)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
        .replace(/"(iban)"\s*:\s*"([A-Z]{2}\d{2})[A-Z0-9]+([A-Z0-9]{4})"/gi, '"$1":"$2****$3"');
      return sanitized;
    } catch {
      return '[REDACTED]';
    }
  }

  static logAudit(log: Omit<DbAuditLog, 'id' | 'createdAt'>): DbAuditLog {
    const fullLog: DbAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      ...log,
      metadata: this.sanitizeAuditMetadata(log.metadata),
    };
    store.auditLogs.unshift(fullLog);
    return fullLog;
  }

  static getAuditLogs(): DbAuditLog[] {
    return store.auditLogs.slice(0, 100);
  }
}
