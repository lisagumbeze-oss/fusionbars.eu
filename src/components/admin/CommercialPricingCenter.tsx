'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { getCommercialDashboardAction } from '@/actions/commercial';
import { useAdminRole } from '@/components/admin/AdminShell';

function money(amount: number | null, currency: 'EUR' | 'GBP') {
  if (amount == null) return '—';
  return new Intl.NumberFormat(currency === 'GBP' ? 'en-GB' : 'en-IE', { style: 'currency', currency }).format(amount / 100);
}

export default function CommercialPricingCenter() {
  const { role } = useAdminRole();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';
  const launchOnly = useSearchParams().get('scope') === 'launch';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getCommercialDashboardAction(role, search, page, launchOnly).then((result) => {
      if (cancelled) return;
      if (!result.success) setError(result.error);
      else setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [role, search, page, launchOnly]);

  if (error) return <p className="text-sm text-rose-800">{error}</p>;
  if (!data) return <p className="text-sm text-[#5C5852]">Loading commercial pricing…</p>;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Approved EUR" value={data.summary.approvedEur} />
        <Stat label="Approved GBP" value={data.summary.approvedGbp} />
        <Stat label="Pilot deferred" value={data.cohort.deferred} />
        <Stat label="Pilot not applicable" value={data.cohort.notApplicable} />
      </div>
      <p className="text-xs text-[#5C5852]">
        Catalogue amounts are labelled separately from approved commercial prices. Source prices are not store prices. Production is {data.production}. Pricing mode is {data.summary.pricingMode}. Tax display is {data.summary.taxDisplayMode}.
      </p>
      <p className="text-xs">
        <Link href={`/${locale}/admin/pricing?scope=launch`} className="underline">Launch catalogue</Link>
        {' · '}
        <Link href={`/${locale}/admin/pricing`} className="underline">All products</Link>
        {launchOnly ? ' · Showing launch-selected products only. None are selected until an authorised choice is recorded.' : ''}
      </p>
      <input
        value={search}
        onChange={(event) => {
          setPage(1);
          setSearch(event.target.value);
        }}
        placeholder="Search product or category"
        className="w-full max-w-md rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm"
      />
      <div className="overflow-x-auto rounded-xl border border-[#E5E3DD] bg-white">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[#F7F6F3] text-[#5C5852]">
            <tr>
              {['Product', 'Variant', 'Source', 'Catalogue EUR', 'Approved EUR', 'Approved GBP', 'Status', 'Tax class', 'Reviewer', 'Effective'].map((heading) => (
                <th key={heading} className="px-3 py-2 font-semibold">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row: any) => (
              <tr key={row.slug} className="border-t border-[#E5E3DD]">
                <td className="px-3 py-2">{row.name}</td>
                <td className="px-3 py-2">{row.variant}</td>
                <td className="px-3 py-2">{row.sourceLabel}</td>
                <td className="px-3 py-2">{money(row.catalogueEur, 'EUR')}</td>
                <td className="px-3 py-2">{money(row.approvedEur, 'EUR')}</td>
                <td className="px-3 py-2">{money(row.approvedGbp, 'GBP')}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.taxClass}</td>
                <td className="px-3 py-2">{row.reviewer || '—'}</td>
                <td className="px-3 py-2">{row.effectiveFrom || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button>
        <span>Page {data.page} of {data.pages}</span>
        <button type="button" disabled={page >= data.pages} onClick={() => setPage((current) => current + 1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#E5E3DD] bg-white p-4">
      <p className="text-[11px] uppercase tracking-wide text-[#5C5852]">{label}</p>
      <p className="mt-1 font-serif text-2xl text-[#121212]">{value}</p>
    </div>
  );
}
