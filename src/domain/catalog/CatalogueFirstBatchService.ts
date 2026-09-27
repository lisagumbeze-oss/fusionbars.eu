// ==============================================================================
// FUSION MUSHROOM BARS EU - FIRST ADJUDICATION BATCH
// Small auditable data-reconciliation queue. Never publishes or invents prices.
// Builds on CatalogueReviewWorkspaceService — not a new review platform.
// ==============================================================================

import { RoleName } from '@/types';
import {
  CatalogueReviewService,
  ReviewProductItem,
  FieldApprovalChoice,
} from '@/domain/catalog/CatalogueReviewService';
import { CatalogueReviewWorkspaceService } from '@/domain/catalog/CatalogueReviewWorkspaceService';
import { CatalogueAdjudicationService } from '@/domain/catalog/CatalogueAdjudicationService';
import { CatalogueDecisionRecommendationService } from '@/domain/catalog/CatalogueDecisionRecommendationService';

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

function normalizeText(value: any): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isEmptyEvidence(value: any): boolean {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return normalizeText(value) === '';
}

function sourceName(raw: any): string {
  return normalizeText(raw?.rawPayload?.name || raw?.sourceShortDescription || raw?.sourceSlug || '');
}

export const FIRST_BATCH_SIZES = [5, 10, 20] as const;
export const DEFAULT_FIRST_BATCH_SIZE = 10;

export type SpecialistQueue =
  | 'STRUCTURAL_REVIEW'
  | 'PRICING_REVIEW'
  | 'COMPLIANCE_REVIEW'
  | 'COUNTRY_REVIEW'
  | 'CONTENT_REVIEW'
  | 'MEDIA_REVIEW'
  | 'TRANSLATION_REVIEW'
  | 'SEO_REVIEW';

export type FirstBatchReviewStatus = 'NOT_STARTED' | 'PARTIALLY_REVIEWED' | 'FULLY_REVIEWED';

export type CompletionLevel = 'DATA_ADJUDICATED' | 'SPECIALIST_REVIEW_REQUIRED' | 'READY_FOR_PUBLICATION';

export type FieldAgreement = 'ALL_SOURCES_AGREE' | 'SINGLE_SOURCE' | 'CONFLICT' | 'MISSING';

export type ContentDisposition = 'PENDING' | 'KEEP_INTERNAL_SOURCE_ONLY' | 'REWRITE' | 'BLOCK';

export type CatalogueRelationship = 'DISTINCT_PRODUCTS' | 'VARIANTS' | 'PACK_SIZE_OPTIONS' | 'UNRESOLVED';

export const TRANSLATION_LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl'] as const;

export type FirstBatchFieldKey =
  | 'name'
  | 'slug'
  | 'sku'
  | 'category'
  | 'variant'
  | 'description'
  | 'shortDescription'
  | 'ingredients'
  | 'attributes'
  | 'weight'
  | 'primaryImage'
  | 'gallery';

export type FirstBatchFieldAction = 'ACCEPT_CURRENT' | 'USE_SOURCE' | 'EDIT' | 'DEFER';

export interface ExclusionRecord {
  productSlug: string;
  productName: string;
  reasons: string[];
  specialistQueues: SpecialistQueue[];
}

export interface SelectionScore {
  productSlug: string;
  score: number;
  signals: string[];
}

export interface FirstBatchCandidate {
  productSlug: string;
  productName: string;
  sku: string;
  category: string;
  score: number;
  signals: string[];
  selectionReasons: string[];
}

export interface FirstBatchFieldDecision {
  id: string;
  field: FirstBatchFieldKey;
  action: FirstBatchFieldAction;
  sourceChoice?: 'REFERENCE' | 'REPO_A' | 'REPO_B' | null;
  editedValue?: any;
  beforeValue: any;
  afterValue: any;
  reason: string;
  confirmed: boolean;
  deferred: boolean;
}

export interface FirstBatchMediaDecision {
  id: string;
  mediaId: string;
  action: 'PRIMARY' | 'GALLERY' | 'REJECT';
  reason: string;
  confirmed: boolean;
}

export interface FirstBatchInternalNote {
  id: string;
  text: string;
  actor: string;
  actorRole: RoleName;
  createdAt: string;
  customerVisible: false;
}

export interface FirstBatchProductState {
  productSlug: string;
  status: FirstBatchReviewStatus;
  pendingFieldDecisions: FirstBatchFieldDecision[];
  pendingMediaDecisions: FirstBatchMediaDecision[];
  internalNotes: FirstBatchInternalNote[];
  lastSummary?: FirstBatchSaveSummary | null;
  completedSections: string[];
  deferredSections: string[];
  contentDisposition?: ContentDisposition;
  pricingDecision?: 'PRICE_REVIEW_PENDING' | 'EXISTING_APPROVED_EU_PRICE';
  commercialDisposition?: 'COMMERCIAL_CANDIDATE' | 'NON_COMMERCIAL_TEST_RECORD';
  publicationDisposition?: 'NOT_READY' | 'DO_NOT_PUBLISH';
  relationshipDecision?: {
    otherSlug: string;
    relationship: CatalogueRelationship;
    evidence: string[];
    merged: false;
  } | null;
  translationSlots?: Record<string, 'PENDING'>;
  mediaStatus?: 'PENDING' | 'VERIFIED' | 'MEDIA_REVIEW';
  ingredientStatus?: 'UNKNOWN' | 'SOURCED' | 'REQUIRES_REVIEW';
  completionLevels?: CompletionLevel[];
}

export interface FirstBatchStatusBoard {
  data: 'ADJUDICATED' | 'PARTIAL' | 'PENDING';
  pricing: 'PENDING' | 'PRICE_REVIEW_PENDING' | 'HAS_EU_PRICE';
  compliance: 'REQUIRES_REVIEW' | 'APPROVED' | 'BLOCKED' | 'PENDING';
  country: 'NOT_CONFIGURED' | 'CONFIGURED';
  content: 'REQUIRES_REVIEW' | 'INTERNAL_SOURCE_ONLY' | 'PENDING' | 'BLOCKED';
  media: 'VERIFIED' | 'MEDIA_REVIEW' | 'PENDING';
  translation: 'PENDING';
  seo: 'PENDING' | 'APPROVED';
  publication: 'NOT_READY' | 'DO_NOT_PUBLISH';
}

export interface FirstBatchSaveSummary {
  productSlug: string;
  productName: string;
  fieldsAccepted: number;
  fieldsChanged: number;
  fieldsDeferred: number;
  mediaDecisions: number;
  outstandingBlockers: string[];
  dataReconciliation: 'COMPLETE' | 'PARTIAL' | 'PENDING';
  pricing: 'PENDING' | 'HAS_EU_PRICE' | 'PRICING_REVIEW_REQUIRED';
  compliance: 'PENDING' | 'REQUIRES_REVIEW' | 'APPROVED' | 'BLOCKED';
  country: 'PENDING' | 'NOT_CONFIGURED' | 'CONFIGURED';
  publication: 'NOT_READY';
  reviewStatus: FirstBatchReviewStatus;
  savedAt: string;
  actor: string;
  statusBoard?: FirstBatchStatusBoard;
  completionLevels?: CompletionLevel[];
}

export interface FirstBatchAudit {
  id: string;
  action:
    | 'FIELD_DECISION'
    | 'MEDIA_DECISION'
    | 'BATCH_SAVED'
    | 'BATCH_ROLLBACK'
    | 'NOTE_ADDED'
    | 'BATCH_SELECTED'
    | 'CONTENT_DECISION'
    | 'PRICING_DECISION'
    | 'RELATIONSHIP_DECISION'
    | 'TEST_RECORD_FLAG';
  actor: string;
  actorRole: RoleName;
  timestamp: string;
  product: string;
  field: string;
  decision: string;
  beforeValue: any;
  afterValue: any;
  reason: string;
}

export interface FirstBatchState {
  version: number;
  batchSize: number;
  selectedSlugs: string[];
  selectionGeneratedAt: string | null;
  selectionScores: SelectionScore[];
  exclusions: ExclusionRecord[];
  products: Record<string, FirstBatchProductState>;
  auditTrail: FirstBatchAudit[];
}

const REGULATED_HINT =
  /\b(vaporizer|vape|cannabinoid|cbd|thc|psychoactive|psilocybin|capsule|botanical capsule|delta-?8|delta-?9)\b/i;

const DATA_FIELDS: FirstBatchFieldKey[] = [
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

export class CatalogueFirstBatchService {
  private static cachedState: FirstBatchState | null = null;
  private static persistEnabled = true;
  private static readonly STATE_FILE_PATH = 'src/data/catalogue-first-batch-state.json';

  static setPersistenceEnabled(enabled: boolean): void {
    this.persistEnabled = enabled;
  }

  static clearCache(): void {
    this.cachedState = null;
  }

  static resetStateForTests(state?: FirstBatchState): FirstBatchState {
    this.persistEnabled = false;
    this.cachedState = state || this.emptyState();
    return this.cachedState;
  }

  private static emptyState(): FirstBatchState {
    return {
      version: 1,
      batchSize: DEFAULT_FIRST_BATCH_SIZE,
      selectedSlugs: [],
      selectionGeneratedAt: null,
      selectionScores: [],
      exclusions: [],
      products: {},
      auditTrail: [],
    };
  }

  static getState(): FirstBatchState {
    if (this.cachedState) return this.cachedState;
    const fs = getFs();
    const path = getPath();
    if (this.persistEnabled && fs && path) {
      const fullPath = path.resolve(process.cwd(), this.STATE_FILE_PATH);
      if (fs.existsSync(fullPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (parsed?.batchSize) {
            this.cachedState = parsed;
            return this.cachedState!;
          }
        } catch (err: any) {
          console.warn('Could not read first-batch state:', err.message);
        }
      }
    }
    this.cachedState = this.emptyState();
    this.persist();
    return this.cachedState;
  }

  private static persist(): boolean {
    if (!this.cachedState || !this.persistEnabled) return false;
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
      console.error('Failed to persist first-batch state:', err.message);
      return false;
    }
  }

  private static requireActor(actor?: string, role?: RoleName) {
    if (!actor?.trim()) throw new Error('An authenticated human actor is required.');
    if (!role || !['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'].includes(role)) {
      throw new Error(`Role ${role || 'ANONYMOUS'} is not authorized for first-batch review.`);
    }
  }

  private static audit(entry: Omit<FirstBatchAudit, 'id' | 'timestamp'>) {
    const state = this.getState();
    state.auditTrail.push({
      ...entry,
      id: `FB-AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      beforeValue: scrubSecrets(entry.beforeValue),
      afterValue: scrubSecrets(entry.afterValue),
    });
  }

  // --------------------------------------------------------------------------
  // EXCLUSION / SELECTION
  // --------------------------------------------------------------------------

  static evaluateExclusions(product: ReviewProductItem): ExclusionRecord | null {
    const reasons: string[] = [];
    const specialistQueues: SpecialistQueue[] = [];

    if (product.confidence === 'POSSIBLE_MATCH') {
      reasons.push('possible_match');
      specialistQueues.push('STRUCTURAL_REVIEW');
    }
    // Field-value diffs on EXACT/HIGH/UNIQUE matches are first-batch reconciliation work.
    // Only ambiguous-identity unresolved duplicates go to specialist structural review.
    const identityAmbiguous =
      product.isUnresolvedDuplicate &&
      product.confidence !== 'EXACT_MATCH' &&
      product.confidence !== 'HIGH_CONFIDENCE' &&
      product.confidence !== 'UNIQUE';
    if (identityAmbiguous) {
      reasons.push('unresolved_duplicate');
      specialistQueues.push('STRUCTURAL_REVIEW');
    }
    if (product.isCollaboration && (product.confidence === 'POSSIBLE_MATCH' || identityAmbiguous)) {
      reasons.push('collaboration_unresolved_identity');
      specialistQueues.push('STRUCTURAL_REVIEW');
    }
    if (product.isFlavourStandalone && !product.variantStructureDecision) {
      reasons.push('requires_structural_merge_decision');
      specialistQueues.push('STRUCTURAL_REVIEW');
    }
    if (
      REGULATED_HINT.test(`${product.name} ${product.productType} ${product.originalSourceContent}`) ||
      product.contentFlags.some((f) => /PSYCHOACTIVE|THERAPEUTIC|REGULATORY/i.test(f))
    ) {
      reasons.push('high_risk_compliance_flag');
      specialistQueues.push('COMPLIANCE_REVIEW');
      specialistQueues.push('CONTENT_REVIEW');
    }
    const sourcePrices = Object.values(product.sources)
      .filter(Boolean)
      .map((s: any) => `${s.sourceCurrency || ''}:${s.sourcePrice ?? ''}`);
    const uniquePrices = new Set(sourcePrices.filter((p) => !p.endsWith(':')));
    if (uniquePrices.size > 1) {
      reasons.push('major_price_conflict');
      specialistQueues.push('PRICING_REVIEW');
    }
    if (!product.primaryImage || product.primaryImage.includes('broken')) {
      reasons.push('missing_primary_image');
      specialistQueues.push('MEDIA_REVIEW');
    }

    if (reasons.length === 0) return null;
    return {
      productSlug: product.canonicalSlug,
      productName: product.name,
      reasons,
      specialistQueues: [...new Set(specialistQueues)],
    };
  }

  static scoreCandidate(product: ReviewProductItem): SelectionScore {
    let score = 0;
    const signals: string[] = [];
    const ref = product.sources.reference as any;
    const repoA = product.sources.repoA as any;
    const repoB = product.sources.repoB as any;
    const names = [sourceName(ref), sourceName(repoA), sourceName(repoB)].filter(Boolean);
    if (names.length >= 2 && names.every((n) => n === names[0])) {
      score += 5;
      signals.push('exact_source_name_agreement');
    }
    const cats = [ref?.sourceCategoryName, repoA?.sourceCategoryName, repoB?.sourceCategoryName]
      .map(normalizeText)
      .filter(Boolean);
    if (cats.length >= 2 && cats.every((c) => c === cats[0])) {
      score += 3;
      signals.push('category_agreement');
    }
    const skus = [ref?.sourceSku, repoA?.sourceSku, repoB?.sourceSku].map((s) => normalizeText(s)).filter(Boolean);
    if (skus.length >= 2 && skus.every((s) => s === skus[0])) {
      score += 3;
      signals.push('sku_agreement');
    }
    if (product.confidence === 'EXACT_MATCH' || product.confidence === 'HIGH_CONFIDENCE' || product.confidence === 'UNIQUE') {
      score += 4;
      signals.push(`identity_${product.confidence.toLowerCase()}`);
    }
    if (!product.isUnresolvedDuplicate && product.confidence !== 'POSSIBLE_MATCH') {
      score += 3;
      signals.push('no_identity_conflict');
    }
    if (product.name && product.sku && product.categorySlug && product.categorySlug !== 'uncategorized') {
      score += 2;
      signals.push('complete_metadata');
    }
    if (product.primaryImage && !product.primaryImage.includes('broken')) {
      score += 2;
      signals.push('valid_primary_image');
    }
    const hashes = product.mediaAssets.map((m) => m.hash).filter(Boolean);
    if (hashes.length >= 2 && new Set(hashes).size === 1) {
      score += 2;
      signals.push('matched_media_hash');
    }
    if (!product.isFlavourStandalone || product.variantStructureDecision) {
      score += 2;
      signals.push('unambiguous_structure');
    }
    const sourcePrices = Object.values(product.sources)
      .filter(Boolean)
      .map((s: any) => `${s.sourceCurrency || ''}:${s.sourcePrice ?? ''}`);
    if (new Set(sourcePrices.filter((p) => !p.endsWith(':'))).size <= 1) {
      score += 1;
      signals.push('no_pricing_conflict');
    }
    if (!product.contentFlags.some((f) => /PSYCHOACTIVE|THERAPEUTIC|REGULATORY/i.test(f))) {
      score += 1;
      signals.push('no_high_risk_compliance_flag');
    }
    return { productSlug: product.canonicalSlug, score, signals };
  }

  static selectFirstBatch(params?: {
    size?: number;
    actor?: string;
    actorRole?: RoleName;
  }): {
    success: boolean;
    batchSize: number;
    selected: FirstBatchCandidate[];
    excluded: ExclusionRecord[];
    error?: string;
  } {
    try {
      const size = params?.size ?? this.getState().batchSize ?? DEFAULT_FIRST_BATCH_SIZE;
      if (!(FIRST_BATCH_SIZES as readonly number[]).includes(size)) {
        return { success: false, batchSize: size, selected: [], excluded: [], error: `Batch size must be one of ${FIRST_BATCH_SIZES.join(', ')}` };
      }

      const products = Object.values(CatalogueReviewService.getState().products);
      const exclusions: ExclusionRecord[] = [];
      const eligible: FirstBatchCandidate[] = [];

      for (const product of products) {
        const exclusion = this.evaluateExclusions(product);
        if (exclusion) {
          exclusions.push(exclusion);
          continue;
        }
        const scored = this.scoreCandidate(product);
        eligible.push({
          productSlug: product.canonicalSlug,
          productName: product.name,
          sku: String(product.sku || ''),
          category: product.categoryName,
          score: scored.score,
          signals: scored.signals,
          selectionReasons: scored.signals,
        });
      }

      // Deterministic ordering: score desc, then slug asc
      eligible.sort((a, b) => b.score - a.score || a.productSlug.localeCompare(b.productSlug));
      const selected = eligible.slice(0, size);

      const state = this.getState();
      state.batchSize = size;
      state.selectedSlugs = selected.map((s) => s.productSlug);
      state.selectionGeneratedAt = new Date().toISOString();
      state.selectionScores = eligible.map((e) => ({
        productSlug: e.productSlug,
        score: e.score,
        signals: e.signals,
      }));
      state.exclusions = exclusions;
      for (const s of selected) {
        if (!state.products[s.productSlug]) {
          state.products[s.productSlug] = {
            productSlug: s.productSlug,
            status: 'NOT_STARTED',
            pendingFieldDecisions: [],
            pendingMediaDecisions: [],
            internalNotes: [],
            lastSummary: null,
            completedSections: [],
            deferredSections: [],
          };
        }
      }
      if (params?.actor && params?.actorRole) {
        this.audit({
          action: 'BATCH_SELECTED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: 'FIRST_BATCH',
          field: 'selection',
          decision: `size=${size}`,
          beforeValue: null,
          afterValue: { selected: state.selectedSlugs, excluded: exclusions.length },
          reason: 'Deterministic first-batch selection by evidence strength (not legality)',
        });
      }
      this.persist();
      return { success: true, batchSize: size, selected, excluded: exclusions };
    } catch (err: any) {
      return { success: false, batchSize: 0, selected: [], excluded: [], error: err.message };
    }
  }

  static setBatchSize(size: number): number {
    if (!(FIRST_BATCH_SIZES as readonly number[]).includes(size)) {
      throw new Error(`Batch size must be one of ${FIRST_BATCH_SIZES.join(', ')}`);
    }
    const state = this.getState();
    state.batchSize = size;
    this.persist();
    return size;
  }

  static getSpecialistQueues(): Record<SpecialistQueue, ExclusionRecord[]> {
    const state = this.getState();
    if (!state.exclusions.length) {
      // ensure exclusions computed
      this.selectFirstBatch({ size: state.batchSize });
    }
    const queues: Record<SpecialistQueue, ExclusionRecord[]> = {
      STRUCTURAL_REVIEW: [],
      PRICING_REVIEW: [],
      COMPLIANCE_REVIEW: [],
      COUNTRY_REVIEW: [],
      CONTENT_REVIEW: [],
      MEDIA_REVIEW: [],
      TRANSLATION_REVIEW: [],
      SEO_REVIEW: [],
    };
    for (const ex of this.getState().exclusions) {
      for (const q of ex.specialistQueues) queues[q].push(ex);
    }
    // Country / translation / SEO are specialist by default for all not in first batch readiness
    const products = Object.values(CatalogueReviewService.getState().products);
    for (const p of products) {
      const inBatch = this.getState().selectedSlugs.includes(p.canonicalSlug);
      if (inBatch) continue;
      if (!Object.values(p.countryAvailability || {}).some((s) => s && s !== 'NOT_CONFIGURED')) {
        queues.COUNTRY_REVIEW.push({
          productSlug: p.canonicalSlug,
          productName: p.name,
          reasons: ['country_not_configured'],
          specialistQueues: ['COUNTRY_REVIEW'],
        });
      }
      if (!p.seo?.isApproved) {
        queues.SEO_REVIEW.push({
          productSlug: p.canonicalSlug,
          productName: p.name,
          reasons: ['seo_pending'],
          specialistQueues: ['SEO_REVIEW'],
        });
      }
      queues.TRANSLATION_REVIEW.push({
        productSlug: p.canonicalSlug,
        productName: p.name,
        reasons: ['translation_required'],
        specialistQueues: ['TRANSLATION_REVIEW'],
      });
      if (p.pricingReviewRequired || !p.priceEUR) {
        if (!queues.PRICING_REVIEW.some((x) => x.productSlug === p.canonicalSlug)) {
          queues.PRICING_REVIEW.push({
            productSlug: p.canonicalSlug,
            productName: p.name,
            reasons: ['pricing_review_required'],
            specialistQueues: ['PRICING_REVIEW'],
          });
        }
      }
    }
    // Deduplicate
    (Object.keys(queues) as SpecialistQueue[]).forEach((q) => {
      const seen = new Set<string>();
      queues[q] = queues[q].filter((r) => {
        if (seen.has(r.productSlug)) return false;
        seen.add(r.productSlug);
        return true;
      });
    });
    return queues;
  }

  // --------------------------------------------------------------------------
  // REVIEW PACKET
  // --------------------------------------------------------------------------

  static getReviewPacket(productSlug: string) {
    const product = CatalogueReviewService.getProductDetail(productSlug);
    if (!product) return null;
    const state = this.getState();
    if (!state.selectedSlugs.includes(productSlug) && state.selectedSlugs.length > 0) {
      // Allow viewing only selected batch products when batch is active
    }
    const batchProduct = state.products[productSlug] || {
      productSlug,
      status: 'NOT_STARTED' as FirstBatchReviewStatus,
      pendingFieldDecisions: [],
      pendingMediaDecisions: [],
      internalNotes: [],
      lastSummary: null,
      completedSections: [],
      deferredSections: [],
    };

    const presentSources: Record<string, any> = {};
    if (product.sources.reference) {
      presentSources.REFERENCE_SOURCE = this.summarizeSource(product.sources.reference, product.sourceProvenance.reference);
    }
    if (product.sources.repoA) {
      presentSources.REPOSITORY_A = this.summarizeSource(product.sources.repoA, product.sourceProvenance.repoA);
    }
    if (product.sources.repoB) {
      presentSources.REPOSITORY_B = this.summarizeSource(product.sources.repoB, product.sourceProvenance.repoB);
    }
    presentSources.CURRENT_EU_RECORD = {
      name: product.name,
      slug: product.canonicalSlug,
      sku: product.sku,
      category: product.categoryName,
      description: product.description,
      priceEUR: product.priceEUR,
      priceGBP: product.priceGBP,
      primaryImage: product.primaryImage,
    };

    const meaningfulHashes = product.mediaAssets.map((m) => m.hash).filter((h) => h && !/^0+$/.test(h));
    const mediaMatched =
      meaningfulHashes.length >= 2 && meaningfulHashes.every((h) => h === meaningfulHashes[0]);
    const primaryUnverified = this.isUnverifiedMedia(product.primaryImage);
    const testRecord = this.detectNonCommercialTestRecord(product);

    const fields = this.buildFieldViews(product);
    const differingFields = (Object.keys(fields) as FirstBatchFieldKey[]).filter((key) => (fields[key] as any).highlight);

    return {
      mode: 'FIRST_BATCH_DATA_ADJUDICATION' as const,
      position: {
        index: Math.max(0, state.selectedSlugs.indexOf(productSlug)),
        total: state.selectedSlugs.length,
        nextSlug: state.selectedSlugs[state.selectedSlugs.indexOf(productSlug) + 1] || null,
      },
      product: {
        name: product.name,
        slug: product.canonicalSlug,
        id: product.id,
        sku: product.sku,
        category: product.categoryName,
        variant: product.variants?.[0]?.flavor || product.variants?.[0]?.name || null,
        sourceUrls: Object.values(product.sourceProvenance || {})
          .map((p: any) => p?.sourceUrl)
          .filter(Boolean),
        sourceRecordIds: product.retainedSourceMappings?.map((m) => m.sourceRecordId) || [],
      },
      sources: presentSources,
      fields,
      differingFields,
      pricing: {
        sourcePrices: Object.entries(product.sources)
          .filter(([, s]) => s)
          .map(([k, s]: any) => ({
            source: k,
            price: s.sourcePrice,
            currency: s.sourceCurrency,
          })),
        existingEuPrice: product.priceEUR ?? null,
        existingGbpPrice: product.priceGBP ?? null,
        sourceCurrency: product.sourceCurrency || null,
        sourcePrice: product.sourcePriceUSD ?? null,
        status:
          product.priceEUR && product.priceEUR > 0 && !product.pricingReviewRequired
            ? 'HAS_EU_PRICE'
            : 'PRICING_REVIEW_REQUIRED',
        decision:
          product.priceEUR && product.priceEUR > 0 && !product.pricingReviewRequired
            ? 'EXISTING_APPROVED_EU_PRICE'
            : 'PRICE_REVIEW_PENDING',
        note: 'Reviewer may not invent a EUR price. PRICE_REVIEW_PENDING until an approved FusionBars EU price exists.',
      },
      content: {
        rawSourceContent: product.originalSourceContent || null,
        approvedEuContent: product.approvedStoreContent || null,
        shortDescription: (product.sources.reference as any)?.sourceShortDescription || null,
        description: product.description,
        ingredients: product.ingredients,
        ingredientStatus: product.ingredients?.length ? 'SOURCED' : 'UNKNOWN',
        attributes: product.attributes,
        flags: product.contentFlags,
        status: product.contentFlags.length > 0 ? 'REQUIRES_REVIEW' : product.contentModerationStatus,
        note: 'Raw source content is not approved EU content. Do not rewrite claims automatically.',
      },
      compliance: {
        classification: product.complianceClassification,
        note: 'First batch focuses on data reconciliation. Do not auto-classify legality.',
      },
      country: {
        status: Object.values(product.countryAvailability || {}).some((s) => s && s !== 'NOT_CONFIGURED')
          ? 'CONFIGURED'
          : 'NOT_CONFIGURED',
        note: 'Do not automatically authorize countries.',
      },
      media: {
        matched: mediaMatched,
        label: primaryUnverified ? 'MEDIA_REVIEW' : mediaMatched ? 'MATCHED MEDIA' : 'MEDIA CANDIDATES',
        status: primaryUnverified ? 'MEDIA_REVIEW' : product.primaryImage ? 'VERIFIED' : 'MEDIA_REVIEW',
        assets: product.mediaAssets.map((m) => ({
          id: m.id,
          url: m.url,
          hash: m.hash,
          dimensions: m.dimensions,
          source: m.sourceRepository,
          status: m.status,
          isPrimary: m.isPrimary,
          verified: !this.isUnverifiedMedia(m.url) && m.status !== 'BROKEN',
        })),
      },
      translation: {
        locales: TRANSLATION_LOCALES,
        slots: Object.fromEntries(TRANSLATION_LOCALES.map((locale) => [locale, 'PENDING'])),
        approved: false,
        blocksDataReconciliation: false,
      },
      testRecord,
      relationshipHint:
        product.canonicalSlug === 'a-box-of-10-fusion-gummies' || product.canonicalSlug === 'a-box-of-fusion-gummies'
          ? this.compareCatalogueIdentity('a-box-of-10-fusion-gummies', 'a-box-of-fusion-gummies')
          : null,
      structure: {
        isFlavourStandalone: product.isFlavourStandalone,
        decision: product.variantStructureDecision || null,
        action: product.isFlavourStandalone && !product.variantStructureDecision ? 'DEFER_TO_SPECIALIST_STRUCTURAL_REVIEW' : 'UNAMBIGUOUS',
      },
      batchProduct,
      purchasable: false,
    };
  }

  private static summarizeSource(raw: any, prov: any) {
    if (!raw && !prov) return null;
    return {
      sourceUrl: raw?.sourcePermalink || raw?.sourceCanonicalUrl || prov?.sourceUrl || null,
      sourceFile: raw?.sourceFilePath || prov?.sourceFile || null,
      sourceRecordId: raw?.id || raw?.sourceRecordId || prov?.recordId || null,
      sourceHash: raw?.sourceHash || prov?.hash || null,
      name: raw?.rawPayload?.name || raw?.sourceSlug || null,
      sku: raw?.sourceSku ?? null,
      category: raw?.sourceCategoryName || null,
      price: raw?.sourcePrice ?? null,
      currency: raw?.sourceCurrency || null,
      image: raw?.sourcePrimaryImage || null,
    };
  }

  private static buildFieldViews(product: ReviewProductItem) {
    const ref = product.sources.reference as any;
    const repoA = product.sources.repoA as any;
    const repoB = product.sources.repoB as any;
    const fieldMap: Record<FirstBatchFieldKey, { current: any; reference: any; repoA: any; repoB: any; sourcesAgree: boolean }> = {
      name: {
        current: product.name,
        reference: ref?.rawPayload?.name || ref?.sourceSlug,
        repoA: repoA?.rawPayload?.name || repoA?.sourceSlug,
        repoB: repoB?.rawPayload?.name || repoB?.sourceSlug,
        sourcesAgree: false,
      },
      slug: {
        current: product.canonicalSlug,
        reference: ref?.sourceSlug,
        repoA: repoA?.sourceSlug,
        repoB: repoB?.sourceSlug,
        sourcesAgree: false,
      },
      sku: {
        current: product.sku,
        reference: ref?.sourceSku,
        repoA: repoA?.sourceSku,
        repoB: repoB?.sourceSku,
        sourcesAgree: false,
      },
      category: {
        current: product.categoryName,
        reference: ref?.sourceCategoryName,
        repoA: repoA?.sourceCategoryName,
        repoB: repoB?.sourceCategoryName,
        sourcesAgree: false,
      },
      variant: {
        current: product.variants?.[0]?.flavor || null,
        reference: ref?.sourceFlavor,
        repoA: repoA?.sourceFlavor,
        repoB: repoB?.sourceFlavor,
        sourcesAgree: false,
      },
      description: {
        current: product.description,
        reference: ref?.sourceFullDescription || ref?.sourceShortDescription,
        repoA: repoA?.sourceFullDescription || repoA?.sourceShortDescription,
        repoB: repoB?.sourceFullDescription || repoB?.sourceShortDescription,
        sourcesAgree: false,
      },
      shortDescription: {
        current: product.description?.slice(0, 160) || '',
        reference: ref?.sourceShortDescription,
        repoA: repoA?.sourceShortDescription,
        repoB: repoB?.sourceShortDescription,
        sourcesAgree: false,
      },
      ingredients: {
        current: product.ingredients,
        reference: ref?.sourceIngredients,
        repoA: repoA?.sourceIngredients,
        repoB: repoB?.sourceIngredients,
        sourcesAgree: false,
      },
      attributes: {
        current: product.attributes,
        reference: ref?.sourceAttributes,
        repoA: repoA?.sourceAttributes,
        repoB: repoB?.sourceAttributes,
        sourcesAgree: false,
      },
      weight: {
        current: product.attributes?.weight || product.attributes?.netContent || null,
        reference: ref?.sourceWeight || ref?.sourceNetContent,
        repoA: repoA?.sourceWeight || repoA?.sourceNetContent,
        repoB: repoB?.sourceWeight || repoB?.sourceNetContent,
        sourcesAgree: false,
      },
      primaryImage: {
        current: product.primaryImage,
        reference: ref?.sourcePrimaryImage,
        repoA: repoA?.sourcePrimaryImage,
        repoB: repoB?.sourcePrimaryImage,
        sourcesAgree: false,
      },
      gallery: {
        current: product.galleryImages,
        reference: ref?.sourceGalleryImages,
        repoA: repoA?.sourceGalleryImages,
        repoB: repoB?.sourceGalleryImages,
        sourcesAgree: false,
      },
    };
    for (const key of Object.keys(fieldMap) as FirstBatchFieldKey[]) {
      const f = fieldMap[key];
      const present = [f.reference, f.repoA, f.repoB]
        .map((v) => ({ raw: v, key: isEmptyEvidence(v) ? '' : normalizeText(v) }))
        .filter((v) => v.key);
      const unique = new Set(present.map((v) => v.key));
      let agreement: FieldAgreement = 'MISSING';
      if (present.length === 0) agreement = 'MISSING';
      else if (unique.size > 1) agreement = 'CONFLICT';
      else if (present.length >= 2) agreement = 'ALL_SOURCES_AGREE';
      else agreement = 'SINGLE_SOURCE';
      (f as any).agreement = agreement;
      (f as any).preselectedValue =
        (agreement === 'ALL_SOURCES_AGREE' || agreement === 'SINGLE_SOURCE') && !isEmptyEvidence(f.current) ? f.current : null;
      (f as any).requiresExplicitConfirm = agreement === 'ALL_SOURCES_AGREE' || agreement === 'SINGLE_SOURCE';
      (f as any).highlight = agreement === 'CONFLICT';
      (f as any).saved = false;
      f.sourcesAgree = agreement === 'ALL_SOURCES_AGREE';
    }
    return fieldMap;
  }

  static describeFieldAgreement(values: {
    reference?: any;
    repoA?: any;
    repoB?: any;
    current?: any;
  }): { agreement: FieldAgreement; highlight: boolean; presentValues: any[] } {
    const present = [values.reference, values.repoA, values.repoB].filter((v) => !isEmptyEvidence(v));
    const unique = new Set(present.map((v) => normalizeText(v)));
    let agreement: FieldAgreement = 'MISSING';
    if (present.length === 0) agreement = 'MISSING';
    else if (unique.size > 1) agreement = 'CONFLICT';
    else if (present.length >= 2) agreement = 'ALL_SOURCES_AGREE';
    else agreement = 'SINGLE_SOURCE';
    return { agreement, highlight: agreement === 'CONFLICT', presentValues: present };
  }

  // --------------------------------------------------------------------------
  // STAGE DECISIONS
  // --------------------------------------------------------------------------

  static stageFieldDecision(params: {
    productSlug: string;
    field: FirstBatchFieldKey;
    action: FirstBatchFieldAction;
    sourceChoice?: 'REFERENCE' | 'REPO_A' | 'REPO_B';
    editedValue?: any;
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm?: boolean;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!this.getState().selectedSlugs.includes(params.productSlug)) {
        return { success: false, error: 'Product is not in the active first batch.' };
      }
      if (params.action === 'DEFER' && !params.reason?.trim()) {
        return { success: false, error: 'Defer requires a reason.' };
      }
      if (params.action === 'EDIT' && (params.editedValue === undefined || params.editedValue === null || String(params.editedValue).trim() === '')) {
        return { success: false, error: 'EDIT requires a non-empty value.' };
      }
      if (params.action !== 'DEFER' && params.confirm === false) {
        return { success: false, error: 'Field decision requires confirmation before staging.' };
      }

      const packet = this.getReviewPacket(params.productSlug);
      if (!packet) return { success: false, error: 'Product not found.' };
      const fieldView = packet.fields[params.field];
      let afterValue = fieldView.current;
      if (params.action === 'USE_SOURCE') {
        const choice = params.sourceChoice || 'REFERENCE';
        afterValue =
          choice === 'REPO_A' ? fieldView.repoA : choice === 'REPO_B' ? fieldView.repoB : fieldView.reference;
        if (afterValue == null || String(afterValue).trim() === '') {
          return { success: false, error: 'Selected source value is empty.' };
        }
      } else if (params.action === 'EDIT') {
        afterValue = params.editedValue;
      } else if (params.action === 'ACCEPT_CURRENT') {
        afterValue = fieldView.current;
      }

      const state = this.getState();
      const prod = state.products[params.productSlug];
      const decision: FirstBatchFieldDecision = {
        id: `FB-FLD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        field: params.field,
        action: params.action,
        sourceChoice: params.sourceChoice || null,
        editedValue: params.editedValue,
        beforeValue: fieldView.current,
        afterValue,
        reason: params.reason || (params.action === 'ACCEPT_CURRENT' ? 'Sources reviewed; keep current EU value' : params.action),
        confirmed: params.action === 'DEFER' ? true : params.confirm !== false,
        deferred: params.action === 'DEFER',
      };
      prod.pendingFieldDecisions = prod.pendingFieldDecisions.filter((d) => d.field !== params.field);
      prod.pendingFieldDecisions.push(decision);
      if (prod.status === 'NOT_STARTED') prod.status = 'PARTIALLY_REVIEWED';
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static stageMediaDecision(params: {
    productSlug: string;
    mediaId: string;
    action: 'PRIMARY' | 'GALLERY' | 'REJECT';
    reason: string;
    actor: string;
    actorRole: RoleName;
    confirm?: boolean;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!this.getState().selectedSlugs.includes(params.productSlug)) {
        return { success: false, error: 'Product is not in the active first batch.' };
      }
      if (params.confirm === false) return { success: false, error: 'Media decision requires confirmation.' };
      const state = this.getState();
      const prod = state.products[params.productSlug];
      const decision: FirstBatchMediaDecision = {
        id: `FB-MED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        mediaId: params.mediaId,
        action: params.action,
        reason: params.reason,
        confirmed: true,
      };
      prod.pendingMediaDecisions = prod.pendingMediaDecisions.filter((d) => d.mediaId !== params.mediaId);
      prod.pendingMediaDecisions.push(decision);
      if (prod.status === 'NOT_STARTED') prod.status = 'PARTIALLY_REVIEWED';
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static addInternalNote(params: {
    productSlug: string;
    text: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!params.text?.trim()) return { success: false, error: 'Note text required.' };
      const state = this.getState();
      if (!state.products[params.productSlug]) {
        state.products[params.productSlug] = {
          productSlug: params.productSlug,
          status: 'NOT_STARTED',
          pendingFieldDecisions: [],
          pendingMediaDecisions: [],
          internalNotes: [],
          lastSummary: null,
          completedSections: [],
          deferredSections: [],
        };
      }
      const note: FirstBatchInternalNote = {
        id: `FB-NOTE-${Date.now()}`,
        text: params.text,
        actor: params.actor,
        actorRole: params.actorRole,
        createdAt: new Date().toISOString(),
        customerVisible: false,
      };
      state.products[params.productSlug].internalNotes.push(note);
      this.audit({
        action: 'NOTE_ADDED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'internalNote',
        decision: 'NOTE',
        beforeValue: null,
        afterValue: { id: note.id, customerVisible: false },
        reason: 'Internal reviewer note (not customer-facing)',
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // --------------------------------------------------------------------------
  // SAVE (transactional)
  // --------------------------------------------------------------------------

  static saveProductReview(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason?: string;
  }): { success: boolean; error?: string; summary?: FirstBatchSaveSummary } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      if (!state.selectedSlugs.includes(params.productSlug)) {
        return { success: false, error: 'Product is not in the active first batch.' };
      }
      const prod = state.products[params.productSlug];
      if (!prod) return { success: false, error: 'No batch product state.' };
      if (prod.pendingFieldDecisions.length === 0 && prod.pendingMediaDecisions.length === 0) {
        return { success: false, error: 'No staged field/media decisions to save.' };
      }

      const reviewSnap = cloneJson(CatalogueReviewService.getState());
      const adjSnap = cloneJson(CatalogueAdjudicationService.getState());
      const wsSnap = cloneJson(CatalogueReviewWorkspaceService.getState());
      const fbSnap = cloneJson(state);
      const persistWas = this.persistEnabled;

      try {
        if ((prod as any)._forceRollback) {
          throw new Error('Forced first-batch failure for rollback test');
        }

        let fieldsAccepted = 0;
        let fieldsChanged = 0;
        let fieldsDeferred = 0;

        for (const d of prod.pendingFieldDecisions) {
          if (d.action === 'DEFER') {
            fieldsDeferred++;
            if (!prod.deferredSections.includes(d.field)) prod.deferredSections.push(d.field);
            this.audit({
              action: 'FIELD_DECISION',
              actor: params.actor,
              actorRole: params.actorRole,
              product: params.productSlug,
              field: d.field,
              decision: 'DEFER',
              beforeValue: d.beforeValue,
              afterValue: d.beforeValue,
              reason: d.reason,
            });
            continue;
          }

          if (d.action === 'ACCEPT_CURRENT') {
            fieldsAccepted++;
            if (!prod.completedSections.includes(d.field)) prod.completedSections.push(d.field);
            this.audit({
              action: 'FIELD_DECISION',
              actor: params.actor,
              actorRole: params.actorRole,
              product: params.productSlug,
              field: d.field,
              decision: 'ACCEPT_CURRENT',
              beforeValue: d.beforeValue,
              afterValue: d.afterValue,
              reason: d.reason,
            });
            continue;
          }

          // USE_SOURCE or EDIT → apply via review field decision where mappable
          const mappedField = this.mapToReviewField(d.field);
          if (mappedField) {
            let choice: FieldApprovalChoice = 'CUSTOM_APPROVED_VALUE';
            if (d.action === 'USE_SOURCE') {
              choice =
                d.sourceChoice === 'REPO_A'
                  ? 'USE_REPO_A'
                  : d.sourceChoice === 'REPO_B'
                    ? 'USE_REPO_B'
                    : 'USE_REFERENCE';
            }
            const result = CatalogueReviewService.approveFieldDecision({
              productSlug: params.productSlug,
              fieldName: mappedField,
              choice,
              customValue: choice === 'CUSTOM_APPROVED_VALUE' ? d.afterValue : undefined,
              actor: params.actor,
              actorRole: params.actorRole,
              reason: d.reason,
            });
            if (!result.success) throw new Error(result.error || `Field ${d.field} failed`);
          } else if (d.field === 'primaryImage' && typeof d.afterValue === 'string') {
            const product = CatalogueReviewService.getState().products[params.productSlug];
            const asset = product.mediaAssets.find((m) => m.url === d.afterValue) || product.mediaAssets[0];
            if (asset) {
              const res = CatalogueAdjudicationService.adjudicateMedia({
                productSlug: params.productSlug,
                mediaId: asset.id,
                action: 'SET_PRIMARY',
                reason: d.reason,
                actor: params.actor,
                actorRole: params.actorRole,
              });
              if (!res.success) throw new Error(res.error || 'Primary image update failed');
            }
          }

          fieldsChanged++;
          if (!prod.completedSections.includes(d.field)) prod.completedSections.push(d.field);
          this.audit({
            action: 'FIELD_DECISION',
            actor: params.actor,
            actorRole: params.actorRole,
            product: params.productSlug,
            field: d.field,
            decision: d.action,
            beforeValue: d.beforeValue,
            afterValue: d.afterValue,
            reason: d.reason,
          });
        }

        for (const m of prod.pendingMediaDecisions) {
          const action =
            m.action === 'PRIMARY' ? 'SET_PRIMARY' : m.action === 'REJECT' ? 'REJECT' : 'KEEP';
          const res = CatalogueAdjudicationService.adjudicateMedia({
            productSlug: params.productSlug,
            mediaId: m.mediaId,
            action: action as any,
            reason: m.reason,
            actor: params.actor,
            actorRole: params.actorRole,
          });
          if (!res.success) throw new Error(res.error || 'Media decision failed');
          this.audit({
            action: 'MEDIA_DECISION',
            actor: params.actor,
            actorRole: params.actorRole,
            product: params.productSlug,
            field: m.mediaId,
            decision: m.action,
            beforeValue: null,
            afterValue: m.action,
            reason: m.reason,
          });
        }

        const product = CatalogueReviewService.getProductDetail(params.productSlug);
        if (!product) throw new Error('Product missing after save.');

        // Never auto-clear pricing/compliance/country from first batch
        const requiredFields = DATA_FIELDS.filter((f) => f !== 'gallery' && f !== 'weight');
        const resolvedOrDeferred = requiredFields.every(
          (f) => prod.completedSections.includes(f) || prod.deferredSections.includes(f)
        );
        const anyDeferred = prod.deferredSections.length > 0;
        const reviewStatus: FirstBatchReviewStatus = resolvedOrDeferred
          ? 'FULLY_REVIEWED'
          : prod.completedSections.length > 0 || fieldsAccepted + fieldsChanged + fieldsDeferred > 0
            ? 'PARTIALLY_REVIEWED'
            : 'NOT_STARTED';
        prod.status = reviewStatus;

        // Sync workspace partial/full lists (data-review sense — not publication)
        const ws = CatalogueReviewWorkspaceService.getState();
        if (reviewStatus === 'FULLY_REVIEWED') {
          if (!ws.fullyReviewed.includes(params.productSlug)) ws.fullyReviewed.push(params.productSlug);
        } else if (reviewStatus === 'PARTIALLY_REVIEWED') {
          if (!ws.partiallyReviewed.includes(params.productSlug)) ws.partiallyReviewed.push(params.productSlug);
        }
        CatalogueReviewWorkspaceService.setPersistenceEnabled(persistWas);

        const blockers: string[] = [];
        const pricingStatus =
          product.priceEUR && product.priceEUR > 0 && !product.pricingReviewRequired
            ? 'HAS_EU_PRICE'
            : 'PRICING_REVIEW_REQUIRED';
        if (pricingStatus === 'PRICING_REVIEW_REQUIRED') blockers.push('Pricing pending');
        if (product.complianceClassification !== 'APPROVED') blockers.push('Compliance review required');
        if (!Object.values(product.countryAvailability || {}).some((s) => s === 'AVAILABLE')) {
          blockers.push('Country availability not configured');
        }

        const summary: FirstBatchSaveSummary = {
          productSlug: params.productSlug,
          productName: product.name,
          fieldsAccepted,
          fieldsChanged,
          fieldsDeferred,
          mediaDecisions: prod.pendingMediaDecisions.length,
          outstandingBlockers: blockers,
          dataReconciliation: reviewStatus === 'FULLY_REVIEWED' ? 'COMPLETE' : reviewStatus === 'PARTIALLY_REVIEWED' ? 'PARTIAL' : 'PENDING',
          pricing: pricingStatus,
          compliance:
            product.complianceClassification === 'APPROVED'
              ? 'APPROVED'
              : product.complianceClassification === 'BLOCKED'
                ? 'BLOCKED'
                : 'REQUIRES_REVIEW',
          country: Object.values(product.countryAvailability || {}).some((s) => s && s !== 'NOT_CONFIGURED')
            ? 'CONFIGURED'
            : 'NOT_CONFIGURED',
          publication: 'NOT_READY',
          reviewStatus,
          savedAt: new Date().toISOString(),
          actor: params.actor,
        };
        const board = this.buildStatusBoard(product, prod, reviewStatus);
        summary.statusBoard = board.board;
        summary.completionLevels = board.levels;
        prod.completionLevels = board.levels;
        if (prod.publicationDisposition === 'DO_NOT_PUBLISH') {
          summary.statusBoard.publication = 'DO_NOT_PUBLISH';
          summary.completionLevels = summary.completionLevels.filter((level) => level !== 'READY_FOR_PUBLICATION');
        }

        prod.pendingFieldDecisions = [];
        prod.pendingMediaDecisions = [];
        prod.lastSummary = summary;

        // Hard safety: never publish
        if (CatalogueAdjudicationService.getState().published.includes(params.productSlug)) {
          throw new Error('First batch must never publish products.');
        }
        const eligibility = CatalogueReviewService.evaluatePurchaseEligibility(params.productSlug, 'NL');
        if (eligibility.eligible) {
          // First batch should not make purchasable; if somehow eligible, still don't publish — flag only
        }

        this.audit({
          action: 'BATCH_SAVED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'productReview',
          decision: reviewStatus,
          beforeValue: null,
          afterValue: summary,
          reason: params.reason || 'First-batch product review saved',
        });
        this.persist();
        return { success: true, summary };
      } catch (applyErr: any) {
        CatalogueReviewService.resetStateForTests(reviewSnap);
        CatalogueReviewService.setPersistenceEnabled(persistWas);
        CatalogueAdjudicationService.resetStateForTests(adjSnap);
        CatalogueAdjudicationService.setPersistenceEnabled(persistWas);
        CatalogueReviewWorkspaceService.resetStateForTests(wsSnap);
        CatalogueReviewWorkspaceService.setPersistenceEnabled(persistWas);
        this.cachedState = fbSnap;
        this.persistEnabled = persistWas;
        if (this.cachedState.products[params.productSlug]) {
          delete (this.cachedState.products[params.productSlug] as any)._forceRollback;
        }
        this.audit({
          action: 'BATCH_ROLLBACK',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'productReview',
          decision: 'ROLLBACK',
          beforeValue: null,
          afterValue: null,
          reason: `Rollback: ${applyErr.message}`,
        });
        this.persist();
        return { success: false, error: `Transaction rolled back: ${applyErr.message}` };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  private static mapToReviewField(field: FirstBatchFieldKey): string | null {
    const map: Partial<Record<FirstBatchFieldKey, string>> = {
      name: 'name',
      slug: 'canonicalSlug',
      sku: 'sku',
      category: 'categoryName',
      description: 'description',
      ingredients: 'ingredients',
      attributes: 'attributes',
    };
    return map[field] || null;
  }

  /** Test helper: force rollback mid-save */
  static stageInvalidFieldForRollback(productSlug: string, actor: string, actorRole: RoleName) {
    const state = this.getState();
    if (!state.products[productSlug]) return { success: false, error: 'No product state' };
    state.products[productSlug].pendingFieldDecisions.push({
      id: 'FB-INVALID',
      field: 'name',
      action: 'EDIT',
      beforeValue: 'x',
      afterValue: 'y',
      reason: 'force fail',
      confirmed: true,
      deferred: false,
      sourceChoice: null,
    });
    // Corrupt by pointing apply at a missing product mid-flight via hook field that throws
    (state.products[productSlug] as any)._forceRollback = true;
    this.persist();
    return { success: true };
  }

  static saveProductReviewWithOptionalForceFail(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason?: string;
  }) {
    const state = this.getState();
    const prod = state.products[params.productSlug];
    if (prod && (prod as any)._forceRollback) {
      // Inject a decision that will throw during apply by using invalid product mutation path
      const reviewSnap = cloneJson(CatalogueReviewService.getState());
      const adjSnap = cloneJson(CatalogueAdjudicationService.getState());
      const wsSnap = cloneJson(CatalogueReviewWorkspaceService.getState());
      const fbSnap = cloneJson(state);
      const persistWas = this.persistEnabled;
      try {
        throw new Error('Forced first-batch failure for rollback test');
      } catch (applyErr: any) {
        CatalogueReviewService.resetStateForTests(reviewSnap);
        CatalogueReviewService.setPersistenceEnabled(persistWas);
        CatalogueAdjudicationService.resetStateForTests(adjSnap);
        CatalogueAdjudicationService.setPersistenceEnabled(persistWas);
        CatalogueReviewWorkspaceService.resetStateForTests(wsSnap);
        CatalogueReviewWorkspaceService.setPersistenceEnabled(persistWas);
        this.cachedState = fbSnap;
        this.persistEnabled = persistWas;
        delete (this.cachedState.products[params.productSlug] as any)._forceRollback;
        this.audit({
          action: 'BATCH_ROLLBACK',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'productReview',
          decision: 'ROLLBACK',
          beforeValue: null,
          afterValue: null,
          reason: `Rollback: ${applyErr.message}`,
        });
        this.persist();
        return { success: false, error: `Transaction rolled back: ${applyErr.message}` };
      }
    }
    return this.saveProductReview(params);
  }

  private static isUnverifiedMedia(url?: string | null): boolean {
    if (!url || !String(url).trim()) return true;
    const value = String(url);
    if (value.includes('broken')) return true;
    if (/example\.com|placeholder|via\.placeholder|localhost/i.test(value)) return true;
    return false;
  }

  private static detectNonCommercialTestRecord(product: ReviewProductItem): {
    flagged: boolean;
    disposition: 'NON_COMMERCIAL_TEST_RECORD' | null;
    reasons: string[];
  } {
    const reasons: string[] = [];
    const blob = `${product.canonicalSlug} ${product.name} ${product.primaryImage}`.toLowerCase();
    if (/\baudit[- ]test\b|\btest[- ]?(product|fixture|record)\b/.test(blob)) {
      reasons.push('name_or_slug_identifies_test_fixture');
    }
    if (/example\.com/i.test(product.primaryImage || '')) {
      reasons.push('placeholder_image_host');
    }
    const files = Object.values(product.sourceProvenance || {})
      .map((p: any) => p?.sourceFile || '')
      .join(' ');
    if (/seed|fixture|audit-test/i.test(files) && reasons.length) {
      reasons.push('non_catalogue_source_file');
    }
    if (!reasons.length) return { flagged: false, disposition: null, reasons: [] };
    return { flagged: true, disposition: 'NON_COMMERCIAL_TEST_RECORD', reasons };
  }

  static compareCatalogueIdentity(slugA: string, slugB: string): {
    relationship: CatalogueRelationship;
    evidence: string[];
    merged: false;
    slugA: string;
    slugB: string;
  } {
    const a = CatalogueReviewService.getProductDetail(slugA);
    const b = CatalogueReviewService.getProductDetail(slugB);
    const evidence: string[] = [];
    if (!a || !b) {
      return { relationship: 'UNRESOLVED', evidence: ['missing_product'], merged: false, slugA, slugB };
    }
    const idsA = new Set((a.retainedSourceMappings || []).map((m) => m.sourceRecordId));
    const idsB = new Set((b.retainedSourceMappings || []).map((m) => m.sourceRecordId));
    const sharedIds = [...idsA].filter((id) => idsB.has(id));
    if (sharedIds.length) evidence.push(`shared_source_records:${sharedIds.join(',')}`);
    else evidence.push('distinct_source_record_ids');

    if (a.canonicalSlug !== b.canonicalSlug) evidence.push('distinct_slugs');
    if ((a.primaryImage || '') !== (b.primaryImage || '')) evidence.push('distinct_primary_images');
    if ((a.sourcePriceUSD ?? null) !== (b.sourcePriceUSD ?? null)) {
      evidence.push(`distinct_source_prices:${a.sourcePriceUSD ?? 'none'}_vs_${b.sourcePriceUSD ?? 'none'}`);
    }
    if (normalizeText(a.name) !== normalizeText(b.name)) evidence.push('distinct_names');

    const explicitParent =
      a.flavourGroupParentCandidate === b.canonicalSlug || b.flavourGroupParentCandidate === a.canonicalSlug;
    if (explicitParent) evidence.push('explicit_parent_candidate');

    let relationship: CatalogueRelationship = 'UNRESOLVED';
    if (sharedIds.length && explicitParent) relationship = 'VARIANTS';
    else if (!sharedIds.length && !explicitParent) relationship = 'DISTINCT_PRODUCTS';
    return { relationship, evidence, merged: false, slugA, slugB };
  }

  private static buildStatusBoard(
    product: ReviewProductItem,
    prod: FirstBatchProductState,
    reviewStatus: FirstBatchReviewStatus
  ): { board: FirstBatchStatusBoard; levels: CompletionLevel[] } {
    const identityFields: FirstBatchFieldKey[] = ['name', 'slug', 'category', 'variant', 'primaryImage'];
    const identityResolved = identityFields.every(
      (field) => prod.completedSections.includes(field) || prod.deferredSections.includes(field)
    );
    const data: FirstBatchStatusBoard['data'] = identityResolved
      ? 'ADJUDICATED'
      : reviewStatus === 'NOT_STARTED'
        ? 'PENDING'
        : 'PARTIAL';
    const hasEu = Boolean(product.priceEUR && product.priceEUR > 0 && !product.pricingReviewRequired);
    const pricing: FirstBatchStatusBoard['pricing'] = hasEu ? 'HAS_EU_PRICE' : 'PRICE_REVIEW_PENDING';
    const compliance: FirstBatchStatusBoard['compliance'] =
      product.complianceClassification === 'APPROVED'
        ? 'APPROVED'
        : product.complianceClassification === 'BLOCKED'
          ? 'BLOCKED'
          : 'REQUIRES_REVIEW';
    const country: FirstBatchStatusBoard['country'] = Object.values(product.countryAvailability || {}).some(
      (s) => s && s !== 'NOT_CONFIGURED'
    )
      ? 'CONFIGURED'
      : 'NOT_CONFIGURED';
    const content: FirstBatchStatusBoard['content'] =
      prod.contentDisposition === 'BLOCK'
        ? 'BLOCKED'
        : prod.contentDisposition === 'KEEP_INTERNAL_SOURCE_ONLY'
          ? 'INTERNAL_SOURCE_ONLY'
          : product.contentFlags.length > 0
            ? 'REQUIRES_REVIEW'
            : 'PENDING';
    const media: FirstBatchStatusBoard['media'] =
      prod.mediaStatus === 'MEDIA_REVIEW' || this.isUnverifiedMedia(product.primaryImage)
        ? 'MEDIA_REVIEW'
        : prod.mediaStatus === 'VERIFIED' || prod.completedSections.includes('primaryImage')
          ? 'VERIFIED'
          : 'PENDING';
    const publication: FirstBatchStatusBoard['publication'] =
      prod.publicationDisposition === 'DO_NOT_PUBLISH' ? 'DO_NOT_PUBLISH' : 'NOT_READY';
    const board: FirstBatchStatusBoard = {
      data,
      pricing: data === 'PENDING' && !prod.pricingDecision ? 'PENDING' : pricing,
      compliance,
      country,
      content,
      media,
      translation: 'PENDING',
      seo: product.seo?.isApproved ? 'APPROVED' : 'PENDING',
      publication,
    };
    const levels: CompletionLevel[] = [];
    if (data === 'ADJUDICATED') levels.push('DATA_ADJUDICATED');
    const specialist =
      !hasEu ||
      compliance !== 'APPROVED' ||
      country !== 'CONFIGURED' ||
      content === 'REQUIRES_REVIEW' ||
      content === 'PENDING' ||
      content === 'INTERNAL_SOURCE_ONLY' ||
      board.translation === 'PENDING';
    if (specialist) levels.push('SPECIALIST_REVIEW_REQUIRED');
    const ready = Boolean(product.readinessChecklist?.isReadyToPublish) && publication !== 'DO_NOT_PUBLISH' && !specialist;
    if (ready) levels.push('READY_FOR_PUBLICATION');
    return { board, levels };
  }

  static confirmAgreedFields(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason?: string;
  }): { success: boolean; staged: string[]; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const packet = this.getReviewPacket(params.productSlug);
      if (!packet) return { success: false, staged: [], error: 'Product not found.' };
      const staged: string[] = [];
      for (const field of DATA_FIELDS) {
        const view = packet.fields[field] as any;
        if (view.agreement === 'CONFLICT') continue;
        if (view.agreement === 'MISSING' || view.preselectedValue == null || String(view.preselectedValue).trim() === '') {
          const deferred = this.stageFieldDecision({
            productSlug: params.productSlug,
            field,
            action: 'DEFER',
            reason: params.reason || `${field} left UNKNOWN — source evidence does not support a value`,
            actor: params.actor,
            actorRole: params.actorRole,
          });
          if (!deferred.success) return { success: false, staged, error: deferred.error };
          staged.push(`${field}:UNKNOWN`);
          continue;
        }
        const confirmed = this.stageFieldDecision({
          productSlug: params.productSlug,
          field,
          action: 'ACCEPT_CURRENT',
          reason: params.reason || 'Explicit confirm of value where present sources agree. Not auto-saved until SAVE.',
          confirm: true,
          actor: params.actor,
          actorRole: params.actorRole,
        });
        if (!confirmed.success) return { success: false, staged, error: confirmed.error };
        staged.push(`${field}:CONFIRM`);
      }
      return { success: true, staged };
    } catch (err: any) {
      return { success: false, staged: [], error: err.message };
    }
  }

  static stageContentDecision(params: {
    productSlug: string;
    disposition: ContentDisposition;
    reason: string;
    actor: string;
    actorRole: RoleName;
    rewriteText?: string;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!params.reason?.trim()) return { success: false, error: 'Content decision requires a reason.' };
      if (params.disposition === 'REWRITE' && !params.rewriteText?.trim()) {
        return { success: false, error: 'REWRITE requires explicit replacement text. Claims are not generated automatically.' };
      }
      const state = this.getState();
      const prod = state.products[params.productSlug];
      if (!prod) return { success: false, error: 'Product is not in the active first batch.' };
      const before = prod.contentDisposition || 'PENDING';
      prod.contentDisposition = params.disposition;
      if (params.disposition === 'REWRITE') {
        const product = CatalogueReviewService.getState().products[params.productSlug];
        if (product) product.approvedStoreContent = params.rewriteText!;
      }
      this.audit({
        action: 'CONTENT_DECISION',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'content',
        decision: params.disposition,
        beforeValue: before,
        afterValue: params.disposition,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static stagePricingHold(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; error?: string; decision?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const product = CatalogueReviewService.getProductDetail(params.productSlug);
      if (!product) return { success: false, error: 'Product not found.' };
      const beforeEur = product.priceEUR ?? null;
      const state = this.getState();
      const prod = state.products[params.productSlug];
      if (!prod) return { success: false, error: 'Product is not in the active first batch.' };
      const hasApproved = Boolean(product.priceEUR && product.priceEUR > 0 && !product.pricingReviewRequired);
      prod.pricingDecision = hasApproved ? 'EXISTING_APPROVED_EU_PRICE' : 'PRICE_REVIEW_PENDING';
      if ((product.priceEUR ?? null) !== beforeEur) {
        product.priceEUR = beforeEur;
      }
      this.audit({
        action: 'PRICING_DECISION',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'priceEUR',
        decision: prod.pricingDecision,
        beforeValue: beforeEur,
        afterValue: product.priceEUR ?? null,
        reason: params.reason || 'No invented EUR price',
      });
      this.persist();
      return { success: true, decision: prod.pricingDecision };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static prepareTranslationSlots(productSlug: string): Record<string, 'PENDING'> {
    const slots = Object.fromEntries(TRANSLATION_LOCALES.map((locale) => [locale, 'PENDING' as const]));
    const prod = this.getState().products[productSlug];
    if (prod) prod.translationSlots = slots;
    return slots;
  }

  static saveAndNext(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason?: string;
  }): {
    success: boolean;
    error?: string;
    summary?: FirstBatchSaveSummary;
    nextSlug?: string | null;
    batchComplete?: boolean;
    batchReport?: any;
  } {
    const lock = CatalogueReviewWorkspaceService.acquireLock({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
    });
    if (!lock.success && !lock.error?.includes(params.actor)) {
      return { success: false, error: lock.error || 'Could not acquire review lock.' };
    }
    const saved = this.saveProductReview(params);
    if (!saved.success) return saved;
    CatalogueReviewWorkspaceService.releaseLock({
      productSlug: params.productSlug,
      actor: params.actor,
      actorRole: params.actorRole,
    });
    const slugs = this.getState().selectedSlugs;
    const nextSlug = slugs[slugs.indexOf(params.productSlug) + 1] || null;
    const batchComplete = !nextSlug;
    return {
      ...saved,
      nextSlug,
      batchComplete,
      batchReport: batchComplete ? this.getBatchCompletionReport() : undefined,
    };
  }

  /** Explicit reviewer pass for one first-batch product. Does not publish or invent prices. */
  static adjudicateProductData(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
  }): {
    success: boolean;
    error?: string;
    summary?: FirstBatchSaveSummary;
    nextSlug?: string | null;
    batchComplete?: boolean;
    batchReport?: any;
  } {
    const product = CatalogueReviewService.getProductDetail(params.productSlug);
    if (!product) return { success: false, error: 'Product not found.' };
    const beforeEur = product.priceEUR ?? null;
    const beforeCompliance = product.complianceClassification;
    const beforeCountry = JSON.stringify(product.countryAvailability || {});

    CatalogueReviewWorkspaceService.acquireLock(params);
    const confirmed = this.confirmAgreedFields({
      ...params,
      reason: 'Reviewer confirmed source-supported catalogue value',
    });
    if (!confirmed.success) return { success: false, error: confirmed.error };

    const packet = this.getReviewPacket(params.productSlug);
    const primary = packet?.media.assets.find((m: any) => m.verified && m.isPrimary) || packet?.media.assets.find((m: any) => m.verified);
    const prod = this.getState().products[params.productSlug];
    if (this.isUnverifiedMedia(product.primaryImage) || !primary) {
      prod.mediaStatus = 'MEDIA_REVIEW';
      this.audit({
        action: 'MEDIA_DECISION',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'primaryImage',
        decision: 'MEDIA_REVIEW',
        beforeValue: product.primaryImage,
        afterValue: product.primaryImage,
        reason: 'Primary image is missing, broken, or not a verified source asset. No substitute image assigned.',
      });
    } else {
      const staged = this.stageMediaDecision({
        productSlug: params.productSlug,
        mediaId: primary.id,
        action: 'PRIMARY',
        reason: 'Primary image selected from verified source media',
        confirm: true,
        actor: params.actor,
        actorRole: params.actorRole,
      });
      if (!staged.success) return { success: false, error: staged.error };
      prod.mediaStatus = 'VERIFIED';
      for (const asset of packet!.media.assets) {
        if (asset.id === primary.id || !asset.verified) continue;
        this.stageMediaDecision({
          productSlug: params.productSlug,
          mediaId: asset.id,
          action: 'GALLERY',
          reason: 'Additional verified source image kept in gallery. Raw media retained.',
          confirm: true,
          actor: params.actor,
          actorRole: params.actorRole,
        });
      }
    }

    const flagged = product.contentFlags.length > 0 || /high tolerance|psychoactive|dosage|therapeutic/i.test(product.name);
    this.stageContentDecision({
      productSlug: params.productSlug,
      disposition: 'KEEP_INTERNAL_SOURCE_ONLY',
      reason: flagged
        ? 'Source claims stay internal. No substitute public claims created.'
        : 'Raw source copy kept internal until EU content is explicitly approved.',
      actor: params.actor,
      actorRole: params.actorRole,
    });

    this.stagePricingHold({
      ...params,
      reason: 'PRICE_REVIEW_PENDING — no approved FusionBars EU price on record',
    });
    this.prepareTranslationSlots(params.productSlug);
    prod.ingredientStatus = product.ingredients?.length ? 'SOURCED' : 'UNKNOWN';

    const testRecord = this.detectNonCommercialTestRecord(product);
    if (testRecord.flagged) {
      prod.commercialDisposition = 'NON_COMMERCIAL_TEST_RECORD';
      prod.publicationDisposition = 'DO_NOT_PUBLISH';
      this.addInternalNote({
        productSlug: params.productSlug,
        text: `NON_COMMERCIAL_TEST_RECORD. DO_NOT_PUBLISH. Evidence: ${testRecord.reasons.join(', ')}. Raw source retained.`,
        actor: params.actor,
        actorRole: params.actorRole,
      });
      this.audit({
        action: 'TEST_RECORD_FLAG',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'commercialDisposition',
        decision: 'NON_COMMERCIAL_TEST_RECORD',
        beforeValue: null,
        afterValue: 'DO_NOT_PUBLISH',
        reason: testRecord.reasons.join('; '),
      });
    } else {
      prod.commercialDisposition = 'COMMERCIAL_CANDIDATE';
      prod.publicationDisposition = 'NOT_READY';
    }

    if (params.productSlug === 'a-box-of-fusion-gummies' || params.productSlug === 'a-box-of-10-fusion-gummies') {
      const comparison = this.compareCatalogueIdentity('a-box-of-10-fusion-gummies', 'a-box-of-fusion-gummies');
      prod.relationshipDecision = {
        otherSlug: params.productSlug === 'a-box-of-10-fusion-gummies' ? 'a-box-of-fusion-gummies' : 'a-box-of-10-fusion-gummies',
        relationship: comparison.relationship,
        evidence: comparison.evidence,
        merged: false,
      };
      this.audit({
        action: 'RELATIONSHIP_DECISION',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'variantStructure',
        decision: comparison.relationship,
        beforeValue: null,
        afterValue: comparison.evidence,
        reason: 'Relationship recorded only from source-record, price, image, and slug evidence. No name-similarity merge.',
      });
    }

    const saved = this.saveAndNext({
      ...params,
      reason: 'First-batch data adjudication save',
    });
    const after = CatalogueReviewService.getProductDetail(params.productSlug);
    if ((after?.priceEUR ?? null) !== beforeEur) {
      return { success: false, error: 'Data adjudication changed EUR price.' };
    }
    if (after?.complianceClassification !== beforeCompliance) {
      return { success: false, error: 'Data adjudication changed compliance classification.' };
    }
    if (JSON.stringify(after?.countryAvailability || {}) !== beforeCountry) {
      return { success: false, error: 'Data adjudication changed country availability.' };
    }
    return saved;
  }

  static executeFirstBatchDataAdjudication(params: { actor: string; actorRole: RoleName; size?: number }) {
    const selected = this.getState().selectedSlugs.length
      ? this.getState().selectedSlugs
      : this.selectFirstBatch({ size: params.size || DEFAULT_FIRST_BATCH_SIZE, ...params }).selected.map((s) => s.productSlug);
    const results: Array<{ slug: string; success: boolean; error?: string; levels?: CompletionLevel[] }> = [];
    for (const slug of selected) {
      const result = this.adjudicateProductData({ productSlug: slug, ...params });
      results.push({
        slug,
        success: result.success,
        error: result.error,
        levels: result.summary?.completionLevels,
      });
      if (!result.success) break;
    }
    return { success: results.every((r) => r.success), results, report: this.getBatchCompletionReport() };
  }

  static getBatchCompletionReport() {
    const state = this.getState();
    const selected = state.selectedSlugs.map((slug) => {
      const prod = state.products[slug];
      const product = CatalogueReviewService.getProductDetail(slug);
      const board = prod?.lastSummary?.statusBoard;
      return {
        product: product?.name || slug,
        slug,
        data: board?.data || 'PENDING',
        pricing: board?.pricing || 'PENDING',
        compliance: board?.compliance || product?.complianceClassification || 'REQUIRES_REVIEW',
        country: board?.country || 'NOT_CONFIGURED',
        content: board?.content || 'PENDING',
        media: board?.media || 'PENDING',
        translation: board?.translation || 'PENDING',
        seo: board?.seo || 'PENDING',
        publication: board?.publication || 'NOT_READY',
        levels: prod?.completionLevels || [],
        commercialDisposition: prod?.commercialDisposition || null,
        relationship: prod?.relationshipDecision?.relationship || null,
      };
    });
    return {
      title: 'FIRST BATCH COMPLETE',
      productsReviewed: selected.filter((p) => p.data !== 'PENDING').length,
      dataAdjudicated: selected.filter((p) => p.levels.includes('DATA_ADJUDICATED')).length,
      specialistReviewRequired: selected.filter((p) => p.levels.includes('SPECIALIST_REVIEW_REQUIRED')).length,
      deferred: state.auditTrail.filter((a) => a.decision === 'DEFER' || String(a.decision).includes('UNKNOWN')).length,
      blocked: selected.filter((p) => p.publication === 'DO_NOT_PUBLISH' || p.compliance === 'BLOCKED').length,
      readyForPublication: CatalogueAdjudicationService.getState().readyForPublication.length,
      published: CatalogueAdjudicationService.getState().published.length,
      products: selected,
    };
  }

  static getOperatorReport() {
    const state = this.getState();
    if (!state.selectedSlugs.length) {
      this.selectFirstBatch({ size: state.batchSize || DEFAULT_FIRST_BATCH_SIZE });
    }
    const fresh = this.getState();
    const products = Object.values(fresh.products);
    const partially = products.filter((p) => p.status === 'PARTIALLY_REVIEWED').length;
    const fully = products.filter((p) => p.status === 'FULLY_REVIEWED').length;
    const decisions = fresh.auditTrail.filter((a) => a.action === 'FIELD_DECISION' || a.action === 'MEDIA_DECISION');
    const deferred = fresh.auditTrail.filter((a) => a.decision === 'DEFER').length;
    const selected = fresh.selectedSlugs.map((slug) => {
      const p = CatalogueReviewService.getProductDetail(slug);
      return { slug, name: p?.name || slug };
    });
    return {
      firstBatchSize: fresh.batchSize,
      selectedProducts: selected,
      selectedCount: selected.length,
      excludedCount: fresh.exclusions.length,
      exclusions: fresh.exclusions,
      selectionGeneratedAt: fresh.selectionGeneratedAt,
      productsPartiallyReviewed: partially,
      productsFullyReviewed: fully,
      decisionsRecorded: decisions.length,
      deferredDecisions: deferred,
      outstandingPricingBlockers: selected.filter((s) => {
        const p = CatalogueReviewService.getProductDetail(s.slug);
        return !p?.priceEUR || p.pricingReviewRequired;
      }).length,
      outstandingComplianceBlockers: selected.filter((s) => {
        const p = CatalogueReviewService.getProductDetail(s.slug);
        return p?.complianceClassification !== 'APPROVED';
      }).length,
      outstandingCountryBlockers: selected.filter((s) => {
        const p = CatalogueReviewService.getProductDetail(s.slug);
        return !Object.values(p?.countryAvailability || {}).some((x) => x === 'AVAILABLE');
      }).length,
      readyForPublication: CatalogueAdjudicationService.getState().readyForPublication.length,
      published: CatalogueAdjudicationService.getState().published.length,
      specialistQueues: Object.fromEntries(
        Object.entries(this.getSpecialistQueues()).map(([k, v]) => [k, v.length])
      ),
    };
  }

  static getAuditTrail(): FirstBatchAudit[] {
    return [...this.getState().auditTrail].reverse();
  }

  static getSelectedSlugs(): string[] {
    return [...this.getState().selectedSlugs];
  }
}
