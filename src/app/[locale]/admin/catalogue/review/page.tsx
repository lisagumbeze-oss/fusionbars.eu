'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield,
  Layers,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Eye,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Image as ImageIcon,
  MessageSquare,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  Tag,
  Globe2,
  Lock,
  Unlock,
  Check,
  X,
  FileCheck2,
  FileText,
  Sliders,
  History,
  Building2,
  Package,
  AlertCircle,
  ChevronDown,
  Edit3,
} from 'lucide-react';
import {
  getCatalogueReviewDashboardAction,
  getFilteredReviewProductsAction,
  getProductReviewDetailAction,
  approveFieldDecisionAction,
  decideVariantStructureAction,
  approveWholesalePricingAction,
  approveCollaborationAction,
  approveCategoryMappingAction,
  moderateContentAction,
  updateComplianceClassificationAction,
  updateCountryAvailabilityAction,
  moderateMediaAction,
  moderateReviewAction,
  approveSeoAction,
  publishProductAction,
  blockProductAction,
  executeBulkReviewAction,
  getAuditTrailAction,
} from '@/actions/catalogue-review';
import {
  ReviewDashboardStats,
  ReviewProductItem,
  ReviewQueueFilter,
  ReviewSortField,
  CategoryMappingDecision,
  ReviewModerationItem,
  AuditRecord,
  FieldApprovalChoice,
  VariantStructureOption,
  ContentModerationAction,
} from '@/domain/catalog/CatalogueReviewService';
import { ComplianceClassification, CountryAvailabilityStatus, RoleName } from '@/types';

export default function CatalogueReviewCenterPage() {
  const params = useParams();
  const locale = (params.locale as string) || 'en';

  // Role Gate & Actor
  const [currentRole, setCurrentRole] = useState<RoleName>('SUPER_ADMIN');
  const actorName = `${currentRole.toLowerCase().replace('_', '.')}.officer@fusionbars.eu`;

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<
    | 'queue'
    | 'flavours'
    | 'wholesale'
    | 'collaborations'
    | 'categories'
    | 'content'
    | 'compliance'
    | 'media'
    | 'reviews'
    | 'seo'
    | 'audit'
  >('queue');

  // Stats & Core Data
  const [stats, setStats] = useState<ReviewDashboardStats | null>(null);
  const [products, setProducts] = useState<ReviewProductItem[]>([]);
  const [categoryMappings, setCategoryMappings] = useState<CategoryMappingDecision[]>([]);
  const [reviews, setReviews] = useState<ReviewModerationItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Queue Controls
  const [filter, setFilter] = useState<ReviewQueueFilter>('ALL');
  const [sortField, setSortField] = useState<ReviewSortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk Selection
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);

  // Product Detail Modal State
  const [detailProduct, setDetailProduct] = useState<ReviewProductItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Field Decision Drafts
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [fieldReason, setFieldReason] = useState('Reconciled based on European food compliance & verified source provenance');

  // Wholesale Pricing Drafts
  const [wholesaleEurDrafts, setWholesaleEurDrafts] = useState<Record<string, number>>({});
  const [wholesaleGbpDrafts, setWholesaleGbpDrafts] = useState<Record<string, number>>({});

  // Content Rewrite Draft
  const [rewriteContentDraft, setRewriteContentDraft] = useState('');
  const [seoDrafts, setSeoDrafts] = useState<Record<string, { title: string; description: string }>>({});

  // Initial Load
  useEffect(() => {
    loadDashboard();
    loadProducts();
  }, [currentRole]);

  // Reload products when filter/sort/search changes
  useEffect(() => {
    loadProducts();
  }, [filter, sortField, sortOrder, searchQuery]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await getCatalogueReviewDashboardAction(currentRole);
      if (res.success && res.stats) {
        setStats(res.stats);
        if (res.categoryMappings) setCategoryMappings(res.categoryMappings);
        if (res.reviews) setReviews(res.reviews);
      } else if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      }

      const auditRes = await getAuditTrailAction(currentRole);
      if (auditRes.success && auditRes.auditTrail) {
        setAuditTrail(auditRes.auditTrail);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const res = await getFilteredReviewProductsAction({
        filter,
        sortField,
        sortOrder,
        searchQuery,
        role: currentRole,
      });
      if (res.success && res.products) {
        setProducts(res.products);
      } else if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
    }
  }

  async function openProductDetail(slugOrId: string) {
    setDetailLoading(true);
    try {
      const res = await getProductReviewDetailAction({ slugOrId, role: currentRole });
      if (res.success && res.product) {
        setDetailProduct(res.product);
        setRewriteContentDraft(res.product.approvedStoreContent || res.product.description);
      } else {
        alert(res.error || 'Failed to load product detail');
      }
    } finally {
      setDetailLoading(false);
    }
  }

  // Field Approval Handler
  async function handleFieldApproval(fieldName: string, choice: FieldApprovalChoice) {
    if (!detailProduct) return;
    const customVal = customFieldValues[fieldName];

    const res = await approveFieldDecisionAction({
      productSlug: detailProduct.canonicalSlug,
      fieldName,
      choice,
      customValue: choice === 'CUSTOM_APPROVED_VALUE' ? customVal : undefined,
      actor: actorName,
      actorRole: currentRole,
      reason: fieldReason,
    });

    if (res.success && res.product) {
      setDetailProduct(res.product);
      setStatusMessage({ type: 'success', text: `Field '${fieldName}' updated: ${choice}` });
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Failed to approve field');
    }
  }

  // Variant Structure Decision
  async function handleVariantStructureDecision(
    productSlug: string,
    decision: VariantStructureOption,
    parentTargetSlug?: string
  ) {
    const reason =
      decision === 'PARENT_WITH_VARIANTS'
        ? `Consolidate standalone flavour into parent product as a flavour variant`
        : `Approved keeping standalone as individual product page`;

    const res = await decideVariantStructureAction({
      productSlug,
      decision,
      parentTargetSlug,
      actor: actorName,
      actorRole: currentRole,
      reason,
    });

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Product structure updated for ${productSlug}: ${decision === 'PARENT_WITH_VARIANTS' ? 'Merged as Variant' : 'Retained as Standalone'}`,
      });
      loadDashboard();
      loadProducts();
      if (detailProduct?.canonicalSlug === productSlug && res.product) {
        setDetailProduct(res.product);
      }
    } else {
      alert(res.error || 'Failed to update variant structure');
    }
  }

  // Wholesale Pricing Approval
  async function handleApproveWholesalePrice(productSlug: string) {
    const eurPrice = wholesaleEurDrafts[productSlug];
    const gbpPrice = wholesaleGbpDrafts[productSlug];

    if (!eurPrice || eurPrice <= 0) {
      alert('Please enter an approved EUR price greater than €0.00');
      return;
    }

    const res = await approveWholesalePricingAction({
      productSlug,
      approvedPriceEUR: Math.round(eurPrice * 100),
      approvedPriceGBP: gbpPrice ? Math.round(gbpPrice * 100) : undefined,
      actor: actorName,
      actorRole: currentRole,
      reason: 'Wholesale commercial pricing cleared by Finance / Super Admin',
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Wholesale EUR pricing approved for ${productSlug}` });
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Failed to approve wholesale price');
    }
  }

  // Collaboration European Sale Approval
  async function handleCollaborationApproval(
    productSlug: string,
    authorized: boolean,
    classification: ComplianceClassification
  ) {
    const res = await approveCollaborationAction({
      productSlug,
      authorizedForEuropeanSale: authorized,
      complianceClassification: classification,
      actor: actorName,
      actorRole: currentRole,
      reason: authorized
        ? 'Collaboration line cleared for European sale after compliance audit'
        : 'Collaboration line blocked from European distribution',
    });

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Collaboration line ${productSlug}: ${authorized ? 'Authorized for European Sale' : 'Blocked from Sale'}`,
      });
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Failed to update collaboration');
    }
  }

  // Category Mapping Approval
  async function handleCategoryApproval(sourceSlug: string, targetSlug: string, targetName: string) {
    const res = await approveCategoryMappingAction({
      sourceCategorySlug: sourceSlug,
      targetCategorySlug: targetSlug,
      targetCategoryName: targetName,
      actor: actorName,
      actorRole: currentRole,
      reason: 'Standardized source category into European store hierarchy',
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Category mapping approved: ${sourceSlug} -> ${targetName}` });
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Failed to approve category mapping');
    }
  }

  // Content Moderation
  async function handleContentModeration(productSlug: string, action: ContentModerationAction) {
    const res = await moderateContentAction({
      productSlug,
      action,
      rewrittenContent: action === 'REWRITE' ? rewriteContentDraft : undefined,
      actor: actorName,
      actorRole: currentRole,
      reason: `Content moderation decision: ${action}`,
    });

    if (res.success && res.product) {
      setStatusMessage({ type: 'success', text: `Content moderation status: ${action}` });
      if (detailProduct?.canonicalSlug === productSlug) {
        setDetailProduct(res.product);
      }
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Content moderation failed');
    }
  }

  // Country Availability Matrix
  async function handleCountryAvailability(productSlug: string, countryCode: string, status: CountryAvailabilityStatus) {
    const res = await updateCountryAvailabilityAction({
      productSlug,
      countryCode,
      status,
      actor: actorName,
      actorRole: currentRole,
      reason: `Configured destination legal rule for ${countryCode}: ${status}`,
    });

    if (res.success && res.product) {
      setStatusMessage({ type: 'success', text: `${countryCode} availability set to ${status}` });
      if (detailProduct?.canonicalSlug === productSlug) {
        setDetailProduct(res.product);
      }
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Country update failed');
    }
  }

  // Media Moderation
  async function handleMediaAction(productSlug: string, mediaId: string, action: 'SET_PRIMARY' | 'REMOVE' | 'KEEP' | 'FLAG_BROKEN') {
    const res = await moderateMediaAction({
      productSlug,
      mediaId,
      action,
      actor: actorName,
      actorRole: currentRole,
      reason: `Media action ${action} on asset ${mediaId}`,
    });

    if (res.success && res.product) {
      setStatusMessage({ type: 'success', text: `Media action ${action} applied.` });
      if (detailProduct?.canonicalSlug === productSlug) {
        setDetailProduct(res.product);
      }
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Media action failed');
    }
  }

  // Review Moderation
  async function handleReviewModeration(reviewId: string, action: 'APPROVE' | 'REJECT' | 'ARCHIVE') {
    const res = await moderateReviewAction({
      reviewId,
      action,
      actor: actorName,
      actorRole: currentRole,
      reason: `Review moderation action: ${action}`,
    });

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Customer review ${action.toLowerCase()}d` });
      loadDashboard();
    } else {
      alert(res.error || 'Review moderation failed');
    }
  }

  // Publish Product Gate
  async function handlePublishProduct(productSlug: string) {
    const res = await publishProductAction({
      productSlug,
      actor: actorName,
      actorRole: currentRole,
      reason: 'Administrator validated 12-point publication checklist and cleared item for European commerce',
    });

    if (res.success && res.product) {
      setStatusMessage({ type: 'success', text: `Product ${productSlug} successfully PUBLISHED to European catalogue!` });
      if (detailProduct?.canonicalSlug === productSlug) {
        setDetailProduct(res.product);
      }
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Cannot publish product');
    }
  }

  // Block Product Gate
  async function handleBlockProduct(productSlug: string) {
    const res = await blockProductAction({
      productSlug,
      actor: actorName,
      actorRole: currentRole,
      reason: 'Administrative block placed on product due to European compliance gate',
    });

    if (res.success && res.product) {
      setStatusMessage({ type: 'info', text: `Product ${productSlug} marked as BLOCKED.` });
      if (detailProduct?.canonicalSlug === productSlug) {
        setDetailProduct(res.product);
      }
      loadDashboard();
      loadProducts();
    } else {
      alert(res.error || 'Failed to block product');
    }
  }

  // Safe Bulk Operation
  async function handleBulkAction(
    action:
      | 'APPROVE_CONTENT'
      | 'APPROVE_MEDIA'
      | 'APPROVE_CATEGORY_MAPPINGS'
      | 'ASSIGN_CATEGORY'
      | 'ASSIGN_COMPLIANCE'
      | 'SET_COUNTRY_AVAILABILITY'
      | 'PUBLISH_SELECTED'
  ) {
    if (selectedSlugs.length === 0) {
      alert('Please select at least one product using the checkboxes.');
      return;
    }

    const res = await executeBulkReviewAction({
      productSlugs: selectedSlugs,
      action,
      complianceClassification: action === 'ASSIGN_COMPLIANCE' ? 'APPROVED' : undefined,
      targetCategorySlug: action === 'ASSIGN_CATEGORY' ? 'chocolate-bars' : undefined,
      targetCategoryName: action === 'ASSIGN_CATEGORY' ? 'Mushroom Chocolate Bars' : undefined,
      countryCode: action === 'SET_COUNTRY_AVAILABILITY' ? 'NL' : undefined,
      countryStatus: action === 'SET_COUNTRY_AVAILABILITY' ? 'AVAILABLE' : undefined,
      actor: actorName,
      actorRole: currentRole,
      reason: `Bulk operation ${action} executed by ${currentRole}`,
    });

    if (res.success) {
      setStatusMessage({
        type: 'success',
        text: `Bulk action '${action}' completed for ${res.affectedCount} product(s).`,
      });
      setSelectedSlugs([]);
      loadDashboard();
      loadProducts();
    } else {
      const errs = res.errors?.join('\n') || 'Bulk action failed';
      alert(`Bulk Action Result:\n${errs}`);
    }
  }

  // Filtered product lists for specialized tabs
  const wholesaleProducts = useMemo(() => {
    return products.filter((p) => p.isWholesale);
  }, [products]);

  const flavourProducts = useMemo(() => {
    return products.filter((p) => p.isFlavourStandalone);
  }, [products]);

  const collaborationProducts = useMemo(() => {
    return products.filter((p) => p.isCollaboration);
  }, [products]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header & Role Gate */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Catalogue Review Center</h1>
                <span className="text-xs text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded">
                  Governance Desk
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>FusionBars EU</span>
                <span aria-hidden="true">·</span>
                <span>Master Import Governance</span>
                <span aria-hidden="true">·</span>
                <span>Launch Status: PAUSED</span>
              </div>
            </div>
          </div>

          {/* Role Switcher & Navigation Links */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
              <span className="text-slate-400">Role:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as RoleName)}
                className="bg-transparent text-amber-400 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="SUPER_ADMIN" className="bg-slate-900 text-slate-100">SUPER_ADMIN (Full Clearance)</option>
                <option value="CATALOG_MANAGER" className="bg-slate-900 text-slate-100">CATALOG_MANAGER</option>
                <option value="CONTENT_MANAGER" className="bg-slate-900 text-slate-100">CONTENT_MANAGER</option>
                <option value="COMPLIANCE_MANAGER" className="bg-slate-900 text-slate-100">COMPLIANCE_MANAGER</option>
                <option value="ORDER_MANAGER" className="bg-slate-900 text-slate-100">ORDER_MANAGER (Denied)</option>
              </select>
            </div>

            <Link
              href={`/${locale}/admin/catalogue/adjudication`}
              className="text-xs text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg border border-emerald-800 bg-emerald-950/40 hover:bg-emerald-900/40 transition"
            >
              Adjudication Workspace
            </Link>

            <Link
              href={`/${locale}/admin/catalogue/recommendations`}
              className="text-xs text-sky-300 hover:text-white px-3 py-1.5 rounded-lg border border-sky-800 bg-sky-950/40 hover:bg-sky-900/40 transition"
            >
              Recommendations
            </Link>

            <Link
              href={`/${locale}/admin/catalogue/review-workspace`}
              className="text-xs text-violet-300 hover:text-white px-3 py-1.5 rounded-lg border border-violet-800 bg-violet-950/40 hover:bg-violet-900/40 transition"
            >
              Guided Review
            </Link>

            <Link
              href={`/${locale}/admin/catalogue/imports`}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition"
            >
              Raw Import Pipeline
            </Link>

            <Link
              href={`/${locale}/admin`}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 transition"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-6">
        {/* Status Notification */}
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

        {/* 1. TOP METRICS & STATS BAR (Dynamic Calculations) */}
        {stats && (
          <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Total Imported</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-white">{stats.totalImportedUnique}</span>
                <span className="text-xs text-slate-500">/ {stats.totalRawRecords} raw</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Ready for Review</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-400">{stats.readyForReview}</span>
                <span className="text-xs text-slate-500">pending</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Needs Review</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-300">{stats.needsReview}</span>
                <span className="text-xs text-slate-500">items</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Conflicts</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-rose-400">{stats.conflicts}</span>
                <span className="text-xs text-slate-500">field diffs</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Possible Matches</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-blue-400">{stats.possibleMatches}</span>
                <span className="text-xs text-slate-500">candidate pairs</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Unresolved Duplicates</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-500">{stats.unresolvedDuplicates}</span>
                <span className="text-xs text-slate-500">blocked</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Pricing Review</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-purple-400">{stats.pricingReview}</span>
                <span className="text-xs text-slate-500">unpriced</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Compliance Review</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-amber-400">{stats.complianceReview}</span>
                <span className="text-xs text-slate-500">unapproved</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Media Issues</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-cyan-400">{stats.mediaIssues}</span>
                <span className="text-xs text-slate-500">flagged</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Translation Issues</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-300">{stats.translationIssues}</span>
                <span className="text-xs text-slate-500">missing</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Ready to Publish</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-400">{stats.readyForPublication}</span>
                <span className="text-xs text-slate-500">12/12 gates</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs text-slate-400 block">Published</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-500">{stats.published}</span>
                <span className="text-xs text-slate-500">live</span>
              </div>
            </div>
          </section>
        )}

        {/* View Navigation Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'queue' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Review Queue ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('flavours')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'flavours' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Flavour / Variant Structure ({flavourProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('wholesale')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'wholesale' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Wholesale Pricing Queue ({wholesaleProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('collaborations')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'collaborations' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Collaborations ({collaborationProducts.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'categories' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Category Mappings ({categoryMappings.length})
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'content' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Content & Claims
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'compliance' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Country Availability Matrix
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'media' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Media Assets
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'reviews' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Staged Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'seo' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            SEO Clearance
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
              activeTab === 'audit' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Audit Trail ({auditTrail.length})
          </button>
        </div>

        {/* TAB 1: PRIMARY REVIEW QUEUE */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* Search & Sort Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search product name, SKU, slug, source ID, URL, brand, category, variant, status..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-md pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Sort by:</span>
                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as ReviewSortField)}
                    className="bg-slate-950 border border-slate-700 text-xs text-white rounded-md px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="name">Product Name</option>
                    <option value="source">Source</option>
                    <option value="category">Category</option>
                    <option value="issueCount">Issue Count</option>
                    <option value="lastImported">Last Imported</option>
                    <option value="reviewStatus">Review Status</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="bg-slate-950 border border-slate-700 text-xs text-slate-300 hover:text-white px-2 py-1.5 rounded-md"
                  >
                    {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
                  </button>
                </div>
              </div>

              {/* 13 Required Filters Segmented Row */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800 text-xs">
                <span className="text-slate-500 mr-1">Filter:</span>
                {(
                  [
                    'ALL',
                    'NEW',
                    'UPDATED',
                    'POSSIBLE_MATCH',
                    'UNRESOLVED_DUPLICATE',
                    'PRICE_REVIEW',
                    'CATEGORY_REVIEW',
                    'CONTENT_REVIEW',
                    'COMPLIANCE_REVIEW',
                    'MEDIA_REVIEW',
                    'TRANSLATION_REVIEW',
                    'READY_TO_PUBLISH',
                    'BLOCKED',
                  ] as ReviewQueueFilter[]
                ).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      filter === f
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {f.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Safe Bulk Operations Bar */}
            {selectedSlugs.length > 0 && (
              <div className="bg-slate-900 border border-amber-500/40 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-amber-400">{selectedSlugs.length} product(s) selected</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <button onClick={() => setSelectedSlugs([])} className="text-slate-400 hover:text-white underline">
                    Deselect All
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400">Bulk Actions:</span>
                  <button
                    onClick={() => handleBulkAction('APPROVE_CONTENT')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                  >
                    Approve Content
                  </button>
                  <button
                    onClick={() => handleBulkAction('APPROVE_MEDIA')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                  >
                    Approve Media
                  </button>
                  <button
                    onClick={() => handleBulkAction('ASSIGN_COMPLIANCE')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                  >
                    Set Compliance APPROVED
                  </button>
                  <button
                    onClick={() => handleBulkAction('ASSIGN_CATEGORY')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                  >
                    Assign Category
                  </button>
                  <button
                    onClick={() => handleBulkAction('SET_COUNTRY_AVAILABILITY')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                  >
                    Set NL Available
                  </button>
                  <button
                    onClick={() => handleBulkAction('APPROVE_CATEGORY_MAPPINGS')}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded"
                  >
                    Approve Category Mappings
                  </button>
                  <button
                    onClick={() => handleBulkAction('PUBLISH_SELECTED')}
                    className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 px-2.5 py-1 rounded font-medium"
                  >
                    Publish (Must Pass All 12 Gates)
                  </button>
                </div>
              </div>
            )}

            {/* Products Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedSlugs.length > 0 && selectedSlugs.length === products.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedSlugs(products.map((p) => p.canonicalSlug));
                            else setSelectedSlugs([]);
                          }}
                          className="rounded bg-slate-800 border-slate-700"
                        />
                      </th>
                      <th className="p-3">Product Name & SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Sources</th>
                      <th className="p-3">Pricing (USD / EUR / GBP)</th>
                      <th className="p-3">Compliance</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Readiness</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          No products found matching active filter '{filter}' or search '{searchQuery}'.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const isSelected = selectedSlugs.includes(p.canonicalSlug);
                        const hasConflicts = p.fieldComparisons.some((c) => c.hasConflict);

                        return (
                          <tr
                            key={p.canonicalSlug}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isSelected ? 'bg-amber-950/20' : ''
                            }`}
                          >
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSlugs([...selectedSlugs, p.canonicalSlug]);
                                  } else {
                                    setSelectedSlugs(selectedSlugs.filter((s) => s !== p.canonicalSlug));
                                  }
                                }}
                                className="rounded bg-slate-800 border-slate-700"
                              />
                            </td>

                            <td className="p-3">
                              <div className="font-semibold text-white hover:text-amber-400 cursor-pointer" onClick={() => openProductDetail(p.canonicalSlug)}>
                                {p.name}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span>{p.sku}</span>
                                <span aria-hidden="true">·</span>
                                <span>{p.canonicalSlug}</span>
                                {hasConflicts && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="text-rose-400 font-medium">{p.issueCount} conflict(s)</span>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="p-3">
                              <span className="text-slate-300">{p.categoryName}</span>
                            </td>

                            <td className="p-3">
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                {p.sources.reference && <span title="Reference Crawl">Ref</span>}
                                {p.sources.reference && p.sources.repoA && <span>+</span>}
                                {p.sources.repoA && <span title="Repository A">RepoA</span>}
                                {p.sources.repoA && p.sources.repoB && <span>+</span>}
                                {p.sources.repoB && <span title="Repository B">RepoB</span>}
                              </div>
                            </td>

                            <td className="p-3">
                              <div className="text-[11px]">
                                <span className="text-slate-400">${p.sourcePriceUSD || 40} USD</span>
                                <span className="mx-1 text-slate-600">→</span>
                                {p.priceEUR ? (
                                  <span className="text-emerald-400 font-medium">€{(p.priceEUR / 100).toFixed(2)}</span>
                                ) : (
                                  <span className="text-rose-400 font-semibold">PRICING REQUIRED</span>
                                )}
                              </div>
                            </td>

                            <td className="p-3">
                              <span
                                className={`text-[11px] font-medium ${
                                  p.complianceClassification === 'APPROVED'
                                    ? 'text-emerald-400'
                                    : p.complianceClassification === 'BLOCKED'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {p.complianceClassification}
                              </span>
                            </td>

                            <td className="p-3">
                              <span
                                className={`text-[11px] ${
                                  p.publicationStatus === 'PUBLISHED'
                                    ? 'text-emerald-400 font-bold'
                                    : p.publicationStatus === 'BLOCKED'
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {p.publicationStatus}
                              </span>
                            </td>

                            <td className="p-3">
                              {p.readinessChecklist.isReadyToPublish ? (
                                <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
                                  <Check className="w-3.5 h-3.5" /> 12/12 Ready
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]" title={p.readinessChecklist.blockers.join('; ')}>
                                  {p.readinessChecklist.blockers.length} gate(s) pending
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              <button
                                onClick={() => openProductDetail(p.canonicalSlug)}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded text-xs font-medium border border-slate-700 transition"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: FLAVOUR / VARIANT STRUCTURE REVIEW */}
        {activeTab === 'flavours' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
              <h2 className="text-base font-bold text-white">Flavour / Variant Structure Decision Interface</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The master catalogue import detected standalone flavour records (such as Almond Crush, Birthday Cake,
                Cookie Dough, Horchata, Ferrari Rocher, Matcha). By governance policy, these records are NOT automatically
                merged. The administrator must explicitly choose between:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="border border-slate-800 bg-slate-950 p-3 rounded">
                  <span className="font-semibold text-amber-400 block mb-1">OPTION A: Parent Product + Variants</span>
                  <p className="text-slate-400">
                    Consolidates the standalone record into the master European parent (e.g., Fusion Artisan Mushroom Chocolate Bar 6g)
                    as a variant choice, while retaining full original source mapping and source record provenance.
                  </p>
                </div>
                <div className="border border-slate-800 bg-slate-950 p-3 rounded">
                  <span className="font-semibold text-blue-400 block mb-1">OPTION B: Individual Product Pages</span>
                  <p className="text-slate-400">
                    Maintains the record as a standalone, individual product page with its own independent URL, SKU, and presentation.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {flavourProducts.map((p) => (
                <div key={p.canonicalSlug} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{p.name}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>Candidate Slug: {p.canonicalSlug}</span>
                        <span aria-hidden="true">·</span>
                        <span>SKU: {p.sku}</span>
                        <span aria-hidden="true">·</span>
                        <span>Current Structure: {p.variantStructureDecision || 'NOT_DECIDED'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVariantStructureDecision(p.canonicalSlug, 'PARENT_WITH_VARIANTS')}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                          p.variantStructureDecision === 'PARENT_WITH_VARIANTS'
                            ? 'bg-amber-950 border-amber-600 text-amber-300'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                      >
                        Option A: Merge into Parent as Variant
                      </button>
                      <button
                        onClick={() => handleVariantStructureDecision(p.canonicalSlug, 'INDIVIDUAL_PRODUCTS')}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                          p.variantStructureDecision === 'INDIVIDUAL_PRODUCTS'
                            ? 'bg-blue-950 border-blue-600 text-blue-300'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        }`}
                      >
                        Option B: Keep Individual Page
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Source Records & URLs</span>
                      <div className="space-y-1 text-slate-300">
                        {p.sources.reference && <div>Ref: {p.sources.reference.sourcePermalink || 'live site'}</div>}
                        {p.sources.repoA && <div>Repo A: {p.sources.repoA.sourceFilePath || 'db-content.json'}</div>}
                        {p.sources.repoB && <div>Repo B: {p.sources.repoB.sourceFilePath || 'dev.db'}</div>}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Candidate Variants</span>
                      <div className="space-y-1 text-slate-300">
                        {p.variants.map((v) => (
                          <div key={v.id}>
                            {v.name} · SKU: {v.sku} · Stock: {v.stockLevel}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Pricing & Image</span>
                      <div className="text-slate-300">
                        EUR: {p.priceEUR ? `€${(p.priceEUR / 100).toFixed(2)}` : 'Pending'} · USD: ${p.sourcePriceUSD || 40}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 truncate">{p.primaryImage}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: WHOLESALE PRODUCTS PRICING QUEUE */}
        {activeTab === 'wholesale' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
              <h2 className="text-base font-bold text-white">Dedicated Wholesale Pricing Review Queue</h2>
              <div className="text-xs text-rose-300 bg-rose-950/40 border border-rose-800/80 p-3 rounded leading-relaxed">
                <strong>STRICT COMMERCE POLICY:</strong> Do NOT automatically convert USD to EUR. Require an approved
                business EUR price before publication. Until approved: PRICING_REVIEW_REQUIRED and NOT PURCHASABLE.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {wholesaleProducts.map((p) => {
                const currentEurDraft = wholesaleEurDrafts[p.canonicalSlug] ?? (p.priceEUR ? p.priceEUR / 100 : '');
                const currentGbpDraft = wholesaleGbpDrafts[p.canonicalSlug] ?? (p.priceGBP ? p.priceGBP / 100 : '');

                return (
                  <div key={p.canonicalSlug} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">{p.name}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">
                          SKU: {p.sku} · Slug: {p.canonicalSlug}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded font-semibold ${
                            p.pricingReviewRequired
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {p.pricingReviewRequired ? 'PRICING_REVIEW_REQUIRED' : 'PRICE APPROVED'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {p.pricingReviewRequired ? 'NOT PURCHASABLE' : 'PURCHASABLE WHEN PUBLISHED'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block mb-1">Source Price (Raw USD)</span>
                        <div className="text-base font-bold text-amber-400">${p.sourcePriceUSD || 0} USD</div>
                        <div className="text-[11px] text-slate-500 mt-1">Raw Currency: {p.sourceCurrency || 'USD'}</div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block mb-1">Source URL / Origins</span>
                        <div className="text-slate-300 truncate">
                          {p.sources.reference?.sourcePermalink || p.sources.repoA?.sourceFilePath || 'Catalogue Import'}
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block mb-1">Approved EUR Price</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-slate-400">€</span>
                          <input
                            type="number"
                            step="0.01"
                            value={currentEurDraft}
                            onChange={(e) =>
                              setWholesaleEurDrafts({
                                ...wholesaleEurDrafts,
                                [p.canonicalSlug]: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="e.g. 1450.00"
                            className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block mb-1">Approved GBP Price</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-slate-400">£</span>
                          <input
                            type="number"
                            step="0.01"
                            value={currentGbpDraft}
                            onChange={(e) =>
                              setWholesaleGbpDrafts({
                                ...wholesaleGbpDrafts,
                                [p.canonicalSlug]: parseFloat(e.target.value) || 0,
                              })
                            }
                            placeholder="e.g. 1280.00"
                            className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs w-full focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        onClick={() => handleApproveWholesalePrice(p.canonicalSlug)}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition"
                      >
                        Approve Business Pricing
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: COLLABORATION PRODUCTS REVIEW QUEUE */}
        {activeTab === 'collaborations' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Official Brand Collaborations Governance</h2>
              <p className="text-xs text-slate-400">
                Surfaces brand partnership lines (including Laughing Gas × Fusion and Whole Melt × Fusion). Do not
                automatically authorize European sale without rigorous compliance clearance.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {collaborationProducts.map((p) => (
                <div key={p.canonicalSlug} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{p.name}</h3>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Brand: {p.brand} · SKU: {p.sku} · Slug: {p.canonicalSlug}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCollaborationApproval(p.canonicalSlug, true, 'APPROVED')}
                        className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 px-3 py-1.5 rounded text-xs font-medium"
                      >
                        Authorize European Sale
                      </button>
                      <button
                        onClick={() => handleCollaborationApproval(p.canonicalSlug, false, 'BLOCKED')}
                        className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1.5 rounded text-xs font-medium"
                      >
                        Block European Sale
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Descriptions & Claims</span>
                      <p className="text-slate-300 line-clamp-3">{p.description}</p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Compliance & Publication</span>
                      <div className="space-y-1">
                        <div>
                          Compliance: <span className="font-semibold text-amber-400">{p.complianceClassification}</span>
                        </div>
                        <div>
                          Publication: <span className="font-semibold text-slate-300">{p.publicationStatus}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Allowed Countries</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(p.countryAvailability).map(([cCode, st]) => (
                          <span
                            key={cCode}
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              st === 'AVAILABLE' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {cCode}: {st}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: CATEGORY RECONCILIATION */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Category Mapping Approval Interface</h2>
              <p className="text-xs text-slate-400">
                Preserves original raw source categories without silent renaming. Normalized category changes must
                preserve source category, target category, actor, timestamp, and approval status.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Source Category</th>
                    <th className="p-3">Source Origin</th>
                    <th className="p-3">Normalized Target Category</th>
                    <th className="p-3">Approval Status</th>
                    <th className="p-3">Actor & Timestamp</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {categoryMappings.map((c) => (
                    <tr key={`${c.sourceCategorySlug}-${c.sourceType}`} className="hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-semibold text-white">{c.sourceCategoryName}</div>
                        <div className="text-[11px] text-slate-500">{c.sourceCategorySlug}</div>
                      </td>
                      <td className="p-3 text-slate-400">{c.sourceType}</td>
                      <td className="p-3">
                        <div className="font-semibold text-amber-400">{c.normalizedCategoryName}</div>
                        <div className="text-[11px] text-slate-500">{c.normalizedCategorySlug}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-semibold ${
                            c.approvalStatus === 'APPROVED' ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {c.approvalStatus}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-400">
                        {c.actor || 'Pending review'} · {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
                        {c.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() =>
                              handleCategoryApproval(c.sourceCategorySlug, c.normalizedCategorySlug, c.normalizedCategoryName)
                            }
                            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded text-xs transition"
                          >
                            Approve Mapping
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: CONTENT & CLAIMS REVIEW */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Content & Regulatory Claims Review</h2>
              <p className="text-xs text-slate-400">
                Flagged claims (health, therapeutic, psychoactive, dosage, effect, regulatory, lab) must be reviewed.
                Actions allowed: APPROVE, REWRITE, BLOCK. Do not automatically invent replacement claims.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {products
                .filter((p) => p.contentFlags.length > 0 || p.contentModerationStatus !== 'APPROVED')
                .map((p) => (
                  <div key={p.canonicalSlug} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">{p.name}</h3>
                        <div className="text-xs text-rose-400 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Flagged: {p.contentFlags.join(', ') || 'Requires editorial clearance'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleContentModeration(p.canonicalSlug, 'APPROVE')}
                          className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Approve Claims
                        </button>
                        <button
                          onClick={() => openProductDetail(p.canonicalSlug)}
                          className="bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700 px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Rewrite Content
                        </button>
                        <button
                          onClick={() => handleContentModeration(p.canonicalSlug, 'BLOCK')}
                          className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1.5 rounded text-xs font-medium"
                        >
                          Block Product
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="font-semibold text-slate-400 block mb-2">ORIGINAL SOURCE CONTENT</span>
                        <p className="text-slate-300 whitespace-pre-wrap">{p.originalSourceContent}</p>
                      </div>

                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="font-semibold text-emerald-400 block mb-2">FUSIONBARS EU APPROVED STORE CONTENT</span>
                        <p className="text-slate-300 whitespace-pre-wrap">{p.approvedStoreContent || p.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 7: COMPLIANCE & COUNTRY AVAILABILITY MATRIX */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Country Availability & Regulatory Matrix</h2>
              <p className="text-xs text-slate-400">
                Matrix: Product × Country. Statuses: AVAILABLE, RESTRICTED, BLOCKED, NOT_CONFIGURED. Legal availability is
                never inferred. Products marked REQUIRES_REVIEW or BLOCKED remain non-purchasable via
                ProductPurchaseEligibilityService.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {products
                .filter((p) => p.complianceClassification !== 'APPROVED')
                .slice(0, 20)
                .map((p) => (
                  <div key={`comp-${p.canonicalSlug}`} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-semibold text-white">{p.name}</span>
                        <div className="text-amber-400 mt-0.5">{p.complianceClassification}</div>
                        <div className="text-slate-400 mt-1">{p.complianceReason}</div>
                      </div>
                      <div className="text-slate-500 text-right">
                        <div>Publication: {p.publicationStatus}</div>
                        <div>Purchasable: No until approved</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">Compliance</th>
                    {['NL', 'DE', 'FR', 'ES', 'IT', 'UK', 'BE', 'AT'].map((c) => (
                      <th key={c} className="p-3 text-center">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.slice(0, 30).map((p) => (
                    <tr key={p.canonicalSlug} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{p.name}</td>
                      <td className="p-3">
                        <span
                          className={`font-semibold ${
                            p.complianceClassification === 'APPROVED'
                              ? 'text-emerald-400'
                              : p.complianceClassification === 'BLOCKED'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {p.complianceClassification}
                        </span>
                      </td>
                      {['NL', 'DE', 'FR', 'ES', 'IT', 'UK', 'BE', 'AT'].map((countryCode) => {
                        const status = p.countryAvailability[countryCode] || 'NOT_CONFIGURED';
                        return (
                          <td key={countryCode} className="p-3 text-center">
                            <select
                              value={status}
                              onChange={(e) =>
                                handleCountryAvailability(
                                  p.canonicalSlug,
                                  countryCode,
                                  e.target.value as CountryAvailabilityStatus
                                )
                              }
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border focus:outline-none cursor-pointer ${
                                status === 'AVAILABLE'
                                  ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                                  : status === 'RESTRICTED'
                                  ? 'bg-amber-950 border-amber-800 text-amber-300'
                                  : status === 'BLOCKED'
                                  ? 'bg-rose-950 border-rose-800 text-rose-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-500'
                              }`}
                            >
                              <option value="AVAILABLE" className="bg-slate-900 text-emerald-400">AVAILABLE</option>
                              <option value="RESTRICTED" className="bg-slate-900 text-amber-400">RESTRICTED</option>
                              <option value="BLOCKED" className="bg-slate-900 text-rose-400">BLOCKED</option>
                              <option value="NOT_CONFIGURED" className="bg-slate-900 text-slate-400">NOT_CONFIGURED</option>
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: MEDIA ASSET REVIEW */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Media Asset Quality & Manifest Review</h2>
              <p className="text-xs text-slate-400">
                Displays primary and gallery media assets. Actions: SET PRIMARY, REMOVE FROM PRODUCT, KEEP, FLAG BROKEN.
                Never deletes the underlying raw media record.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.slice(0, 12).map((p) => (
                <div key={p.canonicalSlug} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-xs font-bold text-white truncate">{p.name}</h3>
                  <div className="aspect-square bg-slate-950 rounded-lg overflow-hidden border border-slate-800 relative">
                    <img
                      src={p.primaryImage || 'https://picsum.photos/seed/fusion-bar/400/400'}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 bg-slate-950/80 text-amber-400 text-[10px] px-2 py-0.5 rounded border border-slate-800">
                      Primary Asset
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {p.mediaAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center justify-between gap-2 p-2 rounded bg-slate-950 border border-slate-800 text-[11px]"
                      >
                        <span className="truncate text-slate-400">{asset.format || 'JPEG'} · {asset.dimensions || '800x800'}</span>
                        <div className="flex items-center gap-1.5">
                          {!asset.isPrimary && (
                            <button
                              onClick={() => handleMediaAction(p.canonicalSlug, asset.id, 'SET_PRIMARY')}
                              className="text-amber-400 hover:underline"
                            >
                              Make Primary
                            </button>
                          )}
                          <button
                            onClick={() => handleMediaAction(p.canonicalSlug, asset.id, 'KEEP')}
                            className="text-slate-300 hover:underline"
                          >
                            Keep
                          </button>
                          <button
                            onClick={() => handleMediaAction(p.canonicalSlug, asset.id, 'REMOVE')}
                            className="text-slate-400 hover:underline"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => handleMediaAction(p.canonicalSlug, asset.id, 'FLAG_BROKEN')}
                            className="text-rose-400 hover:underline"
                          >
                            Flag Broken
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: STAGED REVIEWS MODERATION */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Imported Customer Reviews Moderation</h2>
              <p className="text-xs text-slate-400">
                All 64 imported customer reviews are STAGED and kept invisible publicly. Actions: APPROVE, REJECT, ARCHIVE.
                Preserves reviewer author, rating, body, and source provenance without fabricating verification.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{r.authorName}</span>
                      <span className="text-amber-400">{'★'.repeat(r.rating)}</span>
                      <span className="text-slate-500">· {r.date}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          r.moderationStatus === 'APPROVED'
                            ? 'bg-emerald-950 text-emerald-300'
                            : r.moderationStatus === 'REJECTED'
                            ? 'bg-rose-950 text-rose-300'
                            : 'bg-amber-950 text-amber-300'
                        }`}
                      >
                        {r.moderationStatus}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1 italic">"{r.body}"</p>
                    <div className="text-[11px] text-slate-500">
                      Source: {r.sourceType} · Buyer Verified: {r.isVerifiedBuyer ? 'Yes (Confirmed)' : 'Unverified'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start">
                    {r.moderationStatus !== 'APPROVED' && (
                      <button
                        onClick={() => handleReviewModeration(r.id, 'APPROVE')}
                        className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 px-3 py-1 rounded text-xs"
                      >
                        Approve
                      </button>
                    )}
                    {r.moderationStatus !== 'REJECTED' && (
                      <button
                        onClick={() => handleReviewModeration(r.id, 'REJECT')}
                        className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-1 rounded text-xs"
                      >
                        Reject
                      </button>
                    )}
                    {r.moderationStatus !== 'ARCHIVED' && (
                      <button
                        onClick={() => handleReviewModeration(r.id, 'ARCHIVE')}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1 rounded text-xs"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 10: SEO CLEARANCE */}
        {activeTab === 'seo' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Search Engine Optimization (SEO) Clearance</h2>
              <p className="text-xs text-slate-400">
                Displays source SEO title, meta description, and canonical alongside FusionBars EU European metadata.
                Require editorial approval prior to publication.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {products.slice(0, 15).map((p) => (
                <div key={p.canonicalSlug} className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white">{p.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${p.seo.isApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {p.seo.isApproved ? 'SEO Approved' : 'SEO Review Required'}
                      </span>
                      {!p.seo.isApproved && (
                        <button
                          onClick={async () => {
                            const draft = seoDrafts[p.canonicalSlug];
                            const title = draft?.title?.trim();
                            const description = draft?.description?.trim();
                            if (!title || !description) {
                              alert('Enter a FusionBars EU SEO title and description. Source metadata is not copied automatically.');
                              return;
                            }
                            const res = await approveSeoAction({
                              productSlug: p.canonicalSlug,
                              approvedTitle: title,
                              approvedDescription: description,
                              actor: actorName,
                              actorRole: currentRole,
                              reason: 'Editorial SEO clearance after source metadata review',
                            });
                            if (res.success) {
                              setStatusMessage({ type: 'success', text: `SEO approved for ${p.name}` });
                              loadDashboard();
                              loadProducts();
                            } else {
                              alert(res.error || 'SEO approval failed');
                            }
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded text-xs"
                        >
                          Approve EU SEO
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-950 p-3 rounded border border-slate-800">
                      <span className="text-slate-500 block mb-1">Source SEO Metadata</span>
                      <div className="text-white font-semibold">{p.seo.sourceTitle || 'N/A'}</div>
                      <p className="text-slate-400 mt-1">{p.seo.sourceDescription || 'N/A'}</p>
                      <div className="text-[11px] text-slate-500 mt-1 truncate">{p.seo.sourceCanonical}</div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-2">
                      <span className="text-emerald-400 font-semibold block">FusionBars EU Approved SEO</span>
                      <input
                        type="text"
                        placeholder="Enter EU SEO title (do not paste source blindly)"
                        value={seoDrafts[p.canonicalSlug]?.title ?? p.seo.approvedTitle ?? ''}
                        onChange={(e) =>
                          setSeoDrafts({
                            ...seoDrafts,
                            [p.canonicalSlug]: {
                              title: e.target.value,
                              description: seoDrafts[p.canonicalSlug]?.description ?? p.seo.approvedDescription ?? '',
                            },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                      />
                      <textarea
                        placeholder="Enter EU SEO description after editorial review"
                        value={seoDrafts[p.canonicalSlug]?.description ?? p.seo.approvedDescription ?? ''}
                        onChange={(e) =>
                          setSeoDrafts({
                            ...seoDrafts,
                            [p.canonicalSlug]: {
                              title: seoDrafts[p.canonicalSlug]?.title ?? p.seo.approvedTitle ?? '',
                              description: e.target.value,
                            },
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 min-h-[64px]"
                      />
                      <div className="text-[11px] text-slate-400 truncate">{p.seo.approvedCanonical || 'Canonical assigned on approval'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 11: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-2">
              <h2 className="text-base font-bold text-white">Immutable Catalogue Decision Audit Trail</h2>
              <p className="text-xs text-slate-400">
                Records every decision made in the Catalogue Review Center: actor, timestamp, entity, before value, after value, and reason.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Action</th>
                    <th className="p-3">Actor & Role</th>
                    <th className="p-3">Entity</th>
                    <th className="p-3">Reason / Details</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {auditTrail.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-amber-400">{record.action}</td>
                      <td className="p-3">
                        <div className="text-white">{record.actor}</div>
                        <div className="text-[11px] text-slate-500">{record.actorRole}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-300">{record.entityId}</td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">{record.reason}</td>
                      <td className="p-3 text-right text-slate-400 whitespace-nowrap">
                        {new Date(record.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* PRODUCT REVIEW DETAIL MODAL / DRAWER */}
      {detailProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-900/95 border-b border-slate-800 p-5 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-white">{detailProduct.name}</h2>
                <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>SKU: {detailProduct.sku}</span>
                  <span aria-hidden="true">·</span>
                  <span>Category: {detailProduct.categoryName}</span>
                  <span aria-hidden="true">·</span>
                  <span>Compliance: {detailProduct.complianceClassification}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePublishProduct(detailProduct.canonicalSlug)}
                  disabled={!detailProduct.readinessChecklist.isReadyToPublish}
                  className={`px-4 py-2 rounded text-xs font-bold transition ${
                    detailProduct.readinessChecklist.isReadyToPublish
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  Publish Product
                </button>
                <button
                  onClick={() => handleBlockProduct(detailProduct.canonicalSlug)}
                  className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-3 py-2 rounded text-xs font-medium"
                >
                  Block Product
                </button>
                <button
                  onClick={() => setDetailProduct(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-xs">
              {/* 12-POINT PUBLICATION READINESS CHECKLIST */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">12-Point Publication Readiness Checklist</span>
                  <span
                    className={`font-semibold ${
                      detailProduct.readinessChecklist.isReadyToPublish ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {detailProduct.readinessChecklist.isReadyToPublish ? 'READY TO PUBLISH' : 'PENDING REVIEW'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries({
                    'Valid Product': detailProduct.readinessChecklist.validProduct,
                    'Valid Variant': detailProduct.readinessChecklist.validVariant,
                    'Valid SKU': detailProduct.readinessChecklist.validSku,
                    'Valid Price': detailProduct.readinessChecklist.validPrice,
                    'Valid Category': detailProduct.readinessChecklist.validCategory,
                    'Primary Image': detailProduct.readinessChecklist.primaryImage,
                    'Content Approved': detailProduct.readinessChecklist.contentApproved,
                    'Compliance Approved': detailProduct.readinessChecklist.complianceApproved,
                    'Country Availability': detailProduct.readinessChecklist.countryAvailability,
                    'Translation': detailProduct.readinessChecklist.translation,
                    'SEO': detailProduct.readinessChecklist.seo,
                    'Inventory': detailProduct.readinessChecklist.inventory,
                  }).map(([label, passed]) => (
                    <div
                      key={label}
                      className={`p-2 rounded border flex items-center gap-2 ${
                        passed
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                          : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                      }`}
                    >
                      {passed ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {detailProduct.readinessChecklist.blockers.length > 0 && (
                  <div className="text-[11px] text-rose-300 bg-rose-950/20 p-2 rounded border border-rose-900/40">
                    <strong>Blockers:</strong> {detailProduct.readinessChecklist.blockers.join('; ')}
                  </div>
                )}
              </div>

              {/* NORMALIZED PRODUCT */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm">Normalized Product</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ['Name', detailProduct.name],
                    ['Brand', detailProduct.brand || '—'],
                    ['Category', detailProduct.categoryName],
                    ['SKU', detailProduct.sku || 'MISSING'],
                    ['EUR Price', detailProduct.priceEUR ? `€${(detailProduct.priceEUR / 100).toFixed(2)}` : 'PRICING_REVIEW_REQUIRED'],
                    ['GBP Price', detailProduct.priceGBP ? `£${(detailProduct.priceGBP / 100).toFixed(2)}` : 'Not approved (fallback only if allowed)'],
                    ['Publication', detailProduct.publicationStatus],
                    ['Compliance', detailProduct.complianceClassification],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-950 border border-slate-800 rounded p-3">
                      <span className="text-slate-500 block mb-1">{label}</span>
                      <span className="text-white font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded p-3">
                    <span className="text-slate-500 block mb-1">Variants</span>
                    {detailProduct.variants.map((v) => (
                      <div key={v.id} className="text-slate-300">
                        {v.name} · {v.sku || 'NO SKU'} · {v.flavor || '—'}
                      </div>
                    ))}
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded p-3">
                    <span className="text-slate-500 block mb-1">Images / Ingredients / Attributes</span>
                    <div className="text-slate-300 truncate">Primary: {detailProduct.primaryImage || 'None'}</div>
                    <div className="text-slate-300">Ingredients: {detailProduct.ingredients.join(', ') || 'Not supplied by source'}</div>
                    <div className="text-slate-400 mt-1">SEO approved: {detailProduct.seo.isApproved ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              </div>

              {/* SOURCE COMPARISON MATRIX */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm">Source Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['reference', 'repoA', 'repoB'] as const).map((key) => {
                    const provenance = detailProduct.sourceProvenance?.[key];
                    const label = key === 'reference' ? 'Reference Website' : key === 'repoA' ? 'Repository A' : 'Repository B';
                    return (
                      <div key={key} className="bg-slate-950 border border-slate-800 rounded p-3 space-y-1">
                        <span className="font-semibold text-white">{label}</span>
                        <div className="text-slate-400 truncate">URL: {provenance?.sourceUrl || '—'}</div>
                        <div className="text-slate-400 truncate">File: {provenance?.sourceFile || '—'}</div>
                        <div className="text-slate-400">Timestamp: {provenance?.timestamp || '—'}</div>
                        <div className="text-slate-500 font-mono break-all">Hash: {provenance?.hash || '—'}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3">Field</th>
                        <th className="p-3">Reference Website</th>
                        <th className="p-3">Repository A</th>
                        <th className="p-3">Repository B</th>
                        <th className="p-3">Approved European Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {detailProduct.fieldComparisons.map((fc) => (
                        <tr key={fc.fieldName} className={fc.hasConflict ? 'bg-amber-950/10' : ''}>
                          <td className="p-3 font-semibold text-white">{fc.fieldName}</td>
                          <td className="p-3 text-slate-300">{String(fc.referenceValue ?? '—')}</td>
                          <td className="p-3 text-slate-300">{String(fc.repoAValue ?? '—')}</td>
                          <td className="p-3 text-slate-300">{String(fc.repoBValue ?? '—')}</td>
                          <td className="p-3 text-emerald-400 font-medium">
                            {String(
                              detailProduct.fieldDecisions[fc.fieldName]?.approvedValue ??
                                (detailProduct as any)[fc.fieldName] ??
                                fc.reconciledValue ??
                                '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FIELD-LEVEL APPROVAL CONTROLS */}
              <div className="space-y-3">
                <h3 className="font-bold text-white text-sm">Field-Level Decision Controls</h3>
                <div className="grid grid-cols-1 gap-3">
                  {detailProduct.fieldComparisons
                    .filter((fc) => fc.hasConflict)
                    .map((fc) => (
                      <div key={fc.fieldName} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{fc.fieldName}</span>
                          <span className="text-[11px] text-rose-400 font-medium">Conflict Detected</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleFieldApproval(fc.fieldName, 'USE_REFERENCE')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs border border-slate-700"
                          >
                            Use Reference
                          </button>
                          <button
                            onClick={() => handleFieldApproval(fc.fieldName, 'USE_REPO_A')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs border border-slate-700"
                          >
                            Use Repository A
                          </button>
                          <button
                            onClick={() => handleFieldApproval(fc.fieldName, 'USE_REPO_B')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs border border-slate-700"
                          >
                            Use Repository B
                          </button>
                          <button
                            onClick={() => handleFieldApproval(fc.fieldName, 'KEEP_CURRENT_EU')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs border border-slate-700"
                          >
                            Keep Current EU Value
                          </button>
                        </div>

                        {/* Custom Value Input */}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Enter custom approved value..."
                            value={customFieldValues[fc.fieldName] || ''}
                            onChange={(e) =>
                              setCustomFieldValues({
                                ...customFieldValues,
                                [fc.fieldName]: e.target.value,
                              })
                            }
                            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white flex-1 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={() => handleFieldApproval(fc.fieldName, 'CUSTOM_APPROVED_VALUE')}
                            className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded text-xs"
                          >
                            Apply Custom Value
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
