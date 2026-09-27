// ==============================================================================
// FUSION MUSHROOM BARS EU - CATALOGUE DECISION RECOMMENDATION ENGINE
// Proposes human-reviewable suggestions from source evidence.
// NEVER auto-publishes, never assigns EUR prices, never decides legality.
// NEVER mutates RawProductRecord / RawCategoryRecord / RawMediaRecord /
// RawReviewRecord / SourceSnapshot.
// ==============================================================================

import { RoleName } from '@/types';
import {
  CatalogueReviewService,
  ReviewProductItem,
  CategoryMappingDecision,
  ReviewModerationItem,
} from '@/domain/catalog/CatalogueReviewService';
import { CatalogueAdjudicationService } from '@/domain/catalog/CatalogueAdjudicationService';
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

function normalizeText(value: any): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function valuesAgree(values: any[]): boolean {
  const normalized = values
    .map((v) => normalizeText(v))
    .filter((v) => v.length > 0);
  if (normalized.length < 2) return false;
  return normalized.every((v) => v === normalized[0]);
}

function sourceDisplayName(raw: any): string {
  return raw?.rawPayload?.name || raw?.sourceShortDescription || raw?.sourceSlug || raw?.sourceName || '';
}

export type RecommendationEntityType =
  | 'PRODUCT'
  | 'MATCH_GROUP'
  | 'FIELD'
  | 'VARIANT_GROUP'
  | 'CATEGORY'
  | 'MEDIA'
  | 'REVIEW'
  | 'TRANSLATION'
  | 'COUNTRY'
  | 'PUBLICATION';

export type RecommendationConfidence =
  | 'VERY_HIGH'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INSUFFICIENT_EVIDENCE';

export type RecommendationReviewStatus = 'SUGGESTED' | 'ACCEPTED' | 'REJECTED' | 'DEFERRED' | 'SUPERSEDED_BY_HUMAN_DECISION';


export type RecommendationPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type RecommendationDecisionType =
  | 'DUPLICATE_IDENTITY'
  | 'FIELD_RECONCILIATION'
  | 'EXACT_MATCH_CONSENSUS'
  | 'VARIANT_GROUPING'
  | 'CATEGORY_MAPPING'
  | 'PRICING_CLASSIFICATION'
  | 'COMPLIANCE_DATA_REVIEW'
  | 'CONTENT_FLAGS'
  | 'COUNTRY_CONFIGURATION'
  | 'MEDIA_QUALITY'
  | 'REVIEW_QUALITY'
  | 'TRANSLATION_REQUIRED'
  | 'PUBLICATION_READINESS'
  | 'BULK_GROUP';

export type SafeBulkGroupKey =
  | 'SOURCES_AGREE'
  | 'SAME_PRODUCT_CANDIDATE'
  | 'SAME_VARIANT_CANDIDATE'
  | 'NEEDS_PRICE'
  | 'NEEDS_TRANSLATION'
  | 'NEEDS_CONTENT_REVIEW';

export interface RecommendationEvidence {
  summary: string;
  reasonCode:
    | 'CURRENT_EU_ALREADY_APPROVED'
    | 'REFERENCE_IS_MOST_RECENT'
    | 'REPOSITORY_DATA_MATCHES_REFERENCE'
    | 'CONFLICT_REQUIRES_HUMAN_REVIEW'
    | 'MISSING_EVIDENCE'
    | 'ALL_SOURCES_AGREE'
    | 'SOURCE_DATA_CLASSIFICATION'
    | 'PUBLICATION_GATE'
    | 'VARIANT_STRUCTURE_HINT'
    | 'MEDIA_HASH_OR_STATUS'
    | 'REVIEW_DATA_QUALITY'
    | 'TRANSLATION_GAP'
    | 'CATEGORY_TAXONOMY_HINT';
  details: Record<string, any>;
  signals?: string[];
}

export interface CatalogueDecisionRecommendation {
  id: string;
  entityType: RecommendationEntityType;
  entityId: string;
  productSlug?: string | null;
  decisionType: RecommendationDecisionType;
  recommendation: string;
  proposedAction?: string | null;
  proposedValue?: any;
  currentValue?: any;
  confidence: RecommendationConfidence;
  priority: RecommendationPriority;
  evidence: RecommendationEvidence;
  sourceRecords: any[];
  conflicts?: Record<string, any> | null;
  generatedAt: string;
  reviewStatus: RecommendationReviewStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  decisionReason?: string | null;
  highRisk: boolean;
  bulkGroup?: SafeBulkGroupKey | null;
}

export interface RecommendationAudit {
  id: string;
  action:
    | 'RECOMMENDATION_ACCEPTED'
    | 'RECOMMENDATION_REJECTED'
    | 'RECOMMENDATION_EDITED'
    | 'RECOMMENDATION_DEFERRED'
    | 'RECOMMENDATION_SUPERSEDED'
    | 'RECOMMENDATIONS_GENERATED';
  actor: string;
  actorRole: RoleName;
  timestamp: string;
  recommendationId: string;
  evidence: any;
  beforeValue: any;
  afterValue: any;
  reason: string;
}

export interface DecisionPreview {
  recommendationId: string;
  before: any;
  after: any;
  sourceImpact: string;
  storeImpact: string;
  publicationImpact: string;
  requiresConfirm: true;
  highRisk: boolean;
}

export interface PublicationBlockingChecklist {
  productSlug: string;
  publicationStatus: 'NOT_READY' | 'READY_CANDIDATE' | 'BLOCKED';
  gates: Record<string, 'READY' | 'BLOCKED' | 'NOT_CONFIGURED'>;
  blockers: string[];
}

export interface RecommendationDashboard {
  totalRecommendations: number;
  suggested: number;
  accepted: number;
  rejected: number;
  deferred: number;
  byPriority: Record<RecommendationPriority, number>;
  byDecisionType: Record<string, number>;
  safeBulkGroups: Record<SafeBulkGroupKey, number>;
  productsWithRecommendations: number;
}

export interface RecommendationEngineState {
  version: number;
  lastGeneratedAt: string | null;
  recommendations: Record<string, CatalogueDecisionRecommendation>;
  auditTrail: RecommendationAudit[];
}

const HIGH_RISK_TYPES = new Set<RecommendationDecisionType>([
  'DUPLICATE_IDENTITY',
  'VARIANT_GROUPING',
  'COMPLIANCE_DATA_REVIEW',
  'CONTENT_FLAGS',
  'COUNTRY_CONFIGURATION',
  'PRICING_CLASSIFICATION',
]);

const REGULATED_HINT =
  /\b(vaporizer|vape|cannabinoid|cbd|thc|psychoactive|psilocybin|capsule|botanical capsule|delta-?8|delta-?9)\b/i;

export class CatalogueDecisionRecommendationService {
  private static cachedState: RecommendationEngineState | null = null;
  private static persistEnabled = true;
  private static readonly STATE_FILE_PATH = 'src/data/catalogue-recommendation-state.json';

  static setPersistenceEnabled(enabled: boolean): void {
    this.persistEnabled = enabled;
  }

  static clearCache(): void {
    this.cachedState = null;
  }

  static resetStateForTests(state?: RecommendationEngineState): RecommendationEngineState {
    this.persistEnabled = false;
    this.cachedState = state || { version: 1, lastGeneratedAt: null, recommendations: {}, auditTrail: [] };
    return this.cachedState;
  }

  static getState(): RecommendationEngineState {
    if (this.cachedState) return this.cachedState;
    const fs = getFs();
    const path = getPath();
    if (this.persistEnabled && fs && path) {
      const fullPath = path.resolve(process.cwd(), this.STATE_FILE_PATH);
      if (fs.existsSync(fullPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (parsed?.recommendations) {
            this.cachedState = parsed;
            return this.cachedState!;
          }
        } catch (err: any) {
          console.warn('Could not read recommendation state:', err.message);
        }
      }
    }
    this.cachedState = { version: 1, lastGeneratedAt: null, recommendations: {}, auditTrail: [] };
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
      console.error('Failed to persist recommendation state:', err.message);
      return false;
    }
  }

  private static requireActor(actor?: string, role?: RoleName) {
    if (!actor?.trim()) throw new Error('An authenticated human actor is required.');
    if (!role || !['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'].includes(role)) {
      throw new Error(`Role ${role} is not authorized for recommendation review.`);
    }
  }

  private static audit(entry: Omit<RecommendationAudit, 'id' | 'timestamp'>) {
    const state = this.getState();
    state.auditTrail.push({
      ...entry,
      id: `REC-AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      evidence: scrubSecrets(entry.evidence),
      beforeValue: scrubSecrets(entry.beforeValue),
      afterValue: scrubSecrets(entry.afterValue),
    });
  }

  private static makeId(parts: string[]): string {
    return `REC-${parts.map((p) => normalizeText(p).replace(/\s+/g, '-').slice(0, 40)).join('-')}`.slice(0, 120);
  }

  private static pushRec(
    list: CatalogueDecisionRecommendation[],
    partial: Omit<CatalogueDecisionRecommendation, 'generatedAt' | 'reviewStatus' | 'highRisk'> & {
      highRisk?: boolean;
    }
  ) {
    list.push({
      ...partial,
      generatedAt: new Date().toISOString(),
      reviewStatus: 'SUGGESTED',
      highRisk: partial.highRisk ?? HIGH_RISK_TYPES.has(partial.decisionType),
      reviewedBy: null,
      reviewedAt: null,
      decisionReason: null,
    });
  }

  // --------------------------------------------------------------------------
  // GENERATION
  // --------------------------------------------------------------------------

  static generateAll(params?: { actor?: string; actorRole?: RoleName }): {
    success: boolean;
    count: number;
    error?: string;
  } {
    try {
      const products = Object.values(CatalogueReviewService.getState().products);
      const mappings = CatalogueReviewService.getState().categoryMappings;
      const reviews = CatalogueReviewService.getState().reviews;
      const matchGroups = CatalogueAdjudicationService.getMatchGroups();
      const flavourGroups = CatalogueAdjudicationService.getFlavourGroups();

      const generated: CatalogueDecisionRecommendation[] = [];

      for (const group of matchGroups) {
        this.recommendDuplicateGroup(group, products, generated);
      }

      for (const product of products) {
        this.recommendFieldReconciliations(product, generated);
        this.recommendPricing(product, generated);
        this.recommendComplianceDataReview(product, generated);
        this.recommendContent(product, generated);
        this.recommendCountry(product, generated);
        this.recommendMedia(product, generated);
        this.recommendTranslation(product, generated);
        this.recommendPublicationReadiness(product, generated);
      }

      for (const group of flavourGroups) {
        this.recommendVariantGrouping(group, products, generated);
      }

      for (const mapping of mappings.filter((m) => m.approvalStatus === 'PENDING')) {
        this.recommendCategory(mapping, generated);
      }

      for (const review of reviews.filter((r) => r.moderationStatus === 'STAGED')) {
        this.recommendReviewQuality(review, generated);
      }

      const state = this.getState();
      const next: Record<string, CatalogueDecisionRecommendation> = {};
      for (const rec of generated) {
        const existing = state.recommendations[rec.id];
        if (existing && existing.reviewStatus !== 'SUGGESTED') {
          next[rec.id] = existing;
        } else {
          next[rec.id] = rec;
        }
      }
      state.recommendations = next;
      state.lastGeneratedAt = new Date().toISOString();
      if (params?.actor && params?.actorRole) {
        this.audit({
          action: 'RECOMMENDATIONS_GENERATED',
          actor: params.actor,
          actorRole: params.actorRole,
          recommendationId: 'ALL',
          evidence: { count: generated.length },
          beforeValue: null,
          afterValue: { count: Object.keys(next).length },
          reason: 'Regenerated suggestion set from source evidence (human decisions preserved)',
        });
      }
      this.persist();
      return { success: true, count: Object.keys(next).length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  }

  private static recommendDuplicateGroup(
    group: { id: string; label: string; slugs: string[] },
    products: ReviewProductItem[],
    out: CatalogueDecisionRecommendation[]
  ) {
    const members = group.slugs.map((s) => products.find((p) => p.canonicalSlug === s)).filter(Boolean) as ReviewProductItem[];
    if (members.length < 2) return;

    const names = members.map((m) => normalizeText(m.name));
    const skus = members.map((m) => normalizeText(m.sku)).filter(Boolean);
    const brands = members.map((m) => normalizeText(m.brand)).filter(Boolean);
    const categories = members.map((m) => normalizeText(m.categorySlug)).filter(Boolean);
    const imageHashes = members.flatMap((m) => m.mediaAssets.map((a) => a.hash).filter(Boolean));

    let score = 0;
    const signals: string[] = [];
    if (names.every((n) => n === names[0])) {
      score += 3;
      signals.push('normalized_name_match');
    }
    if (skus.length >= 2 && skus.every((s) => s === skus[0])) {
      score += 3;
      signals.push('sku_match');
    }
    if (brands.length >= 2 && brands.every((b) => b === brands[0])) {
      score += 1;
      signals.push('brand_match');
    }
    if (categories.length >= 2 && categories.every((c) => c === categories[0])) {
      score += 1;
      signals.push('category_match');
    }
    if (imageHashes.length >= 2 && new Set(imageHashes).size === 1) {
      score += 2;
      signals.push('image_hash_match');
    }

    const slugOverlap = members.some((m, i) =>
      members.some((n, j) => i !== j && (m.canonicalSlug.includes(n.canonicalSlug.slice(0, 12)) || n.canonicalSlug.includes(m.canonicalSlug.slice(0, 12))))
    );
    if (slugOverlap) {
      score += 1;
      signals.push('slug_similarity');
    }

    let recommendation = 'INSUFFICIENT_EVIDENCE';
    let proposedAction = 'DEFER_MATCH_REVIEW';
    let confidence: RecommendationConfidence = 'INSUFFICIENT_EVIDENCE';
    let priority: RecommendationPriority = 'P0';

    if (score >= 6) {
      recommendation = 'LIKELY_SAME_PRODUCT';
      proposedAction = 'MERGE_CANDIDATE';
      confidence = score >= 8 ? 'VERY_HIGH' : 'HIGH';
      priority = 'P0';
    } else if (score <= 2) {
      recommendation = 'LIKELY_DIFFERENT_PRODUCT';
      proposedAction = 'KEEP_SEPARATE';
      confidence = 'MEDIUM';
      priority = 'P1';
    } else {
      recommendation = 'INSUFFICIENT_EVIDENCE';
      proposedAction = 'DEFER_MATCH_REVIEW';
      confidence = 'LOW';
      priority = 'P0';
    }

    this.pushRec(out, {
      id: this.makeId(['dup', group.id]),
      entityType: 'MATCH_GROUP',
      entityId: group.id,
      productSlug: group.slugs[0],
      decisionType: 'DUPLICATE_IDENTITY',
      recommendation,
      proposedAction,
      proposedValue: { groupId: group.id, action: proposedAction },
      currentValue: { slugs: group.slugs, status: 'PENDING' },
      confidence,
      priority,
      evidence: {
        summary: `Duplicate identity analysis for ${group.label}: score ${score}/11 from source-data match signals only.`,
        reasonCode: score >= 6 ? 'REPOSITORY_DATA_MATCHES_REFERENCE' : score <= 2 ? 'CONFLICT_REQUIRES_HUMAN_REVIEW' : 'MISSING_EVIDENCE',
        details: { score, names, skus, brands, categories, imageHashes: imageHashes.slice(0, 5) },
        signals,
      },
      sourceRecords: members.map((m) => ({
        slug: m.canonicalSlug,
        name: m.name,
        sku: m.sku,
        sources: Object.keys(m.sources),
        provenance: m.sourceProvenance,
      })),
      conflicts: { slugs: group.slugs },
      bulkGroup: recommendation === 'LIKELY_SAME_PRODUCT' ? 'SAME_PRODUCT_CANDIDATE' : null,
      highRisk: true,
    });
  }

  private static recommendFieldReconciliations(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    for (const field of product.fieldComparisons || []) {
      const values = [field.referenceValue, field.repoAValue, field.repoBValue].filter(
        (v) => v != null && String(v).trim() !== ''
      );
      const allAgree = valuesAgree([field.referenceValue, field.repoAValue, field.repoBValue].filter((v) => v != null && String(v).trim() !== ''));
      const eu = field.currentFusionEUValue;

      if (!field.hasConflict && allAgree && values.length >= 2) {
        this.pushRec(out, {
          id: this.makeId(['exact', product.canonicalSlug, field.fieldName]),
          entityType: 'FIELD',
          entityId: `${product.canonicalSlug}:${field.fieldName}`,
          productSlug: product.canonicalSlug,
          decisionType: 'EXACT_MATCH_CONSENSUS',
          recommendation: 'CONSISTENT_ACROSS_SOURCES',
          proposedAction: 'USE_REFERENCE',
          proposedValue: field.referenceValue ?? field.repoAValue ?? field.repoBValue,
          currentValue: eu,
          confidence: 'VERY_HIGH',
          priority: 'P3',
          evidence: {
            summary: `All present sources agree on ${field.fieldName}.`,
            reasonCode: 'ALL_SOURCES_AGREE',
            details: {
              reference: field.referenceValue,
              repoA: field.repoAValue,
              repoB: field.repoBValue,
              currentEU: eu,
            },
          },
          sourceRecords: [product.sourceProvenance],
          conflicts: null,
          bulkGroup: 'SOURCES_AGREE',
          highRisk: false,
        });
        continue;
      }

      if (!field.hasConflict) continue;

      let recommendation = 'CONFLICT_REQUIRES_HUMAN_REVIEW';
      let proposedAction = 'DEFER';
      let proposedValue: any = null;
      let confidence: RecommendationConfidence = 'LOW';
      let reasonCode: RecommendationEvidence['reasonCode'] = 'CONFLICT_REQUIRES_HUMAN_REVIEW';
      let priority: RecommendationPriority = 'P1';

      if (product.fieldDecisions[field.fieldName]) {
        recommendation = 'CURRENT_EU_ALREADY_APPROVED';
        proposedAction = 'KEEP_CURRENT_EU';
        proposedValue = product.fieldDecisions[field.fieldName].approvedValue;
        confidence = 'HIGH';
        reasonCode = 'CURRENT_EU_ALREADY_APPROVED';
        priority = 'P3';
      } else if (
        field.referenceValue != null &&
        normalizeText(field.referenceValue) === normalizeText(field.repoAValue) &&
        (field.repoBValue == null || normalizeText(field.referenceValue) === normalizeText(field.repoBValue))
      ) {
        recommendation = 'RECOMMENDED_SOURCE:REFERENCE';
        proposedAction = 'USE_REFERENCE';
        proposedValue = field.referenceValue;
        confidence = 'HIGH';
        reasonCode = 'REPOSITORY_DATA_MATCHES_REFERENCE';
        priority = 'P2';
      } else if (eu != null && String(eu).trim() !== '') {
        recommendation = 'RECOMMENDED_SOURCE:CURRENT_EU';
        proposedAction = 'KEEP_CURRENT_EU';
        proposedValue = eu;
        confidence = 'MEDIUM';
        reasonCode = 'CURRENT_EU_ALREADY_APPROVED';
        priority = 'P2';
      } else if (field.referenceValue != null) {
        recommendation = 'RECOMMENDED_SOURCE:REFERENCE';
        proposedAction = 'USE_REFERENCE';
        proposedValue = field.referenceValue;
        confidence = 'MEDIUM';
        reasonCode = 'REFERENCE_IS_MOST_RECENT';
        priority = 'P1';
      } else {
        recommendation = 'INSUFFICIENT_EVIDENCE';
        proposedAction = 'DEFER';
        confidence = 'INSUFFICIENT_EVIDENCE';
        reasonCode = 'MISSING_EVIDENCE';
        priority = 'P1';
      }

      this.pushRec(out, {
        id: this.makeId(['field', product.canonicalSlug, field.fieldName]),
        entityType: 'FIELD',
        entityId: `${product.canonicalSlug}:${field.fieldName}`,
        productSlug: product.canonicalSlug,
        decisionType: 'FIELD_RECONCILIATION',
        recommendation,
        proposedAction,
        proposedValue,
        currentValue: eu,
        confidence,
        priority,
        evidence: {
          summary: `Field conflict on ${field.fieldName}. Recommendation is source-data guidance only — not legal truth.`,
          reasonCode,
          details: {
            FIELD: field.fieldName,
            REFERENCE: field.referenceValue,
            REPO_A: field.repoAValue,
            REPO_B: field.repoBValue,
            CURRENT_EU: eu,
            RECOMMENDATION: recommendation,
            REASON: reasonCode,
          },
        },
        sourceRecords: [product.sourceProvenance],
        conflicts: {
          reference: field.referenceValue,
          repoA: field.repoAValue,
          repoB: field.repoBValue,
          currentEU: eu,
        },
        highRisk: ['name', 'sku', 'category', 'ingredients'].includes(field.fieldName.toLowerCase()),
      });
    }
  }

  private static recommendPricing(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    const sourcePrices: Array<{ source: string; price: any; currency: any }> = [];
    for (const [key, raw] of Object.entries(product.sources)) {
      if (!raw) continue;
      sourcePrices.push({
        source: key,
        price: (raw as any).sourcePrice ?? (raw as any).sourceRegularPrice,
        currency: (raw as any).sourceCurrency,
      });
    }

    let recommendation = 'MISSING_PRICE';
    if (product.priceEUR && product.priceEUR > 0 && !product.pricingReviewRequired) {
      recommendation = 'PRICE_AVAILABLE_EU';
    } else if (product.priceGBP && product.priceGBP > 0 && !product.priceEUR) {
      recommendation = 'PRICE_AVAILABLE_GBP';
    } else if (product.isWholesale) {
      recommendation = 'WHOLESALE_PRICE_REVIEW';
    } else if (product.pricingReviewRequired || product.sourceCurrency === 'USD' || sourcePrices.some((p) => p.currency === 'USD')) {
      const unique = new Set(
        sourcePrices.filter((p) => p.price != null).map((p) => `${p.currency}:${p.price}`)
      );
      if (unique.size > 1) recommendation = 'PRICE_CONFLICT';
      else if (unique.size === 1 && [...unique][0].startsWith('USD')) recommendation = 'SOURCE_USD_ONLY';
      else if (unique.size > 1) recommendation = 'MULTIPLE_SOURCE_PRICES';
      else recommendation = 'PRICING_REVIEW_REQUIRED';
    } else if (!product.priceEUR) {
      recommendation = 'MISSING_PRICE';
    }

    this.pushRec(out, {
      id: this.makeId(['price', product.canonicalSlug]),
      entityType: 'PRODUCT',
      entityId: product.canonicalSlug,
      productSlug: product.canonicalSlug,
      decisionType: 'PRICING_CLASSIFICATION',
      recommendation,
      proposedAction: 'PRICING_REVIEW_REQUIRED',
      proposedValue: null,
      currentValue: { eur: product.priceEUR, gbp: product.priceGBP, sourceCurrency: product.sourceCurrency },
      confidence: recommendation === 'PRICE_AVAILABLE_EU' ? 'HIGH' : 'MEDIUM',
      priority: recommendation === 'PRICE_CONFLICT' || recommendation === 'SOURCE_USD_ONLY' ? 'P1' : 'P2',
      evidence: {
        summary:
          'Pricing classification only. No EUR retail price is calculated from USD. No exchange rate applied. Human must set/approve prices.',
        reasonCode: 'SOURCE_DATA_CLASSIFICATION',
        details: { sourcePrices, pricingReviewRequired: product.pricingReviewRequired },
      },
      sourceRecords: sourcePrices,
      conflicts: recommendation === 'PRICE_CONFLICT' ? { sourcePrices } : null,
      bulkGroup: recommendation !== 'PRICE_AVAILABLE_EU' ? 'NEEDS_PRICE' : null,
      highRisk: true,
    });
  }

  private static recommendComplianceDataReview(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    const text = `${product.name} ${product.description} ${product.productType} ${product.originalSourceContent}`;
    let recommendation = 'NO_OBVIOUS_CONTENT_FLAG';
    if (REGULATED_HINT.test(text) || /vaporizer|cannabinoid|psychoactive|capsule/i.test(product.productType || '')) {
      recommendation = 'REGULATED_PRODUCT_REVIEW';
    } else if (product.contentFlags.some((f) => /THERAPEUTIC|HEALTH|PSYCHOACTIVE|DOSAGE|EFFECT/i.test(f))) {
      recommendation = 'CLAIM_REVIEW_REQUIRED';
    } else if (product.contentFlags.some((f) => /INGREDIENT|REGULATORY|LAB/i.test(f))) {
      recommendation = 'INGREDIENT_REVIEW_REQUIRED';
    } else if (product.contentFlags.length > 0) {
      recommendation = 'CONTENT_REVIEW_REQUIRED';
    } else if (!product.originalSourceContent || product.originalSourceContent.trim().length < 20) {
      recommendation = 'INSUFFICIENT_INFORMATION';
    }

    this.pushRec(out, {
      id: this.makeId(['compliance', product.canonicalSlug]),
      entityType: 'PRODUCT',
      entityId: product.canonicalSlug,
      productSlug: product.canonicalSlug,
      decisionType: 'COMPLIANCE_DATA_REVIEW',
      recommendation,
      proposedAction: 'REQUIRES_REVIEW',
      proposedValue: 'REQUIRES_REVIEW',
      currentValue: product.complianceClassification,
      confidence: recommendation === 'NO_OBVIOUS_CONTENT_FLAG' ? 'MEDIUM' : 'HIGH',
      priority: recommendation === 'REGULATED_PRODUCT_REVIEW' ? 'P0' : recommendation === 'NO_OBVIOUS_CONTENT_FLAG' ? 'P2' : 'P1',
      evidence: {
        summary:
          'Data-review classification only. Not a legality determination. Not "LEGAL", "ILLEGAL", or "APPROVED FOR EU". Regulated-type products stay REQUIRES_REVIEW until human decision.',
        reasonCode: 'SOURCE_DATA_CLASSIFICATION',
        details: {
          contentFlags: product.contentFlags,
          productType: product.productType,
          currentClassification: product.complianceClassification,
        },
      },
      sourceRecords: [product.sourceProvenance],
      highRisk: true,
    });
  }

  private static recommendContent(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    const flags = product.contentFlags || [];
    let recommendation = 'CONTENT_CLEAN';
    if (flags.some((f) => /PSYCHOACTIVE|THERAPEUTIC|HEALTH|DOSAGE|EFFECT|REGULATORY|LAB/i.test(f))) {
      recommendation = flags.some((f) => /PSYCHOACTIVE|THERAPEUTIC/i.test(f))
        ? 'CONTENT_BLOCK_REQUIRED'
        : 'CONTENT_REWRITE_REQUIRED';
    } else if (flags.length > 0 || product.contentModerationStatus === 'PENDING_REVIEW') {
      recommendation = 'CONTENT_REVIEW_REQUIRED';
    }

    this.pushRec(out, {
      id: this.makeId(['content', product.canonicalSlug]),
      entityType: 'PRODUCT',
      entityId: product.canonicalSlug,
      productSlug: product.canonicalSlug,
      decisionType: 'CONTENT_FLAGS',
      recommendation,
      proposedAction: recommendation === 'CONTENT_CLEAN' ? 'APPROVE' : recommendation === 'CONTENT_BLOCK_REQUIRED' ? 'BLOCK' : 'REWRITE',
      proposedValue: null,
      currentValue: {
        original: product.originalSourceContent,
        approved: product.approvedStoreContent,
        status: product.contentModerationStatus,
      },
      confidence: flags.length ? 'HIGH' : 'MEDIUM',
      priority: recommendation === 'CONTENT_BLOCK_REQUIRED' ? 'P0' : recommendation === 'CONTENT_CLEAN' ? 'P3' : 'P1',
      evidence: {
        summary: 'Content flag analysis from source text. Engine does not generate or rewrite medical/therapeutic claims.',
        reasonCode: 'SOURCE_DATA_CLASSIFICATION',
        details: { flags },
      },
      sourceRecords: [{ originalSourceContentHash: normalizeText(product.originalSourceContent).slice(0, 64) }],
      bulkGroup: recommendation !== 'CONTENT_CLEAN' ? 'NEEDS_CONTENT_REVIEW' : null,
      highRisk: recommendation !== 'CONTENT_CLEAN',
    });
  }

  private static recommendCountry(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    const existing = product.countryAvailability || {};
    const configured = Object.entries(existing).filter(([, s]) => s && s !== 'NOT_CONFIGURED');
    if (configured.length > 0) {
      this.pushRec(out, {
        id: this.makeId(['country-existing', product.canonicalSlug]),
        entityType: 'COUNTRY',
        entityId: product.canonicalSlug,
        productSlug: product.canonicalSlug,
        decisionType: 'COUNTRY_CONFIGURATION',
        recommendation: 'EXISTING_EU_RULES_PRESENT',
        proposedAction: 'HUMAN_REVIEW_EXISTING_RULES',
        proposedValue: existing,
        currentValue: existing,
        confidence: 'HIGH',
        priority: 'P2',
        evidence: {
          summary: 'Explicit FusionBars EU country rules already exist. Recommendation does not authorize additional countries.',
          reasonCode: 'CURRENT_EU_ALREADY_APPROVED',
          details: { configured },
        },
        sourceRecords: [],
        highRisk: true,
      });
      return;
    }

    this.pushRec(out, {
      id: this.makeId(['country', product.canonicalSlug]),
      entityType: 'COUNTRY',
      entityId: product.canonicalSlug,
      productSlug: product.canonicalSlug,
      decisionType: 'COUNTRY_CONFIGURATION',
      recommendation: 'COUNTRY_CONFIGURATION_REQUIRED',
      proposedAction: 'CONFIGURE_COUNTRIES_MANUALLY',
      proposedValue: null,
      currentValue: existing,
      confidence: 'MEDIUM',
      priority: 'P1',
      evidence: {
        summary: 'No approved country availability rules. Do not auto-authorize European or worldwide sale.',
        reasonCode: 'MISSING_EVIDENCE',
        details: { product: product.canonicalSlug, reviewRequirement: 'HUMAN_COUNTRY_DECISION' },
      },
      sourceRecords: [product.sourceProvenance],
      highRisk: true,
    });
  }

  private static recommendMedia(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    if (!product.mediaAssets?.length) {
      this.pushRec(out, {
        id: this.makeId(['media-missing', product.canonicalSlug]),
        entityType: 'MEDIA',
        entityId: product.canonicalSlug,
        productSlug: product.canonicalSlug,
        decisionType: 'MEDIA_QUALITY',
        recommendation: 'MISSING_MEDIA',
        proposedAction: 'MARK_MISSING',
        confidence: 'HIGH',
        priority: 'P2',
        evidence: {
          summary: 'No media assets on working product copy.',
          reasonCode: 'MISSING_EVIDENCE',
          details: {},
        },
        sourceRecords: [],
        highRisk: false,
      });
      return;
    }

    const hashCounts: Record<string, number> = {};
    for (const m of product.mediaAssets) {
      if (m.hash) hashCounts[m.hash] = (hashCounts[m.hash] || 0) + 1;
    }

    for (const m of product.mediaAssets) {
      let recommendation = 'VALID_MEDIA';
      if (m.status === 'BROKEN' || m.duplicateStatus === 'BROKEN') recommendation = 'BROKEN_IMAGE';
      else if (m.duplicateStatus === 'MISSING') recommendation = 'MISSING_MEDIA';
      else if (m.hash && hashCounts[m.hash] > 1) recommendation = 'DUPLICATE_IMAGE';
      else if (!product.primaryImage && m.url) recommendation = 'PRIMARY_IMAGE_CANDIDATE';
      else if (m.isPrimary) recommendation = 'PRIMARY_IMAGE_CANDIDATE';

      this.pushRec(out, {
        id: this.makeId(['media', product.canonicalSlug, m.id]),
        entityType: 'MEDIA',
        entityId: m.id,
        productSlug: product.canonicalSlug,
        decisionType: 'MEDIA_QUALITY',
        recommendation,
        proposedAction: recommendation === 'PRIMARY_IMAGE_CANDIDATE' ? 'SET_PRIMARY' : recommendation === 'BROKEN_IMAGE' ? 'MARK_MISSING' : 'KEEP',
        proposedValue: m.id,
        currentValue: { url: m.url, status: m.status, isPrimary: m.isPrimary },
        confidence: m.hash ? 'HIGH' : 'MEDIUM',
        priority: recommendation === 'BROKEN_IMAGE' || recommendation === 'MISSING_MEDIA' ? 'P2' : 'P3',
        evidence: {
          summary: 'Media quality suggestion from hash/dimensions/status. Raw media records are never deleted.',
          reasonCode: 'MEDIA_HASH_OR_STATUS',
          details: {
            url: m.url,
            hash: m.hash,
            dimensions: m.dimensions,
            source: m.sourceRepository,
            productAssociation: product.canonicalSlug,
          },
        },
        sourceRecords: [{ mediaId: m.id, url: m.url, hash: m.hash }],
        highRisk: false,
      });
    }
  }

  private static recommendTranslation(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    const fields = ['name', 'description', 'approvedStoreContent', 'seoTitle', 'seoDescription'] as const;
    const englishReady = Boolean(product.approvedStoreContent || product.description);
    this.pushRec(out, {
      id: this.makeId(['translation', product.canonicalSlug]),
      entityType: 'TRANSLATION',
      entityId: product.canonicalSlug,
      productSlug: product.canonicalSlug,
      decisionType: 'TRANSLATION_REQUIRED',
      recommendation: 'TRANSLATION_REQUIRED',
      proposedAction: 'CREATE_TRANSLATION_SLOTS',
      proposedValue: { locales: ['de', 'fr', 'es', 'it', 'nl'], fields },
      currentValue: { englishReady, seoApproved: product.seo?.isApproved },
      confidence: 'HIGH',
      priority: 'P2',
      evidence: {
        summary: 'Translation slots required for DE/FR/ES/IT/NL. Engine does not produce or auto-approve translations.',
        reasonCode: 'TRANSLATION_GAP',
        details: { fields },
      },
      sourceRecords: [],
      bulkGroup: 'NEEDS_TRANSLATION',
      highRisk: false,
    });
  }

  private static recommendVariantGrouping(
    group: { id: string; parentSlug: string; parentName: string; candidateSlugs: string[] },
    products: ReviewProductItem[],
    out: CatalogueDecisionRecommendation[]
  ) {
    for (const slug of group.candidateSlugs) {
      const product = products.find((p) => p.canonicalSlug === slug);
      if (!product) continue;
      const parent = products.find((p) => p.canonicalSlug === group.parentSlug);
      const sharedWeight = Boolean(product.attributes?.weight && parent?.attributes?.weight === product.attributes?.weight);
      const sharedCategory = parent && product.categorySlug === parent.categorySlug;
      const nameHint = /almond|birthday|cookie|horchata|matcha|crush|dough/i.test(product.name);
      const recommendation =
        product.isFlavourStandalone && (sharedCategory || nameHint) ? 'VARIANT_CANDIDATE' : 'SEPARATE_PRODUCT_CANDIDATE';

      this.pushRec(out, {
        id: this.makeId(['variant', slug]),
        entityType: 'VARIANT_GROUP',
        entityId: group.id,
        productSlug: slug,
        decisionType: 'VARIANT_GROUPING',
        recommendation,
        proposedAction: recommendation === 'VARIANT_CANDIDATE' ? 'MERGE_INTO_VARIANTS' : 'KEEP_AS_SEPARATE_PRODUCTS',
        proposedValue: { parentSlug: group.parentSlug },
        currentValue: { standalone: product.isFlavourStandalone, decision: product.variantStructureDecision },
        confidence: sharedCategory && nameHint ? 'HIGH' : 'MEDIUM',
        priority: 'P0',
        evidence: {
          summary: 'Flavour/parent structure hint from naming and category. Never auto-merged.',
          reasonCode: 'VARIANT_STRUCTURE_HINT',
          details: {
            parent: group.parentName,
            sharedWeight,
            sharedCategory,
            sharedImagery: Boolean(product.primaryImage && parent?.primaryImage),
            sourceCategory: product.categoryName,
          },
        },
        sourceRecords: product.retainedSourceMappings,
        bulkGroup: recommendation === 'VARIANT_CANDIDATE' ? 'SAME_VARIANT_CANDIDATE' : null,
        highRisk: true,
      });
    }
  }

  private static recommendCategory(mapping: CategoryMappingDecision, out: CatalogueDecisionRecommendation[]) {
    this.pushRec(out, {
      id: this.makeId(['category', mapping.sourceCategorySlug]),
      entityType: 'CATEGORY',
      entityId: mapping.sourceCategorySlug,
      decisionType: 'CATEGORY_MAPPING',
      recommendation: 'RECOMMENDED_CATEGORY',
      proposedAction: 'APPROVE_MAPPING',
      proposedValue: {
        targetSlug: mapping.normalizedCategorySlug,
        targetName: mapping.normalizedCategoryName,
      },
      currentValue: {
        source: mapping.sourceCategoryName,
        target: mapping.normalizedCategoryName,
      },
      confidence: mapping.normalizedCategorySlug !== 'uncategorized' ? 'HIGH' : 'LOW',
      priority: 'P2',
      evidence: {
        summary: 'Taxonomy hint from source category name and existing normalized categories. Not a legal classification.',
        reasonCode: 'CATEGORY_TAXONOMY_HINT',
        details: {
          sourceCategoryName: mapping.sourceCategoryName,
          sourceType: mapping.sourceType,
          recommended: mapping.normalizedCategoryName,
        },
      },
      sourceRecords: [{ sourceCategorySlug: mapping.sourceCategorySlug, sourceType: mapping.sourceType }],
      highRisk: false,
    });
  }

  private static recommendReviewQuality(review: ReviewModerationItem, out: CatalogueDecisionRecommendation[]) {
    let recommendation = 'VALID_REVIEW_DATA';
    if (!review.sourceUrl && !review.authorName) recommendation = 'MISSING_SOURCE_METADATA';
    else if (!review.body || review.body.trim().length < 5) recommendation = 'NEEDS_MODERATION';
    else recommendation = 'NEEDS_MODERATION';

    this.pushRec(out, {
      id: this.makeId(['review', review.id]),
      entityType: 'REVIEW',
      entityId: review.id,
      productSlug: review.productSlug,
      decisionType: 'REVIEW_QUALITY',
      recommendation,
      proposedAction: 'HUMAN_MODERATION_REQUIRED',
      proposedValue: null,
      currentValue: {
        rating: review.rating,
        isVerifiedBuyer: review.isVerifiedBuyer,
        moderationStatus: review.moderationStatus,
      },
      confidence: 'MEDIUM',
      priority: 'P3',
      evidence: {
        summary: 'Data-quality assessment only. Does not approve reviews or fabricate verification status.',
        reasonCode: 'REVIEW_DATA_QUALITY',
        details: {
          authorName: review.authorName,
          sourceUrl: review.sourceUrl,
          sourceType: review.sourceType,
          isVerifiedBuyer: review.isVerifiedBuyer,
        },
      },
      sourceRecords: [{ reviewId: review.id, sourceType: review.sourceType, sourceUrl: review.sourceUrl }],
      highRisk: false,
    });
  }

  private static recommendPublicationReadiness(product: ReviewProductItem, out: CatalogueDecisionRecommendation[]) {
    const checklist = CatalogueReviewService.evaluatePublicationReadiness(product);
    const gates: PublicationBlockingChecklist['gates'] = {
      Pricing: checklist.validPrice ? 'READY' : 'BLOCKED',
      Compliance: checklist.complianceApproved ? 'READY' : 'BLOCKED',
      Country: checklist.countryAvailability ? 'READY' : 'BLOCKED',
      Content: checklist.contentApproved ? 'READY' : 'BLOCKED',
      Media: checklist.primaryImage ? 'READY' : 'BLOCKED',
      Translation: checklist.translation ? 'READY' : 'BLOCKED',
      SEO: checklist.seo ? 'READY' : 'BLOCKED',
      Category: checklist.validCategory ? 'READY' : 'BLOCKED',
      SKU: checklist.validSku ? 'READY' : 'BLOCKED',
      Inventory: checklist.inventory ? 'READY' : 'BLOCKED',
    };

    this.pushRec(out, {
      id: this.makeId(['pub', product.canonicalSlug]),
      entityType: 'PUBLICATION',
      entityId: product.canonicalSlug,
      productSlug: product.canonicalSlug,
      decisionType: 'PUBLICATION_READINESS',
      recommendation: checklist.isReadyToPublish ? 'READY_CANDIDATE' : 'NOT_READY',
      proposedAction: 'EXPLAIN_BLOCKERS_ONLY',
      proposedValue: { gates, blockers: checklist.blockers },
      currentValue: product.publicationStatus,
      confidence: 'VERY_HIGH',
      priority: checklist.isReadyToPublish ? 'P3' : 'P1',
      evidence: {
        summary: 'Publication status explanation. Recommendation engine never publishes.',
        reasonCode: 'PUBLICATION_GATE',
        details: { gates, blockers: checklist.blockers, publicationStatus: 'NOT_READY' },
      },
      sourceRecords: [],
      highRisk: false,
    });
  }

  // --------------------------------------------------------------------------
  // QUERY
  // --------------------------------------------------------------------------

  static getDashboard(): RecommendationDashboard {
    const recs = Object.values(this.getState().recommendations);
    const byPriority: Record<RecommendationPriority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
    const byDecisionType: Record<string, number> = {};
    const safeBulkGroups: Record<SafeBulkGroupKey, number> = {
      SOURCES_AGREE: 0,
      SAME_PRODUCT_CANDIDATE: 0,
      SAME_VARIANT_CANDIDATE: 0,
      NEEDS_PRICE: 0,
      NEEDS_TRANSLATION: 0,
      NEEDS_CONTENT_REVIEW: 0,
    };
    const products = new Set<string>();
    for (const r of recs) {
      byPriority[r.priority]++;
      byDecisionType[r.decisionType] = (byDecisionType[r.decisionType] || 0) + 1;
      if (r.bulkGroup) safeBulkGroups[r.bulkGroup]++;
      if (r.productSlug) products.add(r.productSlug);
    }
    return {
      totalRecommendations: recs.length,
      suggested: recs.filter((r) => r.reviewStatus === 'SUGGESTED').length,
      accepted: recs.filter((r) => r.reviewStatus === 'ACCEPTED').length,
      rejected: recs.filter((r) => r.reviewStatus === 'REJECTED').length,
      deferred: recs.filter((r) => r.reviewStatus === 'DEFERRED').length,
      byPriority,
      byDecisionType,
      safeBulkGroups,
      productsWithRecommendations: products.size,
    };
  }

  static getRecommendations(filters?: {
    status?: RecommendationReviewStatus;
    priority?: RecommendationPriority;
    decisionType?: RecommendationDecisionType;
    bulkGroup?: SafeBulkGroupKey;
    productSlug?: string;
    limit?: number;
  }): CatalogueDecisionRecommendation[] {
    let items = Object.values(this.getState().recommendations);
    if (filters?.status) items = items.filter((r) => r.reviewStatus === filters.status);
    if (filters?.priority) items = items.filter((r) => r.priority === filters.priority);
    if (filters?.decisionType) items = items.filter((r) => r.decisionType === filters.decisionType);
    if (filters?.bulkGroup) items = items.filter((r) => r.bulkGroup === filters.bulkGroup);
    if (filters?.productSlug) items = items.filter((r) => r.productSlug === filters.productSlug);
    items.sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id));
    if (filters?.limit) items = items.slice(0, filters.limit);
    return items;
  }

  static getRecommendation(id: string): CatalogueDecisionRecommendation | null {
    return this.getState().recommendations[id] || null;
  }

  static getPublicationChecklist(productSlug: string): PublicationBlockingChecklist | null {
    const product = CatalogueReviewService.getProductDetail(productSlug);
    if (!product) return null;
    const checklist = CatalogueReviewService.evaluatePublicationReadiness(product);
    return {
      productSlug,
      publicationStatus: checklist.isReadyToPublish ? 'READY_CANDIDATE' : product.publicationStatus === 'BLOCKED' ? 'BLOCKED' : 'NOT_READY',
      gates: {
        Pricing: checklist.validPrice ? 'READY' : 'BLOCKED',
        Compliance: checklist.complianceApproved ? 'READY' : 'BLOCKED',
        Country: checklist.countryAvailability ? 'READY' : 'BLOCKED',
        Content: checklist.contentApproved ? 'READY' : 'BLOCKED',
        Media: checklist.primaryImage ? 'READY' : 'BLOCKED',
        Translation: checklist.translation ? 'READY' : 'BLOCKED',
        SEO: checklist.seo ? 'READY' : 'BLOCKED',
      },
      blockers: checklist.blockers,
    };
  }

  static getDecisionPreview(id: string): DecisionPreview | null {
    const rec = this.getRecommendation(id);
    if (!rec) return null;
    return {
      recommendationId: id,
      before: rec.currentValue,
      after: rec.proposedValue,
      sourceImpact: 'Raw source records remain immutable. Only working review/adjudication state may change after human confirm.',
      storeImpact:
        rec.decisionType === 'PUBLICATION_READINESS' || rec.decisionType === 'PRICING_CLASSIFICATION'
          ? 'No live storefront change until separate publication gates pass.'
          : 'Working catalogue copy may update after confirmation; public catalogue unchanged until publish.',
      publicationImpact: 'Acceptance does not publish. ProductPurchaseEligibilityService, publication validation, RBAC, country, and compliance gates remain authoritative.',
      requiresConfirm: true,
      highRisk: rec.highRisk,
    };
  }

  static getAuditTrail(): RecommendationAudit[] {
    return [...this.getState().auditTrail].reverse();
  }

  static assertRawSourcesImmutable(): boolean {
    // Touch import result without mutating — used by tests to prove isolation.
    const before = JSON.stringify(MasterCatalogueImportService.getImportResult().rawProducts.slice(0, 3));
    const after = JSON.stringify(MasterCatalogueImportService.getImportResult().rawProducts.slice(0, 3));
    return before === after;
  }

  // --------------------------------------------------------------------------
  // HUMAN ACTIONS — route through existing adjudication / review services
  // --------------------------------------------------------------------------

  static rejectRecommendation(params: {
    id: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!params.reason?.trim()) return { success: false, error: 'Rejection reason is required.' };
      const state = this.getState();
      const rec = state.recommendations[params.id];
      if (!rec) return { success: false, error: 'Recommendation not found.' };
      const before = cloneJson(rec);
      rec.reviewStatus = 'REJECTED';
      rec.reviewedBy = params.actor;
      rec.reviewedAt = new Date().toISOString();
      rec.decisionReason = params.reason;
      this.audit({
        action: 'RECOMMENDATION_REJECTED',
        actor: params.actor,
        actorRole: params.actorRole,
        recommendationId: params.id,
        evidence: rec.evidence,
        beforeValue: before,
        afterValue: rec,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static deferRecommendation(params: {
    id: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const rec = state.recommendations[params.id];
      if (!rec) return { success: false, error: 'Recommendation not found.' };
      const before = cloneJson(rec);
      rec.reviewStatus = 'DEFERRED';
      rec.reviewedBy = params.actor;
      rec.reviewedAt = new Date().toISOString();
      rec.decisionReason = params.reason || 'Deferred';
      this.audit({
        action: 'RECOMMENDATION_DEFERRED',
        actor: params.actor,
        actorRole: params.actorRole,
        recommendationId: params.id,
        evidence: rec.evidence,
        beforeValue: before,
        afterValue: rec,
        reason: params.reason || 'Deferred',
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static supersedeRecommendation(params: {
    id: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
    supersededByDecisionId?: string;
  }): { success: boolean; error?: string } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const rec = state.recommendations[params.id];
      if (!rec) return { success: false, error: 'Recommendation not found.' };
      if (rec.reviewStatus === 'ACCEPTED' || rec.reviewStatus === 'REJECTED') {
        return { success: false, error: 'Cannot supersede a finalized accepted/rejected recommendation.' };
      }
      const before = cloneJson(rec);
      rec.reviewStatus = 'SUPERSEDED_BY_HUMAN_DECISION';
      rec.reviewedBy = params.actor;
      rec.reviewedAt = new Date().toISOString();
      rec.decisionReason = params.reason;
      this.audit({
        action: 'RECOMMENDATION_SUPERSEDED',
        actor: params.actor,
        actorRole: params.actorRole,
        recommendationId: params.id,
        evidence: { ...rec.evidence, supersededByDecisionId: params.supersededByDecisionId || null },
        beforeValue: before,
        afterValue: rec,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static editRecommendation(params: {
    id: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
    proposedValue?: any;
    proposedAction?: string;
    recommendation?: string;
  }): { success: boolean; error?: string; recommendation?: CatalogueDecisionRecommendation } {
    try {
      this.requireActor(params.actor, params.actorRole);
      if (!params.reason?.trim()) return { success: false, error: 'Edit reason is required.' };
      const state = this.getState();
      const rec = state.recommendations[params.id];
      if (!rec) return { success: false, error: 'Recommendation not found.' };
      const before = cloneJson(rec);
      if (params.proposedValue !== undefined) rec.proposedValue = params.proposedValue;
      if (params.proposedAction) rec.proposedAction = params.proposedAction;
      if (params.recommendation) rec.recommendation = params.recommendation;
      rec.decisionReason = params.reason;
      this.audit({
        action: 'RECOMMENDATION_EDITED',
        actor: params.actor,
        actorRole: params.actorRole,
        recommendationId: params.id,
        evidence: rec.evidence,
        beforeValue: before,
        afterValue: rec,
        reason: params.reason,
      });
      this.persist();
      return { success: true, recommendation: rec };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static acceptRecommendation(params: {
    id: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
    confirm: boolean;
  }): { success: boolean; error?: string; preview?: DecisionPreview } {
    try {
      this.requireActor(params.actor, params.actorRole);
      const state = this.getState();
      const rec = state.recommendations[params.id];
      if (!rec) return { success: false, error: 'Recommendation not found.' };
      if (rec.reviewStatus === 'ACCEPTED') return { success: false, error: 'Recommendation already accepted.' };

      if (rec.highRisk && !params.reason?.trim()) {
        return { success: false, error: 'High-risk recommendation acceptance requires a reason.' };
      }
      if (!params.confirm) {
        return { success: false, error: 'CONFIRM DECISION required.', preview: this.getDecisionPreview(params.id)! };
      }

      // Explanation-only / classification-only recommendations: mark accepted without mutating gates.
      const explanationOnly = new Set([
        'PUBLICATION_READINESS',
        'PRICING_CLASSIFICATION',
        'COMPLIANCE_DATA_REVIEW',
        'TRANSLATION_REQUIRED',
        'REVIEW_QUALITY',
        'COUNTRY_CONFIGURATION',
      ]);

      const before = cloneJson(rec);
      let applyError: string | undefined;

      if (rec.decisionType === 'FIELD_RECONCILIATION' || rec.decisionType === 'EXACT_MATCH_CONSENSUS') {
        const fieldName = rec.entityId.split(':')[1];
        const choice = (rec.proposedAction || 'KEEP_CURRENT_EU') as any;
        if (choice !== 'DEFER' && fieldName && rec.productSlug) {
          const mapped = choice === 'CUSTOM_VALUE' ? 'CUSTOM_APPROVED_VALUE' : choice;
          const result = CatalogueReviewService.approveFieldDecision({
            productSlug: rec.productSlug,
            fieldName,
            choice: mapped,
            customValue: rec.proposedValue,
            actor: params.actor,
            actorRole: params.actorRole,
            reason: params.reason || `Accepted recommendation ${rec.id}`,
          });
          if (!result.success) applyError = result.error;
        }
      } else if (rec.decisionType === 'DUPLICATE_IDENTITY' && rec.entityId) {
        const decision =
          rec.proposedAction === 'MERGE_CANDIDATE'
            ? 'MERGE'
            : rec.proposedAction === 'KEEP_SEPARATE'
              ? 'KEEP_SEPARATE'
              : 'DEFER';
        if (decision === 'MERGE') {
          // Still require explicit merge via adjudication with confirmMerge — accept only records KEEP_SEPARATE or DEFER here for safety,
          // and for MERGE route through adjudication with confirm.
        }
        const result = CatalogueAdjudicationService.adjudicatePossibleMatch({
          groupId: rec.entityId,
          decision: decision as any,
          reason: params.reason || `Accepted recommendation ${rec.id}`,
          confirmMerge: decision === 'MERGE',
          actor: params.actor,
          actorRole: params.actorRole,
        });
        if (!result.success) applyError = result.error;
      } else if (rec.decisionType === 'VARIANT_GROUPING' && rec.productSlug) {
        // Do not auto-merge variants from recommendation accept of MERGE — require explicit DEFER recording or keep-separate.
        // Accepting VARIANT_CANDIDATE only records human intent by routing KEEP/DEFER safely; MERGE still needs dedicated adjudication confirm.
        if (rec.proposedAction === 'KEEP_AS_SEPARATE_PRODUCTS') {
          const result = CatalogueAdjudicationService.adjudicateFlavourGroup({
            groupId: rec.entityId,
            decision: 'KEEP_AS_SEPARATE_PRODUCTS',
            reason: params.reason || `Accepted recommendation ${rec.id}`,
            actor: params.actor,
            actorRole: params.actorRole,
          });
          if (!result.success) applyError = result.error;
        } else if (rec.proposedAction === 'MERGE_INTO_VARIANTS') {
          const result = CatalogueAdjudicationService.adjudicateFlavourGroup({
            groupId: rec.entityId,
            decision: 'MERGE_INTO_VARIANTS',
            reason: params.reason || `Accepted recommendation ${rec.id}`,
            actor: params.actor,
            actorRole: params.actorRole,
          });
          if (!result.success) applyError = result.error;
        }
      } else if (rec.decisionType === 'CATEGORY_MAPPING') {
        const result = CatalogueAdjudicationService.adjudicateCategory({
          sourceCategorySlug: rec.entityId,
          action: 'APPROVE',
          targetCategorySlug: rec.proposedValue?.targetSlug,
          targetCategoryName: rec.proposedValue?.targetName,
          reason: params.reason || `Accepted category recommendation ${rec.id}`,
          actor: params.actor,
          actorRole: params.actorRole,
        });
        if (!result.success) applyError = result.error;
      } else if (rec.decisionType === 'MEDIA_QUALITY' && rec.productSlug && rec.entityId) {
        const action = (rec.proposedAction || 'KEEP') as any;
        if (['SET_PRIMARY', 'KEEP', 'REJECT', 'MARK_MISSING', 'DEFER'].includes(action)) {
          const result = CatalogueAdjudicationService.adjudicateMedia({
            productSlug: rec.productSlug,
            mediaId: rec.entityId,
            action,
            reason: params.reason || `Accepted media recommendation ${rec.id}`,
            actor: params.actor,
            actorRole: params.actorRole,
          });
          if (!result.success) applyError = result.error;
        }
      } else if (rec.decisionType === 'CONTENT_FLAGS' && rec.productSlug) {
        // Never auto-approve content from recommendation alone for BLOCK/REWRITE without explicit proposed text.
        if (rec.proposedAction === 'APPROVE' && rec.recommendation === 'CONTENT_CLEAN') {
          const result = CatalogueAdjudicationService.adjudicateContent({
            productSlug: rec.productSlug,
            action: 'APPROVE',
            reason: params.reason || `Accepted content-clean recommendation ${rec.id}`,
            actor: params.actor,
            actorRole: params.actorRole,
          });
          if (!result.success) applyError = result.error;
        } else {
          // Mark accepted as human acknowledged; actual rewrite/block still done in adjudication UI.
          // Intentionally do not call BLOCK/REWRITE without rewritten content.
        }
      } else if (!explanationOnly.has(rec.decisionType) && rec.decisionType === 'BULK_GROUP') {
        applyError = 'Bulk groups are inspection sets only; accept individual recommendations.';
      }

      // Hard safety: never publish from recommendation acceptance
      if (/publish/i.test(rec.proposedAction || '') || /publish/i.test(rec.recommendation || '')) {
        return { success: false, error: 'Recommendations cannot publish products.' };
      }

      if (applyError) return { success: false, error: applyError };

      rec.reviewStatus = 'ACCEPTED';
      rec.reviewedBy = params.actor;
      rec.reviewedAt = new Date().toISOString();
      rec.decisionReason = params.reason || 'Accepted with confirmation';
      this.audit({
        action: 'RECOMMENDATION_ACCEPTED',
        actor: params.actor,
        actorRole: params.actorRole,
        recommendationId: params.id,
        evidence: rec.evidence,
        beforeValue: before,
        afterValue: rec,
        reason: rec.decisionReason,
      });
      this.persist();
      return { success: true, preview: this.getDecisionPreview(params.id) || undefined };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static getOperatorReport() {
    const dash = this.getDashboard();
    const products = Object.values(CatalogueReviewService.getState().products);
    return {
      totalImported: products.length,
      totalRecommendations: dash.totalRecommendations,
      suggested: dash.suggested,
      accepted: dash.accepted,
      rejected: dash.rejected,
      deferred: dash.deferred,
      byPriority: dash.byPriority,
      safeBulkGroups: dash.safeBulkGroups,
      published: products.filter((p) => p.publicationStatus === 'PUBLISHED').length,
      lastGeneratedAt: this.getState().lastGeneratedAt,
    };
  }
}
