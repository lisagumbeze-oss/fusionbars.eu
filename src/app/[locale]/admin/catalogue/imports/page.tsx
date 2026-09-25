'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Layers,
  Database,
  GitBranch,
  Globe2,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  Search,
  Filter,
  Eye,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Split,
  Image as ImageIcon,
  MessageSquare,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { getMasterImportReportAction, executeRerunImportAction } from '@/actions/imports';
import { MasterImportResult } from '@/domain/import/MasterCatalogueImportService';
import { MatchedProductGroup, RawProductRecordDomain } from '@/domain/import/types';

export default function MasterCatalogueImportAdminPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [data, setData] = useState<MasterImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'overview' | 'comparison' | 'raw' | 'duplicates' | 'media' | 'reviews' | 'issues'
  >('overview');

  // Search & Filter State
  const [rawSourceFilter, setRawSourceFilter] = useState<string>('ALL');
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [selectedRawProduct, setSelectedRawProduct] = useState<RawProductRecordDomain | null>(null);

  // Comparison View State
  const [selectedGroupSlug, setSelectedGroupSlug] = useState<string>('fusion-bar-almond-crush');

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getMasterImportReportAction();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setErrorMsg(res.error || 'Failed to retrieve master catalogue import report.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Network communication error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRerun = async () => {
    setRerunning(true);
    try {
      const res = await executeRerunImportAction();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        alert(res.error || 'Rerun failed');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRerunning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <RotateCw className="w-8 h-8 animate-spin text-[#4A5D4E] mx-auto" />
        <p className="text-sm font-medium text-[#5C5852]">
          Loading Master Catalogue Import &amp; Source Preservation registry...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold text-[#121212]">Catalogue Import Error</h2>
        <p className="text-xs text-[#5C5852]">{errorMsg}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-[#4A5D4E] text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { counts, sources, batchIds, backupStatus, matchedGroups, rawProducts, rawMedia, rawReviews, issues } = data;
  const currentGroup = matchedGroups.find((g) => g.canonicalSlug === selectedGroupSlug) || matchedGroups[0];

  const filteredRawProducts = rawProducts.filter((p) => {
    if (rawSourceFilter !== 'ALL' && p.sourceType !== rawSourceFilter) return false;
    if (rawSearchQuery.trim()) {
      const q = rawSearchQuery.toLowerCase();
      return (
        p.sourceName.toLowerCase().includes(q) ||
        p.sourceSlug.toLowerCase().includes(q) ||
        p.recordCode.toLowerCase().includes(q) ||
        (p.sourceSku && p.sourceSku.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="border-b border-[#E5E3DD] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-[#5C5852] mb-1.5">
            <Link href={`/${locale}/admin`} className="hover:text-[#121212]">
              Admin Operations
            </Link>
            <span>/</span>
            <span className="text-[#121212] font-semibold">Master Catalogue Import</span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#121212]">
              Master Catalogue Import &amp; Source Preservation
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
              Source Preserving
            </span>
          </div>
          <p className="text-xs text-[#5C5852] mt-1 max-w-3xl">
            Multi-source catalogue union: Live Reference Website (fusionbarshop.com) &bull; GitHub Repo A &bull; GitHub Repo B. Raw copy and provenance strictly preserved; public store copy governed by European compliance gates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4A5D4E] hover:bg-[#3B4A3E] text-white text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${rerunning ? 'animate-spin' : ''}`} />
            {rerunning ? 'Re-running Pipeline...' : 'Re-run Import Engine'}
          </button>
        </div>
      </div>

      {/* Metric Cards (Required Statistics Part 26) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#5C5852] mb-1">
            <Globe2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Ref Website</span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#121212]">{counts.referenceWebsite.products}</div>
          <div className="text-[11px] text-[#8E8B85] mt-0.5">5 shop pages &bull; 4 cats</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#5C5852] mb-1">
            <GitBranch className="w-3.5 h-3.5 text-purple-600" />
            <span>Repository A</span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#121212]">{counts.repositoryA.productRecords}</div>
          <div className="text-[11px] text-[#8E8B85] mt-0.5">6 catalogue files</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#5C5852] mb-1">
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
            <span>Repository B</span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#121212]">{counts.repositoryB.productRecords}</div>
          <div className="text-[11px] text-[#8E8B85] mt-0.5">9 catalogue files</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#5C5852] mb-1">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Raw Records</span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#121212]">{counts.combined.rawRecords}</div>
          <div className="text-[11px] text-[#8E8B85] mt-0.5">Separate layer preserved</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#E5E3DD] shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-[#5C5852] mb-1">
            <Split className="w-3.5 h-3.5 text-amber-600" />
            <span>Matched Products</span>
          </div>
          <div className="text-2xl font-mono font-bold text-[#121212]">{counts.combined.matchedProducts}</div>
          <div className="text-[11px] text-[#8E8B85] mt-0.5">{counts.combined.conflicts} discrepancies</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 mb-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Preserved Base</span>
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-900">{counts.combined.normalizedProducts}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5">{counts.combined.variants} active variants</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[#E5E3DD] flex items-center gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#4A5D4E] text-[#121212]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Overview &amp; Sources
        </button>
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'comparison'
              ? 'border-[#4A5D4E] text-[#121212]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Side-by-Side Comparison ({matchedGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`px-4 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'raw'
              ? 'border-[#4A5D4E] text-[#121212]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Raw Source Records ({rawProducts.length})
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-4 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'duplicates'
              ? 'border-[#4A5D4E] text-[#121212]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Matching &amp; Merges ({counts.combined.matchedProducts})
        </button>
        <button
          onClick={() => setActiveTab('media')}
          className={`px-4 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'media'
              ? 'border-[#4A5D4E] text-[#121212]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Media Manifest ({rawMedia.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 font-semibold transition border-b-2 cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-[#4A5D4E] text-[#121212]'
              : 'border-transparent text-[#5C5852] hover:text-[#121212]'
          }`}
        >
          Reviews Staging ({rawReviews.length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`px-4 py-2.5 font-semibold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'issues'
              ? 'border-amber-500 text-amber-900'
              : 'border-transparent text-[#5C5852] hover:text-amber-800'
          }`}
        >
          <span>Conflicts &amp; Review</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
            {issues.length}
          </span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & SOURCES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sources.map((src) => (
              <div key={src.id} className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E5E3DD] pb-3">
                  <span className="font-mono text-xs font-bold text-[#4A5D4E] uppercase">{src.sourceType}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <h3 className="font-serif text-base font-bold text-[#121212]">{src.sourceName}</h3>
                <a
                  href={src.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-[#5C5852] hover:text-[#121212] flex items-center gap-1 break-all"
                >
                  {src.sourceUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <p className="text-xs text-[#5C5852] leading-relaxed">{src.description}</p>
                {src.gitCommitSha && (
                  <div className="pt-2 border-t border-[#E5E3DD]/60 flex items-center justify-between text-[11px] font-mono text-[#8E8B85]">
                    <span>Commit: {src.gitCommitSha.slice(0, 10)}</span>
                    <span>Branch: {src.gitBranch}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Backup & Governance Card */}
          <div className="bg-[#F0F4F1] rounded-2xl border border-[#4A5D4E]/20 p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4A5D4E] uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" /> Catalogue Backup &amp; Governance Verification
            </div>
            <p className="text-xs text-[#5C5852] leading-relaxed">
              Prior to import execution, an immutable catalogue snapshot was created at:
              <strong className="block font-mono text-[#121212] mt-1 break-all">{backupStatus.backupPath}</strong>
            </p>
            <div className="flex flex-wrap gap-6 text-xs text-[#121212] pt-1">
              <span>Original Products Preserved: <strong>{backupStatus.originalProductCount}</strong></span>
              <span>Original Variants Preserved: <strong>{backupStatus.originalVariantCount}</strong></span>
              <span>Publication Gate: <strong>Strictly Enforced (Zero auto-publication)</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT COMPARISON VIEW (Part 23) */}
      {activeTab === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#121212]">
                  Multi-Source Reconciliation Matrix
                </h3>
                <p className="text-xs text-[#5C5852]">
                  Field-by-field comparison across Reference Website, Repository A, Repository B, and Fusion EU Storefront.
                </p>
              </div>

              {/* Product Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5C5852]">Select Product:</span>
                <select
                  value={selectedGroupSlug}
                  onChange={(e) => setSelectedGroupSlug(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E3DD] bg-[#FBFBF9]"
                >
                  {matchedGroups.map((g) => (
                    <option key={g.canonicalSlug} value={g.canonicalSlug}>
                      {g.canonicalName} ({g.confidence})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Group Banner */}
            <div className="p-4 rounded-xl bg-[#FBFBF9] border border-[#E5E3DD] flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#8E8B85]">Duplicate Group ID: {currentGroup.duplicateGroupId}</span>
                <h4 className="text-base font-bold text-[#121212]">{currentGroup.canonicalName}</h4>
                <span className="text-xs text-[#4A5D4E] font-medium">Confidence: {currentGroup.confidence}</span>
              </div>
              <div className="text-right text-xs">
                <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] ${
                  currentGroup.reconciledProduct.status === 'PUBLISHED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  Status: {currentGroup.reconciledProduct.status}
                </span>
                <div className="text-[11px] text-[#8E8B85] mt-1">
                  Pricing: {currentGroup.reconciledProduct.pricingReviewRequired ? 'PRICING_REVIEW_REQUIRED' : 'APPROVED'}
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div className="overflow-x-auto border border-[#E5E3DD] rounded-xl">
              <table className="w-full text-left text-xs divide-y divide-[#E5E3DD]">
                <thead className="bg-[#FBFBF9] font-serif text-[#121212]">
                  <tr>
                    <th className="p-3 w-36">Field</th>
                    <th className="p-3">Reference Website</th>
                    <th className="p-3">Repository A</th>
                    <th className="p-3">Repository B</th>
                    <th className="p-3">Fusion EU Storefront</th>
                    <th className="p-3">Reconciled Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E3DD] bg-white font-sans">
                  {currentGroup.fieldComparisons.map((fc, i) => (
                    <tr key={i} className={fc.hasConflict ? 'bg-amber-50/30' : ''}>
                      <td className="p-3 font-semibold text-[#121212]">{fc.fieldName}</td>
                      <td className="p-3 font-mono text-[#5C5852]">{String(fc.referenceValue || '—')}</td>
                      <td className="p-3 font-mono text-[#5C5852]">{String(fc.repoAValue || '—')}</td>
                      <td className="p-3 font-mono text-[#5C5852]">{String(fc.repoBValue || '—')}</td>
                      <td className="p-3 font-mono text-[#4A5D4E] font-semibold">{String(fc.currentFusionEUValue || '—')}</td>
                      <td className="p-3">
                        <span className="font-semibold text-[#121212] block">{String(fc.reconciledValue)}</span>
                        <span className="text-[10px] text-[#8E8B85] font-mono">{fc.reconciliationRule}</span>
                        {fc.hasConflict && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Conflict Reconciled
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RAW SOURCE RECORDS (Part 2 & Part 10) */}
      {activeTab === 'raw' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Search className="w-4 h-4 text-[#8E8B85]" />
                <input
                  type="text"
                  placeholder="Search raw records by slug, name, SKU, ID..."
                  value={rawSearchQuery}
                  onChange={(e) => setRawSearchQuery(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E5E3DD] w-full sm:w-72"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5C5852]">Filter Source:</span>
                <select
                  value={rawSourceFilter}
                  onChange={(e) => setRawSourceFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E3DD] bg-[#FBFBF9]"
                >
                  <option value="ALL">All Sources ({rawProducts.length})</option>
                  <option value="REFERENCE_WEBSITE">Reference Website (50)</option>
                  <option value="GITHUB_REPOSITORY_A">Repository A (84)</option>
                  <option value="GITHUB_REPOSITORY_B">Repository B (84)</option>
                </select>
              </div>
            </div>

            <div className="text-xs text-[#8E8B85]">
              Showing {filteredRawProducts.length} raw records. Original source text and marketing claims strictly preserved in raw payload.
            </div>

            <div className="divide-y divide-[#E5E3DD] border border-[#E5E3DD] rounded-xl max-h-[600px] overflow-y-auto">
              {filteredRawProducts.map((p) => (
                <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#4A5D4E]">{p.recordCode}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-100 text-neutral-700">
                        {p.sourceType}
                      </span>
                      {p.sourcePrice != null && (
                        <span className="font-mono text-xs font-bold text-[#121212]">
                          ${p.sourcePrice} {p.sourceCurrency}
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-sm text-[#121212]">{p.sourceName}</div>
                    <div className="text-xs text-[#5C5852] font-mono">slug: {p.sourceSlug} &bull; cat: {p.sourceCategoryName}</div>
                  </div>

                  <button
                    onClick={() => setSelectedRawProduct(p)}
                    className="px-3 py-1.5 rounded-lg border border-[#E5E3DD] hover:bg-white text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Inspect Raw Payload
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Raw Payload Inspector Modal */}
          {selectedRawProduct && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-[#E5E3DD] flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#4A5D4E]">{selectedRawProduct.recordCode}</span>
                    <h3 className="font-serif text-lg font-bold text-[#121212]">{selectedRawProduct.sourceName}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedRawProduct(null)}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-[#5C5852]"
                  >
                    &times;
                  </button>
                </div>

                <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><strong>Source Hash:</strong> {selectedRawProduct.sourceHash.slice(0, 24)}...</div>
                    <div><strong>Captured At:</strong> {selectedRawProduct.capturedAt}</div>
                    <div><strong>Source File / URL:</strong> {selectedRawProduct.sourcePermalink || selectedRawProduct.sourceFilePath}</div>
                    <div><strong>Source Price:</strong> ${selectedRawProduct.sourcePrice} {selectedRawProduct.sourceCurrency}</div>
                  </div>

                  <div className="pt-2">
                    <strong className="block mb-1 font-sans text-xs">Full Untruncated Raw Source Payload:</strong>
                    <pre className="p-4 bg-neutral-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] leading-relaxed max-h-96">
                      {JSON.stringify(selectedRawProduct.rawPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: DUPLICATE MATCHING & MERGES (Part 11 & 12) */}
      {activeTab === 'duplicates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <h3 className="font-serif text-lg font-bold text-[#121212]">
              Deterministic Product Matching Engine
            </h3>
            <p className="text-xs text-[#5C5852]">
              Matches classified as EXACT_MATCH, HIGH_CONFIDENCE, POSSIBLE_MATCH, and UNIQUE. Possible matches require administrative confirmation before merging.
            </p>

            <div className="divide-y divide-[#E5E3DD] border border-[#E5E3DD] rounded-xl overflow-hidden">
              {matchedGroups.map((g) => (
                <div key={g.duplicateGroupId} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#121212]">{g.canonicalName}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        g.confidence === 'EXACT_MATCH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : g.confidence === 'HIGH_CONFIDENCE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-neutral-100 text-neutral-800'
                      }`}>
                        {g.confidence}
                      </span>
                    </div>
                    <div className="text-xs text-[#5C5852]">
                      Matched Sources: {g.sources.reference ? 'Reference Site, ' : ''}
                      {g.sources.repoA ? 'Repo A, ' : ''}
                      {g.sources.repoB ? 'Repo B' : ''}
                    </div>
                    <div className="text-[11px] text-[#8E8B85] font-mono">
                      Reason: {g.matchReasons.join(' &bull; ')}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedGroupSlug(g.canonicalSlug);
                      setActiveTab('comparison');
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[#E5E3DD] text-xs font-semibold hover:bg-neutral-50 flex items-center gap-1 cursor-pointer"
                  >
                    View Reconciliation <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: MEDIA MANIFEST & BROKEN IMAGES (Part 7) */}
      {activeTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#121212]">Media Import Manifest</h3>
                <p className="text-xs text-[#5C5852]">
                  {rawMedia.length} total media records catalogued across all sources. Broken and shared images tracked.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-1">
              {rawMedia.slice(0, 60).map((m) => (
                <div key={m.id} className="p-3 rounded-xl border border-[#E5E3DD] space-y-2 bg-[#FBFBF9]">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8E8B85]">
                    <span>{m.sourceType}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      m.dedupStatus === 'BROKEN' ? 'bg-red-100 text-red-800' : 'bg-neutral-200 text-neutral-800'
                    }`}>
                      {m.dedupStatus}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-[#121212] truncate">{m.filename}</div>
                  <div className="text-[11px] text-[#5C5852] truncate font-mono">{m.originalUrl}</div>
                  <div className="text-[10px] text-[#8E8B85]">Shared across {m.sharedProductCount} products</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REVIEWS STAGING (Part 17) */}
      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <h3 className="font-serif text-lg font-bold text-[#121212]">
              Customer Reviews Staging ({rawReviews.length})
            </h3>
            <p className="text-xs text-[#5C5852]">
              Authentic customer reviews extracted from the reference site. Reviews remain in staging until explicitly approved for publication.
            </p>

            <div className="divide-y divide-[#E5E3DD] border border-[#E5E3DD] rounded-xl max-h-[600px] overflow-y-auto">
              {rawReviews.map((r) => (
                <div key={r.id} className="p-4 space-y-2 hover:bg-neutral-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-[#121212]">{r.authorName}</strong>
                      <span className="text-[11px] text-amber-600 font-bold">★ {r.rating} / 5</span>
                      {r.isVerifiedBuyer && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          VERIFIED
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#8E8B85]">{r.reviewDate}</span>
                  </div>
                  <p className="text-xs text-[#5C5852] leading-relaxed italic">"{r.body}"</p>
                  <div className="text-[10px] text-[#8E8B85] font-mono">
                    Product ID: {r.rawProductId} &bull; Status: {r.reviewStatus}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: CONFLICTS & REVIEWS REQUIRED (Part 13 & 29) */}
      {activeTab === 'issues' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#E5E3DD] p-6 space-y-4 shadow-xs">
            <h3 className="font-serif text-lg font-bold text-[#121212]">
              Audit Issues, Discrepancies &amp; Pricing Gates ({issues.length})
            </h3>
            <p className="text-xs text-[#5C5852]">
              Unresolved cross-source conflicts, pricing review triggers, and compliance notices.
            </p>

            <div className="divide-y divide-[#E5E3DD] border border-[#E5E3DD] rounded-xl max-h-[600px] overflow-y-auto">
              {issues.map((iss) => (
                <div key={iss.id} className="p-4 space-y-1.5 hover:bg-neutral-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        iss.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800'
                          : iss.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {iss.issueType}
                      </span>
                      {iss.rawProductRecordCode && (
                        <span className="font-mono text-xs font-bold text-[#4A5D4E]">
                          {iss.rawProductRecordCode}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[#8E8B85]">Severity: {iss.severity}</span>
                  </div>
                  <p className="text-xs text-[#121212]">{iss.message}</p>
                  {iss.sourceValue && (
                    <div className="text-[11px] font-mono text-[#5C5852]">
                      Source Value: {iss.sourceValue}
                      {iss.conflictingValue ? ` vs ${iss.conflictingValue}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
