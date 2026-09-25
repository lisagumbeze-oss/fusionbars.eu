import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface CrawledCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  url: string;
  imageUrl: string | null;
  parentSlug: string | null;
  productCount: number;
  rawPayload: any;
  hash: string;
}

interface CrawledProduct {
  id: string;
  sourceRecordId: string;
  name: string;
  slug: string;
  permalink: string;
  sku: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  price: number | null;
  regularPrice: number | null;
  salePrice: number | null;
  currency: string;
  stockStatus: string | null;
  stockQuantity: number | null;
  weight: string | null;
  dimensions: string | null;
  attributes: Record<string, string>;
  variations: any[];
  flavor: string | null;
  size: string | null;
  packSize: string | null;
  netContent: string | null;
  ingredients: string | null;
  allergens: string | null;
  effects: string | null;
  servingInfo: string | null;
  dosageInfo: string | null;
  warnings: string | null;
  usageInfo: string | null;
  tags: string[];
  isFeatured: boolean;
  reviewCount: number;
  averageRating: number | null;
  reviews: any[];
  relatedProducts: string[];
  upsells: string[];
  crossSells: string[];
  badges: string[];
  availability: string | null;
  publishedDate: string | null;
  modifiedDate: string | null;
  canonicalUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  structuredData: any[];
  primaryImage: string | null;
  galleryImages: string[];
  additionalMedia: string[];
  embeddedVideo: string | null;
  rawHtmlLength: number;
  hash: string;
  capturedAt: string;
  rawPayload: any;
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithRetry(url: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      return await res.text();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

function cleanHtml(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, '-')
    .replace(/&#038;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function crawlReferenceSite(): Promise<{
  categories: CrawledCategory[];
  products: CrawledProduct[];
}> {
  console.log('=== CRAWLING REFERENCE WEBSITE (https://fusionbarshop.com/) ===');

  const snapshotDir = path.join(process.cwd(), 'src/data/imported/snapshots/reference');
  if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

  // 1. Crawl shop pagination & category pages to discover all products & categories
  const shopPages = [
    'https://fusionbarshop.com/shop/',
    'https://fusionbarshop.com/shop/page/2/',
    'https://fusionbarshop.com/shop/page/3/',
    'https://fusionbarshop.com/shop/page/4/',
    'https://fusionbarshop.com/shop/page/5/',
  ];

  const knownCategories = [
    {
      name: 'FUSION COLABORATION',
      slug: 'fusion-colaboration',
      url: 'https://fusionbarshop.com/product-category/fusion-colaboration/',
    },
    {
      name: 'FUSION GUMMIES',
      slug: 'fusion-gummies',
      url: 'https://fusionbarshop.com/product-category/fusion-gummies/',
    },
    {
      name: 'FUSION MUSHROOM BARS',
      slug: 'fusion-mushroom-bars',
      url: 'https://fusionbarshop.com/product-category/fusion-mushroom-bars/',
    },
    {
      name: 'Uncategorized',
      slug: 'uncategorized',
      url: 'https://fusionbarshop.com/product-category/uncategorized/',
    },
  ];

  // Map to hold shop listing data (price, rating, ID, etc.)
  interface ListingSummary {
    sourceRecordId: string;
    name: string;
    url: string;
    slug: string;
    category: string;
    price: number | null;
    rating: number | null;
    image: string | null;
    stockStatus: string | null;
  }
  const listingMap = new Map<string, ListingSummary>();

  for (const pageUrl of shopPages) {
    console.log(`Fetching shop page: ${pageUrl}`);
    try {
      const html = await fetchWithRetry(pageUrl);
      const hash = crypto.createHash('sha256').update(html).digest('hex');
      fs.writeFileSync(
        path.join(snapshotDir, `shop-page-${pageUrl.replace(/[^a-z0-9]/gi, '_')}.html`),
        html
      );

      // Extract products from WooCommerce grid
      const itemBlocks = [...html.matchAll(/<div class=\"product-small col [^\"]*type-product post-(\d+)[^\"]*status-publish\s*([^\"<]*)\"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/gi)];

      // Alternative regex if container closure varies
      const matches = itemBlocks.length > 0 ? itemBlocks : [...html.matchAll(/<div class=\"product-small col [^\"]*post-(\d+)[^\"]*\"([\s\S]*?)(?=<div class=\"product-small col|\s*$)/gi)];

      for (const m of matches) {
        const id = m[1];
        const block = m[0];

        const linkMatch = block.match(/href=\"(https:\/\/fusionbarshop\.com\/product\/[^\"]+)\"/i);
        if (!linkMatch) continue;
        const prodUrl = linkMatch[1].split('#')[0].split('?')[0];
        const slug = prodUrl.split('/').filter(Boolean).pop() || '';

        const titleMatch = block.match(/class=\"[^\"]*product-title[^\"]*\"[^>]*><a[^>]*>([\s\S]*?)<\/a>/i) ||
          block.match(/<a class=\"woocommerce-LoopProduct-link[^>]*>([\s\S]*?)<\/a>/i);
        const name = cleanHtml(titleMatch?.[1] || slug);

        const catMatch = block.match(/class=\"category uppercase[^\"]*\">([\s\S]*?)<\/p>/i);
        const category = cleanHtml(catMatch?.[1] || 'Uncategorized');

        const priceMatch = block.match(/<span class=\"woocommerce-Price-amount amount\"><bdi><span class=\"woocommerce-Price-currencySymbol\"[^>]*>&#36;<\/span>([0-9.]+)<\/bdi><\/span>/i);
        const price = priceMatch ? parseFloat(priceMatch[1]) : null;

        const ratingMatch = block.match(/class=\"rating\">([0-9.]+)<\/strong>/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        const imgMatch = block.match(/<img[^>]+src=\"([^\"]+)\"/i);
        const image = imgMatch ? imgMatch[1] : null;

        const stockStatus = block.includes('instock') ? 'instock' : block.includes('outofstock') ? 'outofstock' : 'instock';

        listingMap.set(prodUrl, {
          sourceRecordId: id,
          name,
          url: prodUrl,
          slug,
          category,
          price,
          rating,
          image,
          stockStatus,
        });
      }
    } catch (e: any) {
      console.error(`Error on ${pageUrl}:`, e.message);
    }
  }

  console.log(`Discovered ${listingMap.size} products from shop pagination.`);

  // If any product URLs from sitemap were missed, add them
  const sitemapRes = await fetchWithRetry('https://fusionbarshop.com/product-sitemap.xml');
  const sitemapUrls = [...sitemapRes.matchAll(/<loc>(https:\/\/fusionbarshop\.com\/product\/[^<]+)<\/loc>/g)].map(
    (m) => m[1]
  );
  for (const sUrl of sitemapUrls) {
    if (!listingMap.has(sUrl)) {
      const slug = sUrl.split('/').filter(Boolean).pop() || '';
      listingMap.set(sUrl, {
        sourceRecordId: `gen-${slug}`,
        name: slug.replace(/-/g, ' ').toUpperCase(),
        url: sUrl,
        slug,
        category: 'Uncategorized',
        price: null,
        rating: null,
        image: null,
        stockStatus: 'instock',
      });
    }
  }

  console.log(`Total unique product URLs to crawl: ${listingMap.size}`);

  // 2. Crawl and parse Categories
  const crawledCategories: CrawledCategory[] = [];
  for (const cat of knownCategories) {
    console.log(`Fetching category: ${cat.name} (${cat.url})`);
    try {
      const html = await fetchWithRetry(cat.url);
      const hash = crypto.createHash('sha256').update(html).digest('hex');
      fs.writeFileSync(path.join(snapshotDir, `category-${cat.slug}.html`), html);

      const descMatch = html.match(/<div class=\"term-description\">([\s\S]*?)<\/div>/i);
      const desc = cleanHtml(descMatch?.[1] || '');

      const ogImgMatch = html.match(/<meta property=\"og:image\" content=\"([^\"]*)\"/i);
      const ogImg = ogImgMatch?.[1] || null;

      // Count products in this category
      let catProdCount = 0;
      for (const item of listingMap.values()) {
        if (
          item.category.toLowerCase().replace(/[^a-z0-9]/g, '') ===
          cat.name.toLowerCase().replace(/[^a-z0-9]/g, '')
        ) {
          catProdCount++;
        }
      }

      crawledCategories.push({
        id: `RAW-CAT-REF-${cat.slug}`,
        name: cat.name,
        slug: cat.slug,
        description: desc,
        url: cat.url,
        imageUrl: ogImg,
        parentSlug: null,
        productCount: catProdCount,
        rawPayload: {
          name: cat.name,
          slug: cat.slug,
          url: cat.url,
          description: desc,
          ogImage: ogImg,
        },
        hash,
      });
    } catch (e: any) {
      console.error(`Error crawling category ${cat.name}:`, e.message);
    }
  }

  // 3. Crawl every single product detail page
  const crawledProducts: CrawledProduct[] = [];
  let index = 0;

  for (const [prodUrl, summary] of listingMap.entries()) {
    index++;
    console.log(`[${index}/${listingMap.size}] Crawling product: ${summary.slug}`);

    try {
      // Use cached snapshot if exists, otherwise fetch
      const cachedFile = path.join(snapshotDir, `product-${summary.slug}.html`);
      let html: string;
      if (fs.existsSync(cachedFile)) {
        html = fs.readFileSync(cachedFile, 'utf8');
      } else {
        html = await fetchWithRetry(prodUrl);
        fs.writeFileSync(cachedFile, html);
      }
      const hash = crypto.createHash('sha256').update(html).digest('hex');

      // Parse JSON-LD metadata
      const jsonLds = [...html.matchAll(/<script type=\"application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/gi)]
        .map((m) => {
          try {
            return JSON.parse(m[1]);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      let jsonLdProduct: any = null;
      for (const jld of jsonLds) {
        if (jld['@graph']) {
          for (const item of jld['@graph']) {
            if (
              item['@type'] === 'Product' ||
              (Array.isArray(item['@type']) && item['@type'].includes('Product'))
            ) {
              jsonLdProduct = item;
              break;
            }
          }
        } else if (
          jld['@type'] === 'Product' ||
          (Array.isArray(jld['@type']) && jld['@type'].includes('Product'))
        ) {
          jsonLdProduct = jld;
          break;
        }
      }

      // Title
      const titleMatch = html.match(/<h1[^>]*class=\"[^\"]*product_title[^\"]*\"[^>]*>([\s\S]*?)<\/h1>/i);
      const name = cleanHtml(titleMatch?.[1] || jsonLdProduct?.name || summary.name);

      // Post ID
      const bodyClass = html.match(/<body[^>]*class=\"([^\"]*)\"/i)?.[1] || '';
      const postId =
        bodyClass.match(/postid-(\d+)/)?.[1] ||
        html.match(/id=\"product-(\d+)\"/)?.[1] ||
        summary.sourceRecordId;

      // Price
      let price = summary.price;
      let regularPrice: number | null = null;
      let salePrice: number | null = null;

      if (jsonLdProduct?.offers) {
        const offer = Array.isArray(jsonLdProduct.offers) ? jsonLdProduct.offers[0] : jsonLdProduct.offers;
        if (offer?.price) price = parseFloat(offer.price);
      }

      const regularMatch = html.match(/<del[^>]*>[\s\S]*?&#36;([0-9.]+)[\s\S]*?<\/del>/i);
      if (regularMatch) regularPrice = parseFloat(regularMatch[1]);
      const insMatch = html.match(/<ins[^>]*>[\s\S]*?&#36;([0-9.]+)[\s\S]*?<\/ins>/i);
      if (insMatch) salePrice = parseFloat(insMatch[1]);

      if (salePrice && !price) price = salePrice;
      if (regularPrice && !price) price = regularPrice;

      // SKU
      const skuMatch = html.match(/<span class=\"sku\">([\s\S]*?)<\/span>/i);
      const sku = skuMatch ? cleanHtml(skuMatch[1]) : jsonLdProduct?.sku || null;

      // Short & Full Description
      const shortDescMatch = html.match(/<div class=\"woocommerce-product-details__short-description\">([\s\S]*?)<\/div>/i);
      const shortDescription = shortDescMatch ? cleanHtml(shortDescMatch[1]) : null;

      const fullDescMatch =
        html.match(/<div[^>]*id=\"tab-description\"[^>]*>([\s\S]*?)<\/div>/i) ||
        html.match(/<div class=\"woocommerce-Tabs-panel--description[^\"]*\"[^>]*>([\s\S]*?)<\/div>/i);
      const fullDescription = fullDescMatch
        ? cleanHtml(fullDescMatch[1])
        : jsonLdProduct?.description || shortDescription;

      // Category from page
      const catMatches = [...html.matchAll(/class=\"posted_in\"[\s\S]*?<a[^>]*rel=\"tag\">([^<]+)<\/a>/gi)].map((m) =>
        cleanHtml(m[1])
      );
      const category = catMatches[0] || summary.category;

      // Tags
      const tagMatches = [...html.matchAll(/class=\"tagged_as\"[\s\S]*?<a[^>]*rel=\"tag\">([^<]+)<\/a>/gi)].map((m) =>
        cleanHtml(m[1])
      );
      const tags = tagMatches.length > 0 ? tagMatches : [];

      // Primary Image & Gallery
      let primaryImage: string | null = jsonLdProduct?.image || null;
      if (typeof primaryImage === 'object' && (primaryImage as any)?.url) {
        primaryImage = (primaryImage as any).url;
      }
      if (!primaryImage) {
        const ogImg = html.match(/<meta property=\"og:image\" content=\"([^\"]*)\"/i);
        if (ogImg) primaryImage = ogImg[1];
      }
      if (!primaryImage) {
        primaryImage = summary.image;
      }

      // Collect all product images on page
      const galleryImages: string[] = [];
      const imgTags = [...html.matchAll(/<img[^>]+src=\"([^\"]+)\"[^>]*>/gi)].map((m) => m[1]);
      for (const src of imgTags) {
        if (
          src.includes('/wp-content/uploads/') &&
          !src.includes('logo') &&
          !src.includes('banner') &&
          !src.includes('100x100') &&
          src !== primaryImage &&
          !galleryImages.includes(src)
        ) {
          galleryImages.push(src);
        }
      }

      // Reviews & Ratings
      let averageRating = summary.rating;
      let reviewCount = 0;
      if (jsonLdProduct?.aggregateRating) {
        if (jsonLdProduct.aggregateRating.ratingValue) {
          averageRating = parseFloat(jsonLdProduct.aggregateRating.ratingValue);
        }
        if (jsonLdProduct.aggregateRating.reviewCount) {
          reviewCount = parseInt(jsonLdProduct.aggregateRating.reviewCount, 10);
        }
      }
      const reviews: any[] = [];
      const reviewBlocks = [...html.matchAll(/<div[^>]*id=\"comment-(\d+)\"[^>]*class=\"[^\"]*comment_container[^\"]*\"[^>]*>([\s\S]*?)<\/div>\s*<\/li>/gi)];
      for (const rb of reviewBlocks) {
        const rId = rb[1];
        const rContent = rb[2];
        const author = cleanHtml(rContent.match(/<strong[^>]*class=\"woocommerce-review__author\">([\s\S]*?)<\/strong>/i)?.[1]);
        const rRatingMatch = rContent.match(/class=\"rating\">([0-9.]+)<\/strong>/i);
        const rRating = rRatingMatch ? parseFloat(rRatingMatch[1]) : 5.0;
        const rBody = cleanHtml(rContent.match(/<div class=\"description\">([\s\S]*?)<\/div>/i)?.[1]);
        const rDate = cleanHtml(rContent.match(/class=\"woocommerce-review__published-date\"[^>]*>([\s\S]*?)<\/time>/i)?.[1]);
        if (author || rBody) {
          reviews.push({
            sourceReviewId: rId,
            authorName: author || 'Customer',
            rating: rRating,
            body: rBody || '',
            reviewDate: rDate,
            isVerifiedBuyer: rContent.includes('verified') || rContent.includes('verified-owner'),
          });
        }
      }
      if (reviews.length > 0 && reviewCount === 0) reviewCount = reviews.length;

      // SEO & Meta
      const seoTitle = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || null;
      const seoDescription = html.match(/<meta name=\"description\" content=\"([^\"]*)\"/i)?.[1] || null;
      const ogImg = html.match(/<meta property=\"og:image\" content=\"([^\"]*)\"/i)?.[1] || null;
      const canonical = html.match(/<link rel=\"canonical\" href=\"([^\"]*)\"/i)?.[1] || null;

      // Extract details from full description text (effects, ingredients, weight, dosage)
      const descText = fullDescription || '';
      let weight: string | null = null;
      if (descText.match(/(\d+\s*g(?:ram)?s?)/i)) {
        weight = descText.match(/(\d+\s*g(?:ram)?s?)/i)![1];
      }
      let flavor: string | null = null;
      if (summary.slug.startsWith('fusion-bar-')) {
        flavor = summary.slug.replace('fusion-bar-', '').replace(/-/g, ' ');
      } else if (summary.slug.startsWith('fusion-')) {
        flavor = summary.slug.replace('fusion-', '').replace(/-/g, ' ');
      }

      // Check attributes tab
      const attributes: Record<string, string> = {};
      const attrMatches = [...html.matchAll(/<th class=\"woocommerce-product-attributes-item__label\">([\s\S]*?)<\/th>[\s\S]*?<td class=\"woocommerce-product-attributes-item__value\">([\s\S]*?)<\/td>/gi)];
      for (const am of attrMatches) {
        const k = cleanHtml(am[1]);
        const v = cleanHtml(am[2]);
        if (k && v) attributes[k] = v;
      }

      // Related Products
      const relMatches = [...html.matchAll(/class=\"related products\"[\s\S]*?href=\"(https:\/\/fusionbarshop\.com\/product\/[^\"]+)\"/gi)].map(
        (m) => m[1].split('#')[0].split('?')[0]
      );
      const relatedProducts = [...new Set(relMatches)].filter((u) => u !== prodUrl);

      // Build complete CrawledProduct record
      const crawledProduct: CrawledProduct = {
        id: `RAW-REF-${String(index).padStart(4, '0')}`,
        sourceRecordId: postId,
        name,
        slug: summary.slug,
        permalink: prodUrl,
        sku,
        category,
        subcategory: null,
        brand: 'Fusion',
        shortDescription,
        fullDescription,
        price,
        regularPrice,
        salePrice,
        currency: 'USD',
        stockStatus: summary.stockStatus || 'instock',
        stockQuantity: null,
        weight,
        dimensions: null,
        attributes,
        variations: [],
        flavor,
        size: null,
        packSize: summary.slug.includes('10-bars') ? '10 Bars' : summary.slug.includes('100-bars') ? '100 Bars' : 'Single',
        netContent: weight || (category.includes('BARS') ? '6g' : category.includes('GUMMIES') ? '4000mg' : null),
        ingredients: descText.includes('Ingredient') ? descText.slice(descText.indexOf('Ingredient'), descText.indexOf('Ingredient') + 200) : null,
        allergens: null,
        effects: descText.includes('Effect') ? descText.slice(descText.indexOf('Effect'), descText.indexOf('Effect') + 200) : null,
        servingInfo: null,
        dosageInfo: descText.includes('Dosage') ? descText.slice(descText.indexOf('Dosage'), descText.indexOf('Dosage') + 200) : null,
        warnings: null,
        usageInfo: null,
        tags,
        isFeatured: false,
        reviewCount,
        averageRating,
        reviews,
        relatedProducts,
        upsells: [],
        crossSells: [],
        badges: [],
        availability: 'AVAILABLE',
        publishedDate: null,
        modifiedDate: null,
        canonicalUrl: canonical,
        seoTitle,
        seoDescription,
        ogImage: ogImg,
        structuredData: jsonLds,
        primaryImage,
        galleryImages,
        additionalMedia: [],
        embeddedVideo: null,
        rawHtmlLength: html.length,
        hash,
        capturedAt: new Date().toISOString(),
        rawPayload: {
          sourceRecordId: postId,
          name,
          slug: summary.slug,
          permalink: prodUrl,
          price,
          category,
          tags,
          primaryImage,
          galleryImages,
          fullDescription,
          shortDescription,
          sku,
          averageRating,
          reviewCount,
          reviews,
          seoTitle,
          seoDescription,
          canonical,
          jsonLd: jsonLdProduct,
        },
      };

      crawledProducts.push(crawledProduct);
    } catch (e: any) {
      console.error(`Failed to crawl product ${prodUrl}:`, e.message);
    }
  }

  // Save the complete crawled datasets
  const outDir = path.join(process.cwd(), 'src/data/imported');
  fs.writeFileSync(
    path.join(outDir, 'reference-crawled-categories.json'),
    JSON.stringify(crawledCategories, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, 'reference-crawled-products.json'),
    JSON.stringify(crawledProducts, null, 2)
  );

  console.log(`\n=== REFERENCE CRAWL COMPLETE ===`);
  console.log(`Categories Crawled: ${crawledCategories.length}`);
  console.log(`Products Crawled: ${crawledProducts.length}`);

  return { categories: crawledCategories, products: crawledProducts };
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  crawlReferenceSite().catch((err) => {
    console.error('Fatal crawler error:', err);
    process.exit(1);
  });
}
