import { createHash, timingSafeEqual } from 'crypto';
import { AuthService } from '@/domain/auth/AuthService';
import { AuthSessionUser } from '@/types';

export const ADMIN_SESSION_COOKIE = 'fb_admin_session';

function sameSecret(left: string, right: string): boolean {
  const a = createHash('sha256').update(left).digest();
  const b = createHash('sha256').update(right).digest();
  return timingSafeEqual(a, b);
}

export class AdminAuthService {
  static credentials(): { email: string; password: string } | null {
    const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || '';
    if (!email || password.length < 12) return null;
    return { email, password };
  }

  static authenticate(email: string, password: string): { token: string } | null {
    const expected = this.credentials();
    if (!expected) return null;
    const emailMatches = sameSecret(email.trim().toLowerCase(), expected.email);
    const passwordMatches = sameSecret(password, expected.password);
    if (!emailMatches || !passwordMatches) return null;
    return {
      token: AuthService.generateSessionToken({
        id: 'super-admin',
        email: expected.email,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      }),
    };
  }

  static sessionFromToken(token: string | undefined | null): AuthSessionUser | null {
    if (!token) return null;
    const session = AuthService.verifySessionToken(token);
    if (!session || session.role !== 'SUPER_ADMIN') return null;
    return session;
  }
}
