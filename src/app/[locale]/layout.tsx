import React from 'react';
import { notFound } from 'next/navigation';
import { SUPPORTED_LOCALES } from '@/i18n';
import { LocaleCode } from '@/types';
import { CommerceProvider } from '@/context/CommerceContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import CookieConsentBanner from '@/components/CookieConsentBanner';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as LocaleCode;

  if (!SUPPORTED_LOCALES.includes(locale)) {
    notFound();
  }

  return (
    <CommerceProvider initialLocale={locale}>
      <div className="flex min-h-screen flex-col bg-[#FBFBF9] text-[#121212]">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <CookieConsentBanner />
      </div>
    </CommerceProvider>
  );
}
