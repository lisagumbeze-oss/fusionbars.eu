import ShippingCenter from '@/components/admin/ShippingCenter';
import { LaunchCatalogueService } from '@/domain/catalog/LaunchCatalogueService';

export const dynamic = 'force-dynamic';

export default async function ProductEligibilityPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const { scope } = await searchParams;
  const launch = scope === 'launch' ? LaunchCatalogueService.eligibilityRows() : [];
  return (
    <div className="space-y-6">
      {scope === 'launch' && (
        <section className="rounded-xl border border-[#E5E3DD] bg-white p-4 text-sm text-[#1C1917]">
          <h2 className="font-serif text-lg">Launch destinations</h2>
          <p className="mt-2 text-xs text-[#5C5852]">Product eligibility stays unresolved until a compliance decision names the country. There is no allow-all-Europe action.</p>
          <ul className="mt-3 space-y-1 text-xs">
            {launch.map((row) => (
              <li key={`${row.product}-${row.country}`}>{row.product} · {row.country} · {row.decision} · shipping {row.shipping}{row.blocking ? ` · ${row.blocking}` : ''}</li>
            ))}
          </ul>
        </section>
      )}
      <ShippingCenter view="eligibility" />
    </div>
  );
}