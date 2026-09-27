'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Shield, Sparkles, RotateCw, X, Eye, AlertTriangle } from 'lucide-react';
import {
  generateRecommendationsAction,
  getRecommendationDashboardAction,
  getRecommendationsAction,
  getRecommendationPreviewAction,
  acceptRecommendationAction,
  rejectRecommendationAction,
  deferRecommendationAction,
  editRecommendationAction,
} from '@/actions/catalogue-recommendations';
import {
  CatalogueDecisionRecommendation,
  DecisionPreview,
  RecommendationDashboard,
  RecommendationPriority,
  SafeBulkGroupKey,
} from '@/domain/catalog/CatalogueDecisionRecommendationService';
import { RoleName } from '@/types';

const AUTHORIZED: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];
const BULK_GROUPS: SafeBulkGroupKey[] = [
  'SOURCES_AGREE',
  'SAME_PRODUCT_CANDIDATE',
  'SAME_VARIANT_CANDIDATE',
  'NEEDS_PRICE',
  'NEEDS_TRANSLATION',
  'NEEDS_CONTENT_REVIEW',
];

export default function CatalogueRecommendationsPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';
  const currentRole: RoleName = 'SUPER_ADMIN';
  const actorName = `${currentRole.toLowerCase().replace('_', '.')}.officer@fusionbars.eu`;

  const [dashboard, setDashboard] = useState<RecommendationDashboard | null>(null);
  const [recommendations, setRecommendations] = useState<CatalogueDecisionRecommendation[]>([]);
  const [priority, setPriority] = useState<RecommendationPriority | ''>('');
  const [bulkGroup, setBulkGroup] = useState<SafeBulkGroupKey | ''>('');
  const [statusFilter, setStatusFilter] = useState<'SUGGESTED' | 'ACCEPTED' | 'REJECTED' | 'DEFERRED' | ''>('SUGGESTED');
  const [reason, setReason] = useState('Human-reviewed recommendation decision');
  const [preview, setPreview] = useState<DecisionPreview | null>(null);
  const [selected, setSelected] = useState<CatalogueDecisionRecommendation | null>(null);
  const [editValue, setEditValue] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<any>(null);

  const authorized = AUTHORIZED.includes(currentRole);

  useEffect(() => {
    if (authorized) loadAll();
  }, [currentRole, priority, bulkGroup, statusFilter]);

  async function loadAll() {
    setLoading(true);
    try {
      const dash = await getRecommendationDashboardAction(currentRole);
      if (!dash.success) {
        setStatusMessage({ type: 'error', text: dash.error || 'Unauthorized' });
        return;
      }
      setDashboard(dash.dashboard || null);
      setReport(dash.report || null);
      const list = await getRecommendationsAction({
        role: currentRole,
        status: statusFilter || undefined,
        priority: priority || undefined,
        bulkGroup: bulkGroup || undefined,
        limit: 50,
      });
      if (list.success) setRecommendations(list.recommendations || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    const res = await generateRecommendationsAction({ actor: actorName, actorRole: currentRole });
    if (res.success) {
      setStatusMessage({ type: 'success', text: `Generated ${res.count} recommendations (suggestions only).` });
      loadAll();
    } else setStatusMessage({ type: 'error', text: res.error || 'Generate failed' });
  }

  async function openPreview(rec: CatalogueDecisionRecommendation) {
    setSelected(rec);
    setEditValue(typeof rec.proposedValue === 'string' ? rec.proposedValue : JSON.stringify(rec.proposedValue ?? '', null, 2));
    const res = await getRecommendationPreviewAction({ id: rec.id, role: currentRole });
    if (res.success) setPreview(res.preview || null);
  }

  async function handleAccept(id: string) {
    const rec = recommendations.find((r) => r.id === id) || selected;
    if (rec?.highRisk && !reason.trim()) {
      alert('High-risk recommendations require a reason before ACCEPT.');
      return;
    }
    if (!preview || preview.recommendationId !== id) {
      await openPreview(rec!);
      setStatusMessage({
        type: 'info',
        text: 'Review BEFORE / AFTER / IMPACT below, then click ACCEPT again to CONFIRM DECISION.',
      });
      return;
    }
    const ok = window.confirm('CONFIRM DECISION: apply this recommendation through existing authorization gates? This does not publish.');
    if (!ok) return;
    const res = await acceptRecommendationAction({
      id,
      actor: actorName,
      actorRole: currentRole,
      reason,
      confirm: true,
    });
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Recommendation accepted via existing gates.' });
      setPreview(null);
      setSelected(null);
      loadAll();
    } else setStatusMessage({ type: 'error', text: res.error || 'Accept failed' });
  }

  async function handleReject(id: string) {
    if (!reason.trim()) {
      alert('Reject requires a reason.');
      return;
    }
    const res = await rejectRecommendationAction({ id, actor: actorName, actorRole: currentRole, reason });
    if (res.success) {
      setStatusMessage({ type: 'info', text: 'Recommendation rejected.' });
      loadAll();
    } else setStatusMessage({ type: 'error', text: res.error || 'Reject failed' });
  }

  async function handleDefer(id: string) {
    const res = await deferRecommendationAction({ id, actor: actorName, actorRole: currentRole, reason });
    if (res.success) {
      setStatusMessage({ type: 'info', text: 'Recommendation deferred.' });
      loadAll();
    } else setStatusMessage({ type: 'error', text: res.error || 'Defer failed' });
  }

  async function handleEdit(id: string) {
    let proposedValue: any = editValue;
    try {
      proposedValue = JSON.parse(editValue);
    } catch {
      proposedValue = editValue;
    }
    const res = await editRecommendationAction({
      id,
      actor: actorName,
      actorRole: currentRole,
      reason,
      proposedValue,
    });
    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Recommendation edited (still requires ACCEPT + CONFIRM).' });
      loadAll();
    } else setStatusMessage({ type: 'error', text: res.error || 'Edit failed' });
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
        <div className="border border-rose-800 bg-rose-950/40 p-6 rounded-lg text-sm max-w-md">
          Access denied for role {currentRole}.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Catalogue Decision Recommendations</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Suggestions only · Not decisions · Launch PAUSED · Confidence = source-data match strength, not legal probability
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="border border-slate-700 rounded px-2 py-1.5 text-sky-300">Super Admin</span>
            <button onClick={handleGenerate} className="px-3 py-1.5 border border-sky-700 bg-sky-950/40 rounded text-sky-200 flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5" /> Generate / refresh
            </button>
            <Link href={`/${locale}/admin/catalogue/adjudication`} className="px-3 py-1.5 border border-slate-700 rounded">
              Adjudication
            </Link>
            <Link href={`/${locale}/admin/catalogue/review`} className="px-3 py-1.5 border border-slate-700 rounded">
              Review Center
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
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

        {dashboard && (
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <Stat label="Total suggestions" value={dashboard.totalRecommendations} />
            <Stat label="Suggested" value={dashboard.suggested} />
            <Stat label="Accepted" value={dashboard.accepted} />
            <Stat label="Rejected" value={dashboard.rejected} />
            <Stat label="Deferred" value={dashboard.deferred} />
            <Stat label="Published (must stay 0)" value={report?.published ?? 0} />
          </section>
        )}

        {dashboard && (
          <section className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/40">
              <div className="font-semibold text-slate-300 mb-2">Priority (does not bypass approvals)</div>
              <div className="font-mono space-y-1 text-slate-400">
                <div>P0 Critical ambiguity: {dashboard.byPriority.P0}</div>
                <div>P1 High-impact conflict: {dashboard.byPriority.P1}</div>
                <div>P2 Normal review: {dashboard.byPriority.P2}</div>
                <div>P3 Low-impact cleanup: {dashboard.byPriority.P3}</div>
              </div>
            </div>
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-900/40">
              <div className="font-semibold text-slate-300 mb-2">Safe bulk inspection groups (no publish)</div>
              <div className="font-mono space-y-1 text-slate-400">
                {BULK_GROUPS.map((g) => (
                  <div key={g}>
                    {g.replace(/_/g, ' ')}: {dashboard.safeBulkGroups[g]}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="flex flex-wrap gap-2 text-xs items-center border border-slate-800 rounded-lg p-3 bg-slate-900/40">
          <span className="text-slate-400">Filter</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
            <option value="SUGGESTED">SUGGESTED</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="DEFERRED">DEFERRED</option>
            <option value="">ALL</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
            <option value="">All priorities</option>
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <select value={bulkGroup} onChange={(e) => setBulkGroup(e.target.value as any)} className="bg-slate-950 border border-slate-700 rounded px-2 py-1">
            <option value="">All bulk groups</option>
            {BULK_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={1}
            className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 rounded px-2 py-1"
            placeholder="Decision reason (required for high-risk ACCEPT / REJECT)"
          />
        </section>

        {loading ? (
          <div className="text-sm text-slate-500 py-12 text-center">Loading recommendations…</div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <article key={rec.id} className="border border-slate-800 rounded-lg bg-slate-900/50 p-4 space-y-2 text-xs">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      {rec.priority} · {rec.decisionType}
                      {rec.highRisk && (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> high-risk
                        </span>
                      )}
                    </div>
                    <div className="text-slate-400 font-mono mt-0.5">
                      {rec.productSlug || rec.entityId} · {rec.reviewStatus} · confidence {rec.confidence}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => openPreview(rec)} className="px-2 py-1 border border-slate-600 rounded flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Preview
                    </button>
                    <button onClick={() => handleAccept(rec.id)} className="px-2 py-1 border border-emerald-700 text-emerald-300 rounded">
                      ACCEPT
                    </button>
                    <button onClick={() => handleReject(rec.id)} className="px-2 py-1 border border-rose-700 text-rose-300 rounded">
                      REJECT
                    </button>
                    <button
                      onClick={() => {
                        openPreview(rec);
                      }}
                      className="px-2 py-1 border border-slate-600 rounded"
                    >
                      EDIT
                    </button>
                    <button onClick={() => handleDefer(rec.id)} className="px-2 py-1 border border-slate-600 rounded">
                      DEFER
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-slate-500">RECOMMENDATION</div>
                    <div className="text-sky-300 font-semibold">{rec.recommendation}</div>
                    <div className="text-slate-400 mt-1">Proposed action: {rec.proposedAction || '—'}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">EVIDENCE</div>
                    <div className="text-slate-300">{rec.evidence.summary}</div>
                    <div className="text-slate-500 mt-1">Reason code: {rec.evidence.reasonCode}</div>
                  </div>
                </div>

                {rec.conflicts && (
                  <div className="border border-slate-800 rounded p-2 font-mono text-[11px] bg-slate-950/50">
                    <div className="text-amber-300 mb-1">CONFLICTS</div>
                    <pre className="whitespace-pre-wrap text-slate-400">{JSON.stringify(rec.conflicts, null, 2)}</pre>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <div className="text-slate-500">CURRENT VALUE</div>
                    <pre className="whitespace-pre-wrap text-slate-300 max-h-24 overflow-auto">
                      {JSON.stringify(rec.currentValue, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-slate-500">PROPOSED VALUE</div>
                    <pre className="whitespace-pre-wrap text-slate-300 max-h-24 overflow-auto">
                      {JSON.stringify(rec.proposedValue, null, 2)}
                    </pre>
                  </div>
                </div>

                {rec.decisionType === 'PUBLICATION_READINESS' && rec.proposedValue?.gates && (
                  <div className="font-mono text-[11px] border border-slate-800 rounded p-2 space-y-0.5">
                    <div className="text-amber-300">PUBLICATION_STATUS: {rec.recommendation}</div>
                    {Object.entries(rec.proposedValue.gates).map(([k, v]) => (
                      <div key={k}>
                        {k.padEnd(14, '.')} {(v as string) === 'READY' ? 'READY' : 'BLOCKED'}
                      </div>
                    ))}
                  </div>
                )}

                {selected?.id === rec.id && (
                  <div className="border border-sky-800 bg-sky-950/20 rounded p-3 space-y-2">
                    <div className="font-semibold text-sky-300 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Decision preview (CONFIRM required)
                    </div>
                    {preview && (
                      <div className="grid md:grid-cols-2 gap-2 font-mono text-[11px]">
                        <div>
                          <div className="text-slate-500">BEFORE</div>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(preview.before, null, 2)}</pre>
                        </div>
                        <div>
                          <div className="text-slate-500">AFTER</div>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(preview.after, null, 2)}</pre>
                        </div>
                        <div className="md:col-span-2 text-slate-400 space-y-1">
                          <div>SOURCE IMPACT: {preview.sourceImpact}</div>
                          <div>STORE IMPACT: {preview.storeImpact}</div>
                          <div>PUBLICATION IMPACT: {preview.publicationImpact}</div>
                        </div>
                      </div>
                    )}
                    <label className="block text-slate-400">EDIT proposed value</label>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono"
                    />
                    <button onClick={() => handleEdit(rec.id)} className="px-2 py-1 border border-slate-600 rounded">
                      SAVE EDIT
                    </button>
                  </div>
                )}

                <details className="text-[11px] text-slate-500">
                  <summary>SOURCE RECORDS</summary>
                  <pre className="mt-1 whitespace-pre-wrap max-h-40 overflow-auto">{JSON.stringify(rec.sourceRecords, null, 2)}</pre>
                </details>
              </article>
            ))}
            {recommendations.length === 0 && (
              <div className="text-center text-slate-500 py-10 border border-dashed border-slate-800 rounded-lg">
                No recommendations for this filter. Click Generate / refresh.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
      <span className="text-slate-400 block">{label}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
    </div>
  );
}
