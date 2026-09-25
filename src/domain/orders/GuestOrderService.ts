// ===================================================
// FUSION MUSHROOM BARS EU - GUEST ORDER SERVICE
// Cryptographically Signed Order Access & Security Gate
// ===================================================

import crypto from 'crypto';
import { CommerceRepository, DbOrder } from '@/lib/commerce-repository';

export class GuestOrderService {
  private static readonly SECRET = process.env.ORDER_LOOKUP_SECRET || 'fusion-eu-order-lookup-secret-2026';

  /**
   * Generates an opaque, cryptographically verifiable access token for guest orders.
   * Format: `tok_fb_${randomBytes}`
   */
  static generateLookupToken(orderNumber: string, email?: string): string {
    const safeEmail = (email || 'guest@fusionbars.eu').toLowerCase().trim();
    const randomSalt = crypto.randomBytes(12).toString('hex');
    const hmac = crypto
      .createHmac('sha256', this.SECRET)
      .update(`${orderNumber}:${safeEmail}:${randomSalt}`)
      .digest('hex')
      .substring(0, 24);
    return `tok_fb_${hmac}`;
  }

  /**
   * Securely retrieves an order for a guest.
   * REQUIRES EITHER:
   * 1. A valid signed lookup token, OR
   * 2. The exact combination of Order Number AND the exact Email address matching the order.
   * 
   * Strictly prevents enumeration attacks where an attacker guesses sequential order numbers.
   */
  static async secureLookup(query: {
    token?: string;
    orderNumber?: string;
    email?: string;
  }): Promise<{ order: DbOrder | null; error?: string }> {
    // 1. Direct Token Access
    if (query.token && query.token.trim().length > 0) {
      const order = await CommerceRepository.findOrderByLookupToken(query.token.trim());
      if (!order) {
        return { order: null, error: 'Invalid or expired order access link.' };
      }
      return { order };
    }

    // 2. Dual-Factor Verification: Order Number + Email
    if (query.orderNumber && query.email) {
      const normalizedNumber = query.orderNumber.trim().toUpperCase();
      const normalizedEmail = query.email.trim().toLowerCase();

      const order = await CommerceRepository.findOrderByIdOrNumber(normalizedNumber);
      if (!order) {
        return { order: null, error: 'No order matched the provided reference and email address.' };
      }

      // STRICT AUTH CHECK: Guest email must match exactly
      if (order.guestEmail.toLowerCase() !== normalizedEmail) {
        return { order: null, error: 'No order matched the provided reference and email address.' };
      }

      return { order };
    }

    return {
      order: null,
      error: 'Either a secure access token or both order reference and email address are required.',
    };
  }
}
