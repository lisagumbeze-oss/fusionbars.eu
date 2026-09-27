'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Shield,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  Eye,
  History,
  Package,
  X,
  Save,
  Users,
} from 'lucide-react';
import {
  getAdjudicationDashboardAction,
  getAdjudicationBatchAction,
  setAdjudicationBatchSizeAction,
  advanceAdjudicationBatchAction,
  assignAdjudicationReviewerAction,
  saveAdjudicationDraftAction,
  adjudicatePossibleMatchAction,
  adjudicateFieldConflictAction,
  adjudicateFlavourGroupAction,
  adjudicatePricingAction,
  adjudicateComplianceAction,
  adjudicateCountryAction,
  adjudicateContentAction,
  adjudicateMediaAction,
  saveTranslationDraftAction,
  approveTranslationAction,
  adjudicateCategoryAction,
  adjudicateImportedReviewAction,
  markReadyForPublicationAction,
  publishFinalAction,
  getPublicationPreviewAction,
  executeSafeBulkAdjudicationAction,
  getAdjudicationAuditAction,
} from '@/actions/catalogue-adjudication';
import {
  AdjudicationQueue,
  BATCH_SIZES,
  DEFAULT_BATCH_SIZE,
  OperatorAdjudicationReport,
  PossibleMatchGroup,
  FlavourGroup,
  AdjudicationAudit,
  PublicationPreview,
  QueueCard,
} from '@/domain/catalog/CatalogueAdjudicationService';
import { CategoryMappingDecision, ReviewModerationItem, ReviewProductItem } from '@/domain/catalog/CatalogueReviewService';
import { ComplianceClassification, CountryAvailabilityStatus, LocaleCode, RoleName } from '@/types';

const QUEUE_ORDER: AdjudicationQueue[] = [
  'POSSIBLE_MATCHES',
  'DUPLICATE_CONFLICTS',
  'PRICING',
  'COMPLIANCE',
  'CONTENT',
  'CATEGORIES',
  'MEDIA',
  'TRANSLATIONS',
  'REVIEWS',
  'PUBLICATION_READINESS',
];

const AUTHORIZED: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];

function formatMoney(minor?: number | null, currency = 'EUR') {
  if (minor == null || minor <= 0) return '—';
  const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';
  return `${symbol}${(minor / 100).toFixed(2)}`;
}

function sourceLabel(key: string) {
  if (key === 'reference') return 'SOURCE A (Reference)';
  if (key === 'repoA') return 'SOURCE B (Repo A)';
  if (key === 'repoB') return 'SOURCE C (Repo B)';
  return key;
}

function resolveSourceName(raw: any): string {
  return raw?.rawPayload?.name || raw?.sourceShortDescription || raw?.sourceSlug || raw?.sourceName || '—';
}

export default function CatalogueAdjudicationPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const [currentRole, setCurrentRole] = useState<RoleName>('SUPER_ADMIN');
  const actorName = `${currentRole.toLowerCase().replace('_', '.')}.officer@fusionbars.eu`;

  const [activeQueue, setActiveQueue] = useState<AdjudicationQueue>('POSSIBLE_MATCHES');
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE);
  const [batchItems, setBatchItems] = useState<any[]>([]);
  const [batchMeta, setBatchMeta] = useState({ offset: 0, total: 0 });

  const [queues, setQueues] = useState<QueueCard[]>([]);
  const [totalImported, setTotalImported] = useState(0);
  const [fullyAdjudicated, setFullyAdjudicated] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [report, setReport] = useState<OperatorAdjudicationReport | null>(null);
  const [matchGroups, setMatchGroups] = useState<PossibleMatchGroup[]>([]);
  const [flavourGroups, setFlavourGroups] = useState<FlavourGroup[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<CategoryMappingDecision[]>([]);
  const [reviews, setReviews] = useState<ReviewModerationItem[]>([]);
  const [europeanCountries, setEuropeanCountries] = useState<Array<{ code: string; name: string }>>([]);
  const [auditTrail, setAuditTrail] = useState<AdjudicationAudit[]>([]);

  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [reason, setReason] = useState('Human adjudication decision recorded for European catalogue governance');
  const [rewriteDraft, setRewriteDraft] = useState('');
  const [eurDraft, setEurDraft] = useState('');
  const [gbpDraft, setGbpDraft] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [translationDrafts, setTranslationDrafts] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PublicationPreview | null>(null);
  const [previewLocale, setPreviewLocale] = useState<LocaleCode>('en');
  const [previewCurrency, setPreviewCurrency] = useState<'EUR' | 'GBP'>('EUR');
  const [previewCountry, setPreviewCountry] = useState('NL');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [assigneeRole, setAssigneeRole] = useState<RoleName>('CATALOG_MANAGER');

  const authorized = AUTHORIZED.includes(currentRole);

  useEffect(() => {
    loadAll();
  }, [currentRole]);

  useEffect(() => {
    if (authorized) loadBatch();
  }, [activeQueue, batchSize, currentRole]);

  async function loadAll() {
    setLoading(true);
    try {
      const res = await getAdjudicationDashboardAction(currentRole);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Unauthorized' });
        setQueues([]);
        return;
      }
      setQueues(res.dashboard?.queues || []);
      setTotalImported(res.dashboard?.totalImported || 0);
      setFullyAdjudicated(res.dashboard?.fullyAdjudicated || 0);
      setRemaining(res.dashboard?.remaining || 0);
      setReport(res.report || null);
      setMatchGroups(res.matchGroups || []);
      setFlavourGroups(res.flavourGroups || []);
      setCategoryMappings(res.categoryMappings || []);
      setReviews(res.reviews || []);
      setEuropeanCountries(
        (res.europeanCountries || []).map((c: any) => ({ code: c.code, name: c.name || c.code }))
      );
      const auditRes = await getAdjudicationAuditAction(currentRole);
      if (auditRes.success) setAuditTrail(auditRes.auditTrail || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadBatch() {
    const res = await getAdjudicationBatchAction({
      queue: activeQueue,
      size: batchSize,
      role: currentRole,
    });
    if (res.success && res.batch) {
      setBatchItems(res.batch.items || []);
      setBatchMeta({ offset: res.batch.offset, total: res.batch.total });
      setBatchSize(res.batch.batchSize);
    }
  }

  async function refresh() {
    await loadAll();
    await loadBatch();
  }

  function notify(type: 'success' | 'error' | 'info', text: string) {
    setStatusMessage({ type, text });
  }

  async function handleBatchSize(size: number) {
    const res = await setAdjudicationBatchSizeAction({ size, role: currentRole });
    if (res.success) {
      setBatchSize(res.batchSize || size);
      notify('info', `Batch size set to ${size}. Progress cursor preserved.`);
    } else {
      notify('error', res.error || 'Failed to set batch size');
    }
  }

  async function handleAdvance() {
    await advanceAdjudicationBatchAction({ queue: activeQueue, role: currentRole });
    await loadBatch();
  }

  async function autosaveDraft(recordId: string, draft: any) {
    await saveAdjudicationDraftAction({
      recordId,
      draft,
      actor: actorName,
      actorRole: currentRole,
    });
  }

  async function handleAssign(productSlug: string) {
    const res = await assignAdjudicationReviewerAction({
      productSlug,
      role: assigneeRole,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Assigned ${productSlug} to ${assigneeRole}`);
      refresh();
    } else notify('error', res.error || 'Assignment failed');
  }

  async function handleMatch(groupId: string, decision: 'MERGE' | 'KEEP_SEPARATE' | 'DEFER') {
    if (decision === 'MERGE') {
      const ok = window.confirm('Confirm MERGE of this possible-match group? This does not publish products.');
      if (!ok) return;
    }
    if (decision === 'KEEP_SEPARATE' && !reason.trim()) {
      alert('KEEP SEPARATE requires a reason.');
      return;
    }
    const res = await adjudicatePossibleMatchAction({
      groupId,
      decision,
      reason,
      confirmMerge: decision === 'MERGE',
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Match decision: ${decision}`);
      refresh();
    } else notify('error', res.error || 'Match adjudication failed');
  }

  async function handleField(
    productSlug: string,
    fieldName: string,
    choice: 'USE_REFERENCE' | 'USE_REPO_A' | 'USE_REPO_B' | 'KEEP_CURRENT_EU' | 'CUSTOM_VALUE' | 'DEFER'
  ) {
    const res = await adjudicateFieldConflictAction({
      productSlug,
      fieldName,
      choice,
      customValue: choice === 'CUSTOM_VALUE' ? customFieldValue : undefined,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Field ${fieldName}: ${choice}`);
      refresh();
    } else notify('error', res.error || 'Field decision failed');
  }

  async function handleFlavour(groupId: string, decision: 'MERGE_INTO_VARIANTS' | 'KEEP_AS_SEPARATE_PRODUCTS' | 'DEFER') {
    const res = await adjudicateFlavourGroupAction({
      groupId,
      decision,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Flavour group: ${decision}`);
      refresh();
    } else notify('error', res.error || 'Flavour decision failed');
  }

  async function handlePricing(
    productSlug: string,
    decision: 'APPROVE_EXISTING_EU_PRICE' | 'SET_EUR_PRICE' | 'SET_GBP_PRICE' | 'MARK_PRICING_UNRESOLVED' | 'DEFER'
  ) {
    const res = await adjudicatePricingAction({
      productSlug,
      decision,
      priceEUR: eurDraft ? Math.round(parseFloat(eurDraft) * 100) : undefined,
      priceGBP: gbpDraft ? Math.round(parseFloat(gbpDraft) * 100) : undefined,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Pricing: ${decision}`);
      refresh();
    } else notify('error', res.error || 'Pricing decision failed');
  }

  async function handleCompliance(productSlug: string, classification: ComplianceClassification | 'DEFER') {
    const res = await adjudicateComplianceAction({
      productSlug,
      classification,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Compliance: ${classification}`);
      refresh();
    } else notify('error', res.error || 'Compliance decision failed');
  }

  async function handleCountry(productSlug: string, countryCode: string, status: CountryAvailabilityStatus) {
    if ((status === 'RESTRICTED' || status === 'BLOCKED') && !reason.trim()) {
      alert('RESTRICTED / BLOCKED require an internal reason.');
      return;
    }
    const res = await adjudicateCountryAction({
      productSlug,
      countryCode,
      status,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `${countryCode} → ${status}`);
      refresh();
    } else notify('error', res.error || 'Country decision failed');
  }

  async function handleContent(productSlug: string, action: 'APPROVE' | 'REWRITE' | 'BLOCK' | 'DEFER') {
    const res = await adjudicateContentAction({
      productSlug,
      action,
      rewrittenContent: action === 'REWRITE' ? rewriteDraft : undefined,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Content: ${action}`);
      refresh();
    } else notify('error', res.error || 'Content decision failed');
  }

  async function handleMedia(
    productSlug: string,
    mediaId: string,
    action: 'SET_PRIMARY' | 'KEEP' | 'REJECT' | 'MARK_MISSING' | 'DEFER'
  ) {
    const res = await adjudicateMediaAction({
      productSlug,
      mediaId,
      action,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Media: ${action}`);
      refresh();
    } else notify('error', res.error || 'Media decision failed');
  }

  async function handleTranslationDraft(productSlug: string, loc: Exclude<LocaleCode, 'en'>, value: string) {
    setTranslationDrafts((prev) => ({ ...prev, [`${productSlug}:${loc}`]: value }));
    await saveTranslationDraftAction({
      productSlug,
      locale: loc,
      value,
      actor: actorName,
      actorRole: currentRole,
    });
  }

  async function handleTranslationApprove(productSlug: string, loc: Exclude<LocaleCode, 'en'>) {
    const res = await approveTranslationAction({
      productSlug,
      locale: loc,
      actor: actorName,
      actorRole: currentRole,
      reason,
    });
    if (res.success) {
      notify('success', `Translation ${loc.toUpperCase()} approved`);
      refresh();
    } else notify('error', res.error || 'Translation approval failed');
  }

  async function handleCategory(
    sourceCategorySlug: string,
    action: 'APPROVE' | 'CHANGE_TARGET' | 'CREATE_NEW_CATEGORY' | 'DEFER',
    targetCategorySlug?: string,
    targetCategoryName?: string
  ) {
    const res = await adjudicateCategoryAction({
      sourceCategorySlug,
      action,
      targetCategorySlug,
      targetCategoryName,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Category: ${action}`);
      refresh();
    } else notify('error', res.error || 'Category decision failed');
  }

  async function handleReview(reviewId: string, action: 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'DEFER') {
    const res = await adjudicateImportedReviewAction({
      reviewId,
      action,
      reason,
      actor: actorName,
      actorRole: currentRole,
    });
    if (res.success) {
      notify('success', `Review: ${action}`);
      refresh();
    } else notify('error', res.error || 'Review moderation failed');
  }

  async function handleMarkReady(productSlug: string) {
    const res = await markReadyForPublicationAction({
      productSlug,
      actor: actorName,
      actorRole: currentRole,
      reason,
    });
    if (res.success) {
      notify('success', `${productSlug} marked READY_FOR_PUBLICATION`);
      refresh();
    } else notify('error', res.error || 'Not ready');
  }

  async function handlePublish(productSlug: string) {
    const ok = window.confirm(
      `SUPER_ADMIN final publication confirmation for ${productSlug}. This is the second gate after READY_FOR_PUBLICATION.`
    );
    if (!ok) return;
    const res = await publishFinalAction({
      productSlug,
      actor: actorName,
      actorRole: currentRole,
      reason,
      confirm: true,
    });
    if (res.success) {
      notify('success', `Published: ${productSlug}`);
      refresh();
    } else notify('error', res.error || 'Publication blocked');
  }

  async function handlePreview(productSlug: string) {
    const res = await getPublicationPreviewAction({
      productSlug,
      locale: previewLocale,
      currency: previewCurrency,
      countryCode: previewCountry,
      role: currentRole,
    });
    if (res.success) setPreview(res.preview || null);
    else notify('error', res.error || 'Preview failed');
  }

  async function handleSafeBulk(action: 'ASSIGN_REVIEWER' | 'APPROVE_MEDIA' | 'SET_TRANSLATION_STATUS') {
    if (selectedSlugs.length === 0) {
      alert('Select at least one product.');
      return;
    }
    const res = await executeSafeBulkAdjudicationAction({
      action,
      productSlugs: selectedSlugs,
      actor: actorName,
      actorRole: currentRole,
      reason,
      assigneeRole: action === 'ASSIGN_REVIEWER' ? assigneeRole : undefined,
      translationStatus: action === 'SET_TRANSLATION_STATUS' ? 'DRAFT' : undefined,
    });
    if (res.success) {
      notify('success', `Safe bulk ${action}: ${res.affectedCount} product(s)`);
      setSelectedSlugs([]);
      refresh();
    } else {
      alert((res.errors || ['Bulk action blocked']).join('\n'));
    }
  }

  const queueLabel = useMemo(() => queues.find((q) => q.queue === activeQueue)?.label || activeQueue, [queues, activeQueue]);

  if (!authorized && !loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
        <div className="max-w-md border border-rose-800 bg-rose-950/40 p-6 rounded-lg text-sm">
          <p className="font-semibold text-rose-300">Access denied</p>
          <p className="mt-2 text-slate-300">
            Role <code>{currentRole}</code> cannot access Catalogue Adjudication. Required: SUPER_ADMIN, CATALOG_MANAGER,
            CONTENT_MANAGER, or COMPLIANCE_MANAGER.
          </p>
          <Link href={`/${locale}/admin`} className="inline-block mt-4 text-amber-400 underline">
            Return to admin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Catalogue Adjudication Workspace</h1>
                <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  Human decisions only
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>FusionBars EU</span>
                <span>·</span>
                <span>
                  {fullyAdjudicated} / {totalImported} fully adjudicated
                </span>
                <span>·</span>
                <span>Launch: PAUSED</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-slate-400">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as RoleName)}
                className="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="SUPER_ADMIN" className="bg-slate-900">
                  SUPER_ADMIN
                </option>
                <option value="CATALOG_MANAGER" className="bg-slate-900">
                  CATALOG_MANAGER
                </option>
                <option value="CONTENT_MANAGER" className="bg-slate-900">
                  CONTENT_MANAGER
                </option>
                <option value="COMPLIANCE_MANAGER" className="bg-slate-900">
                  COMPLIANCE_MANAGER
                </option>
                <option value="ORDER_MANAGER" className="bg-slate-900">
                  ORDER_MANAGER (Denied)
                </option>
              </select>
            </div>
            <Link
              href={`/${locale}/admin/catalogue/review`}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800"
            >
              Review Center
            </Link>
            <Link
              href={`/${locale}/admin/catalogue/recommendations`}
              className="text-xs text-sky-300 hover:text-white px-3 py-1.5 rounded-lg border border-sky-800 bg-sky-950/40"
            >
              Recommendations
            </Link>
            <Link
              href={`/${locale}/admin/catalogue/imports`}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800"
            >
              Imports
            </Link>
            <button
              onClick={() => setShowAudit((v) => !v)}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 flex items-center gap-1"
            >
              <History className="w-3.5 h-3.5" /> Audit
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {statusMessage && (
          <div
            className={`p-4 rounded-lg flex items-center justify-between text-xs border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                  : 'bg-blue-950/40 border-blue-800/80 text-blue-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Total imported</span>
            <span className="text-2xl font-bold text-white">{totalImported}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Fully adjudicated</span>
            <span className="text-2xl font-bold text-emerald-400">
              {fullyAdjudicated} / {totalImported}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Remaining</span>
            <span className="text-2xl font-bold text-amber-400">{remaining}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <span className="text-xs text-slate-400 block">Ready / Published</span>
            <span className="text-2xl font-bold text-white">
              {report?.readyForPublication ?? 0} / {report?.published ?? 0}
            </span>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Review queues</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {QUEUE_ORDER.map((q) => {
              const card = queues.find((c) => c.queue === q);
              const active = activeQueue === q;
              return (
                <button
                  key={q}
                  onClick={() => setActiveQueue(q)}
                  className={`text-left border rounded-lg p-3 transition ${
                    active ? 'border-emerald-600 bg-emerald-950/30' : 'border-slate-800 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <div className="text-xs font-semibold text-white">{card?.label || q}</div>
                  <div className="mt-2 space-y-0.5 text-[11px] text-slate-400 font-mono">
                    <div>{card?.total ?? 0} total</div>
                    <div>{card?.completed ?? 0} completed</div>
                    <div>{card?.remaining ?? 0} remaining</div>
                    <div>{card?.blocked ?? 0} blocked</div>
                    <div>{card?.needsReview ?? 0} needs-review</div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-3 border border-slate-800 bg-slate-900/40 rounded-lg p-3 text-xs">
          <span className="text-slate-400">Batch size</span>
          {BATCH_SIZES.map((s) => (
            <button
              key={s}
              onClick={() => handleBatchSize(s)}
              className={`px-2.5 py-1 rounded border ${
                batchSize === s ? 'border-emerald-500 text-emerald-300 bg-emerald-950/40' : 'border-slate-700 text-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
          <span className="text-slate-500 ml-2">
            Showing {batchMeta.offset + 1}–{Math.min(batchMeta.offset + batchSize, batchMeta.total)} of {batchMeta.total} ·{' '}
            {queueLabel}
          </span>
          <button
            onClick={handleAdvance}
            className="ml-auto px-3 py-1.5 rounded border border-slate-700 bg-slate-800 text-slate-200 flex items-center gap-1"
          >
            Next batch <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={refresh} className="px-3 py-1.5 rounded border border-slate-700 bg-slate-800 text-slate-200 flex items-center gap-1">
            <RotateCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </section>

        <section className="border border-slate-800 bg-slate-900/40 rounded-lg p-3 text-xs space-y-2">
          <label className="block text-slate-400">Decision reason (required for KEEP SEPARATE / RESTRICTED / BLOCKED)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-400">Assign reviewer</span>
            <select
              value={assigneeRole}
              onChange={(e) => setAssigneeRole(e.target.value as RoleName)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1"
            >
              {AUTHORIZED.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleSafeBulk('ASSIGN_REVIEWER')}
              className="px-2 py-1 border border-slate-700 rounded text-slate-300"
            >
              Bulk assign selected
            </button>
            <button onClick={() => handleSafeBulk('APPROVE_MEDIA')} className="px-2 py-1 border border-slate-700 rounded text-slate-300">
              Bulk approve media
            </button>
            <span className="text-slate-600">Forbidden bulk: publish / all-compliance / all-countries / EUR prices / all-content</span>
          </div>
        </section>

        {loading ? (
          <div className="text-sm text-slate-400 py-12 text-center">Loading adjudication queues…</div>
        ) : (
          <div className="space-y-4">
            {activeQueue === 'POSSIBLE_MATCHES' &&
              (matchGroups.length === 0 ? (
                <EmptyQueue label="possible matches" />
              ) : (
                matchGroups.map((g) => {
                  const products = batchItems
                    .map((i) => i.product as ReviewProductItem | null)
                    .filter(Boolean)
                    .filter((p) => g.slugs.includes(p!.canonicalSlug)) as ReviewProductItem[];
                  const sideBySide =
                    products.length > 0
                      ? products
                      : g.slugs.map((slug) => ({ canonicalSlug: slug, name: slug } as ReviewProductItem));
                  return (
                    <article key={g.id} className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-white text-sm">
                          {g.label} · {g.status} {g.decision ? `· ${g.decision}` : ''}
                        </h3>
                        <div className="flex gap-2 text-xs">
                          <button onClick={() => handleMatch(g.id, 'MERGE')} className="px-2 py-1 bg-emerald-900/50 border border-emerald-700 rounded">
                            MERGE
                          </button>
                          <button
                            onClick={() => handleMatch(g.id, 'KEEP_SEPARATE')}
                            className="px-2 py-1 bg-amber-900/40 border border-amber-700 rounded"
                          >
                            KEEP SEPARATE
                          </button>
                          <button onClick={() => handleMatch(g.id, 'DEFER')} className="px-2 py-1 border border-slate-600 rounded">
                            DEFER
                          </button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        {(['reference', 'repoA', 'repoB'] as const).map((key, idx) => {
                          const p = sideBySide[idx] || sideBySide[0];
                          const src = p?.sources?.[key];
                          return (
                            <div key={key} className="border border-slate-800 rounded p-3 text-[11px] space-y-1 bg-slate-950/50">
                              <div className="font-semibold text-emerald-300">{sourceLabel(key)}</div>
                              <div>name: {src ? resolveSourceName(src) : p?.name || '—'}</div>
                              <div>slug: {src?.sourceSlug || p?.canonicalSlug || '—'}</div>
                              <div>SKU: {String(src?.sourceSku ?? p?.sku ?? '—')}</div>
                              <div>
                                price: {src?.sourcePrice != null ? `${src.sourceCurrency || ''} ${src.sourcePrice}` : formatMoney(p?.priceEUR)}
                              </div>
                              <div className="line-clamp-3">description: {src?.sourceShortDescription || p?.description || '—'}</div>
                              <div>category: {src?.sourceCategoryName || p?.categoryName || '—'}</div>
                              <div className="truncate">image: {src?.sourcePrimaryImage || p?.primaryImage || '—'}</div>
                              <div className="line-clamp-2">ingredients: {src?.sourceIngredients || p?.ingredients?.join(', ') || '—'}</div>
                              <div className="truncate">URL: {src?.sourcePermalink || src?.sourceCanonicalUrl || '—'}</div>
                              <div className="truncate">file: {src?.sourceFilePath || '—'}</div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })
              ))}

            {activeQueue === 'DUPLICATE_CONFLICTS' &&
              batchItems.map((item) => {
                const p = item.product as ReviewProductItem | null;
                if (!p) return null;
                const conflicts = (p.fieldComparisons || []).filter((c) => c.hasConflict);
                return (
                  <article key={item.record.id} className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 space-y-3">
                    <ItemHeader
                      item={item}
                      selected={selectedSlugs.includes(p.canonicalSlug)}
                      onSelect={(checked) =>
                        setSelectedSlugs((prev) =>
                          checked ? [...prev, p.canonicalSlug] : prev.filter((s) => s !== p.canonicalSlug)
                        )
                      }
                      onAssign={() => handleAssign(p.canonicalSlug)}
                      onAutosave={() => autosaveDraft(item.record.id, { note: 'in progress' })}
                    />
                    {conflicts.length === 0 ? (
                      <p className="text-xs text-slate-500">No open field conflicts on this record.</p>
                    ) : (
                      conflicts.map((c) => (
                        <div key={c.fieldName} className="border border-slate-800 rounded p-3 text-xs space-y-2">
                          <div className="font-semibold text-amber-300 uppercase tracking-wide">{c.fieldName}</div>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-[11px]">
                            <div>
                              <div className="text-slate-500">Reference</div>
                              <div className="text-slate-200 break-all">{String(c.referenceValue ?? '—')}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Repo A</div>
                              <div className="text-slate-200 break-all">{String(c.repoAValue ?? '—')}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Repo B</div>
                              <div className="text-slate-200 break-all">{String(c.repoBValue ?? '—')}</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Current EU</div>
                              <div className="text-slate-200 break-all">{String(c.currentFusionEUValue ?? '—')}</div>
                            </div>
                          </div>
                          <input
                            placeholder="Custom value"
                            value={customFieldValue}
                            onChange={(e) => setCustomFieldValue(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px]"
                          />
                          <div className="flex flex-wrap gap-1">
                            {(
                              [
                                'USE_REFERENCE',
                                'USE_REPO_A',
                                'USE_REPO_B',
                                'KEEP_CURRENT_EU',
                                'CUSTOM_VALUE',
                                'DEFER',
                              ] as const
                            ).map((choice) => (
                              <button
                                key={choice}
                                onClick={() => handleField(p.canonicalSlug, c.fieldName, choice)}
                                className="px-2 py-1 border border-slate-700 rounded text-[10px] hover:border-emerald-600"
                              >
                                {choice.replace(/_/g, ' ')}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </article>
                );
              })}

            {activeQueue !== 'POSSIBLE_MATCHES' &&
              activeQueue !== 'DUPLICATE_CONFLICTS' &&
              activeQueue !== 'CATEGORIES' &&
              activeQueue !== 'REVIEWS' &&
              batchItems.map((item) => {
                const p = item.product as ReviewProductItem | null;
                if (!p) return null;
                return (
                  <article key={item.record.id} className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 space-y-3">
                    <ItemHeader
                      item={item}
                      selected={selectedSlugs.includes(p.canonicalSlug)}
                      onSelect={(checked) =>
                        setSelectedSlugs((prev) =>
                          checked ? [...prev, p.canonicalSlug] : prev.filter((s) => s !== p.canonicalSlug)
                        )
                      }
                      onAssign={() => handleAssign(p.canonicalSlug)}
                      onAutosave={() => autosaveDraft(item.record.id, { queue: activeQueue, draft: true })}
                    />

                    {item.conflictSummary && (
                      <ConflictSummaryBlock summary={item.conflictSummary} />
                    )}

                    {activeQueue === 'PRICING' && (
                      <div className="text-xs space-y-2">
                        <div className="grid sm:grid-cols-4 gap-2 font-mono">
                          <div>
                            SOURCE PRICE
                            <div className="text-white">{p.sourcePriceUSD ?? '—'}</div>
                          </div>
                          <div>
                            SOURCE CURRENCY
                            <div className="text-white">{p.sourceCurrency || '—'}</div>
                          </div>
                          <div>
                            EU EUR
                            <div className="text-white">{formatMoney(p.priceEUR, 'EUR')}</div>
                          </div>
                          <div>
                            EU GBP
                            <div className="text-white">{formatMoney(p.priceGBP, 'GBP')}</div>
                          </div>
                        </div>
                        <p className="text-slate-500">No automatic USD→EUR conversion. Pricing approval ≠ purchasable.</p>
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="EUR"
                            value={eurDraft}
                            onChange={(e) => setEurDraft(e.target.value)}
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="GBP"
                            value={gbpDraft}
                            onChange={(e) => setGbpDraft(e.target.value)}
                            className="w-24 bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              'APPROVE_EXISTING_EU_PRICE',
                              'SET_EUR_PRICE',
                              'SET_GBP_PRICE',
                              'MARK_PRICING_UNRESOLVED',
                              'DEFER',
                            ] as const
                          ).map((d) => (
                            <button
                              key={d}
                              onClick={() => handlePricing(p.canonicalSlug, d)}
                              className="px-2 py-1 border border-slate-700 rounded text-[10px]"
                            >
                              {d.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeQueue === 'COMPLIANCE' && (
                      <div className="text-xs space-y-2">
                        <div>
                          Classification: <strong className="text-amber-300">{p.complianceClassification}</strong>
                        </div>
                        <div>Product type: {p.productType}</div>
                        <div>Notes: {p.complianceReason || '—'}</div>
                        <div className="text-slate-500">Application does not decide legality. Country matrix is separate.</div>
                        <div className="flex flex-wrap gap-1">
                          {(['APPROVED', 'REQUIRES_REVIEW', 'BLOCKED', 'DEFER'] as const).map((c) => (
                            <button
                              key={c}
                              onClick={() => handleCompliance(p.canonicalSlug, c)}
                              className="px-2 py-1 border border-slate-700 rounded text-[10px]"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-slate-800 pt-3 mt-2">
                          <div className="font-semibold text-slate-300 mb-2">Country matrix</div>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                            {europeanCountries.map((c) => (
                              <div key={c.code} className="flex items-center justify-between gap-2 border border-slate-800 rounded px-2 py-1">
                                <span>
                                  {c.code} · {p.countryAvailability?.[c.code] || 'NOT_CONFIGURED'}
                                </span>
                                <select
                                  className="bg-slate-950 border border-slate-700 rounded text-[10px]"
                                  value={p.countryAvailability?.[c.code] || 'NOT_CONFIGURED'}
                                  onChange={(e) =>
                                    handleCountry(p.canonicalSlug, c.code, e.target.value as CountryAvailabilityStatus)
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
                        </div>
                      </div>
                    )}

                    {activeQueue === 'CONTENT' && (
                      <div className="text-xs space-y-2">
                        <div className="grid md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-slate-500 mb-1">ORIGINAL SOURCE CONTENT</div>
                            <pre className="whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded p-2 max-h-40 overflow-auto text-[11px]">
                              {p.originalSourceContent || '—'}
                            </pre>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">CURRENT EU STORE CONTENT</div>
                            <pre className="whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded p-2 max-h-40 overflow-auto text-[11px]">
                              {p.approvedStoreContent || p.description || '—'}
                            </pre>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(p.contentFlags || []).map((f) => (
                            <span key={f} className="text-[10px] border border-amber-800 text-amber-300 px-1.5 py-0.5 rounded">
                              {f}
                            </span>
                          ))}
                          {(!p.contentFlags || p.contentFlags.length === 0) && (
                            <span className="text-slate-500">No claim flags detected</span>
                          )}
                        </div>
                        <textarea
                          value={rewriteDraft}
                          onChange={(e) => setRewriteDraft(e.target.value)}
                          placeholder="Approved storefront rewrite (raw source never modified)"
                          rows={3}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                        />
                        <div className="flex flex-wrap gap-1">
                          {(['APPROVE', 'REWRITE', 'BLOCK', 'DEFER'] as const).map((a) => (
                            <button
                              key={a}
                              onClick={() => handleContent(p.canonicalSlug, a)}
                              className="px-2 py-1 border border-slate-700 rounded text-[10px]"
                            >
                              {a}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeQueue === 'MEDIA' && (
                      <div className="space-y-2 text-xs">
                        {(p.mediaAssets || []).map((m) => (
                          <div key={m.id} className="border border-slate-800 rounded p-2 flex flex-wrap gap-3 items-start">
                            <div className="flex-1 min-w-[200px] font-mono text-[11px] space-y-0.5">
                              <div className="truncate">URL: {m.url}</div>
                              <div>hash: {m.hash || '—'}</div>
                              <div>dimensions: {m.dimensions || '—'}</div>
                              <div>source: {m.sourceRepository || '—'}</div>
                              <div>
                                status: {m.status} / {m.duplicateStatus} {m.isPrimary ? '· PRIMARY' : ''}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(['SET_PRIMARY', 'KEEP', 'REJECT', 'MARK_MISSING', 'DEFER'] as const).map((a) => (
                                <button
                                  key={a}
                                  onClick={() => handleMedia(p.canonicalSlug, m.id, a)}
                                  className="px-2 py-1 border border-slate-700 rounded text-[10px]"
                                >
                                  {a.replace(/_/g, ' ')}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {(!p.mediaAssets || p.mediaAssets.length === 0) && (
                          <p className="text-slate-500">No media records (raw records are never deleted).</p>
                        )}
                      </div>
                    )}

                    {activeQueue === 'TRANSLATIONS' && item.translations && (
                      <div className="text-xs space-y-3">
                        <div>
                          <div className="text-slate-500">English source</div>
                          <pre className="whitespace-pre-wrap bg-slate-950 border border-slate-800 rounded p-2 max-h-24 overflow-auto">
                            {item.translations.englishSource || '—'}
                          </pre>
                        </div>
                        {(['de', 'fr', 'es', 'it', 'nl'] as const).map((loc) => {
                          const field = item.translations.locales[loc];
                          const key = `${p.canonicalSlug}:${loc}`;
                          return (
                            <div key={loc} className="border border-slate-800 rounded p-2 space-y-1">
                              <div className="flex justify-between">
                                <span className="font-semibold uppercase">{loc}</span>
                                <span className="text-slate-400">{field?.status || 'MISSING'}</span>
                              </div>
                              <textarea
                                value={translationDrafts[key] ?? field?.value ?? ''}
                                onChange={(e) => handleTranslationDraft(p.canonicalSlug, loc, e.target.value)}
                                rows={2}
                                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1"
                                placeholder="Human translation draft — not auto-APPROVED"
                              />
                              <button
                                onClick={() => handleTranslationApprove(p.canonicalSlug, loc)}
                                className="px-2 py-1 border border-emerald-700 text-emerald-300 rounded text-[10px]"
                              >
                                APPROVE {loc.toUpperCase()}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeQueue === 'PUBLICATION_READINESS' && (
                      <div className="text-xs space-y-3">
                        <ChecklistBlock checklist={item.checklist || p.readinessChecklist} />
                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={previewLocale}
                            onChange={(e) => setPreviewLocale(e.target.value as LocaleCode)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          >
                            {['en', 'de', 'fr', 'es', 'it', 'nl'].map((l) => (
                              <option key={l} value={l}>
                                {l.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <select
                            value={previewCurrency}
                            onChange={(e) => setPreviewCurrency(e.target.value as 'EUR' | 'GBP')}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          >
                            <option value="EUR">EUR</option>
                            <option value="GBP">GBP</option>
                          </select>
                          <select
                            value={previewCountry}
                            onChange={(e) => setPreviewCountry(e.target.value)}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1"
                          >
                            {europeanCountries.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handlePreview(p.canonicalSlug)}
                            className="px-2 py-1 border border-slate-600 rounded flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> PREVIEW PRODUCT
                          </button>
                          <button
                            onClick={() => handleMarkReady(p.canonicalSlug)}
                            className="px-2 py-1 border border-emerald-700 text-emerald-300 rounded"
                          >
                            MARK READY
                          </button>
                          {currentRole === 'SUPER_ADMIN' && (
                            <button
                              onClick={() => handlePublish(p.canonicalSlug)}
                              className="px-2 py-1 border border-rose-700 text-rose-300 rounded"
                            >
                              SUPER_ADMIN FINAL PUBLISH
                            </button>
                          )}
                        </div>
                        {preview && preview.slug === p.canonicalSlug && (
                          <div className="border border-slate-700 bg-slate-950 rounded p-3 space-y-1">
                            <div className="text-emerald-300 font-semibold">Isolated preview (not live storefront)</div>
                            <div>{preview.name}</div>
                            <div className="text-slate-400">{preview.description}</div>
                            <div>
                              {preview.priceLabel} · {preview.locale}/{preview.currency} · {preview.countryCode}:{' '}
                              {preview.availability}
                            </div>
                            <div className="text-slate-500">{preview.customerMessage}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}

            {activeQueue === 'CATEGORIES' && (
              <div className="space-y-3">
                {categoryMappings
                  .filter((m) => m.approvalStatus === 'PENDING')
                  .map((m) => (
                    <article key={m.sourceCategorySlug} className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 text-xs space-y-2">
                      <div className="font-semibold text-white">{m.sourceCategoryName}</div>
                      <div className="font-mono text-slate-400">
                        source: {m.sourceCategorySlug} · target: {m.normalizedCategorySlug} ({m.normalizedCategoryName}) ·{' '}
                        {m.sourceType}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() =>
                            handleCategory(m.sourceCategorySlug, 'APPROVE', m.normalizedCategorySlug, m.normalizedCategoryName)
                          }
                          className="px-2 py-1 border border-emerald-700 rounded"
                        >
                          APPROVE
                        </button>
                        <button
                          onClick={() =>
                            handleCategory(m.sourceCategorySlug, 'CHANGE_TARGET', 'chocolate-bars', 'Mushroom Chocolate Bars')
                          }
                          className="px-2 py-1 border border-slate-700 rounded"
                        >
                          CHANGE TARGET
                        </button>
                        <button
                          onClick={() =>
                            handleCategory(
                              m.sourceCategorySlug,
                              'CREATE_NEW_CATEGORY',
                              `eu-${m.sourceCategorySlug}`,
                              `EU ${m.sourceCategoryName}`
                            )
                          }
                          className="px-2 py-1 border border-slate-700 rounded"
                        >
                          CREATE NEW CATEGORY
                        </button>
                        <button
                          onClick={() => handleCategory(m.sourceCategorySlug, 'DEFER')}
                          className="px-2 py-1 border border-slate-700 rounded"
                        >
                          DEFER
                        </button>
                      </div>
                    </article>
                  ))}
                {categoryMappings.filter((m) => m.approvalStatus === 'PENDING').length === 0 && (
                  <EmptyQueue label="pending category mappings" />
                )}
              </div>
            )}

            {activeQueue === 'REVIEWS' && (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <article key={r.id} className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 text-xs space-y-2">
                    <div className="flex justify-between gap-2">
                      <div>
                        <div className="font-semibold text-white">{r.productSlug}</div>
                        <div className="text-slate-400">
                          {r.authorName} · {r.rating}/5 · {r.date} · {r.sourceType} · verified:{' '}
                          {r.isVerifiedBuyer ? 'source-confirmed' : 'not fabricated'}
                        </div>
                      </div>
                      <span className="text-slate-400">{r.moderationStatus}</span>
                    </div>
                    <p className="text-slate-300">{r.body}</p>
                    <div className="text-slate-500 truncate">source: {r.sourceUrl || '—'}</div>
                    <div className="flex flex-wrap gap-1">
                      {(['APPROVE', 'REJECT', 'ARCHIVE', 'DEFER'] as const).map((a) => (
                        <button key={a} onClick={() => handleReview(r.id, a)} className="px-2 py-1 border border-slate-700 rounded">
                          {a}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
                {reviews.length === 0 && <EmptyQueue label="staged reviews" />}
              </div>
            )}

            {flavourGroups.length > 0 && activeQueue === 'DUPLICATE_CONFLICTS' && (
              <section className="border border-slate-800 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Package className="w-4 h-4" /> Flavour grouping
                </h3>
                {flavourGroups.map((g) => (
                  <div key={g.id} className="text-xs border border-slate-800 rounded p-3 space-y-2">
                    <div>
                      Parent: <strong>{g.parentName}</strong> ({g.parentSlug}) · {g.status}
                    </div>
                    <div className="text-slate-400">Candidates: {g.candidateSlugs.join(', ') || 'none'}</div>
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => handleFlavour(g.id, 'MERGE_INTO_VARIANTS')}
                        className="px-2 py-1 border border-emerald-700 rounded"
                      >
                        MERGE INTO VARIANTS
                      </button>
                      <button
                        onClick={() => handleFlavour(g.id, 'KEEP_AS_SEPARATE_PRODUCTS')}
                        className="px-2 py-1 border border-amber-700 rounded"
                      >
                        KEEP AS SEPARATE PRODUCTS
                      </button>
                      <button onClick={() => handleFlavour(g.id, 'DEFER')} className="px-2 py-1 border border-slate-700 rounded">
                        DEFER
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        )}

        {showAudit && (
          <section className="border border-slate-800 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Adjudication audit log
            </h3>
            <div className="max-h-80 overflow-y-auto text-[11px] font-mono space-y-1">
              {auditTrail.slice(0, 100).map((a) => (
                <div key={a.id} className="border-b border-slate-800/80 py-1 text-slate-400">
                  <span className="text-emerald-400">{a.action}</span> · {a.actor} · {a.timestamp} · {a.product} · {a.field} ·{' '}
                  {a.reason}
                </div>
              ))}
              {auditTrail.length === 0 && <div className="text-slate-500">No adjudication decisions yet.</div>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function EmptyQueue({ label }: { label: string }) {
  return <div className="text-sm text-slate-500 py-8 text-center border border-dashed border-slate-800 rounded-lg">No {label}.</div>;
}

function ItemHeader({
  item,
  selected,
  onSelect,
  onAssign,
  onAutosave,
}: {
  item: any;
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onAssign: () => void;
  onAutosave: () => void;
}) {
  const p = item.product as ReviewProductItem;
  const r = item.record;
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex items-start gap-2">
        <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} className="mt-1" />
        <div>
          <div className="font-semibold text-white text-sm">{p.name}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            {p.canonicalSlug} · status {r.status} · assigned {r.assignedTo || '—'} · last {r.lastDecision || '—'} ·{' '}
            {r.lastReviewedAt || 'pending'}
          </div>
        </div>
      </div>
      <div className="flex gap-1 text-[10px]">
        <button onClick={onAutosave} className="px-2 py-1 border border-slate-700 rounded flex items-center gap-1">
          <Save className="w-3 h-3" /> Autosave draft
        </button>
        <button onClick={onAssign} className="px-2 py-1 border border-slate-700 rounded">
          Assign
        </button>
      </div>
    </div>
  );
}

function ConflictSummaryBlock({ summary }: { summary: Record<string, string> }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-1 text-[10px] font-mono border border-slate-800 rounded p-2 bg-slate-950/40">
      {Object.entries(summary).map(([k, v]) => (
        <div key={k}>
          <span className="text-slate-500">{k.replace(/Status$/, '').toUpperCase()}</span>:{' '}
          <span className="text-slate-200">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ChecklistBlock({ checklist }: { checklist: ReviewProductItem['readinessChecklist'] | null }) {
  if (!checklist) return null;
  const gates: Array<[string, boolean]> = [
    ['valid product', checklist.validProduct],
    ['valid variant', checklist.validVariant],
    ['SKU', checklist.validSku],
    ['approved price', checklist.validPrice],
    ['category', checklist.validCategory],
    ['primary image', checklist.primaryImage],
    ['approved content', checklist.contentApproved],
    ['compliance approved', checklist.complianceApproved],
    ['country configured', checklist.countryAvailability],
    ['translation acceptable', checklist.translation],
    ['SEO reviewed', checklist.seo],
    ['inventory configured', checklist.inventory],
  ];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        {checklist.isReadyToPublish ? (
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> READY_FOR_PUBLICATION eligible
          </span>
        ) : (
          <span className="text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> NOT_READY
          </span>
        )}
      </div>
      <ul className="grid sm:grid-cols-2 gap-1 text-[11px]">
        {gates.map(([label, ok]) => (
          <li key={label} className="flex items-center gap-1">
            {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
            {label}
          </li>
        ))}
      </ul>
      {checklist.blockers?.length > 0 && (
        <div className="text-rose-300/90 text-[11px]">Blockers: {checklist.blockers.join('; ')}</div>
      )}
      <p className="text-slate-500">No “publish anyway” bypass. SUPER_ADMIN final publication is a separate confirmed step.</p>
    </div>
  );
}
