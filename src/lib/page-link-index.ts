import { NEWS_POSTS } from '@/domain/content/news-posts';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { CatalogService } from '@/lib/catalog';

export interface SiteLink {
  label: string;
  href: string;
}

/** Assigned queries from keywords.csv. Rejected and unassigned queries are not anchors. */
export const KEYWORD_LINKS: Array<{ label: string; path: string }> = [
  { label: 'Fusion chocolate bars', path: '/news/fusion-chocolate-bar' },
  { label: 'Fusion bars', path: '/news/fusion-chocolate-bar' },
  { label: 'Fusion bar', path: '/news/fusion-chocolate-bar' },
  { label: 'Fusion chocolate', path: '/news/fusion-chocolate-bar' },
  { label: 'Fusion chocolates', path: '/news/fusion-chocolate-bar' },
  { label: 'Chocolate fusion', path: '/news/fusion-chocolate-bar' },
  { label: 'Artisan chocolate', path: '/news/the-chocolate' },
  { label: 'Craft chocolate bars', path: '/news/the-chocolate' },
  { label: 'Mushroom bars', path: '/news/chocolate-and-botanicals' },
  { label: 'Mushroom bar', path: '/news/chocolate-and-botanicals' },
  { label: 'Mushrooms bar', path: '/news/chocolate-and-botanicals' },
  { label: 'Bar mushroom', path: '/news/chocolate-and-botanicals' },
];

const STORE_PAGES: Array<{ label: string; path: string }> = [
  { label: 'Home', path: '' },
  { label: 'Shop', path: '/shop' },
  { label: 'About', path: '/about' },
  { label: 'FAQs', path: '/faq' },
  { label: 'Shipping', path: '/shipping' },
  { label: 'Refunds', path: '/refunds' },
  { label: 'Contact', path: '/contact' },
  { label: 'News', path: '/news' },
  { label: 'Glossary', path: '/glossary' },
  { label: 'Compare the range', path: '/compare' },
  { label: 'Shop figures', path: '/figures' },
  { label: 'Customer ratings', path: '/reviews' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Terms', path: '/terms' },
  { label: 'Report a scam site', path: '/report-scam' },
];

/** Citations for claims the shop already publishes: lab checks, cacao, and EU food labelling. */
export const OUTBOUND_REFERENCES: SiteLink[] = [
  {
    label: 'ISO/IEC 17025',
    href: 'https://www.iso.org/ISO-IEC-17025-testing-and-calibration-laboratories.html',
  },
  {
    label: 'International Cocoa Organization',
    href: 'https://www.icco.org/',
  },
  {
    label: 'EU food information for consumers',
    href: 'https://food.ec.europa.eu/food-safety/labelling-and-nutrition/food-information-consumers-legislation_en',
  },
];

function withLocale(locale: string, path: string): string {
  return path ? `/${locale}${path}` : `/${locale}`;
}

function samePath(href: string, currentPath?: string): boolean {
  if (!currentPath) return false;
  const current = currentPath.split('?')[0].replace(/\/$/, '') || '/';
  const next = href.split('?')[0].replace(/\/$/, '') || '/';
  return current === next;
}

export function journalLinksForCategory(categorySlug: string): Array<{ label: string; path: string }> {
  if (categorySlug === 'artisan-chocolate-bars' || categorySlug === 'bundles-collections' || categorySlug === 'wholesale') {
    return [
      { label: 'Fusion chocolate bars', path: '/news/fusion-chocolate-bar' },
      { label: 'Artisan chocolate', path: '/news/the-chocolate' },
      { label: 'Craft chocolate bars', path: '/news/the-chocolate' },
    ];
  }
  if (categorySlug === 'gummies') {
    return [
      { label: 'What the gummies are', path: '/news/mushroom-gummies' },
      { label: 'Mushroom bars', path: '/news/chocolate-and-botanicals' },
    ];
  }
  return [
    { label: 'Fusion chocolate bars', path: '/news/fusion-chocolate-bar' },
    { label: 'Mushroom bars', path: '/news/chocolate-and-botanicals' },
  ];
}

export function pageLinkIndex(locale: string, currentPath?: string): {
  keywords: SiteLink[];
  store: SiteLink[];
  journal: SiteLink[];
  products: SiteLink[];
  outbound: SiteLink[];
} {
  const keywords = KEYWORD_LINKS
    .map((link) => ({ label: link.label, href: withLocale(locale, link.path) }))
    .filter((link) => !samePath(link.href, currentPath));

  const dedicated = new Set(['privacy', 'terms', 'refunds', 'shipping']);
  const legal = LegalGovernanceService.publicLinks()
    .filter((link) => !dedicated.has(link.type))
    .map((link) => ({ label: link.type, href: withLocale(locale, link.href) }));
  const company = Object.keys(LegalGovernanceService.publicProfile()).length > 0
    ? [{ label: 'Company information', href: withLocale(locale, '/legal/company') }]
    : [];

  const store = [...STORE_PAGES.map((link) => ({ label: link.label, href: withLocale(locale, link.path) })), ...legal, ...company]
    .filter((link) => !samePath(link.href, currentPath));

  const journal = NEWS_POSTS
    .map((post) => ({ label: post.title, href: withLocale(locale, `/news/${post.slug}`) }))
    .filter((link) => !samePath(link.href, currentPath));

  const products = CatalogService.getPublicProducts()
    .map((product) => ({ label: product.name, href: withLocale(locale, `/products/${product.slug}`) }))
    .filter((link) => !samePath(link.href, currentPath));

  return {
    keywords,
    store,
    journal,
    products,
    outbound: OUTBOUND_REFERENCES,
  };
}
