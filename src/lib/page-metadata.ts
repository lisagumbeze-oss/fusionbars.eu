import type { Metadata } from 'next';
import { indexableUrl, indexingRobots } from '@/lib/search-indexing';

const SITE_NAME = 'Fusion Mushroom Bars EU';

export const OG_IMAGE = {
  url: '/images/brand/og-image.png',
  width: 512,
  height: 512,
  alt: 'Fusion',
} as const;

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
      images: [
        input.image
          ? {
              url: input.image.url,
              alt: input.image.alt,
              width: input.image.width,
              height: input.image.height,
            }
          : OG_IMAGE,
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [input.image?.url ?? OG_IMAGE.url],
    },
  };
}
