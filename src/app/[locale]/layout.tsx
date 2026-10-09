import React from 'react';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SUPPORTED_LOCALES } from '@/i18n';
import { LocaleCode } from '@/types';
import { CommerceProvider } from '@/context/CommerceContext';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { ensureAdminOverridesLoaded } from '@/domain/admin/AdminOverrideStore';
import SiteChrome from '@/components/site/SiteChrome';
import PageLinkIndex from '@/components/site/PageLinkIndex';
import { indexingRobots, indexableUrl, isPrivateStorePath, localeFromPath } from '@/lib/search-indexing';

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';
  const locale = headerList.get('x-locale') || localeFromPath(pathname || '/en');
  if (!pathname || isPrivateStorePath(pathname)) {
    return { robots: { index: false, follow: false } };
  }
  return {
    robots: indexingRobots(locale, pathname),
    alternates: { canonical: indexableUrl(pathname) },
  };
}

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
  const headerList = await headers();
  const pathname = headerList.get('x-pathname') || '';
  const showPageLinks = !pathname.includes('/admin');

  return (
    <CommerceProvider initialLocale={locale} operations={operations}>
      <SiteChrome>
        {children}
        {showPageLinks && <PageLinkIndex locale={locale} currentPath={pathname} />}
      </SiteChrome>
    </CommerceProvider>
  );
}
