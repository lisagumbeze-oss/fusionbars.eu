import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/account/',
          '/cart/',
          '/checkout/',
          '/orders/',
          '/track/',
          '/api/',
          '/*/admin/',
          '/*/account/',
          '/*/cart/',
          '/*/checkout/',
          '/*/orders/',
          '/*/track/',
        ],
      },
    ],
    sitemap: 'https://fusionbars.eu/sitemap.xml',
  };
}
