// Scales the existing review workflow. Does not approve pricing, compliance, country, content, translation, or publication.

import { RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';
import { CatalogueReviewService, ReviewProductItem } from '@/domain/catalog/CatalogueReviewService';
import { CatalogueAdjudicationService } from '@/domain/catalog/CatalogueAdjudicationService';
import { MasterCatalogueImportService } from '@/domain/import/MasterCatalogueImportService';
import { PublicationReadinessService } from '@/domain/catalog/PublicationReadinessService';
import firstBatchSeed from '@/data/catalogue-first-batch-state.json';
import specialistSeed from '@/data/catalogue-specialist-review-state.json';
import rolloutSeed from '@/data/catalogue-rollout-state.json';

const PILOT_SLUGS = ((firstBatchSeed as { selectedSlugs?: string[] }).selectedSlugs || []).slice(0, 10);
const PILOT = new Set(PILOT_SLUGS);
const PAGE_SIZES = [10, 20, 50] as const;

export interface RolloutAuditEvent {
  id: string;
  action: string;
  product: string;
  category: string;
  beforeValue: unknown;
  afterValue: unknown;
  actor: string;
  role: RoleName;
  timestamp: string;
  rationale: string;
  evidence: string;
  source: string;
  batchId: string;
}

export interface RolloutBatch {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  createdByRole: RoleName;
  reviewers: string[];
  productSlugs: string[];
  size: number;
}

export interface RolloutProduct {
  slug: string;
  batchId: string | null;
  stage: 'DATA_REVIEW' | 'DEFERRED' | 'REOPENED';
  version: number;
  reviewer: string | null;
  reviewerRole: RoleName | null;
  assignedAt: string | null;
  updatedAt: string | null;
  deferral: { reason: string; evidence: string; nextAction: string; reviewer: string; role: RoleName; timestamp: string } | null;
}

interface RolloutState {
  version: number;
  batches: RolloutBatch[];
  products: Record<string, RolloutProduct>;
  audit: RolloutAuditEvent[];
  duplicateDecisions: Array<{ slug: string; otherSlug: string; outcome: 'DISTINCT_PRODUCTS' | 'CONFIRMED_DUPLICATE' | 'POSSIBLE_MATCH' | 'DEFERRED'; version: number }>;
  issueResolutions: Array<{ issueId: string; status: 'RESOLVED' | 'DEFERRED' | 'REJECTED'; reason: string }>;
}

export interface QueueFilters {
  queue?: 'unreviewed' | 'deferred' | 'blockers' | 'pilot' | 'all';
  reviewState?: string;
  source?: string;
  category?: string;
  duplicateStatus?: string;
  pricingStatus?: string;
  complianceStatus?: string;
  countryStatus?: string;
  contentStatus?: string;
  mediaStatus?: string;
  translationStatus?: string;
  publicationStatus?: string;
  productType?: string;
  specialistRequired?: boolean;
  doNotPublish?: boolean;
  reviewer?: string;
  updatedOn?: string;
  blocker?: string;
  search?: string;
  sort?: 'priority' | 'name' | 'updated';
  page?: number;
  pageSize?: number;
}

export interface QueueRow {
  slug: string;
  name: string;
  category: string;
  productType: string;
  source: string;
  reviewState: string;
  duplicateStatus: string;
  pricingStatus: string;
  complianceStatus: string;
  countryStatus: string;
  contentStatus: string;
  mediaStatus: string;
  translationStatus: string;
  publicationStatus: string;
  specialistRequired: boolean;
  doNotPublish: boolean;
  reviewer: string;
  updatedAt: string;
  batchId: string | null;
  version: number;
  priority: number;
  protectedPilot: boolean;
  blockers: string[];
}

function getFs(): any {
  try {
    if (typeof window === 'undefined') return eval('require')('fs');
  } catch {}
  return null;
}
function getPath(): any {
  try {
    if (typeof window === 'undefined') return eval('require')('path');
  } catch {}
  return null;
}
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class CatalogueRolloutService {
  private static cached: RolloutState | null = null;
  private static persistEnabled = true;
  private static indexCache: { stamp: string; rows: QueueRow[] } | null = null;

  static resetForTests(): void {
    this.persistEnabled = false;
    this.cached = { version: 1, batches: [], products: {}, audit: [], duplicateDecisions: [], issueResolutions: [] };
    this.indexCache = null;
  }

  static protectedSlugs(): string[] {
    return [...PILOT_SLUGS];
  }

  static getState(): RolloutState {
    if (this.cached) return this.cached;
    const fs = getFs();
    const path = getPath();
    if (this.persistEnabled && fs && path) {
      const full = path.resolve(process.cwd(), 'src/data/catalogue-rollout-state.json');
      if (fs.existsSync(full)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (parsed?.version) {
            this.cached = parsed;
            return this.cached!;
          }
        } catch {}
      }
    }
    this.cached = clone(rolloutSeed as RolloutState);
    return this.cached;
  }

  static snapshot() {
    const rows = this.rows();
    const pilot = rows.filter((row) => row.protectedPilot);
    const remaining = rows.filter((row) => !row.protectedPilot);
    const issues = this.importIssues();
    const categories = this.categoryQueue();
    const relationships = this.duplicateSummary();
    return {
      totalImported: rows.length,
      uniqueProducts: rows.length,
      pilotProducts: pilot.length,
      remainingUnreviewed: remaining.filter((row) => row.reviewState === 'DATA_REVIEW' && !row.batchId).length,
      dataAdjudicated: rows.filter((row) => row.reviewState === 'DATA_ADJUDICATED' || row.protectedPilot).length,
      dataPending: rows.filter((row) => !row.protectedPilot && row.reviewState !== 'DEFERRED').length,
      dataDeferred: rows.filter((row) => row.reviewState === 'DEFERRED').length,
      specialistReviewed: rows.filter((row) => this.specialistComplete(row)).length,
      publicationNotReady: rows.filter((row) => row.publicationStatus === 'NOT_READY').length,
      publicationReady: rows.filter((row) => row.publicationStatus === 'READY_FOR_PUBLICATION').length,
      published: rows.filter((row) => row.publicationStatus === 'PUBLISHED').length,
      doNotPublish: rows.filter((row) => row.doNotPublish).length,
      unresolvedDuplicates: relationships.possibleMatch,
      pricingPending: rows.filter((row) => row.pricingStatus !== 'PRICE_APPROVED' && row.pricingStatus !== 'PRICE_NOT_APPLICABLE').length,
      compliancePending: rows.filter((row) => row.complianceStatus !== 'APPROVED_FOR_PUBLICATION' && row.complianceStatus !== 'APPROVED_WITH_RESTRICTIONS' && row.complianceStatus !== 'DO_NOT_PUBLISH' && row.complianceStatus !== 'REJECTED').length,
      countryPending: rows.filter((row) => row.countryStatus !== 'CONFIGURED').length,
      contentPending: rows.filter((row) => row.contentStatus !== 'CONTENT_APPROVED' && row.contentStatus !== 'CONTENT_APPROVED_WITH_RESTRICTIONS' && row.contentStatus !== 'DO_NOT_PUBLISH').length,
      mediaPending: rows.filter((row) => row.mediaStatus !== 'VERIFIED' && row.mediaStatus !== 'DO_NOT_PUBLISH').length,
      translationPending: rows.filter((row) => row.translationStatus !== 'APPROVED').length,
      readyForPublication: rows.filter((row) => row.publicationStatus === 'READY_FOR_PUBLICATION').length,
      importIssuesOpen: issues.filter((issue) => issue.status === 'UNRESOLVED').length,
      importIssuesResolved: issues.filter((issue) => issue.status === 'RESOLVED').length,
      importIssuesDeferred: issues.filter((issue) => issue.status === 'DEFERRED').length,
      categoriesPending: categories.filter((row) => row.status === 'PENDING').length,
      categoriesConfirmed: categories.filter((row) => row.status === 'CONFIRMED').length,
      relationships,
      blockersByGate: this.blockerCounts(rows),
      batches: this.batchSummaries(),
      auditEvents: this.getState().audit.length,
      publicationEvents: PublicationReadinessService.getAuditEvents().length,
      publishedCatalogue: CatalogueAdjudicationService.getState().published.length,
    };
  }

  static query(filters: QueueFilters = {}) {
    const pageSize = PAGE_SIZES.includes(filters.pageSize as 10 | 20 | 50) ? (filters.pageSize as number) : 20;
    const page = Math.max(1, filters.page || 1);
    let rows = this.rows();
    if ((filters.queue || 'unreviewed') === 'unreviewed') rows = rows.filter((row) => !row.protectedPilot);
    if (filters.queue === 'pilot') rows = rows.filter((row) => row.protectedPilot);
    if (filters.queue === 'deferred') rows = rows.filter((row) => row.reviewState === 'DEFERRED');
    if (filters.queue === 'blockers') rows = rows.filter((row) => row.blockers.length > 0 && !row.protectedPilot);
    if (filters.blocker) rows = rows.filter((row) => row.blockers.includes(filters.blocker!));
    if (filters.reviewState) rows = rows.filter((row) => row.reviewState === filters.reviewState);
    if (filters.source) rows = rows.filter((row) => row.source === filters.source);
    if (filters.category) rows = rows.filter((row) => row.category === filters.category);
    if (filters.duplicateStatus) rows = rows.filter((row) => row.duplicateStatus === filters.duplicateStatus);
    if (filters.pricingStatus) rows = rows.filter((row) => row.pricingStatus === filters.pricingStatus);
    if (filters.complianceStatus) rows = rows.filter((row) => row.complianceStatus === filters.complianceStatus);
    if (filters.countryStatus) rows = rows.filter((row) => row.countryStatus === filters.countryStatus);
    if (filters.contentStatus) rows = rows.filter((row) => row.contentStatus === filters.contentStatus);
    if (filters.mediaStatus) rows = rows.filter((row) => row.mediaStatus === filters.mediaStatus);
    if (filters.translationStatus) rows = rows.filter((row) => row.translationStatus === filters.translationStatus);
    if (filters.publicationStatus) rows = rows.filter((row) => row.publicationStatus === filters.publicationStatus);
    if (filters.productType) rows = rows.filter((row) => row.productType === filters.productType);
    if (filters.specialistRequired != null) rows = rows.filter((row) => row.specialistRequired === filters.specialistRequired);
    if (filters.doNotPublish != null) rows = rows.filter((row) => row.doNotPublish === filters.doNotPublish);
    if (filters.reviewer) rows = rows.filter((row) => row.reviewer === filters.reviewer);
    if (filters.updatedOn) rows = rows.filter((row) => String(row.updatedAt).slice(0, 10) === filters.updatedOn);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter((row) => `${row.name} ${row.slug} ${row.category}`.toLowerCase().includes(q));
    }
    const sort = filters.sort || 'priority';
    rows = [...rows].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'updated') return String(b.updatedAt).localeCompare(String(a.updatedAt));
      return b.priority - a.priority || a.slug.localeCompare(b.slug);
    });
    const start = (page - 1) * pageSize;
    return {
      page,
      pageSize,
      total: rows.length,
      pages: Math.max(1, Math.ceil(rows.length / pageSize)),
      rows: rows.slice(start, start + pageSize),
    };
  }

  static createBatch(params: { size?: number; actor: string; actorRole: RoleName; name?: string; reviewer?: string }) {
    this.assertManager(params.actorRole);
    const size = params.size ?? 10;
    if (size !== 10 && size !== 20) throw new Error('Review batches are limited to 10 or 20 products.');
    const state = this.getState();
    const taken = new Set(state.batches.flatMap((batch) => batch.productSlugs));
    const candidates = this.rows()
      .filter((row) => !row.protectedPilot && !taken.has(row.slug) && !row.doNotPublish)
      .sort((a, b) => b.priority - a.priority || a.slug.localeCompare(b.slug))
      .slice(0, size);
    if (!candidates.length) throw new Error('No unreviewed products are available for a new batch.');
    const batch: RolloutBatch = {
      id: `RB-${String(state.batches.length + 2).padStart(3, '0')}`,
      name: params.name || `Review batch ${state.batches.length + 2}`,
      createdAt: new Date().toISOString(),
      createdBy: params.actor,
      createdByRole: params.actorRole,
      reviewers: params.reviewer ? [params.reviewer] : [],
      productSlugs: candidates.map((row) => row.slug),
      size: candidates.length,
    };
    if (batch.productSlugs.some((slug) => PILOT.has(slug))) throw new Error('The pilot batch cannot be selected again.');
    state.batches.push(batch);
    for (const row of candidates) {
      state.products[row.slug] = {
        slug: row.slug,
        batchId: batch.id,
        stage: 'DATA_REVIEW',
        version: 1,
        reviewer: params.reviewer || null,
        reviewerRole: params.reviewer ? 'CATALOG_MANAGER' : null,
        assignedAt: params.reviewer ? batch.createdAt : null,
        updatedAt: batch.createdAt,
        deferral: null,
      };
    }
    this.audit(state, {
      action: 'REVIEW_BATCH_CREATED',
      product: batch.id,
      category: 'queue',
      beforeValue: null,
      afterValue: { slugs: batch.productSlugs, size: batch.size },
      actor: params.actor,
      role: params.actorRole,
      rationale: 'Operational batch. No approval decisions were recorded.',
      evidence: 'Review priority is ordering only.',
      source: 'catalogue-rollout',
      batchId: batch.id,
    });
    this.persist();
    return batch;
  }

  static assignReviewer(params: { slugs: string[]; reviewer: string; reviewerRole: RoleName; actor: string; actorRole: RoleName; expectedVersions: Record<string, number> }) {
    this.assertManager(params.actorRole);
    if (!params.reviewer.trim()) throw new Error('Assignment requires a reviewer.');
    return this.mutate(params.slugs, params.expectedVersions, params.actor, params.actorRole, (record) => {
      record.reviewer = params.reviewer;
      record.reviewerRole = params.reviewerRole;
      record.assignedAt = new Date().toISOString();
    }, 'REVIEWER_ASSIGNED', 'Assignment does not grant approval authority.');
  }

  static deferProducts(params: { slugs: string[]; reason: string; evidence?: string; nextAction?: string; actor: string; actorRole: RoleName; expectedVersions: Record<string, number> }) {
    this.assertManager(params.actorRole);
    if (!params.reason.trim()) throw new Error('A deferral requires a reason.');
    return this.mutate(params.slugs, params.expectedVersions, params.actor, params.actorRole, (record) => {
      record.stage = 'DEFERRED';
      record.deferral = {
        reason: params.reason.trim(),
        evidence: params.evidence?.trim() || '',
        nextAction: params.nextAction?.trim() || '',
        reviewer: params.actor,
        role: params.actorRole,
        timestamp: new Date().toISOString(),
      };
    }, 'REVIEW_DEFERRED', params.reason.trim());
  }

  static reopen(params: { slug: string; actor: string; actorRole: RoleName; expectedVersion: number }) {
    this.assertManager(params.actorRole);
    if (PILOT.has(params.slug)) throw new Error('Pilot products are not reopened from the rollout queue.');
    const readiness = PublicationReadinessService.evaluateSaved(params.slug);
    if (readiness.readiness === 'DO_NOT_PUBLISH') throw new Error('DO_NOT_PUBLISH records cannot be reopened into the publication queue.');
    return this.mutate([params.slug], { [params.slug]: params.expectedVersion }, params.actor, params.actorRole, (record) => {
      record.stage = 'REOPENED';
      record.deferral = null;
    }, 'REVIEW_REOPENED', 'Reopened for human review. No decision was approved.');
  }

  static applyBulk(params: { action: string }) {
    if (params.action !== 'ASSIGN' && params.action !== 'DEFER' && params.action !== 'CREATE_BATCH') {
      throw new Error('Bulk approval is not available.');
    }
    return { allowed: true as const, action: params.action };
  }

  static batchSummaries() {
    const rows = this.rows();
    const pilotRows = rows.filter((row) => row.protectedPilot);
    const pilot = {
      id: 'FB-001',
      name: 'Pilot specialist batch',
      size: pilotRows.length,
      completed: pilotRows.filter((row) => row.reviewState === 'DATA_ADJUDICATED' || row.protectedPilot).length,
      deferred: pilotRows.filter((row) => row.pricingStatus === 'PRICE_DEFERRED' || row.complianceStatus === 'DEFERRED' || row.contentStatus === 'CONTENT_DEFERRED').length,
      blocked: pilotRows.filter((row) => row.publicationStatus !== 'READY_FOR_PUBLICATION' && row.publicationStatus !== 'PUBLISHED').length,
      ready: pilotRows.filter((row) => row.publicationStatus === 'READY_FOR_PUBLICATION').length,
      published: pilotRows.filter((row) => row.publicationStatus === 'PUBLISHED').length,
      reviewers: ['finance.review@fusionbars.eu', 'compliance.review@fusionbars.eu', 'content.review@fusionbars.eu'],
      createdAt: (firstBatchSeed as { selectionGeneratedAt?: string }).selectionGeneratedAt || '',
    };
    const created = this.getState().batches.map((batch) => {
      const members = rows.filter((row) => batch.productSlugs.includes(row.slug));
      return {
        id: batch.id,
        name: batch.name,
        size: batch.size,
        completed: members.filter((row) => row.reviewState === 'DATA_ADJUDICATED').length,
        deferred: members.filter((row) => row.reviewState === 'DEFERRED').length,
        blocked: members.length,
        ready: members.filter((row) => row.publicationStatus === 'READY_FOR_PUBLICATION').length,
        published: members.filter((row) => row.publicationStatus === 'PUBLISHED').length,
        reviewers: batch.reviewers,
        createdAt: batch.createdAt,
        createdBy: batch.createdBy,
      };
    });
    return [pilot, ...created];
  }

  static importIssues() {
    const result = MasterCatalogueImportService.getImportResult();
    const resolutions = new Map(this.getState().issueResolutions.map((item) => [item.issueId, item.status]));
    return (result.issues || []).map((issue) => ({
      id: issue.id,
      type: issue.issueType,
      message: issue.message,
      status: resolutions.get(issue.id) || (issue.isResolved ? 'RESOLVED' : 'UNRESOLVED'),
    }));
  }

  static categoryQueue() {
    const mappings = CatalogueReviewService.getState().categoryMappings || [];
    return mappings.map((mapping) => ({
      source: mapping.sourceCategoryName,
      sourceSlug: mapping.sourceCategorySlug,
      mappedTo: mapping.normalizedCategoryName,
      mappedSlug: mapping.normalizedCategorySlug,
      status: mapping.approvalStatus === 'APPROVED' ? 'CONFIRMED' : mapping.approvalStatus === 'REJECTED' ? 'REMAPPED' : 'PENDING',
    }));
  }

  private static duplicateSummary() {
    const products = (firstBatchSeed as { products?: Record<string, { relationshipDecision?: { relationship?: string } }> }).products || {};
    let distinct = 0;
    for (const slug of PILOT_SLUGS) {
      if (products[slug]?.relationshipDecision?.relationship === 'DISTINCT_PRODUCTS') distinct += 1;
    }
    const extra = this.getState().duplicateDecisions;
    return {
      confirmedDistinct: distinct + extra.filter((row) => row.outcome === 'DISTINCT_PRODUCTS').length,
      confirmedDuplicate: extra.filter((row) => row.outcome === 'CONFIRMED_DUPLICATE').length,
      possibleMatch: this.rows().filter((row) => row.duplicateStatus === 'POSSIBLE_MATCH').length,
      deferred: extra.filter((row) => row.outcome === 'DEFERRED').length,
    };
  }

  private static rows(): QueueRow[] {
    const state = this.getState();
    const stamp = `${state.batches.length}:${state.audit.length}:${Object.keys(state.products).length}`;
    if (this.indexCache?.stamp === stamp) return this.indexCache.rows;
    const specialistFile = specialistSeed as {
      products?: Record<string, any>;
      auditTrail?: Array<{ product?: string; section?: string; actor?: string; actorRole?: string; timestamp?: string; reason?: string }>;
    };
    const specialist = specialistFile.products || {};
    const trails = specialistFile.auditTrail || [];
    const pilotProducts = (firstBatchSeed as { products?: Record<string, any> }).products || {};
    const catalogue = Object.values(CatalogueReviewService.getState().products || {}) as ReviewProductItem[];
    const rows = catalogue.map((product) => this.toRow(
      product,
      specialist[product.canonicalSlug],
      pilotProducts[product.canonicalSlug],
      state.products[product.canonicalSlug],
      trails.filter((event) => event.product === product.canonicalSlug)
    ));
    this.indexCache = { stamp, rows };
    return rows;
  }

  private static toRow(
    product: ReviewProductItem,
    specialist: any,
    pilot: any,
    rollout: RolloutProduct | undefined,
    auditTrail: Array<{ section?: string; actor?: string; actorRole?: string; timestamp?: string; reason?: string }>
  ): QueueRow {
    const slug = product.canonicalSlug;
    const protectedPilot = PILOT.has(slug);
    const testRecord = pilot?.commercialDisposition === 'NON_COMMERCIAL_TEST_RECORD' || /audit-test-product/.test(slug);
    const report = PublicationReadinessService.evaluate({
      slug,
      review: specialist || null,
      dataStatus: protectedPilot ? 'ADJUDICATED' : 'PENDING',
      testRecord,
      auditTrail,
    });
    const sources = [product.sources?.reference && 'REFERENCE', product.sources?.repoA && 'REPOSITORY_A', product.sources?.repoB && 'REPOSITORY_B'].filter(Boolean);
    const conflicts = (product.fieldComparisons || []).filter((field) => field.hasConflict).length;
    const brokenMedia = (product.mediaAssets || []).some((asset) => asset.status === 'BROKEN' || !product.primaryImage);
    let priority = 0;
    if (product.isUnresolvedDuplicate || product.confidence === 'POSSIBLE_MATCH') priority += 5;
    if (conflicts) priority += 4;
    if (brokenMedia) priority += 4;
    if (product.pricingReviewRequired) priority += 2;
    if (product.contentFlags?.length) priority += 3;
    if (!product.sku) priority += 2;
    const duplicateStatus = pilot?.relationshipDecision?.relationship
      || (product.isUnresolvedDuplicate || product.confidence === 'POSSIBLE_MATCH' ? 'POSSIBLE_MATCH' : 'UNREVIEWED');
    const blockers = report.blockers.map((gate) => gate.gate.toUpperCase());
    return {
      slug,
      name: product.name,
      category: product.categoryName || '',
      productType: product.productType || '',
      source: sources.join('+') || 'UNKNOWN',
      reviewState: protectedPilot ? 'DATA_ADJUDICATED' : rollout?.stage || 'DATA_REVIEW',
      duplicateStatus,
      pricingStatus: specialist?.pricing?.state || 'PRICE_REVIEW_PENDING',
      complianceStatus: specialist?.compliance?.state || (testRecord ? 'DO_NOT_PUBLISH' : 'REQUIRES_REVIEW'),
      countryStatus: specialist?.countries?.some((row: { decision: string }) => row.decision === 'ALLOWED') ? 'CONFIGURED' : 'NOT_CONFIGURED',
      contentStatus: specialist?.content?.state || 'INTERNAL_SOURCE_ONLY',
      mediaStatus: specialist?.media?.state || (brokenMedia ? 'MEDIA_REVIEW' : 'PENDING'),
      translationStatus: specialist && Object.values(specialist.translations || {}).every((slot: any) => slot.state === 'APPROVED') ? 'APPROVED' : 'PENDING',
      publicationStatus: report.readiness,
      specialistRequired: !protectedPilot,
      doNotPublish: report.readiness === 'DO_NOT_PUBLISH',
      reviewer: rollout?.reviewer || specialist?.reviewer || '',
      updatedAt: rollout?.updatedAt || specialist?.updatedAt || '',
      batchId: rollout?.batchId || (protectedPilot ? 'FB-001' : null),
      version: rollout?.version || 1,
      priority,
      protectedPilot,
      blockers: [...new Set(blockers)],
    };
  }

  private static specialistComplete(row: QueueRow): boolean {
    const terminal = (status: string) => ['PRICE_APPROVED', 'PRICE_NOT_APPLICABLE', 'PRICE_REJECTED', 'APPROVED_FOR_PUBLICATION', 'APPROVED_WITH_RESTRICTIONS', 'REJECTED', 'DO_NOT_PUBLISH', 'CONTENT_APPROVED', 'CONTENT_APPROVED_WITH_RESTRICTIONS', 'CONTENT_REJECTED', 'VERIFIED', 'APPROVED', 'CONFIGURED'].includes(status);
    return terminal(row.pricingStatus) && terminal(row.complianceStatus) && row.countryStatus === 'CONFIGURED' && terminal(row.contentStatus) && (row.mediaStatus === 'VERIFIED' || row.doNotPublish) && row.translationStatus === 'APPROVED';
  }

  private static blockerCounts(rows: QueueRow[]) {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      for (const gate of new Set(row.blockers)) counts[gate] = (counts[gate] || 0) + 1;
    }
    return counts;
  }

  private static mutate(
    slugs: string[],
    expectedVersions: Record<string, number>,
    actor: string,
    role: RoleName,
    apply: (record: RolloutProduct) => void,
    action: string,
    rationale: string
  ) {
    const state = this.getState();
    const snap = clone(state);
    try {
      for (const slug of slugs) {
        if (PILOT.has(slug)) throw new Error('Pilot decisions cannot be changed from the rollout queue.');
        const record = state.products[slug];
        if (!record) throw new Error(`${slug} is not in a review batch.`);
        if (record.version !== expectedVersions[slug]) {
          throw new Error('Record changed since it was opened. Reload before saving.');
        }
        const before = clone(record);
        apply(record);
        record.version += 1;
        record.updatedAt = new Date().toISOString();
        this.audit(state, {
          action,
          product: slug,
          category: 'queue',
          beforeValue: before,
          afterValue: { stage: record.stage, version: record.version, reviewer: record.reviewer },
          actor,
          role,
          rationale,
          evidence: record.deferral?.evidence || '',
          source: 'catalogue-rollout',
          batchId: record.batchId || '',
        });
      }
      this.persist();
      return { success: true as const };
    } catch (err: any) {
      this.cached = snap;
      this.indexCache = null;
      return { success: false as const, error: err.message };
    }
  }

  private static assertManager(role?: RoleName) {
    if (role !== 'SUPER_ADMIN' && role !== 'CATALOG_MANAGER') {
      throw new Error(`Unauthorized. Role '${role || 'ANONYMOUS'}' cannot manage review batches.`);
    }
    if (!RBACService.hasPermission(role, '*') && !RBACService.hasPermission(role, 'catalog:write') && !RBACService.hasPermission(role, 'catalog:review')) {
      throw new Error(`Unauthorized. Role '${role}' cannot manage review batches.`);
    }
  }

  private static audit(state: RolloutState, event: Omit<RolloutAuditEvent, 'id' | 'timestamp'>) {
    state.audit.push({ ...event, id: `RB-AUD-${state.audit.length + 1}`, timestamp: new Date().toISOString() });
    this.indexCache = null;
  }

  private static persist() {
    this.indexCache = null;
    if (!this.persistEnabled || !this.cached) return;
    const fs = getFs();
    const path = getPath();
    if (!fs || !path) return;
    const full = path.resolve(process.cwd(), 'src/data/catalogue-rollout-state.json');
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(this.cached, null, 2));
  }
}
