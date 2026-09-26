'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';

interface ShopCategoryOption {
  name: string;
  slug: string;
  productCount: number;
}

interface ShopFiltersProps {
  locale: string;
  currentCategory: string;
  currentSort: string;
  searchQuery?: string;
  totalCount: number;
  categories: ShopCategoryOption[];
}

const selectClassName =
  'w-full appearance-none bg-[#FBFBF9] border border-[#E5E3DD] rounded-md pl-3 pr-9 py-2 text-xs text-[#121212] font-medium outline-none focus-visible:border-[#4A5D4E] cursor-pointer';

export default function ShopFilters({
  locale,
  currentCategory,
  currentSort,
  searchQuery = '',
  totalCount,
  categories,
}: ShopFiltersProps) {
  const router = useRouter();

  const shopHref = (category: string, sort: string) => {
    const params = new URLSearchParams();
    if (category && category !== 'all') {
      params.set('category', category);
    }
    if (sort && sort !== 'featured') {
      params.set('sort', sort);
    }
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    const query = params.toString();
    return `/${locale}/shop${query ? `?${query}` : ''}`;
  };

  const navigate = (category: string, sort: string) => {
    router.push(shopHref(category, sort));
  };

  const pillClass = (active: boolean, allCollections = false) =>
    `px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition cursor-pointer ${
      active
        ? allCollections
          ? 'bg-[#121212] text-white shadow-xs'
          : 'bg-[#4A5D4E] text-white shadow-xs'
        : 'text-[#5C5852] hover:text-[#121212] hover:bg-neutral-100'
    }`;

  return (
    <form
      method="GET"
      action={`/${locale}/shop`}
      className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E5E3DD] shadow-xs"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        navigate(String(data.get('category') || currentCategory || 'all'), String(data.get('sort') || 'featured'));
      }}
    >
      {/* Mobile: collection dropdown */}
      <div className="flex items-center gap-2 min-w-0 w-full lg:hidden">
        <label htmlFor="shop-category" className="text-xs text-[#5C5852] shrink-0">
          Collection
        </label>
        <div className="relative min-w-0 flex-1">
          <select
            id="shop-category"
            name="category"
            value={currentCategory}
            aria-label="Filter products by collection"
            onChange={(event) => navigate(event.target.value, currentSort)}
            className={selectClassName}
          >
            <option value="all">All Collections ({totalCount})</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name} ({category.productCount})
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8B85]"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Desktop: collection pills */}
      <div className="hidden lg:flex items-center gap-1 text-xs">
        <Link
          href={shopHref('all', currentSort)}
          aria-current={currentCategory === 'all' ? 'page' : undefined}
          className={pillClass(currentCategory === 'all', true)}
        >
          All Collections ({totalCount})
        </Link>
        {categories.map((category) => {
          const isActive = currentCategory === category.slug;
          return (
            <Link
              key={category.slug}
              href={shopHref(category.slug, currentSort)}
              aria-current={isActive ? 'page' : undefined}
              className={pillClass(isActive)}
            >
              {category.name} ({category.productCount})
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0 text-xs text-[#5C5852]">
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#8E8B85]" aria-hidden="true" />
        <label htmlFor="shop-sort">Sort by</label>
        <div className="relative flex-1 lg:flex-none">
          <select
            id="shop-sort"
            name="sort"
            value={currentSort}
            aria-label="Sort products by"
            onChange={(event) => navigate(currentCategory, event.target.value)}
            className={`${selectClassName} lg:w-48`}
          >
            <option value="featured">Featured Selections</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Alphabetical (A – Z)</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8B85]"
            aria-hidden="true"
          />
        </div>
      </div>

      <noscript>
        <button type="submit" className="px-3 py-1.5 bg-neutral-200 text-xs rounded-md">
          Apply filters
        </button>
      </noscript>
    </form>
  );
}
