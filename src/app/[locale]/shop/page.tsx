import React from 'react';
import Link from 'next/link';
import { CatalogService } from '@/lib/catalog';
import ProductCard from '@/components/ProductCard';
import { LocaleCode } from '@/types';
import { getDictionary } from '@/i18n';
import { ArrowLeft } from 'lucide-react';
import ShopFilters from '@/components/ShopFilters';

interface ShopPageProps {
  params: Promise<{ locale: string }> | { locale: string };
  searchParams: Promise<{ category?: string; sort?: string; search?: string }> | { category?: string; sort?: string; search?: string };
}

export default async function ShopPage({ params, searchParams }: ShopPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as LocaleCode;
  const resolvedQuery = await searchParams;

  const currentCategorySlug = resolvedQuery.category || 'all';
  const currentSort = (resolvedQuery.sort as any) || 'featured';
  const searchQuery = resolvedQuery.search || '';

  const categories = CatalogService.getCategories();
  const products = CatalogService.getProducts({
    categorySlug: currentCategorySlug,
    sortBy: currentSort,
    search: searchQuery,
  });

  const activeCategory = currentCategorySlug !== 'all' ? CatalogService.getCategoryBySlug(currentCategorySlug) : null;
  const dict = getDictionary(locale);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Breadcrumb & Title */}
      <div className="border-b border-[#E5E3DD] pb-6 space-y-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852]">
          <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#121212] font-medium">{dict.navigation.shop}</span>
          {activeCategory && (
            <>
              <span aria-hidden="true">/</span>
              <span className="text-[#4A5D4E] font-semibold">{activeCategory.name}</span>
            </>
          )}
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212]">
              {activeCategory ? activeCategory.name : 'European Artisan Collection'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5C5852] mt-1.5 max-w-2xl leading-relaxed">
              {activeCategory
                ? activeCategory.description
                : 'Single-origin Belgian chocolate bars, fruit pectin gummies, botanical vaporizers, and curated tasting boxes. Handcrafted in Europe and dispatched from NL, ES, DE, and FR.'}
            </p>
          </div>

          <span className="text-xs text-[#8E8B85] font-mono shrink-0">
            Showing {products.length} product{products.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <ShopFilters
        locale={locale}
        currentCategory={currentCategorySlug}
        currentSort={currentSort}
        searchQuery={searchQuery}
        totalCount={CatalogService.getProducts().length}
        categories={categories.map((category) => ({
          name: category.name,
          slug: category.slug,
          productCount: category.productCount,
        }))}
      />

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-[#E5E3DD] space-y-4">
          <p className="text-sm font-semibold text-[#121212]">No products found in this collection.</p>
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center gap-1.5 text-xs text-[#4A5D4E] hover:underline font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to all collections
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Bottom Educational Banner */}
      <div className="p-6 rounded-2xl bg-[#F0F4F1] border border-[#4A5D4E]/20 text-xs text-[#5C5852] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <strong className="block text-sm text-[#121212] font-serif mb-1">
            Need Wholesale or Collective Allocation?
          </strong>
          <p>
            For collective orders of 50 or 100 boxes, contact European member distribution at{' '}
            <a href="mailto:sales@fusionbars.eu" className="text-[#4A5D4E] font-medium hover:underline">
              sales@fusionbars.eu
            </a>.
          </p>
        </div>
        <Link
          href={`/${locale}/products/fusion-100-bar-master-collector-boutique-box`}
          className="px-4 py-2 bg-[#4A5D4E] text-white rounded-lg text-xs font-semibold hover:bg-[#3B4A3E] transition shrink-0"
        >
          View 100-Bar Master Box &rarr;
        </Link>
      </div>
    </div>
  );
}
