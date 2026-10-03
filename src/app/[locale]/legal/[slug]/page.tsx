import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { LegalDocType, LegalGovernanceService, LegalLocale } from '@/domain/legal/LegalGovernanceService';
import { INDEXABLE_LOCALE, SITE_ORIGIN } from '@/lib/search-indexing';

const SLUGS: LegalDocType[] = ['terms', 'privacy', 'cookies', 'refunds', 'shipping', 'payment', 'imprint'];
const LEGAL_LOCALES: LegalLocale[] = ['en', 'de', 'fr', 'es', 'it', 'nl'];

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const type = slug as LegalDocType;
  const requested = LEGAL_LOCALES.includes(locale as LegalLocale) ? locale as LegalLocale : INDEXABLE_LOCALE;
  const document = SLUGS.includes(type) ? LegalGovernanceService.active(type, requested) : null;
  const translated = Boolean(document && !document.fallback);
  return {
    title: document?.title || 'Legal document',
    robots: translated ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical: translated
        ? `${SITE_ORIGIN}/${requested}/legal/${type}`
        : `${SITE_ORIGIN}/${INDEXABLE_LOCALE}/legal/${type}`,
    },
  };
}

export default async function LegalDocumentPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!SLUGS.includes(slug as LegalDocType)) notFound();
  const document = LegalGovernanceService.active(slug as LegalDocType, locale === 'de' || locale === 'fr' || locale === 'es' || locale === 'it' || locale === 'nl' ? locale : 'en');
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6 text-[#1C1917]">
      {document ? (
        <>
          <h1 className="font-serif text-3xl">{document.title}</h1>
          <p className="text-sm text-[#5C5852]">Version {document.version}{document.effectiveDate ? ` · Effective ${document.effectiveDate}` : ''}{document.fallback ? ' · Shown from the configured fallback locale. This page is not a translation.' : ''}</p>
          <article className="whitespace-pre-wrap text-sm leading-relaxed">{document.content}</article>
        </>
      ) : (
        <>
          <h1 className="font-serif text-3xl">Document not published</h1>
          <p className="text-sm text-[#5C5852]">This legal document is not published. A draft or review copy is not shown as the active policy.</p>
        </>
      )}
      <Link href={`/${locale}/contact`} className="text-sm underline">Contact support</Link>
    </div>
  );
}
