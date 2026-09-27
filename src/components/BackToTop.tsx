'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';

export default function BackToTop() {
  const pathname = usePathname() || '';
  const [visible, setVisible] = useState(false);
  const aboveMobileNav = !pathname.includes('/checkout');

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      className={`fixed left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[#E5E3DD] bg-[#4A5D4E] text-[#FBFBF9] shadow-lg transition hover:bg-[#3B4A3E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A5D4E] ${
        aboveMobileNav
          ? 'bottom-[calc(var(--mobile-bottom-nav-height)+1rem+env(safe-area-inset-bottom,0px))] lg:bottom-6'
          : 'bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]'
      }`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
