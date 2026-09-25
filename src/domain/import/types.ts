// ==============================================================================
// MASTER CATALOGUE IMPORT & SOURCE PRESERVATION - DOMAIN TYPES
// ==============================================================================

export type SourceType =
  | 'REFERENCE_WEBSITE'
  | 'GITHUB_REPOSITORY_A'
  | 'GITHUB_REPOSITORY_B'
  | 'INTERNAL_FUSION_EU';

export type MatchConfidence =
  | 'EXACT_MATCH'
  | 'HIGH_CONFIDENCE'
  | 'POSSIBLE_MATCH'
  | 'UNIQUE';

export type NormalizationStatus =
  | 'PENDING'
  | 'NORMALIZED'
  | 'CONFLICT'
  | 'IGNORED'
  | 'FAILED';

export type ReviewStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUIRES_COMPLIANCE_REVIEW';

export type PublicationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'BLOCKED';

export type DiffChangeType =
  | 'NEW'
  | 'UPDATED'
  | 'UNCHANGED'
  | 'REMOVED_FROM_SOURCE'
  | 'CONFLICT';

export interface ImportSourceMeta {
  id: string;
  sourceType: SourceType;
  sourceName: string;
  sourceUrl: string;
  gitCommitSha?: string;
  gitBranch?: string;
  capturedAt: string;
  description?: string;
}

export interface ImportBatchMeta {
  id: string;
  batchNumber: string;
  sourceType: SourceType;
  startedAt: string;
  completedAt?: string;
  status: 'STARTED' | 'COMPLETED' | 'FAILED';
  itemsTotal: number;
  itemsProcessed: number;
  itemsImported: number;
  itemsUpdated: number;
  itemsSkipped: number;
  itemsFailed: number;
}

export interface SourceSnapshotRecord {
  id: string;
  importBatchId: string;
  sourceUrl: string;
  sourceFilePath?: string;
  gitCommitSha?: string;
  httpStatus?: number;
  contentHash: string;
  contentType?: string;
  capturedAt: string;
  rawPayload: any;
}

export interface RawCategoryRecordDomain {
  id: string; // e.g. "RAW-CAT-REF-001"
  recordCode: string;
  sourceType: SourceType;
  sourceName: string;
  sourceSlug: string;
  sourceDescription?: string | null;
  sourceUrl?: string | null;
  sourceImageUrl?: string | null;
  sourceParentSlug?: string | null;
  sourceOrder?: number | null;
  sourceHash: string;
  rawPayload: any;
  normalizationStatus: NormalizationStatus;
  normalizedCategoryId?: string | null;
  capturedAt: string;
}

export interface RawProductRecordDomain {
  id: string; // e.g. "RAW-REF-0001", "RAW-REPO-A-0001"
  recordCode: string;
  sourceType: SourceType;
  sourceName: string;
  sourceRecordId?: string | null;
  sourceSlug: string;
  sourcePermalink?: string | null;
  sourceSku?: string | null;
  sourceCategoryName?: string | null;
  sourceBrand?: string | null;
  sourceShortDescription?: string | null;
  sourceFullDescription?: string | null;
  sourcePrice?: number | null;
  sourceRegularPrice?: number | null;
  sourceSalePrice?: number | null;
  sourceCurrency?: string | null;
  sourceStockStatus?: string | null;
  sourceStockQuantity?: number | null;
  sourceWeight?: string | null;
  sourceDimensions?: string | null;
  sourceAttributes?: Record<string, string>;
  sourceVariations?: any[];
  sourceFlavor?: string | null;
  sourceSize?: string | null;
  sourcePackSize?: string | null;
  sourceNetContent?: string | null;
  sourceIngredients?: string | null;
  sourceAllergens?: string | null;
  sourceEffects?: string | null;
  sourceServingInfo?: string | null;
  sourceDosageInfo?: string | null;
  sourceWarnings?: string | null;
  sourceUsageInfo?: string | null;
  sourceTags?: string[];
  sourceIsFeatured?: boolean;
  sourceReviewCount?: number;
  sourceAverageRating?: number | null;
  sourcePublishedDate?: string | null;
  sourceModifiedDate?: string | null;
  sourceCanonicalUrl?: string | null;
  sourceSeoTitle?: string | null;
  sourceSeoDescription?: string | null;
  sourceOgImage?: string | null;
  sourcePrimaryImage?: string | null;
  sourceGalleryImages?: string[];
  sourceFilePath?: string | null;
  sourceHash: string;
  rawPayload: any;
  normalizationStatus: NormalizationStatus;
  reviewStatus: ReviewStatus;
  publicationStatus: PublicationStatus;
  duplicateGroupId?: string | null;
  matchConfidence?: MatchConfidence | null;
  capturedAt: string;
}

export interface RawMediaRecordDomain {
  id: string;
  rawProductId?: string | null;
  sourceType: SourceType;
  originalUrl: string;
  sourcePageUrl?: string | null;
  filename: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  position: number;
  isPrimary: boolean;
  isGallery: boolean;
  fileHash?: string | null;
  dedupStatus: 'UNIQUE' | 'DUPLICATE' | 'SHARED_ACROSS_PRODUCTS' | 'MISSING' | 'BROKEN';
  sharedProductCount: number;
  rawPayload?: any;
  capturedAt: string;
}

export interface RawReviewRecordDomain {
  id: string;
  rawProductId?: string | null;
  sourceType: SourceType;
  sourceReviewId?: string | null;
  authorName?: string | null;
  rating: number;
  title?: string | null;
  body: string;
  reviewDate?: string | null;
  isVerifiedBuyer: boolean;
  sourceUrl?: string | null;
  reviewStatus: 'STAGED' | 'APPROVED' | 'REJECTED';
  capturedAt: string;
}

export interface FieldComparison {
  fieldName: string;
  referenceValue: any;
  repoAValue: any;
  repoBValue: any;
  currentFusionEUValue: any;
  reconciledValue: any;
  reconciliationRule: string;
  hasConflict: boolean;
  notes?: string;
}

export interface MatchedProductGroup {
  duplicateGroupId: string;
  canonicalSlug: string;
  canonicalName: string;
  confidence: MatchConfidence;
  matchReasons: string[];
  requiresManualReview: boolean;
  sources: {
    reference?: RawProductRecordDomain;
    repoA?: RawProductRecordDomain;
    repoB?: RawProductRecordDomain;
  };
  fieldComparisons: FieldComparison[];
  reconciledProduct: {
    name: string;
    slug: string;
    brand: string;
    categorySlug: string;
    productType: string;
    sourcePriceUSD?: number | null;
    fusionEUR?: number | null;
    fusionGBP?: number | null;
    pricingReviewRequired: boolean;
    primaryImage: string;
    galleryImages: string[];
    weightLabel?: string | null;
    flavor?: string | null;
    status: PublicationStatus;
    reviewStatus: ReviewStatus;
    reviewNotes: string;
  };
}

export interface ImportIssueDomain {
  id: string;
  batchId: string;
  rawProductRecordCode?: string | null;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  issueType:
    | 'DUPLICATE_SLUG'
    | 'BROKEN_IMAGE'
    | 'CONFLICTING_PRICE'
    | 'UNMAPPED_CATEGORY'
    | 'MISSING_FIELD'
    | 'COMPLIANCE_REVIEW_REQUIRED'
    | 'POSSIBLE_MATCH_NEEDS_REVIEW'
    | 'PRICING_REVIEW_REQUIRED';
  message: string;
  field?: string | null;
  sourceValue?: string | null;
  conflictingValue?: string | null;
  isResolved: boolean;
  createdAt: string;
}

export interface CategoryReconciliationDomain {
  sourceCategoryName: string;
  sourceCategorySlug: string;
  sourceType: SourceType;
  normalizedCategoryName: string;
  normalizedCategorySlug: string;
  mappingStatus: 'EXACT' | 'MAPPED' | 'UNMAPPED';
  productCount: number;
}
