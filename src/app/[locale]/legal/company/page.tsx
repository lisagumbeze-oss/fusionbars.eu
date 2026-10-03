import type { Metadata } from 'next';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { INDEXABLE_LOCALE, SITE_ORIGIN } from '@/lib/search-indexing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const approved = locale === INDEXABLE_LOCALE && Object.keys(LegalGovernanceService.publicProfile()).length > 0;
  return {
    title: 'Company information',
    robots: { index: approved, follow: approved },
    alternates: { canonical: `${SITE_ORIGIN}/${INDEXABLE_LOCALE}/legal/company` },
  };
}

export default function CompanyInformationPage() {
  const visible = LegalGovernanceService.publicProfile();
  const entries = Object.entries(visible);
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-4 text-[#1C1917]">
      <h1 className="font-serif text-3xl">Company information</h1>
      {entries.length === 0 ? (
        <p className="text-sm text-[#5C5852]">Public company information has not been approved. Unconfigured legal details are not shown.</p>
      ) : (
        <dl className="text-sm space-y-2">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-[#5C5852]">{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
