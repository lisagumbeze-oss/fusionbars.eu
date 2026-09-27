'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, ShoppingBag, Check, ShieldCheck, Truck, Clock, Sparkles, Plus, Minus, Info, CheckCircle2, ChevronDown } from 'lucide-react';
import { NormalizedProduct, NormalizedVariant } from '@/types';
import { useCommerce } from '@/context/CommerceContext';
import CryptoDiscountNotice from '@/components/CryptoDiscountNotice';
import { getDictionary } from '@/i18n';
import { applyCryptoDiscountCopy, calculateCryptoPaymentDiscount } from '@/domain/payments/CryptoPaymentDiscount';

interface ProductDetailClientProps {
  product: NormalizedProduct;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { currency, addToCart, toggleWishlist, isWishlisted, formatMoney, locale } = useCommerce();
  const dict = getDictionary(locale);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<string>(product.primaryImage);
  const [isAdded, setIsAdded] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'ingredients' | 'shipping' | 'lab'>('details');

  const selectedVariant: NormalizedVariant = product.variants[selectedVariantIndex] || product.variants[0];
  const unitPrice = currency === 'EUR' ? selectedVariant.priceEUR : selectedVariant.priceGBP;
  const cryptoUnitPrice = Math.max(0, unitPrice - calculateCryptoPaymentDiscount(unitPrice));
  const compareAt = currency === 'EUR' ? selectedVariant.compareAtEUR : selectedVariant.compareAtGBP;
  const wishlisted = isWishlisted(selectedVariant.id);

  const allImages = Array.from(new Set([selectedVariant.image, product.primaryImage, ...(product.galleryImages || [])])).filter(Boolean);

  const handleAddToCart = () => {
    addToCart(
      {
        id: selectedVariant.id,
        productId: product.id,
        productSlug: product.slug,
        name: product.name,
        flavor: selectedVariant.flavor,
        sku: selectedVariant.sku,
        unitPriceEUR: selectedVariant.priceEUR,
        unitPriceGBP: selectedVariant.priceGBP,
        image: selectedVariant.image || product.primaryImage,
      },
      quantity
    );
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
      {/* Left: Gallery Column */}
      <div className="lg:col-span-6 space-y-4">
        {/* Main Display Image */}
        <div className="relative aspect-square bg-white rounded-2xl border border-[#E5E3DD] overflow-hidden p-8 flex items-center justify-center shadow-xs">
          <Image
            src={activeImage}
            alt={`${product.name} - ${selectedVariant.flavor}`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-4 hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />

          <button
            onClick={() => toggleWishlist(selectedVariant.id)}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`absolute top-4 right-4 p-3 rounded-full border transition cursor-pointer ${
              wishlisted
                ? 'bg-red-50 border-red-200 text-red-500'
                : 'bg-white/90 border-[#E5E3DD] text-[#5C5852] hover:text-[#121212]'
            }`}
          >
            <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Thumbnail Selector Row */}
        {allImages.length > 1 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                aria-label={`View product image ${idx + 1}`}
                className={`relative w-16 h-16 rounded-lg bg-white border p-1 shrink-0 overflow-hidden transition cursor-pointer ${
                  activeImage === img ? 'border-[#4A5D4E] ring-2 ring-[#4A5D4E]/20' : 'border-[#E5E3DD] hover:border-[#121212]'
                }`}
              >
                <Image src={img} alt="Thumbnail" fill className="object-contain p-1" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Product Merchandising Column */}
      <div className="lg:col-span-6 space-y-6">
        <div>
          {/* Category Kicker & Weight Label */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#4A5D4E] uppercase tracking-wider mb-1.5">
            <span>{product.categoryName}</span>
            <span aria-hidden="true">&bull;</span>
            <span className="text-[#5C5852]">{selectedVariant.weightLabel}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212] tracking-tight">
            {product.name}
          </h1>

          <p className="text-sm text-[#5C5852] mt-2 leading-relaxed font-normal">
            {product.headline}
          </p>
        </div>

        {/* Price & Stock Display */}
        <div className="flex items-baseline gap-3 pt-2 border-t border-[#E5E3DD]">
          <span className="text-3xl font-bold text-[#121212] font-mono">
            {formatMoney(unitPrice)}
          </span>
          {compareAt && compareAt > unitPrice && (
            <span className="text-base text-[#8E8B85] line-through font-mono">
              {formatMoney(compareAt)}
            </span>
          )}

          <div className="ml-auto text-xs font-medium">
            {selectedVariant.stockStatus === 'IN_STOCK' ? (
              <span className="text-[#4A5D4E] flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> In Stock &bull; Dispatches within 24h
              </span>
            ) : selectedVariant.stockStatus === 'LOW_STOCK' ? (
              <span className="text-amber-700 font-semibold">Low Stock &bull; Only {selectedVariant.stockLevel} left</span>
            ) : (
              <span className="text-neutral-500 font-semibold">Temporarily Allocated</span>
            )}
          </div>
        </div>
        <p className="text-xs font-medium text-amber-800">
          {dict.payment.cryptoDiscountPrice} {formatMoney(cryptoUnitPrice * quantity)} · {applyCryptoDiscountCopy(dict.payment.cryptoDiscountBadge)}
        </p>

        {/* Variant / Flavor Selection (Interactive functional segmented control) */}
        {product.variants.length > 1 && (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-[#121212]">
                Flavor Selection: <strong className="text-[#4A5D4E]">{selectedVariant.flavor}</strong>
              </span>
              <span className="text-[#8E8B85] font-mono">SKU: {selectedVariant.sku}</span>
            </div>

            <div className="relative">
              <select
                id="product-flavor"
                value={selectedVariantIndex}
                aria-label={`Select flavor for ${product.name}`}
                onChange={(event) => {
                  const nextIndex = Number(event.target.value);
                  const nextVariant = product.variants[nextIndex];
                  setSelectedVariantIndex(nextIndex);
                  if (nextVariant?.image) {
                    setActiveImage(nextVariant.image);
                  }
                }}
                className="w-full appearance-none bg-[#FBFBF9] border border-[#E5E3DD] rounded-md pl-3 pr-9 py-2.5 text-xs text-[#121212] font-medium outline-none focus-visible:border-[#4A5D4E] cursor-pointer"
              >
                {product.variants.map((variant, index) => (
                  <option key={variant.id} value={index}>
                    {variant.flavor}
                    {variant.stockStatus === 'LOW_STOCK' ? ' (Low Stock)' : ''}
                    {variant.stockStatus === 'OUT_OF_STOCK' ? ' (Unavailable)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8B85]"
                aria-hidden="true"
              />
            </div>
          </div>
        )}

        {/* Quantity and Add to Cart Section */}
        <div className="flex items-center gap-4 pt-4 border-t border-[#E5E3DD]">
          <div className="flex items-center border border-[#E5E3DD] rounded-lg bg-white overflow-hidden shrink-0">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="p-3 text-[#5C5852] hover:bg-[#F0F4F1] disabled:opacity-30 transition"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-4 font-mono text-sm font-semibold text-[#121212] min-w-10 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              aria-label="Increase quantity"
              className="p-3 text-[#5C5852] hover:bg-[#F0F4F1] transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={selectedVariant.stockStatus === 'OUT_OF_STOCK'}
            className={`flex-1 py-3.5 px-6 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : selectedVariant.stockStatus === 'OUT_OF_STOCK'
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4" /> Added to Shopping Bag
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" /> Add to Bag &bull; {formatMoney(unitPrice * quantity)}
              </>
            )}
          </button>
        </div>

        {/* Quick European Shipping Indicator */}
        <CryptoDiscountNotice locale={locale} compact />

        <div className="p-3.5 rounded-xl bg-[#F0F4F1] border border-[#4A5D4E]/20 text-xs text-[#5C5852] flex items-center gap-3">
          <Truck className="w-4 h-4 text-[#4A5D4E] shrink-0" />
          <span>
            Orders over €300 receive <strong>Free European Express Shipping</strong>. Dispatched from NL, ES, DE, FR.
          </span>
        </div>

        {/* Structured Product Specifications Tabs */}
        <div className="pt-4 border-t border-[#E5E3DD] space-y-4">
          <div className="flex border-b border-[#E5E3DD] gap-4 text-xs font-medium">
            {[
              { id: 'details', label: 'Description' },
              { id: 'ingredients', label: 'Ingredients & Allergens' },
              { id: 'shipping', label: 'Discreet Dispatch' },
              { id: 'lab', label: 'Lab Verification' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 transition relative cursor-pointer ${
                  activeTab === tab.id ? 'text-[#121212] font-semibold' : 'text-[#5C5852] hover:text-[#121212]'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A5D4E]" />
                )}
              </button>
            ))}
          </div>

          <div className="text-xs text-[#5C5852] leading-relaxed">
            {activeTab === 'details' && (
              <div className="space-y-3">
                <p>{product.description}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {product.dietaryAttributes.map((attr, i) => (
                    <span key={i} className="text-[#121212] bg-white border border-[#E5E3DD] px-2.5 py-1 rounded text-[11px] font-medium">
                      {attr}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'ingredients' && (
              <div className="space-y-3">
                <strong className="block text-[#121212] font-semibold">Formula Ingredients:</strong>
                <ul className="list-disc pl-5 space-y-1">
                  {product.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-[#E5E3DD]">
                  <strong className="text-red-700 block font-semibold mb-0.5">Allergen Information:</strong>
                  <p>{product.allergens.join(' · ')}</p>
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-2">
                <p>
                  <strong>Discreet Packaging Guarantee:</strong> All orders are dispatched in plain, odorless, tamper-evident outer cartons with zero confectionery, brand, or botanical markings on the exterior.
                </p>
                <p>
                  <strong>Origin Hubs:</strong> Netherlands (NL), Spain (ES), Germany (DE), and France (FR). Standard transit time is 2&ndash;4 business days across continental Europe.
                </p>
              </div>
            )}

            {activeTab === 'lab' && (
              <div className="space-y-2">
                <p>
                  <strong>ISO/IEC 17025 Certified:</strong> {product.laboratoryTesting}
                </p>
                <p>
                  <strong>Compliance Standard:</strong> {product.complianceNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
