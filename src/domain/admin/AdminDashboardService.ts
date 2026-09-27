import firstBatchState from '@/data/catalogue-first-batch-state.json';
import { CatalogService } from '@/lib/catalog';
import { CommerceRepository } from '@/lib/commerce-repository';
import { ShippingService } from '@/domain/shipping/ShippingService';
import { PaymentConfigService } from '@/domain/payments/PaymentConfig';
import { CANONICAL_ORDER_STATUSES, OrderStatus } from '@/types';
import { SUPPORTED_LOCALES } from '@/i18n';

export const PRODUCTION_CONTROL_STATE = 'PAUSED' as const;

export interface CatalogueOperationsSnapshot {
  available: boolean;
  error?: string;
  totalProducts: number;
  batchSize: number;
  dataPending: number;
  dataAdjudicated: number;
  dataDeferred: number;
  pricingPending: number;
  compliancePending: number;
  countryPending: number;
  contentInternal: number;
  mediaVerified: number;
  mediaReview: number;
  translationPending: number;
  publicationNotReady: number;
  publicationReady: number;
  published: number;
  doNotPublish: number;
  specialistPending: number;
  products: Array<{
    slug: string;
    name: string;
    data: string;
    pricing: string;
    compliance: string;
    country: string;
    content: string;
    media: string;
    translation: string;
    publication: string;
  }>;
}

export interface AdminSettingsSnapshot {
  storeName: string;
  supportEmail: string;
  currencies: string[];
  languages: string[];
  shipping: {
    standardCents: number;
    expressCents: number;
    freeThresholdCents: number;
    hubs: string[];
  };
  payments: {
    bankConfigured: boolean;
    cryptoConfigured: boolean;
    publicMethods: string[];
  };
  email: {
    provider: string;
    sender: string;
    keyConfigured: boolean;
  };
  security: {
    sessionSecretConfigured: boolean;
    authSecretConfigured: boolean;
    distributedRateLimit: boolean;
  };
}

function readJson(): any {
  return firstBatchState;
}

function boardOf(product: any): Record<string, string> | null {
  const board = product?.lastSummary?.statusBoard;
  if (!board || typeof board !== 'object') return null;
  return board;
}

export class AdminDashboardService {
  static catalogueSnapshot(): CatalogueOperationsSnapshot {
    const totalProducts = CatalogService.getProducts().length;
    const state = readJson();
    if (!state || !Array.isArray(state.selectedSlugs)) {
      return {
        available: false,
        error: 'Catalogue review state is unavailable.',
        totalProducts,
        batchSize: 0,
        dataPending: 0,
        dataAdjudicated: 0,
        dataDeferred: 0,
        pricingPending: 0,
        compliancePending: 0,
        countryPending: 0,
        contentInternal: 0,
        mediaVerified: 0,
        mediaReview: 0,
        translationPending: 0,
        publicationNotReady: 0,
        publicationReady: 0,
        published: 0,
        doNotPublish: 0,
        specialistPending: 0,
        products: [],
      };
    }

    const products = (state.selectedSlugs as string[]).map((slug) => {
      const record = state.products?.[slug] || {};
      const board = boardOf(record) || {};
      const catalogue = CatalogService.getProductBySlug(slug);
      return {
        slug,
        name: catalogue?.name || record.packet?.name || slug,
        data: board.data || 'UNKNOWN',
        pricing: board.pricing || 'UNKNOWN',
        compliance: board.compliance || 'UNKNOWN',
        country: board.country || 'UNKNOWN',
        content: board.content || 'UNKNOWN',
        media: board.media || 'UNKNOWN',
        translation: board.translation || 'UNKNOWN',
        publication: board.publication || record.publicationDisposition || 'UNKNOWN',
        deferred: Array.isArray(record.deferredSections) && record.deferredSections.length > 0,
      };
    });

    const count = (predicate: (row: (typeof products)[number]) => boolean) => products.filter(predicate).length;
    const publicationReady = count((row) => row.publication === 'READY_FOR_PUBLICATION');
    const published = count((row) => row.publication === 'PUBLISHED');
    return {
      available: true,
      totalProducts,
      batchSize: products.length,
      dataPending: count((row) => row.data !== 'ADJUDICATED'),
      dataAdjudicated: count((row) => row.data === 'ADJUDICATED'),
      dataDeferred: count((row) => row.deferred),
      pricingPending: count((row) => row.pricing === 'PRICE_REVIEW_PENDING'),
      compliancePending: count((row) => row.compliance === 'REQUIRES_REVIEW'),
      countryPending: count((row) => row.country === 'NOT_CONFIGURED'),
      contentInternal: count((row) => row.content === 'INTERNAL_SOURCE_ONLY'),
      mediaVerified: count((row) => row.media === 'VERIFIED'),
      mediaReview: count((row) => row.media === 'MEDIA_REVIEW'),
      translationPending: count((row) => row.translation === 'PENDING'),
      publicationNotReady: count((row) => row.publication === 'NOT_READY'),
      publicationReady,
      published,
      doNotPublish: count((row) => row.publication === 'DO_NOT_PUBLISH'),
      specialistPending: count((row) => row.publication !== 'READY_FOR_PUBLICATION' && row.publication !== 'PUBLISHED'),
      products: products.map(({ deferred: _deferred, ...row }) => row),
    };
  }

  static countOrders(orders: Array<{ status?: string }>): Record<OrderStatus, number> {
    const counts = Object.fromEntries(CANONICAL_ORDER_STATUSES.map((status) => [status, 0])) as Record<OrderStatus, number>;
    for (const order of orders) {
      if (order.status && order.status in counts) counts[order.status as OrderStatus] += 1;
    }
    return counts;
  }

  static inventorySummary(records: Array<{ quantityOnHand?: number; quantityReserved?: number; lowStockThreshold?: number }>) {
    let lowStock = 0;
    let outOfStock = 0;
    let reserved = 0;
    for (const record of records) {
      const onHand = record.quantityOnHand || 0;
      const held = record.quantityReserved || 0;
      const threshold = record.lowStockThreshold ?? 0;
      if (onHand <= 0) outOfStock += 1;
      else if (threshold > 0 && onHand <= threshold) lowStock += 1;
      if (held > 0) reserved += 1;
    }
    return { lowStock, outOfStock, reserved };
  }

  static settingsSnapshot(): AdminSettingsSnapshot {
    const rates = ShippingService.RATES.EUR;
    return {
      storeName: 'Fusion Mushroom Bars EU',
      supportEmail: 'sales@fusionbars.eu',
      currencies: ['EUR', 'GBP'],
      languages: [...SUPPORTED_LOCALES],
      shipping: {
        standardCents: rates.STANDARD,
        expressCents: rates.EXPRESS,
        freeThresholdCents: rates.FREE_THRESHOLD,
        hubs: Object.keys(ShippingService.FULFILMENT_HUBS),
      },
      payments: {
        bankConfigured: Boolean(process.env.BANK_IBAN && process.env.BANK_BIC_SWIFT && process.env.BANK_ACCOUNT_HOLDER && process.env.BANK_NAME),
        cryptoConfigured: Boolean(process.env.CRYPTO_BTC_ADDRESS && process.env.CRYPTO_USDT_ADDRESS),
        publicMethods: PaymentConfigService.getPublicPaymentOptions().map((option) => option.name),
      },
      email: {
        provider: process.env.EMAIL_PROVIDER || 'mock',
        sender: 'sales@fusionbars.eu',
        keyConfigured: Boolean(process.env.EMAIL_PROVIDER_KEY),
      },
      security: {
        sessionSecretConfigured: Boolean(process.env.SESSION_SECRET),
        authSecretConfigured: Boolean(process.env.AUTH_SECRET),
        distributedRateLimit: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      },
    };
  }

  static auditEntries() {
    const commerce = CommerceRepository.getAuditLogs().map((entry) => ({
      id: entry.id,
      timestamp: entry.createdAt,
      actor: entry.actorId,
      role: entry.actorRole,
      entity: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      category: entry.entityType,
      severity: entry.action.includes('REJECT') || entry.action.includes('BLOCK') ? 'warning' : 'info',
    }));
    const state = readJson();
    const catalogue = Array.isArray(state?.auditTrail)
      ? state.auditTrail.slice(0, 200).map((entry: any) => ({
          id: entry.id || `${entry.action}-${entry.timestamp}`,
          timestamp: entry.timestamp,
          actor: entry.actor,
          role: entry.actorRole,
          entity: 'Catalogue',
          entityId: entry.product,
          action: entry.action,
          category: entry.field || 'catalogue',
          severity: entry.decision === 'DO_NOT_PUBLISH' ? 'warning' : 'info',
        }))
      : [];
    return [...catalogue, ...commerce].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  }

  static productAdminView(slug: string) {
    const product = CatalogService.getProductBySlug(slug);
    const state = readJson();
    const record = state?.products?.[slug] || null;
    const board = boardOf(record);
    const audits = Array.isArray(state?.auditTrail)
      ? state.auditTrail.filter((entry: any) => entry.product === slug).slice(0, 40)
      : [];
    if (!product && !record) return null;
    return {
      slug,
      identity: {
        name: product?.name || slug,
        brand: product?.brand || '',
        category: product?.categoryName || '',
        importStatus: product?.status || '',
        reviewStatus: product?.reviewStatus || '',
        sku: product?.variants?.[0]?.sku || '',
      },
      provenance: {
        sourceCount: product?.sourceCount || 0,
        repositories: product?.sourceRepositories || [],
      },
      media: {
        primary: product?.primaryImage || '',
        gallery: product?.galleryImages || [],
        governance: board?.media || 'UNKNOWN',
      },
      pricing: {
        cataloguePriceEUR: product?.variants?.[0]?.priceEUR ?? null,
        governance: board?.pricing || 'UNKNOWN',
        approvedCommercialPrice: null as number | null,
      },
      compliance: {
        catalogueClassification: product?.complianceClassification || 'REQUIRES_REVIEW',
        governance: board?.compliance || 'UNKNOWN',
      },
      countries: {
        availabilityType: product?.availabilityType || 'NOT_CONFIGURED',
        allowedCountries: product?.allowedCountries || [],
        governance: board?.country || 'UNKNOWN',
      },
      content: {
        sourceDescription: product?.description || '',
        governance: board?.content || 'UNKNOWN',
        approvedPublicContent: '',
      },
      translations: {
        governance: board?.translation || 'UNKNOWN',
        locales: ['en', 'de', 'fr', 'es', 'it', 'nl'],
      },
      publication: {
        governance: board?.publication || record?.publicationDisposition || 'UNKNOWN',
        published: false,
      },
      audit: audits.map((entry: any) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        actor: entry.actor,
        role: entry.actorRole,
        action: entry.action,
        field: entry.field,
        decision: entry.decision,
      })),
    };
  }

  static customerDirectory(orders: Array<any>) {
    const byEmail = new Map<string, any>();
    for (const order of orders) {
      const email = order.guestEmail;
      if (!email) continue;
      const existing = byEmail.get(email);
      if (!existing || String(order.createdAt) > String(existing.lastOrderAt)) {
        byEmail.set(email, {
          email,
          name: `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
          country: order.shippingAddress?.countryCode || '',
          accountStatus: order.customerId ? 'Registered' : 'Guest checkout',
          lastOrder: order.orderNumber,
          lastOrderAt: order.createdAt,
          orderCount: (existing?.orderCount || 0) + 1,
          registeredAt: order.customerId ? order.createdAt : '',
        });
      } else {
        existing.orderCount += 1;
      }
    }
    return Array.from(byEmail.values());
  }
}
