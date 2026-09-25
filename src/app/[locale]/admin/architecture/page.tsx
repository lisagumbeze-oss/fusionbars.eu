import React from 'react';
import ArchitectureDashboard from '@/components/ArchitectureDashboard';
import { LocaleCode } from '@/types';

interface AdminArchitecturePageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export default async function AdminArchitecturePage({ params }: AdminArchitecturePageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as LocaleCode;

  return <ArchitectureDashboard initialLocale={locale} />;
}
