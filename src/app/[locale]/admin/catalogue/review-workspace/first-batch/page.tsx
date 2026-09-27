'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layers, Save, X, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  selectFirstBatchAction,
  getFirstBatchDashboardAction,
  getFirstBatchPacketAction,
  stageFirstBatchFieldAction,
  stageFirstBatchMediaAction,
  addFirstBatchNoteAction,
  saveAndNextFirstBatchAction,
  confirmAgreedFieldsAction,
  stageFirstBatchContentAction,
  setFirstBatchSizeAction,
} from '@/actions/catalogue-first-batch';
import { FirstBatchFieldKey, SpecialistQueue } from '@/domain/catalog/CatalogueFirstBatchService';
import { RoleName } from '@/types';

const AUTHORIZED: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];
const FIELDS: FirstBatchFieldKey[] = [
  'name',
  'slug',
  'sku',
  'category',
  'variant',
  'description',
  'shortDescription',
  'ingredients',
  'attributes',
  'weight',
  'primaryImage',
  'gallery',
];
const SPECIALISTS: SpecialistQueue[] = [
  'STRUCTURAL_REVIEW',
  'PRICING_REVIEW',
  'COMPLIANCE_REVIEW',
  'COUNTRY_REVIEW',
  'CONTENT_REVIEW',
  'MEDIA_REVIEW',
  'TRANSLATION_REVIEW',
  'SEO_REVIEW',
];

export default function FirstBatchReviewPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const [currentRole, setCurrentRole] = useState<RoleName>('SUPER_ADMIN');
  const actorName = `${currentRole.toLowerCase().replace('_', '.')}.officer@fusionbars.eu`;

  const [batchSize, setBatchSize] = useState(10);
  const [report, setReport] = useState<any>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [specialistQueues, setSpecialistQueues] = useState<Record<string, any[]>>({});
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [packet, setPacket] = useState<any>(null);
  const [specialistView, setSpecialistView] = useState<SpecialistQueue | null>(null);
  const [reason, setReason] = useState('First-batch data reconciliation decision');
  const [note, setNote] = useState('');
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<any>(null);
  const [batchComplete, setBatchComplete] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const authorized = AUTHORIZED.includes(currentRole);

  useEffect(() => {
    if (authorized) loadDashboard();
  }, [currentRole]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await getFirstBatchDashboardAction(currentRole);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Unauthorized' });
        return;
      }
      setReport(res.report);
      setSelectedSlugs(res.selectedSlugs || []);
      setBatchSize(res.batchSize || 10);
      setSpecialistQueues(res.specialistQueues || {});
      if (!activeSlug && res.selectedSlugs?.[0]) {
        await openPacket(res.selectedSlugs[0]);
      } else if (activeSlug) {
        await openPacket(activeSlug);
      }
    } finally {
      setLoading(false);
    }
  }

  async function regenerate(size = batchSize) {
    const res = await selectFirstBatchAction({ size, actor: actorName, actorRole: currentRole });
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Selected ${res.selected.length} products; excluded ${res.excluded.length} into specialist queues.`,
      });
      setActiveSlug(null);
      await loadDashboard();
    } else setStatusMessage({ type: 'error', text: res.error || 'Selection failed' });
  }

  async function openPacket(slug: string) {
    setSpecialistView(null);
    setSummary(null);
    const res = await getFirstBatchPacketAction({ productSlug: slug, role: currentRole });
    if (res.success) {
      setActiveSlug(slug);
      setPacket(res.packet);
    } else setStatusMessage({ type: 'error', text: res.error || 'Packet failed' });
  }

  async function stageField(field: FirstBatchFieldKey, action: 'ACCEPT_CURRENT' | 'USE_SOURCE' | 'EDIT' | 'DEFER', sourceChoice?: any) {
    const confirmed = action === 'DEFER' ? true : window.confirm(`CONFIRM ${action} on ${field}?`);
    if (!confirmed) return;
    const res = await stageFirstBatchFieldAction({
      productSlug: activeSlug!,
      field,
      action,
      sourceChoice,
      editedValue: action === 'EDIT' ? editValues[field] : undefined,
      reason,
      actor: actorName,
      actorRole: currentRole,
      confirm: true,
    });
    if (res.success) {
      setStatusMessage({ type: 'info', text: `Staged ${action} for ${field} (unsaved until SAVE)` });
      await openPacket(activeSlug!);
    } else setStatusMessage({ type: 'error', text: res.error || 'Stage failed' });
  }

  async function stageMedia(mediaId: string, action: 'PRIMARY' | 'GALLERY' | 'REJECT') {
    const res = await stageFirstBatchMediaAction({
      productSlug: activeSlug!,
      mediaId,
      action,
      reason,
      actor: actorName,
      actorRole: currentRole,
      confirm: true,
    });
    if (res.success) {
      setStatusMessage({ type: 'info', text: `Staged media ${action}` });
      await openPacket(activeSlug!);
    } else setStatusMessage({ type: 'error', text: res.error || 'Media stage failed' });
  }

  async function handleSaveAndNext() {
    const res: any = await saveAndNextFirstBatchAction({
      productSlug: activeSlug!,
      actor: actorName,
      actorRole: currentRole,
      reason,
    });
    if (res.success) {
      setSummary(res.summary);
      if (res.batchComplete) {
        setBatchComplete(res.batchReport);
        setStatusMessage({ type: 'success', text: 'FIRST BATCH COMPLETE. Nothing was published.' });
      } else if (res.nextSlug) {
        setStatusMessage({
          type: 'success',
          text: `Saved. Data: ${res.summary?.statusBoard?.data || res.summary?.dataReconciliation}. Next product ready.`,
        });
        await openPacket(res.nextSlug);
      }
      await loadDashboard();
    } else setStatusMessage({ type: 'error', text: res.error || 'Save failed' });
  }

  async function confirmAgreed() {
    const res = await confirmAgreedFieldsAction({
      productSlug: activeSlug!,
      actor: actorName,
      actorRole: currentRole,
      reason,
    });
    if (res.success) {
      setStatusMessage({ type: 'info', text: `Staged ${'staged' in res ? res.staged.length : 0} field confirms. Not saved until SAVE & NEXT.` });
      await openPacket(activeSlug!);
    } else setStatusMessage({ type: 'error', text: res.error || 'Confirm failed' });
  }

  async function handleNote() {
    const res = await addFirstBatchNoteAction({
      productSlug: activeSlug!,
      text: note,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      setNote('');
      setStatusMessage({ type: 'info', text: 'Internal note saved (not customer-visible).' });
      await openPacket(activeSlug!);
    } else setStatusMessage({ type: 'error', text: res.error || 'Note failed' });
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
        <div className="border border-rose-800 bg-rose-950/40 p-6 rounded-lg text-sm">Access denied.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/90 sticky top-0 z-30 px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Layers className="w-5 h-5 text-teal-400" />
            <div>
              <h1 className="text-lg font-bold">FIRST BATCH — DATA ADJUDICATION</h1>
              <p className="text-[11px] text-slate-400">
                Data reconciliation only · No auto-publish / prices / countries / compliance · PAUSED
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as RoleName)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-teal-300"
            >
              {AUTHORIZED.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {[5, 10, 20].map((s) => (
              <button
                key={s}
                onClick={async () => {
                  await setFirstBatchSizeAction({ size: s, role: currentRole });
                  setBatchSize(s);
                  await regenerate(s);
                }}
                className={`px-2 py-1 border rounded ${batchSize === s ? 'border-teal-500 text-teal-300' : 'border-slate-700'}`}
              >
                {s}
              </button>
            ))}
            <button onClick={() => regenerate()} className="px-2 py-1 border border-teal-700 rounded flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Select batch
            </button>
            <Link href={`/${locale}/admin/catalogue/review-workspace`} className="px-2 py-1 border border-slate-700 rounded">
              Full workspace
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-4 grid lg:grid-cols-[220px_1fr_240px] gap-4">
        <aside className="space-y-3 text-xs">
          <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/40 font-mono space-y-1">
            <div>Batch size: {report?.firstBatchSize ?? batchSize}</div>
            <div>Selected: {report?.selectedCount ?? 0}</div>
            <div>Excluded: {report?.excludedCount ?? 0}</div>
            <div>Partial: {report?.productsPartiallyReviewed ?? 0}</div>
            <div>Fully reviewed: {report?.productsFullyReviewed ?? 0}</div>
            <div>Published: {report?.published ?? 0}</div>
          </div>
          <div className="border border-slate-800 rounded-lg p-2 max-h-[40vh] overflow-y-auto space-y-1">
            <div className="text-slate-400 font-semibold mb-1">First batch</div>
            {selectedSlugs.map((slug) => (
              <button
                key={slug}
                onClick={() => openPacket(slug)}
                className={`w-full text-left px-2 py-1 rounded border truncate ${
                  activeSlug === slug ? 'border-teal-600 bg-teal-950/30' : 'border-slate-800'
                }`}
              >
                {slug}
              </button>
            ))}
          </div>
          <div className="border border-amber-900/50 rounded-lg p-2 space-y-1">
            <div className="text-amber-300 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Specialist queues
            </div>
            {SPECIALISTS.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setSpecialistView(q);
                  setActiveSlug(null);
                  setPacket(null);
                }}
                className={`w-full text-left px-2 py-1 rounded border text-[10px] ${
                  specialistView === q ? 'border-amber-600' : 'border-slate-800'
                }`}
              >
                {q.replace(/_/g, ' ')} ({specialistQueues[q]?.length || 0})
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-3 min-w-0">
          {statusMessage && (
            <div
              className={`p-3 rounded border text-xs flex justify-between ${
                statusMessage.type === 'success'
                  ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                  : statusMessage.type === 'error'
                    ? 'border-rose-800 bg-rose-950/40 text-rose-300'
                    : 'border-sky-800 bg-sky-950/40 text-sky-300'
              }`}
            >
              <span>{statusMessage.text}</span>
              <button onClick={() => setStatusMessage(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-slate-500 py-16 text-center">Loading first batch…</div>
          ) : specialistView ? (
            <div className="border border-amber-900/40 rounded-lg p-4 space-y-2 text-xs">
              <h2 className="font-semibold text-amber-300">{specialistView.replace(/_/g, ' ')}</h2>
              <p className="text-slate-500">High-risk specialist decisions stay out of the basic data reconciliation queue.</p>
              {(specialistQueues[specialistView] || []).slice(0, 50).map((ex: any) => (
                <div key={ex.productSlug} className="border border-slate-800 rounded p-2 font-mono">
                  <div className="text-white">{ex.productName}</div>
                  <div className="text-slate-500">{ex.productSlug}</div>
                  <div className="text-amber-400/80">{(ex.reasons || []).join(', ')}</div>
                </div>
              ))}
              {(specialistQueues[specialistView] || []).length === 0 && (
                <div className="text-slate-500">No products in this specialist queue.</div>
              )}
            </div>
          ) : !packet ? (
            <div className="text-slate-500 py-16 text-center">Select a product or generate the first batch.</div>
          ) : (
            <>
              <div className="border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold">{packet.product.name}</h2>
                    <div className="text-[11px] font-mono text-slate-400">
                      {packet.product.slug} · SKU {String(packet.product.sku || '—')} · {packet.product.category} · variant{' '}
                      {packet.product.variant || '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      Source IDs: {(packet.product.sourceRecordIds || []).join(', ') || '—'}
                    </div>
                  </div>
                  <button onClick={handleSaveAndNext} className="px-3 py-1.5 border border-teal-600 text-teal-300 rounded flex items-center gap-1 text-xs">
                    <Save className="w-3.5 h-3.5" /> SAVE & NEXT
                  </button>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                  placeholder="Decision reason"
                />
                <div className="flex gap-2 text-xs">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                    placeholder="Internal note (never shown to customers)"
                  />
                  <button onClick={handleNote} className="px-2 py-1 border border-slate-700 rounded">
                    Add note
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">
                  Product {(packet.position?.index ?? 0) + 1} of {packet.position?.total || selectedSlugs.length || 10} · Status:{' '}
                  {packet.batchProduct?.status} · Staged fields: {packet.batchProduct?.pendingFieldDecisions?.length || 0} · Source
                  agreement is not legal, price, country, or publication approval.
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg p-3 text-xs">
                <h3 className="font-semibold mb-2">Source evidence (present only)</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {Object.entries(packet.sources || {}).map(([label, data]) => (
                    <div key={label} className="border border-slate-800 rounded p-2 bg-slate-950/50 font-mono text-[10px]">
                      <div className="text-teal-300 font-semibold mb-1">{label.replace(/_/g, ' ')}</div>
                      <pre className="whitespace-pre-wrap max-h-40 overflow-auto text-slate-400">{JSON.stringify(data, null, 2)}</pre>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg p-3 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Field decisions</h3>
                  <button onClick={confirmAgreed} className="px-2 py-1 border border-emerald-700 text-emerald-300 rounded">
                    CONFIRM agreed fields
                  </button>
                </div>
                <p className="text-slate-500">
                  ALL SOURCES AGREE preselects the current value and does not save until CONFIRM, then SAVE & NEXT. Only differing
                  fields are expanded.
                </p>
                {FIELDS.filter((field) => packet.fields[field]?.highlight).map((field) => {
                  const f = packet.fields[field];
                  return (
                    <div key={field} className="border border-amber-700 rounded p-2 space-y-1 bg-amber-950/20">
                      <div className="font-semibold uppercase text-amber-200">{field} · sources disagree</div>
                      <div className="grid sm:grid-cols-4 gap-1 font-mono text-[10px]">
                        <div>
                          <div className="text-slate-500">REFERENCE</div>
                          <div>{String(f.reference ?? '—')}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">REPOSITORY A</div>
                          <div>{String(f.repoA ?? '—')}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">REPOSITORY B</div>
                          <div>{String(f.repoB ?? '—')}</div>
                        </div>
                        <div>
                          <div className="text-slate-500">CURRENT EU VALUE</div>
                          <div>{String(f.current ?? '—')}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => stageField(field, 'USE_SOURCE', 'REFERENCE')} className="px-2 py-0.5 border border-slate-600 rounded">USE REFERENCE</button>
                        <button onClick={() => stageField(field, 'USE_SOURCE', 'REPO_A')} className="px-2 py-0.5 border border-slate-600 rounded">USE REPO A</button>
                        <button onClick={() => stageField(field, 'USE_SOURCE', 'REPO_B')} className="px-2 py-0.5 border border-slate-600 rounded">USE REPO B</button>
                        <button onClick={() => stageField(field, 'ACCEPT_CURRENT')} className="px-2 py-0.5 border border-emerald-700 rounded">CONFIRM CURRENT</button>
                        <button onClick={() => stageField(field, 'DEFER')} className="px-2 py-0.5 border border-slate-600 rounded">DEFER</button>
                      </div>
                    </div>
                  );
                })}
                {FIELDS.filter((field) => !packet.fields[field]?.highlight).map((field) => {
                  const f = packet.fields[field];
                  if (!f) return null;
                  const agreed = f.agreement === 'ALL_SOURCES_AGREE';
                  const missing = f.agreement === 'MISSING' || f.preselectedValue == null;
                  return (
                    <div key={field} className="border border-slate-800 rounded p-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold uppercase text-slate-300">{field}</div>
                        <div className="text-[10px] text-slate-500">
                          {agreed ? 'ALL SOURCES AGREE' : missing ? 'UNKNOWN' : f.agreement} · preselected{' '}
                          {missing ? 'none' : String(f.preselectedValue)}
                        </div>
                      </div>
                      <div className="flex gap-1 items-center">
                        <input
                          className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-[11px] w-36"
                          placeholder="Edit"
                          value={editValues[field] || ''}
                          onChange={(e) => setEditValues((prev) => ({ ...prev, [field]: e.target.value }))}
                        />
                        {!missing && (
                          <button onClick={() => stageField(field, 'ACCEPT_CURRENT')} className="px-2 py-0.5 border border-emerald-700 rounded">
                            CONFIRM
                          </button>
                        )}
                        <button onClick={() => stageField(field, 'EDIT')} className="px-2 py-0.5 border border-slate-600 rounded">EDIT</button>
                        <button onClick={() => stageField(field, 'DEFER')} className="px-2 py-0.5 border border-slate-600 rounded">DEFER</button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                <h3 className="font-semibold">Pricing (display only in first batch)</h3>
                <div className="font-mono">
                  Decision: <span className="text-amber-300">{packet.pricing.decision}</span> · Gate:{' '}
                  <span className="text-amber-300">{packet.pricing.status}</span>
                </div>
                <pre className="text-[10px] text-slate-400">{JSON.stringify(packet.pricing, null, 2)}</pre>
                <p className="text-slate-500">Non-pricing fields may still be reviewed. Product remains non-purchasable.</p>
              </div>

              <div className="border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                <h3 className="font-semibold">Content / Compliance / Country</h3>
                <div>Raw source and approved EU content stay separate. Content status: {packet.content.status}</div>
                <div>Ingredients: {packet.content.ingredientStatus}</div>
                <div>Compliance: {packet.compliance.classification} — left unchanged by data adjudication</div>
                <div>Country: {packet.country.status} — source availability is not EU authorization</div>
                <div>Translation slots: {(packet.translation?.locales || []).join(', ')} · PENDING · does not block data reconciliation</div>
                {packet.testRecord?.flagged && (
                  <div className="text-rose-300">NON_COMMERCIAL_TEST_RECORD · DO_NOT_PUBLISH · raw source retained</div>
                )}
                {packet.relationshipHint && (
                  <div className="text-sky-300">
                    Box relationship: {packet.relationshipHint.relationship} · {packet.relationshipHint.evidence.join('; ')}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {(['KEEP_INTERNAL_SOURCE_ONLY', 'BLOCK'] as const).map((disposition) => (
                    <button
                      key={disposition}
                      className="px-2 py-0.5 border border-slate-600 rounded"
                      onClick={async () => {
                        const res = await stageFirstBatchContentAction({
                          productSlug: activeSlug!,
                          disposition,
                          reason,
                          actor: actorName,
                          actorRole: currentRole,
                        });
                        setStatusMessage(res.success ? { type: 'info', text: `Content staged: ${disposition}` } : { type: 'error', text: res.error || 'Content failed' });
                      }}
                    >
                      {disposition === 'KEEP_INTERNAL_SOURCE_ONLY' ? 'KEEP AS INTERNAL SOURCE ONLY' : 'BLOCK'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                <h3 className="font-semibold">
                  Media {packet.media.matched ? <span className="text-emerald-400">· MATCHED MEDIA</span> : null}
                </h3>
                {(packet.media.assets || []).map((m: any) => (
                  <div key={m.id} className="border border-slate-800 rounded p-2 flex flex-wrap justify-between gap-2">
                    <div className="font-mono text-[10px] truncate flex-1">{m.url}</div>
                    <div className="flex gap-1">
                      <button onClick={() => stageMedia(m.id, 'PRIMARY')} className="px-2 py-0.5 border border-slate-600 rounded">
                        PRIMARY
                      </button>
                      <button onClick={() => stageMedia(m.id, 'GALLERY')} className="px-2 py-0.5 border border-slate-600 rounded">
                        GALLERY
                      </button>
                      <button onClick={() => stageMedia(m.id, 'REJECT')} className="px-2 py-0.5 border border-slate-600 rounded">
                        REJECT
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border border-slate-800 rounded-lg p-3 text-xs">
                <h3 className="font-semibold">Variant structure</h3>
                <div>{packet.structure.action}</div>
                {packet.structure.action === 'DEFER_TO_SPECIALIST_STRUCTURAL_REVIEW' && (
                  <p className="text-amber-400 mt-1">Ambiguous structure deferred to STRUCTURAL REVIEW specialist queue.</p>
                )}
              </div>

              {summary?.statusBoard && (
                <div className="border border-teal-800 bg-teal-950/20 rounded-lg p-3 text-xs space-y-1 font-mono">
                  <div className="font-semibold text-teal-300">Review summary</div>
                  <div>DATA: {summary.statusBoard.data}</div>
                  <div>PRICE: {summary.statusBoard.pricing}</div>
                  <div>COMPLIANCE: {summary.statusBoard.compliance}</div>
                  <div>COUNTRY: {summary.statusBoard.country}</div>
                  <div>CONTENT: {summary.statusBoard.content}</div>
                  <div>MEDIA: {summary.statusBoard.media}</div>
                  <div>TRANSLATION: {summary.statusBoard.translation}</div>
                  <div>SEO: {summary.statusBoard.seo}</div>
                  <div>PUBLICATION: {summary.statusBoard.publication}</div>
                  <div>Levels: {(summary.completionLevels || []).join(' + ') || '—'}</div>
                </div>
              )}
              {batchComplete && (
                <div className="border border-teal-700 rounded-lg p-3 text-xs space-y-1">
                  <h3 className="font-semibold text-teal-300">FIRST BATCH COMPLETE</h3>
                  <div>Products reviewed: {batchComplete.productsReviewed}</div>
                  <div>Data-adjudicated: {batchComplete.dataAdjudicated}</div>
                  <div>Specialist-review required: {batchComplete.specialistReviewRequired}</div>
                  <div>Deferred: {batchComplete.deferred}</div>
                  <div>Blocked: {batchComplete.blocked}</div>
                  <div>Ready for publication: {batchComplete.readyForPublication}</div>
                  <div>Published: {batchComplete.published}</div>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="border border-slate-800 rounded-lg bg-slate-900/40 p-3 text-xs h-fit sticky top-20 space-y-2">
          <h3 className="font-semibold text-slate-300">Batch rules</h3>
          <ul className="text-slate-500 space-y-1 list-disc pl-4">
            <li>No auto-publish</li>
            <li>No auto EUR prices</li>
            <li>No auto country auth</li>
            <li>No auto compliance</li>
            <li>Priority ≠ legality</li>
            <li>Specialist queues separate</li>
          </ul>
          {packet?.batchProduct?.internalNotes?.length > 0 && (
            <div className="border-t border-slate-800 pt-2 space-y-1">
              <div className="text-slate-400">Internal notes</div>
              {packet.batchProduct.internalNotes.map((n: any) => (
                <div key={n.id} className="text-[10px] text-slate-500">
                  {n.actor}: {n.text}
                </div>
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
