import { MetadataRoute } from 'next';
import { CatalogService } from '@/lib/catalog';
import { NEWS_POSTS } from '@/domain/content/news-posts';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { INDEXABLE_LOCALE, SITE_ORIGIN, isPublishedLegalTranslation } from '@/lib/search-indexing';

const LEGAL_LOCALES = ['de', 'fr', 'es', 'it', 'nl'] as const;
const STORE_LEGAL_ROUTES = ['/privacy', '/terms', '/shipping', '/refunds'] as const;
const GOVERNANCE_LEGAL_TYPES = ['terms', 'privacy', 'cookies', 'refunds', 'shipping', 'payment', 'imprint'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    '',
    '/shop',
    '/about',
    '/faq',
    '/shipping',
    '/refunds',
    '/contact',
    '/news',
    '/glossary',
    '/compare',
    '/figures',
    '/reviews',
    '/privacy',
    '/terms',
    '/report-scam',
    ...LegalGovernanceService.publicLinks().map((link) => link.href),
  ];
  const products = CatalogService.getPublicProducts();
  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    sitemapEntries.push({
      url: `${SITE_ORIGIN}/${INDEXABLE_LOCALE}${route}`,
      lastModified: now,
      changeFrequency: route === '' ? 'daily' : route.startsWith('/legal') ? 'monthly' : 'weekly',
      priority: route === '' ? 1.0 : route === '/shop' ? 0.9 : 0.5,
    });
  }

  for (const post of NEWS_POSTS) {
    sitemapEntries.push({
      url: `${SITE_ORIGIN}/${INDEXABLE_LOCALE}/news/${post.slug}`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    });
  }

  for (const prod of products) {
    sitemapEntries.push({
      url: `${SITE_ORIGIN}/${INDEXABLE_LOCALE}/products/${prod.slug}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    });
  }

  for (const locale of LEGAL_LOCALES) {
    for (const route of STORE_LEGAL_ROUTES) {
      sitemapEntries.push({
        url: `${SITE_ORIGIN}/${locale}${route}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
    for (const type of GOVERNANCE_LEGAL_TYPES) {
      const path = `/${locale}/legal/${type}`;
      if (!isPublishedLegalTranslation(path)) continue;
      sitemapEntries.push({
        url: `${SITE_ORIGIN}${path}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.4,
      });
    }
  }

  return sitemapEntries;
}
