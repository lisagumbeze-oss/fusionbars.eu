import Link from 'next/link';
import { LaunchCatalogueService } from '@/domain/catalog/LaunchCatalogueService';

export const dynamic = 'force-dynamic';

export default async function LaunchCataloguePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ product?: string }> }) {
  const { locale } = await params;
  const { product } = await searchParams;
  const report = LaunchCatalogueService.report();
  const focus = product || 'fusion-bars-banana-chocolate';
  const detail = LaunchCatalogueService.detail(focus);
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Launch set {report.launchSet.id}</h2>
        <p className="mt-2">Version {report.launchSet.version} · {report.launchSet.state} · selected {report.catalogue.selected} · ready {report.catalogue.ready} · blocked {report.catalogue.blocked} · do not launch {report.catalogue.doNotLaunch} · published {report.catalogue.published}</p>
        <p>Locale policy: {report.launchSet.localePolicy ? 'configured' : 'NOT_CONFIGURED'}</p>
        <p>Intended countries: {report.launchSet.intendedCountries.length === 0 ? 'NOT_CONFIGURED' : report.launchSet.intendedCountries.join(', ')}</p>
        <p>Tax: {report.tax}</p>
        <p>Production: {report.production} · GBP {report.gbp}</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-3">
        <Card label="EUR deferred" value={report.pricing.deferred} />
        <Card label="Compliance deferred" value={report.compliance.deferred} />
        <Card label="Countries unresolved" value={report.countries.unresolved} />
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">{detail.name}</h2>
        <p className="mt-2">Launch status: {detail.launchStatus} · selection {detail.selection}</p>
        <ul className="mt-3 space-y-1">
          {detail.blocking.map((row) => (
            <li key={row.id}><Link href={`/${locale}${row.href}`} className="underline">{row.id}</Link>: {row.state}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
      <p className="text-[11px] uppercase tracking-wide text-[#5C5852]">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </div>
  );
}
