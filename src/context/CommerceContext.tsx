'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CurrencyCode, LocaleCode } from '../types';
import { MoneyEngine } from '../lib/money';

export interface CartItem {
  id: string; // variantId
  productId: string;
  productSlug: string;
  name: string;
  flavor: string;
  sku: string;
  unitPriceEUR: number; // in cents
  unitPriceGBP: number; // in pence
  quantity: number;
  image: string;
}

interface CommerceContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  cart: CartItem[];
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  wishlist: string[];
  toggleWishlist: (variantId: string) => void;
  isWishlisted: (variantId: string) => boolean;
  subtotal: number; // in selected currency
  shippingCost: number; // in selected currency
  qualifiesForFreeShipping: boolean;
  amountNeededForFreeShipping: number;
  total: number;
  formatMoney: (centsOrPence: number) => string;
}

const CommerceContext = createContext<CommerceContextType | undefined>(undefined);

export function CommerceProvider({
  children,
  initialLocale = 'en',
}: {
  children: React.ReactNode;
  initialLocale?: LocaleCode;
}) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('EUR');
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Persistent storage hydration
  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem('fusion_eu_currency') as CurrencyCode;
      if (savedCurrency && (savedCurrency === 'EUR' || savedCurrency === 'GBP')) {
        setCurrencyState(savedCurrency);
      }
      const savedCart = localStorage.getItem('fusion_eu_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
      const savedWishlist = localStorage.getItem('fusion_eu_wishlist');
      if (savedWishlist) {
        setWishlist(JSON.parse(savedWishlist));
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('fusion_eu_currency', c);
    } catch {}
  };

  const setLocale = (l: LocaleCode) => {
    setLocaleState(l);
  };

  const saveCart = (items: CartItem[]) => {
    setCart(items);
    try {
      localStorage.setItem('fusion_eu_cart', JSON.stringify(items));
    } catch {}
  };

  const addToCart = (item: Omit<CartItem, 'quantity'>, qty = 1) => {
    const existing = cart.find((i) => i.id === item.id);
    let updated: CartItem[];
    if (existing) {
      updated = cart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      updated = [...cart, { ...item, quantity: qty }];
    }
    saveCart(updated);
    setIsCartOpen(true);
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    const updated = cart.map((i) => (i.id === variantId ? { ...i, quantity } : i));
    saveCart(updated);
  };

  const removeFromCart = (variantId: string) => {
    const updated = cart.filter((i) => i.id !== variantId);
    saveCart(updated);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const toggleWishlist = (variantId: string) => {
    let updated: string[];
    if (wishlist.includes(variantId)) {
      updated = wishlist.filter((id) => id !== variantId);
    } else {
      updated = [...wishlist, variantId];
    }
    setWishlist(updated);
    try {
      localStorage.setItem('fusion_eu_wishlist', JSON.stringify(updated));
    } catch {}
  };

  const isWishlisted = (variantId: string) => wishlist.includes(variantId);

  // Authoritative Mathematical Constants
  const FREE_SHIPPING_EUR = 30000; // €300.00
  const FREE_SHIPPING_GBP = 26000; // £260.00
  const STANDARD_SHIPPING_EUR = 1500; // €15.00
  const STANDARD_SHIPPING_GBP = 1300; // £13.00

  const subtotal = cart.reduce((acc, it) => {
    const unitPrice = currency === 'EUR' ? it.unitPriceEUR : it.unitPriceGBP;
    return acc + unitPrice * it.quantity;
  }, 0);

  const threshold = currency === 'EUR' ? FREE_SHIPPING_EUR : FREE_SHIPPING_GBP;
  const qualifiesForFreeShipping = subtotal >= threshold;
  const shippingCost = cart.length === 0 ? 0 : qualifiesForFreeShipping ? 0 : (currency === 'EUR' ? STANDARD_SHIPPING_EUR : STANDARD_SHIPPING_GBP);
  const amountNeededForFreeShipping = Math.max(0, threshold - subtotal);
  const total = subtotal + shippingCost;
  const cartCount = cart.reduce((acc, it) => acc + it.quantity, 0);

  const formatMoney = (amount: number) => {
    return MoneyEngine.format(amount, currency, locale);
  };

  return (
    <CommerceContext.Provider
      value={{
        currency,
        setCurrency,
        locale,
        setLocale,
        cart,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        wishlist,
        toggleWishlist,
        isWishlisted,
        subtotal,
        shippingCost,
        qualifiesForFreeShipping,
        amountNeededForFreeShipping,
        total,
        formatMoney,
      }}
    >
      {children}
    </CommerceContext.Provider>
  );
}

export function useCommerce() {
  const ctx = useContext(CommerceContext);
  if (!ctx) {
    throw new Error('useCommerce must be used within a CommerceProvider');
  }
  return ctx;
}
