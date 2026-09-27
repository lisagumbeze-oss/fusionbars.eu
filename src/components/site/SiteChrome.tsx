'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import CartDrawer from '@/components/CartDrawer';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import SmartsuppChat from '@/components/SmartsuppChat';
import BackToTop from '@/components/BackToTop';

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  if (pathname.includes('/admin')) {
    return <div className="min-h-screen bg-[#F4F3EF] text-[#121212]">{children}</div>;
  }
  return (
    <div className="flex min-h-screen flex-col bg-[#FBFBF9] text-[#121212]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <MobileBottomNav />
      <CartDrawer />
      <CookieConsentBanner />
      <SmartsuppChat />
      <BackToTop />
    </div>
  );
}
