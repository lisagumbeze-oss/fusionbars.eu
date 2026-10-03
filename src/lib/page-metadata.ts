import type { Metadata } from 'next';
import { indexableUrl, indexingRobots } from '@/lib/search-indexing';

const SITE_NAME = 'Fusion Mushroom Bars EU';

export function publicPageMetadata(input: {
  locale: string;
  path: string;
  title: string;
  description: string;
  robots?: { index: boolean; follow: boolean };
  image?: { url: string; alt: string; width?: number; height?: number };
  openGraphType?: 'website' | 'article';
}): Metadata {
  const canonical = indexableUrl(input.path);
  const robots = input.robots ?? indexingRobots(input.locale, input.path);
  return {
    title: input.title,
    description: input.description,
    robots,
    alternates: { canonical },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: 'en_EU',
      type: input.openGraphType ?? 'website',
      ...(input.image
        ? {
            images: [
              {
                url: input.image.url,
                alt: input.image.alt,
                width: input.image.width,
                height: input.image.height,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      ...(input.image ? { images: [input.image.url] } : {}),
    },
  };
}
