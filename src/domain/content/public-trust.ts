import { STORE_ADDRESS_LINE, UK_BRANCH_OFFICE_LINE } from '@/lib/store-address';

/** The journal is written by the shop. No person, portrait, or social profile is on file. */
export const SHOP_DESK = {
  name: 'Fusion Mushroom Bars EU',
  role: 'Shop desk',
  path: '/about#shop-desk',
  bio: 'These notes are written by the Fusion Mushroom Bars EU shop desk. They describe the bars, gummies, and boxes already in the shop, using the prices, hubs, and ordering rules printed on those pages. No named author, portrait, or social profile is published for the notes.',
} as const;

/** Customer star ratings are not a published record. Catalogue review is not a buyer score. */
export const CUSTOMER_RATINGS = {
  published: false as const,
  ratingValue: null,
  reviewCount: null,
  reason:
    'This shop does not publish a customer star rating. Catalogue review means a product description was approved for the store. It is not a score from a buyer. Ratings copied from other sites stay unpublished.',
} as const;

/** Subjects the shop already names. Checked against Wikidata on 2026-10-09. The brand itself has no item. */
export const SUBJECT_ENTITIES = [
  {
    name: 'Chocolate',
    wikipedia: 'https://en.wikipedia.org/wiki/Chocolate',
    wikidata: 'https://www.wikidata.org/wiki/Q195',
  },
  {
    name: 'Couverture chocolate',
    wikipedia: 'https://en.wikipedia.org/wiki/Couverture_chocolate',
    wikidata: 'https://www.wikidata.org/wiki/Q651462',
  },
  {
    name: 'Cocoa butter',
    wikipedia: 'https://en.wikipedia.org/wiki/Cocoa_butter',
    wikidata: 'https://www.wikidata.org/wiki/Q251106',
  },
  {
    name: 'ISO/IEC 17025',
    wikipedia: 'https://en.wikipedia.org/wiki/ISO/IEC_17025',
    wikidata: 'https://www.wikidata.org/wiki/Q2429378',
  },
] as const;

export const BRAND_ENCYCLOPEDIA = {
  wikipedia: null,
  wikidata: null,
  reason: 'Wikidata has no item for fusionbars.eu. This shop does not link a brand page that does not exist.',
} as const;

export function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** No Business Profile URL is on file. Map links only search the addresses already printed on the store. */
export const GOOGLE_BUSINESS_PROFILE = {
  profileUrl: null,
  reason:
    'No Google Business Profile URL is on file. A profile is created in Google by the business. The name and addresses below are the ones already printed on this store. A maps search is not a Business Profile, and no public telephone or opening hours are published.',
  places: [
    { label: 'Store address', query: STORE_ADDRESS_LINE },
    { label: 'UK branch office', query: UK_BRANCH_OFFICE_LINE },
  ],
} as const;
