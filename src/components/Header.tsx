'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, Heart, Menu, X, Shield, User } from 'lucide-react';
import AnnouncementBar from './AnnouncementBar';
import SearchModal from './SearchModal';
import { useCommerce } from '../context/CommerceContext';
import { getDictionary } from '../i18n';

export default function Header() {
  const { locale, cartCount, setIsCartOpen, wishlist } = useCommerce();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const dict = getDictionary(locale);

  const navLinks = [
    { label: dict.navigation.shop, href: `/${locale}/shop` },
    { label: 'Collections', href: `/${locale}/shop?category=bundles-collections` },
    { label: 'Chocolate Bars', href: `/${locale}/shop?category=artisan-chocolate-bars` },
    { label: 'Gummies', href: `/${locale}/shop?category=gummies` },
    { label: 'Order Status', href: `/${locale}/orders/lookup` },
    { label: 'Account', href: `/${locale}/account` },
  ];

  return (
    <>
      <div className="sticky top-0 z-40">
      <AnnouncementBar />

      <header className="bg-[#FBFBF9]/95 backdrop-blur-md border-b border-[#E5E3DD]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Left: Mobile Menu Toggle & Brand */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-[#121212] hover:text-[#4A5D4E] transition -ml-2"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <Link href={`/${locale}`} className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded bg-[#121212] text-[#FBFBF9] flex items-center justify-center font-serif text-sm tracking-wider font-bold group-hover:bg-[#4A5D4E] transition-colors">
                  F
                </div>
                <div>
                  <span className="font-serif text-base sm:text-lg tracking-wider font-bold text-[#121212] group-hover:text-[#4A5D4E] transition-colors">
                    FUSION
                  </span>
                  <span className="text-[10px] tracking-widest uppercase ml-1.5 text-[#5C5852] font-sans font-medium">
                    EU
                  </span>
                </div>
              </Link>
            </div>

            {/* Center: Desktop Navigation Links (Unboxed, clean typography) */}
            <nav className="hidden lg:flex items-center gap-8 text-[13px] font-medium text-[#5C5852]">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors py-1 relative ${
                      isActive ? 'text-[#121212] font-semibold' : 'hover:text-[#121212]'
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4A5D4E] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-4 text-[#121212]">
              {/* Search — desktop only; mobile uses the bottom nav */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden lg:inline-flex p-2 text-[#5C5852] hover:text-[#121212] transition"
                aria-label="Search catalog"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Account — desktop only; mobile uses the bottom nav */}
              <Link
                href={`/${locale}/account`}
                className="hidden lg:inline-flex p-2 text-[#5C5852] hover:text-[#121212] transition"
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
              <button
                onClick={() => setIsCartOpen(true)}
                className="hidden lg:flex items-center gap-2 px-3 py-2 text-[#121212] hover:text-[#4A5D4E] transition rounded-lg hover:bg-neutral-100"
                aria-label={`Open shopping cart, ${cartCount} items`}
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
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E5E3DD] bg-[#FBFBF9] px-4 pt-3 pb-6 space-y-3 animate-fadeIn">
            <nav className="flex flex-col space-y-2 text-sm font-medium text-[#121212]">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="py-2 px-3 rounded hover:bg-[#F0F4F1] transition"
                >
                  {link.label}
                </Link>
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
