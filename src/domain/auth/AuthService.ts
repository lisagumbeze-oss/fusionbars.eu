// ===================================================
// FUSION MUSHROOM BARS EU - AUTHENTICATION SERVICE
// Cryptographic Sessions & Password Security
// ===================================================

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AuthSessionUser, RoleName } from '@/types';
import { RBACService } from './RBACService';

export interface SessionTokenPayload {
  sub: string; // User ID
  email: string;
  name?: string | null;
  role: RoleName;
  iat: number;
  exp: number;
}

export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12;
  private static readonly SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

  /**
   * Hashes a plaintext password securely using bcrypt.
   */
  static async hashPassword(plaintext: string): Promise<string> {
    if (!plaintext || plaintext.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    return await bcrypt.hash(plaintext, this.BCRYPT_ROUNDS);
  }

  /**
   * Verifies a candidate plaintext password against an existing hash.
   */
  static async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    if (!plaintext || !hash) return false;
    return await bcrypt.compare(plaintext, hash);
  }

  /**
   * Generates a signed session token.
   */
  static generateSessionToken(user: { id: string; email: string; name?: string | null; role: RoleName }, expiresAtSeconds?: number): string {
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: now,
      exp: expiresAtSeconds ?? now + this.SESSION_DURATION_SECONDS,
    };

    // JSON base64 encoding with signature mock/stub for zero-dependency node compatibility
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', this.sessionSecret()).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  }

  private static sessionSecret(): string {
    const secret = process.env.SESSION_SECRET || '';
    if (process.env.NODE_ENV === 'production') {
      if (secret.length < 32) throw new Error('PRODUCTION_SECRET_TOO_WEAK');
      return secret;
    }
    return secret || 'fusion-eu-secure-session-secret-2026';
  }

  /**
   * Validates a session token and extracts the authenticated user profile.
   */
  static verifySessionToken(token: string): AuthSessionUser | null {
    try {
      if (!token || typeof token !== 'string') return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerB64, bodyB64, sigB64] = parts;
      let secret: string;
      try {
        secret = this.sessionSecret();
      } catch {
        return null;
      }
      const expectedSig = crypto.createHmac('sha256', secret).update(`${headerB64}.${bodyB64}`).digest('base64url');
      const actual = Buffer.from(sigB64);
      const expected = Buffer.from(expectedSig);
      if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
        return null;
      }

      const payload: SessionTokenPayload = JSON.parse(Buffer.from(bodyB64, 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp < now) {
        return null; // Expired session
      }

      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        permissions: RBACService.hasPermission(payload.role, '*') ? ['*'] : [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Standard cookie configuration flags for production compliance.
   */
  static getCookieOptions(): {
    name: string;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict';
    path: string;
    maxAge: number;
  } {
    return {
      name: 'fb_session',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: this.SESSION_DURATION_SECONDS,
    };
  }
}
