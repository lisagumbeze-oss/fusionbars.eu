'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
  assignCatalogueReviewerAction,
  createReviewBatchAction,
  deferCatalogueQueueAction,
  queryCatalogueQueueAction,
} from '@/actions/admin-center';
import { useAdminRole } from '@/components/admin/AdminShell';

export default function CatalogueReviewQueue() {
  const { role } = useAdminRole();
  const params = useParams<{ locale: string }>();
  const search = useSearchParams();
  const locale = params?.locale || 'en';
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');
  const [queue, setQueue] = useState(search.get('queue') || 'unreviewed');
  const [blocker, setBlocker] = useState(search.get('blocker') || '');
  const [sort, setSort] = useState<'priority' | 'name' | 'updated'>('priority');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [reviewer, setReviewer] = useState('');

  async function load(nextPage = page) {
    setError('');
    const result = await queryCatalogueQueueAction(role, {
      queue: queue as 'unreviewed',
      blocker: blocker || undefined,
      search: text || undefined,
      sort,
      page: nextPage,
      pageSize: 20,
      doNotPublish: search.get('doNotPublish') === '1' ? true : undefined,
    });
    if (!result.success) {
      setError('error' in result ? result.error : 'The review queue is unavailable.');
      return;
    }
    setData(result.result);
    setPage(nextPage);
  }

  useEffect(() => { load(1); }, [role, queue, blocker, sort]);

  function versionsFor(slugs: string[]) {
    const expected: Record<string, number> = {};
    for (const row of data?.rows || []) {
      if (slugs.includes(row.slug)) expected[row.slug] = row.version;
    }
    return expected;
  }

  async function deferSelected() {
    const result = await deferCatalogueQueueAction(role, selected, reason, versionsFor(selected));
    if (!result.success) setError('error' in result ? result.error : 'Deferral was not saved.');
    else {
      setNotice('Deferred. This is not an approval.');
      setSelected([]);
      setReason('');
      await load(page);
    }
  }

  async function assignSelected() {
    const result = await assignCatalogueReviewerAction(role, selected, reviewer, versionsFor(selected));
    if (!result.success) setError('error' in result ? result.error : 'Assignment was not saved.');
    else {
      setNotice('Reviewer assigned. Assignment does not grant approval authority.');
      setSelected([]);
      await load(page);
    }
  }

  async function createBatch(size: number) {
    const result = await createReviewBatchAction(role, size);
    if (!result.success) setError('error' in result ? result.error : 'Batch was not created.');
    else {
      setNotice(`${result.batch.id} created with ${result.batch.size} products. No decisions were recorded.`);
      await load(1);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#5C5852]">The pilot batch stays out of this queue. Priority only changes review order. Nothing on this screen approves price, compliance, country, content, translation, or publication.</p>
      {error && <p className="text-sm text-rose-800">{error}</p>}
      {notice && <p className="text-sm text-emerald-800">{notice}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" placeholder="Search" value={text} onChange={(event) => setText(event.target.value)} />
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={queue} onChange={(event) => setQueue(event.target.value)}>
          <option value="unreviewed">Unreviewed</option>
          <option value="deferred">Deferred</option>
          <option value="blockers">Blocked</option>
          <option value="pilot">Pilot, read only</option>
          <option value="all">All</option>
        </select>
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={blocker} onChange={(event) => setBlocker(event.target.value)}>
          <option value="">All blockers</option>
          {['DATA', 'PRICING', 'COMPLIANCE', 'COUNTRY', 'CONTENT', 'MEDIA', 'TRANSLATION', 'AUDIT'].map((gate) => <option key={gate} value={gate}>{gate}</option>)}
        </select>
        <select className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" value={sort} onChange={(event) => setSort(event.target.value as 'priority')}>
          <option value="priority">Sort by review priority</option>
          <option value="name">Sort by name</option>
          <option value="updated">Sort by updated</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" onClick={() => load(1)}>Search</button>
        <button type="button" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" onClick={() => createBatch(10)}>Create 10-product batch</button>
        <button type="button" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" onClick={() => createBatch(20)}>Create 20-product batch</button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" placeholder="Defer reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        <button type="button" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" disabled={!selected.length || !reason.trim()} onClick={deferSelected}>Defer selected</button>
        <input className="border border-[#E5E3DD] rounded-lg px-2 py-2 text-sm" placeholder="Assign reviewer" value={reviewer} onChange={(event) => setReviewer(event.target.value)} />
        <button type="button" className="rounded-lg border border-[#E5E3DD] px-3 py-2 text-sm" disabled={!selected.length || !reviewer.trim()} onClick={assignSelected}>Assign</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#E5E3DD] bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-[#8E8B85]">
            <tr>
              <th className="p-3"></th>
              <th className="p-3">Product</th>
              <th className="p-3">Stage</th>
              <th className="p-3">Publication</th>
              <th className="p-3">Blockers</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((row: any) => (
              <tr key={row.slug} className="border-t border-[#E5E3DD]">
                <td className="p-3">
                  {!row.protectedPilot && (
                    <input type="checkbox" checked={selected.includes(row.slug)} onChange={(event) => {
                      setSelected((current) => event.target.checked ? [...current, row.slug] : current.filter((slug) => slug !== row.slug));
                    }} />
                  )}
                </td>
                <td className="p-3">
                  <p className="font-semibold">{row.name}</p>
                  <p className="text-xs text-[#8E8B85]">{row.slug} · {row.category} · {row.batchId || 'Unbatched'} · v{row.version}</p>
                </td>
                <td className="p-3">{row.reviewState}</td>
                <td className="p-3">{row.publicationStatus}</td>
                <td className="p-3 text-xs">{row.blockers.join(', ')}</td>
                <td className="p-3 text-xs">
                  <Link className="underline" href={`/${locale}/admin/products/${row.slug}`}>Open</Link>
                  {' · '}
                  <Link className="underline" href={`/${locale}/admin/catalogue/review-workspace`}>Continue review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button type="button" className="underline" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button>
        <span>Page {data?.page || 1} of {data?.pages || 1} · {data?.total || 0} products</span>
        <button type="button" className="underline" disabled={!data || page >= data.pages} onClick={() => load(page + 1)}>Next</button>
      </div>
    </div>
  );
}
