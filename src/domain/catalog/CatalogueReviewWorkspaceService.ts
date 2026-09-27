// ==============================================================================
// FUSION MUSHROOM BARS EU - GUIDED CATALOGUE REVIEW EXECUTION WORKSPACE
// Product-centric human review. Never auto-publishes. Uses existing gates.
// ==============================================================================

import { ComplianceClassification, CountryAvailabilityStatus, LocaleCode, MinorUnits, RoleName } from '@/types';
import {
  CatalogueReviewService,
  ReviewProductItem,
} from '@/domain/catalog/CatalogueReviewService';
import { CatalogueAdjudicationService } from '@/domain/catalog/CatalogueAdjudicationService';
import {
  CatalogueDecisionRecommendationService,
  CatalogueDecisionRecommendation,
  RecommendationPriority,
  RecommendationDecisionType,
} from '@/domain/catalog/CatalogueDecisionRecommendationService';
import { MasterCatalogueImportService } from '@/domain/import/MasterCatalogueImportService';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';

function getFs(): any {
  try {
    if (typeof window === 'undefined') {
      const req = eval('require');
      return req('fs');
    }
  } catch {}
  return null;
}

function getPath(): any {
  try {
    if (typeof window === 'undefined') {
      const req = eval('require');
      return req('path');
    }
  } catch {}
  return null;
}

function cloneJson<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function scrubSecrets(value: any): any {
  if (value == null) return value;
  if (typeof value !== 'object') return value;
  const blocked = /secret|password|token|apikey|api_key|iban|private[_-]?key|mnemonic/i;
  if (Array.isArray(value)) return value.map(scrubSecrets);
  const next: Record<string, any> = {};
  for (const [key, val] of Object.entries(value)) {
    next[key] = blocked.test(key) ? '[REDACTED]' : scrubSecrets(val);
  }
  return next;
}

export type WorkspaceSection =
  | 'IDENTITY'
  | 'STRUCTURE'
  | 'PRICING'
  | 'CATEGORY'
  | 'CONTENT'
  | 'COMPLIANCE'
  | 'COUNTRY AVAILABILITY'
  | 'MEDIA'
  | 'TRANSLATION'
  | 'SEO'
  | 'REVIEWS'
  | 'PUBLICATION READINESS';

export type WorkspaceDecisionAction = 'ACCEPT' | 'REJECT' | 'EDIT' | 'DEFER';

export type WorkspaceAuditAction =
  | 'CATALOGUE_DECISION_ACCEPTED'
  | 'CATALOGUE_DECISION_REJECTED'
  | 'CATALOGUE_DECISION_EDITED'
  | 'CATALOGUE_DECISION_DEFERRED'
  | 'PRODUCT_REVIEW_SAVED'
  | 'PRODUCT_REVIEW_ROLLBACK'
  | 'REVIEW_LOCK_ACQUIRED'
  | 'REVIEW_LOCK_RELEASED'
  | 'REVIEW_LOCK_FORCE_RELEASED'
  | 'REVIEWER_ASSIGNED'
  | 'STRUCTURAL_CHANGE'
  | 'RECOMMENDATION_SUPERSEDED'
  | 'PRODUCT_READY_FOR_PUBLICATION'
  | 'PRODUCT_SUMMARY_STORED';

export interface PendingProductDecision {
  id: string;
  recommendationId?: string | null;
  section: WorkspaceSection;
  action: WorkspaceDecisionAction;
  decisionType: string;
  field: string;
  beforeValue: any;
  afterValue: any;
  proposedAction?: string | null;
  reason: string;
  confirmed: boolean;
  highRisk: boolean;
  confidence?: string | null;
  recommendationText?: string | null;
}

export interface ReviewLock {
  productSlug: string;
  reviewer: string;
  reviewerRole: RoleName;
  startedAt: string;
  expiresAt: string;
}

export interface ProductReviewAssignment {
  productSlug: string;
  role: RoleName;
  actor: string;
  assignedAt: string;
}

export interface ProductReviewSummary {
  productSlug: string;
  productName: string;
  decisionsMade: number;
  deferred: number;
  blocked: number;
  publication: 'NOT_READY' | 'READY_FOR_PUBLICATION' | 'BLOCKED';
  reasons: string[];
  completedAt: string;
  actor: string;
  actorRole: RoleName;
}

export interface WorkspaceAudit {
  id: string;
  action: WorkspaceAuditAction;
  actor: string;
  actorRole: RoleName;
  timestamp: string;
  product: string;
  field: string;
  beforeValue: any;
  afterValue: any;
  recommendation?: string | null;
  confidence?: string | null;
  decision?: string | null;
  reason: string;
}

export interface WorkspaceState {
  version: number;
  lastUpdated: string;
  locks: Record<string, ReviewLock>;
  assignments: Record<string, ProductReviewAssignment>;
  pendingBundles: Record<string, PendingProductDecision[]>;
  summaries: Record<string, ProductReviewSummary>;
  fullyReviewed: string[];
  partiallyReviewed: string[];
  auditTrail: WorkspaceAudit[];
  lockTtlMs: number;
}

const SECTION_MAP: Record<string, WorkspaceSection> = {
  DUPLICATE_IDENTITY: 'IDENTITY',
  FIELD_RECONCILIATION: 'IDENTITY',
  EXACT_MATCH_CONSENSUS: 'IDENTITY',
  VARIANT_GROUPING: 'STRUCTURE',
  CATEGORY_MAPPING: 'CATEGORY',
  PRICING_CLASSIFICATION: 'PRICING',
  COMPLIANCE_DATA_REVIEW: 'COMPLIANCE',
  CONTENT_FLAGS: 'CONTENT',
  COUNTRY_CONFIGURATION: 'COUNTRY AVAILABILITY',
  MEDIA_QUALITY: 'MEDIA',
  TRANSLATION_REQUIRED: 'TRANSLATION',
  REVIEW_QUALITY: 'REVIEWS',
  PUBLICATION_READINESS: 'PUBLICATION READINESS',
};

const PRIORITY_ORDER: RecommendationPriority[] = ['P0', 'P1', 'P2', 'P3'];

export class CatalogueReviewWorkspaceService {
  private static cachedState: WorkspaceState | null = null;
  private static persistEnabled = true;
  private static readonly STATE_FILE_PATH = 'src/data/catalogue-review-workspace-state.json';
  private static readonly DEFAULT_LOCK_TTL_MS = 30 * 60 * 1000;

  static setPersistenceEnabled(enabled: boolean): void {
    this.persistEnabled = enabled;
  }

  static clearCache(): void {
    this.cachedState = null;
  }

  static resetStateForTests(state?: WorkspaceState): WorkspaceState {
    this.persistEnabled = false;
    this.cachedState = state || this.emptyState();
    return this.cachedState;
  }

  private static emptyState(): WorkspaceState {
    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      locks: {},
      assignments: {},
      pendingBundles: {},
      summaries: {},
      fullyReviewed: [],
      partiallyReviewed: [],
      auditTrail: [],
      lockTtlMs: this.DEFAULT_LOCK_TTL_MS,
    };
  }

  static getState(): WorkspaceState {
    if (this.cachedState) return this.cachedState;
    const fs = getFs();
    const path = getPath();
    if (this.persistEnabled && fs && path) {
      const fullPath = path.resolve(process.cwd(), this.STATE_FILE_PATH);
      if (fs.existsSync(fullPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (parsed?.locks) {
            this.cachedState = parsed;
            return this.cachedState!;
          }
        } catch (err: any) {
          console.warn('Could not read review workspace state:', err.message);
        }
      }
    }
    this.cachedState = this.emptyState();
    this.persist();
    return this.cachedState;
  }

  private static persist(): boolean {
    if (!this.cachedState || !this.persistEnabled) return false;
    this.cachedState.lastUpdated = new Date().toISOString();
    const fs = getFs();
    const path = getPath();
    if (!fs || !path) return false;
    try {
      const fullPath = path.resolve(process.cwd(), this.STATE_FILE_PATH);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, JSON.stringify(this.cachedState, null, 2), 'utf8');
      return true;
    } catch (err: any) {
      console.error('Failed to persist review workspace state:', err.message);
      return false;
    }
  }

  private static requireActor(actor?: string, role?: RoleName) {
    if (!actor?.trim()) throw new Error('An authenticated human actor is required.');
    if (!role || !['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'].includes(role)) {
      throw new Error(`Role ${role || 'ANONYMOUS'} is not authorized for the review workspace.`);
    }
  }

  private static audit(entry: Omit<WorkspaceAudit, 'id' | 'timestamp'>) {
    const state = this.getState();
    state.auditTrail.push({
      ...entry,
      id: `WS-AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      beforeValue: scrubSecrets(entry.beforeValue),
      afterValue: scrubSecrets(entry.afterValue),
    });
  }

  private static ensureRecommendationsGenerated() {
    const recState = CatalogueDecisionRecommendationService.getState();
    if (!recState.lastGeneratedAt || Object.keys(recState.recommendations).length === 0) {
      CatalogueDecisionRecommendationService.generateAll();
    }
  }

  // --------------------------------------------------------------------------
  // LOCKING
  // --------------------------------------------------------------------------

  static acquireLock(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; lock?: ReviewLock; error?: string; heldBy?: ReviewLock } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const now = Date.now();
      const existing = state.locks[params.productSlug];
      if (existing && new Date(existing.expiresAt).getTime() > now) {
        if (existing.reviewer === params.actor) {
          existing.expiresAt = new Date(now + state.lockTtlMs).toISOString();
          this.persist();
          return { success: true, lock: existing };
        }
        return {
          success: false,
          error: `Currently being reviewed by ${existing.reviewerRole}/${existing.reviewer}.`,
          heldBy: existing,
        };
      }
      const lock: ReviewLock = {
        productSlug: params.productSlug,
        reviewer: params.actor,
        reviewerRole: params.actorRole,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(now + state.lockTtlMs).toISOString(),
      };
      state.locks[params.productSlug] = lock;
      this.audit({
        action: 'REVIEW_LOCK_ACQUIRED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'lock',
        beforeValue: existing || null,
        afterValue: lock,
        reason: 'Acquired product review lock',
      });
      this.persist();
      return { success: true, lock };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static releaseLock(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    force?: boolean;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const existing = state.locks[params.productSlug];
      if (!existing) return { success: true };
      if (!params.force && existing.reviewer !== params.actor && params.actorRole !== 'SUPER_ADMIN') {
        return { success: false, error: 'Only the lock holder or SUPER_ADMIN may release this lock.' };
      }
      if (params.force && params.actorRole !== 'SUPER_ADMIN') {
        return { success: false, error: 'Only SUPER_ADMIN may force-release stale locks.' };
      }
      delete state.locks[params.productSlug];
      this.audit({
        action: params.force ? 'REVIEW_LOCK_FORCE_RELEASED' : 'REVIEW_LOCK_RELEASED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'lock',
        beforeValue: existing,
        afterValue: null,
        reason: params.force ? 'SUPER_ADMIN released stale lock' : 'Released product review lock',
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static getLock(productSlug: string): ReviewLock | null {
    const lock = this.getState().locks[productSlug];
    if (!lock) return null;
    if (new Date(lock.expiresAt).getTime() <= Date.now()) return null;
    return lock;
  }

  // --------------------------------------------------------------------------
  // ASSIGNMENT
  // --------------------------------------------------------------------------

  static assignReviewer(params: {
    productSlug: string;
    role: RoleName;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'].includes(params.role)) {
        return { success: false, error: 'Invalid assignee role.' };
      }
      const state = this.getState();
      const before = state.assignments[params.productSlug] || null;
      state.assignments[params.productSlug] = {
        productSlug: params.productSlug,
        role: params.role,
        actor: params.actor,
        assignedAt: new Date().toISOString(),
      };
      this.audit({
        action: 'REVIEWER_ASSIGNED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'primaryReviewer',
        beforeValue: before,
        afterValue: state.assignments[params.productSlug],
        reason: `Assigned primary reviewer role ${params.role}`,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --------------------------------------------------------------------------
  // PRODUCT VIEW
  // --------------------------------------------------------------------------

  static getProgress() {
    this.ensureRecommendationsGenerated();
    const products = Object.values(CatalogueReviewService.getState().products);
    const state = this.getState();
    const recs = CatalogueDecisionRecommendationService.getRecommendations();
    const countResolved = (priority: RecommendationPriority) => {
      const all = recs.filter((r) => r.priority === priority);
      const resolved = all.filter((r) =>
        ['ACCEPTED', 'REJECTED', 'SUPERSEDED_BY_HUMAN_DECISION'].includes(r.reviewStatus)
      );
      return { resolved: resolved.length, total: all.length };
    };
    return {
      totalProducts: products.length,
      fullyReviewed: state.fullyReviewed.length,
      partiallyReviewed: state.partiallyReviewed.filter((s) => !state.fullyReviewed.includes(s)).length,
      remaining: products.length - state.fullyReviewed.length,
      p0: countResolved('P0'),
      p1: countResolved('P1'),
      p2: countResolved('P2'),
      p3: countResolved('P3'),
      readyForPublication: CatalogueAdjudicationService.getState().readyForPublication.length,
      published: CatalogueAdjudicationService.getState().published.length,
      blocked: products.filter((p) => p.publicationStatus === 'BLOCKED' || p.complianceClassification === 'BLOCKED').length,
    };
  }

  static listProductsForQueue(priorityFilter: RecommendationPriority | 'ALL' = 'P0'): Array<{
    slug: string;
    name: string;
    priorityCounts: Record<RecommendationPriority, number>;
    outstanding: number;
    maxPriority: RecommendationPriority | null;
  }> {
    this.ensureRecommendationsGenerated();
    const products = Object.values(CatalogueReviewService.getState().products);
    const fully = new Set(this.getState().fullyReviewed);
    const rows = products
      .filter((p) => !fully.has(p.canonicalSlug))
      .map((p) => {
        const outstanding = CatalogueDecisionRecommendationService.getRecommendations({
          productSlug: p.canonicalSlug,
          status: 'SUGGESTED',
        });
        const priorityCounts: Record<RecommendationPriority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
        for (const r of outstanding) priorityCounts[r.priority]++;
        const maxPriority =
          PRIORITY_ORDER.find((pr) => priorityCounts[pr] > 0) ||
          (outstanding.length === 0 ? null : ('P3' as RecommendationPriority));
        return {
          slug: p.canonicalSlug,
          name: p.name,
          priorityCounts,
          outstanding: outstanding.length,
          maxPriority,
        };
      })
      .filter((row) => {
        if (priorityFilter === 'ALL') return true;
        // P0-first: only show products that still have that priority unresolved,
        // unless reviewer explicitly selects a lower priority filter.
        if (priorityFilter === 'P0') return (row.priorityCounts.P0 || 0) > 0 || row.outstanding === 0;
        if (priorityFilter === 'P1') return row.priorityCounts.P0 === 0 && row.priorityCounts.P1 > 0;
        if (priorityFilter === 'P2')
          return row.priorityCounts.P0 === 0 && row.priorityCounts.P1 === 0 && row.priorityCounts.P2 > 0;
        return row.priorityCounts.P0 === 0 && row.priorityCounts.P1 === 0 && row.priorityCounts.P2 === 0;
      })
      .sort((a, b) => {
        const ai = PRIORITY_ORDER.indexOf(a.maxPriority || 'P3');
        const bi = PRIORITY_ORDER.indexOf(b.maxPriority || 'P3');
        return ai - bi || a.slug.localeCompare(b.slug);
      });
    return rows;
  }

  static getNextProductSlug(currentSlug?: string, priorityFilter: RecommendationPriority | 'ALL' = 'P0'): string | null {
    const list = this.listProductsForQueue(priorityFilter);
    if (!currentSlug) return list[0]?.slug || null;
    const idx = list.findIndex((p) => p.slug === currentSlug);
    if (idx >= 0 && idx + 1 < list.length) return list[idx + 1].slug;
    return list.find((p) => p.slug !== currentSlug)?.slug || null;
  }

  static getProductWorkspace(productSlug: string, priorityFilter: RecommendationPriority | 'ALL' = 'P0') {
    this.ensureRecommendationsGenerated();
    const product = CatalogueReviewService.getProductDetail(productSlug);
    if (!product) return null;

    let recommendations = CatalogueDecisionRecommendationService.getRecommendations({
      productSlug,
    }).filter((r) => r.reviewStatus === 'SUGGESTED' || r.reviewStatus === 'DEFERRED');

    // Also include match-group / category / flavour recs linked via entity
    const extras = CatalogueDecisionRecommendationService.getRecommendations().filter((r) => {
      if (r.productSlug === productSlug) return false;
      if (r.decisionType === 'DUPLICATE_IDENTITY') {
        return (r.conflicts as any)?.slugs?.includes?.(productSlug) || r.entityId.includes(productSlug);
      }
      if (r.decisionType === 'VARIANT_GROUPING' && r.productSlug === productSlug) return true;
      return false;
    });
    const byId = new Map<string, CatalogueDecisionRecommendation>();
    [...recommendations, ...extras].forEach((r) => byId.set(r.id, r));
    recommendations = [...byId.values()];

    const hasP0 = recommendations.some((r) => r.priority === 'P0' && r.reviewStatus === 'SUGGESTED');
    if (priorityFilter !== 'ALL' && hasP0 && priorityFilter !== 'P0') {
      // Do not distract with lower priorities while P0 remains — unless ALL explicitly chosen
      recommendations = recommendations.filter((r) => r.priority === 'P0' || r.reviewStatus !== 'SUGGESTED');
    } else if (priorityFilter !== 'ALL') {
      recommendations = recommendations.filter((r) => r.priority === priorityFilter || r.reviewStatus !== 'SUGGESTED');
    }

    const priorityCounts: Record<RecommendationPriority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    for (const r of CatalogueDecisionRecommendationService.getRecommendations({ productSlug })) {
      if (r.reviewStatus === 'SUGGESTED') priorityCounts[r.priority]++;
    }

    const grouped: Record<WorkspaceSection, CatalogueDecisionRecommendation[]> = {
      IDENTITY: [],
      STRUCTURE: [],
      PRICING: [],
      CATEGORY: [],
      CONTENT: [],
      COMPLIANCE: [],
      'COUNTRY AVAILABILITY': [],
      MEDIA: [],
      TRANSLATION: [],
      SEO: [],
      REVIEWS: [],
      'PUBLICATION READINESS': [],
    };
    for (const r of recommendations) {
      const section = SECTION_MAP[r.decisionType] || 'IDENTITY';
      grouped[section].push(r);
    }

    const checklist = CatalogueDecisionRecommendationService.getPublicationChecklist(productSlug);
    const readiness = CatalogueReviewService.evaluatePublicationReadiness(product);
    const state = this.getState();

    return {
      product,
      header: {
        name: product.name,
        productId: product.id,
        slug: product.canonicalSlug,
        sku: product.sku,
        currentStatus: product.publicationStatus,
        reviewStatus: product.reviewStatus,
        complianceStatus: product.complianceClassification,
        pricingStatus: product.pricingReviewRequired ? 'PRICING_REVIEW_REQUIRED' : product.priceEUR ? 'HAS_EU_PRICE' : 'MISSING_PRICE',
        countryStatus: Object.values(product.countryAvailability || {}).some((s) => s === 'AVAILABLE')
          ? 'CONFIGURED'
          : 'NOT_CONFIGURED',
        recommendationCount: Object.values(priorityCounts).reduce((a, b) => a + b, 0),
        priorityCounts,
      },
      sourceEvidence: this.buildSourceEvidence(product),
      groupedRecommendations: grouped,
      pendingBundle: state.pendingBundles[productSlug] || [],
      lock: this.getLock(productSlug),
      assignment: state.assignments[productSlug] || null,
      checklist,
      readinessGates: {
        Identity: readiness.validProduct ? 'READY' : 'BLOCKED',
        Variant: readiness.validVariant ? 'READY' : 'BLOCKED',
        SKU: readiness.validSku ? 'READY' : 'BLOCKED',
        Price: readiness.validPrice ? 'READY' : 'PENDING',
        Category: readiness.validCategory ? 'READY' : 'BLOCKED',
        'Primary Image': readiness.primaryImage ? 'READY' : 'BLOCKED',
        Content: readiness.contentApproved ? 'READY' : 'PENDING',
        Compliance: readiness.complianceApproved ? 'READY' : 'PENDING',
        Countries: readiness.countryAvailability ? 'READY' : 'PENDING',
        Translation: readiness.translation ? 'READY' : 'PENDING',
        SEO: readiness.seo ? 'READY' : 'PENDING',
        Inventory: readiness.inventory ? 'READY' : 'PENDING',
      },
      flavourGroups: CatalogueAdjudicationService.getFlavourGroups().filter(
        (g) => g.parentSlug === productSlug || g.candidateSlugs.includes(productSlug)
      ),
      europeanCountries: CountryRegistry.getAllCountries().filter((c) => c.isEuropean),
      summary: state.summaries[productSlug] || null,
      isFullyReviewed: state.fullyReviewed.includes(productSlug),
      translations: CatalogueAdjudicationService.getState().translations[productSlug] || null,
    };
  }

  private static buildSourceEvidence(product: ReviewProductItem) {
    const panel: Record<string, any> = {
      REFERENCE_WEBSITE: null,
      REPOSITORY_A: null,
      REPOSITORY_B: null,
      CURRENT_EU_DATA: {
        name: product.name,
        slug: product.canonicalSlug,
        sku: product.sku,
        priceEUR: product.priceEUR,
        priceGBP: product.priceGBP,
        category: product.categoryName,
        description: product.description,
        primaryImage: product.primaryImage,
      },
    };
    const mapKey: Record<string, string> = {
      reference: 'REFERENCE_WEBSITE',
      repoA: 'REPOSITORY_A',
      repoB: 'REPOSITORY_B',
    };
    for (const [key, label] of Object.entries(mapKey)) {
      const raw = (product.sources as any)[key];
      const prov = (product.sourceProvenance as any)[key];
      if (!raw && !prov) continue;
      panel[label] = {
        sourceUrl: raw?.sourcePermalink || raw?.sourceCanonicalUrl || prov?.sourceUrl || null,
        sourceFile: raw?.sourceFilePath || prov?.sourceFile || null,
        sourceRecordId: raw?.id || raw?.sourceRecordId || prov?.recordId || null,
        commitSha: null,
        sourceHash: raw?.sourceHash || prov?.hash || null,
        name: raw?.rawPayload?.name || raw?.sourceSlug || null,
        sku: raw?.sourceSku ?? null,
        price: raw?.sourcePrice ?? null,
        currency: raw?.sourceCurrency ?? null,
      };
    }
    return panel;
  }

  // --------------------------------------------------------------------------
  // PENDING BUNDLE (unsaved decisions are not final)
  // --------------------------------------------------------------------------

  static stageDecision(params: {
    productSlug: string;
    decision: Omit<PendingProductDecision, 'id'>;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string; pending?: PendingProductDecision[] } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const lock = this.getLock(params.productSlug);
      if (lock && lock.reviewer !== params.actor) {
        return { success: false, error: `Currently being reviewed by ${lock.reviewerRole}/${lock.reviewer}.` };
      }
      if (params.decision.highRisk && params.decision.action === 'ACCEPT' && !params.decision.reason?.trim()) {
        return { success: false, error: 'High-risk decisions require a decision reason.' };
      }
      if (params.decision.action === 'ACCEPT' && !params.decision.confirmed) {
        return { success: false, error: 'ACCEPT requires CONFIRM before staging.' };
      }
      const state = this.getState();
      const bundle = state.pendingBundles[params.productSlug] || [];
      const pending: PendingProductDecision = {
        ...params.decision,
        id: `PEND-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      };
      const filtered = bundle.filter(
        (d) => !(d.recommendationId && pending.recommendationId && d.recommendationId === pending.recommendationId)
      );
      filtered.push(pending);
      state.pendingBundles[params.productSlug] = filtered;
      if (!state.partiallyReviewed.includes(params.productSlug)) {
        state.partiallyReviewed.push(params.productSlug);
      }
      this.persist();
      return { success: true, pending: filtered };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static clearPending(productSlug: string) {
    const state = this.getState();
    delete state.pendingBundles[productSlug];
    this.persist();
  }

  // --------------------------------------------------------------------------
  // DIRECT WORKFLOWS (stageable helpers for UI)
  // --------------------------------------------------------------------------

  static stagePricingDecision(params: {
    productSlug: string;
    decision: 'APPROVE_CURRENT_EU_PRICE' | 'SET_EUR' | 'SET_GBP' | 'KEEP_UNRESOLVED' | 'DEFER';
    priceEUR?: MinorUnits;
    priceGBP?: MinorUnits;
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    const product = CatalogueReviewService.getProductDetail(params.productSlug);
    if (!product) return { success: false, error: 'Product not found.' };
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'PRICING',
        action: params.decision === 'DEFER' ? 'DEFER' : 'ACCEPT',
        decisionType: 'PRICING_DECISION',
        field: 'price',
        beforeValue: { eur: product.priceEUR, gbp: product.priceGBP },
        afterValue: {
          decision: params.decision,
          priceEUR: params.priceEUR,
          priceGBP: params.priceGBP,
        },
        proposedAction: params.decision,
        reason: params.reason,
        confirmed: params.confirm,
        highRisk: true,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageComplianceDecision(params: {
    productSlug: string;
    classification: ComplianceClassification;
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    const product = CatalogueReviewService.getProductDetail(params.productSlug);
    if (!product) return { success: false, error: 'Product not found.' };
    const highRisk =
      /vaporizer|cannabinoid|psychoactive|capsule|botanical/i.test(
        `${product.productType} ${product.name} ${product.originalSourceContent}`
      ) || product.contentFlags.some((f) => /PSYCHOACTIVE|THERAPEUTIC/i.test(f));
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'COMPLIANCE',
        action: 'ACCEPT',
        decisionType: 'COMPLIANCE_DECISION',
        field: 'complianceClassification',
        beforeValue: product.complianceClassification,
        afterValue: params.classification,
        proposedAction: params.classification,
        reason: params.reason,
        confirmed: params.confirm,
        highRisk: true,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageCountryDecision(params: {
    productSlug: string;
    countryCode: string;
    status: CountryAvailabilityStatus;
    reason?: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    if ((params.status === 'RESTRICTED' || params.status === 'BLOCKED') && !params.reason?.trim()) {
      return { success: false, error: 'RESTRICTED and BLOCKED require a reason.' };
    }
    const product = CatalogueReviewService.getProductDetail(params.productSlug);
    if (!product) return { success: false, error: 'Product not found.' };
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'COUNTRY AVAILABILITY',
        action: 'ACCEPT',
        decisionType: 'COUNTRY_DECISION',
        field: `country:${params.countryCode}`,
        beforeValue: product.countryAvailability?.[params.countryCode] || 'NOT_CONFIGURED',
        afterValue: { countryCode: params.countryCode, status: params.status },
        proposedAction: params.status,
        reason: params.reason || `Set ${params.countryCode} to ${params.status}`,
        confirmed: params.confirm,
        highRisk: true,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageContentDecision(params: {
    productSlug: string;
    action: 'APPROVE' | 'REWRITE' | 'BLOCK' | 'DEFER';
    rewrittenContent?: string;
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    if (params.action === 'REWRITE' && !params.rewrittenContent?.trim()) {
      return { success: false, error: 'REWRITE requires approved content entry.' };
    }
    const product = CatalogueReviewService.getProductDetail(params.productSlug);
    if (!product) return { success: false, error: 'Product not found.' };
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'CONTENT',
        action: params.action === 'DEFER' ? 'DEFER' : 'ACCEPT',
        decisionType: 'CONTENT_DECISION',
        field: 'approvedStoreContent',
        beforeValue: { original: product.originalSourceContent, approved: product.approvedStoreContent },
        afterValue: { action: params.action, rewrittenContent: params.rewrittenContent || null },
        proposedAction: params.action,
        reason: params.reason,
        confirmed: params.confirm || params.action === 'DEFER',
        highRisk: params.action !== 'APPROVE',
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageVariantDecision(params: {
    groupId: string;
    productSlug: string;
    decision: 'MERGE_AS_VARIANTS' | 'KEEP_SEPARATE' | 'DEFER';
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    if (params.decision === 'MERGE_AS_VARIANTS' && !params.confirm) {
      return { success: false, error: 'MERGE AS VARIANTS requires explicit confirmation.' };
    }
    const group = CatalogueAdjudicationService.getFlavourGroups().find((g) => g.id === params.groupId);
    if (!group) return { success: false, error: 'Flavour group not found.' };
    const candidates = group.candidateSlugs.map((slug) => CatalogueReviewService.getProductDetail(slug)).filter(Boolean);
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'STRUCTURE',
        action: params.decision === 'DEFER' ? 'DEFER' : 'ACCEPT',
        decisionType: 'VARIANT_STRUCTURE_DECISION',
        field: 'variantStructure',
        beforeValue: { group },
        afterValue: {
          decision: params.decision,
          groupId: params.groupId,
          preview: {
            parent: group.parentSlug,
            candidates: candidates.map((c) => ({
              slug: c!.canonicalSlug,
              sku: c!.sku,
              image: c!.primaryImage,
              priceEUR: c!.priceEUR,
              sourceUrls: Object.values(c!.sourceProvenance || {}).map((p: any) => p?.sourceUrl).filter(Boolean),
              sourceRecordCount: c!.retainedSourceMappings?.length || 0,
            })),
          },
        },
        proposedAction: params.decision,
        reason: params.reason,
        confirmed: params.confirm || params.decision === 'DEFER',
        highRisk: true,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageMediaDecision(params: {
    productSlug: string;
    mediaId: string;
    action: 'SET_PRIMARY' | 'KEEP' | 'REJECT' | 'MARK_MISSING';
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'MEDIA',
        action: 'ACCEPT',
        decisionType: 'MEDIA_DECISION',
        field: params.mediaId,
        beforeValue: null,
        afterValue: { mediaId: params.mediaId, action: params.action },
        proposedAction: params.action,
        reason: params.reason,
        confirmed: params.confirm,
        highRisk: false,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageTranslationDecision(params: {
    productSlug: string;
    locale: Exclude<LocaleCode, 'en'>;
    value: string;
    approve: boolean;
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'TRANSLATION',
        action: 'ACCEPT',
        decisionType: 'TRANSLATION_DECISION',
        field: `translation:${params.locale}`,
        beforeValue: CatalogueAdjudicationService.getState().translations[params.productSlug]?.locales[params.locale] || null,
        afterValue: { locale: params.locale, value: params.value, approve: params.approve },
        proposedAction: params.approve ? 'APPROVE' : 'DRAFT',
        reason: params.reason,
        confirmed: params.confirm,
        highRisk: params.approve,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageSeoDecision(params: {
    productSlug: string;
    action: 'APPROVE' | 'EDIT' | 'DEFER';
    title?: string;
    description?: string;
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    const product = CatalogueReviewService.getProductDetail(params.productSlug);
    if (!product) return { success: false, error: 'Product not found.' };
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'SEO',
        action: params.action === 'DEFER' ? 'DEFER' : 'ACCEPT',
        decisionType: 'SEO_DECISION',
        field: 'seo',
        beforeValue: product.seo,
        afterValue: { action: params.action, title: params.title, description: params.description },
        proposedAction: params.action,
        reason: params.reason,
        confirmed: params.confirm || params.action === 'DEFER',
        highRisk: false,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageReviewModeration(params: {
    productSlug: string;
    reviewId: string;
    action: 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'DEFER';
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: null,
        section: 'REVIEWS',
        action: params.action === 'DEFER' ? 'DEFER' : 'ACCEPT',
        decisionType: 'REVIEW_MODERATION',
        field: params.reviewId,
        beforeValue: 'STAGED',
        afterValue: { reviewId: params.reviewId, action: params.action },
        proposedAction: params.action,
        reason: params.reason,
        confirmed: params.confirm || params.action === 'DEFER',
        highRisk: false,
        confidence: null,
        recommendationText: null,
      },
    });
  }

  static stageRecommendationAction(params: {
    productSlug: string;
    recommendationId: string;
    action: WorkspaceDecisionAction;
    reason: string;
    editedValue?: any;
    actor: string;
    actorRole: RoleName;
    confirm: boolean;
  }) {
    const rec = CatalogueDecisionRecommendationService.getRecommendation(params.recommendationId);
    if (!rec) return { success: false, error: 'Recommendation not found.' };
    return this.stageDecision({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      decision: {
        recommendationId: params.recommendationId,
        section: SECTION_MAP[rec.decisionType] || 'IDENTITY',
        action: params.action,
        decisionType: rec.decisionType,
        field: rec.entityId,
        beforeValue: rec.currentValue,
        afterValue: params.action === 'EDIT' ? params.editedValue ?? rec.proposedValue : rec.proposedValue,
        proposedAction: rec.proposedAction,
        reason: params.reason,
        confirmed: params.confirm || params.action === 'DEFER' || params.action === 'REJECT',
        highRisk: rec.highRisk,
        confidence: rec.confidence,
        recommendationText: rec.recommendation,
      },
    });
  }

  // --------------------------------------------------------------------------
  // SAVE PRODUCT REVIEW (transactional bundle)
  // --------------------------------------------------------------------------

  static saveProductReview(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason?: string;
  }): { success: boolean; error?: string; summary?: ProductReviewSummary } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const lock = this.getLock(params.productSlug);
      if (lock && lock.reviewer !== params.actor && params.actorRole !== 'SUPER_ADMIN') {
        return { success: false, error: `Currently being reviewed by ${lock.reviewerRole}/${lock.reviewer}.` };
      }

      const state = this.getState();
      const bundle = [...(state.pendingBundles[params.productSlug] || [])];
      if (bundle.length === 0) {
        return { success: false, error: 'No confirmed staged decisions to save for this product.' };
      }
      for (const d of bundle) {
        if (d.action === 'ACCEPT' && !d.confirmed) {
          return { success: false, error: `Unconfirmed decision in bundle: ${d.field}` };
        }
        if (d.highRisk && d.action === 'ACCEPT' && !d.reason?.trim()) {
          return { success: false, error: `High-risk decision missing reason: ${d.field}` };
        }
      }

      // Snapshot for rollback
      const reviewSnap = cloneJson(CatalogueReviewService.getState());
      const adjSnap = cloneJson(CatalogueAdjudicationService.getState());
      const recSnap = cloneJson(CatalogueDecisionRecommendationService.getState());
      const workspaceSnap = cloneJson(state);
      const persistWas = this.persistEnabled;

      try {
        for (const decision of bundle) {
          this.applyDecision(params.productSlug, decision, params.actor, params.actorRole);
        }

        // Supersede redundant duplicate-identity recommendations after identity merge/separate
        this.propagateSupersedes(params.productSlug, bundle, params.actor, params.actorRole);

        const product = CatalogueReviewService.getProductDetail(params.productSlug);
        if (!product) throw new Error('Product missing after save.');

        const readiness = CatalogueReviewService.evaluatePublicationReadiness(product);
        let publication: ProductReviewSummary['publication'] = 'NOT_READY';
        if (product.publicationStatus === 'BLOCKED' || product.complianceClassification === 'BLOCKED') {
          publication = 'BLOCKED';
        } else if (readiness.isReadyToPublish) {
          const ready = CatalogueAdjudicationService.markReadyForPublication({
            productSlug: params.productSlug,
            actor: params.actor,
            actorRole: params.actorRole,
            reason: params.reason || 'All required gates satisfied after product review save',
          });
          if (ready.success) {
            publication = 'READY_FOR_PUBLICATION';
            this.audit({
              action: 'PRODUCT_READY_FOR_PUBLICATION',
              actor: params.actor,
              actorRole: params.actorRole,
              product: params.productSlug,
              field: 'publicationReadiness',
              beforeValue: 'NOT_READY',
              afterValue: 'READY_FOR_PUBLICATION',
              reason: 'Gates satisfied — not published',
            });
          }
        }

        const deferred = bundle.filter((d) => d.action === 'DEFER').length;
        const blocked = publication === 'BLOCKED' ? 1 : 0;
        const summary: ProductReviewSummary = {
          productSlug: params.productSlug,
          productName: product.name,
          decisionsMade: bundle.filter((d) => d.action !== 'DEFER').length,
          deferred,
          blocked,
          publication,
          reasons: readiness.blockers,
          completedAt: new Date().toISOString(),
          actor: params.actor,
          actorRole: params.actorRole,
        };

        const ws = this.getState();
        ws.summaries[params.productSlug] = summary;
        delete ws.pendingBundles[params.productSlug];

        const outstanding = CatalogueDecisionRecommendationService.getRecommendations({
          productSlug: params.productSlug,
          status: 'SUGGESTED',
        });
        const requiredComplete = readiness.isReadyToPublish || publication === 'BLOCKED';
        const hasOutstandingP0P1 = outstanding.some((r) => r.priority === 'P0' || r.priority === 'P1');
        if (!hasOutstandingP0P1 && requiredComplete) {
          if (!ws.fullyReviewed.includes(params.productSlug)) ws.fullyReviewed.push(params.productSlug);
        } else if (!ws.partiallyReviewed.includes(params.productSlug)) {
          ws.partiallyReviewed.push(params.productSlug);
        }

        this.audit({
          action: 'PRODUCT_REVIEW_SAVED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'productReviewBundle',
          beforeValue: { pendingCount: bundle.length },
          afterValue: summary,
          reason: params.reason || 'Product-level decision bundle saved',
        });
        this.audit({
          action: 'PRODUCT_SUMMARY_STORED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'summary',
          beforeValue: null,
          afterValue: summary,
          reason: 'Stored product review summary',
        });
        this.persist();
        return { success: true, summary };
      } catch (applyErr: any) {
        CatalogueReviewService.resetStateForTests(reviewSnap);
        CatalogueReviewService.setPersistenceEnabled(persistWas);
        CatalogueAdjudicationService.resetStateForTests(adjSnap);
        CatalogueAdjudicationService.setPersistenceEnabled(persistWas);
        CatalogueDecisionRecommendationService.resetStateForTests(recSnap);
        CatalogueDecisionRecommendationService.setPersistenceEnabled(persistWas);
        this.cachedState = workspaceSnap;
        this.persistEnabled = persistWas;
        this.audit({
          action: 'PRODUCT_REVIEW_ROLLBACK',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'productReviewBundle',
          beforeValue: null,
          afterValue: null,
          reason: `Rollback after failure: ${applyErr.message}`,
        });
        this.persist();
        return { success: false, error: `Transaction rolled back: ${applyErr.message}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private static applyDecision(
    productSlug: string,
    decision: PendingProductDecision,
    actor: string,
    actorRole: RoleName
  ) {
    const mapAudit = (action: WorkspaceAuditAction) => {
      this.audit({
        action,
        actor,
        actorRole,
        product: productSlug,
        field: decision.field,
        beforeValue: decision.beforeValue,
        afterValue: decision.afterValue,
        recommendation: decision.recommendationText,
        confidence: decision.confidence,
        decision: decision.action,
        reason: decision.reason,
      });
    };

    if (decision.action === 'REJECT' && decision.recommendationId) {
      const res = CatalogueDecisionRecommendationService.rejectRecommendation({
        id: decision.recommendationId,
        actor,
        actorRole,
        reason: decision.reason,
      });
      if (!res.success) throw new Error(res.error || 'Reject failed');
      mapAudit('CATALOGUE_DECISION_REJECTED');
      return;
    }

    if (decision.action === 'DEFER') {
      if (decision.recommendationId) {
        const res = CatalogueDecisionRecommendationService.deferRecommendation({
          id: decision.recommendationId,
          actor,
          actorRole,
          reason: decision.reason,
        });
        if (!res.success) throw new Error(res.error || 'Defer failed');
      }
      mapAudit('CATALOGUE_DECISION_DEFERRED');
      return;
    }

    if (decision.action === 'EDIT' && decision.recommendationId) {
      const res = CatalogueDecisionRecommendationService.editRecommendation({
        id: decision.recommendationId,
        actor,
        actorRole,
        reason: decision.reason,
        proposedValue: decision.afterValue,
      });
      if (!res.success) throw new Error(res.error || 'Edit failed');
      mapAudit('CATALOGUE_DECISION_EDITED');
      // EDIT alone does not apply — must also ACCEPT; if staged as EDIT only, stop here
      return;
    }

    // ACCEPT paths
    if (decision.recommendationId) {
      const res = CatalogueDecisionRecommendationService.acceptRecommendation({
        id: decision.recommendationId,
        actor,
        actorRole,
        reason: decision.reason,
        confirm: true,
      });
      if (!res.success) throw new Error(res.error || 'Accept recommendation failed');
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'PRICING_DECISION') {
      const after = decision.afterValue || {};
      const mapped =
        after.decision === 'APPROVE_CURRENT_EU_PRICE'
          ? 'APPROVE_EXISTING_EU_PRICE'
          : after.decision === 'SET_EUR'
            ? 'SET_EUR_PRICE'
            : after.decision === 'SET_GBP'
              ? 'SET_GBP_PRICE'
              : after.decision === 'KEEP_UNRESOLVED'
                ? 'MARK_PRICING_UNRESOLVED'
                : 'DEFER';
      const res = CatalogueAdjudicationService.adjudicatePricing({
        productSlug,
        decision: mapped as any,
        priceEUR: after.priceEUR,
        priceGBP: after.priceGBP,
        reason: decision.reason,
        actor,
        actorRole,
      });
      if (!res.success) throw new Error(res.error || 'Pricing decision failed');
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'COMPLIANCE_DECISION') {
      const res = CatalogueAdjudicationService.adjudicateCompliance({
        productSlug,
        classification: decision.afterValue,
        reason: decision.reason,
        actor,
        actorRole,
      });
      if (!res.success) throw new Error(res.error || 'Compliance decision failed');
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'COUNTRY_DECISION') {
      const res = CatalogueAdjudicationService.adjudicateCountry({
        productSlug,
        countryCode: decision.afterValue.countryCode,
        status: decision.afterValue.status,
        reason: decision.reason,
        actor,
        actorRole,
      });
      if (!res.success) throw new Error(res.error || 'Country decision failed');
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'CONTENT_DECISION') {
      const res = CatalogueAdjudicationService.adjudicateContent({
        productSlug,
        action: decision.afterValue.action,
        rewrittenContent: decision.afterValue.rewrittenContent || undefined,
        reason: decision.reason,
        actor,
        actorRole,
      });
      if (!res.success) throw new Error(res.error || 'Content decision failed');
      const after = CatalogueReviewService.getProductDetail(productSlug);
      if (after && after.originalSourceContent !== decision.beforeValue?.original) {
        throw new Error('Raw source content must remain unchanged.');
      }
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'VARIANT_STRUCTURE_DECISION') {
      const mapped =
        decision.afterValue.decision === 'MERGE_AS_VARIANTS'
          ? 'MERGE_INTO_VARIANTS'
          : decision.afterValue.decision === 'KEEP_SEPARATE'
            ? 'KEEP_AS_SEPARATE_PRODUCTS'
            : 'DEFER';
      const res = CatalogueAdjudicationService.adjudicateFlavourGroup({
        groupId: decision.afterValue.groupId,
        decision: mapped as any,
        reason: decision.reason,
        actor,
        actorRole,
      });
      if (!res.success) throw new Error(res.error || 'Variant decision failed');
      this.audit({
        action: 'STRUCTURAL_CHANGE',
        actor,
        actorRole,
        product: productSlug,
        field: 'variantStructure',
        beforeValue: decision.beforeValue,
        afterValue: decision.afterValue,
        decision: mapped,
        reason: decision.reason,
      });
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'MEDIA_DECISION') {
      const res = CatalogueAdjudicationService.adjudicateMedia({
        productSlug,
        mediaId: decision.afterValue.mediaId,
        action: decision.afterValue.action,
        reason: decision.reason,
        actor,
        actorRole,
      });
      if (!res.success) throw new Error(res.error || 'Media decision failed');
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'TRANSLATION_DECISION') {
      const { locale, value, approve } = decision.afterValue;
      const draft = CatalogueAdjudicationService.saveTranslationDraft({
        productSlug,
        locale,
        value,
        actor,
        actorRole,
      });
      if (!draft.success) throw new Error(draft.error || 'Translation draft failed');
      if (approve) {
        const res = CatalogueAdjudicationService.approveTranslation({
          productSlug,
          locale,
          actor,
          actorRole,
          reason: decision.reason,
        });
        if (!res.success) throw new Error(res.error || 'Translation approval failed');
      }
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'SEO_DECISION') {
      if (decision.afterValue.action === 'DEFER') {
        mapAudit('CATALOGUE_DECISION_DEFERRED');
        return;
      }
      const product = CatalogueReviewService.getProductDetail(productSlug);
      const res = CatalogueReviewService.approveSeo({
        productSlug,
        approvedTitle: decision.afterValue.title || product?.seo?.approvedTitle || product?.name || '',
        approvedDescription:
          decision.afterValue.description || product?.seo?.approvedDescription || product?.description || '',
        actor,
        actorRole,
        reason: decision.reason,
      });
      if (!res.success) throw new Error(res.error || 'SEO decision failed');
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    if (decision.decisionType === 'REVIEW_MODERATION') {
      const res = CatalogueAdjudicationService.adjudicateImportedReview({
        reviewId: decision.afterValue.reviewId,
        action: decision.afterValue.action,
        reason: decision.reason,
        actor,
        actorRole,
      });
      if (!res.success) throw new Error(res.error || 'Review moderation failed');
      mapAudit('CATALOGUE_DECISION_ACCEPTED');
      return;
    }

    throw new Error(`Unsupported decision type: ${decision.decisionType}`);
  }

  private static propagateSupersedes(
    productSlug: string,
    bundle: PendingProductDecision[],
    actor: string,
    actorRole: RoleName
  ) {
    const identityAccepted = bundle.some(
      (d) =>
        d.action === 'ACCEPT' &&
        (d.decisionType === 'DUPLICATE_IDENTITY' || d.decisionType === 'VARIANT_STRUCTURE_DECISION')
    );
    if (!identityAccepted) return;

    const related = CatalogueDecisionRecommendationService.getRecommendations({
      productSlug,
      status: 'SUGGESTED',
    }).filter((r) => r.decisionType === 'DUPLICATE_IDENTITY' || r.decisionType === 'EXACT_MATCH_CONSENSUS');

    for (const r of related) {
      // Only supersede if a human already accepted an identity decision covering this product
      const alreadyHandled = bundle.some(
        (d) => d.recommendationId === r.id || (d.decisionType === 'DUPLICATE_IDENTITY' && d.action === 'ACCEPT')
      );
      if (alreadyHandled && r.reviewStatus === 'SUGGESTED') {
        // If this exact rec was accepted via applyDecision, skip; accept already set ACCEPTED
        continue;
      }
    }

    // After MERGE/KEEP SEPARATE on match group, supersede other SUGGESTED identity recs for same group
    for (const d of bundle) {
      if (d.action !== 'ACCEPT') continue;
      if (d.decisionType !== 'DUPLICATE_IDENTITY' && d.decisionType !== 'VARIANT_STRUCTURE_DECISION') continue;
      const siblings = CatalogueDecisionRecommendationService.getRecommendations({ status: 'SUGGESTED' }).filter(
        (r) =>
          (r.decisionType === 'DUPLICATE_IDENTITY' || r.decisionType === 'VARIANT_GROUPING') &&
          (r.productSlug === productSlug ||
            (r.conflicts as any)?.slugs?.includes?.(productSlug) ||
            r.entityId === d.afterValue?.groupId ||
            r.entityId === d.field)
      );
      for (const s of siblings) {
        if (s.id === d.recommendationId) continue;
        if (s.reviewStatus !== 'SUGGESTED') continue;
        const res = CatalogueDecisionRecommendationService.supersedeRecommendation({
          id: s.id,
          actor,
          actorRole,
          reason: `SUPERSEDED_BY_HUMAN_DECISION after product review on ${productSlug}`,
          supersededByDecisionId: d.id,
        });
        if (res.success) {
          this.audit({
            action: 'RECOMMENDATION_SUPERSEDED',
            actor,
            actorRole,
            product: productSlug,
            field: s.id,
            beforeValue: 'SUGGESTED',
            afterValue: 'SUPERSEDED_BY_HUMAN_DECISION',
            recommendation: s.recommendation,
            confidence: s.confidence,
            reason: `Superseded by human decision ${d.id} — not marked APPROVED`,
          });
        }
      }
    }
  }

  static saveAndNext(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    priorityFilter?: RecommendationPriority | 'ALL';
    reason?: string;
  }): { success: boolean; error?: string; nextSlug?: string | null; summary?: ProductReviewSummary } {
    const saved = this.saveProductReview({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
      reason: params.reason,
    });
    if (!saved.success) return { success: false, error: saved.error };
    this.releaseLock({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
    });
    const nextSlug = this.getNextProductSlug(params.productSlug, params.priorityFilter || 'P0');
    return { success: true, nextSlug, summary: saved.summary };
  }

  static getPublicationPreview(params: {
    productSlug: string;
    locale?: LocaleCode;
    currency?: 'EUR' | 'GBP';
    countryCode?: string;
  }) {
    const state = this.getState();
    const summary = state.summaries[params.productSlug];
    const ready =
      summary?.publication === 'READY_FOR_PUBLICATION' ||
      CatalogueAdjudicationService.getState().readyForPublication.includes(params.productSlug);
    if (!ready) {
      return { success: false, error: 'Publication preview available only when READY_FOR_PUBLICATION.' };
    }
    const preview = CatalogueAdjudicationService.getPreview(params);
    return { success: true, preview, altered: false };
  }

  static exportProductAudit(productSlug: string): { success: boolean; export?: any; error?: string } {
    const product = CatalogueReviewService.getProductDetail(productSlug);
    if (!product) return { success: false, error: 'Product not found.' };
    const summary = this.getState().summaries[productSlug] || null;
    const recommendations = CatalogueDecisionRecommendationService.getRecommendations({ productSlug });
    const decisions = this.getState().auditTrail.filter((a) => a.product === productSlug);
    const payload = scrubSecrets({
      product: {
        slug: product.canonicalSlug,
        name: product.name,
        sku: product.sku,
        publicationStatus: product.publicationStatus,
        complianceClassification: product.complianceClassification,
      },
      sourceProvenance: product.sourceProvenance,
      retainedSourceMappings: product.retainedSourceMappings,
      recommendations: recommendations.map((r) => ({
        id: r.id,
        decisionType: r.decisionType,
        recommendation: r.recommendation,
        confidence: r.confidence,
        priority: r.priority,
        reviewStatus: r.reviewStatus,
        evidence: r.evidence,
      })),
      decisions,
      reviewers: this.getState().assignments[productSlug] || null,
      timestamps: {
        summaryCompletedAt: summary?.completedAt || null,
        exportedAt: new Date().toISOString(),
      },
      finalNormalizedFields: {
        name: product.name,
        description: product.approvedStoreContent || product.description,
        categorySlug: product.categorySlug,
        priceEUR: product.priceEUR,
        priceGBP: product.priceGBP,
        primaryImage: product.primaryImage,
        seo: product.seo,
        countryAvailability: product.countryAvailability,
      },
      publicationReadiness: CatalogueReviewService.evaluatePublicationReadiness(product),
      summary,
    });
    return { success: true, export: payload };
  }

  static getAuditTrail(): WorkspaceAudit[] {
    return [...this.getState().auditTrail].reverse();
  }

  static getOperatorReport() {
    const progress = this.getProgress();
    const audits = this.getState().auditTrail;

    const decisionCounts = {
      variant: audits.filter((a) => a.field === 'variantStructure' || a.action === 'STRUCTURAL_CHANGE').length,
      pricing: audits.filter((a) => a.field === 'price' || a.field === 'priceEUR').length,
      compliance: audits.filter((a) => a.field === 'complianceClassification').length,
      country: audits.filter((a) => String(a.field).startsWith('country:')).length,
      content: audits.filter((a) => a.field === 'approvedStoreContent').length,
      media: audits.filter((a) => /media|SET_PRIMARY|PRIMARY/i.test(String(a.field) + JSON.stringify(a.afterValue))).length,
      translation: audits.filter((a) => String(a.field).startsWith('translation:')).length,
      seo: audits.filter((a) => a.field === 'seo').length,
      reviews: audits.filter((a) => /^REV-|review/i.test(String(a.field))).length,
    };

    return {
      totalProducts: progress.totalProducts,
      fullyReviewed: progress.fullyReviewed,
      partiallyReviewed: progress.partiallyReviewed,
      remaining: progress.remaining,
      p0Resolved: progress.p0.resolved,
      p0Total: progress.p0.total,
      p1Resolved: progress.p1.resolved,
      p1Total: progress.p1.total,
      p2Resolved: progress.p2.resolved,
      p2Total: progress.p2.total,
      p3Resolved: progress.p3.resolved,
      p3Total: progress.p3.total,
      variantDecisions: decisionCounts.variant,
      pricingDecisions: decisionCounts.pricing,
      complianceDecisions: decisionCounts.compliance,
      countryDecisions: decisionCounts.country,
      contentDecisions: decisionCounts.content,
      mediaDecisions: decisionCounts.media,
      translationDecisions: decisionCounts.translation,
      seoDecisions: decisionCounts.seo,
      reviewDecisions: decisionCounts.reviews,
      readyForPublication: progress.readyForPublication,
      published: progress.published,
      blocked: progress.blocked,
    };
  }

  /** Test helper: force an apply failure mid-bundle by staging an invalid decision type. */
  static stageInvalidForRollbackTest(productSlug: string, actor: string, actorRole: RoleName) {
    return this.stageDecision({
      productSlug,
      actor,
      actorRole,
      decision: {
        recommendationId: null,
        section: 'IDENTITY',
        action: 'ACCEPT',
        decisionType: 'INVALID_FORCE_FAIL',
        field: 'rollback-test',
        beforeValue: null,
        afterValue: null,
        reason: 'Forced failure',
        confirmed: true,
        highRisk: false,
      },
    });
  }
}
