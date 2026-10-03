const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl'] as const;

export const SITE_ORIGIN = 'https://fusionbars.eu';

/** Customer links use the canonical origin. Browser Host headers are not accepted. */
export function customerAbsoluteUrl(path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.includes('\\') || path.includes('localhost')) {
    throw new Error('Customer URLs are built from the canonical origin only.');
  }
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${normalized}`;
}
export const INDEXABLE_LOCALE = 'en';

export type StockAvailability = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function localeFromPath(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[0] || '';
  return (LOCALES as readonly string[]).includes(segment) ? segment : INDEXABLE_LOCALE;
}

export function isPrivateStorePath(pathname: string): boolean {
  return /\/(admin|account|cart|checkout|orders|track)(\/|$)/.test(pathname);
}

/** English URL for the same path. Query filters are not separate documents. */
export function indexableUrl(pathname: string): string {
  const locale = localeFromPath(pathname);
  const withoutLocale = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '';
  const path = withoutLocale.split('?')[0];
  return `${SITE_ORIGIN}/${INDEXABLE_LOCALE}${path === '/' ? '' : path}`;
}

export function indexingRobots(locale: string, pathname: string): { index: boolean; follow: boolean } {
  if (isPrivateStorePath(pathname)) return { index: false, follow: false };
  if (locale !== INDEXABLE_LOCALE) return { index: false, follow: true };
  return { index: true, follow: true };
}

export function offerAvailability(status: StockAvailability | undefined): string {
  if (status === 'OUT_OF_STOCK') return 'https://schema.org/OutOfStock';
  if (status === 'LOW_STOCK') return 'https://schema.org/LimitedAvailability';
  return 'https://schema.org/InStock';
}
