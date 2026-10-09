'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Check, ArrowRight } from 'lucide-react';
import WhatsAppLink from './WhatsAppLink';
import { useCommerce } from '../context/CommerceContext';
import { getDictionary } from '../i18n';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { applyCryptoDiscountCopy } from '@/domain/payments/CryptoPaymentDiscount';
import { subscribeNewsletterAction } from '@/actions/contact';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { STORE_ADDRESS_LINE, UK_BRANCH_OFFICE_LINE } from '@/lib/store-address';

export default function Footer() {
  const { locale } = useCommerce();
  const dict = getDictionary(locale);
  const supportEmail = AdminOverrides.settings().supportEmail;
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
              <strong className="block text-neutral-100 font-semibold mb-0.5">Euro and Pound</strong>
              <p className="text-neutral-400">Switch between EUR and GBP in the announcement bar. Each price uses the amount stored for that currency.</p>
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
          <Link href={`/${locale}`} className="inline-flex" aria-label="Fusion Mushroom Bars EU home">
            <Image
              src="/images/brand/fusion-logo.jpg"
              alt="Fusion"
              width={1024}
              height={394}
              className="h-10 w-auto"
            />
          </Link>
          <p className="text-neutral-400 leading-relaxed max-w-sm">
            {dict.common.tagline}. Europe&apos;s premier botanical confection atelier, harmonizing single-origin Belgian couverture chocolate with verified functional mycology. {applyCryptoDiscountCopy(dict.payment.cryptoDiscountBody)}
          </p>
          <div className="space-y-2 text-neutral-500">
            <p>
              <address className="not-italic text-neutral-300 space-y-1">
                <span className="block">{STORE_ADDRESS_LINE}</span>
                <span className="block">UK branch office: {UK_BRANCH_OFFICE_LINE}</span>
              </address>
            </p>
            <div className="flex items-center gap-3">
              <p>Support: <a href={`mailto:${supportEmail}`} className="text-neutral-300 hover:underline">{supportEmail}</a></p>
              <WhatsAppLink className="p-1" />
            </div>
          </div>
        </div>

        {/* Collection Links */}
        <div className="space-y-3">
          <h4 className="font-semibold text-neutral-200 tracking-wider uppercase text-[11px]">Shop</h4>
          <ul className="space-y-2 text-neutral-400">
            <li><Link href={`/${locale}/shop`} className="hover:text-white transition">All products</Link></li>
            <li><Link href={`/${locale}/shop?category=artisan-chocolate-bars`} className="hover:text-white transition">Artisan Chocolate Bars (6g)</Link></li>
            <li><Link href={`/${locale}/shop?category=gummies`} className="hover:text-white transition">Fruit Pectin Gummies (4g)</Link></li>
            <li><Link href={`/${locale}/shop?category=bundles-collections`} className="hover:text-white transition">Boutique Curated Boxes</Link></li>
            <li><Link href={`/${locale}/shop?category=wholesale`} className="hover:text-white transition">Wholesale Packs</Link></li>
            <li><Link href={`/${locale}/shop?category=botanical-vaporizers`} className="hover:text-white transition">Botanical Vaporizers (2ml)</Link></li>
            <li><Link href={`/${locale}/shop?category=capsules`} className="hover:text-white transition">Microdose Capsules (30ct)</Link></li>
            <li><Link href={`/${locale}/cart`} className="hover:text-white transition">Shopping bag</Link></li>
          </ul>
        </div>

        {/* Customer Care & Governance */}
        <div className="space-y-3">
          <h4 className="font-semibold text-neutral-200 tracking-wider uppercase text-[11px]">Customer</h4>
          <ul className="space-y-2 text-neutral-400">
            <li><Link href={`/${locale}/about`} className="hover:text-white transition">About</Link></li>
            <li><Link href={`/${locale}/faq`} className="hover:text-white transition">FAQs</Link></li>
            <li><Link href={`/${locale}/shipping`} className="hover:text-white transition">Shipping & returns</Link></li>
            <li><Link href={`/${locale}/refunds`} className="hover:text-white transition">Refund policy</Link></li>
            <li><Link href={`/${locale}/contact`} className="hover:text-white transition">Contact</Link></li>
            <li><Link href={`/${locale}/orders/lookup`} className="hover:text-white transition">Order status</Link></li>
            <li><Link href={`/${locale}/account`} className="hover:text-white transition">Account</Link></li>
            <li><Link href={`/${locale}/news`} className="hover:text-white transition">News</Link></li>
            <li><Link href={`/${locale}/glossary`} className="hover:text-white transition">Glossary</Link></li>
            <li><Link href={`/${locale}/compare`} className="hover:text-white transition">Compare the range</Link></li>
            <li><Link href={`/${locale}/figures`} className="hover:text-white transition">Shop figures</Link></li>
            <li><Link href={`/${locale}/reviews`} className="hover:text-white transition">Customer ratings</Link></li>
            <li><Link href={`/${locale}/privacy`} className="hover:text-white transition">Privacy</Link></li>
            <li><Link href={`/${locale}/terms`} className="hover:text-white transition">Terms</Link></li>
            <li><Link href={`/${locale}/report-scam`} className="hover:text-white transition">Report a scam site</Link></li>
            {LegalGovernanceService.publicLinks().map((link) => (
              <li key={link.type}><Link href={`/${locale}${link.href}`} className="hover:text-white transition">{link.type}</Link></li>
            ))}
            {Object.keys(LegalGovernanceService.publicProfile()).length > 0 && (
              <li><Link href={`/${locale}/legal/company`} className="hover:text-white transition">Company information</Link></li>
            )}
          </ul>
        </div>

        {/* Newsletter Signup */}
        <div className="space-y-3">
          <h4 className="font-semibold text-neutral-200 tracking-wider uppercase text-[11px]">Botanical Journal</h4>
          <p className="text-neutral-400">
            Receive laboratory release bulletins, private batch allocations, and European dispatch notices.
          </p>
          <Link href={`/${locale}/news`} className="inline-block text-neutral-300 hover:text-white transition">Read the store notes</Link>
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
              <p className="text-[10px] text-neutral-500">Newsletter delivery is not production-active. Joining this list does not confirm a marketing email was sent.</p>
            </form>
          )}
        </div>
      </div>

      {/* Regulatory Notice & Bottom Bar */}
      <div className="border-t border-neutral-900 bg-neutral-950 py-6 text-[11px] text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <p className="leading-relaxed">
            Age verification at delivery is not configured. Product claims stay unpublished until a specialist review approves the public text.
          </p>
          <div className="flex flex-wrap justify-between items-center gap-4 pt-2 border-t border-neutral-900">
            <p>&copy; {new Date().getFullYear()} Fusion Mushroom Bars EU.</p>
            <p>Production Target: Vercel &bull; Next.js 16 App Router &bull; PostgreSQL &bull; Server-Authoritative Commerce</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
