'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Store, Search, ShoppingBag, User } from 'lucide-react';
import { useCommerce } from '../context/CommerceContext';
import { getDictionary } from '../i18n';
import SearchModal from './SearchModal';

const HIDDEN_PATH_SEGMENTS = ['/admin', '/checkout'];

export default function MobileBottomNav() {
  const { locale, cartCount } = useCommerce();
  const pathname = usePathname();
  const dict = getDictionary(locale);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const shouldHide = HIDDEN_PATH_SEGMENTS.some((segment) => pathname.includes(segment));

  if (shouldHide) {
    return null;
  }

  const homeHref = `/${locale}`;
  const shopHref = `/${locale}/shop`;
  const accountHref = `/${locale}/account`;

  const isHomeActive =
    !isSearchOpen && (pathname === homeHref || pathname === `${homeHref}/`);
  const isShopActive =
    !isSearchOpen &&
    (pathname.startsWith(`/${locale}/shop`) || pathname.startsWith(`/${locale}/products`));
  const isCartActive = pathname.startsWith(`/${locale}/cart`);
  const isAccountActive = !isSearchOpen && pathname.startsWith(accountHref);

  const itemClass = (active: boolean) =>
    `relative flex flex-col items-center justify-center gap-0.5 min-h-16 min-w-0 px-1 text-[10px] font-medium tracking-wide transition-colors duration-150 motion-safe:active:scale-[0.97] ${
      active ? 'text-[#4A5D4E]' : 'text-[#5C5852] hover:text-[#121212]'
    }`;

  return (
    <>
      <div
        className="lg:hidden h-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom,0px))]"
        aria-hidden="true"
      />

      <nav
        aria-label="Mobile primary navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#E5E3DD] bg-[#FBFBF9]/95 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <ul className="grid grid-cols-5 max-w-lg mx-auto">
          <li>
            <Link
              href={homeHref}
              aria-current={isHomeActive ? 'page' : undefined}
              className={itemClass(isHomeActive)}
            >
              {isHomeActive && <ActiveMarker />}
              <Home className="w-5 h-5" strokeWidth={isHomeActive ? 2.25 : 1.75} aria-hidden="true" />
              <span>{dict.bottomBar.home}</span>
            </Link>
          </li>

          <li>
            <Link
              href={shopHref}
              aria-current={isShopActive ? 'page' : undefined}
              className={itemClass(isShopActive)}
            >
              {isShopActive && <ActiveMarker />}
              <Store className="w-5 h-5" strokeWidth={isShopActive ? 2.25 : 1.75} aria-hidden="true" />
              <span>{dict.bottomBar.shop}</span>
            </Link>
          </li>

          <li>
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label={dict.bottomBar.search}
              aria-expanded={isSearchOpen}
              aria-haspopup="dialog"
              className={`w-full ${itemClass(isSearchOpen)}`}
            >
              {isSearchOpen && <ActiveMarker />}
              <Search className="w-5 h-5" strokeWidth={isSearchOpen ? 2.25 : 1.75} aria-hidden="true" />
              <span>{dict.bottomBar.search}</span>
            </button>
          </li>

          <li>
            <Link
              href={`/${locale}/cart`}
              aria-label={`${dict.navigation.cart}, ${cartCount} items`}
              aria-current={pathname.startsWith(`/${locale}/cart`) ? 'page' : undefined}
              className={`w-full ${itemClass(isCartActive)}`}
            >
              {isCartActive && <ActiveMarker />}
              <span className="relative">
                <ShoppingBag
                  className="w-5 h-5"
                  strokeWidth={isCartActive ? 2.25 : 1.75}
                  aria-hidden="true"
                />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-0.5 bg-[#4A5D4E] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </span>
              <span>{dict.bottomBar.cart}</span>
            </Link>
          </li>

          <li>
            <Link
              href={accountHref}
              aria-current={isAccountActive ? 'page' : undefined}
              className={itemClass(isAccountActive)}
            >
              {isAccountActive && <ActiveMarker />}
              <User className="w-5 h-5" strokeWidth={isAccountActive ? 2.25 : 1.75} aria-hidden="true" />
              <span>{dict.bottomBar.account}</span>
            </Link>
          </li>
        </ul>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

function ActiveMarker() {
  return (
    <span
      aria-hidden="true"
      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[#4A5D4E]"
    />
  );
}
