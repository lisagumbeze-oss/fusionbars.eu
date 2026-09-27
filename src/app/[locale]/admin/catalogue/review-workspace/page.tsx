'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Shield, Save, ArrowRight, Lock, X, AlertTriangle, Download } from 'lucide-react';
import {
  getReviewWorkspaceProgressAction,
  listReviewWorkspaceProductsAction,
  openProductReviewWorkspaceAction,
  releaseProductReviewLockAction,
  assignProductReviewerAction,
  stageRecommendationDecisionAction,
  stagePricingDecisionAction,
  stageComplianceDecisionAction,
  stageCountryDecisionAction,
  stageContentDecisionAction,
  stageVariantDecisionAction,
  stageMediaDecisionAction,
  stageTranslationDecisionAction,
  stageSeoDecisionAction,
  saveProductReviewAction,
  saveAndNextProductReviewAction,
  getWorkspacePublicationPreviewAction,
  exportProductDecisionAuditAction,
} from '@/actions/catalogue-review-workspace';
import { RecommendationPriority } from '@/domain/catalog/CatalogueDecisionRecommendationService';
import { ComplianceClassification, CountryAvailabilityStatus, RoleName } from '@/types';

const AUTHORIZED: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];
const SECTIONS = [
  'IDENTITY',
  'STRUCTURE',
  'PRICING',
  'CATEGORY',
  'CONTENT',
  'COMPLIANCE',
  'COUNTRY AVAILABILITY',
  'MEDIA',
  'TRANSLATION',
  'SEO',
  'REVIEWS',
  'PUBLICATION READINESS',
] as const;

export default function CatalogueReviewWorkspacePage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const [currentRole, setCurrentRole] = useState<RoleName>('SUPER_ADMIN');
  const actorName = `${currentRole.toLowerCase().replace('_', '.')}.officer@fusionbars.eu`;

  const [priorityFilter, setPriorityFilter] = useState<RecommendationPriority | 'ALL'>('P0');
  const [progress, setProgress] = useState<any>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [productSlug, setProductSlug] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<any>(null);
  const [lockWarning, setLockWarning] = useState<string | null>(null);
  const [reason, setReason] = useState('Human product-level catalogue review decision');
  const [eurDraft, setEurDraft] = useState('');
  const [gbpDraft, setGbpDraft] = useState('');
  const [rewriteDraft, setRewriteDraft] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const authorized = AUTHORIZED.includes(currentRole);

  useEffect(() => {
    if (authorized) bootstrap();
  }, [currentRole, priorityFilter]);

  async function bootstrap() {
    setLoading(true);
    try {
      const prog = await getReviewWorkspaceProgressAction(currentRole);
      if (!prog.success) {
        setStatusMessage({ type: 'error', text: prog.error || 'Unauthorized' });
        return;
      }
      setProgress(prog.progress);
      const list = await listReviewWorkspaceProductsAction({ role: currentRole, priorityFilter });
      setQueue(list.products || []);
      if (!productSlug && list.products?.[0]) {
        await openProduct(list.products[0].slug);
      } else if (productSlug) {
        await openProduct(productSlug);
      }
    } finally {
      setLoading(false);
    }
  }

  async function openProduct(slug: string) {
    setLockWarning(null);
    setPreview(null);
    setExportJson(null);
    const res = await openProductReviewWorkspaceAction({
      productSlug: slug,
      actor: actorName,
      actorRole: currentRole,
      priorityFilter,
      acquireLock: true,
    });
    if (!res.success) {
      setStatusMessage({ type: 'error', text: res.error || 'Failed to open product' });
      return;
    }
    if (res.lock && !res.lock.success) {
      setLockWarning(res.lock.error || 'Locked by another reviewer');
    }
    setProductSlug(slug);
    setWorkspace(res.workspace);
    setRewriteDraft(res.workspace?.product?.approvedStoreContent || res.workspace?.product?.description || '');
    setSeoTitle(res.workspace?.product?.seo?.approvedTitle || res.workspace?.product?.name || '');
    setSeoDesc(res.workspace?.product?.seo?.approvedDescription || '');
  }

  async function refreshProgress() {
    const prog = await getReviewWorkspaceProgressAction(currentRole);
    if (prog.success) setProgress(prog.progress);
    const list = await listReviewWorkspaceProductsAction({ role: currentRole, priorityFilter });
    setQueue(list.products || []);
  }

  async function stageRec(recommendationId: string, action: 'ACCEPT' | 'REJECT' | 'EDIT' | 'DEFER') {
    const confirm = action === 'ACCEPT' ? window.confirm('CONFIRM this recommendation decision? (staged until SAVE PRODUCT REVIEW)') : true;
    if (action === 'ACCEPT' && !confirm) return;
    const res = await stageRecommendationDecisionAction({
      productSlug: productSlug!,
      recommendationId,
      action,
      reason,
      actor: actorName,
      actorRole: currentRole,
      confirm: action !== 'ACCEPT' || confirm,
    });
    if (res.success) {
      setStatusMessage({ type: 'info', text: `Staged ${action} (not saved until SAVE PRODUCT REVIEW)` });
      await openProduct(productSlug!);
    } else setStatusMessage({ type: 'error', text: res.error || 'Stage failed' });
  }

  async function handleSave() {
    const res: any = await saveProductReviewAction({
      productSlug: productSlug!,
      actor: actorName,
      actorRole: currentRole,
      reason,
    });
    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Saved product review. Publication: ${res.summary?.publication}. Decisions: ${res.summary?.decisionsMade}.`,
      });
      await openProduct(productSlug!);
      await refreshProgress();
      if (res.summary?.publication === 'READY_FOR_PUBLICATION') {
        const prev: any = await getWorkspacePublicationPreviewAction({
          productSlug: productSlug!,
          locale: 'en',
          currency: 'EUR',
          countryCode: 'NL',
          role: currentRole,
        });
        if (prev.success) setPreview(prev.preview);
      }
    } else setStatusMessage({ type: 'error', text: res.error || 'Save failed' });
  }

  async function handleSaveAndNext() {
    const res: any = await saveAndNextProductReviewAction({
      productSlug: productSlug!,
      actor: actorName,
      actorRole: currentRole,
      priorityFilter,
      reason,
    });
    if (res.success) {
      setStatusMessage({ type: 'success', text: `Saved. Next: ${res.nextSlug || 'queue empty'}` });
      await refreshProgress();
      if (res.nextSlug) await openProduct(res.nextSlug);
      else await openProduct(productSlug!);
    } else setStatusMessage({ type: 'error', text: res.error || 'Save & next failed' });
  }

  async function handleExport() {
    const res: any = await exportProductDecisionAuditAction({ productSlug: productSlug!, role: currentRole });
    if (res.success) setExportJson(JSON.stringify(res.export, null, 2));
    else setStatusMessage({ type: 'error', text: res.error || 'Export failed' });
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
        <div className="border border-rose-800 bg-rose-950/40 p-6 rounded-lg text-sm">Access denied for {currentRole}.</div>
      </div>
    );
  }

  const header = workspace?.header;
  const gates = workspace?.readinessGates || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 py-3">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-violet-400" />
            <div>
              <h1 className="text-lg font-bold">Guided Catalogue Review Workspace</h1>
              <p className="text-[11px] text-slate-400">One product · P0-first · No auto-publish · Launch PAUSED</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <select
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value as RoleName)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-violet-300"
            >
              {AUTHORIZED.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1"
            >
              <option value="P0">Queue: P0 first</option>
              <option value="P1">Queue: P1</option>
              <option value="P2">Queue: P2</option>
              <option value="P3">Queue: P3</option>
              <option value="ALL">Queue: ALL (explicit)</option>
            </select>
            <Link href={`/${locale}/admin/catalogue/recommendations`} className="px-2 py-1 border border-slate-700 rounded">
              Recommendations
            </Link>
            <Link href={`/${locale}/admin/catalogue/review-workspace/first-batch`} className="px-2 py-1 border border-teal-700 text-teal-300 rounded">
              First batch
            </Link>
            <Link href={`/${locale}/admin/catalogue/review-workspace/specialist-review`} className="px-2 py-1 border border-amber-700 text-amber-300 rounded">
              Specialist review
            </Link>
            <Link href={`/${locale}/admin/catalogue/adjudication`} className="px-2 py-1 border border-slate-700 rounded">
              Adjudication
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 py-4 grid lg:grid-cols-[240px_1fr_260px] gap-4">
        {/* Queue */}
        <aside className="border border-slate-800 rounded-lg bg-slate-900/40 p-3 space-y-2 text-xs max-h-[calc(100vh-120px)] overflow-y-auto">
          {progress && (
            <div className="font-mono text-[11px] text-slate-400 space-y-0.5 border-b border-slate-800 pb-2 mb-2">
              <div>
                Products: {progress.fullyReviewed} / {progress.totalProducts} reviewed
              </div>
              <div>
                P0: {progress.p0.resolved} / {progress.p0.total}
              </div>
              <div>
                P1: {progress.p1.resolved} / {progress.p1.total}
              </div>
              <div>
                P2: {progress.p2.resolved} / {progress.p2.total}
              </div>
              <div>
                P3: {progress.p3.resolved} / {progress.p3.total}
              </div>
              <div>Partial: {progress.partiallyReviewed} · Remaining: {progress.remaining}</div>
            </div>
          )}
          {queue.map((p) => (
            <button
              key={p.slug}
              onClick={() => openProduct(p.slug)}
              className={`w-full text-left px-2 py-1.5 rounded border ${
                productSlug === p.slug ? 'border-violet-600 bg-violet-950/40' : 'border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="font-semibold text-white truncate">{p.name}</div>
              <div className="text-slate-500 font-mono">
                {p.maxPriority} · {p.outstanding} open
              </div>
            </button>
          ))}
        </aside>

        {/* Main product panel */}
        <section className="space-y-4 min-w-0">
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

          {lockWarning && (
            <div className="p-3 rounded border border-amber-800 bg-amber-950/40 text-amber-200 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4" /> {lockWarning}
              {currentRole === 'SUPER_ADMIN' && productSlug && (
                <button
                  className="ml-auto underline"
                  onClick={async () => {
                    await releaseProductReviewLockAction({
                      productSlug,
                      actor: actorName,
                      actorRole: currentRole,
                      force: true,
                    });
                    setLockWarning(null);
                    openProduct(productSlug);
                  }}
                >
                  Force release
                </button>
              )}
            </div>
          )}

          {loading || !workspace ? (
            <div className="text-slate-500 py-20 text-center text-sm">Loading product workspace…</div>
          ) : (
            <>
              <div className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-white">{header.name}</h2>
                    <div className="text-[11px] font-mono text-slate-400 mt-1">
                      ID {header.productId} · {header.slug} · SKU {String(header.sku || '—')}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() =>
                        assignProductReviewerAction({
                          productSlug: productSlug!,
                          role: currentRole,
                          actor: actorName,
                          actorRole: currentRole,
                        }).then(() => openProduct(productSlug!))
                      }
                      className="px-2 py-1 border border-slate-700 rounded"
                    >
                      Assign to me
                    </button>
                    <button onClick={handleExport} className="px-2 py-1 border border-slate-700 rounded flex items-center gap-1">
                      <Download className="w-3 h-3" /> Audit export
                    </button>
                    <button onClick={handleSave} className="px-2 py-1 border border-emerald-700 text-emerald-300 rounded flex items-center gap-1">
                      <Save className="w-3 h-3" /> SAVE PRODUCT REVIEW
                    </button>
                    <button onClick={handleSaveAndNext} className="px-2 py-1 bg-violet-900/50 border border-violet-600 rounded flex items-center gap-1">
                      SAVE & NEXT <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="grid sm:grid-cols-4 gap-2 text-[11px] font-mono">
                  <div>Status: {header.currentStatus}</div>
                  <div>Review: {header.reviewStatus}</div>
                  <div>Compliance: {header.complianceStatus}</div>
                  <div>Pricing: {header.pricingStatus}</div>
                  <div>Country: {header.countryStatus}</div>
                  <div>Recommendations: {header.recommendationCount}</div>
                  <div>
                    P0:{header.priorityCounts.P0} P1:{header.priorityCounts.P1} P2:{header.priorityCounts.P2} P3:
                    {header.priorityCounts.P3}
                  </div>
                  <div>Assigned: {workspace.assignment?.role || '—'}</div>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs"
                  placeholder="Decision reason (required for high-risk ACCEPT)"
                />
                <div className="text-[11px] text-slate-500">
                  Pending staged decisions: {workspace.pendingBundle?.length || 0} (unsaved ≠ decisions)
                </div>
              </div>

              {/* Source evidence */}
              <div className="border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                <h3 className="font-semibold text-slate-300">Source evidence</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
                  {Object.entries(workspace.sourceEvidence || {}).map(([label, data]) => (
                    <div key={label} className="border border-slate-800 rounded p-2 bg-slate-950/50 font-mono text-[10px] space-y-0.5">
                      <div className="text-violet-300 font-semibold">{label.replace(/_/g, ' ')}</div>
                      <pre className="whitespace-pre-wrap max-h-36 overflow-auto text-slate-400">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sections */}
              {SECTIONS.map((section) => {
                const recs = workspace.groupedRecommendations?.[section] || [];
                return (
                  <div key={section} className="border border-slate-800 rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-semibold text-white">{section}</h3>

                    {section === 'STRUCTURE' &&
                      (workspace.flavourGroups || []).map((g: any) => (
                        <div key={g.id} className="border border-slate-800 rounded p-2 text-xs space-y-2">
                          <div>
                            Parent: <strong>{g.parentName}</strong> ({g.parentSlug})
                          </div>
                          <div className="text-slate-400">Candidates: {g.candidateSlugs.join(', ')}</div>
                          <div className="flex flex-wrap gap-1">
                            <button
                              className="px-2 py-1 border border-emerald-700 rounded"
                              onClick={() =>
                                stageVariantDecisionAction({
                                  groupId: g.id,
                                  productSlug: productSlug!,
                                  decision: 'MERGE_AS_VARIANTS',
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: window.confirm('CONFIRM MERGE AS VARIANTS? Source links will be preserved.'),
                                }).then((r) => {
                                  if (r.success) openProduct(productSlug!);
                                  else setStatusMessage({ type: 'error', text: r.error || 'Failed' });
                                })
                              }
                            >
                              MERGE AS VARIANTS
                            </button>
                            <button
                              className="px-2 py-1 border border-amber-700 rounded"
                              onClick={() =>
                                stageVariantDecisionAction({
                                  groupId: g.id,
                                  productSlug: productSlug!,
                                  decision: 'KEEP_SEPARATE',
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: true,
                                }).then(() => openProduct(productSlug!))
                              }
                            >
                              KEEP SEPARATE
                            </button>
                            <button
                              className="px-2 py-1 border border-slate-600 rounded"
                              onClick={() =>
                                stageVariantDecisionAction({
                                  groupId: g.id,
                                  productSlug: productSlug!,
                                  decision: 'DEFER',
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: true,
                                }).then(() => openProduct(productSlug!))
                              }
                            >
                              DEFER
                            </button>
                          </div>
                        </div>
                      ))}

                    {section === 'PRICING' && (
                      <div className="text-xs space-y-2 border border-slate-800 rounded p-2">
                        <div className="font-mono">
                          EU: {workspace.product.priceEUR ?? '—'} · GBP: {workspace.product.priceGBP ?? '—'} · Source:{' '}
                          {workspace.product.sourcePriceUSD ?? '—'} {workspace.product.sourceCurrency || ''}
                        </div>
                        <p className="text-slate-500">No USD→EUR conversion. Price decision ≠ purchasable.</p>
                        <div className="flex gap-2">
                          <input
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                            placeholder="EUR"
                            value={eurDraft}
                            onChange={(e) => setEurDraft(e.target.value)}
                          />
                          <input
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                            placeholder="GBP"
                            value={gbpDraft}
                            onChange={(e) => setGbpDraft(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              'APPROVE_CURRENT_EU_PRICE',
                              'SET_EUR',
                              'SET_GBP',
                              'KEEP_UNRESOLVED',
                              'DEFER',
                            ] as const
                          ).map((d) => (
                            <button
                              key={d}
                              className="px-2 py-1 border border-slate-700 rounded text-[10px]"
                              onClick={() =>
                                stagePricingDecisionAction({
                                  productSlug: productSlug!,
                                  decision: d,
                                  priceEUR: eurDraft ? Math.round(parseFloat(eurDraft) * 100) : undefined,
                                  priceGBP: gbpDraft ? Math.round(parseFloat(gbpDraft) * 100) : undefined,
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: d === 'DEFER' || window.confirm(`CONFIRM pricing: ${d}?`),
                                }).then((r) => {
                                  if (r.success) openProduct(productSlug!);
                                  else setStatusMessage({ type: 'error', text: r.error || 'Failed' });
                                })
                              }
                            >
                              {d.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {section === 'COMPLIANCE' && (
                      <div className="text-xs space-y-2 border border-slate-800 rounded p-2">
                        <div>
                          Current: {workspace.product.complianceClassification} · Flags:{' '}
                          {(workspace.product.contentFlags || []).join(', ') || 'none'}
                        </div>
                        <p className="text-amber-400/80 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Software does not claim legality.
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {(['APPROVED', 'REQUIRES_REVIEW', 'BLOCKED'] as ComplianceClassification[]).map((c) => (
                            <button
                              key={c}
                              className="px-2 py-1 border border-slate-700 rounded"
                              onClick={() =>
                                stageComplianceDecisionAction({
                                  productSlug: productSlug!,
                                  classification: c,
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: window.confirm(`CONFIRM compliance ${c}?`),
                                }).then((r) => {
                                  if (r.success) openProduct(productSlug!);
                                  else setStatusMessage({ type: 'error', text: r.error || 'Failed' });
                                })
                              }
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {section === 'COUNTRY AVAILABILITY' && (
                      <div className="text-xs border border-slate-800 rounded p-2 max-h-64 overflow-y-auto grid sm:grid-cols-2 gap-1">
                        {(workspace.europeanCountries || []).map((c: any) => (
                          <div key={c.code} className="flex items-center justify-between gap-2 border border-slate-800 rounded px-2 py-1">
                            <span>
                              {c.code} · {workspace.product.countryAvailability?.[c.code] || 'NOT_CONFIGURED'}
                            </span>
                            <select
                              className="bg-slate-950 border border-slate-700 rounded text-[10px]"
                              value={workspace.product.countryAvailability?.[c.code] || 'NOT_CONFIGURED'}
                              onChange={(e) =>
                                stageCountryDecisionAction({
                                  productSlug: productSlug!,
                                  countryCode: c.code,
                                  status: e.target.value as CountryAvailabilityStatus,
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: true,
                                }).then((r) => {
                                  if (r.success) openProduct(productSlug!);
                                  else setStatusMessage({ type: 'error', text: r.error || 'Failed' });
                                })
                              }
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="RESTRICTED">RESTRICTED</option>
                              <option value="BLOCKED">BLOCKED</option>
                              <option value="NOT_CONFIGURED">NOT_CONFIGURED</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}

                    {section === 'CONTENT' && (
                      <div className="text-xs space-y-2 border border-slate-800 rounded p-2">
                        <div className="grid md:grid-cols-2 gap-2">
                          <div>
                            <div className="text-slate-500">SOURCE COPY</div>
                            <pre className="whitespace-pre-wrap max-h-28 overflow-auto bg-slate-950 p-2 rounded border border-slate-800">
                              {workspace.product.originalSourceContent}
                            </pre>
                          </div>
                          <div>
                            <div className="text-slate-500">CURRENT EU COPY</div>
                            <pre className="whitespace-pre-wrap max-h-28 overflow-auto bg-slate-950 p-2 rounded border border-slate-800">
                              {workspace.product.approvedStoreContent || workspace.product.description}
                            </pre>
                          </div>
                        </div>
                        <textarea
                          value={rewriteDraft}
                          onChange={(e) => setRewriteDraft(e.target.value)}
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          placeholder="Approved rewrite (raw source never replaced)"
                        />
                        <div className="flex flex-wrap gap-1">
                          {(['APPROVE', 'REWRITE', 'BLOCK', 'DEFER'] as const).map((a) => (
                            <button
                              key={a}
                              className="px-2 py-1 border border-slate-700 rounded"
                              onClick={() =>
                                stageContentDecisionAction({
                                  productSlug: productSlug!,
                                  action: a,
                                  rewrittenContent: a === 'REWRITE' ? rewriteDraft : undefined,
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: a === 'DEFER' || window.confirm(`CONFIRM content ${a}?`),
                                }).then((r) => {
                                  if (r.success) openProduct(productSlug!);
                                  else setStatusMessage({ type: 'error', text: r.error || 'Failed' });
                                })
                              }
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {section === 'MEDIA' && (
                      <div className="space-y-2 text-xs">
                        {(workspace.product.mediaAssets || []).map((m: any) => (
                          <div key={m.id} className="border border-slate-800 rounded p-2 flex flex-wrap gap-2 justify-between">
                            <div className="font-mono text-[10px] space-y-0.5 min-w-0 flex-1">
                              <div className="truncate">{m.url}</div>
                              <div>
                                hash {m.hash || '—'} · {m.dimensions || '—'} · {m.status}/{m.duplicateStatus}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(['SET_PRIMARY', 'KEEP', 'REJECT', 'MARK_MISSING'] as const).map((a) => (
                                <button
                                  key={a}
                                  className="px-2 py-1 border border-slate-700 rounded text-[10px]"
                                  onClick={() =>
                                    stageMediaDecisionAction({
                                      productSlug: productSlug!,
                                      mediaId: m.id,
                                      action: a,
                                      reason,
                                      actor: actorName,
                                      actorRole: currentRole,
                                      confirm: true,
                                    }).then(() => openProduct(productSlug!))
                                  }
                                >
                                  {a.replace(/_/g, ' ')}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {section === 'TRANSLATION' && (
                      <div className="text-xs space-y-2">
                        {(['de', 'fr', 'es', 'it', 'nl'] as const).map((loc) => {
                          const field = workspace.translations?.locales?.[loc];
                          return (
                            <div key={loc} className="border border-slate-800 rounded p-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="uppercase font-semibold">{loc}</span>
                                <span>{field?.status || 'MISSING'}</span>
                              </div>
                              <textarea
                                id={`tr-${loc}`}
                                defaultValue={field?.value || ''}
                                rows={2}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                              />
                              <button
                                className="px-2 py-1 border border-emerald-700 rounded text-[10px]"
                                onClick={() => {
                                  const el = document.getElementById(`tr-${loc}`) as HTMLTextAreaElement;
                                  stageTranslationDecisionAction({
                                    productSlug: productSlug!,
                                    locale: loc,
                                    value: el?.value || '',
                                    approve: true,
                                    reason,
                                    actor: actorName,
                                    actorRole: currentRole,
                                    confirm: window.confirm(`CONFIRM APPROVE ${loc.toUpperCase()} translation?`),
                                  }).then((r) => {
                                    if (r.success) openProduct(productSlug!);
                                    else setStatusMessage({ type: 'error', text: r.error || 'Failed' });
                                  });
                                }}
                              >
                                SAVE & APPROVE {loc.toUpperCase()}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {section === 'SEO' && (
                      <div className="text-xs space-y-2 border border-slate-800 rounded p-2">
                        <div className="font-mono text-[10px] text-slate-400">
                          Source: {workspace.product.seo?.sourceTitle || '—'} / {workspace.product.seo?.sourceDescription || '—'}
                        </div>
                        <input
                          value={seoTitle}
                          onChange={(e) => setSeoTitle(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          placeholder="EU SEO title"
                        />
                        <textarea
                          value={seoDesc}
                          onChange={(e) => setSeoDesc(e.target.value)}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          placeholder="EU SEO description"
                        />
                        <div className="flex gap-1">
                          {(['APPROVE', 'EDIT', 'DEFER'] as const).map((a) => (
                            <button
                              key={a}
                              className="px-2 py-1 border border-slate-700 rounded"
                              onClick={() =>
                                stageSeoDecisionAction({
                                  productSlug: productSlug!,
                                  action: a,
                                  title: seoTitle,
                                  description: seoDesc,
                                  reason,
                                  actor: actorName,
                                  actorRole: currentRole,
                                  confirm: a === 'DEFER' || window.confirm(`CONFIRM SEO ${a}?`),
                                }).then((r) => {
                                  if (r.success) openProduct(productSlug!);
                                  else setStatusMessage({ type: 'error', text: r.error || 'Failed' });
                                })
                              }
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {recs.map((rec: any) => (
                      <div key={rec.id} className="border border-slate-800 rounded p-2 text-xs space-y-1 bg-slate-950/40">
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <span className="text-violet-300 font-semibold">{rec.priority}</span> · {rec.recommendation} ·{' '}
                            {rec.confidence}
                            {rec.highRisk && <span className="text-amber-400 ml-1">high-risk</span>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => stageRec(rec.id, 'ACCEPT')} className="px-2 py-0.5 border border-emerald-700 rounded">
                              ACCEPT
                            </button>
                            <button onClick={() => stageRec(rec.id, 'REJECT')} className="px-2 py-0.5 border border-rose-700 rounded">
                              REJECT
                            </button>
                            <button onClick={() => stageRec(rec.id, 'EDIT')} className="px-2 py-0.5 border border-slate-600 rounded">
                              EDIT
                            </button>
                            <button onClick={() => stageRec(rec.id, 'DEFER')} className="px-2 py-0.5 border border-slate-600 rounded">
                              DEFER
                            </button>
                          </div>
                        </div>
                        <div className="text-slate-400">{rec.evidence?.summary}</div>
                        <div className="grid md:grid-cols-2 gap-2 font-mono text-[10px]">
                          <div>
                            CURRENT
                            <pre className="whitespace-pre-wrap max-h-20 overflow-auto">{JSON.stringify(rec.currentValue, null, 2)}</pre>
                          </div>
                          <div>
                            SUGGESTED
                            <pre className="whitespace-pre-wrap max-h-20 overflow-auto">{JSON.stringify(rec.proposedValue, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                    {recs.length === 0 &&
                      !['STRUCTURE', 'PRICING', 'COMPLIANCE', 'COUNTRY AVAILABILITY', 'CONTENT', 'MEDIA', 'TRANSLATION', 'SEO'].includes(
                        section
                      ) && <div className="text-slate-600 text-xs">No outstanding recommendations in this section.</div>}
                  </div>
                );
              })}

              {workspace.summary && (
                <div className="border border-violet-800 bg-violet-950/20 rounded-lg p-3 text-xs space-y-1">
                  <h3 className="font-semibold">Product review summary</h3>
                  <div>Product: {workspace.summary.productName}</div>
                  <div>Decisions made: {workspace.summary.decisionsMade}</div>
                  <div>Deferred: {workspace.summary.deferred}</div>
                  <div>Blocked: {workspace.summary.blocked}</div>
                  <div>Publication: {workspace.summary.publication}</div>
                  <div>Reasons: {(workspace.summary.reasons || []).join('; ') || '—'}</div>
                </div>
              )}

              {preview && (
                <div className="border border-emerald-800 rounded-lg p-3 text-xs space-y-1">
                  <h3 className="font-semibold text-emerald-300">PUBLICATION PREVIEW (read-only · not live)</h3>
                  <div>{preview.name}</div>
                  <div className="text-slate-400">{preview.description}</div>
                  <div>
                    {preview.priceLabel} · {preview.locale}/{preview.currency} · {preview.countryCode}: {preview.availability}
                  </div>
                  <div className="text-slate-500">{preview.customerMessage}</div>
                </div>
              )}

              {exportJson && (
                <pre className="text-[10px] font-mono border border-slate-800 rounded p-3 max-h-64 overflow-auto bg-slate-950">
                  {exportJson}
                </pre>
              )}
            </>
          )}
        </section>

        {/* Readiness sidebar */}
        <aside className="border border-slate-800 rounded-lg bg-slate-900/40 p-3 text-xs space-y-2 h-fit sticky top-20">
          <h3 className="font-semibold text-slate-300">Publication readiness</h3>
          <p className="text-slate-500">READY_FOR_PUBLICATION ≠ PUBLISHED</p>
          <ul className="font-mono space-y-1">
            {Object.entries(gates).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-2">
                <span>{k}</span>
                <span className={v === 'READY' ? 'text-emerald-400' : v === 'PENDING' ? 'text-amber-400' : 'text-rose-400'}>
                  {String(v)}
                </span>
              </li>
            ))}
          </ul>
          {workspace?.checklist?.blockers?.length > 0 && (
            <div className="text-rose-300/90 text-[10px] pt-2 border-t border-slate-800">
              {(workspace.checklist.blockers as string[]).join('; ')}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
