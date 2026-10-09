'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, Heart, Menu, X, Shield, User, ChevronDown } from 'lucide-react';
import WhatsAppLink from './WhatsAppLink';
import AnnouncementBar from './AnnouncementBar';
import SearchModal from './SearchModal';
import { useCommerce } from '../context/CommerceContext';
import { getDictionary } from '../i18n';

export default function Header() {
  const { locale, cartCount, wishlist } = useCommerce();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const dict = getDictionary(locale);

  const homeHref = `/${locale}`;
  const isHome = pathname === homeHref || pathname === `${homeHref}/`;

  const navGroups = [
    {
      label: dict.bottomBar.shop,
      items: [
        { label: 'All products', href: `/${locale}/shop` },
        { label: 'Chocolate Bars', href: `/${locale}/shop?category=artisan-chocolate-bars` },
        { label: 'Gummies', href: `/${locale}/shop?category=gummies` },
        { label: 'Collections', href: `/${locale}/shop?category=bundles-collections` },
        { label: 'Wholesale', href: `/${locale}/shop?category=wholesale` },
      ],
    },
    {
      label: dict.navigation.about,
      items: [
        { label: dict.navigation.about, href: `/${locale}/about` },
        { label: 'News', href: `/${locale}/news` },
        { label: 'Glossary', href: `/${locale}/glossary` },
        { label: 'Compare', href: `/${locale}/compare` },
        { label: 'Shop figures', href: `/${locale}/figures` },
        { label: 'Customer ratings', href: `/${locale}/reviews` },
      ],
    },
    {
      label: 'Support',
      items: [
        { label: 'Contact', href: `/${locale}/contact` },
        { label: dict.navigation.faq, href: `/${locale}/faq` },
        { label: 'Shipping', href: `/${locale}/shipping` },
        { label: 'Refunds', href: `/${locale}/refunds` },
        { label: 'Order Status', href: `/${locale}/orders/lookup` },
        { label: 'Report a scam', href: `/${locale}/report-scam` },
        { label: 'Terms', href: `/${locale}/terms` },
      ],
    },
  ];

  const itemPath = (href: string) => href.split('?')[0].replace(/\/$/, '');

  const isGroupActive = (items: { href: string }[]) =>
    items.some((item) => {
      const path = itemPath(item.href);
      if (pathname === path || pathname.startsWith(`${path}/`)) return true;
      return path.endsWith('/shop') && pathname.startsWith(`/${locale}/products`);
    });

  return (
    <>
      <div className="sticky top-0 z-40">
      <AnnouncementBar />

      <header className="glass-bar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Mobile Menu Toggle & Brand */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden -ml-2 p-2 text-[#121212] transition hover:text-[#4A5D4E] motion-safe:active:scale-95"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href={`/${locale}`} className="flex items-center gap-2 group" aria-label="Fusion Mushroom Bars EU home">
                <Image
                  src="/images/brand/fusion-logo.png"
                  alt="Fusion"
                  width={1024}
                  height={394}
                  priority
                  className="h-9 sm:h-11 w-auto"
                />
                <span className="text-[10px] tracking-widest uppercase text-[#5C5852] font-medium">EU</span>
              </Link>
            </div>

            <nav className="hidden lg:flex items-center gap-5 xl:gap-8 text-[12px] xl:text-[13px] font-medium text-[#5C5852]" aria-label="Primary">
              <Link
                href={homeHref}
                className={`group relative py-1 transition-colors ${isHome ? 'text-[#121212] font-semibold' : 'hover:text-[#121212]'}`}
              >
                {dict.bottomBar.home}
                <span
                  className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left rounded-full bg-[#4A5D4E] motion-safe:transition-[scale] motion-safe:duration-200 ${
                    isHome ? 'scale-x-100' : 'scale-x-0 motion-safe:group-hover:scale-x-100'
                  }`}
                />
              </Link>
              {navGroups.map((group) => {
                const active = isGroupActive(group.items);
                return (
                  <div key={group.label} className="relative group/menu">
                    <button
                      type="button"
                      className={`relative inline-flex items-center gap-1 py-1 transition-colors ${
                        active ? 'text-[#121212] font-semibold' : 'hover:text-[#121212]'
                      }`}
                      aria-haspopup="true"
                    >
                      {group.label}
                      <ChevronDown className="h-3.5 w-3.5 opacity-70 motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover/menu:rotate-180 motion-safe:group-focus-within/menu:rotate-180" />
                      <span
                        className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left rounded-full bg-[#4A5D4E] motion-safe:transition-[scale] motion-safe:duration-200 ${
                          active ? 'scale-x-100' : 'scale-x-0 motion-safe:group-hover/menu:scale-x-100'
                        }`}
                      />
                    </button>
                    <div className="absolute left-0 top-full z-50 hidden pt-2 group-hover/menu:block group-focus-within/menu:block">
                      <div className="min-w-52 rounded-xl border border-[#E5E3DD] bg-[#FBFBF9] py-2 shadow-[0_12px_40px_rgba(18,18,18,0.08)]">
                        {group.items.map((item) => {
                          const itemActive = !item.href.includes('?') && pathname === itemPath(item.href);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`block px-4 py-2 text-[13px] transition-colors hover:bg-[#F0F4F1] hover:text-[#121212] ${
                                itemActive ? 'font-semibold text-[#121212]' : 'text-[#5C5852]'
                              }`}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-4 text-[#121212]">
              <WhatsAppLink className="p-2" />
              {/* Search — desktop only; mobile uses the bottom nav */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden lg:inline-flex p-2 text-[#5C5852] hover:text-[#121212] transition motion-safe:active:scale-95"
                aria-label="Search catalog"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Account — desktop only; mobile uses the bottom nav */}
              <Link
                href={`/${locale}/account`}
                className="hidden lg:inline-flex p-2 text-[#5C5852] hover:text-[#121212] transition motion-safe:active:scale-95"
                aria-label="Customer Account Portal"
                title="Customer Account"
              >
                <User className="w-5 h-5" />
              </Link>

              {/* Wishlist Link */}
              <Link
                href={`/${locale}/shop`}
                className="p-2 text-[#5C5852] hover:text-[#121212] transition relative hidden sm:block"
                aria-label="View wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#4A5D4E] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* Cart — desktop only; mobile uses the bottom nav */}
              <Link
                href={`/${locale}/cart`}
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-[#121212] hover:text-[#4A5D4E] transition rounded-lg hover:bg-neutral-100 motion-safe:active:scale-[0.98]"
                aria-label={`Shopping bag, ${cartCount} items`}
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#4A5D4E] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold hidden md:inline">Bag</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E5E3DD] bg-[#FBFBF9] px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
            <nav className="flex flex-col space-y-4 text-sm font-medium text-[#121212]">
              <Link
                href={homeHref}
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-2 px-3 rounded hover:bg-[#F0F4F1] transition"
              >
                {dict.bottomBar.home}
              </Link>
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5C5852]">{group.label}</p>
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block py-2 px-3 rounded hover:bg-[#F0F4F1] transition"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ))}
              <div className="pt-2 border-t border-[#E5E3DD]">
                <Link
                  href={`/${locale}/admin`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2 py-2 px-3 text-[#5C5852] text-xs"
                >
                  <Shield className="w-4 h-4" /> Admin Catalogue Preview
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
      </div>

      {/* Global Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
