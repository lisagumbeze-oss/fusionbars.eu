// ==============================================================================
// FUSION MUSHROOM BARS EU - CATALOGUE ADJUDICATION WORKSPACE
// Human-in-the-loop batch review. Never auto-publishes or infers legality.
// ==============================================================================

import {
  ComplianceClassification,
  CountryAvailabilityStatus,
  LocaleCode,
  MinorUnits,
  RoleName,
} from '@/types';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { SUPPORTED_LOCALES } from '@/i18n';
import {
  CatalogueReviewService,
  ReviewProductItem,
  CategoryMappingDecision,
  ReviewModerationItem,
} from '@/domain/catalog/CatalogueReviewService';
import { MasterCatalogueImportService } from '@/domain/import/MasterCatalogueImportService';

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

export type AdjudicationStatus = 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'DEFERRED' | 'BLOCKED';

export type AdjudicationQueue =
  | 'POSSIBLE_MATCHES'
  | 'DUPLICATE_CONFLICTS'
  | 'PRICING'
  | 'COMPLIANCE'
  | 'CONTENT'
  | 'CATEGORIES'
  | 'MEDIA'
  | 'TRANSLATIONS'
  | 'REVIEWS'
  | 'PUBLICATION_READINESS';

export type TranslationLocaleStatus = 'MISSING' | 'DRAFT' | 'REVIEWED' | 'APPROVED';

export type AdjudicationAuditAction =
  | 'MATCH_MERGED'
  | 'MATCH_SEPARATED'
  | 'FIELD_APPROVED'
  | 'FIELD_REJECTED'
  | 'PRICE_APPROVED'
  | 'PRICE_CHANGED'
  | 'COMPLIANCE_APPROVED'
  | 'COMPLIANCE_BLOCKED'
  | 'COUNTRY_CHANGED'
  | 'CONTENT_APPROVED'
  | 'CONTENT_REWRITTEN'
  | 'MEDIA_APPROVED'
  | 'CATEGORY_APPROVED'
  | 'TRANSLATION_APPROVED'
  | 'REVIEW_APPROVED'
  | 'PRODUCT_READY'
  | 'PRODUCT_PUBLISHED'
  | 'REVIEW_ASSIGNED'
  | 'ITEM_DEFERRED'
  | 'FLAVOUR_MERGED'
  | 'FLAVOUR_SEPARATED';

export const BATCH_SIZES = [1, 5, 10, 25, 50] as const;
export const DEFAULT_BATCH_SIZE = 10;

export interface QueueCard {
  queue: AdjudicationQueue;
  label: string;
  total: number;
  completed: number;
  remaining: number;
  blocked: number;
  needsReview: number;
}

export interface AdjudicationAssignment {
  role: RoleName;
  actor?: string | null;
  assignedAt: string;
}

export interface AdjudicationRecord {
  id: string;
  entityId: string;
  productSlug: string;
  queue: AdjudicationQueue;
  status: AdjudicationStatus;
  assignedTo?: RoleName | null;
  lastReviewedAt?: string | null;
  lastActor?: string | null;
  lastDecision?: string | null;
  reason?: string | null;
}

export interface PossibleMatchGroup {
  id: string;
  label: string;
  slugs: string[];
  status: AdjudicationStatus;
  decision?: 'MERGE' | 'KEEP_SEPARATE' | 'DEFER' | null;
}

export interface FlavourGroup {
  id: string;
  parentSlug: string;
  parentName: string;
  candidateSlugs: string[];
  status: AdjudicationStatus;
  decision?: 'MERGE_INTO_VARIANTS' | 'KEEP_AS_SEPARATE_PRODUCTS' | 'DEFER' | null;
}

export interface TranslationField {
  locale: LocaleCode;
  value: string;
  status: TranslationLocaleStatus;
}

export interface TranslationBundle {
  productSlug: string;
  field: 'storeContent' | 'seoTitle' | 'seoDescription';
  englishSource: string;
  locales: Record<Exclude<LocaleCode, 'en'>, TranslationField>;
}

export interface AdjudicationAudit {
  id: string;
  action: AdjudicationAuditAction;
  actor: string;
  actorRole: RoleName;
  timestamp: string;
  product: string;
  field: string;
  beforeValue: any;
  afterValue: any;
  reason: string;
}

export interface AdjudicationState {
  version: number;
  lastUpdated: string;
  batchSize: number;
  batchCursors: Record<AdjudicationQueue, number>;
  records: Record<string, AdjudicationRecord>;
  matchGroups: PossibleMatchGroup[];
  flavourGroups: FlavourGroup[];
  translations: Record<string, TranslationBundle>;
  drafts: Record<string, any>;
  assignments: Record<string, AdjudicationAssignment>;
  auditTrail: AdjudicationAudit[];
  readyForPublication: string[];
  published: string[];
}

export interface PublicationPreview {
  slug: string;
  locale: LocaleCode;
  currency: 'EUR' | 'GBP';
  countryCode: string;
  name: string;
  description: string;
  priceLabel: string;
  availability: CountryAvailabilityStatus;
  customerMessage: string;
  isolated: true;
}

export interface OperatorAdjudicationReport {
  totalImported: number;
  fullyAdjudicated: number;
  remaining: number;
  possibleMatchesRemaining: number;
  duplicateConflictsRemaining: number;
  pricingDecisions: number;
  complianceDecisions: number;
  countryDecisions: number;
  contentDecisions: number;
  mediaDecisions: number;
  translationDecisions: number;
  reviewModerationDecisions: number;
  readyForPublication: number;
  published: number;
  blocked: number;
}

const FORBIDDEN_BULK_ACTIONS = new Set([
  'PUBLISH',
  'APPROVE_ALL_COMPLIANCE',
  'AUTHORIZE_ALL_COUNTRIES',
  'ASSIGN_EUR_PRICES',
  'APPROVE_ALL_CONTENT',
]);

export class CatalogueAdjudicationService {
  private static cachedState: AdjudicationState | null = null;
  private static persistEnabled = true;
  private static readonly STATE_FILE_PATH = 'src/data/catalogue-adjudication-state.json';

  static setPersistenceEnabled(enabled: boolean): void {
    this.persistEnabled = enabled;
  }

  static clearCache(): void {
    this.cachedState = null;
  }

  static resetStateForTests(state?: AdjudicationState): AdjudicationState {
    this.persistEnabled = false;
    this.cachedState = state || this.initialize();
    return this.cachedState;
  }

  static getState(): AdjudicationState {
    if (this.cachedState) return this.cachedState;

    const fs = getFs();
    const path = getPath();
    if (this.persistEnabled && fs && path) {
      const fullPath = path.resolve(process.cwd(), this.STATE_FILE_PATH);
      if (fs.existsSync(fullPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (parsed?.records) {
            this.cachedState = parsed;
            return this.cachedState!;
          }
        } catch (err: any) {
          console.warn('Could not read adjudication state, reinitializing:', err.message);
        }
      }
    }

    this.cachedState = this.initialize();
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
      console.error('Failed to persist adjudication state:', err.message);
      return false;
    }
  }

  private static recordKey(queue: AdjudicationQueue, entityId: string): string {
    return `${queue}:${entityId}`;
  }

  private static ensureRecord(queue: AdjudicationQueue, entityId: string, productSlug: string): AdjudicationRecord {
    const state = this.getState();
    const key = this.recordKey(queue, entityId);
    if (!state.records[key]) {
      state.records[key] = {
        id: key,
        entityId,
        productSlug,
        queue,
        status: 'PENDING',
        assignedTo: state.assignments[productSlug]?.role || null,
      };
    }
    return state.records[key];
  }

  private static initialize(): AdjudicationState {
    const review = CatalogueReviewService.getState();
    const products = Object.values(review.products);
    const records: Record<string, AdjudicationRecord> = {};
    const cursors = {} as Record<AdjudicationQueue, number>;
    const queues: AdjudicationQueue[] = [
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
    queues.forEach((q) => (cursors[q] = 0));

    const seed = (queue: AdjudicationQueue, entityId: string, productSlug: string) => {
      const key = `${queue}:${entityId}`;
      records[key] = {
        id: key,
        entityId,
        productSlug,
        queue,
        status: 'PENDING',
      };
    };

    const matchGroups = this.buildMatchGroups(products);
    matchGroups.forEach((g) => seed('POSSIBLE_MATCHES', g.id, g.slugs[0]));

    products
      .filter((p) => p.isUnresolvedDuplicate)
      .forEach((p) => seed('DUPLICATE_CONFLICTS', p.canonicalSlug, p.canonicalSlug));

    products
      .filter((p) => p.pricingReviewRequired || !p.priceEUR)
      .forEach((p) => seed('PRICING', p.canonicalSlug, p.canonicalSlug));

    products.forEach((p) => seed('COMPLIANCE', p.canonicalSlug, p.canonicalSlug));
    products.forEach((p) => seed('CONTENT', p.canonicalSlug, p.canonicalSlug));
    review.categoryMappings.forEach((m) => seed('CATEGORIES', m.sourceCategorySlug, m.sourceCategorySlug));
    products
      .filter((p) => p.mediaAssets.some((m) => m.status === 'BROKEN' || m.duplicateStatus === 'BROKEN' || m.duplicateStatus === 'MISSING' || !p.primaryImage))
      .forEach((p) => seed('MEDIA', p.canonicalSlug, p.canonicalSlug));
    products.forEach((p) => seed('TRANSLATIONS', p.canonicalSlug, p.canonicalSlug));
    review.reviews.forEach((r) => seed('REVIEWS', r.id, r.productSlug));
    products.forEach((p) => seed('PUBLICATION_READINESS', p.canonicalSlug, p.canonicalSlug));

    const flavourGroups: FlavourGroup[] = [
      {
        id: 'FLAVOUR-CHOCOLATE-BARS',
        parentSlug: 'fusion-artisan-mushroom-chocolate-bar',
        parentName: 'Fusion Artisan Mushroom Chocolate Bar (6g)',
        candidateSlugs: products.filter((p) => p.isFlavourStandalone).map((p) => p.canonicalSlug),
        status: 'PENDING',
        decision: null,
      },
    ];

    const translations: Record<string, TranslationBundle> = {};
    products.forEach((p) => {
      translations[p.canonicalSlug] = this.emptyTranslationBundle(p.canonicalSlug, p.approvedStoreContent || '');
    });

    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      batchSize: DEFAULT_BATCH_SIZE,
      batchCursors: cursors,
      records,
      matchGroups,
      flavourGroups,
      translations,
      drafts: {},
      assignments: {},
      auditTrail: [],
      readyForPublication: [],
      published: [],
    };
  }

  private static emptyTranslationBundle(slug: string, english: string): TranslationBundle {
    const locales = {} as TranslationBundle['locales'];
    (['de', 'fr', 'es', 'it', 'nl'] as const).forEach((locale) => {
      locales[locale] = { locale, value: '', status: english ? 'MISSING' : 'MISSING' };
    });
    return {
      productSlug: slug,
      field: 'storeContent',
      englishSource: english,
      locales,
    };
  }

  private static buildMatchGroups(products: ReviewProductItem[]): PossibleMatchGroup[] {
    const buckets: Record<string, string[]> = {};
    const hints = [
      'laughing-gas',
      'ferrari-rocher',
      'ferrero-rocher',
      'kitkat',
      'kit-cats',
      'em-and-ems',
      'm-and-ms',
      'whole-melt',
      'wholemelt',
    ];
    for (const p of products) {
      if (p.confidence !== 'POSSIBLE_MATCH' && !hints.some((h) => p.canonicalSlug.includes(h))) continue;
      const key = hints.find((h) => p.canonicalSlug.includes(h)) || 'possible';
      const bucketKey = key.includes('rocher')
        ? 'rocher'
        : key.includes('kit')
          ? 'kitkat'
          : key.includes('em-and') || key.includes('m-and')
            ? 'mms'
            : key.includes('whole')
              ? 'whole-melt'
              : key;
      buckets[bucketKey] = buckets[bucketKey] || [];
      buckets[bucketKey].push(p.canonicalSlug);
    }
    return Object.entries(buckets)
      .filter(([, slugs]) => slugs.length > 1)
      .map(([key, slugs]) => ({
        id: `MATCH-${key}`,
        label: key.replace(/-/g, ' '),
        slugs,
        status: 'PENDING' as AdjudicationStatus,
        decision: null,
      }));
  }

  private static audit(entry: Omit<AdjudicationAudit, 'id' | 'timestamp'>) {
    const state = this.getState();
    state.auditTrail.push({
      ...entry,
      id: `ADJ-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      beforeValue: scrubSecrets(entry.beforeValue),
      afterValue: scrubSecrets(entry.afterValue),
    });
  }

  private static applyStatus(
    record: AdjudicationRecord,
    status: AdjudicationStatus,
    actor: string,
    decision: string,
    reason?: string
  ) {
    record.status = status;
    record.lastActor = actor;
    record.lastReviewedAt = new Date().toISOString();
    record.lastDecision = decision;
    record.reason = reason || record.reason;
  }

  static requireActor(actor?: string, role?: RoleName) {
    if (!actor || !actor.trim()) throw new Error('An authenticated human actor is required.');
    if (!role) throw new Error('An authorized reviewer role is required.');
    if (!['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'].includes(role)) {
      throw new Error(`Role ${role} is not authorized for catalogue adjudication.`);
    }
  }

  static getEuropeanCountries() {
    return CountryRegistry.getAllCountries().filter((c) => c.isEuropean);
  }

  static getDashboard(): { totalImported: number; fullyAdjudicated: number; remaining: number; queues: QueueCard[] } {
    const review = CatalogueReviewService.getState();
    const products = Object.values(review.products);
    const state = this.getState();
    const fullyAdjudicated = products.filter((p) => this.isFullyAdjudicated(p.canonicalSlug)).length;

    const count = (queue: AdjudicationQueue, predicate?: (r: AdjudicationRecord) => boolean) => {
      const items = Object.values(state.records).filter((r) => r.queue === queue && (!predicate || predicate(r)));
      const completed = items.filter((r) => r.status === 'APPROVED' || r.status === 'REJECTED').length;
      const blocked = items.filter((r) => r.status === 'BLOCKED').length;
      const needsReview = items.filter((r) => r.status === 'PENDING' || r.status === 'IN_REVIEW' || r.status === 'DEFERRED').length;
      return {
        queue,
        total: items.length,
        completed,
        remaining: items.length - completed - blocked,
        blocked,
        needsReview,
      };
    };

    const labels: Record<AdjudicationQueue, string> = {
      POSSIBLE_MATCHES: 'Possible Matches',
      DUPLICATE_CONFLICTS: 'Duplicate Conflicts',
      PRICING: 'Pricing',
      COMPLIANCE: 'Compliance',
      CONTENT: 'Content',
      CATEGORIES: 'Categories',
      MEDIA: 'Media',
      TRANSLATIONS: 'Translations',
      REVIEWS: 'Reviews',
      PUBLICATION_READINESS: 'Publication Readiness',
    };

    return {
      totalImported: products.length,
      fullyAdjudicated,
      remaining: products.length - fullyAdjudicated,
      queues: (Object.keys(labels) as AdjudicationQueue[]).map((queue) => ({
        ...count(queue),
        label: labels[queue],
      })),
    };
  }

  static isFullyAdjudicated(slug: string): boolean {
    const product = CatalogueReviewService.getProductDetail(slug);
    if (!product) return false;
    const state = this.getState();
    const requiredQueues: AdjudicationQueue[] = ['COMPLIANCE', 'CONTENT', 'PRICING', 'PUBLICATION_READINESS'];
    const requiredOk = requiredQueues.every((queue) => {
      const record = state.records[this.recordKey(queue, slug)];
      if (!record) return queue === 'PRICING' ? !product.pricingReviewRequired : false;
      return record.status === 'APPROVED';
    });
    const checklist = CatalogueReviewService.evaluatePublicationReadiness(product);
    return requiredOk && checklist.isReadyToPublish;
  }

  static setBatchSize(size: number): number {
    if (!(BATCH_SIZES as readonly number[]).includes(size)) {
      throw new Error(`Batch size must be one of ${BATCH_SIZES.join(', ')}.`);
    }
    const state = this.getState();
    state.batchSize = size;
    this.persist();
    return size;
  }

  static getBatch(queue: AdjudicationQueue, size?: number): { items: any[]; batchSize: number; offset: number; total: number } {
    const state = this.getState();
    const batchSize = size || state.batchSize || DEFAULT_BATCH_SIZE;
    const offset = state.batchCursors[queue] || 0;
    const records = Object.values(state.records)
      .filter((r) => r.queue === queue)
      .sort((a, b) => a.entityId.localeCompare(b.entityId));
    const slice = records.slice(offset, offset + batchSize);
    const items = slice.map((record) => this.hydrateBatchItem(record));
    return { items, batchSize, offset, total: records.length };
  }

  static advanceBatch(queue: AdjudicationQueue): number {
    const state = this.getState();
    const records = Object.values(state.records).filter((r) => r.queue === queue);
    const next = (state.batchCursors[queue] || 0) + state.batchSize;
    state.batchCursors[queue] = next >= records.length ? 0 : next;
    this.persist();
    return state.batchCursors[queue];
  }

  private static hydrateBatchItem(record: AdjudicationRecord) {
    const product = CatalogueReviewService.getProductDetail(record.productSlug);
    const state = this.getState();
    return {
      record,
      product,
      assignment: state.assignments[record.productSlug] || null,
      matchGroup: state.matchGroups.find((g) => g.id === record.entityId) || null,
      flavourGroup: state.flavourGroups.find((g) => g.candidateSlugs.includes(record.productSlug)) || null,
      translations: state.translations[record.productSlug] || null,
      draft: state.drafts[record.id] || null,
      checklist: product ? CatalogueReviewService.evaluatePublicationReadiness(product) : null,
      conflictSummary: product ? this.getConflictSummary(product.canonicalSlug) : null,
    };
  }

  static getConflictSummary(slug: string) {
    const product = CatalogueReviewService.getProductDetail(slug);
    const state = this.getState();
    if (!product) return null;
    const statusOf = (queue: AdjudicationQueue) => state.records[this.recordKey(queue, slug)]?.status || 'PENDING';
    return {
      matchStatus: product.confidence,
      pricingStatus: product.pricingReviewRequired ? 'PRICING_REVIEW_REQUIRED' : statusOf('PRICING'),
      complianceStatus: product.complianceClassification,
      contentStatus: product.contentModerationStatus,
      categoryStatus: product.categorySlug,
      mediaStatus: product.primaryImage ? 'HAS_PRIMARY' : 'MISSING_PRIMARY',
      translationStatus: this.translationBundleStatus(state.translations[slug]),
      seoStatus: product.seo.isApproved ? 'REVIEWED' : 'PENDING',
      countryStatus: Object.values(product.countryAvailability).some((s) => s === 'AVAILABLE')
        ? 'CONFIGURED'
        : 'NOT_CONFIGURED',
      inventoryStatus: product.variants.some((v) => v.stockLevel >= 0) ? 'CONFIGURED' : 'MISSING',
    };
  }

  private static translationBundleStatus(bundle?: TranslationBundle): string {
    if (!bundle) return 'MISSING';
    const values = Object.values(bundle.locales);
    if (values.every((v) => v.status === 'APPROVED')) return 'APPROVED';
    if (values.some((v) => v.status === 'REVIEWED' || v.status === 'DRAFT')) return 'DRAFT';
    return 'MISSING';
  }

  static assignReviewer(params: {
    productSlug: string;
    role: RoleName;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'].includes(params.role)) {
        return { success: false, error: 'Assignee must be a catalogue or compliance role.' };
      }
      const state = this.getState();
      const before = state.assignments[params.productSlug] || null;
      state.assignments[params.productSlug] = {
        role: params.role,
        actor: params.actor,
        assignedAt: new Date().toISOString(),
      };
      Object.values(state.records)
        .filter((r) => r.productSlug === params.productSlug)
        .forEach((r) => (r.assignedTo = params.role));
      this.audit({
        action: 'REVIEW_ASSIGNED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'assignedTo',
        beforeValue: before,
        afterValue: state.assignments[params.productSlug],
        reason: `Assigned to ${params.role}`,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static saveDraft(params: { recordId: string; draft: any; actor: string; actorRole: RoleName }) {
    this.requireActor(params.actor, params.actorRole);
    const state = this.getState();
    state.drafts[params.recordId] = { ...params.draft, savedAt: new Date().toISOString(), actor: params.actor };
    const record = state.records[params.recordId];
    if (record && record.status === 'PENDING') record.status = 'IN_REVIEW';
    this.persist();
    return { success: true };
  }

  static adjudicatePossibleMatch(params: {
    groupId: string;
    decision: 'MERGE' | 'KEEP_SEPARATE' | 'DEFER';
    reason?: string;
    confirmMerge?: boolean;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string; group?: PossibleMatchGroup } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const group = state.matchGroups.find((g) => g.id === params.groupId);
      if (!group) return { success: false, error: `Match group ${params.groupId} not found.` };
      const record = this.ensureRecord('POSSIBLE_MATCHES', group.id, group.slugs[0]);
      const before = cloneJson(group);

      if (params.decision === 'MERGE') {
        if (!params.confirmMerge) return { success: false, error: 'MERGE requires explicit confirmation.' };
        group.decision = 'MERGE';
        group.status = 'APPROVED';
        this.applyStatus(record, 'APPROVED', params.actor, 'MERGE', params.reason);
        this.audit({
          action: 'MATCH_MERGED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: group.slugs.join(','),
          field: 'matchGroup',
          beforeValue: before,
          afterValue: group,
          reason: params.reason || 'Confirmed merge of possible match group',
        });
      } else if (params.decision === 'KEEP_SEPARATE') {
        if (!params.reason?.trim()) return { success: false, error: 'KEEP SEPARATE requires a reason.' };
        group.decision = 'KEEP_SEPARATE';
        group.status = 'APPROVED';
        this.applyStatus(record, 'APPROVED', params.actor, 'KEEP_SEPARATE', params.reason);
        this.audit({
          action: 'MATCH_SEPARATED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: group.slugs.join(','),
          field: 'matchGroup',
          beforeValue: before,
          afterValue: group,
          reason: params.reason,
        });
      } else {
        group.decision = 'DEFER';
        group.status = 'DEFERRED';
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason || 'Deferred possible match');
        this.audit({
          action: 'ITEM_DEFERRED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: group.slugs.join(','),
          field: 'matchGroup',
          beforeValue: before,
          afterValue: group,
          reason: params.reason || 'Deferred. Issue preserved.',
        });
      }
      this.persist();
      return { success: true, group };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateFieldConflict(params: {
    productSlug: string;
    fieldName: string;
    choice: 'USE_REFERENCE' | 'USE_REPO_A' | 'USE_REPO_B' | 'KEEP_CURRENT_EU' | 'CUSTOM_VALUE' | 'DEFER';
    customValue?: string;
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const record = this.ensureRecord('DUPLICATE_CONFLICTS', params.productSlug, params.productSlug);
      if (params.choice === 'DEFER') {
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason);
        this.audit({
          action: 'ITEM_DEFERRED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: params.fieldName,
          beforeValue: null,
          afterValue: 'DEFERRED',
          reason: params.reason || 'Deferred unresolved field conflict',
        });
        this.persist();
        return { success: true };
      }
      const mapped = params.choice === 'CUSTOM_VALUE' ? 'CUSTOM_APPROVED_VALUE' : params.choice;
      const result = CatalogueReviewService.approveFieldDecision({
        productSlug: params.productSlug,
        fieldName: params.fieldName,
        choice: mapped as any,
        customValue: params.customValue,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      if (!result.success) return { success: false, error: result.error };
      this.applyStatus(record, 'APPROVED', params.actor, params.choice, params.reason);
      this.audit({
        action: 'FIELD_APPROVED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: params.fieldName,
        beforeValue: result.product?.fieldDecisions[params.fieldName] ? undefined : null,
        afterValue: result.product?.fieldDecisions[params.fieldName]?.approvedValue,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateFlavourGroup(params: {
    groupId: string;
    decision: 'MERGE_INTO_VARIANTS' | 'KEEP_AS_SEPARATE_PRODUCTS' | 'DEFER';
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const group = state.flavourGroups.find((g) => g.id === params.groupId);
      if (!group) return { success: false, error: `Flavour group ${params.groupId} not found.` };
      const before = cloneJson(group);

      if (params.decision === 'DEFER') {
        group.status = 'DEFERRED';
        group.decision = 'DEFER';
        this.audit({
          action: 'ITEM_DEFERRED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: group.parentSlug,
          field: 'flavourGroup',
          beforeValue: before,
          afterValue: group,
          reason: params.reason,
        });
        this.persist();
        return { success: true };
      }

      const option = params.decision === 'MERGE_INTO_VARIANTS' ? 'PARENT_WITH_VARIANTS' : 'INDIVIDUAL_PRODUCTS';
      for (const slug of group.candidateSlugs) {
        const result = CatalogueReviewService.decideVariantStructure({
          productSlug: slug,
          decision: option,
          parentTargetSlug: group.parentSlug,
          actor: params.actor,
          actorRole: params.actorRole,
          reason: params.reason,
        });
        if (!result.success) return { success: false, error: result.error };
      }
      group.status = 'APPROVED';
      group.decision = params.decision;
      this.audit({
        action: params.decision === 'MERGE_INTO_VARIANTS' ? 'FLAVOUR_MERGED' : 'FLAVOUR_SEPARATED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: group.parentSlug,
        field: 'flavourGroup',
        beforeValue: before,
        afterValue: group,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicatePricing(params: {
    productSlug: string;
    decision: 'APPROVE_EXISTING_EU_PRICE' | 'SET_EUR_PRICE' | 'SET_GBP_PRICE' | 'MARK_PRICING_UNRESOLVED' | 'DEFER';
    priceEUR?: MinorUnits;
    priceGBP?: MinorUnits;
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const product = CatalogueReviewService.getProductDetail(params.productSlug);
      if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };
      const record = this.ensureRecord('PRICING', params.productSlug, params.productSlug);

      if (params.decision === 'DEFER') {
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason);
        this.audit({
          action: 'ITEM_DEFERRED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'priceEUR',
          beforeValue: { eur: product.priceEUR, gbp: product.priceGBP },
          afterValue: 'DEFERRED',
          reason: params.reason,
        });
        this.persist();
        return { success: true };
      }

      if (params.decision === 'MARK_PRICING_UNRESOLVED') {
        this.applyStatus(record, 'PENDING', params.actor, 'MARK_PRICING_UNRESOLVED', params.reason);
        this.persist();
        return { success: true };
      }

      if (params.decision === 'APPROVE_EXISTING_EU_PRICE') {
        if (!product.priceEUR || product.priceEUR <= 0) {
          return { success: false, error: 'No existing EU EUR price to approve. Enter an explicit EUR price.' };
        }
        const result = CatalogueReviewService.approveWholesalePricing({
          productSlug: params.productSlug,
          approvedPriceEUR: product.priceEUR,
          approvedPriceGBP: product.priceGBP || undefined,
          actor: params.actor,
          actorRole: params.actorRole,
          reason: params.reason,
        });
        if (!result.success) return { success: false, error: result.error };
        this.applyStatus(record, 'APPROVED', params.actor, params.decision, params.reason);
        this.audit({
          action: 'PRICE_APPROVED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'priceEUR',
          beforeValue: product.priceEUR,
          afterValue: product.priceEUR,
          reason: params.reason,
        });
        this.persist();
        return { success: true };
      }

      if (params.decision === 'SET_EUR_PRICE') {
        if (!params.priceEUR || params.priceEUR <= 0) {
          return { success: false, error: 'Explicit EUR price in minor units is required. USD is not converted.' };
        }
        const result = CatalogueReviewService.approveWholesalePricing({
          productSlug: params.productSlug,
          approvedPriceEUR: params.priceEUR,
          approvedPriceGBP: params.priceGBP,
          actor: params.actor,
          actorRole: params.actorRole,
          reason: params.reason,
        });
        if (!result.success) return { success: false, error: result.error };
        this.applyStatus(record, 'APPROVED', params.actor, params.decision, params.reason);
        this.audit({
          action: 'PRICE_CHANGED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'priceEUR',
          beforeValue: product.priceEUR,
          afterValue: params.priceEUR,
          reason: params.reason,
        });
        this.persist();
        return { success: true };
      }

      if (params.decision === 'SET_GBP_PRICE') {
        if (!params.priceGBP || params.priceGBP <= 0) {
          return { success: false, error: 'Explicit GBP price in minor units is required. No exchange rate is applied.' };
        }
        if (!product.priceEUR || product.priceEUR <= 0) {
          return { success: false, error: 'Set an approved EUR price before or together with GBP. GBP fallback is not used as approval.' };
        }
        const result = CatalogueReviewService.approveWholesalePricing({
          productSlug: params.productSlug,
          approvedPriceEUR: product.priceEUR,
          approvedPriceGBP: params.priceGBP,
          actor: params.actor,
          actorRole: params.actorRole,
          reason: params.reason,
        });
        if (!result.success) return { success: false, error: result.error };
        this.applyStatus(record, 'APPROVED', params.actor, params.decision, params.reason);
        this.audit({
          action: 'PRICE_CHANGED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'priceGBP',
          beforeValue: product.priceGBP,
          afterValue: params.priceGBP,
          reason: params.reason,
        });
        this.persist();
        return { success: true };
      }

      return { success: false, error: 'Unknown pricing decision.' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateCompliance(params: {
    productSlug: string;
    classification: ComplianceClassification | 'DEFER';
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const record = this.ensureRecord('COMPLIANCE', params.productSlug, params.productSlug);
      if (params.classification === 'DEFER') {
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason);
        this.audit({
          action: 'ITEM_DEFERRED',
          actor: params.actor,
          actorRole: params.actorRole,
          product: params.productSlug,
          field: 'complianceClassification',
          beforeValue: CatalogueReviewService.getProductDetail(params.productSlug)?.complianceClassification,
          afterValue: 'DEFERRED',
          reason: params.reason,
        });
        this.persist();
        return { success: true };
      }
      const result = CatalogueReviewService.updateComplianceClassification({
        productSlug: params.productSlug,
        classification: params.classification,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      if (!result.success) return { success: false, error: result.error };
      this.applyStatus(
        record,
        params.classification === 'BLOCKED' ? 'BLOCKED' : params.classification === 'APPROVED' ? 'APPROVED' : 'PENDING',
        params.actor,
        params.classification,
        params.reason
      );
      this.audit({
        action: params.classification === 'BLOCKED' ? 'COMPLIANCE_BLOCKED' : 'COMPLIANCE_APPROVED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'complianceClassification',
        beforeValue: null,
        afterValue: params.classification,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateCountry(params: {
    productSlug: string;
    countryCode: string;
    status: CountryAvailabilityStatus;
    reason?: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if ((params.status === 'RESTRICTED' || params.status === 'BLOCKED') && !params.reason?.trim()) {
        return { success: false, error: 'RESTRICTED and BLOCKED country decisions require an internal reason.' };
      }
      const result = CatalogueReviewService.updateCountryAvailability({
        productSlug: params.productSlug,
        countryCode: params.countryCode,
        status: params.status,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason || `Set ${params.countryCode} to ${params.status}`,
      });
      if (!result.success) return { success: false, error: result.error };
      this.audit({
        action: 'COUNTRY_CHANGED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: `country:${params.countryCode}`,
        beforeValue: null,
        afterValue: params.status,
        reason: params.reason || `Country ${params.countryCode} set to ${params.status}`,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateContent(params: {
    productSlug: string;
    action: 'APPROVE' | 'REWRITE' | 'BLOCK' | 'DEFER';
    rewrittenContent?: string;
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const product = CatalogueReviewService.getProductDetail(params.productSlug);
      if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };
      const original = product.originalSourceContent;
      const record = this.ensureRecord('CONTENT', params.productSlug, params.productSlug);

      if (params.action === 'DEFER') {
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason);
        this.persist();
        return { success: true };
      }

      const result = CatalogueReviewService.moderateContent({
        productSlug: params.productSlug,
        action: params.action,
        rewrittenContent: params.rewrittenContent,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      if (!result.success) return { success: false, error: result.error };
      if (result.product?.originalSourceContent !== original) {
        return { success: false, error: 'Raw source content must remain unchanged.' };
      }
      this.applyStatus(record, params.action === 'BLOCK' ? 'BLOCKED' : 'APPROVED', params.actor, params.action, params.reason);
      this.audit({
        action: params.action === 'REWRITE' ? 'CONTENT_REWRITTEN' : 'CONTENT_APPROVED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'approvedStoreContent',
        beforeValue: original,
        afterValue: result.product?.approvedStoreContent,
        reason: params.reason,
      });
      const bundle = this.getState().translations[params.productSlug];
      if (bundle && result.product?.approvedStoreContent) {
        bundle.englishSource = result.product.approvedStoreContent;
      }
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateMedia(params: {
    productSlug: string;
    mediaId: string;
    action: 'SET_PRIMARY' | 'KEEP' | 'REJECT' | 'MARK_MISSING' | 'DEFER';
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const record = this.ensureRecord('MEDIA', params.productSlug, params.productSlug);
      if (params.action === 'DEFER') {
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason);
        this.persist();
        return { success: true };
      }
      const mapped =
        params.action === 'REJECT' ? 'REMOVE' : params.action === 'MARK_MISSING' ? 'FLAG_BROKEN' : params.action;
      const result = CatalogueReviewService.moderateMedia({
        productSlug: params.productSlug,
        mediaId: params.mediaId,
        action: mapped as 'SET_PRIMARY' | 'REMOVE' | 'KEEP' | 'FLAG_BROKEN',
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      if (!result.success) return { success: false, error: result.error };
      this.applyStatus(record, 'APPROVED', params.actor, params.action, params.reason);
      this.audit({
        action: 'MEDIA_APPROVED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: params.mediaId,
        beforeValue: null,
        afterValue: params.action,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static saveTranslationDraft(params: {
    productSlug: string;
    locale: Exclude<LocaleCode, 'en'>;
    value: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const product = CatalogueReviewService.getProductDetail(params.productSlug);
      if (!state.translations[params.productSlug]) {
        state.translations[params.productSlug] = this.emptyTranslationBundle(
          params.productSlug,
          product?.approvedStoreContent || ''
        );
      }
      const field = state.translations[params.productSlug].locales[params.locale];
      field.value = params.value;
      field.status = params.value.trim() ? 'DRAFT' : 'MISSING';
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static approveTranslation(params: {
    productSlug: string;
    locale: Exclude<LocaleCode, 'en'>;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const bundle = state.translations[params.productSlug];
      if (!bundle) return { success: false, error: 'Translation bundle missing.' };
      const field = bundle.locales[params.locale];
      if (!field.value.trim()) return { success: false, error: 'Cannot approve an empty translation. Machine text is not auto-approved.' };
      field.status = 'APPROVED';
      const record = this.ensureRecord('TRANSLATIONS', params.productSlug, params.productSlug);
      const allApproved = Object.values(bundle.locales).every((l) => l.status === 'APPROVED');
      if (allApproved) this.applyStatus(record, 'APPROVED', params.actor, 'TRANSLATION_APPROVED', params.reason);
      this.audit({
        action: 'TRANSLATION_APPROVED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: `translation:${params.locale}`,
        beforeValue: 'DRAFT',
        afterValue: field.value,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateCategory(params: {
    sourceCategorySlug: string;
    action: 'APPROVE' | 'CHANGE_TARGET' | 'CREATE_NEW_CATEGORY' | 'DEFER';
    targetCategorySlug?: string;
    targetCategoryName?: string;
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string; mapping?: CategoryMappingDecision } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const record = this.ensureRecord('CATEGORIES', params.sourceCategorySlug, params.sourceCategorySlug);
      if (params.action === 'DEFER') {
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason);
        this.persist();
        return { success: true };
      }
      const mapping = CatalogueReviewService.getState().categoryMappings.find(
        (m) => m.sourceCategorySlug === params.sourceCategorySlug
      );
      if (!mapping) return { success: false, error: 'Category mapping not found.' };
      const targetSlug = params.targetCategorySlug || mapping.normalizedCategorySlug;
      const targetName = params.targetCategoryName || mapping.normalizedCategoryName;
      const result = CatalogueReviewService.approveCategoryMapping({
        sourceCategorySlug: params.sourceCategorySlug,
        targetCategorySlug: targetSlug,
        targetCategoryName: targetName,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      if (!result.success) return { success: false, error: result.error };
      this.applyStatus(record, 'APPROVED', params.actor, params.action, params.reason);
      this.audit({
        action: 'CATEGORY_APPROVED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.sourceCategorySlug,
        field: 'categoryMapping',
        beforeValue: mapping.sourceCategoryName,
        afterValue: targetName,
        reason: params.reason,
      });
      this.persist();
      return { success: true, mapping: result.mapping };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static adjudicateImportedReview(params: {
    reviewId: string;
    action: 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'DEFER';
    reason: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string; review?: ReviewModerationItem } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const review = CatalogueReviewService.getState().reviews.find((r) => r.id === params.reviewId);
      if (!review) return { success: false, error: 'Review not found.' };
      const record = this.ensureRecord('REVIEWS', params.reviewId, review.productSlug);
      if (params.action === 'DEFER') {
        this.applyStatus(record, 'DEFERRED', params.actor, 'DEFER', params.reason);
        this.persist();
        return { success: true, review };
      }
      const result = CatalogueReviewService.moderateReview({
        reviewId: params.reviewId,
        action: params.action,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      if (!result.success) return { success: false, error: result.error };
      this.applyStatus(record, params.action === 'APPROVE' ? 'APPROVED' : 'REJECTED', params.actor, params.action, params.reason);
      this.audit({
        action: 'REVIEW_APPROVED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: review.productSlug,
        field: params.reviewId,
        beforeValue: 'STAGED',
        afterValue: result.review?.moderationStatus,
        reason: params.reason,
      });
      this.persist();
      return { success: true, review: result.review };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static markReadyForPublication(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const product = CatalogueReviewService.getProductDetail(params.productSlug);
      if (!product) return { success: false, error: 'Product not found.' };
      const checklist = CatalogueReviewService.evaluatePublicationReadiness(product);
      const record = this.ensureRecord('PUBLICATION_READINESS', params.productSlug, params.productSlug);
      if (!checklist.isReadyToPublish) {
        this.applyStatus(record, 'PENDING', params.actor, 'NOT_READY', checklist.blockers.join('; '));
        this.persist();
        return { success: false, error: `NOT_READY: ${checklist.blockers.join('; ')}` };
      }
      const state = this.getState();
      if (!state.readyForPublication.includes(params.productSlug)) {
        state.readyForPublication.push(params.productSlug);
      }
      this.applyStatus(record, 'APPROVED', params.actor, 'READY_FOR_PUBLICATION', params.reason);
      this.audit({
        action: 'PRODUCT_READY',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'publicationReadiness',
        beforeValue: 'NOT_READY',
        afterValue: 'READY_FOR_PUBLICATION',
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static publishFinal(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
    confirm: boolean;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (params.actorRole !== 'SUPER_ADMIN') {
        return { success: false, error: 'Only SUPER_ADMIN may perform final publication.' };
      }
      if (!params.confirm) {
        return { success: false, error: 'Final publication requires explicit confirmation.' };
      }
      const state = this.getState();
      if (!state.readyForPublication.includes(params.productSlug)) {
        return { success: false, error: 'Product is not READY_FOR_PUBLICATION. Complete the two-step review first.' };
      }
      const result = CatalogueReviewService.publishProduct({
        productSlug: params.productSlug,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      if (!result.success) return { success: false, error: result.error };
      if (!state.published.includes(params.productSlug)) state.published.push(params.productSlug);
      this.audit({
        action: 'PRODUCT_PUBLISHED',
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        field: 'publicationStatus',
        beforeValue: 'READY_FOR_PUBLICATION',
        afterValue: 'PUBLISHED',
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static getPreview(params: {
    productSlug: string;
    locale?: LocaleCode;
    currency?: 'EUR' | 'GBP';
    countryCode?: string;
  }): PublicationPreview | null {
    const product = CatalogueReviewService.getProductDetail(params.productSlug);
    if (!product) return null;
    const locale = params.locale || 'en';
    const currency = params.currency || 'EUR';
    const countryCode = params.countryCode || 'NL';
    const bundle = this.getState().translations[params.productSlug];
    const translated =
      locale === 'en'
        ? product.approvedStoreContent || product.description
        : bundle?.locales[locale as Exclude<LocaleCode, 'en'>]?.value || '[Translation missing]';
    const availability = product.countryAvailability[countryCode] || 'NOT_CONFIGURED';
    const eligibility = CatalogueReviewService.evaluatePurchaseEligibility(params.productSlug, countryCode);
    const amount = currency === 'GBP' ? product.priceGBP : product.priceEUR;
    return {
      slug: product.canonicalSlug,
      locale,
      currency,
      countryCode,
      name: product.name,
      description: translated,
      priceLabel: amount && amount > 0 ? `${currency === 'GBP' ? '£' : '€'}${(amount / 100).toFixed(2)}` : 'Price not approved',
      availability,
      customerMessage: eligibility.customerMessage,
      isolated: true,
    };
  }

  static executeSafeBulk(params: {
    action: 'ASSIGN_CATEGORY' | 'APPROVE_MEDIA' | 'ASSIGN_REVIEWER' | 'CHANGE_REVIEW_QUEUE' | 'SET_TRANSLATION_STATUS' | string;
    productSlugs: string[];
    actor: string;
    actorRole: RoleName;
    reason: string;
    targetCategorySlug?: string;
    targetCategoryName?: string;
    assigneeRole?: RoleName;
    translationStatus?: TranslationLocaleStatus;
    queue?: AdjudicationQueue;
  }): { success: boolean; affectedCount: number; errors?: string[] } {
    this.requireActor(params.actor, params.actorRole);
    if (FORBIDDEN_BULK_ACTIONS.has(params.action) || /publish|compliance|country|price|content/i.test(params.action) && !['ASSIGN_CATEGORY', 'APPROVE_MEDIA', 'ASSIGN_REVIEWER', 'CHANGE_REVIEW_QUEUE', 'SET_TRANSLATION_STATUS'].includes(params.action)) {
      return { success: false, affectedCount: 0, errors: [`Bulk action ${params.action} is forbidden.`] };
    }

    const errors: string[] = [];
    let affectedCount = 0;
    const state = this.getState();

    if (params.action === 'ASSIGN_REVIEWER' && params.assigneeRole) {
      for (const slug of params.productSlugs) {
        const res = this.assignReviewer({
          productSlug: slug,
          role: params.assigneeRole,
          actor: params.actor,
          actorRole: params.actorRole,
        });
        if (res.success) affectedCount++;
        else if (res.error) errors.push(res.error);
      }
    } else if (params.action === 'APPROVE_MEDIA') {
      const result = CatalogueReviewService.executeBulkAction({
        productSlugs: params.productSlugs,
        action: 'APPROVE_MEDIA',
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      affectedCount = result.affectedCount;
      if (result.errors) errors.push(...result.errors);
    } else if (params.action === 'ASSIGN_CATEGORY' && params.targetCategorySlug && params.targetCategoryName) {
      const result = CatalogueReviewService.executeBulkAction({
        productSlugs: params.productSlugs,
        action: 'ASSIGN_CATEGORY',
        targetCategorySlug: params.targetCategorySlug,
        targetCategoryName: params.targetCategoryName,
        actor: params.actor,
        actorRole: params.actorRole,
        reason: params.reason,
      });
      affectedCount = result.affectedCount;
    } else if (params.action === 'SET_TRANSLATION_STATUS' && params.translationStatus && params.translationStatus !== 'APPROVED') {
      for (const slug of params.productSlugs) {
        const bundle = state.translations[slug];
        if (!bundle) continue;
        Object.values(bundle.locales).forEach((l) => {
          if (l.value) l.status = params.translationStatus!;
        });
        affectedCount++;
      }
    } else if (params.action === 'CHANGE_REVIEW_QUEUE' && params.queue) {
      for (const slug of params.productSlugs) {
        this.ensureRecord(params.queue, slug, slug);
        affectedCount++;
      }
    } else {
      return { success: false, affectedCount: 0, errors: ['Unsupported or incomplete safe bulk action.'] };
    }

    this.persist();
    return { success: errors.length === 0, affectedCount, errors: errors.length ? errors : undefined };
  }

  static getAuditTrail(): AdjudicationAudit[] {
    return [...this.getState().auditTrail].reverse();
  }

  static getOperatorReport(): OperatorAdjudicationReport {
    const dash = this.getDashboard();
    const state = this.getState();
    const countAction = (action: AdjudicationAuditAction) => state.auditTrail.filter((a) => a.action === action).length;
    const products = Object.values(CatalogueReviewService.getState().products);
    return {
      totalImported: dash.totalImported,
      fullyAdjudicated: dash.fullyAdjudicated,
      remaining: dash.remaining,
      possibleMatchesRemaining: dash.queues.find((q) => q.queue === 'POSSIBLE_MATCHES')?.remaining || 0,
      duplicateConflictsRemaining: dash.queues.find((q) => q.queue === 'DUPLICATE_CONFLICTS')?.remaining || 0,
      pricingDecisions: countAction('PRICE_APPROVED') + countAction('PRICE_CHANGED'),
      complianceDecisions: countAction('COMPLIANCE_APPROVED') + countAction('COMPLIANCE_BLOCKED'),
      countryDecisions: countAction('COUNTRY_CHANGED'),
      contentDecisions: countAction('CONTENT_APPROVED') + countAction('CONTENT_REWRITTEN'),
      mediaDecisions: countAction('MEDIA_APPROVED'),
      translationDecisions: countAction('TRANSLATION_APPROVED'),
      reviewModerationDecisions: countAction('REVIEW_APPROVED'),
      readyForPublication: state.readyForPublication.length,
      published: state.published.length,
      blocked: products.filter((p) => p.publicationStatus === 'BLOCKED' || p.complianceClassification === 'BLOCKED').length,
    };
  }

  static getCategoryMappings(): CategoryMappingDecision[] {
    return CatalogueReviewService.getState().categoryMappings;
  }

  static getReviews(): ReviewModerationItem[] {
    return CatalogueReviewService.getState().reviews;
  }

  static getFlavourGroups(): FlavourGroup[] {
    return this.getState().flavourGroups;
  }

  static getMatchGroups(): PossibleMatchGroup[] {
    return this.getState().matchGroups;
  }
}

export { SUPPORTED_LOCALES };
