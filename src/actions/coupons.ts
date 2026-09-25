'use server';

import { couponCreateSchema } from '../validation/schemas';
import { CommerceRepository, DbCoupon } from '../lib/commerce-repository';
import { RBACService } from '../domain/auth/RBACService';
import { RoleName } from '../types';

/**
 * Server Action: Validates a customer coupon code for checkout.
 */
export async function validateCouponAction(code: string, subtotalEUR: number) {
  try {
    if (!code || code.trim().length === 0) {
      return { success: false, error: 'Please enter a coupon code.' };
    }

    const coupon = await CommerceRepository.findCoupon(code);
    if (!coupon || !coupon.isActive) {
      return { success: false, error: 'Invalid or inactive coupon code.' };
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'This coupon code has expired.' };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { success: false, error: 'This coupon has reached its maximum redemption limit.' };
    }

    if (subtotalEUR < coupon.minSpendEUR) {
      const minSpendFormatted = (coupon.minSpendEUR / 100).toFixed(2);
      return {
        success: false,
        error: `Coupon requires a minimum order subtotal of €${minSpendFormatted}.`,
      };
    }

    return {
      success: true,
      coupon: {
        code: coupon.code,
        discount: coupon.discount,
        isPercent: coupon.isPercent,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Creates a new promotional coupon (Admin).
 */
export async function createCouponAction(rawInput: unknown, actorRole: RoleName = 'SUPER_ADMIN') {
  try {
    const hasPermission = RBACService.hasPermission(actorRole, 'settings:write') || actorRole === 'SUPER_ADMIN';
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized to configure promotions.' };
    }

    const validated = couponCreateSchema.parse(rawInput);
    const created = await CommerceRepository.saveCoupon({
      code: validated.code,
      discount: validated.discount,
      isPercent: validated.isPercent,
      minSpendEUR: validated.minSpendEUR,
      maxUses: validated.maxUses,
      usedCount: 0,
      expiresAt: validated.expiresAt,
      isActive: true,
    });

    return {
      success: true,
      coupon: created,
      message: `Coupon ${created.code} activated.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create coupon' };
  }
}
