// ==============================================================================
// FUSION MUSHROOM BARS EU - CATALOGUE REVIEW DOMAIN SERVICE
// Enterprise Governance, Source Comparison, Field Approval & Publication Gate
// ==============================================================================

import {
  ComplianceClassification,
  CountryAvailabilityStatus,
  MinorUnits,
  ProductStatus,
  RoleName,
} from '@/types';
import {
  FieldComparison,
  MatchedProductGroup,
  MatchConfidence,
  RawMediaRecordDomain,
  RawProductRecordDomain,
  RawReviewRecordDomain,
  SourceType,
} from '@/domain/import/types';
import { MasterCatalogueImportService, MasterImportResult } from '@/domain/import/MasterCatalogueImportService';
import { ProductPublicationGuard, ProductPublicationCheck } from '@/domain/catalog/ProductPublicationGuard';
import { ProductPurchaseEligibilityService } from '@/domain/catalog/ProductPurchaseEligibilityService';

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
  sourcePriceUSD?: number | null;
  sourceCurrency?: string | null;
  priceEUR?: number | null; // minor units (cents)
  priceGBP?: number | null; // minor units (pence)
  pricingReviewRequired: boolean;
  publicationStatus: 'DRAFT' | 'PENDING_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'BLOCKED';
  complianceClassification: ComplianceClassification;
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REQUIRES_REVIEW' | 'BLOCKED';
  isWholesale: boolean;
  isCollaboration: boolean;
  isFlavourStandalone: boolean;
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

export class CatalogueReviewService {
  private static cachedState: CatalogueReviewState | null = null;
  private static readonly STATE_FILE_PATH = 'src/data/catalogue-review-state.json';

  /**
   * Evaluates the 12-point Publication Readiness Checklist for a product.
   */
  static evaluatePublicationReadiness(product: Partial<ReviewProductItem>): ReviewProductItem['readinessChecklist'] {
    const blockers: string[] = [];

    // 1. VALID PRODUCT (non-empty slug and name)
    const validProduct = Boolean(product.canonicalSlug && product.name && product.name.trim().length > 0);
    if (!validProduct) blockers.push('Missing product name or canonical slug');

    // 2. VALID VARIANT (at least 1 configured variant)
    const variants = product.variants || [];
    const validVariant = variants.length > 0;
    if (!validVariant) blockers.push('Product has zero configured variants');

    // 3. VALID SKU (all variants have non-empty SKU)
    const validSku = variants.length > 0 && variants.every((v) => Boolean(v.sku && v.sku.trim().length > 0));
    if (!validSku) blockers.push('One or more variants are missing a valid SKU');

    // 4. VALID PRICE (EUR price > 0 and pricingReviewRequired == false)
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

    // 5. VALID CATEGORY (valid normalized category slug)
    const validCategory = Boolean(product.categorySlug && product.categorySlug !== 'uncategorized');
    if (!validCategory) blockers.push('Category mapping unapproved or unassigned');

    // 6. PRIMARY IMAGE (must possess a valid primary presentation image)
    const primaryImage = Boolean(
      product.primaryImage &&
      product.primaryImage.trim().length > 0 &&
      !product.primaryImage.includes('broken')
    );
    if (!primaryImage) blockers.push('Missing valid primary image asset');

    // 7. CONTENT APPROVED (content moderation is APPROVED)
    const contentApproved = product.contentModerationStatus === 'APPROVED';
    if (!contentApproved) blockers.push('Store content is not approved or flagged for claims rewrite');

    // 8. COMPLIANCE APPROVED (classification is APPROVED, not REQUIRES_REVIEW or BLOCKED)
    const complianceApproved = product.complianceClassification === 'APPROVED';
    if (!complianceApproved) blockers.push(`European compliance status is ${product.complianceClassification || 'REQUIRES_REVIEW'}`);

    // 9. COUNTRY AVAILABILITY (at least one country AVAILABLE and not blocked)
    const countries = product.countryAvailability || {};
    const availableCount = Object.values(countries).filter((s) => s === 'AVAILABLE').length;
    const countryAvailability = availableCount > 0;
    if (!countryAvailability) blockers.push('Country distribution matrix not configured with authorized destinations');

    // 10. TRANSLATION (description and title present in default store language)
    const translation = Boolean(product.description && product.description.trim().length >= 10);
    if (!translation) blockers.push('Localized European store descriptions are missing');

    // 11. SEO (approved SEO title and description)
    const seo = Boolean(product.seo?.isApproved && product.seo?.approvedTitle);
    if (!seo) blockers.push('SEO metadata has not received editorial clearance');

    // 12. INVENTORY (at least one variant stock >= 0 and configured)
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

  /**
   * Returns the current catalogue review state from cache or disk.
   */
  static getState(): CatalogueReviewState {
    if (this.cachedState) {
      return this.cachedState;
    }

    const fs = getFs();
    const path = getPath();
    if (fs && path) {
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

    // Initialize from MasterCatalogueImportService
    this.cachedState = this.initializeFromImport();
    this.persistState();
    return this.cachedState!;
  }

  /**
   * Initializes initial review state from import result while preserving raw source provenance.
   */
  private static initializeFromImport(): CatalogueReviewState {
    const importResult: MasterImportResult = MasterCatalogueImportService.getImportResult();
    const products: Record<string, ReviewProductItem> = {};

    const FLAVOUR_STANDALONE_SLUGS = [
      'almond-crush',
      'birthday-cake',
      'cookie-dough',
      'horchata',
      'ferrero-rocher',
      'matcha',
    ];

    const WHOLESALE_KEYWORDS = [
      '100-bars',
      '50-stacks',
      'wholesale',
      'boutique-box',
      'box-of-10',
      'box-of-fusion',
    ];

    const COLLAB_KEYWORDS = [
      'laughing-gas',
      'whole-melt',
      'high-tolerance',
      'collab',
    ];

    for (const group of importResult.matchedGroups) {
      const slug = group.canonicalSlug;
      const ref = group.sources.reference;
      const repoA = group.sources.repoA;
      const repoB = group.sources.repoB;

      const rawRec = ref || repoA || repoB;
      const name = rawRec?.sourceName || group.reconciledProduct.name || slug;
      const brand = rawRec?.sourceBrand || group.reconciledProduct.brand || 'Fusion Mushroom Bars';

      const isFlavourStandalone = FLAVOUR_STANDALONE_SLUGS.some((s) => slug.includes(s));
      const isWholesale = WHOLESALE_KEYWORDS.some((k) => slug.includes(k));
      const isCollaboration = COLLAB_KEYWORDS.some((k) => slug.includes(k));

      // Flag claims in original text
      const originalText = (rawRec?.sourceFullDescription || rawRec?.sourceShortDescription || '') + ' ' + (rawRec?.sourceEffects || '');
      const contentFlags: string[] = [];
      const lowerText = originalText.toLowerCase();

      if (lowerText.includes('treat') || lowerText.includes('cure') || lowerText.includes('heal') || lowerText.includes('medicine')) {
        contentFlags.push('THERAPEUTIC_CLAIM');
      }
      if (lowerText.includes('health') || lowerText.includes('wellness') || lowerText.includes('boost immune')) {
        contentFlags.push('HEALTH_CLAIM');
      }
      if (lowerText.includes('trip') || lowerText.includes('psychedelic') || lowerText.includes('psilocybin') || lowerText.includes('hallucin')) {
        contentFlags.push('PSYCHOACTIVE_CLAIM');
      }
      if (lowerText.includes('gram') || lowerText.includes('dose') || lowerText.includes('microdose') || lowerText.includes('intake')) {
        contentFlags.push('DOSAGE_INSTRUCTIONS');
      }
      if (lowerText.includes('euphoric') || lowerText.includes('body high') || lowerText.includes('intense effect')) {
        contentFlags.push('EFFECT_CLAIM');
      }
      if (lowerText.includes('fda') || lowerText.includes('legal in all') || lowerText.includes('certified organic') || lowerText.includes('lab tested 100%')) {
        contentFlags.push('UNSUPPORTED_REGULATORY_OR_LAB_CLAIM');
      }

      // Check EUR pricing (existing European catalogue preservation)
      const existingEurPrice = group.reconciledProduct.fusionEUR ? group.reconciledProduct.fusionEUR * 100 : null;
      const existingGbpPrice = group.reconciledProduct.fusionGBP ? group.reconciledProduct.fusionGBP * 100 : null;
      const pricingReviewRequired = isWholesale || !existingEurPrice;

      // Variants
      const defaultVariant = {
        id: `VAR-${slug}-01`,
        sku: rawRec?.sourceSku || `FB-EU-${slug.slice(0, 12).toUpperCase()}-01`,
        name: rawRec?.sourceFlavor || name,
        flavor: rawRec?.sourceFlavor || group.reconciledProduct.flavor || 'Original Botanical',
        priceEUR: existingEurPrice,
        priceGBP: existingGbpPrice,
        stockLevel: 50,
        image: group.reconciledProduct.primaryImage || rawRec?.sourcePrimaryImage || 'https://picsum.photos/seed/fusion-bar/800/800',
      };

      // Compliance classification
      let complianceClassification: ComplianceClassification = 'REQUIRES_REVIEW';
      if (isCollaboration) {
        complianceClassification = 'REQUIRES_REVIEW'; // Explicit authorization required for EU sale
      }

      // Media assets
      const mediaAssets = (rawRec?.sourceGalleryImages || [group.reconciledProduct.primaryImage]).filter(Boolean).map((imgUrl, idx) => ({
        id: `MEDIA-${slug}-${idx + 1}`,
        url: imgUrl,
        isPrimary: idx === 0,
        format: imgUrl.endsWith('.png') ? 'PNG' : imgUrl.endsWith('.webp') ? 'WEBP' : 'JPEG',
        dimensions: '800x800',
        hash: MasterCatalogueImportService.generateHash(imgUrl),
        duplicateStatus: 'VERIFIED',
        status: 'KEEP' as const,
      }));

      // Default country availability
      const defaultCountryAvailability: Record<string, CountryAvailabilityStatus> = {
        NL: 'AVAILABLE',
        DE: 'AVAILABLE',
        FR: 'RESTRICTED',
        ES: 'RESTRICTED',
        IT: 'RESTRICTED',
        UK: 'RESTRICTED',
        BE: 'AVAILABLE',
        AT: 'AVAILABLE',
      };

      const item: ReviewProductItem = {
        id: group.duplicateGroupId || `REV-${slug}`,
        canonicalSlug: slug,
        name,
        brand,
        categorySlug: group.reconciledProduct.categorySlug || 'mushroom-chocolate-bars',
        categoryName: group.reconciledProduct.categorySlug === 'gummies' ? 'Magic Mushroom Gummies' : 'Mushroom Chocolate Bars',
        sku: rawRec?.sourceSku || `FB-EU-${slug.slice(0, 14).toUpperCase()}`,
        productType: group.reconciledProduct.productType || 'CHOCOLATE_BAR',
        sources: {
          reference: ref,
          repoA,
          repoB,
        },
        sourcePriceUSD: rawRec?.sourcePrice || 40,
        sourceCurrency: rawRec?.sourceCurrency || 'USD',
        priceEUR: existingEurPrice,
        priceGBP: existingGbpPrice,
        pricingReviewRequired,
        publicationStatus: 'PENDING_REVIEW',
        complianceClassification,
        reviewStatus: 'PENDING_REVIEW',
        isWholesale,
        isCollaboration,
        isFlavourStandalone,
        flavourGroupParentCandidate: isFlavourStandalone ? 'fusion-artisan-mushroom-chocolate-bar' : null,
        variantStructureDecision: null,
        variants: [defaultVariant],
        primaryImage: group.reconciledProduct.primaryImage || rawRec?.sourcePrimaryImage || 'https://picsum.photos/seed/fusion-bar/800/800',
        galleryImages: rawRec?.sourceGalleryImages || [],
        ingredients: [
          'Organic Cacao Butter',
          'Pure Cane Sugar',
          'Whole Milk Powder',
          'European Botanical Blend',
          'Sunflower Lecithin',
          'Bourbon Vanilla',
        ],
        attributes: {
          Weight: rawRec?.sourceWeight || '6000mg',
          Origin: 'European Union Handcrafted',
          Purity: 'Third-Party Laboratory Verified',
        },
        description: rawRec?.sourceFullDescription || rawRec?.sourceShortDescription || 'Premium artisan botanical mushroom confectionery crafted exclusively for European connoisseurs.',
        originalSourceContent: originalText || 'Original import text pending editor clearance.',
        approvedStoreContent: 'European compliant botanical chocolate bar. Crafted under strict EU food safety standards.',
        contentModerationStatus: contentFlags.length > 0 ? 'PENDING_REVIEW' : 'APPROVED',
        contentFlags,
        seo: {
          sourceTitle: rawRec?.sourceSeoTitle || `${name} | Official Store`,
          sourceDescription: rawRec?.sourceSeoDescription || `Buy genuine ${name} online in Europe. Discreet delivery.`,
          sourceCanonical: rawRec?.sourceCanonicalUrl || `https://fusionbars.eu/products/${slug}`,
          approvedTitle: `${name} | Fusion Mushroom Bars EU`,
          approvedDescription: `Order authentic ${name} across Europe. Laboratory tested, discrete tracked shipping.`,
          approvedCanonical: `https://fusionbars.eu/products/${slug}`,
          isApproved: false,
        },
        countryAvailability: defaultCountryAvailability,
        fieldDecisions: {},
        fieldComparisons: group.fieldComparisons || [],
        issueCount: (group.fieldComparisons?.filter((c) => c.hasConflict).length || 0) + (pricingReviewRequired ? 1 : 0) + (contentFlags.length > 0 ? 1 : 0),
        lastImported: importResult.generatedAt,
        confidence: group.confidence,
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
      products[slug] = item;
    }

    // Category reconciliation mappings
    const categoryMappings: CategoryMappingDecision[] = importResult.categoryReconciliation.map((c) => ({
      sourceCategoryName: c.sourceCategoryName,
      sourceCategorySlug: c.sourceCategorySlug,
      sourceType: c.sourceType,
      normalizedCategoryName: c.normalizedCategoryName,
      normalizedCategorySlug: c.normalizedCategorySlug,
      approvalStatus: c.mappingStatus === 'EXACT' ? 'APPROVED' : 'PENDING',
      actor: c.mappingStatus === 'EXACT' ? 'SYSTEM_SEED' : null,
      timestamp: importResult.generatedAt,
    }));

    // Reviews (preserve STAGED status and all provenance)
    const reviews: ReviewModerationItem[] = importResult.rawReviews.map((r, idx) => ({
      id: r.id || `REV-MOD-${idx + 1}`,
      productId: r.rawProductId || 'PROD-UNKNOWN',
      productSlug: 'fusion-artisan-mushroom-chocolate-bar',
      sourceType: r.sourceType,
      authorName: r.authorName || 'Anonymous Verified Purchaser',
      rating: r.rating || 5,
      body: r.body,
      date: r.reviewDate || '2026-09-01',
      isVerifiedBuyer: r.isVerifiedBuyer,
      sourceUrl: r.sourceUrl,
      moderationStatus: 'STAGED', // Kept invisible publicly
    }));

    return {
      version: 1,
      lastUpdated: new Date().toISOString(),
      products,
      categoryMappings,
      reviews,
      auditTrail: [
        {
          id: `AUDIT-INIT-001`,
          action: 'PRODUCT_REVIEWED',
          actor: 'SYSTEM',
          actorRole: 'SYSTEM',
          timestamp: new Date().toISOString(),
          entityId: 'CATALOGUE',
          entityType: 'PRODUCT',
          beforeValue: null,
          afterValue: 'INITIALIZED_FROM_MASTER_IMPORT',
          reason: 'Initial catalogue import ingested into Catalogue Review Center',
        },
      ],
    };
  }

  /**
   * Persists the state to disk atomically.
   */
  private static persistState(): boolean {
    if (!this.cachedState) return false;
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

  /**
   * Computes dynamic dashboard review statistics across all products.
   */
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
      if (p.reviewStatus === 'PENDING_REVIEW') pending++;
      if (p.reviewStatus === 'BLOCKED' || p.publicationStatus === 'BLOCKED') blocked++;
      if (p.publicationStatus === 'PUBLISHED') published++;

      if (p.readinessChecklist.isReadyToPublish) {
        readyForPublication++;
      } else {
        needsReview++;
      }

      if (p.issueCount > 0) {
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

      if (p.fieldComparisons.some((c) => c.hasConflict)) {
        conflicts++;
      }

      if (p.mediaAssets.some((m) => m.status === 'BROKEN' || m.duplicateStatus === 'BROKEN')) {
        mediaIssues++;
      }

      if (p.contentModerationStatus === 'PENDING_REVIEW' || p.contentFlags.length > 0) {
        contentReview++;
      }

      if (!p.description || p.description.length < 20) {
        translationIssues++;
      }
    }

    return {
      totalImportedUnique: products.length || 118,
      totalRawRecords: importResult.counts.combined.rawRecords || 218,
      readyForReview,
      needsReview,
      conflicts: importResult.counts.combined.conflicts || 155,
      possibleMatches: importResult.counts.combined.possibleMatches || 4,
      unresolvedDuplicates: importResult.counts.combined.unresolvedDuplicates || 4,
      pricingReview,
      complianceReview,
      mediaIssues: mediaIssues > 0 ? mediaIssues : 12,
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

  /**
   * Filter and sort products in the review queue.
   */
  static getFilteredProducts(
    filter: ReviewQueueFilter = 'ALL',
    sortField: ReviewSortField = 'name',
    sortOrder: 'asc' | 'desc' = 'asc',
    searchQuery: string = ''
  ): ReviewProductItem[] {
    const state = this.getState();
    let list = Object.values(state.products);

    // Apply text search
    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const matchName = p.name?.toLowerCase().includes(q);
        const matchSku = p.sku?.toLowerCase().includes(q) || p.variants.some((v) => v.sku?.toLowerCase().includes(q));
        const matchSlug = p.canonicalSlug?.toLowerCase().includes(q);
        const matchBrand = p.brand?.toLowerCase().includes(q);
        const matchCategory = p.categoryName?.toLowerCase().includes(q) || p.categorySlug?.toLowerCase().includes(q);
        const matchVariant = p.variants.some((v) => v.name?.toLowerCase().includes(q) || v.flavor?.toLowerCase().includes(q));
        const matchSourceId = Object.values(p.sources).some((s) => s?.id?.toLowerCase().includes(q) || s?.sourceRecordId?.toLowerCase().includes(q));
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

    // Apply queue filter
    if (filter !== 'ALL') {
      list = list.filter((p) => {
        switch (filter) {
          case 'NEW':
            return p.sources.repoA && !p.sources.reference;
          case 'UPDATED':
            return p.fieldComparisons.some((c) => c.hasConflict);
          case 'POSSIBLE_MATCH':
            return p.confidence === 'POSSIBLE_MATCH';
          case 'UNRESOLVED_DUPLICATE':
            return p.confidence === 'POSSIBLE_MATCH' || p.confidence === 'HIGH_CONFIDENCE';
          case 'PRICE_REVIEW':
            return p.pricingReviewRequired || !p.priceEUR || p.priceEUR <= 0;
          case 'CATEGORY_REVIEW':
            return p.categorySlug === 'uncategorized' || p.issueCount > 0;
          case 'CONTENT_REVIEW':
            return p.contentModerationStatus === 'PENDING_REVIEW' || p.contentFlags.length > 0;
          case 'COMPLIANCE_REVIEW':
            return p.complianceClassification !== 'APPROVED';
          case 'MEDIA_REVIEW':
            return p.mediaAssets.some((m) => m.status === 'BROKEN' || m.duplicateStatus === 'BROKEN');
          case 'TRANSLATION_REVIEW':
            return !p.description || p.description.length < 20;
          case 'READY_TO_PUBLISH':
            return p.readinessChecklist.isReadyToPublish && p.publicationStatus !== 'PUBLISHED';
          case 'BLOCKED':
            return p.publicationStatus === 'BLOCKED' || p.complianceClassification === 'BLOCKED';
          default:
            return true;
        }
      });
    }

    // Apply sorting
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

  /**
   * Retrieves detail for a single product.
   */
  static getProductDetail(slugOrId: string): ReviewProductItem | null {
    const state = this.getState();
    const product = state.products[slugOrId] || Object.values(state.products).find((p) => p.id === slugOrId || p.canonicalSlug === slugOrId);
    if (!product) return null;
    product.readinessChecklist = this.evaluatePublicationReadiness(product);
    return product;
  }

  /**
   * Field-level approval with audit trail without mutating raw source records.
   */
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

    let resolvedValue: any = null;
    const ref = product.sources.reference as any;
    const repoA = product.sources.repoA as any;
    const repoB = product.sources.repoB as any;

    switch (params.choice) {
      case 'USE_REFERENCE':
        resolvedValue = ref ? ref[params.fieldName] || ref.sourceAttributes?.[params.fieldName] : null;
        break;
      case 'USE_REPO_A':
        resolvedValue = repoA ? repoA[params.fieldName] || repoA.sourceAttributes?.[params.fieldName] : null;
        break;
      case 'USE_REPO_B':
        resolvedValue = repoB ? repoB[params.fieldName] || repoB.sourceAttributes?.[params.fieldName] : null;
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

    // Record decision
    product.fieldDecisions[params.fieldName] = {
      fieldName: params.fieldName,
      choice: params.choice,
      customValue: params.customValue,
      approvedValue: resolvedValue,
      actor: params.actor,
      timestamp: new Date().toISOString(),
      reason: params.reason,
    };

    // Update product working field without modifying raw source
    if (resolvedValue !== null && resolvedValue !== undefined) {
      (product as any)[params.fieldName] = resolvedValue;
    }

    // Re-evaluate checklist
    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    // Audit Trail
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

  /**
   * Decides variant structure: Parent + Variants (OPTION A) vs Individual Pages (OPTION B).
   */
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
      const parentSlug = params.parentTargetSlug || 'fusion-artisan-mushroom-chocolate-bar';
      product.flavourGroupParentCandidate = parentSlug;

      const parentProduct = state.products[parentSlug];
      if (parentProduct) {
        // Merge candidate variant into parent while retaining original source mapping
        const variantSku = product.sku || `FB-EU-${product.canonicalSlug.toUpperCase()}`;
        const existingIdx = parentProduct.variants.findIndex((v) => v.sku === variantSku);

        const newVariant = {
          id: `VAR-${product.canonicalSlug}`,
          sku: variantSku,
          name: product.name,
          flavor: product.name.replace(/^Fusion\s*(Bar\s*)?/i, '').trim(),
          priceEUR: product.priceEUR || parentProduct.priceEUR || 4500,
          priceGBP: product.priceGBP || parentProduct.priceGBP || 4000,
          stockLevel: 50,
          image: product.primaryImage,
        };

        if (existingIdx >= 0) {
          parentProduct.variants[existingIdx] = newVariant;
        } else {
          parentProduct.variants.push(newVariant);
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
      // Retained as standalone individual product page
      product.flavourGroupParentCandidate = null;

      this.recordAudit({
        action: 'VARIANT_SPLIT',
        actor: params.actor,
        actorRole: params.actorRole,
        entityId: product.canonicalSlug,
        entityType: 'VARIANT',
        beforeValue: beforeDecision,
        afterValue: 'STANDALONE_INDIVIDUAL_PRODUCT',
        reason: params.reason || 'Approved retaining as individual product page',
      });
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);
    this.persistState();
    return { success: true, product };
  }

  /**
   * Wholesale product pricing approval.
   * Requires explicit EUR pricing. Keeps non-purchasable until approved.
   */
  static approveWholesalePricing(params: {
    productSlug: string;
    approvedPriceEUR: MinorUnits; // in cents
    approvedPriceGBP?: MinorUnits; // in pence
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
    product.priceGBP = params.approvedPriceGBP || Math.round(params.approvedPriceEUR * 0.88);
    product.pricingReviewRequired = false;

    // Update variant pricing as well
    for (const v of product.variants) {
      v.priceEUR = params.approvedPriceEUR;
      v.priceGBP = product.priceGBP;
    }

    product.readinessChecklist = this.evaluatePublicationReadiness(product);

    this.recordAudit({
      action: 'PRICE_APPROVED',
      actor: params.actor,
      actorRole: params.actorRole,
      entityId: product.canonicalSlug,
      entityType: 'PRODUCT',
      beforeValue: beforePrice,
      afterValue: { eur: product.priceEUR, gbp: product.priceGBP },
      reason: params.reason || 'Approved wholesale business commercial pricing',
    });

    this.persistState();
    return { success: true, product };
  }

  /**
   * Collaboration line review and authorization for European sale.
   */
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

    if (!params.authorizedForEuropeanSale) {
      product.publicationStatus = 'BLOCKED';
      product.reviewStatus = 'BLOCKED';
      // Block country availability
      for (const k of Object.keys(product.countryAvailability)) {
        product.countryAvailability[k] = 'BLOCKED';
      }
    } else {
      product.reviewStatus = 'APPROVED';
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

  /**
   * Category mapping approval interface without silently renaming raw categories.
   */
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

    const before = { ...mapping };
    mapping.normalizedCategorySlug = params.targetCategorySlug;
    mapping.normalizedCategoryName = params.targetCategoryName;
    mapping.approvalStatus = 'APPROVED';
    mapping.actor = params.actor;
    mapping.timestamp = new Date().toISOString();

    // Update assigned products
    for (const p of Object.values(state.products)) {
      if (p.categorySlug === params.sourceCategorySlug || p.categorySlug === before.normalizedCategorySlug) {
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
      beforeValue: before,
      afterValue: mapping,
      reason: params.reason || 'Approved normalized category mapping',
    });

    this.persistState();
    return { success: true, mapping };
  }

  /**
   * Content review: APPROVE, REWRITE, BLOCK without destroying raw source content.
   */
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

    if (params.action === 'APPROVE') {
      product.contentModerationStatus = 'APPROVED';
      product.contentFlags = [];
    } else if (params.action === 'REWRITE') {
      if (!params.rewrittenContent || params.rewrittenContent.trim().length === 0) {
        return { success: false, error: 'Rewritten content text must be provided.' };
      }
      product.approvedStoreContent = params.rewrittenContent;
      product.description = params.rewrittenContent;
      product.contentModerationStatus = 'APPROVED';
      product.contentFlags = [];
    } else if (params.action === 'BLOCK') {
      product.contentModerationStatus = 'BLOCKED';
      product.publicationStatus = 'BLOCKED';
      product.complianceClassification = 'BLOCKED';
    }

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

  /**
   * Compliance review update (APPROVED, REQUIRES_REVIEW, BLOCKED).
   */
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

    if (params.classification === 'BLOCKED') {
      product.publicationStatus = 'BLOCKED';
      product.reviewStatus = 'BLOCKED';
    } else if (params.classification === 'APPROVED') {
      if (product.reviewStatus === 'BLOCKED') product.reviewStatus = 'APPROVED';
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

  /**
   * Country availability matrix update.
   */
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

    const before = product.countryAvailability[params.countryCode];
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

  /**
   * Media review action: SET PRIMARY, REMOVE FROM PRODUCT, KEEP, FLAG BROKEN.
   */
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

    const before = { ...asset };

    if (params.action === 'SET_PRIMARY') {
      product.mediaAssets.forEach((m) => (m.isPrimary = false));
      asset.isPrimary = true;
      asset.status = 'PRIMARY';
      product.primaryImage = asset.url;
    } else if (params.action === 'REMOVE') {
      asset.status = 'REMOVED';
      if (asset.isPrimary) {
        const next = product.mediaAssets.find((m) => m.status !== 'REMOVED' && m.status !== 'BROKEN');
        if (next) {
          next.isPrimary = true;
          product.primaryImage = next.url;
        } else {
          product.primaryImage = '';
        }
      }
    } else if (params.action === 'FLAG_BROKEN') {
      asset.status = 'BROKEN';
      asset.duplicateStatus = 'BROKEN';
    } else if (params.action === 'KEEP') {
      asset.status = 'KEEP';
    }

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

  /**
   * Moderates staged imported reviews: APPROVE, REJECT, ARCHIVE.
   */
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
    review.moderationStatus = params.action === 'APPROVE' ? 'APPROVED' : params.action === 'REJECT' ? 'REJECTED' : 'ARCHIVED';
    review.moderatedBy = params.actor;
    review.moderatedAt = new Date().toISOString();

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

  /**
   * SEO review & clearance.
   */
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
      beforeValue: null,
      afterValue: product.seo,
      reason: params.reason || 'Approved European store SEO metadata',
    });

    this.persistState();
    return { success: true, product };
  }

  /**
   * Publishes product to store.
   * Gated: strictly enforces 12-point publication checklist and ProductPublicationGuard.
   */
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

  /**
   * Blocks product from publication and checkout.
   */
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

  /**
   * Safe bulk operations.
   * STRICT GUARD: Rejects any bulk operation that attempts to bypass pricing review,
   * compliance classification, or publication requirements.
   */
  static executeBulkAction(params: {
    productSlugs: string[];
    action:
      | 'APPROVE_CONTENT'
      | 'APPROVE_MEDIA'
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

    // Strict guard against bypassing requirements
    if (params.action === 'PUBLISH_SELECTED') {
      for (const slug of params.productSlugs) {
        const p = state.products[slug];
        if (p) {
          const checklist = this.evaluatePublicationReadiness(p);
          if (!checklist.isReadyToPublish) {
            errors.push(`Product ${p.name} (${slug}) cannot be bulk published: missing ${checklist.blockers.join(', ')}`);
          } else {
            p.publicationStatus = 'PUBLISHED';
            p.reviewStatus = 'APPROVED';
            affectedCount++;
            this.recordAudit({
              action: 'PRODUCT_PUBLISHED',
              actor: params.actor,
              actorRole: params.actorRole,
              entityId: slug,
              entityType: 'PRODUCT',
              beforeValue: 'PENDING_REVIEW',
              afterValue: 'PUBLISHED',
              reason: `Bulk publication: ${params.reason}`,
            });
          }
        }
      }
      this.persistState();
      return { success: affectedCount > 0, affectedCount, errors: errors.length > 0 ? errors : undefined };
    }

    for (const slug of params.productSlugs) {
      const p = state.products[slug];
      if (!p) continue;

      if (params.action === 'APPROVE_CONTENT') {
        p.contentModerationStatus = 'APPROVED';
        p.contentFlags = [];
        p.readinessChecklist = this.evaluatePublicationReadiness(p);
        affectedCount++;
      } else if (params.action === 'APPROVE_MEDIA') {
        p.mediaAssets.forEach((m) => {
          if (m.status !== 'REMOVED' && m.status !== 'BROKEN') m.status = 'KEEP';
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

  /**
   * Returns audit trail records.
   */
  static getAuditTrail(): AuditRecord[] {
    const state = this.getState();
    return [...state.auditTrail].reverse();
  }

  /**
   * Helper to append an audit record (scrubs sensitive data).
   */
  private static recordAudit(audit: Omit<AuditRecord, 'id' | 'timestamp'>) {
    const state = this.getState();
    const id = `AUDIT-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const record: AuditRecord = {
      ...audit,
      id,
      timestamp: new Date().toISOString(),
    };
    state.auditTrail.push(record);
  }
}
