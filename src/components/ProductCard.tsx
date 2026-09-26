'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingBag, Check } from 'lucide-react';
import { NormalizedProduct, NormalizedVariant } from '../../scripts/consolidate-catalogue';
import { useCommerce } from '../context/CommerceContext';

interface ProductCardProps {
  product: NormalizedProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { locale, currency, addToCart, toggleWishlist, isWishlisted, formatMoney } = useCommerce();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const selectedVariant: NormalizedVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const unitPrice = currency === 'EUR' ? selectedVariant.priceEUR : selectedVariant.priceGBP;
  const compareAt = currency === 'EUR' ? selectedVariant.compareAtEUR : selectedVariant.compareAtGBP;

  const displayImage = isHovered && product.hoverImage ? product.hoverImage : (selectedVariant.image || product.primaryImage);
  const wishlisted = isWishlisted(selectedVariant.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: selectedVariant.id,
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      flavor: selectedVariant.flavor,
      sku: selectedVariant.sku,
      unitPriceEUR: selectedVariant.priceEUR,
      unitPriceGBP: selectedVariant.priceGBP,
      image: selectedVariant.image || product.primaryImage,
    });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col bg-white rounded-xl border border-[#E5E3DD] overflow-hidden hover:shadow-lg transition-all duration-300"
    >
      {/* Product Image Frame */}
      <Link
        href={`/${locale}/products/${product.slug}`}
        className="relative aspect-square w-full bg-[#FBFBF9] overflow-hidden flex items-center justify-center p-3 sm:p-6 border-b border-[#E5E3DD]/60"
      >
        <Image
          src={displayImage}
          alt={`${product.name} - ${selectedVariant.flavor}`}
          fill
          sizes="(max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-contain p-2 sm:p-4 group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(selectedVariant.id);
          }}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-3 right-3 p-2 rounded-full border transition cursor-pointer ${
            wishlisted
              ? 'bg-red-50 border-red-200 text-red-500'
              : 'bg-white/90 border-[#E5E3DD] text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          <Heart className={`w-4 h-4 ${wishlisted ? 'fill-current' : ''}`} />
        </button>

        {/* Stock Status Label - Unboxed, quiet text */}
        <div className="absolute bottom-3 left-3 text-[11px] font-medium text-[#5C5852] bg-white/90 px-2 py-0.5 rounded border border-[#E5E3DD] backdrop-blur-xs">
          {selectedVariant.stockStatus === 'IN_STOCK' ? (
            <span className="text-[#4A5D4E] font-semibold">
              <span className="sm:hidden">In Stock</span>
              <span className="hidden sm:inline">In Stock · EU Hubs</span>
            </span>
          ) : selectedVariant.stockStatus === 'LOW_STOCK' ? (
            <span className="text-amber-700 font-semibold">Low Stock</span>
          ) : (
            <span className="text-neutral-500 font-semibold">Reserved</span>
          )}
        </div>
      </Link>

      {/* Card Content Area */}
      <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
        <div>
          {/* Category Kicker (Quiet inline text) */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#5C5852] uppercase tracking-wider font-semibold mb-1 min-w-0">
            <span className="truncate">{product.categoryName}</span>
            <span aria-hidden="true">&bull;</span>
            <span className="shrink-0">{selectedVariant.weightLabel}</span>
          </div>

          {/* Product Title */}
          <Link
            href={`/${locale}/products/${product.slug}`}
            className="block font-serif text-sm sm:text-base font-bold text-[#121212] group-hover:text-[#4A5D4E] transition-colors line-clamp-2 sm:line-clamp-1"
          >
            {product.name}
          </Link>
        </div>

        {/* Variant Selector (if multi-variant) */}
        {product.variants.length > 1 && (
          <div className="pt-1">
            <label className="block text-[10px] uppercase font-bold text-[#8E8B85] tracking-wider mb-1">
              Select Flavor ({product.variants.length} Available):
            </label>
            <select
              value={selectedVariantIndex}
              onChange={(e) => setSelectedVariantIndex(Number(e.target.value))}
              aria-label={`Select flavor for ${product.name}`}
              className="w-full text-xs bg-[#FBFBF9] border border-[#E5E3DD] text-[#121212] rounded-md px-2.5 py-1.5 outline-none font-medium focus:border-[#4A5D4E]"
            >
              {product.variants.map((v, i) => (
                <option key={v.id} value={i}>
                  {v.flavor} {v.stockStatus === 'LOW_STOCK' ? '(Low Stock)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Pricing & Quick Add Button */}
        <div className="pt-2 border-t border-[#E5E3DD]/60 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-sm sm:text-base font-bold text-[#121212] font-mono">
              {formatMoney(unitPrice)}
            </span>
            {compareAt && compareAt > unitPrice && (
              <span className="text-xs text-[#8E8B85] line-through font-mono">
                {formatMoney(compareAt)}
              </span>
            )}
          </div>

          <button
            onClick={handleQuickAdd}
            disabled={selectedVariant.stockStatus === 'OUT_OF_STOCK'}
            className={`w-full sm:w-auto justify-center px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : selectedVariant.stockStatus === 'OUT_OF_STOCK'
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {isAdded ? (
              <>
                <Check className="w-3.5 h-3.5" /> Added
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
