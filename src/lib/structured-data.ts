import { SITE_ORIGIN, indexableUrl } from '@/lib/search-indexing';

export const SITE_NAME = 'Fusion Mushroom Bars EU';

/** Public asset URL. Absolute URLs are left unchanged. */
export function absoluteAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function isoDate(displayDate: string): string | undefined {
  const parsed = new Date(displayDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
}

export function breadcrumbList(items: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http') ? item.path : `${SITE_ORIGIN}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

/** Organization and WebSite facts already published on the store. No search box: shop search is not an indexable document. */
export function siteGraphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_ORIGIN}/#organization`,
        name: SITE_NAME,
        url: SITE_ORIGIN,
        email: 'sales@fusionbars.eu',
        logo: absoluteAssetUrl('/images/brand/fusion-logo.jpg'),
        areaServed: 'Europe',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: SITE_NAME,
        inLanguage: 'en',
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
      },
    ],
  };
}

export function articleJsonLd(post: { title: string; summary: string; date: string; slug: string }) {
  const published = isoDate(post.date);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    ...(published ? { datePublished: published, dateModified: published } : {}),
    inLanguage: 'en',
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_ORIGIN },
    publisher: { '@id': `${SITE_ORIGIN}/#organization` },
    mainEntityOfPage: indexableUrl(`/en/news/${post.slug}`),
  };
}
