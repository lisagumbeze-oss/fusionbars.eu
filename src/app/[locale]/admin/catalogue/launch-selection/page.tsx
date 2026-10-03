import Link from 'next/link';
import { LaunchCatalogueService } from '@/domain/catalog/LaunchCatalogueService';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';

export const dynamic = 'force-dynamic';

const FILTERS = [
  ['all', 'All'],
  ['data-adjudicated', 'Data adjudicated'],
  ['pricing-approved', 'Pricing approved'],
  ['compliance-approved', 'Compliance approved'],
  ['country-configured', 'Country configured'],
  ['content-approved', 'Content approved'],
  ['media-verified', 'Media verified'],
  ['translations-complete', 'Translations complete'],
  ['ready', 'Ready for publication'],
  ['blocked', 'Blocked'],
  ['do-not-publish', 'Do not publish'],
] as const;

export default async function LaunchSelectionPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ filter?: string }> }) {
  const { locale } = await params;
  const { filter } = await searchParams;
  const rows = LaunchCatalogueService.queue(filter || 'all');
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <p className="text-xs text-[#5C5852]">Production {PRODUCTION_CONTROL_STATE}. Selection is intent only. The first ten are not selected automatically. Audit Test Product cannot be selected.</p>
      <div className="flex flex-wrap gap-2 text-xs">
        {FILTERS.map(([id, label]) => (
          <Link key={id} href={`/${locale}/admin/catalogue/launch-selection?filter=${id}`} className="rounded border border-[#E5E3DD] px-2 py-1">{label}</Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#E5E3DD] bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[#F7F6F3] text-[#5C5852]">
            <tr>
              {['Product', 'Data', 'Pricing', 'Compliance', 'Country', 'Content', 'Media', 'Translation', 'Publication', 'Launch'].map((heading) => (
                <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug} className="border-t border-[#E5E3DD]">
                <td className="px-3 py-2"><Link href={`/${locale}/admin/catalogue/launch?product=${row.slug}`} className="underline">{row.name}</Link></td>
                <td className="px-3 py-2">{row.data}</td>
                <td className="px-3 py-2">{row.pricing}</td>
                <td className="px-3 py-2">{row.compliance}</td>
                <td className="px-3 py-2">{row.country}</td>
                <td className="px-3 py-2">{row.content}</td>
                <td className="px-3 py-2">{row.media}</td>
                <td className="px-3 py-2">{row.translation}</td>
                <td className="px-3 py-2">{row.publication}</td>
                <td className="px-3 py-2">{row.selection}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
