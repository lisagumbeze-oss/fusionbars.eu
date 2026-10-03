import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOCALES = new Set(['en', 'de', 'fr', 'es', 'it', 'nl']);

export function proxy(request: NextRequest) {
  const segment = request.nextUrl.pathname.split('/').filter(Boolean)[0] || '';
  const locale = LOCALES.has(segment) ? segment : 'en';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  requestHeaders.set('x-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|api/).*)'],
};
