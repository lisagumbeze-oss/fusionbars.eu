import React from 'react';
import { notFound } from 'next/navigation';
import { SUPPORTED_LOCALES } from '@/i18n';
import { LocaleCode } from '@/types';
import { CommerceProvider } from '@/context/CommerceContext';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { ensureAdminOverridesLoaded } from '@/domain/admin/AdminOverrideStore';
import SiteChrome from '@/components/site/SiteChrome';

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

  ensureAdminOverridesLoaded();
  const operations = AdminOverrides.settingsSaved() ? AdminOverrides.settings() : null;

  return (
    <CommerceProvider initialLocale={locale} operations={operations}>
      <SiteChrome>{children}</SiteChrome>
    </CommerceProvider>
  );
}
