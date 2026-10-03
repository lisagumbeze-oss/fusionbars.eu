import catalogueData from '@/data/consolidated-catalogue.json';
import { resolveDatabaseUrls } from '@/config/database-url';
import type { DbOrder } from '@/lib/commerce-repository';
import { PrismaClient, type Prisma } from '@prisma/client';

function directUrl(): string {
  resolveDatabaseUrls();
  const source = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
  const extra = new URLSearchParams();
  if (!source.includes('pool_timeout=')) extra.set('pool_timeout', '30');
  if (!source.includes('connection_limit=')) extra.set('connection_limit', '1');
  const query = extra.toString();
  if (!query) return source;
  return source.includes('?') ? `${source}&${query}` : `${source}?${query}`;
}

const database = new PrismaClient({
  datasources: { db: { url: directUrl() } },
  log: ['error'],
  errorFormat: 'minimal',
});

type CatalogueProduct = {
  id: string;
  slug: string;
  name: string;
  categorySlug?: string;
  categoryName?: string;
  status?: string;
  availabilityType?: string;
  variants?: Array<{
    id: string;
    sku: string;
    name: string;
    weightGrams?: number | null;
    priceEUR: number;
    priceGBP?: number | null;
    compareAtEUR?: number | null;
    compareAtGBP?: number | null;
    stockLevel?: number;
  }>;
};

const PRODUCTS = ((catalogueData as { products?: CatalogueProduct[] }).products || []);
const AVAILABILITY = new Set(['GLOBAL', 'REGION', 'COUNTRY', 'BLOCKED']);

function catalogueVariant(variantId: string) {
  for (const product of PRODUCTS) {
    const variant = product.variants?.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}

async function ensureVariant(tx: Prisma.TransactionClient, variantId: string) {
  const existing = await tx.productVariant.findUnique({ where: { id: variantId } });
  if (existing) return existing;
  const match = catalogueVariant(variantId);
  if (!match) throw new Error(`Variant ${variantId} is not a catalogue variant and has no ProductVariant row.`);
  const { product, variant } = match;
  if (!Number.isInteger(variant.priceEUR) || variant.priceEUR <= 0) {
    throw new Error(`Catalogue variant ${variantId} has no integer EUR price to store.`);
  }
  if (!Number.isInteger(variant.priceGBP) || (variant.priceGBP as number) <= 0) {
    throw new Error(`Catalogue variant ${variantId} has no integer GBP catalogue price to store. No conversion was applied.`);
  }
  const categorySlug = product.categorySlug || 'uncategorised';
  const category = await tx.category.upsert({
    where: { slug: categorySlug },
    update: {},
    create: {
      slug: categorySlug,
      name: product.categoryName || categorySlug,
    },
  });
  const availability = AVAILABILITY.has(product.availabilityType || '')
    ? (product.availabilityType as 'GLOBAL' | 'REGION' | 'COUNTRY' | 'BLOCKED')
    : 'REGION';
  await tx.product.upsert({
    where: { id: product.id },
    update: {},
    create: {
      id: product.id,
      sku: product.slug,
      slug: product.slug,
      categoryId: category.id,
      status: 'DRAFT',
      availabilityType: availability,
      basePriceEUR: variant.priceEUR,
      basePriceGBP: variant.priceGBP as number,
    },
  });
  return tx.productVariant.upsert({
    where: { id: variant.id },
    update: {},
    create: {
      id: variant.id,
      productId: product.id,
      sku: variant.sku,
      name: variant.name,
      weightGrams: variant.weightGrams || null,
      priceEUR: variant.priceEUR,
      priceGBP: variant.priceGBP as number,
      compareAtEUR: Number.isInteger(variant.compareAtEUR) ? variant.compareAtEUR : null,
      compareAtGBP: Number.isInteger(variant.compareAtGBP) ? variant.compareAtGBP : null,
      stockLevel: Number.isInteger(variant.stockLevel) ? (variant.stockLevel as number) : 0,
    },
  });
}

async function ensureStock(variantId: string, hub: string) {
  const location = await database.inventoryLocation.upsert({
    where: { code: hub },
    update: {},
    create: { code: hub, name: `${hub} Fulfilment Hub`, countryCode: hub },
  });
  const variant = catalogueVariant(variantId);
  const onHand = variant?.variant.stockLevel && variant.variant.stockLevel > 0 ? variant.variant.stockLevel : 0;
  await database.inventory.upsert({
    where: { variantId_locationId: { variantId, locationId: location.id } },
    update: {},
    create: { variantId, locationId: location.id, quantityOnHand: onHand, quantityReserved: 0 },
  });
  return location.id;
}

async function claimStock(tx: Prisma.TransactionClient, variantId: string, locationId: string, quantity: number) {
  const updated = await tx.$executeRaw`
    UPDATE "Inventory"
    SET "quantityReserved" = "quantityReserved" + ${quantity}
    WHERE "variantId" = ${variantId}
      AND "locationId" = ${locationId}
      AND ("quantityOnHand" - "quantityReserved") >= ${quantity}
  `;
  if (Number(updated) !== 1) throw new Error('INSUFFICIENT_STOCK');
}

export class OrderDatabasePersistence {
  static async persist(order: DbOrder): Promise<'PERSISTED'> {
    const existing = await database.order.findUnique({ where: { id: order.id } });
    if (existing) return 'PERSISTED';
    const stock: Array<{ variantId: string; locationId: string; quantity: number }> = [];
    for (const item of order.items) {
      await ensureVariant(database as unknown as Prisma.TransactionClient, item.variantId);
      stock.push({
        variantId: item.variantId,
        locationId: await ensureStock(item.variantId, order.shippingOriginHub || 'NL'),
        quantity: item.quantity,
      });
    }
    await database.$transaction(async (tx) => {
      const method = await tx.shippingMethod.findFirst({ where: { code: order.shippingMethodCode } });
      if (!method) throw new Error('SHIPPING_METHOD_MISSING');
      const created = await tx.order.create({
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          lookupToken: order.lookupToken,
          ...(order.customerId ? { customer: { connect: { id: order.customerId } } } : {}),
          guestEmail: order.guestEmail,
          guestPhone: order.guestPhone || null,
          currency: order.currency,
          subtotalAmount: order.subtotalAmount,
          discountAmount: order.discountAmount,
          shippingAmount: order.shippingAmount,
          totalAmount: order.totalAmount,
          status: order.status as 'PENDING_PAYMENT',
          shippingOriginHub: order.shippingOriginHub,
          shippingMethod: { connect: { id: method.id } },
          shippingAddress: {
            create: {
              firstName: order.shippingAddress.firstName,
              lastName: order.shippingAddress.lastName,
              streetAddress: order.shippingAddress.streetAddress,
              houseNumber: order.shippingAddress.houseNumber || null,
              city: order.shippingAddress.city,
              postalCode: order.shippingAddress.postalCode,
              countryCode: order.shippingAddress.countryCode,
              phone: order.shippingAddress.phone || null,
            },
          },
          discreetPackaging: order.discreetPackaging,
          items: {
            create: order.items.map((item) => ({
              variant: { connect: { id: item.variantId } },
              productName: item.productName,
              variantName: item.variantName,
              sku: item.sku,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
            })),
          },
        },
      });
      const paymentMethod = await tx.paymentMethod.findFirst({ where: { code: order.paymentMethodCode } });
      if (!paymentMethod) throw new Error('PAYMENT_METHOD_MISSING');
      await tx.paymentTransaction.create({
        data: {
          orderId: created.id,
          paymentMethodId: paymentMethod.id,
          amount: order.totalAmount,
          currency: order.currency,
          status: 'PENDING_CUSTOMER_ACTION',
          paymentReference: order.paymentReference || order.orderNumber,
        },
      });
      for (const item of stock) {
        await claimStock(tx, item.variantId, item.locationId, item.quantity);
      }
    }, { maxWait: 30000, timeout: 60000 });
    return 'PERSISTED';
  }

  static async rehearseIsolatedOrder(): Promise<{ persisted: boolean; rolledBack: boolean; concurrentWins: number }> {
    const stamp = Date.now();
    const order = {
      id: `ord_persist_${stamp}`,
      orderNumber: `FB-EU-PERSIST-${stamp}`,
      lookupToken: `tok_persist_${stamp}`,
      customerId: null,
      guestEmail: 'persist-rehearsal@example.test',
      guestPhone: null,
      currency: 'EUR' as const,
      subtotalAmount: 2000,
      discountAmount: 0,
      shippingAmount: 1500,
      totalAmount: 3500,
      status: 'PENDING_PAYMENT' as const,
      shippingOriginHub: 'NL' as const,
      shippingMethodCode: 'STANDARD' as const,
      shippingAddress: {
        firstName: 'Rehearsal',
        lastName: 'Fixture',
        streetAddress: 'Example Street 1',
        city: 'Amsterdam',
        postalCode: '1015 CJ',
        countryCode: 'NL',
      },
      items: [{
        id: `item_persist_${stamp}`,
        variantId: 'var_bar_1',
        productId: 'prod_fusion_artisan_chocolate_bar_6g',
        sku: 'FUS-BAR-6G-BIRTHD',
        productName: 'Fusion Artisan Mushroom Chocolate Bar (6g)',
        variantName: 'Fusion Chocolate Bar – Birthday Cake',
        unitPrice: 2000,
        quantity: 1,
        lineTotal: 2000,
      }],
      paymentMethodCode: 'SEPA_IBAN' as const,
      paymentReference: `FUSION-PERSIST-${stamp}`,
      discreetPackaging: true,
      statusHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.persist(order as DbOrder);
    const row = await database.order.findUnique({
      where: { id: order.id },
      include: { items: true, payments: true },
    });
    const persisted = Boolean(row && row.items[0]?.variantId === 'var_bar_1' && row.payments.length === 1);
    await database.order.delete({ where: { id: order.id } });
    await database.$executeRaw`
      UPDATE "Inventory"
      SET "quantityReserved" = GREATEST("quantityReserved" - 1, 0)
      WHERE "variantId" = 'var_bar_1'
    `;

    const failId = `ord_persist_fail_${stamp}`;
    let rolledBack = false;
    try {
      await this.persist({
        ...order,
        id: failId,
        orderNumber: `FB-EU-PERSIST-FAIL-${stamp}`,
        lookupToken: `tok_persist_fail_${stamp}`,
        items: [{ ...order.items[0], id: `item_fail_${stamp}`, quantity: 100000, lineTotal: 200000000 }],
        subtotalAmount: 200000000,
        totalAmount: 200000000,
      } as DbOrder);
    } catch {
      const leftover = await database.order.findUnique({ where: { id: failId } });
      rolledBack = leftover == null;
    }

    const concurrentWins = await this.rehearseConcurrency(stamp);
    return { persisted, rolledBack, concurrentWins };
  }

  private static async rehearseConcurrency(stamp: number): Promise<number> {
    const category = await database.category.upsert({
      where: { slug: 'fixture-concurrency' },
      update: {},
      create: { slug: 'fixture-concurrency', name: 'Fixture concurrency' },
    });
    const productId = `prod_fixture_concurrency_${stamp}`;
    const variantId = `var_fixture_concurrency_${stamp}`;
    await database.product.create({
      data: {
        id: productId,
        sku: `fixture-concurrency-${stamp}`,
        slug: `fixture-concurrency-${stamp}`,
        categoryId: category.id,
        status: 'DRAFT',
        availabilityType: 'REGION',
        basePriceEUR: 2000,
        basePriceGBP: 1750,
      },
    });
    await database.productVariant.create({
      data: {
        id: variantId,
        productId,
        sku: `fixture-concurrency-sku-${stamp}`,
        name: 'Fixture concurrency variant',
        priceEUR: 2000,
        priceGBP: 1750,
        stockLevel: 1,
      },
    });
    const location = await database.inventoryLocation.upsert({
      where: { code: 'NL' },
      update: {},
      create: { code: 'NL', name: 'Netherlands Fulfilment Hub', countryCode: 'NL' },
    });
    await database.inventory.create({
      data: { variantId, locationId: location.id, quantityOnHand: 1, quantityReserved: 0 },
    });
    const attempt = () => database.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
        UPDATE "Inventory"
        SET "quantityReserved" = "quantityReserved" + 1
        WHERE "variantId" = ${variantId}
          AND "locationId" = ${location.id}
          AND ("quantityOnHand" - "quantityReserved") >= 1
      `;
      if (Number(updated) !== 1) throw new Error('INSUFFICIENT_STOCK');
    }, { maxWait: 20000, timeout: 20000 });
    const results = await Promise.allSettled([attempt(), attempt()]);
    const wins = results.filter((item) => item.status === 'fulfilled').length;
    await database.product.delete({ where: { id: productId } });
    return wins;
  }

  static async close() {
    await database.$disconnect();
  }
}
