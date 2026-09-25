'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ShoppingCart, User, Layers, ArrowLeft } from 'lucide-react';
import { LocaleCode, CurrencyCode } from '../types';
import { getDictionary } from '../i18n';

interface NavigationProps {
  locale: LocaleCode;
  currency?: CurrencyCode;
}

export default function Navigation({ locale, currency = 'EUR' }: NavigationProps) {
  const dict = getDictionary(locale);

  return (
    <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-neutral-100 text-sm tracking-wide flex items-center gap-2">
              FUSION BARS EU
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                EU
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">Discreet European Mushroom Confections</p>
          </div>
        </Link>

        <nav className="flex items-center gap-6 text-xs">
          <Link href={`/${locale}/shop`} className="text-neutral-300 hover:text-white transition">
            {dict.navigation.shop}
          </Link>
          <Link href={`/${locale}/cart`} className="text-neutral-300 hover:text-white flex items-center gap-1.5 transition">
            <ShoppingCart className="w-3.5 h-3.5" />
            {dict.navigation.cart}
          </Link>
          <Link href={`/${locale}/account`} className="text-neutral-300 hover:text-white flex items-center gap-1.5 transition">
            <User className="w-3.5 h-3.5" />
            Account
          </Link>
          <Link href={`/${locale}/admin`} className="text-neutral-400 hover:text-neutral-200 transition">
            Admin
          </Link>
          <Link
            href={`/${locale}`}
            className="px-2.5 py-1 rounded bg-neutral-800 border border-neutral-700 text-emerald-400 hover:bg-neutral-700 transition font-mono text-[11px]"
          >
            Architecture Console
          </Link>
        </nav>
      </div>
    </header>
  );
}
