'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Trash2, ShoppingBag, ArrowRight, ShieldCheck, Plus, Minus, Truck } from 'lucide-react';
import { useCommerce } from '../context/CommerceContext';
import { getDictionary } from '../i18n';

export default function CartDrawer() {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    cartCount,
    updateQuantity,
    removeFromCart,
    subtotal,
    shippingCost,
    qualifiesForFreeShipping,
    amountNeededForFreeShipping,
    total,
    formatMoney,
    currency,
    locale,
  } = useCommerce();

  const dict = getDictionary(locale);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) {
        setIsCartOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  const threshold = currency === 'EUR' ? 30000 : 26000;
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Cart Drawer"
      className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs transition-opacity"
    >
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FBFBF9] border-l border-[#E5E3DD] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#E5E3DD] flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#4A5D4E]" />
              <h2 className="text-base font-semibold text-[#121212]">
                {dict.navigation.cart} ({cartCount})
              </h2>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 text-[#5C5852] hover:text-[#121212] rounded-lg transition cursor-pointer"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Bar */}
          <div className="px-5 py-3.5 bg-[#F0F4F1] border-b border-[#E5E3DD]">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium text-[#121212]">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#4A5D4E]" />
                {qualifiesForFreeShipping ? (
                  <span className="text-[#4A5D4E] font-semibold">Free European Shipping Unlocked!</span>
                ) : (
                  <span>
                    Add <strong className="text-[#4A5D4E]">{formatMoney(amountNeededForFreeShipping)}</strong> for Free Shipping
                  </span>
                )}
              </span>
              <span className="font-mono text-[11px]">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#E5E3DD] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4A5D4E] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#F0F4F1] flex items-center justify-center text-[#4A5D4E]">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#121212]">Your shopping bag is empty</h3>
                  <p className="text-xs text-[#5C5852] mt-1 max-w-xs mx-auto">
                    Explore our collection of Belgian artisan chocolate bars, functional fruit gummies, and curator boxes.
                  </p>
                </div>
                <Link
                  href={`/${locale}/shop`}
                  onClick={() => setIsCartOpen(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#4A5D4E] text-white text-xs font-semibold hover:bg-[#3B4A3E] transition"
                >
                  Explore Collection <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E3DD]">
                {cart.map((item) => {
                  const unitPrice = currency === 'EUR' ? item.unitPriceEUR : item.unitPriceGBP;
                  const lineTotal = unitPrice * item.quantity;

                  return (
                    <div key={item.id} className="py-4 flex gap-4 text-xs">
                      <div className="relative w-16 h-16 bg-white border border-[#E5E3DD] rounded-md overflow-hidden shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-1"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <Link
                              href={`/${locale}/products/${item.productSlug}`}
                              onClick={() => setIsCartOpen(false)}
                              className="font-semibold text-[#121212] hover:text-[#4A5D4E] transition line-clamp-1"
                            >
                              {item.name}
                            </Link>
                            <p className="text-[11px] text-[#5C5852] mt-0.5">Flavor: {item.flavor}</p>
                            <p className="text-[10px] font-mono text-[#8E8B85]">SKU: {item.sku}</p>
                          </div>
                          <span className="font-bold text-[#121212] font-mono">{formatMoney(lineTotal)}</span>
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1">
                          <div className="flex items-center border border-[#E5E3DD] rounded bg-white overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="p-1 hover:bg-[#F0F4F1] transition"
                            >
                              <Minus className="w-3 h-3 text-[#5C5852]" />
                            </button>
                            <span className="px-2 font-mono text-xs text-[#121212] min-w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="p-1 hover:bg-[#F0F4F1] transition"
                            >
                              <Plus className="w-3 h-3 text-[#5C5852]" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            aria-label={`Remove ${item.name} from cart`}
                            className="text-[#8E8B85] hover:text-red-600 transition flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer & Checkout Call-to-action */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-[#E5E3DD] bg-white space-y-3">
              <div className="space-y-1.5 text-xs text-[#5C5852]">
                <div className="flex justify-between">
                  <span>{dict.commerce.subtotal}</span>
                  <span className="font-mono text-[#121212] font-semibold">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{dict.commerce.shipping}</span>
                  <span className="font-mono text-[#121212]">
                    {shippingCost === 0 ? <span className="text-[#4A5D4E] font-semibold">FREE</span> : formatMoney(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#E5E3DD] text-sm font-bold text-[#121212]">
                  <span>{dict.commerce.total}</span>
                  <span className="font-mono text-[#4A5D4E]">{formatMoney(total)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded bg-[#FBFBF9] border border-[#E5E3DD] text-[11px] text-[#5C5852]">
                <ShieldCheck className="w-4 h-4 text-[#4A5D4E] shrink-0" />
                <span>100% Plain Discreet Packaging · NL, ES, DE, FR Hubs</span>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  href={`/${locale}/checkout`}
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 px-4 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
                >
                  {dict.commerce.checkout} &bull; {formatMoney(total)} <ArrowRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-2 text-center text-xs text-[#5C5852] hover:text-[#121212] transition font-medium"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
