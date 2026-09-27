import { MetadataRoute } from 'next';
import { SUPPORTED_LOCALES } from '@/i18n';
import { CatalogService } from '@/lib/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://fusionbars.eu';
  const now = new Date();

  const staticRoutes = [
    '',
    '/shop',
    '/contact',
    '/legal/privacy',
    '/legal/terms',
    '/legal/refunds',
    '/legal/shipping',
    '/legal/cookies',
    '/legal/imprint',
  ];

  const categories = CatalogService.getCategories();
  const products = CatalogService.getPublicProducts();

  const sitemapEntries: MetadataRoute.Sitemap = [];

  for (const locale of SUPPORTED_LOCALES) {
    // 1. Static Pages
    for (const route of staticRoutes) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: now,
        changeFrequency: route === '' ? 'daily' : route.startsWith('/legal') ? 'monthly' : 'weekly',
        priority: route === '' ? 1.0 : route === '/shop' ? 0.9 : 0.5,
      });
    }

    // 2. Curated Categories
    for (const cat of categories) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/shop?category=${cat.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }

    // 3. Published Artisan Products
    for (const prod of products) {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}/products/${prod.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.85,
      });
    }
  }

  return sitemapEntries;
}
