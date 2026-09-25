'use server';

import { CurrencyCode } from '../types';
import { OrderPricingService } from '../domain/orders/OrderPricingService';
import { ShippingService } from '../domain/shipping/ShippingService';
import { prisma } from '../lib/prisma';

export interface CheckoutQuoteInput {
  items: Array<{ variantId: string; quantity: number }>;
  currency: CurrencyCode;
  destinationCountry: string;
  shippingMethod: 'STANDARD' | 'EXPRESS';
  couponCode?: string;
}

/**
 * Server Action: Generates an authoritative checkout quote.
 * Validates shipping availability, free shipping threshold, and hub routing.
 */
export async function generateCheckoutQuoteAction(input: CheckoutQuoteInput) {
  try {
    const { items, currency, destinationCountry, shippingMethod, couponCode } = input;

    const quote = await OrderPricingService.resolveOrderPricing(
      items,
      currency,
      destinationCountry,
      shippingMethod,
      async (ids: string[]) => {
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
          return variants as any[];
        } catch {
          return [];
        }
      },
      couponCode,
      async (code: string) => {
        try {
          return await prisma.coupon.findUnique({
            where: { code: code.toUpperCase() },
          });
        } catch {
          return null;
        }
      }
    );

    const shippingInfo = ShippingService.calculateShipping({
      subtotal: quote.subtotal,
      currency,
      destinationCountry,
      selectedMethodCode: shippingMethod,
    });

    return {
      success: true,
      data: {
        ...quote,
        shippingInfo,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Checkout quote generation failed' };
  }
}
