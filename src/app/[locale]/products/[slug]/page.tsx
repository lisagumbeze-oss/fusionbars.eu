import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CatalogService } from '@/lib/catalog';
import ProductDetailClient from './ProductDetailClient';
import ProductCard from '@/components/ProductCard';
import { LocaleCode } from '@/types';
import type { Metadata } from 'next';

interface ProductDetailPageProps {
  params: Promise<{ locale: string; slug: string }> | { locale: string; slug: string };
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const resolved = await params;
  const product = CatalogService.getProductBySlug(resolved.slug);
  if (!product) return { title: 'Product Not Found | Fusion EU' };

  return {
    title: `${product.name} | Fusion Mushroom Bars EU`,
    description: product.shortDescription,
    alternates: {
      canonical: `https://fusionbars.eu/${resolved.locale}/products/${product.slug}`,
    },
    openGraph: {
      title: `${product.name} | Fusion Mushroom Bars EU`,
      description: product.shortDescription,
      url: `https://fusionbars.eu/${resolved.locale}/products/${product.slug}`,
      images: [
        {
          url: product.primaryImage.startsWith('http')
            ? product.primaryImage
            : `https://fusionbars.eu${product.primaryImage}`,
          width: 800,
          height: 800,
          alt: product.name,
        },
      ],
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as LocaleCode;
  const slug = resolvedParams.slug;

  const product = CatalogService.getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const relatedProducts = CatalogService.getRelatedProducts(slug, 4);

  // Schema.org Product JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: `https://fusionbars.eu${product.primaryImage}`,
    description: product.description,
    brand: {
      '@type': 'Brand',
      name: product.brand,
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: (product.variants[0]?.priceEUR || 2000) / 100,
      availability: 'https://schema.org/InStock',
      url: `https://fusionbars.eu/${locale}/products/${product.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
        {/* Breadcrumb Bar */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
          <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}/shop`} className="hover:text-[#121212] transition">Shop</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/${locale}/shop?category=${product.categorySlug}`} className="hover:text-[#121212] transition">
            {product.categoryName}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#121212] font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Client Interactive Product Detail Engine */}
        <ProductDetailClient product={product} />

        {/* Related Products Carousel / Grid */}
        {relatedProducts.length > 0 && (
          <section className="pt-10 border-t border-[#E5E3DD] space-y-6">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">Related Selections</span>
                <h3 className="font-serif text-2xl font-bold text-[#121212] mt-1">You May Also Appreciate</h3>
              </div>
              <Link href={`/${locale}/shop?category=${product.categorySlug}`} className="text-xs text-[#4A5D4E] font-semibold hover:underline">
                View All in {product.categoryName} &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
