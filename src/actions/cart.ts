'use server';

import { CurrencyCode } from '../types';
import { CartPricingService } from '../domain/cart/CartPricingService';
import { prisma } from '../lib/prisma';
import { CatalogService } from '@/lib/catalog';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { ensureAdminOverridesLoaded } from '@/domain/admin/AdminOverrideStore';
import { PublicationReadinessService } from '@/domain/catalog/PublicationReadinessService';

export interface CartActionInput {
  items: Array<{ variantId: string; quantity: number }>;
  currency: CurrencyCode;
  destinationCountry: string;
  shippingMethod?: 'STANDARD' | 'EXPRESS';
}

/**
 * Server Action: Authoritatively calculates cart pricing.
 * Client prices are NEVER accepted or used.
 */
export async function calculateCartAction(input: CartActionInput) {
  try {
    ensureAdminOverridesLoaded();
    const { items, currency, destinationCountry, shippingMethod = 'STANDARD' } = input;
    for (const item of items) {
      const product = CatalogService.getProducts().find((candidate) => candidate.variants.some((variant) => variant.id === item.variantId));
      if (product && !PublicationReadinessService.isPubliclyVisible(product.slug)) {
        return { success: false, error: 'This item is currently not available for purchase.' };
      }
    }

    const result = await CartPricingService.calculateCart({
      items,
      currency,
      destinationCountry,
      selectedShippingMethod: shippingMethod,
      fetchVariantsByIds: async (ids: string[]) => {
        try {
          const variants = await prisma.productVariant.findMany({
            where: { id: { in: ids } },
            include: {
              product: {
                select: {
                  id: true,
                  slug: true,
                  status: true,
                  availabilityType: true,
                  countryAvailability: true,
                },
              },
            },
          });
          const cataloguePrices = new Map(
            CatalogService.getProducts().flatMap((product) =>
              product.variants.map((item) => [item.id, { slug: product.slug, priceEUR: item.priceEUR, priceGBP: item.priceGBP }] as const)
            )
          );
          return variants.map((variant) => {
            const catalogueVariant = cataloguePrices.get(variant.id);
            if (!catalogueVariant || AdminOverrides.product(catalogueVariant.slug)?.priceEUR == null) return variant;
            return { ...variant, priceEUR: catalogueVariant.priceEUR, priceGBP: catalogueVariant.priceGBP };
          }) as any[];
        } catch {
          // Fallback if DB is unavailable during unit testing / static build
          return [];
        }
      },
    });

    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Cart calculation failed' };
  }
}
