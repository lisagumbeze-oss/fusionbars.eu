'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getShippingDashboardAction } from '@/actions/shipping';
import { useAdminRole } from '@/components/admin/AdminShell';

export default function ShippingCenter({ view = 'overview' }: { view?: 'overview' | 'countries' | 'eligibility' }) {
  const { role } = useAdminRole();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getShippingDashboardAction(role).then((result) => {
      if (!result.success) setError(result.error);
      else setData(result);
    });
  }, [role]);

  if (error) return <p className="text-sm text-rose-800">{error}</p>;
  if (!data) return <p className="text-sm text-[#5C5852]">Loading shipping configuration…</p>;
  const summary = data.summary;
  const countries = data.countries.filter((country: { storeStatus: string }) => filter === 'all' || country.storeStatus === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-xs">
        <Link href={`/${locale}/admin/shipping`} className="underline">Overview</Link>
        <Link href={`/${locale}/admin/shipping/countries`} className="underline">Countries</Link>
        <Link href={`/${locale}/admin/shipping/product-eligibility`} className="underline">Product eligibility</Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Enabled destinations" value={summary.enabled} />
        <Stat label="Disabled destinations" value={summary.disabled} />
        <Stat label="Pilot countries unresolved" value={summary.pilotNotConfigured} />
        <Stat label="Active hubs" value={summary.activeHubs} />
      </div>
      {view !== 'eligibility' && (
        <section className="space-y-3">
          <div className="flex gap-2 text-xs">
            {['all', 'ENABLED', 'DISABLED', 'REVIEW_REQUIRED', 'NOT_CONFIGURED'].map((item) => (
              <button key={item} type="button" onClick={() => setFilter(item)} className="rounded border px-2 py-1">{item}</button>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-[#E5E3DD] bg-white">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] text-[#5C5852]">
                <tr>
                  {['Country', 'Store status', 'Group', 'Currency', 'Express', 'Hub routing'].map((heading) => (
                    <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {countries.slice(0, view === 'countries' ? countries.length : 12).map((country: any) => (
                  <tr key={country.code} className="border-t border-[#E5E3DD]">
                    <td className="px-3 py-2">{country.name} ({country.code})</td>
                    <td className="px-3 py-2">{country.storeStatus}</td>
                    <td className="px-3 py-2">{country.group}</td>
                    <td className="px-3 py-2">{country.currency}</td>
                    <td className="px-3 py-2">{country.express ? 'Available' : 'Unavailable'}</td>
                    <td className="px-3 py-2">{country.storeStatus === 'ENABLED' ? 'Configured route' : 'No route'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {view === 'eligibility' && (
        <section className="rounded-xl border border-[#E5E3DD] bg-white p-4 text-sm">
          <h2 className="font-serif text-lg">Pilot product eligibility</h2>
          <p className="mt-2 text-xs text-[#5C5852]">These rows are the saved specialist state. This screen does not create country approvals.</p>
          <ul className="mt-3 space-y-1 text-xs">
            {data.cohort.map((row: any) => (
              <li key={row.slug}>{row.slug}: {row.eligibility}; compliance {row.compliance}; country decisions {row.countryDecisions}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="grid gap-4 lg:grid-cols-2 text-xs">
        <div className="rounded-xl border border-[#E5E3DD] bg-white p-4">
          <h2 className="font-serif text-lg">Shipping methods</h2>
          <p className="mt-2">Standard €15. Express €20. Free standard delivery from €300. Basis {summary.shipping.thresholdBasis}. GBP prices are explicit.</p>
          <p className="mt-2">Discreet packaging is supported. Public carrier tracking is off. Age verification at delivery is off.</p>
        </div>
        <div className="rounded-xl border border-[#E5E3DD] bg-white p-4">
          <h2 className="font-serif text-lg">Precedence</h2>
          <ol className="mt-2 list-decimal pl-4">
            {summary.precedence.map((step: string) => <li key={step}>{step}</li>)}
          </ol>
          <p className="mt-2">Write access: {data.canWrite ? 'Compliance or Super Admin' : 'View only'}. Production {data.production}.</p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#E5E3DD] bg-white p-4">
      <p className="text-[11px] uppercase tracking-wide text-[#5C5852]">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
    </div>
  );
}
