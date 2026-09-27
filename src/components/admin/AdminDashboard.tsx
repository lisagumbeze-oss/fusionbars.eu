'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAdminDashboardAction } from '@/actions/admin-center';
import { useAdminRole } from '@/components/admin/AdminShell';

function Metric({ href, label, value, hint }: { href: string; label: string; value: number | string; hint?: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-[#E5E3DD] bg-white p-4 hover:border-[#4A5D4E]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#5C5852]">{label}</p>
      <p className="mt-1 font-serif text-2xl">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[#5C5852]">{hint}</p>}
    </Link>
  );
}

export default function AdminDashboard() {
  const { role } = useAdminRole();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale || 'en';
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminDashboardAction>> | null>(null);

  async function load() {
    setState('loading');
    setError('');
    try {
      const result = await getAdminDashboardAction(role, locale);
      if (!result.success) {
        setError('error' in result ? result.error : 'Dashboard is unavailable.');
        setState('error');
        return;
      }
      setData(result);
      setState('ready');
    } catch (err: any) {
      setError(err.message || 'Dashboard is unavailable.');
      setState('error');
    }
  }

  useEffect(() => {
    load();
  }, [role, locale]);

  if (state === 'loading') return <p className="text-sm text-[#5C5852]">Loading operational dashboard…</p>;
  if (state === 'error' || !data || !data.success) {
    return (
      <div className="rounded-xl border border-[#E5E3DD] bg-white p-6">
        <p className="text-sm">{error || 'Dashboard is unavailable.'}</p>
        <button type="button" onClick={load} className="mt-3 text-sm font-semibold text-[#4A5D4E] underline">Retry</button>
      </div>
    );
  }

  const catalogue = data.catalogue;
  const base = `/${locale}/admin`;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Production</p>
        <p className="font-serif text-3xl text-amber-950">{data.productionState}</p>
        <p className="mt-1 text-sm text-amber-900">Launch control has not been cleared. Open blockers stay listed on the launch page.</p>
        <Link href={`${base}/system/launch`} className="mt-3 inline-block text-sm font-semibold underline">Open launch control</Link>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Action needed</h2>
        {data.notifications.filter((item) => !item.read).length === 0 ? (
          <p className="rounded-xl border border-[#E5E3DD] bg-white p-4 text-sm text-[#5C5852]">No operational alerts are waiting.</p>
        ) : (
          <ul className="space-y-2">
            {data.notifications.filter((item) => !item.read).map((item) => (
              <li key={item.id}>
                <Link href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-[#E5E3DD] bg-white px-4 py-3 text-sm hover:border-[#4A5D4E]">
                  <span>{item.title}</span>
                  <span className="text-[11px] uppercase tracking-wider text-[#5C5852]">{item.severity}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Orders</h2>
        {!data.ordersAvailable ? (
          <div className="rounded-xl border border-[#E5E3DD] bg-white p-4 text-sm">
            <p>{data.ordersError || 'Order metrics are unavailable.'}</p>
            <button type="button" onClick={load} className="mt-2 text-sm font-semibold text-[#4A5D4E] underline">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Metric href={`${base}/orders?status=PENDING_PAYMENT`} label="Pending payment" value={data.orderCounts.PENDING_PAYMENT} />
            <Metric href={`${base}/orders?status=PAYMENT_SUBMITTED`} label="Payment submitted" value={data.orderCounts.PAYMENT_SUBMITTED} />
            <Metric href={`${base}/orders?status=PAYMENT_VERIFIED`} label="Payment verified" value={data.orderCounts.PAYMENT_VERIFIED} />
            <Metric href={`${base}/orders?status=PROCESSING`} label="Processing" value={data.orderCounts.PROCESSING} />
            <Metric href={`${base}/orders?status=SHIPPED`} label="Shipped" value={data.orderCounts.SHIPPED} />
            <Metric href={`${base}/orders?status=DELIVERED`} label="Delivered" value={data.orderCounts.DELIVERED} />
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">Catalogue</h2>
        {!catalogue.available ? (
          <div className="rounded-xl border border-[#E5E3DD] bg-white p-4 text-sm">
            <p>{catalogue.error}</p>
            <button type="button" onClick={load} className="mt-2 text-sm font-semibold text-[#4A5D4E] underline">Retry</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <Metric href={`${base}/products`} label="Total products" value={catalogue.totalProducts} />
            <Metric href={`${base}/catalogue`} label="Data adjudicated" value={catalogue.dataAdjudicated} />
            <Metric href={`${base}/catalogue/review-workspace/specialist-review`} label="Specialist review pending" value={catalogue.specialistPending} />
            <Metric href={`${base}/catalogue`} label="Publication ready" value={catalogue.publicationReady} />
            <Metric href={`${base}/catalogue`} label="Published" value={catalogue.published} />
            <Metric href={`${base}/catalogue`} label="Do not publish" value={catalogue.doNotPublish} />
          </div>
        )}
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="font-serif text-xl">Payments</h2>
          <div className="grid gap-3">
            <Metric href={`${base}/payments?status=PAYMENT_SUBMITTED`} label="Awaiting verification" value={data.ordersAvailable ? data.payments.awaiting : '—'} />
            <Metric href={`${base}/orders?status=PAYMENT_VERIFIED`} label="Verified" value={data.ordersAvailable ? data.payments.verified : '—'} />
            <Metric href={`${base}/payments`} label="Rejected" value={data.ordersAvailable ? data.payments.rejected : '—'} />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="font-serif text-xl">Inventory</h2>
          {!data.inventory.available ? (
            <p className="rounded-xl border border-[#E5E3DD] bg-white p-4 text-sm">{data.inventory.error || 'Inventory is unavailable for this role.'}</p>
          ) : (
            <div className="grid gap-3">
              <Metric href={`${base}/inventory`} label="Low stock" value={data.inventory.lowStock} />
              <Metric href={`${base}/inventory`} label="Out of stock" value={data.inventory.outOfStock} />
              <Metric href={`${base}/inventory`} label="Reserved" value={data.inventory.reserved} />
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="font-serif text-xl">Governance</h2>
          <div className="grid gap-3">
            <Metric href={`${base}/compliance`} label="Compliance reviews pending" value={catalogue.compliancePending} />
            <Metric href={`${base}/compliance/countries`} label="Country decisions pending" value={catalogue.countryPending} />
            <Metric href={`${base}/content`} label="Content reviews pending" value={catalogue.contentInternal} />
            <Metric href={`${base}/catalogue/translations`} label="Translation reviews pending" value={catalogue.translationPending} />
          </div>
        </div>
      </section>

      {data.launchError && (
        <p className="text-sm text-[#5C5852]">Launch checks are unavailable. Retry from launch control. Production remains {data.productionState}.</p>
      )}
    </div>
  );
}
