'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { RoleName } from '@/types';
import {
  acknowledgePublicationGateAction,
  getSpecialistDetailAction,
  getSpecialistQueueAction,
  recordSpecialistComplianceAction,
  recordSpecialistContentAction,
  recordSpecialistCountryAction,
  recordSpecialistMediaAction,
  recordSpecialistPricingAction,
  recordSpecialistTranslationAction,
} from '@/actions/catalogue-specialist-review';

const ROLES: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'COMPLIANCE_MANAGER', 'CONTENT_MANAGER', 'FINANCE_MANAGER'];

export default function SpecialistReviewPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const [role, setRole] = useState<RoleName>('SUPER_ADMIN');
  const actor = `${role.toLowerCase().replace('_', '.')}@fusionbars.eu`;
  const [queue, setQueue] = useState<any[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [rationale, setRationale] = useState('');
  const [evidence, setEvidence] = useState('');
  const [candidate, setCandidate] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, [role]);

  async function load(nextSlug = slug) {
    const res = await getSpecialistQueueAction(role);
    if (!res.success) {
      setMessage(res.error || 'Access denied');
      setQueue([]);
      return;
    }
    setQueue(res.products || []);
    const target = nextSlug || res.products?.[0]?.productSlug;
    if (target) await open(target);
  }

  async function open(productSlug: string) {
    setSlug(productSlug);
    const res = await getSpecialistDetailAction({ productSlug, role });
    if (!res.success) {
      setMessage(res.error || 'Detail failed');
      return;
    }
    setDetail(res.detail);
    setCandidate(res.detail?.review?.content?.candidatePublicContent || '');
  }

  async function run(pending: Promise<{ success: boolean; error?: string }>) {
    const res = await pending;
    setMessage(res.success ? 'Decision recorded. Catalogue facts were not changed. Nothing was published.' : res.error || 'Failed');
    if (slug) await open(slug);
    const q = await getSpecialistQueueAction(role);
    if (q.success) setQueue(q.products || []);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3 sticky top-0 bg-slate-950 z-10">
        <div className="max-w-[1400px] mx-auto flex flex-wrap justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-300" />
            <div>
              <h1 className="font-bold">FIRST BATCH — SPECIALIST REVIEW</h1>
              <p className="text-[11px] text-slate-400">Data adjudication is complete. Specialist decisions remain unresolved. Nothing is published automatically.</p>
            </div>
          </div>
          <div className="flex gap-2 text-xs items-center">
            <select value={role} onChange={(e) => setRole(e.target.value as RoleName)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1">
              {ROLES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <Link href={`/${locale}/admin/catalogue/review-workspace/first-batch`} className="border border-slate-700 rounded px-2 py-1">
              Data adjudication record
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-[1400px] mx-auto p-4 grid lg:grid-cols-[280px_1fr] gap-4">
        <aside className="space-y-2 text-xs">
          {queue.map((item) => (
            <button key={item.productSlug} onClick={() => open(item.productSlug)} className={`w-full text-left border rounded p-2 ${slug === item.productSlug ? 'border-amber-500' : 'border-slate-800'}`}>
              <div className="font-semibold">{item.productName}</div>
              <div className="text-slate-500">{item.pricingStatus} · {item.complianceStatus} · {item.publicationStatus}</div>
              <div className="text-slate-600">Unresolved {item.unresolvedDecisionCount} · {item.reviewer || 'unassigned'}</div>
            </button>
          ))}
        </aside>
        <section className="space-y-3 text-xs">
          {message && <div className="border border-slate-700 rounded p-2 text-slate-300">{message}</div>}
          {!detail ? (
            <p className="text-slate-500">Select a first-batch product.</p>
          ) : (
            <>
              <div className="border border-amber-900/60 bg-amber-950/20 rounded p-3">{detail.banner}</div>
              <div className="border border-slate-800 rounded p-3 space-y-1">
                <h2 className="font-semibold">Product identity · read only</h2>
                <div>{detail.identity.name}</div>
                <div className="font-mono text-slate-400">{detail.identity.slug} · {detail.identity.category} · {detail.identity.commercialDisposition}</div>
                <div>Source records: {(detail.identity.sourceRecordIds || []).join(', ') || '—'}</div>
                <div>Relationship: {detail.identity.relationship?.relationship || '—'}</div>
                <Link className="text-teal-300 underline" href={`/${locale}${detail.adjudicationHref}`}>Open data-adjudication record</Link>
              </div>
              <div className="border border-slate-800 rounded p-3 space-y-2">
                <h2 className="font-semibold">Pricing · {detail.review.pricing.state}</h2>
                <pre className="text-[10px] text-slate-400 whitespace-pre-wrap">{JSON.stringify(detail.sourcePrices?.sourcePrices || detail.sourcePrices, null, 2)}</pre>
                <p className="text-slate-500">No USD-to-EUR conversion. PRICE_APPROVED needs a human-entered amount. FINANCE_MANAGER or SUPER_ADMIN only.</p>
                <div className="flex flex-wrap gap-2">
                  <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-20" />
                  <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Explicit price" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 w-28" />
                  <input value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Rationale" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 flex-1" />
                  <input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Evidence" className="bg-slate-900 border border-slate-700 rounded px-2 py-1 flex-1" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="border border-slate-600 rounded px-2 py-1" onClick={() => run(recordSpecialistPricingAction({ productSlug: slug!, state: 'PRICE_DEFERRED', rationale, evidence, actor, actorRole: role }))}>PRICE_DEFERRED</button>
                  <button className="border border-emerald-700 rounded px-2 py-1" onClick={() => run(recordSpecialistPricingAction({ productSlug: slug!, state: 'PRICE_APPROVED', approvedCurrency: currency, approvedPrice: Number(price), rationale, evidence, actor, actorRole: role }))}>PRICE_APPROVED</button>
                  <button className="border border-slate-600 rounded px-2 py-1" onClick={() => run(recordSpecialistPricingAction({ productSlug: slug!, state: 'PRICE_NOT_APPLICABLE', rationale: rationale || 'Not a commercial price', evidence: evidence || 'Reviewer decision', actor, actorRole: role }))}>PRICE_NOT_APPLICABLE</button>
                </div>
              </div>
              <div className="border border-slate-800 rounded p-3 space-y-2">
                <h2 className="font-semibold">Compliance · {detail.review.compliance.state}</h2>
                <p className="text-slate-500">Source claims stay internal. Approval requires rationale and evidence. COMPLIANCE_MANAGER or SUPER_ADMIN only.</p>
                <div className="flex flex-wrap gap-2">
                  <button className="border border-slate-600 rounded px-2 py-1" onClick={() => run(recordSpecialistComplianceAction({ productSlug: slug!, state: 'DEFERRED', rationale: rationale || 'Deferred', evidence: evidence || 'Pending authority', actor, actorRole: role }))}>DEFERRED</button>
                  <button className="border border-rose-700 rounded px-2 py-1" onClick={() => run(recordSpecialistComplianceAction({ productSlug: slug!, state: 'DO_NOT_PUBLISH', rationale: rationale || 'Do not publish', evidence: evidence || 'Reviewer decision', actor, actorRole: role }))}>DO_NOT_PUBLISH</button>
                </div>
              </div>
              <div className="border border-slate-800 rounded p-3 space-y-2">
                <h2 className="font-semibold">Country eligibility · not assumed from shipping coverage</h2>
                <div className="text-slate-500">Destinations configured in the store: {detail.destinations.map((d: any) => d.code).join(', ')}</div>
                <button className="border border-slate-600 rounded px-2 py-1" onClick={() => run(recordSpecialistCountryAction({ productSlug: slug!, country: 'NL', decision: 'DEFERRED', rationale: rationale || 'Needs legal authority', evidence: evidence || 'No approval on file', actor, actorRole: role }))}>Defer NL</button>
              </div>
              <div className="border border-slate-800 rounded p-3 space-y-2">
                <h2 className="font-semibold">Content · {detail.review.content.state}</h2>
                <div className="text-slate-500">Internal source stays separate from public copy. Raw text is not copied into the public field.</div>
                <textarea value={candidate} onChange={(e) => setCandidate(e.target.value)} rows={3} placeholder="Candidate public content written by a reviewer" className="w-full bg-slate-900 border border-slate-700 rounded p-2" />
                <button className="border border-slate-600 rounded px-2 py-1" onClick={() => run(recordSpecialistContentAction({ productSlug: slug!, state: 'CONTENT_DEFERRED', candidatePublicContent: candidate, rationale, actor, actorRole: role }))}>CONTENT_DEFERRED</button>
              </div>
              <div className="border border-slate-800 rounded p-3 space-y-2">
                <h2 className="font-semibold">Translation · PENDING until drafted</h2>
                {Object.keys(detail.review.translations || {}).map((locale) => (
                  <div key={locale} className="flex gap-2 items-center">
                    <span className="w-8 uppercase">{locale}</span>
                    <span className="text-slate-500 w-24">{detail.review.translations[locale].state}</span>
                    <input value={drafts[locale] || ''} onChange={(e) => setDrafts((prev) => ({ ...prev, [locale]: e.target.value }))} placeholder="Reviewer draft" className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1" />
                    <button className="border border-slate-600 rounded px-2 py-1" onClick={() => run(recordSpecialistTranslationAction({ productSlug: slug!, locale, state: 'DRAFTED', draft: drafts[locale], actor, actorRole: role }))}>DRAFT</button>
                  </div>
                ))}
              </div>
              <div className="border border-slate-800 rounded p-3 space-y-2">
                <h2 className="font-semibold">Media · {detail.review.media.state}</h2>
                {detail.review.media.state === 'MEDIA_REVIEW' && (
                  <button className="border border-slate-600 rounded px-2 py-1" onClick={() => run(recordSpecialistMediaAction({ productSlug: slug!, decision: 'RETAIN_MEDIA_REVIEW', reason: rationale || 'Unverified source image', actor, actorRole: role }))}>Keep MEDIA_REVIEW</button>
                )}
              </div>
              <div className="border border-slate-800 rounded p-3 space-y-1 font-mono">
                <div>PUBLICATION: {detail.publication.publication}</div>
                <div>PUBLISHED: false</div>
                <div>Blockers: {(detail.publication.blockers || []).join('; ') || '—'}</div>
                <button className="border border-slate-600 rounded px-2 py-1 font-sans mt-2" onClick={() => run(acknowledgePublicationGateAction({ productSlug: slug!, actor, actorRole: role }))}>Evaluate publication gate</button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
