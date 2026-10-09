import { LegalGovernanceService, type LegalDocType, type LegalLocale } from '@/domain/legal/LegalGovernanceService';

const LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl'] as const;
const STORE_LEGAL_PATHS = new Set(['/privacy', '/terms', '/shipping', '/refunds']);
const GOVERNANCE_LEGAL = /^\/legal\/(terms|privacy|cookies|refunds|shipping|payment|imprint)$/;

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

function pathAfterLocale(pathname: string): string {
  const locale = localeFromPath(pathname);
  const withoutLocale = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '';
  const path = withoutLocale.split('?')[0];
  return path === '/' ? '' : path;
}

/** Privacy, terms, shipping, and refunds exist in every store locale. */
export function isStorefrontLegalPath(pathname: string): boolean {
  return STORE_LEGAL_PATHS.has(pathAfterLocale(pathname));
}

/** A /legal document is indexable only when that locale has its own published text. */
export function isPublishedLegalTranslation(pathname: string): boolean {
  const path = pathAfterLocale(pathname);
  const match = path.match(GOVERNANCE_LEGAL);
  if (!match) return false;
  const locale = localeFromPath(pathname);
  if (!(LOCALES as readonly string[]).includes(locale)) return false;
  const document = LegalGovernanceService.active(match[1] as LegalDocType, locale as LegalLocale);
  return Boolean(document && !document.fallback);
}

/** English URL for the catalogue. Legal pages keep the locale in the path. */
export function indexableUrl(pathname: string): string {
  const path = pathAfterLocale(pathname);
  const locale = isStorefrontLegalPath(pathname) || isPublishedLegalTranslation(pathname)
    ? localeFromPath(pathname)
    : INDEXABLE_LOCALE;
  return `${SITE_ORIGIN}/${locale}${path}`;
}

export function indexingRobots(locale: string, pathname: string): { index: boolean; follow: boolean } {
  if (isPrivateStorePath(pathname)) return { index: false, follow: false };
  if (isStorefrontLegalPath(pathname)) return { index: true, follow: true };
  if (GOVERNANCE_LEGAL.test(pathAfterLocale(pathname))) {
    return isPublishedLegalTranslation(pathname) ? { index: true, follow: true } : { index: false, follow: false };
  }
  if (locale !== INDEXABLE_LOCALE) return { index: false, follow: true };
  return { index: true, follow: true };
}

export function offerAvailability(status: StockAvailability | undefined): string {
  if (status === 'OUT_OF_STOCK') return 'https://schema.org/OutOfStock';
  if (status === 'LOW_STOCK') return 'https://schema.org/LimitedAvailability';
  return 'https://schema.org/InStock';
}
