// ==============================================================================
// FUSION MUSHROOM BARS EU - CATALOGUE REVIEW DOMAIN SERVICE
// Enterprise Governance, Source Comparison, Field Approval & Publication Gate
// ==============================================================================

import {
  ComplianceClassification,
  CountryAvailabilityStatus,
  MinorUnits,
  PurchaseEligibilityDecision,
  RoleName,
} from '@/types';
import {
  FieldComparison,
  MatchConfidence,
  RawMediaRecordDomain,
  RawProductRecordDomain,
  SourceType,
} from '@/domain/import/types';
import { MasterCatalogueImportService, MasterImportResult } from '@/domain/import/MasterCatalogueImportService';
import { ProductPublicationGuard } from '@/domain/catalog/ProductPublicationGuard';
import { ProductPurchaseEligibilityService } from '@/domain/catalog/ProductPurchaseEligibilityService';
import { CurrencyService } from '@/domain/currency/CurrencyService';

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

export type ReviewQueueFilter =
  | 'ALL'
  | 'NEW'
  | 'UPDATED'
  | 'POSSIBLE_MATCH'
  | 'UNRESOLVED_DUPLICATE'
  | 'PRICE_REVIEW'
  | 'CATEGORY_REVIEW'
  | 'CONTENT_REVIEW'
  | 'COMPLIANCE_REVIEW'
  | 'MEDIA_REVIEW'
  | 'TRANSLATION_REVIEW'
  | 'READY_TO_PUBLISH'
  | 'BLOCKED';

export type ReviewSortField =
  | 'name'
  | 'source'
  | 'category'
  | 'issueCount'
  | 'lastImported'
  | 'reviewStatus';

export type FieldApprovalChoice =
  | 'USE_REFERENCE'
  | 'USE_REPO_A'
  | 'USE_REPO_B'
  | 'KEEP_CURRENT_EU'
  | 'CUSTOM_APPROVED_VALUE';

export type VariantStructureOption = 'PARENT_WITH_VARIANTS' | 'INDIVIDUAL_PRODUCTS';

export type ContentModerationAction = 'APPROVE' | 'REWRITE' | 'BLOCK';

export type AuditActionType =
  | 'PRODUCT_REVIEWED'
  | 'FIELD_APPROVED'
  | 'FIELD_CHANGED'
  | 'VARIANT_MERGED'
  | 'VARIANT_SPLIT'
  | 'CATEGORY_APPROVED'
  | 'PRICE_APPROVED'
  | 'COMPLIANCE_APPROVED'
  | 'COUNTRY_RULE_CHANGED'
  | 'MEDIA_APPROVED'
  | 'REVIEW_APPROVED'
  | 'PRODUCT_PUBLISHED'
  | 'PRODUCT_BLOCKED';

export interface AuditRecord {
  id: string;
  action: AuditActionType;
  actor: string;
  actorRole: RoleName;
  timestamp: string;
  entityId: string;
  entityType: 'PRODUCT' | 'VARIANT' | 'CATEGORY' | 'MEDIA' | 'REVIEW' | 'COUNTRY_RULE';
  beforeValue: any;
  afterValue: any;
  reason: string;
}

export interface FieldDecisionRecord {
  fieldName: string;
  choice: FieldApprovalChoice;
  customValue?: any;
  approvedValue: any;
  actor: string;
  timestamp: string;
  reason: string;
}

export interface SourceProvenance {
  sourceType: SourceType;
  sourceUrl?: string | null;
  sourceFile?: string | null;
  timestamp?: string | null;
  hash?: string | null;
  recordId?: string | null;
}

export interface RetainedSourceMapping {
  sourceType: SourceType;
  sourceRecordId: string;
  sourceSlug: string;
  sourceUrl?: string | null;
  sourceFile?: string | null;
  sourceHash: string;
  capturedAt?: string | null;
}

export interface ReviewProductItem {
  id: string;
  canonicalSlug: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryName: string;
  sku: string;
  productType: string;
  sources: {
    reference?: RawProductRecordDomain;
    repoA?: RawProductRecordDomain;
    repoB?: RawProductRecordDomain;
  };
  sourceProvenance: {
    reference?: SourceProvenance;
    repoA?: SourceProvenance;
    repoB?: SourceProvenance;
  };
  retainedSourceMappings: RetainedSourceMapping[];
  sourcePriceUSD?: number | null;
  sourceCurrency?: string | null;
  priceEUR?: number | null;
  priceGBP?: number | null;
  pricingReviewRequired: boolean;
  publicationStatus: 'DRAFT' | 'PENDING_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'BLOCKED';
  complianceClassification: ComplianceClassification;
  complianceReason: string;
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REQUIRES_REVIEW' | 'BLOCKED';
  isWholesale: boolean;
  isCollaboration: boolean;
  isFlavourStandalone: boolean;
  isUnresolvedDuplicate: boolean;
  flavourGroupParentCandidate?: string | null;
  variantStructureDecision?: VariantStructureOption | null;
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    flavor: string;
    priceEUR?: number | null;
    priceGBP?: number | null;
    stockLevel: number;
    image: string;
  }>;
  primaryImage: string;
  galleryImages: string[];
  ingredients: string[];
  attributes: Record<string, any>;
  description: string;
  originalSourceContent: string;
  approvedStoreContent: string;
  contentModerationStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REWRITTEN' | 'BLOCKED';
  contentFlags: string[];
  seo: {
    sourceTitle?: string | null;
    sourceDescription?: string | null;
    sourceCanonical?: string | null;
    sourceStructuredData?: any;
    approvedTitle?: string | null;
    approvedDescription?: string | null;
    approvedCanonical?: string | null;
    isApproved: boolean;
  };
  countryAvailability: Record<string, CountryAvailabilityStatus>;
  fieldDecisions: Record<string, FieldDecisionRecord>;
  fieldComparisons: FieldComparison[];
  issueCount: number;
  lastImported: string;
  confidence: MatchConfidence;
  requiresManualReview: boolean;
  mediaAssets: Array<{
    id: string;
    url: string;
    sourceUrl?: string | null;
    sourceRepository?: string | null;
    isPrimary: boolean;
    format?: string | null;
    dimensions?: string | null;
    hash?: string | null;
    duplicateStatus: string;
    status: 'KEEP' | 'PRIMARY' | 'REMOVED' | 'BROKEN';
  }>;
  readinessChecklist: {
    validProduct: boolean;
    validVariant: boolean;
    validSku: boolean;
    validPrice: boolean;
    validCategory: boolean;
    primaryImage: boolean;
    contentApproved: boolean;
    complianceApproved: boolean;
    countryAvailability: boolean;
    translation: boolean;
    seo: boolean;
    inventory: boolean;
    isReadyToPublish: boolean;
    blockers: string[];
  };
}

export interface CategoryMappingDecision {
  sourceCategoryName: string;
  sourceCategorySlug: string;
  sourceType: SourceType;
  normalizedCategoryName: string;
  normalizedCategorySlug: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  actor?: string | null;
  timestamp?: string | null;
}

export interface ReviewModerationItem {
  id: string;
  productId: string;
  productSlug: string;
  sourceType: SourceType;
  authorName: string;
  rating: number;
  body: string;
  date: string;
  isVerifiedBuyer: boolean;
  sourceUrl?: string | null;
  moderationStatus: 'STAGED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  moderatedBy?: string | null;
  moderatedAt?: string | null;
}

export interface CatalogueReviewState {
  version: number;
  lastUpdated: string;
  products: Record<string, ReviewProductItem>;
  categoryMappings: CategoryMappingDecision[];
  reviews: ReviewModerationItem[];
  auditTrail: AuditRecord[];
}

export interface ReviewDashboardStats {
  totalImportedUnique: number;
  totalRawRecords: number;
  readyForReview: number;
  needsReview: number;
  conflicts: number;
  possibleMatches: number;
  unresolvedDuplicates: number;
  pricingReview: number;
  complianceReview: number;
  mediaIssues: number;
  translationIssues: number;
  readyForPublication: number;
  published: number;
  blocked: number;
  approved: number;
  pending: number;
  duplicateReview: number;
  contentReview: number;
  translationReview: number;
}

export interface ReviewQueueSummaries {
  requiringReview: string[];
  possibleMatches: string[];
  unresolvedDuplicates: string[];
  pricingReview: string[];
  complianceReview: string[];
  categoryReview: string[];
  contentReview: string[];
  mediaReview: string[];
  translationReview: string[];
  readyToPublish: string[];
  blocked: string[];
  reviewDecisionsRecorded: number;
}

const REVIEW_COUNTRIES = ['NL', 'DE', 'FR', 'ES', 'IT', 'UK', 'BE', 'AT', 'IE', 'PT'];

const FLAVOUR_STANDALONE_SLUGS = [
  'almond-crush',
  'birthday-cake',
  'cookie-dough',
  'horchata',
  'ferrero-rocher',
  'ferrari-rocher',
  'matcha',
];

const WHOLESALE_KEYWORDS = [
  '100-bars',
  '50-stacks',
  'wholesale',
  'boutique-box',
  'box-of-10',
  'box-of-fusion',
  '1000mg',
  '2000-mg',
  '10-bars',
];

const COLLAB_KEYWORDS = [
  'laughing-gas',
  'whole-melt',
  'wholemelt',
  'high-tolerance',
  'collab',
  'colaboration',
];

const SOURCE_LABEL_PATTERN = /live reference website|github repository/i;

const POSSIBLE_MATCH_SLUG_HINTS = [
  'ferrari-rocher',
  'ferrero-rocher',
  'laughing-gas',
  'tremendous-laughing',
  'em-and-ems',
  'm-and-ms',
  'kit-cats',
  'kitkat',
  'whole-melt',
  'wholemelt',
];

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function resolveImportedProductName(
  rawRec: RawProductRecordDomain | undefined,
  group: { canonicalName?: string; reconciledProduct?: { name?: string }; canonicalSlug: string },
  slug: string
): string {
  const payloadName = rawRec?.rawPayload?.name;
  if (typeof payloadName === 'string' && payloadName.trim() && !SOURCE_LABEL_PATTERN.test(payloadName)) {
    return payloadName.trim();
  }
  const reconciled = group.reconciledProduct?.name;
  if (reconciled && !SOURCE_LABEL_PATTERN.test(reconciled)) return reconciled;
  if (group.canonicalName && !SOURCE_LABEL_PATTERN.test(group.canonicalName)) return group.canonicalName;
  return humanizeSlug(slug);
}

function isPossibleMatchSlug(slug: string): boolean {
  return POSSIBLE_MATCH_SLUG_HINTS.some((hint) => slug.includes(hint));
}

const CATEGORY_LABELS: Record<string, string> = {
  'chocolate-bars': 'Mushroom Chocolate Bars',
  'mushroom-chocolate-bars': 'Mushroom Chocolate Bars',
  gummies: 'Magic Mushroom Gummies',
  'botanical-gummies': 'Magic Mushroom Gummies',
  collaborations: 'Official Collaborations',
  specialty: 'General / Specialty',
  vapes: 'Vaporizers & Disposables',
  bulk: 'Wholesale & Boutique Boxes',
  uncategorized: 'Uncategorized',
};

export class CatalogueReviewService {
  private static cachedState: CatalogueReviewState | null = null;
  private static persistEnabled = true;
  private static readonly STATE_FILE_PATH = 'src/data/catalogue-review-state.json';

  static setPersistenceEnabled(enabled: boolean): void {
    this.persistEnabled = enabled;
  }

  static clearCache(): void {
    this.cachedState = null;
  }

  static resetStateForTests(state?: CatalogueReviewState): CatalogueReviewState {
    this.persistEnabled = false;
    this.cachedState = state || this.initializeFromImport();
    return this.cachedState;
  }

  static evaluatePublicationReadiness(product: Partial<ReviewProductItem>): ReviewProductItem['readinessChecklist'] {
    const blockers: string[] = [];

    const validProduct = Boolean(product.canonicalSlug && product.name && product.name.trim().length > 0);
    if (!validProduct) blockers.push('Missing product name or canonical slug');

    const variants = product.variants || [];
    const validVariant = variants.length > 0;
    if (!validVariant) blockers.push('Product has zero configured variants');

    const validSku =
      variants.length > 0 && variants.every((v) => Boolean(v.sku != null && String(v.sku).trim().length > 0));
    if (!validSku) blockers.push('One or more variants are missing a valid SKU');

    const hasEurPrice = Boolean(product.priceEUR && product.priceEUR > 0);
    const variantsPriced = variants.length > 0 && variants.every((v) => Boolean(v.priceEUR && v.priceEUR > 0));
    const validPrice = hasEurPrice && variantsPriced && !product.pricingReviewRequired;
    if (!validPrice) {
      if (product.pricingReviewRequired) {
        blockers.push('Product requires explicit pricing approval (PRICING_REVIEW_REQUIRED)');
      } else {
        blockers.push('Product or variants are missing valid EUR commercial pricing (> €0.00)');
      }
    }

    const validCategory = Boolean(
      product.categorySlug && product.categorySlug !== 'uncategorized' && product.categorySlug !== 'specialty'
    );
    if (!validCategory) blockers.push('Category mapping unapproved or unassigned');

    const primaryImage = Boolean(
      product.primaryImage &&
        product.primaryImage.trim().length > 0 &&
        !product.primaryImage.includes('broken')
    );
    if (!primaryImage) blockers.push('Missing valid primary image asset');

    const contentApproved = product.contentModerationStatus === 'APPROVED';
    if (!contentApproved) blockers.push('Store content is not approved or flagged for claims rewrite');

    const complianceApproved = product.complianceClassification === 'APPROVED';
    if (!complianceApproved) {
      blockers.push(`European compliance status is ${product.complianceClassification || 'REQUIRES_REVIEW'}`);
    }

    const countries = product.countryAvailability || {};
    const availableCount = Object.values(countries).filter((s) => s === 'AVAILABLE').length;
    const countryAvailability = availableCount > 0;
    if (!countryAvailability) {
      blockers.push('Country distribution matrix not configured with authorized destinations');
    }

    const translation = Boolean(
      (product.approvedStoreContent && product.approvedStoreContent.trim().length >= 10) ||
        (product.contentModerationStatus === 'APPROVED' && product.description && product.description.trim().length >= 10)
    );
    if (!translation) blockers.push('Localized European store descriptions are missing');

    const seo = Boolean(product.seo?.isApproved && product.seo?.approvedTitle);
    if (!seo) blockers.push('SEO metadata has not received editorial clearance');

    const inventory = variants.length > 0 && variants.some((v) => v.stockLevel !== undefined && v.stockLevel >= 0);
    if (!inventory) blockers.push('Warehouse stock allocation not verified');

    const isReadyToPublish =
      validProduct &&
      validVariant &&
      validSku &&
      validPrice &&
      validCategory &&
      primaryImage &&
      contentApproved &&
      complianceApproved &&
      countryAvailability &&
      translation &&
      seo &&
      inventory;

    return {
      validProduct,
      validVariant,
      validSku,
      validPrice,
      validCategory,
      primaryImage,
      contentApproved,
      complianceApproved,
      countryAvailability,
      translation,
      seo,
      inventory,
      isReadyToPublish,
      blockers,
    };
  }

  static getState(): CatalogueReviewState {
    if (this.cachedState) {
      return this.cachedState;
    }

    const fs = getFs();
    const path = getPath();
    if (this.persistEnabled && fs && path) {
      const fullPath = path.resolve(process.cwd(), this.STATE_FILE_PATH);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(raw);
          if (parsed && parsed.products) {
            this.cachedState = parsed;
            return this.cachedState!;
          }
        } catch (e: any) {
          console.warn('Could not read catalogue review state file, reinitializing:', e.message);
        }
      }
    }

    this.cachedState = this.initializeFromImport();
    this.persistState();
    return this.cachedState!;
  }

  private static buildProvenance(record?: RawProductRecordDomain): SourceProvenance | undefined {
    if (!record) return undefined;
    return {
      sourceType: record.sourceType,
      sourceUrl: record.sourcePermalink || record.sourceCanonicalUrl || null,
      sourceFile: record.sourceFilePath || null,
      timestamp: record.capturedAt || record.sourceModifiedDate || record.sourcePublishedDate || null,
      hash: record.sourceHash || null,
      recordId: record.id || record.recordCode || record.sourceRecordId || null,
    };
  }

  private static buildSourceMappings(sources: ReviewProductItem['sources']): RetainedSourceMapping[] {
    return (['reference', 'repoA', 'repoB'] as const)
      .map((key) => sources[key])
      .filter((record): record is RawProductRecordDomain => Boolean(record))
      .map((record) => ({
        sourceType: record.sourceType,
        sourceRecordId: record.id || record.recordCode || record.sourceRecordId || record.sourceSlug,
        sourceSlug: record.sourceSlug,
        sourceUrl: record.sourcePermalink || record.sourceCanonicalUrl || null,
        sourceFile: record.sourceFilePath || null,
        sourceHash: record.sourceHash,
        capturedAt: record.capturedAt || null,
      }));
  }

  private static detectContentFlags(text: string): string[] {
    const contentFlags: string[] = [];
    const lowerText = text.toLowerCase();

    if (/\b(treat|cure|heal|medicine|therapeutic)\b/.test(lowerText)) contentFlags.push('THERAPEUTIC_CLAIM');
    if (/\b(health|wellness|boost immune|immune system)\b/.test(lowerText)) contentFlags.push('HEALTH_CLAIM');
    if (/\b(trip|psychedelic|psilocybin|hallucin)\b/.test(lowerText)) contentFlags.push('PSYCHOACTIVE_CLAIM');
    if (/\b(dose|dosage|microdose|intake|serving)\b/.test(lowerText)) contentFlags.push('DOSAGE_INSTRUCTIONS');
    if (/\b(euphoric|body high|intense effect|elevat(?:e|es|ing) mood)\b/.test(lowerText)) contentFlags.push('EFFECT_CLAIM');
    if (/\b(fda|legal in all|certified organic|lab tested 100%)\b/.test(lowerText)) {
      contentFlags.push('UNSUPPORTED_REGULATORY_OR_LAB_CLAIM');
    }
    return contentFlags;
  }

  private static parseIngredients(source?: string | null): string[] {
    if (!source || !source.trim()) return [];
    return source
      .split(/[,;•\n]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 1 && part.length < 80)
      .slice(0, 16);
  }

  private static defaultCountryAvailability(): Record<string, CountryAvailabilityStatus> {
    return Object.fromEntries(REVIEW_COUNTRIES.map((code) => [code, 'NOT_CONFIGURED' as CountryAvailabilityStatus]));
  }

  private static resolveCategoryName(slug: string): string {
    return CATEGORY_LABELS[slug] || slug;
  }

  private static attachMedia(
    slug: string,
    rawRec: RawProductRecordDomain | undefined,
    importResult: MasterImportResult,
    primaryFallback: string
  ): ReviewProductItem['mediaAssets'] {
    const related = importResult.rawMedia.filter((media) => {
      if (rawRec && media.rawProductId && media.rawProductId === rawRec.id) return true;
      if (rawRec && media.originalUrl && rawRec.sourcePrimaryImage === media.originalUrl) return true;
      if (rawRec && media.originalUrl && rawRec.sourceGalleryImages?.includes(media.originalUrl)) return true;
      return false;
    });

    const sourceImages = [
      rawRec?.sourcePrimaryImage,
      ...(rawRec?.sourceGalleryImages || []),
    ].filter((url): url is string => Boolean(url));

    const uniqueUrls = Array.from(new Set([...related.map((m) => m.originalUrl), ...sourceImages, primaryFallback].filter(Boolean)));

    return uniqueUrls.map((url, idx) => {
      const match: RawMediaRecordDomain | undefined = related.find((m) => m.originalUrl === url);
      const broken = match?.dedupStatus === 'BROKEN' || match?.dedupStatus === 'MISSING';
      return {
        id: match?.id || `MEDIA-${slug}-${idx + 1}`,
        url,
        sourceUrl: match?.sourcePageUrl || rawRec?.sourcePermalink || url,
        sourceRepository: match?.sourceType || rawRec?.sourceType || null,
        isPrimary: idx === 0 && !broken,
        format: match?.format || (url.endsWith('.png') ? 'PNG' : url.endsWith('.webp') ? 'WEBP' : 'JPEG'),
        dimensions: match?.width && match?.height ? `${match.width}x${match.height}` : null,
        hash: match?.fileHash || MasterCatalogueImportService.generateHash(url),
        duplicateStatus: match?.dedupStatus || 'UNIQUE',
        status: broken ? ('BROKEN' as const) : idx === 0 ? ('PRIMARY' as const) : ('KEEP' as const),
      };
    });
  }

  private static initializeFromImport(): CatalogueReviewState {
    const importResult: MasterImportResult = MasterCatalogueImportService.getImportResult();
    const products: Record<string, ReviewProductItem> = {};

    for (const group of importResult.matchedGroups) {
      const slug = group.canonicalSlug;
      const ref = cloneJson(group.sources.reference);
      const repoA = cloneJson(group.sources.repoA);
      const repoB = cloneJson(group.sources.repoB);
      const rawRec = ref || repoA || repoB;
      const name = resolveImportedProductName(rawRec, group, slug);
      const brand = rawRec?.sourceBrand || group.reconciledProduct.brand || '';

      const isFlavourStandalone =
        FLAVOUR_STANDALONE_SLUGS.some((s) => slug.includes(s)) ||
        (/^fusion-bar-/.test(slug) && !WHOLESALE_KEYWORDS.some((k) => slug.includes(k)));
      const isWholesale = WHOLESALE_KEYWORDS.some((k) => slug.includes(k));
      const isCollaboration = COLLAB_KEYWORDS.some((k) => slug.includes(k));

      const originalText = [
        rawRec?.sourceFullDescription,
        rawRec?.sourceShortDescription,
        rawRec?.sourceEffects,
      ]
        .filter(Boolean)
        .join('\n\n');
      const contentFlags = this.detectContentFlags(originalText);

      const existingEurPrice =
        group.reconciledProduct.fusionEUR && group.reconciledProduct.fusionEUR > 0
          ? Math.round(group.reconciledProduct.fusionEUR)
          : null;
      const existingGbpPrice =
        group.reconciledProduct.fusionGBP && group.reconciledProduct.fusionGBP > 0
          ? Math.round(group.reconciledProduct.fusionGBP)
          : null;
      const pricingReviewRequired = isWholesale || !existingEurPrice || existingEurPrice <= 0;

      const sourceSku = rawRec?.sourceSku != null ? String(rawRec.sourceSku) : '';
      const defaultVariant = {
        id: `VAR-${slug}-01`,
        sku: sourceSku,
        name: rawRec?.sourceFlavor || name,
        flavor: rawRec?.sourceFlavor || group.reconciledProduct.flavor || '',
        priceEUR: existingEurPrice,
        priceGBP: existingGbpPrice,
        stockLevel: rawRec?.sourceStockQuantity ?? 0,
        image: group.reconciledProduct.primaryImage || rawRec?.sourcePrimaryImage || '',
      };

      const conflictingFields = (group.fieldComparisons || []).filter((c) => c.hasConflict);
      const sourceCount = [ref, repoA, repoB].filter(Boolean).length;
      const isPossibleMatch = group.confidence === 'POSSIBLE_MATCH' || isPossibleMatchSlug(slug);
      const isUnresolvedDuplicate = sourceCount > 1 && conflictingFields.length > 0;

      const sources = { reference: ref, repoA, repoB };
      const mediaAssets = this.attachMedia(
        slug,
        rawRec,
        importResult,
        group.reconciledProduct.primaryImage || rawRec?.sourcePrimaryImage || ''
      );
      const primaryImage = mediaAssets.find((m) => m.isPrimary && m.status !== 'BROKEN')?.url || '';

      const item: ReviewProductItem = {
        id: group.duplicateGroupId || `REV-${slug}`,
        canonicalSlug: slug,
        name,
        brand,
        categorySlug: group.reconciledProduct.categorySlug || 'uncategorized',
        categoryName: this.resolveCategoryName(group.reconciledProduct.categorySlug || 'uncategorized'),
        sku: sourceSku,
        productType: group.reconciledProduct.productType ? String(group.reconciledProduct.productType) : '',
        sources,
        sourceProvenance: {
          reference: this.buildProvenance(ref),
          repoA: this.buildProvenance(repoA),
          repoB: this.buildProvenance(repoB),
        },
        retainedSourceMappings: this.buildSourceMappings(sources),
        sourcePriceUSD: rawRec?.sourcePrice ?? null,
        sourceCurrency: rawRec?.sourceCurrency ?? null,
        priceEUR: existingEurPrice,
        priceGBP: existingGbpPrice,
        pricingReviewRequired,
        publicationStatus: 'PENDING_REVIEW',
        complianceClassification: 'REQUIRES_REVIEW',
        complianceReason: isCollaboration
          ? 'Collaboration line requires explicit European sale authorization.'
          : isWholesale
            ? 'Wholesale/bulk item requires pricing and compliance clearance.'
            : 'Imported record awaits European catalogue and compliance review.',
        reviewStatus: 'PENDING_REVIEW',
        isWholesale,
        isCollaboration,
        isFlavourStandalone,
        isUnresolvedDuplicate,
        flavourGroupParentCandidate: isFlavourStandalone ? 'fusion-artisan-mushroom-chocolate-bar' : null,
        variantStructureDecision: null,
        variants: [defaultVariant],
        primaryImage,
        galleryImages: rawRec?.sourceGalleryImages || [],
        ingredients: this.parseIngredients(rawRec?.sourceIngredients),
        attributes: cloneJson(rawRec?.sourceAttributes || {}),
        description: originalText,
        originalSourceContent: originalText,
        approvedStoreContent: '',
        contentModerationStatus: 'PENDING_REVIEW',
        contentFlags,
        seo: {
          sourceTitle: rawRec?.sourceSeoTitle || null,
          sourceDescription: rawRec?.sourceSeoDescription || null,
          sourceCanonical: rawRec?.sourceCanonicalUrl || null,
          sourceStructuredData: rawRec?.rawPayload?.structuredData || rawRec?.rawPayload?.jsonLd || null,
          approvedTitle: null,
          approvedDescription: null,
          approvedCanonical: null,
          isApproved: false,
        },
        countryAvailability: this.defaultCountryAvailability(),
        fieldDecisions: {},
        fieldComparisons: cloneJson(group.fieldComparisons || []),
        issueCount:
          conflictingFields.length +
          (pricingReviewRequired ? 1 : 0) +
          (contentFlags.length > 0 ? 1 : 0) +
          (isUnresolvedDuplicate ? 1 : 0),
        lastImported: importResult.generatedAt,
        confidence: isPossibleMatch ? 'POSSIBLE_MATCH' : group.confidence,
        requiresManualReview: group.requiresManualReview,
        mediaAssets,
        readinessChecklist: {
          validProduct: false,
          validVariant: false,
          validSku: false,
          validPrice: false,
          validCategory: false,
          primaryImage: false,
          contentApproved: false,
          complianceApproved: false,
          countryAvailability: false,
          translation: false,
          seo: false,
          inventory: false,
          isReadyToPublish: false,
          blockers: [],
        },
      };

      item.readinessChecklist = this.evaluatePublicationReadiness(item);
      if (item.readinessChecklist.isReadyToPublish) {
        item.publicationStatus = 'READY_TO_PUBLISH';
      }
      products[slug] = item;
    }

    const categoryMappings: CategoryMappingDecision[] = importResult.categoryReconciliation.map((c) => ({
      sourceCategoryName: c.sourceCategoryName,
      sourceCategorySlug: c.sourceCategorySlug,
      sourceType: c.sourceType,
      normalizedCategoryName: c.normalizedCategoryName,
      normalizedCategorySlug: c.normalizedCategorySlug,
      approvalStatus: 'PENDING',
      actor: null,
      timestamp: null,
    }));

    const reviews: ReviewModerationItem[] = importResult.rawReviews.map((r, idx) => ({
      id: r.id || `REV-MOD-${idx + 1}`,
      productId: r.rawProductId || 'PROD-UNKNOWN',
      productSlug: r.rawProductId || 'unassigned',
      sourceType: r.sourceType,
      authorName: r.authorName || '',
      rating: r.rating || 0,
      body: r.body,
      date: r.reviewDate || r.capturedAt || '',
      isVerifiedBuyer: Boolean(r.isVerifiedBuyer),
      sourceUrl: r.sourceUrl,
      moderationStatus: 'STAGED',
    }));

    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      products,
      categoryMappings,
      reviews,
      auditTrail: [
        {
          id: 'AUDIT-INIT-001',
          action: 'PRODUCT_REVIEWED',
          actor: 'SYSTEM',
          actorRole: 'SYSTEM',
          timestamp: new Date().toISOString(),
          entityId: 'CATALOGUE',
          entityType: 'PRODUCT',
          beforeValue: null,
          afterValue: 'INITIALIZED_FROM_MASTER_IMPORT',
          reason: 'Initial catalogue import ingested into Catalogue Review Center. No records published.',
        },
      ],
    };
  }

  private static persistState(): boolean {
    if (!this.cachedState || !this.persistEnabled) return false;
    this.cachedState.lastUpdated = new Date().toISOString();

    const fs = getFs();
    const path = getPath();
    if (fs && path) {
      try {
        const fullPath = path.resolve(process.cwd(), this.STATE_FILE_PATH);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(fullPath, JSON.stringify(this.cachedState, null, 2), 'utf8');
        return true;
      } catch (err: any) {
        console.error('Failed to persist catalogue review state:', err.message);
      }
    }
    return false;
  }

  static getDashboardStats(): ReviewDashboardStats {
    const state = this.getState();
    const products = Object.values(state.products);
    const importResult = MasterCatalogueImportService.getImportResult();

    let readyForReview = 0;
    let needsReview = 0;
    let conflicts = 0;
    let possibleMatches = 0;
    let unresolvedDuplicates = 0;
    let pricingReview = 0;
    let complianceReview = 0;
    let mediaIssues = 0;
    let translationIssues = 0;
    let readyForPublication = 0;
    let published = 0;
    let blocked = 0;
    let approved = 0;
    let pending = 0;
    let contentReview = 0;

    for (const p of products) {
      if (p.reviewStatus === 'APPROVED') approved++;
      if (p.reviewStatus === 'PENDING_REVIEW' || p.reviewStatus === 'REQUIRES_REVIEW') pending++;
      if (p.reviewStatus === 'BLOCKED' || p.publicationStatus === 'BLOCKED') blocked++;
      if (p.publicationStatus === 'PUBLISHED') published++;

      if (p.readinessChecklist.isReadyToPublish) {
        readyForPublication++;
      } else {
        needsReview++;
      }

      if (p.issueCount > 0 || p.reviewStatus === 'PENDING_REVIEW') {
        readyForReview++;
      }

      if (p.pricingReviewRequired || !p.priceEUR || p.priceEUR <= 0) {
        pricingReview++;
      }

      if (p.complianceClassification !== 'APPROVED') {
        complianceReview++;
      }

      if (p.confidence === 'POSSIBLE_MATCH') {
        possibleMatches++;
      }

      if (p.isUnresolvedDuplicate) {
        unresolvedDuplicates++;
      }

      conflicts += p.fieldComparisons.filter((c) => c.hasConflict).length;

      if (p.mediaAssets.some((m) => m.status === 'BROKEN' || m.duplicateStatus === 'BROKEN' || m.duplicateStatus === 'MISSING')) {
        mediaIssues++;
      }

      if (p.contentModerationStatus === 'PENDING_REVIEW' || p.contentFlags.length > 0) {
        contentReview++;
      }

      if (!p.approvedStoreContent || p.approvedStoreContent.trim().length < 10) {
        translationIssues++;
      }
    }

    return {
      totalImportedUnique: products.length,
      totalRawRecords: importResult.rawProducts?.length || importResult.counts.combined.rawRecords,
      readyForReview,
      needsReview,
      conflicts,
      possibleMatches,
      unresolvedDuplicates,
      pricingReview,
      complianceReview,
      mediaIssues,
      translationIssues,
      readyForPublication,
      published,
      blocked,
      approved,
      pending,
      duplicateReview: possibleMatches + unresolvedDuplicates,
      contentReview,
      translationReview: translationIssues,
    };
  }

  static getQueueSummaries(): ReviewQueueSummaries {
    const state = this.getState();
    const products = Object.values(state.products);
    const names = (list: ReviewProductItem[]) => list.map((p) => p.name);

    return {
      requiringReview: names(products.filter((p) => p.reviewStatus !== 'APPROVED' && p.publicationStatus !== 'PUBLISHED')),
      possibleMatches: names(products.filter((p) => p.confidence === 'POSSIBLE_MATCH')),
      unresolvedDuplicates: names(products.filter((p) => p.isUnresolvedDuplicate)),
      pricingReview: names(products.filter((p) => p.pricingReviewRequired || !p.priceEUR || p.priceEUR <= 0)),
      complianceReview: names(products.filter((p) => p.complianceClassification !== 'APPROVED')),
      categoryReview: state.categoryMappings
        .filter((m) => m.approvalStatus !== 'APPROVED')
        .map((m) => `${m.sourceCategoryName} → ${m.normalizedCategoryName}`),
      contentReview: names(
        products.filter((p) => p.contentModerationStatus !== 'APPROVED' || p.contentFlags.length > 0)
      ),
      mediaReview: names(
        products.filter((p) =>
          p.mediaAssets.some((m) => m.status === 'BROKEN' || m.duplicateStatus === 'BROKEN' || m.duplicateStatus === 'MISSING')
        )
      ),
      translationReview: names(
        products.filter((p) => !p.approvedStoreContent || p.approvedStoreContent.trim().length < 10)
      ),
      readyToPublish: names(products.filter((p) => p.readinessChecklist.isReadyToPublish && p.publicationStatus !== 'PUBLISHED')),
      blocked: names(products.filter((p) => p.publicationStatus === 'BLOCKED' || p.complianceClassification === 'BLOCKED')),
      reviewDecisionsRecorded: state.auditTrail.filter((a) => a.actor !== 'SYSTEM').length,
    };
  }

  static getFilteredProducts(
    filter: ReviewQueueFilter = 'ALL',
    sortField: ReviewSortField = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    searchQuery: string = ''
  ): ReviewProductItem[] {
    const state = this.getState();
    let list = Object.values(state.products);

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const matchName = p.name?.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q) || p.variants.some((v) => v.sku?.toLowerCase().includes(q));
        const matchSlug = p.canonicalSlug?.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q);
        const matchCategory = p.categoryName?.toLowerCase().includes(q) || p.categorySlug?.toLowerCase().includes(q);
        const matchVariant = p.variants.some((v) => v.name?.toLowerCase().includes(q) || v.flavor?.toLowerCase().includes(q));
        const matchSourceId = Object.values(p.sources).some(
          (s) => s?.id?.toLowerCase().includes(q) || s?.sourceRecordId?.toLowerCase().includes(q) || s?.recordCode?.toLowerCase().includes(q)
        );
        const matchSourceUrl = Object.values(p.sources).some((s) => s?.sourcePermalink?.toLowerCase().includes(q));
        const matchReviewStatus = p.reviewStatus?.toLowerCase().includes(q);
        const matchCompliance = p.complianceClassification?.toLowerCase().includes(q);

        return (
          matchName ||
          matchSku ||
          matchSlug ||
          matchBrand ||
          matchCategory ||
          matchVariant ||
          matchSourceId ||
          matchSourceUrl ||
          matchReviewStatus ||
          matchCompliance
        );
      });
    }

    if (filter !== 'ALL') {
      list = list.filter((p) => {
        switch (filter) {
          case 'NEW':
            return p.confidence === 'UNIQUE' || [p.sources.reference, p.sources.repoA, p.sources.repoB].filter(Boolean).length === 1;
          case 'UPDATED':
            return p.fieldComparisons.some((c) => c.hasConflict);
          case 'POSSIBLE_MATCH':
            return p.confidence === 'POSSIBLE_MATCH';
          case 'UNRESOLVED_DUPLICATE':
            return p.isUnresolvedDuplicate;
          case 'PRICE_REVIEW':
            return p.pricingReviewRequired || !p.priceEUR || p.priceEUR <= 0;
          case 'CATEGORY_REVIEW':
            return p.categorySlug === 'uncategorized' || p.categorySlug === 'specialty';
          case 'CONTENT_REVIEW':
            return p.contentModerationStatus === 'PENDING_REVIEW' || p.contentFlags.length > 0;
          case 'COMPLIANCE_REVIEW':
            return p.complianceClassification !== 'APPROVED';
          case 'MEDIA_REVIEW':
            return p.mediaAssets.some(
              (m) => m.status === 'BROKEN' || m.duplicateStatus === 'BROKEN' || m.duplicateStatus === 'MISSING'
            );
          case 'TRANSLATION_REVIEW':
            return !p.approvedStoreContent || p.approvedStoreContent.trim().length < 10;
          case 'READY_TO_PUBLISH':
            return p.readinessChecklist.isReadyToPublish && p.publicationStatus !== 'PUBLISHED';
          case 'BLOCKED':
            return p.publicationStatus === 'BLOCKED' || p.complianceClassification === 'BLOCKED';
          default:
            return true;
        }
      });
    }

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortField) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'source':
          valA = a.sources.reference ? 'reference' : a.sources.repoA ? 'repoA' : 'repoB';
          valB = b.sources.reference ? 'reference' : b.sources.repoA ? 'repoA' : 'repoB';
          break;
        case 'category':
          valA = (a.categoryName || '').toLowerCase();
          valB = (b.categoryName || '').toLowerCase();
          break;
        case 'issueCount':
          valA = a.issueCount;
          valB = b.issueCount;
          break;
        case 'lastImported':
          valA = a.lastImported;
          valB = b.lastImported;
          break;
        case 'reviewStatus':
          valA = a.reviewStatus;
          valB = b.reviewStatus;
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }

  static getProductDetail(slugOrId: string): ReviewProductItem | null {
    const state = this.getState();
    const product =
      state.products[slugOrId] ||
      Object.values(state.products).find((p) => p.id === slugOrId || p.canonicalSlug === slugOrId);
    if (!product) return null;
    product.readinessChecklist = this.evaluatePublicationReadiness(product);
    if (product.readinessChecklist.isReadyToPublish && product.publicationStatus === 'PENDING_REVIEW') {
      product.publicationStatus = 'READY_TO_PUBLISH';
    }
    return product;
  }

  static evaluatePurchaseEligibility(productSlug: string, countryCode: string): PurchaseEligibilityDecision {
    const product = this.getProductDetail(productSlug);
    if (!product) {
      return {
        eligible: false,
        reasonCode: 'NOT_PUBLISHED',
        customerMessage: 'This item is currently not available for purchase.',
        internalNote: `Review product ${productSlug} was not found.`,
      };
    }

    if (product.pricingReviewRequired || !product.priceEUR || product.priceEUR <= 0) {
      return {
        eligible: false,
        reasonCode: 'PRICING_REVIEW_REQUIRED',
        customerMessage: 'This item is currently not available for purchase.',
        internalNote: 'PRICING_REVIEW_REQUIRED. EUR commercial price has not been approved. USD was not converted.',
      };
    }

    const overrides = Object.fromEntries(
      Object.entries(product.countryAvailability).map(([code, status]) => [code, { status }])
    );

    return ProductPurchaseEligibilityService.evaluatePurchaseEligibility(
      {
        status: product.publicationStatus === 'PUBLISHED' ? 'PUBLISHED' : 'PENDING_REVIEW',
        complianceClassification: product.complianceClassification,
        availabilityType: 'COUNTRY',
        allowedCountries: Object.entries(product.countryAvailability)
          .filter(([, status]) => status === 'AVAILABLE')
          .map(([code]) => code),
        countryOverrides: overrides,
        stockLevel: product.variants[0]?.stockLevel,
      },
      countryCode
    );
  }

  static previewGbpFallback(priceEUR: MinorUnits | null | undefined): MinorUnits | null {
    if (!priceEUR || priceEUR <= 0) return null;
    return CurrencyService.getPriceForCurrency({ priceEUR, priceGBP: null }, 'GBP');
  }

  static approveFieldDecision(params: {
    productSlug: string;
    fieldName: string;
    choice: FieldApprovalChoice;
    customValue?: any;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const sourceSnapshot = cloneJson(product.sources);

    let resolvedValue: any = null;
    const ref = product.sources.reference as any;
    const repoA = product.sources.repoA as any;
    const repoB = product.sources.repoB as any;

    switch (params.choice) {
      case 'USE_REFERENCE':
        resolvedValue = ref ? ref[params.fieldName] ?? ref.sourceAttributes?.[params.fieldName] : null;
        break;
      case 'USE_REPO_A':
        resolvedValue = repoA ? repoA[params.fieldName] ?? repoA.sourceAttributes?.[params.fieldName] : null;
        break;
      case 'USE_REPO_B':
        resolvedValue = repoB ? repoB[params.fieldName] ?? repoB.sourceAttributes?.[params.fieldName] : null;
        break;
      case 'KEEP_CURRENT_EU':
        resolvedValue = (product as any)[params.fieldName];
        break;
      case 'CUSTOM_APPROVED_VALUE':
        if (params.customValue === undefined || params.customValue === null || String(params.customValue).trim() === '') {
          return { success: false, error: 'Custom approved value must be provided and non-empty.' };
        }
        resolvedValue = params.customValue;
        break;
    }

    if (!params.reason || params.reason.trim().length === 0) {
      return { success: false, error: 'Approval reason is required for audit trail.' };
    }

    const beforeValue = (product as any)[params.fieldName];

    product.fieldDecisions[params.fieldName] = {
      fieldName: params.fieldName,
      choice: params.choice,
      customValue: params.customValue,
      approvedValue: resolvedValue,
      actor: params.actor,
      timestamp: new Date().toISOString(),
      reason: params.reason,
    };

    const protectedFields = new Set(['sources', 'sourceProvenance', 'retainedSourceMappings', 'originalSourceContent']);
    if (resolvedValue !== null && resolvedValue !== undefined && !protectedFields.has(params.fieldName)) {
      (product as any)[params.fieldName] = resolvedValue;
    }

    product.sources = sourceSnapshot;
    if (product.fieldComparisons.every((c) => !c.hasConflict || product.fieldDecisions[c.fieldName])) {
      product.isUnresolvedDuplicate = product.confidence === 'POSSIBLE_MATCH';
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'FIELD_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue,
      afterValue: resolvedValue,
      reason: `${params.choice}: ${params.reason}`,
    });

    this.persistState();
    return { success: true, product };
  }

  static decideVariantStructure(params: {
    productSlug: string;
    decision: VariantStructureOption;
    parentTargetSlug?: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const beforeDecision = product.variantStructureDecision;
    product.variantStructureDecision = params.decision;

    if (params.decision === 'PARENT_WITH_VARIANTS') {
      const parentSlug = params.parentTargetSlug || product.flavourGroupParentCandidate || 'fusion-artisan-mushroom-chocolate-bar';
      product.flavourGroupParentCandidate = parentSlug;

      const parentProduct = state.products[parentSlug];
      if (parentProduct) {
        const variantSku = product.sku != null ? String(product.sku) : '';
        const existingIdx = parentProduct.variants.findIndex((v) => v.sku && v.sku === variantSku && variantSku.length > 0);
        const newVariant = {
          id: `VAR-${product.canonicalSlug}`,
          sku: variantSku,
          name: product.name,
          flavor: product.name.replace(/^Fusion\s*(Bar\s*)?/i, '').trim(),
          priceEUR: product.priceEUR ?? parentProduct.priceEUR ?? null,
          priceGBP: product.priceGBP ?? parentProduct.priceGBP ?? null,
          stockLevel: product.variants[0]?.stockLevel ?? 0,
          image: product.primaryImage,
        };

        if (existingIdx >= 0) {
          parentProduct.variants[existingIdx] = newVariant;
        } else {
          parentProduct.variants.push(newVariant);
        }

        const existingHashes = new Set(parentProduct.retainedSourceMappings.map((m) => m.sourceHash));
        for (const mapping of product.retainedSourceMappings) {
          if (!existingHashes.has(mapping.sourceHash)) {
            parentProduct.retainedSourceMappings.push(cloneJson(mapping));
          }
        }

        parentProduct.readinessChecklist = this.evaluatePublicationReadiness(parentProduct);
      }

      this.recordAudit({
        action: 'VARIANT_MERGED',
        actor: params.actor,
        actorRole: params.actorRole,
        entityId: product.canonicalSlug,
        entityType: 'VARIANT',
        beforeValue: beforeDecision,
        afterValue: `MERGED_INTO_${parentSlug}`,
        reason: params.reason || 'Approved merging standalone flavour into parent product variants',
      });
    } else {
      product.flavourGroupParentCandidate = product.flavourGroupParentCandidate || null;

      this.recordAudit({
        action: 'VARIANT_SPLIT',
        actor: params.actor,
        actorRole: params.actorRole,
        entityId: product.canonicalSlug,
        entityType: 'VARIANT',
        beforeValue: beforeDecision,
        afterValue: 'STANDALONE_INDIVIDUAL_PRODUCT',
        reason: params.reason || 'Rejected merge; retained as individual product page',
      });
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);
    this.persistState();
    return { success: true, product };
  }

  static approveWholesalePricing(params: {
    productSlug: string;
    approvedPriceEUR: MinorUnits;
    approvedPriceGBP?: MinorUnits;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    if (!params.approvedPriceEUR || params.approvedPriceEUR <= 0) {
      return { success: false, error: 'Approved EUR price must be greater than €0.00 (minor units > 0).' };
    }

    const beforePrice = { eur: product.priceEUR, gbp: product.priceGBP };

    product.priceEUR = params.approvedPriceEUR;
    if (params.approvedPriceGBP && params.approvedPriceGBP > 0) {
      product.priceGBP = params.approvedPriceGBP;
    }
    product.pricingReviewRequired = false;

    for (const v of product.variants) {
      v.priceEUR = params.approvedPriceEUR;
      if (params.approvedPriceGBP && params.approvedPriceGBP > 0) {
        v.priceGBP = params.approvedPriceGBP;
      }
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'PRICE_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: beforePrice,
      afterValue: { eur: product.priceEUR, gbp: product.priceGBP ?? null },
      reason: params.reason || 'Approved wholesale business commercial pricing',
    });

    this.persistState();
    return { success: true, product };
  }

  static approveCollaboration(params: {
    productSlug: string;
    authorizedForEuropeanSale: boolean;
    complianceClassification: ComplianceClassification;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const beforeCompliance = product.complianceClassification;
    product.complianceClassification = params.complianceClassification;
    product.complianceReason = params.reason;

    if (!params.authorizedForEuropeanSale) {
      product.publicationStatus = 'BLOCKED';
      product.reviewStatus = 'BLOCKED';
      for (const k of Object.keys(product.countryAvailability)) {
        product.countryAvailability[k] = 'BLOCKED';
      }
    } else {
      product.reviewStatus = params.complianceClassification === 'APPROVED' ? 'APPROVED' : 'REQUIRES_REVIEW';
      if (product.publicationStatus === 'BLOCKED') {
        product.publicationStatus = 'PENDING_REVIEW';
      }
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'COMPLIANCE_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: beforeCompliance,
      afterValue: params.complianceClassification,
      reason: params.reason || 'Collaboration line European sale authorization review',
    });

    this.persistState();
    return { success: true, product };
  }

  static approveCategoryMapping(params: {
    sourceCategorySlug: string;
    targetCategorySlug: string;
    targetCategoryName: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; mapping?: CategoryMappingDecision; error?: string } {
    const state = this.getState();
    const mapping = state.categoryMappings.find((m) => m.sourceCategorySlug === params.sourceCategorySlug);
    if (!mapping) {
      return { success: false, error: `Category mapping for ${params.sourceCategorySlug} not found.` };
    }

    const before = cloneJson(mapping);
    const preservedSource = {
      sourceCategoryName: mapping.sourceCategoryName,
      sourceCategorySlug: mapping.sourceCategorySlug,
      sourceType: mapping.sourceType,
    };

    mapping.normalizedCategorySlug = params.targetCategorySlug;
    mapping.normalizedCategoryName = params.targetCategoryName;
    mapping.approvalStatus = 'APPROVED';
    mapping.actor = params.actor;
    mapping.timestamp = new Date().toISOString();

    for (const p of Object.values(state.products)) {
      const matchesSource =
        p.categorySlug === params.sourceCategorySlug || p.categorySlug === before.normalizedCategorySlug;
      if (matchesSource) {
        p.categorySlug = params.targetCategorySlug;
        p.categoryName = params.targetCategoryName;
        p.readinessChecklist = this.evaluatePublicationReadiness(p);
      }
    }

    this.recordAudit({
      action: 'CATEGORY_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: params.sourceCategorySlug,
      entityType: 'CATEGORY',
      beforeValue: { ...before, preservedSource },
      afterValue: mapping,
      reason: params.reason || 'Approved normalized category mapping',
    });

    this.persistState();
    return { success: true, mapping };
  }

  static moderateContent(params: {
    productSlug: string;
    action: ContentModerationAction;
    rewrittenContent?: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const beforeStatus = product.contentModerationStatus;
    const original = product.originalSourceContent;

    if (params.action === 'APPROVE') {
      product.contentModerationStatus = 'APPROVED';
      if (!product.approvedStoreContent) {
        product.approvedStoreContent = product.description || original;
      }
    } else if (params.action === 'REWRITE') {
      if (!params.rewrittenContent || params.rewrittenContent.trim().length === 0) {
        return { success: false, error: 'Rewritten content text must be provided. Replacement claims are not invented.' };
      }
      product.approvedStoreContent = params.rewrittenContent;
      product.description = params.rewrittenContent;
      product.contentModerationStatus = 'APPROVED';
    } else if (params.action === 'BLOCK') {
      product.contentModerationStatus = 'BLOCKED';
      product.publicationStatus = 'BLOCKED';
      product.complianceClassification = 'BLOCKED';
    }

    product.originalSourceContent = original;
    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'FIELD_CHANGED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: beforeStatus,
      afterValue: params.action,
      reason: params.reason || `Content moderation decision: ${params.action}`,
    });

    this.persistState();
    return { success: true, product };
  }

  static updateComplianceClassification(params: {
    productSlug: string;
    classification: ComplianceClassification;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const before = product.complianceClassification;
    product.complianceClassification = params.classification;
    product.complianceReason = params.reason;

    if (params.classification === 'BLOCKED') {
      product.publicationStatus = 'BLOCKED';
      product.reviewStatus = 'BLOCKED';
    } else if (params.classification === 'APPROVED') {
      if (product.reviewStatus === 'BLOCKED') product.reviewStatus = 'APPROVED';
    } else {
      product.reviewStatus = 'REQUIRES_REVIEW';
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'COMPLIANCE_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: before,
      afterValue: params.classification,
      reason: params.reason || `Updated compliance classification to ${params.classification}`,
    });

    this.persistState();
    return { success: true, product };
  }

  static updateCountryAvailability(params: {
    productSlug: string;
    countryCode: string;
    status: CountryAvailabilityStatus;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const before = product.countryAvailability[params.countryCode] || 'NOT_CONFIGURED';
    product.countryAvailability[params.countryCode] = params.status;
    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'COUNTRY_RULE_CHANGED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: `${product.canonicalSlug}:${params.countryCode}`,
      entityType: 'COUNTRY_RULE',
      beforeValue: before,
      afterValue: params.status,
      reason: params.reason || `Updated country availability for ${params.countryCode} to ${params.status}`,
    });

    this.persistState();
    return { success: true, product };
  }

  static moderateMedia(params: {
    productSlug: string;
    mediaId: string;
    action: 'SET_PRIMARY' | 'REMOVE' | 'KEEP' | 'FLAG_BROKEN';
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const asset = product.mediaAssets.find((m) => m.id === params.mediaId);
    if (!asset) return { success: false, error: `Media asset ${params.mediaId} not found.` };

    const before = cloneJson(asset);
    const preservedUrl = asset.url;

    if (params.action === 'SET_PRIMARY') {
      product.mediaAssets.forEach((m) => {
        if (m.status !== 'REMOVED' && m.status !== 'BROKEN') {
          m.isPrimary = false;
          if (m.status === 'PRIMARY') m.status = 'KEEP';
        }
      });
      asset.isPrimary = true;
      asset.status = 'PRIMARY';
      product.primaryImage = asset.url;
    } else if (params.action === 'REMOVE') {
      asset.status = 'REMOVED';
      asset.isPrimary = false;
      if (product.primaryImage === asset.url) {
        const next = product.mediaAssets.find((m) => m.status !== 'REMOVED' && m.status !== 'BROKEN');
        product.primaryImage = next ? next.url : '';
        if (next) {
          next.isPrimary = true;
          next.status = 'PRIMARY';
        }
      }
    } else if (params.action === 'FLAG_BROKEN') {
      asset.status = 'BROKEN';
      asset.duplicateStatus = 'BROKEN';
    } else if (params.action === 'KEEP') {
      asset.status = 'KEEP';
    }

    asset.url = preservedUrl;
    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'MEDIA_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: `${product.canonicalSlug}:${params.mediaId}`,
      entityType: 'MEDIA',
      beforeValue: before,
      afterValue: asset,
      reason: params.reason || `Media asset action: ${params.action}`,
    });

    this.persistState();
    return { success: true, product };
  }

  static moderateReview(params: {
    reviewId: string;
    action: 'APPROVE' | 'REJECT' | 'ARCHIVE';
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; review?: ReviewModerationItem; error?: string } {
    const state = this.getState();
    const review = state.reviews.find((r) => r.id === params.reviewId);
    if (!review) return { success: false, error: `Review ${params.reviewId} not found.` };

    const before = review.moderationStatus;
    const provenance = {
      sourceType: review.sourceType,
      authorName: review.authorName,
      date: review.date,
      rating: review.rating,
      body: review.body,
      sourceUrl: review.sourceUrl,
      isVerifiedBuyer: review.isVerifiedBuyer,
    };

    review.moderationStatus = params.action === 'APPROVE' ? 'APPROVED' : params.action === 'REJECT' ? 'REJECTED' : 'ARCHIVED';
    review.moderatedBy = params.actor;
    review.moderatedAt = new Date().toISOString();
    review.sourceType = provenance.sourceType;
    review.authorName = provenance.authorName;
    review.date = provenance.date;
    review.rating = provenance.rating;
    review.body = provenance.body;
    review.sourceUrl = provenance.sourceUrl;
    review.isVerifiedBuyer = provenance.isVerifiedBuyer;

    this.recordAudit({
      action: 'REVIEW_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: review.id,
      entityType: 'REVIEW',
      beforeValue: before,
      afterValue: review.moderationStatus,
      reason: params.reason || `Customer review moderation action: ${params.action}`,
    });

    this.persistState();
    return { success: true, review };
  }

  static approveSeo(params: {
    productSlug: string;
    approvedTitle: string;
    approvedDescription: string;
    approvedCanonical?: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    if (!params.approvedTitle?.trim() || !params.approvedDescription?.trim()) {
      return { success: false, error: 'Approved SEO title and description are required. Source metadata is not copied automatically.' };
    }

    const before = cloneJson(product.seo);
    product.seo.approvedTitle = params.approvedTitle;
    product.seo.approvedDescription = params.approvedDescription;
    if (params.approvedCanonical) product.seo.approvedCanonical = params.approvedCanonical;
    product.seo.isApproved = true;

    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'FIELD_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: before,
      afterValue: product.seo,
      reason: params.reason || 'Approved European store SEO metadata',
    });

    this.persistState();
    return { success: true, product };
  }

  static publishProduct(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const checklist = this.evaluatePublicationReadiness(product);
    product.readinessChecklist = checklist;
    if (!checklist.isReadyToPublish) {
      return {
        success: false,
        error: `Cannot publish product. Failed checklist gates: ${checklist.blockers.join('; ')}`,
      };
    }

    if (product.pricingReviewRequired || !product.priceEUR || product.priceEUR <= 0) {
      return {
        success: false,
        error: 'Cannot publish product: Pricing review is required and unapproved.',
      };
    }

    if (product.complianceClassification !== 'APPROVED') {
      return {
        success: false,
        error: `Cannot publish product: Compliance classification is ${product.complianceClassification}. Only APPROVED products may be published.`,
      };
    }

    const guard = ProductPublicationGuard.evaluateProductForPublication({
      id: product.id,
      status: 'PENDING_REVIEW',
      availabilityType: 'COUNTRY',
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        priceEUR: v.priceEUR || 0,
        stockLevel: v.stockLevel,
      })),
      images: product.mediaAssets.filter((m) => m.status !== 'REMOVED').map((m) => ({ url: m.url, isPrimary: m.isPrimary })),
      translations: product.approvedStoreContent ? [{ locale: 'en', name: product.name }] : [],
    });

    if (!guard.canPublish) {
      return {
        success: false,
        error: `Cannot publish product. Publication guard rejected: ${guard.reasons.join('; ')}`,
      };
    }

    const before = product.publicationStatus;
    product.publicationStatus = 'PUBLISHED';
    product.reviewStatus = 'APPROVED';

    this.recordAudit({
      action: 'PRODUCT_PUBLISHED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: before,
      afterValue: 'PUBLISHED',
      reason: params.reason || 'Product passed all governance checks and was cleared for publication',
    });

    this.persistState();
    return { success: true, product };
  }

  static blockProduct(params: {
    productSlug: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; product?: ReviewProductItem; error?: string } {
    const state = this.getState();
    const product = state.products[params.productSlug];
    if (!product) return { success: false, error: `Product ${params.productSlug} not found.` };

    const before = product.publicationStatus;
    product.publicationStatus = 'BLOCKED';
    product.reviewStatus = 'BLOCKED';
    product.complianceClassification = 'BLOCKED';
    product.complianceReason = params.reason;

    for (const k of Object.keys(product.countryAvailability)) {
      product.countryAvailability[k] = 'BLOCKED';
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'PRODUCT_BLOCKED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: before,
      afterValue: 'BLOCKED',
      reason: params.reason || 'Product blocked by administrative compliance officer',
    });

    this.persistState();
    return { success: true, product };
  }

  static executeBulkAction(params: {
    productSlugs: string[];
    action:
      | 'APPROVE_CONTENT'
      | 'APPROVE_MEDIA'
      | 'APPROVE_CATEGORY_MAPPINGS'
      | 'ASSIGN_CATEGORY'
      | 'ASSIGN_COMPLIANCE'
      | 'SET_COUNTRY_AVAILABILITY'
      | 'PUBLISH_SELECTED';
    targetCategorySlug?: string;
    targetCategoryName?: string;
    complianceClassification?: ComplianceClassification;
    countryCode?: string;
    countryStatus?: CountryAvailabilityStatus;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; affectedCount: number; errors?: string[] } {
    const state = this.getState();
    const errors: string[] = [];
    let affectedCount = 0;

    if (params.action === 'PUBLISH_SELECTED') {
      for (const slug of params.productSlugs) {
        const result = this.publishProduct({
          productSlug: slug,
          actor: params.actor,
          actorRole: params.actorRole,
          reason: params.reason,
        });
        if (result.success) {
          affectedCount++;
        } else {
          errors.push(result.error || `Product ${slug} cannot be bulk published`);
        }
      }
      return { success: affectedCount > 0 && errors.length === 0, affectedCount, errors: errors.length > 0 ? errors : undefined };
    }

    if (params.action === 'APPROVE_CATEGORY_MAPPINGS') {
      for (const mapping of state.categoryMappings.filter((m) => m.approvalStatus !== 'APPROVED')) {
        const result = this.approveCategoryMapping({
          sourceCategorySlug: mapping.sourceCategorySlug,
          targetCategorySlug: mapping.normalizedCategorySlug,
          targetCategoryName: mapping.normalizedCategoryName,
          actor: params.actor,
          actorRole: params.actorRole,
          reason: params.reason,
        });
        if (result.success) affectedCount++;
      }
      return { success: true, affectedCount };
    }

    for (const slug of params.productSlugs) {
      const p = state.products[slug];
      if (!p) continue;

      if (params.action === 'APPROVE_CONTENT') {
        p.contentModerationStatus = 'APPROVED';
        if (!p.approvedStoreContent) p.approvedStoreContent = p.description || p.originalSourceContent;
        p.readinessChecklist = this.evaluatePublicationReadiness(p);
        affectedCount++;
      } else if (params.action === 'APPROVE_MEDIA') {
        p.mediaAssets.forEach((m) => {
          if (m.status !== 'REMOVED' && m.status !== 'BROKEN') m.status = m.isPrimary ? 'PRIMARY' : 'KEEP';
        });
        p.readinessChecklist = this.evaluatePublicationReadiness(p);
        affectedCount++;
      } else if (params.action === 'ASSIGN_CATEGORY') {
        if (params.targetCategorySlug && params.targetCategoryName) {
          p.categorySlug = params.targetCategorySlug;
          p.categoryName = params.targetCategoryName;
          p.readinessChecklist = this.evaluatePublicationReadiness(p);
          affectedCount++;
        }
      } else if (params.action === 'ASSIGN_COMPLIANCE') {
        if (params.complianceClassification) {
          p.complianceClassification = params.complianceClassification;
          p.complianceReason = params.reason;
          if (params.complianceClassification === 'BLOCKED') {
            p.publicationStatus = 'BLOCKED';
            p.reviewStatus = 'BLOCKED';
          }
          p.readinessChecklist = this.evaluatePublicationReadiness(p);
          affectedCount++;
        }
      } else if (params.action === 'SET_COUNTRY_AVAILABILITY') {
        if (params.countryCode && params.countryStatus) {
          p.countryAvailability[params.countryCode] = params.countryStatus;
          p.readinessChecklist = this.evaluatePublicationReadiness(p);
          affectedCount++;
        }
      }
    }

    this.recordAudit({
      action: 'PRODUCT_REVIEWED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: `${affectedCount}_PRODUCTS`,
      entityType: 'PRODUCT',
      beforeValue: null,
      afterValue: params.action,
      reason: `Bulk operation ${params.action}: ${params.reason}`,
    });

    this.persistState();
    return { success: true, affectedCount, errors: errors.length > 0 ? errors : undefined };
  }

  static getAuditTrail(): AuditRecord[] {
    const state = this.getState();
    return [...state.auditTrail].reverse();
  }

  static getRawSourceSnapshot(productSlug: string): ReviewProductItem['sources'] | null {
    const product = this.getProductDetail(productSlug);
    return product ? cloneJson(product.sources) : null;
  }

  private static recordAudit(audit: Omit<AuditRecord, 'id' | 'timestamp'>) {
    const state = this.getState();
    const id = `AUDIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const record: AuditRecord = {
      ...audit,
      id,
      timestamp: new Date().toISOString(),
      beforeValue: scrubSecrets(audit.beforeValue),
      afterValue: scrubSecrets(audit.afterValue),
    };
    state.auditTrail.push(record);
  }
}
