'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCommerce } from '@/context/CommerceContext';
import { ShoppingBag, Trash2, ArrowRight, ArrowLeft, ShieldCheck, Truck, Plus, Minus } from 'lucide-react';
import { getDictionary } from '@/i18n';
import CryptoDiscountNotice from '@/components/CryptoDiscountNotice';
import { calculateCryptoPaymentDiscount } from '@/domain/payments/CryptoPaymentDiscount';

export default function CartPage() {
  const {
    cart,
    cartCount,
    updateQuantity,
    removeFromCart,
    clearCart,
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
  const cryptoDiscount = calculateCryptoPaymentDiscount(subtotal);
  const cryptoTotal = Math.max(0, total - cryptoDiscount);
  const threshold = currency === 'EUR' ? 30000 : 26000;
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      {/* Header Bar */}
      <div className="border-b border-[#E5E3DD] pb-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852] mb-2">
            <Link href={`/${locale}`} className="hover:text-[#121212] transition">Home</Link>
            <span aria-hidden="true">/</span>
            <span className="text-[#121212] font-medium">{dict.navigation.cart}</span>
          </nav>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#121212] flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#4A5D4E]" />
            Your Shopping Bag
          </h1>
          <p className="text-xs text-[#5C5852] mt-1">
            Authoritative Server Calculation &bull; Dispatched from European Hubs
          </p>
        </div>

        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-[#8E8B85] hover:text-red-600 transition font-medium cursor-pointer"
          >
            Clear Entire Bag
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-2xl border border-[#E5E3DD] space-y-4 max-w-2xl mx-auto p-8 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-[#F0F4F1] flex items-center justify-center text-[#4A5D4E]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="font-serif text-xl font-bold text-[#121212]">Your shopping bag is empty</h2>
          <p className="text-xs text-[#5C5852] max-w-md mx-auto leading-relaxed">
            Explore our curated catalogue of 26+ artisan chocolate bars, fruit pectin gummies, and boutique collection boxes.
          </p>
          <Link
            href={`/${locale}/shop`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold transition shadow-xs"
          >
            Explore Collection <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Items Table Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Free Shipping Notification */}
            <div className="p-4 bg-[#F0F4F1] rounded-xl border border-[#4A5D4E]/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-[#121212]">
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#4A5D4E]" />
                  {qualifiesForFreeShipping ? (
                    <strong className="text-[#4A5D4E]">Free European Express Shipping Unlocked!</strong>
                  ) : (
                    <span>
                      Add <strong className="text-[#4A5D4E]">{formatMoney(amountNeededForFreeShipping)}</strong> more to receive Free Shipping
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-[#E5E3DD] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4A5D4E] transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="bg-white rounded-2xl border border-[#E5E3DD] overflow-hidden divide-y divide-[#E5E3DD] shadow-xs">
              {cart.map((item) => {
                const unitPrice = currency === 'EUR' ? item.unitPriceEUR : item.unitPriceGBP;
                const lineTotal = unitPrice * item.quantity;

                return (
                  <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-20 h-20 bg-[#FBFBF9] border border-[#E5E3DD] rounded-lg overflow-hidden shrink-0">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-contain p-2"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <Link
                          href={`/${locale}/products/${item.productSlug}`}
                          className="font-serif text-sm font-bold text-[#121212] hover:text-[#4A5D4E] transition"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-[#5C5852] mt-0.5">Flavor: <strong>{item.flavor}</strong></p>
                        <p className="text-[11px] font-mono text-[#8E8B85]">SKU: {item.sku}</p>
                        <span className="text-xs font-semibold text-[#121212] font-mono sm:hidden block mt-1">
                          {formatMoney(unitPrice)} each
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="flex items-center border border-[#E5E3DD] rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="p-2 hover:bg-[#F0F4F1] transition"
                        >
                          <Minus className="w-3.5 h-3.5 text-[#5C5852]" />
                        </button>
                        <span className="px-3 font-mono text-xs font-bold text-[#121212] min-w-8 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="p-2 hover:bg-[#F0F4F1] transition"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#5C5852]" />
                        </button>
                      </div>

                      <div className="text-right min-w-20">
                        <span className="text-sm font-bold text-[#121212] font-mono block">
                          {formatMoney(lineTotal)}
                        </span>
                        <span className="text-[10px] text-[#8E8B85] font-mono hidden sm:block">
                          {formatMoney(unitPrice)}/ea
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.name} from cart`}
                        className="text-[#8E8B85] hover:text-red-600 transition p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              href={`/${locale}/shop`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#4A5D4E] hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Continue Shopping
            </Link>
          </div>

          {/* Order Summary Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-5 shadow-xs">
              <h2 className="font-serif text-lg font-bold text-[#121212] border-b border-[#E5E3DD] pb-3">
                Order Summary
              </h2>
              <CryptoDiscountNotice locale={locale} compact />

              <div className="space-y-3 text-xs text-[#5C5852]">
                <div className="flex justify-between">
                  <span>Bag Subtotal ({cartCount} item{cartCount > 1 ? 's' : ''})</span>
                  <span className="font-mono text-[#121212] font-semibold">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated European Courier</span>
                  <span className="font-mono text-[#121212]">
                    {shippingCost === 0 ? <strong className="text-[#4A5D4E]">FREE</strong> : formatMoney(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between text-[#8E8B85] text-[11px]">
                  <span>Free Shipping Threshold</span>
                  <span className="font-mono">{formatMoney(threshold)}</span>
                </div>
                <div className="border-t border-[#E5E3DD] pt-3 flex justify-between text-base font-bold text-[#121212]">
                  <span>Estimated Total</span>
                  <span className="text-[#4A5D4E] font-mono">{formatMoney(total)}</span>
                </div>
                {cryptoDiscount > 0 && (
                  <>
                    <div className="flex justify-between text-amber-800">
                      <span>{dict.payment.cryptoDiscountLine}</span>
                      <span className="font-mono font-semibold">−{formatMoney(cryptoDiscount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-[#121212]">
                      <span>{dict.payment.cryptoDiscountPrice}</span>
                      <span className="font-mono">{formatMoney(cryptoTotal)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#FBFBF9] border border-[#E5E3DD] text-[11px] text-[#5C5852] space-y-1">
                <div className="flex items-center gap-2 text-[#121212] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#4A5D4E]" />
                  <span>Discreet European Dispatch</span>
                </div>
                <p>Odorless, plain packaging without branding. Shipped from NL, ES, DE, or FR.</p>
              </div>

              <Link
                href={`/${locale}/checkout`}
                className="w-full py-3.5 px-4 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-sm"
              >
                Proceed to Checkout &bull; {formatMoney(total)} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
