'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, X, ArrowRight } from 'lucide-react';
import { useCommerce } from '../context/CommerceContext';
import catalogueData from '../data/consolidated-catalogue.json';
import { NormalizedProduct } from '../../scripts/consolidate-catalogue';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const { locale, formatMoney } = useCommerce();
  const inputRef = useRef<HTMLInputElement>(null);

  const products: NormalizedProduct[] = (catalogueData as any).products;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const results = query.trim().length > 0
    ? products.filter((p) => {
        const q = query.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.categoryName.toLowerCase().includes(q) ||
          p.variants.some((v) => v.flavor.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q))
        );
      })
    : products.slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search product catalogue"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-[#FBFBF9] w-full max-w-2xl rounded-xl shadow-2xl border border-[#E5E3DD] overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E5E3DD] bg-white gap-3">
          <Search className="w-5 h-5 text-[#5C5852] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chocolate bars, flavors, gummies, boxes (e.g. Birthday Cake, 10-Bar)..."
            aria-label="Search query"
            className="w-full bg-transparent text-[#121212] text-sm placeholder:text-[#8E8B85] outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-[#5C5852] hover:text-[#121212] rounded-lg transition"
            aria-label="Close search modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between text-xs text-[#5C5852]">
            <span>{query.trim().length > 0 ? `Search results for "${query}" (${results.length})` : 'Popular European Selections'}</span>
            <span className="text-[11px] font-mono">ESC to close</span>
          </div>

          {results.length === 0 ? (
            <div className="text-center py-10 text-[#5C5852] text-sm">
              No products found matching &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E3DD]/70">
              {results.map((product) => {
                const price = product.variants[0]?.priceEUR || 2000;
                return (
                  <Link
                    key={product.id}
                    href={`/${locale}/products/${product.slug}`}
                    onClick={onClose}
                    className="flex items-center justify-between py-3 hover:bg-neutral-50 px-2 rounded-lg transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 bg-white rounded border border-[#E5E3DD] overflow-hidden shrink-0">
                        <Image
                          src={product.primaryImage}
                          alt={product.name}
                          fill
                          className="object-contain p-1 group-hover:scale-105 transition"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-[#5C5852]">{product.categoryName}</div>
                        <h4 className="text-sm font-semibold text-[#121212] group-hover:text-[#4A5D4E] transition">
                          {product.name}
                        </h4>
                        <div className="text-xs text-[#8E8B85]">
                          {product.variants.length} flavor option{product.variants.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-[#121212] font-mono">{formatMoney(price)}</span>
                      <ArrowRight className="w-4 h-4 text-[#8E8B85] group-hover:text-[#4A5D4E] group-hover:translate-x-1 transition ml-auto mt-1" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
