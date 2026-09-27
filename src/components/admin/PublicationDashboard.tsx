'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getPublicationDashboardAction } from '@/actions/admin-center';
import { useAdminRole } from '@/components/admin/AdminShell';

const VISUAL: Record<string, string> = {
  COMPLETE: 'bg-emerald-100 text-emerald-900',
  PENDING: 'bg-amber-100 text-amber-900',
  BLOCKED: 'bg-rose-100 text-rose-900',
  REJECTED: 'bg-rose-200 text-rose-950',
  DO_NOT_PUBLISH: 'bg-rose-300 text-rose-950',
  NOT_READY: 'bg-amber-100 text-amber-900',
  READY_FOR_PUBLICATION: 'bg-sky-100 text-sky-900',
  PUBLISHED: 'bg-emerald-100 text-emerald-900',
  UNPUBLISHED: 'bg-stone-200 text-stone-800',
  NOT_PUBLISHED: 'bg-stone-100 text-stone-700',
};

function Pill({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${VISUAL[value] || 'bg-stone-100 text-stone-700'}`}>{value}</span>;
}

export default function PublicationDashboard() {
  const { role } = useAdminRole();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [reviewer, setReviewer] = useState('all');
  const [compliance, setCompliance] = useState('all');
  const [country, setCountry] = useState('all');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPublicationDashboardAction(role).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError('error' in result ? result.error : 'Publication dashboard is unavailable.');
        return;
      }
      setData(result);
    });
    return () => { cancelled = true; };
  }, [role]);

  const categories = useMemo(() => [...new Set((data?.rows || []).map((row: any) => row.category).filter(Boolean))], [data]);
  const reviewers = useMemo(() => [...new Set((data?.rows || []).map((row: any) => row.reviewer).filter(Boolean))], [data]);
  const rows = useMemo(() => {
    return (data?.rows || []).filter((row: any) => {
      if (status !== 'all' && row.readiness !== status && row.publicationStatus !== status) return false;
      if (category !== 'all' && row.category !== category) return false;
      if (reviewer !== 'all' && row.reviewer !== reviewer) return false;
      const complianceGate = row.gates?.find((item: any) => item.gate === 'compliance');
      const countryGate = row.gates?.find((item: any) => item.gate === 'country');
      if (compliance !== 'all' && complianceGate?.status !== compliance) return false;
      if (country !== 'all' && countryGate?.status !== country) return false;
      if (date && String(row.updatedAt || '').slice(0, 10) !== date) return false;
      if (search && !`${row.name} ${row.slug}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, status, category, reviewer, compliance, country, date, search]);

  if (error) return <p className="text-sm">{error}</p>;
  if (!data) return <p className="text-sm text-[#5C5852]">Loading publication control…</p>;

  const cards = [
    ['Total catalogue', data.total],
    ['Not ready', data.notReady],
    ['Ready for publication', data.readyForPublication],
    ['Published', data.published],
    ['Do not publish', data.doNotPublish],
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm text-[#5C5852]">Production is {data.production}. Ready for publication is an internal eligibility state. It does not place a product on the storefront.</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#8E8B85]">{label}</p>
            <p className="font-serif text-2xl mt-1">{value}</p>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-serif text-lg">Products blocked by each gate</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
          {data.blockingGates.map((item: { gate: string; products: number }) => (
            <li key={item.gate} className="flex justify-between border-b border-[#E5E3DD] py-1"><span className="capitalize">{item.gate}</span><span>{item.products}</span></li>
          ))}
        </ul>
      </section>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All statuses</option>
          <option value="NOT_READY">Not ready</option>
          <option value="READY_FOR_PUBLICATION">Ready for publication</option>
          <option value="PUBLISHED">Published</option>
          <option value="DO_NOT_PUBLISH">Do not publish</option>
        </select>
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={String(item)} value={String(item)}>{String(item)}</option>)}
        </select>
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={reviewer} onChange={(event) => setReviewer(event.target.value)}>
          <option value="all">All reviewers</option>
          {reviewers.map((item) => <option key={String(item)} value={String(item)}>{String(item)}</option>)}
        </select>
        <input className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" placeholder="Search" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={compliance} onChange={(event) => setCompliance(event.target.value)}>
          <option value="all">All compliance states</option>
          <option value="DEFERRED">Deferred</option>
          <option value="DO_NOT_PUBLISH">Do not publish</option>
          <option value="APPROVED_FOR_PUBLICATION">Approved</option>
        </select>
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={country} onChange={(event) => setCountry(event.target.value)}>
          <option value="all">All country states</option>
          <option value="NOT_CONFIGURED">Not configured</option>
          <option value="CONFIGURED">Configured</option>
        </select>
        <input className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-[#8E8B85]">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Readiness</th>
              <th className="p-3">Publication</th>
              <th className="p-3">Blocking</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.slug} className="border-t border-[#E5E3DD]">
                <td className="p-3">
                  <Link className="underline" href={`/${locale}/admin/products/${row.slug}`}>{row.name}</Link>
                  <p className="text-xs text-[#8E8B85]">{row.slug}</p>
                </td>
                <td className="p-3"><Pill value={row.readiness} /></td>
                <td className="p-3"><Pill value={row.publicationStatus} /></td>
                <td className="p-3 text-xs">{row.blockers.map((item: any) => item.reason).join('; ') || 'None'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
          <h2 className="font-serif text-lg">Recently published</h2>
          <ul className="mt-2 text-sm space-y-1">
            {data.recent.filter((event: any) => event.method === 'EXPLICIT_ADMIN_PUBLISH').map((event: any) => (
              <li key={event.id}>{event.timestamp} · {event.productId} · {event.actor}</li>
            ))}
            {data.recent.every((event: any) => event.method !== 'EXPLICIT_ADMIN_PUBLISH') && <li className="text-[#5C5852]">No products have been published.</li>}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
          <h2 className="font-serif text-lg">Recently unpublished</h2>
          <ul className="mt-2 text-sm space-y-1">
            {data.recent.filter((event: any) => event.method === 'EXPLICIT_ADMIN_UNPUBLISH').map((event: any) => (
              <li key={event.id}>{event.timestamp} · {event.productId} · {event.actor}</li>
            ))}
            {data.recent.every((event: any) => event.method !== 'EXPLICIT_ADMIN_UNPUBLISH') && <li className="text-[#5C5852]">No products have been unpublished.</li>}
          </ul>
        </div>
      </section>
    </div>
  );
}
