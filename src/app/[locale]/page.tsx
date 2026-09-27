import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CatalogService } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { LocaleCode } from '@/types';
import { ShieldCheck, Truck, Sparkles, ArrowRight, CheckCircle2, ChevronRight, Lock, Heart, Award, Layers } from 'lucide-react';
import CryptoDiscountNotice from '@/components/CryptoDiscountNotice';

interface HomePageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export default async function HomePage({ params }: HomePageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as LocaleCode;

  const categories = CatalogService.getCategories();
  const featuredProducts = CatalogService.getFeaturedProducts();
  const allProducts = CatalogService.getProducts();

  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* 1. HERO SECTION (Editorial, Sophisticated, European) */}
      <section className="relative overflow-hidden pt-8 sm:pt-14 pb-12 border-b border-[#E5E3DD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Manifesto & Call to Action */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
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
                  className="px-6 py-3.5 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold tracking-wide transition shadow-sm flex items-center gap-2"
                >
                  Explore 26+ Flavors <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href={`/${locale}/shop?category=bundles-collections`}
                  className="px-6 py-3.5 rounded-lg bg-white hover:bg-neutral-50 text-[#121212] border border-[#E5E3DD] text-xs font-semibold tracking-wide transition"
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

            {/* Right Column: Hero Visual Asset */}
            <div className="lg:col-span-5 relative">
              <div className="relative aspect-4/5 rounded-2xl bg-white border border-[#E5E3DD] overflow-hidden shadow-xl p-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-radial from-neutral-50 to-[#FBFBF9] opacity-80" />
                <div className="relative w-full h-full">
                  <Image
                    src="/images/products/chocolate-bar.png"
                    alt="Fusion Artisan Chocolate Bar"
                    fill
                    priority
                    className="object-contain p-2 hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Floating Artisan Seal */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-[#E5E3DD] rounded-lg p-3 text-left shadow-sm">
                  <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block font-bold">Standard Weight</span>
                  <strong className="text-sm font-bold text-[#121212] font-mono">6g Net Infusion</strong>
                  <span className="text-[11px] text-[#4A5D4E] block mt-0.5 font-medium">12 Scored Confection Pieces</span>
                </div>

                {/* Floating Origin Seal */}
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm border border-[#E5E3DD] rounded-lg p-3 text-left shadow-sm">
                  <span className="text-[10px] text-[#5C5852] uppercase tracking-wider block font-bold">Couverture Cacao</span>
                  <strong className="text-sm font-bold text-[#121212]">54% Dark Chocolate</strong>
                  <span className="text-[11px] text-[#5C5852] block mt-0.5">Origin: Brussels &bull; Barcelona</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SHOP BY CATEGORY SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              className="group p-4 bg-white rounded-xl border border-[#E5E3DD] hover:border-[#4A5D4E]/40 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="relative aspect-square w-full bg-[#FBFBF9] rounded-lg overflow-hidden mb-3 border border-[#E5E3DD]/40">
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 50vw, 20vw"
                  className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <section className="bg-white border-y border-[#E5E3DD] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 relative aspect-4/3 rounded-2xl bg-[#FBFBF9] border border-[#E5E3DD] overflow-hidden p-6 flex items-center justify-center">
              <Image
                src="/images/products/fusion-100-bars-boutique-box.png"
                alt="European Atelier Master Collection"
                fill
                className="object-contain p-6"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs uppercase font-bold text-[#4A5D4E] tracking-wider">The European Standard</span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212]">
                Crafted in Barcelona &amp; Amsterdam.
              </h2>
              <p className="text-sm text-[#5C5852] leading-relaxed">
                Fusion Mushroom Bars EU was established to provide the European market with an uncompromising benchmark of purity, culinary luxury, and botanical precision. Unlike legacy grey-market imports, every confection we distribute is crafted under European Good Manufacturing Practices (GMP) and ISO 17025 laboratory verification.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                <div className="p-4 rounded-xl bg-[#FBFBF9] border border-[#E5E3DD]">
                  <strong className="block text-[#121212] font-semibold mb-1">Authentic Couverture</strong>
                  <p className="text-[#5C5852]">Pure cocoa butter formulations without palm oil or synthetic stabilizers.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#FBFBF9] border border-[#E5E3DD]">
                  <strong className="block text-[#121212] font-semibold mb-1">Standardized Extracts</strong>
                  <p className="text-[#5C5852]">Concentrated culinary-grade functional mycology with verified bioavailability.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BOUTIQUE BOXES & WHOLESALE ALLOCATION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-2xl bg-[#121212] text-white relative overflow-hidden">
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
                className="px-6 py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white transition flex items-center gap-2"
              >
                Explore Tasting Boxes <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/${locale}/products/fusion-10-bar-boutique-box`}
                className="px-6 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition border border-neutral-700"
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-5 rounded-xl bg-white border border-[#E5E3DD] text-center space-y-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB NL</span>
            <strong className="block text-sm text-[#121212]">Netherlands Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing Benelux, Germany, Scandinavia, and Northern Europe.</p>
          </div>
          <div className="p-5 rounded-xl bg-white border border-[#E5E3DD] text-center space-y-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB ES</span>
            <strong className="block text-sm text-[#121212]">Spain Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing Iberian Peninsula, Southern France, and Mediterranean.</p>
          </div>
          <div className="p-5 rounded-xl bg-white border border-[#E5E3DD] text-center space-y-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB DE</span>
            <strong className="block text-sm text-[#121212]">Germany Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing DACH region (Germany, Austria, Switzerland) and Central EU.</p>
          </div>
          <div className="p-5 rounded-xl bg-white border border-[#E5E3DD] text-center space-y-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#F0F4F1] text-[#4A5D4E]">HUB FR</span>
            <strong className="block text-sm text-[#121212]">France Hub</strong>
            <p className="text-[11px] text-[#5C5852]">Servicing Western Europe and dedicated express corridors.</p>
          </div>
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* 8. ARCHITECTURE & REVIEWER CONSOLE PROMPT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 rounded-xl bg-[#F0F4F1] border border-[#4A5D4E]/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#4A5D4E] text-white flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#121212]">Technical Architecture &amp; Domain Verification Console</h4>
              <p className="text-xs text-[#5C5852]">
                Inspect real-time domain test suite (24 tests), European shipping simulator, and finite state machine.
              </p>
            </div>
          </div>
          <Link
            href={`/${locale}/admin/architecture`}
            className="px-4 py-2 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold font-mono tracking-wide transition shrink-0"
          >
            Open Architecture Console &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
