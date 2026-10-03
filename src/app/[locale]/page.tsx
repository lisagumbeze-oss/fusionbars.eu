import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { CatalogService } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { LocaleCode } from '@/types';
import { ShieldCheck, Truck, Sparkles, ArrowRight, CheckCircle2, ChevronRight, Lock, Heart, Award } from 'lucide-react';
import CryptoDiscountNotice from '@/components/CryptoDiscountNotice';
import JsonLd from '@/components/seo/JsonLd';
import { publicPageMetadata } from '@/lib/page-metadata';
import { siteGraphJsonLd } from '@/lib/structured-data';

interface HomePageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const resolved = await params;
  return publicPageMetadata({
    locale: resolved.locale,
    path: `/${resolved.locale}`,
    title: 'Fusion Mushroom Bars EU | European Artisan Botanical Confections',
    description:
      'Official European storefront for Fusion Mushroom Bars. Gourmet Belgian couverture chocolate bars, fruit pectin gummies, and curator boxes. Temperature-controlled discreet European dispatch from NL, ES, DE, FR.',
  });
}

export default async function HomePage({ params }: HomePageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as LocaleCode;

  const categories = CatalogService.getCategories();
  const featuredProducts = CatalogService.getFeaturedProducts();
  const allProducts = CatalogService.getProducts();

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      <JsonLd data={siteGraphJsonLd()} />
      {/* 1. HERO SECTION (Editorial, Sophisticated, European) */}
      <section className="relative overflow-hidden border-b border-[#E5E3DD]">
        <div aria-hidden="true" className="hero-mesh pointer-events-none absolute inset-0" />
        <div className="relative grid grid-cols-1 items-stretch lg:grid-cols-2">
            {/* Left Column: Manifesto & Call to Action */}
            <div className="motion-rise space-y-6 px-4 py-10 text-center sm:px-6 sm:py-14 lg:py-16 lg:pl-[max(2rem,calc((100vw-80rem)/2+2rem))] lg:pr-12 lg:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#4A5D4E] bg-[#F0F4F1] px-3 py-1 rounded-full border border-[#4A5D4E]/20">
                <Sparkles className="w-3.5 h-3.5 text-[#4A5D4E]" />
                <span>Certified European Botanical Confections</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#121212] leading-[1.15]">
                Gourmet Belgian Cacao. <br className="hidden sm:inline" />
                <span className="italic font-normal text-[#4A5D4E]">Precision Mycology.</span>
              </h1>

              <p className="text-sm sm:text-base text-[#5C5852] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Hand-tempered single-origin Belgian chocolate infused with certified European functional botanicals. Handcrafted in registered European ateliers and dispatched in discreet, climate-regulated packaging.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href={`/${locale}/shop`}
                  className="px-6 py-3.5 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold tracking-wide transition shadow-sm flex items-center gap-2 motion-safe:active:scale-[0.98]"
                >
                  Explore 26+ Flavors <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={`/${locale}/shop?category=bundles-collections`}
                  className="px-6 py-3.5 rounded-lg bg-white hover:bg-neutral-50 text-[#121212] border border-[#E5E3DD] text-xs font-semibold tracking-wide transition motion-safe:active:scale-[0.98]"
                >
                  Curator Tasting Boxes
                </Link>
              </div>

              <CryptoDiscountNotice locale={locale} />

              {/* Trust Indicators (Quiet, unboxed inline metadata) */}
              <div className="pt-6 border-t border-[#E5E3DD]/80 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-[#5C5852]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4A5D4E]" />
                  <span>ISO 17025 Batch Audited</span>
                </div>
                <span className="text-[#8E8B85]" aria-hidden="true">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4A5D4E]" />
                  <span>Hubs in NL, ES, DE, FR</span>
                </div>
                <span className="text-[#8E8B85]" aria-hidden="true">&bull;</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4A5D4E]" />
                  <span>Free Courier over €300</span>
                </div>
              </div>
            </div>

            {/* Right Column: full-bleed hero photograph */}
            <div className="motion-rise motion-delay-2 relative min-h-[22rem] sm:min-h-[28rem] lg:min-h-[36rem]">
              <Image
                src="/images/products/reference/fusion-bars-display-cases.jpg"
                alt="Fusion chocolate bars in Heath, Cap'n Crunch, and Ferrero sleeves, with display cases"
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 50vw, 100vw"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 hidden w-28 bg-gradient-to-r from-[#FBFBF9] to-transparent lg:block"
              />

              <div className="glass-panel absolute top-4 right-4 rounded-xl p-3 text-left sm:top-6 sm:right-6">
                <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block font-bold">Standard Weight</span>
                <strong className="text-sm font-bold text-[#121212] font-mono">6g Net Infusion</strong>
                <span className="text-[11px] text-[#4A5D4E] block mt-0.5 font-medium">12 Scored Confection Pieces</span>
              </div>

              <div className="glass-panel absolute bottom-4 left-4 rounded-xl p-3 text-left sm:bottom-6 sm:left-6">
                <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block font-bold">Couverture Cacao</span>
                <strong className="text-sm font-bold text-[#121212]">54% Dark Chocolate</strong>
                <span className="text-[11px] text-[#5C5852] block mt-0.5">Origin: Brussels &bull; Barcelona</span>
              </div>
            </div>
        </div>
      </section>

      {/* 2. SHOP BY CATEGORY SECTION */}
      <section className="motion-reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">Curated Taxonomy</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212] mt-1">Shop by Collection</h2>
          </div>
          <Link
            href={`/${locale}/shop`}
            className="text-xs font-semibold text-[#4A5D4E] hover:text-[#3B4A3E] flex items-center gap-1 group"
          >
            <span>View Full Catalogue</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/${locale}/shop?category=${cat.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-[#E5E3DD] bg-white p-4 shadow-sm transition hover:border-[#4A5D4E]/40 hover:shadow-md motion-safe:hover:-translate-y-0.5"
            >
              <div className="relative aspect-square w-full bg-[#FBFBF9] rounded-lg overflow-hidden mb-3 border border-[#E5E3DD]/40">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  className="object-contain p-3 motion-safe:group-hover:scale-105 motion-safe:transition-transform motion-safe:duration-300"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#121212] group-hover:text-[#4A5D4E] transition line-clamp-1">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-[#5C5852] line-clamp-2 mt-1 leading-snug">
                  {cat.tagline}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS GRID */}
      <section className="motion-reveal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">European Favorites</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212] mt-1">Featured Artisan Selections</h2>
          </div>
          <div className="text-xs text-[#5C5852]">
            Authoritative Server-Recalculated Quotes
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. BRAND / QUALITY / BOTANICAL HARVEST STORY */}
      <section className="motion-reveal relative border-y border-[#E5E3DD] bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="relative min-h-72 sm:min-h-96 lg:min-h-[34rem]">
            <Image
              src="/images/products/reference/fusion-bars-display-cases.jpg"
              alt="Fusion chocolate bars in Heath, Cap'n Crunch, and Ferrero sleeves, with display cases"
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>

          <div className="relative z-10 flex items-center px-4 py-10 sm:px-6 lg:px-12 lg:py-16">
            <div className="glass-panel w-full max-w-xl space-y-6 rounded-2xl p-6 sm:p-8 lg:-ml-20">
              <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">The European Standard</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212]">
                Crafted in Barcelona &amp; Amsterdam.
              </h2>
              <p className="text-sm text-[#5C5852] leading-relaxed">
                Fusion Mushroom Bars EU was established to provide the European market with an uncompromising benchmark of purity, culinary luxury, and botanical precision. Unlike legacy grey-market imports, every confection we distribute is crafted under European Good Manufacturing Practices (GMP) and ISO 17025 laboratory verification.
              </p>

              <div className="grid grid-cols-1 gap-4 pt-2 text-xs sm:grid-cols-2">
                <div className="rounded-xl border border-[#E5E3DD] bg-[#FBFBF9] p-4">
                  <strong className="block text-[#121212] font-semibold mb-1">Authentic Couverture</strong>
                  <p className="text-[#5C5852]">Pure cocoa butter formulations without palm oil or synthetic stabilizers.</p>
                </div>
                <div className="rounded-xl border border-[#E5E3DD] bg-[#FBFBF9] p-4">
                  <strong className="block text-[#121212] font-semibold mb-1">Standardized Extracts</strong>
                  <p className="text-[#5C5852]">Concentrated culinary-grade functional mycology with verified bioavailability.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOUTIQUE BOXES & WHOLESALE ALLOCATION */}
      <section className="motion-reveal relative overflow-hidden bg-[#121212] text-white">
        <div aria-hidden="true" className="curator-wash pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs uppercase font-bold text-[#88A48D] tracking-wider">Curator Editions</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#FBFBF9]">
              Fusion Boutique Boxes: 10, 30, 50 &amp; 100 Bars.
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Curated for collective tasting clubs, hospitality, and connoisseurs. Every multi-bar box is individually foil-sealed and packed into insulated archival presentation boxes with complimentary European express courier dispatch.
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold">
              <Link
                href={`/${locale}/shop?category=bundles-collections`}
                className="px-6 py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white transition flex items-center gap-2 motion-safe:active:scale-[0.98]"
              >
                Explore Tasting Boxes <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/products/fusion-10-bar-boutique-box`}
                className="px-6 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition border border-neutral-700 motion-safe:active:scale-[0.98]"
              >
                10-Bar Tasting Selection (€150)
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DISCREET SHIPPING & FULFILMENT MATRIX */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">Logistical Integrity</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212] mt-1">
            Temperature-Guarded European Dispatch
          </h2>
          <p className="text-xs text-[#5C5852] mt-2 leading-relaxed">
            All orders are processed through optimal domestic courier routes originating from our four European logistics centers.
          </p>
        </div>

        <div className="hub-stagger grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
          <div className="space-y-2 rounded-xl border border-[#E5E3DD] bg-white p-5 text-center shadow-sm transition duration-300 hover:border-[#4A5D4E]/35 hover:shadow-md motion-safe:hover:-translate-y-1">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB NL</span>
            <strong className="block text-sm text-[#121212]">Netherlands Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing Benelux, Germany, Scandinavia, and Northern Europe.</p>
          </div>
          <div className="space-y-2 rounded-xl border border-[#E5E3DD] bg-white p-5 text-center shadow-sm transition duration-300 hover:border-[#4A5D4E]/35 hover:shadow-md motion-safe:hover:-translate-y-1">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB ES</span>
            <strong className="block text-sm text-[#121212]">Spain Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing Iberian Peninsula, Southern France, and Mediterranean.</p>
          </div>
          <div className="space-y-2 rounded-xl border border-[#E5E3DD] bg-white p-5 text-center shadow-sm transition duration-300 hover:border-[#4A5D4E]/35 hover:shadow-md motion-safe:hover:-translate-y-1">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB DE</span>
            <strong className="block text-sm text-[#121212]">Germany Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing DACH region (Germany, Austria, Switzerland) and Central EU.</p>
          </div>
          <div className="space-y-2 rounded-xl border border-[#E5E3DD] bg-white p-5 text-center shadow-sm transition duration-300 hover:border-[#4A5D4E]/35 hover:shadow-md motion-safe:hover:-translate-y-1">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB FR</span>
            <strong className="block text-sm text-[#121212]">France Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing Western Europe and dedicated express corridors.</p>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="motion-reveal max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">Client Inquiries</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212] mt-1">Frequently Asked Questions</h2>
        </div>

        <div className="divide-y divide-[#E5E3DD] bg-white rounded-2xl border border-[#E5E3DD] p-6 sm:p-8 space-y-4 text-xs">
          <div className="pt-3">
            <h3 className="font-bold text-sm text-[#121212] mb-1">What does discreet packaging entail?</h3>
            <p className="text-[#5C5852] leading-relaxed">
              Every parcel is shipped in a generic, plain cardboard mailer or thermal envelope. The exterior displays only standard courier delivery barcodes and a generic commercial return address with zero mention of mushroom or confectionery branding.
            </p>
          </div>

          <div className="pt-4">
            <h3 className="font-bold text-sm text-[#121212] mb-1">What payment methods are supported?</h3>
            <p className="text-[#5C5852] leading-relaxed">
              In accordance with European merchant guidelines, we accept direct Bank Transfer (SEPA / IBAN) and cryptocurrency (Bitcoin, Ethereum, and Bitcoin Cash). Paying with cryptocurrency saves 10% on the merchandise subtotal. Shipping is unchanged. Credit cards and PayPal are not active on this store.
            </p>
          </div>

          <div className="pt-4">
            <h3 className="font-bold text-sm text-[#121212] mb-1">How does free shipping work?</h3>
            <p className="text-[#5C5852] leading-relaxed">
              Orders of €300 (or £260) or greater automatically qualify for complimentary European Standard Courier dispatch.
            </p>
          </div>

          <div className="pt-4">
            <h3 className="font-bold text-sm text-[#121212] mb-1">What is the shelf life and recommended storage?</h3>
            <p className="text-[#5C5852] leading-relaxed">
              Our artisan chocolate bars have an unopened shelf life of 12 months when stored in a cool, dry place between 14&deg;C and 18&deg;C. Refrigeration is not required unless ambient temperatures exceed 24&deg;C.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
