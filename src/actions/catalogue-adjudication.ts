'use server';

import {
  CatalogueAdjudicationService,
  AdjudicationQueue,
  TranslationLocaleStatus,
} from '@/domain/catalog/CatalogueAdjudicationService';
import { ComplianceClassification, CountryAvailabilityStatus, LocaleCode, MinorUnits, RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';

const AUTHORIZED_ROLES: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];

function assertAuthorized(role?: RoleName) {
  if (!role || !AUTHORIZED_ROLES.includes(role)) {
    throw new Error(`Unauthorized. Role '${role || 'ANONYMOUS'}' cannot access Catalogue Adjudication.`);
  }
  if (!RBACService.hasPermission(role, 'catalog:review') && !RBACService.hasPermission(role, '*')) {
    throw new Error(`Unauthorized. Role '${role}' lacks catalog:review.`);
  }
}

export async function getAdjudicationDashboardAction(role: RoleName = 'SUPER_ADMIN') {
  try {
    assertAuthorized(role);
    return {
      success: true,
      dashboard: CatalogueAdjudicationService.getDashboard(),
      flavourGroups: CatalogueAdjudicationService.getFlavourGroups(),
      matchGroups: CatalogueAdjudicationService.getMatchGroups(),
      categoryMappings: CatalogueAdjudicationService.getCategoryMappings(),
      reviews: CatalogueAdjudicationService.getReviews(),
      europeanCountries: CatalogueAdjudicationService.getEuropeanCountries(),
      report: CatalogueAdjudicationService.getOperatorReport(),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getAdjudicationBatchAction(params: {
  queue: AdjudicationQueue;
  size?: number;
  role?: RoleName;
}) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return { success: true, batch: CatalogueAdjudicationService.getBatch(params.queue, params.size) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setAdjudicationBatchSizeAction(params: { size: number; role?: RoleName }) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return { success: true, batchSize: CatalogueAdjudicationService.setBatchSize(params.size) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function advanceAdjudicationBatchAction(params: { queue: AdjudicationQueue; role?: RoleName }) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return { success: true, offset: CatalogueAdjudicationService.advanceBatch(params.queue) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function assignAdjudicationReviewerAction(params: {
  productSlug: string;
  role: RoleName;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.assignReviewer(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveAdjudicationDraftAction(params: {
  recordId: string;
  draft: any;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.saveDraft(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicatePossibleMatchAction(params: {
  groupId: string;
  decision: 'MERGE' | 'KEEP_SEPARATE' | 'DEFER';
  reason?: string;
  confirmMerge?: boolean;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicatePossibleMatch(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateFieldConflictAction(params: {
  productSlug: string;
  fieldName: string;
  choice: 'USE_REFERENCE' | 'USE_REPO_A' | 'USE_REPO_B' | 'KEEP_CURRENT_EU' | 'CUSTOM_VALUE' | 'DEFER';
  customValue?: string;
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateFieldConflict(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateFlavourGroupAction(params: {
  groupId: string;
  decision: 'MERGE_INTO_VARIANTS' | 'KEEP_AS_SEPARATE_PRODUCTS' | 'DEFER';
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateFlavourGroup(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicatePricingAction(params: {
  productSlug: string;
  decision: 'APPROVE_EXISTING_EU_PRICE' | 'SET_EUR_PRICE' | 'SET_GBP_PRICE' | 'MARK_PRICING_UNRESOLVED' | 'DEFER';
  priceEUR?: MinorUnits;
  priceGBP?: MinorUnits;
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicatePricing(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateComplianceAction(params: {
  productSlug: string;
  classification: ComplianceClassification | 'DEFER';
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateCompliance(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateCountryAction(params: {
  productSlug: string;
  countryCode: string;
  status: CountryAvailabilityStatus;
  reason?: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateCountry(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateContentAction(params: {
  productSlug: string;
  action: 'APPROVE' | 'REWRITE' | 'BLOCK' | 'DEFER';
  rewrittenContent?: string;
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateContent(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateMediaAction(params: {
  productSlug: string;
  mediaId: string;
  action: 'SET_PRIMARY' | 'KEEP' | 'REJECT' | 'MARK_MISSING' | 'DEFER';
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateMedia(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveTranslationDraftAction(params: {
  productSlug: string;
  locale: Exclude<LocaleCode, 'en'>;
  value: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.saveTranslationDraft(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveTranslationAction(params: {
  productSlug: string;
  locale: Exclude<LocaleCode, 'en'>;
  actor: string;
  actorRole: RoleName;
  reason: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.approveTranslation(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateCategoryAction(params: {
  sourceCategorySlug: string;
  action: 'APPROVE' | 'CHANGE_TARGET' | 'CREATE_NEW_CATEGORY' | 'DEFER';
  targetCategorySlug?: string;
  targetCategoryName?: string;
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateCategory(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function adjudicateImportedReviewAction(params: {
  reviewId: string;
  action: 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'DEFER';
  reason: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.adjudicateImportedReview(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markReadyForPublicationAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.markReadyForPublication(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function publishFinalAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.publishFinal(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPublicationPreviewAction(params: {
  productSlug: string;
  locale?: LocaleCode;
  currency?: 'EUR' | 'GBP';
  countryCode?: string;
  role?: RoleName;
}) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return { success: true, preview: CatalogueAdjudicationService.getPreview(params) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function executeSafeBulkAdjudicationAction(params: {
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
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueAdjudicationService.executeSafeBulk(params);
  } catch (err: any) {
    return { success: false, affectedCount: 0, errors: [err.message] };
  }
}

export async function getAdjudicationAuditAction(role: RoleName = 'SUPER_ADMIN') {
  try {
    assertAuthorized(role);
    return { success: true, auditTrail: CatalogueAdjudicationService.getAuditTrail() };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
