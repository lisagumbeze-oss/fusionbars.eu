import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService } from '@/domain/auth/AuthService';
import { ADMIN_SESSION_COOKIE } from '@/domain/auth/AdminAuthService';

const LOCALES = 'en|de|fr|es|it|nl';

function isSuperAdmin(request: NextRequest): boolean {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? AuthService.verifySessionToken(token) : null;
  return session?.role === 'SUPER_ADMIN';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(new RegExp(`^/(${LOCALES})/admin(?:/|$)`));
  if (!match) return NextResponse.next();

  const locale = match[1];
  const isLogin = pathname === `/${locale}/admin/login` || pathname.startsWith(`/${locale}/admin/login/`);
  const signedIn = isSuperAdmin(request);

  if (isLogin) {
    if (signedIn) return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
    const headers = new Headers(request.headers);
    headers.set('x-admin-route', 'login');
    return NextResponse.next({ request: { headers } });
  }

  if (!signedIn) {
    const loginUrl = new URL(`/${locale}/admin/login`, request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const headers = new Headers(request.headers);
  headers.set('x-admin-route', 'console');
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    '/(en|de|fr|es|it|nl)/admin',
    '/(en|de|fr|es|it|nl)/admin/:path*',
  ],
};
