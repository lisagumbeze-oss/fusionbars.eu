'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Shield, Check, ArrowRight } from 'lucide-react';
import { useCommerce } from '../context/CommerceContext';
import { getDictionary } from '../i18n';
import { subscribeNewsletterAction } from '@/actions/contact';

export default function Footer() {
  const { locale } = useCommerce();
  const dict = getDictionary(locale);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubscribeError(null);
    if (!email || !email.includes('@')) return;

    setSubscribing(true);
    const result = await subscribeNewsletterAction({ email, locale });
    setSubscribing(false);

    if (!result.success) {
      setSubscribeError(result.error || 'Subscription failed.');
      return;
    }

    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="bg-[#121212] text-[#FBFBF9] border-t border-neutral-800">
      {/* Top Value Propositions */}
      <div className="border-b border-neutral-800/80 bg-neutral-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-[#4A5D4E]/20 text-[#88A48D] flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <strong className="block text-neutral-100 font-semibold mb-0.5">Certified European Atelier</strong>
              <p className="text-neutral-400">Crafted in registered European culinary laboratories with ISO 17025 lot audits.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-[#4A5D4E]/20 text-[#88A48D] flex items-center justify-center shrink-0">
              <span className="font-serif font-bold text-sm">EU</span>
            </div>
            <div>
              <strong className="block text-neutral-100 font-semibold mb-0.5">4 Fulfilment Origins</strong>
              <p className="text-neutral-400">Dispatched from temperature-controlled hubs in Netherlands, Spain, Germany, and France.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-[#4A5D4E]/20 text-[#88A48D] flex items-center justify-center shrink-0">
              <span className="font-mono font-bold text-xs">€/£</span>
            </div>
            <div>
              <strong className="block text-neutral-100 font-semibold mb-0.5">Dual-Currency Pricing</strong>
              <p className="text-neutral-400">Authoritative EUR base pricing with real-time British Pound (GBP) settlement rails.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-[#4A5D4E]/20 text-[#88A48D] flex items-center justify-center shrink-0">
              <span className="font-serif font-bold text-xs">100%</span>
            </div>
            <div>
              <strong className="block text-neutral-100 font-semibold mb-0.5">Discreet Packaging</strong>
              <p className="text-neutral-400">Neutral, unmarked outer cartons with generic sender details and zero botanical markings.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Navigation & Newsletter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 text-xs">
        {/* Brand & Manifesto */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#4A5D4E] text-white flex items-center justify-center font-serif text-sm font-bold">
              F
            </div>
            <span className="font-serif text-lg tracking-wider font-bold text-neutral-100">
              FUSION MUSHROOM BARS EU
            </span>
          </div>
          <p className="text-neutral-400 leading-relaxed max-w-sm">
            {dict.common.tagline}. Europe&apos;s premier botanical confection atelier, harmonizing single-origin Belgian couverture chocolate with verified functional mycology. {dict.payment.cryptoDiscountBody}
          </p>
          <div className="text-neutral-500 space-y-1">
            <p>Direct Inquiries: <a href="mailto:sales@fusionbars.eu" className="text-neutral-300 hover:underline">sales@fusionbars.eu</a></p>
            <p>Customer Support Hours: Mon &ndash; Fri (09:00 &ndash; 18:00 CET)</p>
          </div>
        </div>

        {/* Collection Links */}
        <div className="space-y-3">
          <h4 className="font-semibold text-neutral-200 tracking-wider uppercase text-[11px]">Collections</h4>
          <ul className="space-y-2 text-neutral-400">
            <li><Link href={`/${locale}/shop?category=artisan-chocolate-bars`} className="hover:text-white transition">Artisan Chocolate Bars (6g)</Link></li>
            <li><Link href={`/${locale}/shop?category=gummies`} className="hover:text-white transition">Fruit Pectin Gummies (4g)</Link></li>
            <li><Link href={`/${locale}/shop?category=bundles-collections`} className="hover:text-white transition">Boutique Curated Boxes</Link></li>
            <li><Link href={`/${locale}/shop?category=botanical-vaporizers`} className="hover:text-white transition">Botanical Vaporizers (2ml)</Link></li>
            <li><Link href={`/${locale}/shop?category=capsules`} className="hover:text-white transition">Microdose Capsules (30ct)</Link></li>
          </ul>
        </div>

        {/* Customer Care & Governance */}
        <div className="space-y-3">
          <h4 className="font-semibold text-neutral-200 tracking-wider uppercase text-[11px]">Transparency & Legal</h4>
          <ul className="space-y-2 text-neutral-400">
            <li><Link href={`/${locale}/legal/privacy`} className="hover:text-white transition">Privacy Policy (GDPR)</Link></li>
            <li><Link href={`/${locale}/legal/terms`} className="hover:text-white transition">Terms & Conditions</Link></li>
            <li><Link href={`/${locale}/legal/refunds`} className="hover:text-white transition">Refund & Returns</Link></li>
            <li><Link href={`/${locale}/legal/shipping`} className="hover:text-white transition">European Shipping Policy</Link></li>
            <li><Link href={`/${locale}/legal/cookies`} className="hover:text-white transition">Cookie Preferences</Link></li>
            <li><Link href={`/${locale}/legal/imprint`} className="hover:text-white transition">Legal Notice / Imprint</Link></li>
            <li><Link href={`/${locale}/contact`} className="hover:text-white transition">Customer Support Desk</Link></li>
          </ul>
        </div>

        {/* Newsletter Signup */}
        <div className="space-y-3">
          <h4 className="font-semibold text-neutral-200 tracking-wider uppercase text-[11px]">Botanical Journal</h4>
          <p className="text-neutral-400">
            Receive laboratory release bulletins, private batch allocations, and European dispatch notices.
          </p>
          {subscribed ? (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Subscription confirmed. Welcome.</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address..."
                  disabled={subscribing}
                  className="w-full bg-neutral-900 border border-neutral-700 px-3 py-2 text-neutral-200 text-xs rounded-l outline-none focus:border-[#4A5D4E]"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="px-3.5 bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white rounded-r transition flex items-center justify-center cursor-pointer disabled:opacity-50"
                  aria-label="Subscribe to newsletter"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {subscribeError && (
                <p className="text-[10px] text-red-400">{subscribeError}</p>
              )}
              <p className="text-[10px] text-neutral-500">We respect European GDPR privacy standards. No marketing spam.</p>
            </form>
          )}
        </div>
      </div>

      {/* Regulatory Notice & Bottom Bar */}
      <div className="border-t border-neutral-900 bg-neutral-950 py-6 text-[11px] text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="leading-relaxed">
            <strong>European Botanical & Confectionery Notice:</strong> Products distributed by Fusion Mushroom Bars EU are crafted with culinary-grade functional mushroom extracts (including Lion&apos;s Mane, Reishi, Cordyceps, and Chaga) and premium Belgian chocolate. Products are intended for adult consumption (18+). These products are not intended to diagnose, treat, cure, or prevent any medical condition. Please store in a cool, dry place away from children.
          </p>
          <div className="flex flex-wrap justify-between items-center gap-4 pt-2 border-t border-neutral-900">
            <p>&copy; {new Date().getFullYear()} Fusion Mushroom Bars EU. Registered European distribution.</p>
            <p>Production Target: Vercel &bull; Next.js 16 App Router &bull; PostgreSQL &bull; Server-Authoritative Commerce</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
