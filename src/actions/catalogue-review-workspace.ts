'use server';

import {
  CatalogueReviewWorkspaceService,
  WorkspaceDecisionAction,
} from '@/domain/catalog/CatalogueReviewWorkspaceService';
import { RecommendationPriority } from '@/domain/catalog/CatalogueDecisionRecommendationService';
import { ComplianceClassification, CountryAvailabilityStatus, LocaleCode, MinorUnits, RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';

const AUTHORIZED_ROLES: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];

function assertAuthorized(role?: RoleName) {
  if (!role || !AUTHORIZED_ROLES.includes(role)) {
    throw new Error(`Unauthorized. Role '${role || 'ANONYMOUS'}' cannot access the review workspace.`);
  }
  if (!RBACService.hasPermission(role, 'catalog:review') && !RBACService.hasPermission(role, '*')) {
    throw new Error(`Unauthorized. Role '${role}' lacks catalog:review.`);
  }
}

export async function getReviewWorkspaceProgressAction(role: RoleName = 'SUPER_ADMIN') {
  try {
    assertAuthorized(role);
    return {
      success: true,
      progress: CatalogueReviewWorkspaceService.getProgress(),
      report: CatalogueReviewWorkspaceService.getOperatorReport(),
      queue: CatalogueReviewWorkspaceService.listProductsForQueue('P0').slice(0, 40),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function listReviewWorkspaceProductsAction(params: {
  role?: RoleName;
  priorityFilter?: RecommendationPriority | 'ALL';
}) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return {
      success: true,
      products: CatalogueReviewWorkspaceService.listProductsForQueue(params.priorityFilter || 'P0'),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function openProductReviewWorkspaceAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  priorityFilter?: RecommendationPriority | 'ALL';
  acquireLock?: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    let lockResult: any = null;
    if (params.acquireLock !== false) {
      lockResult = CatalogueReviewWorkspaceService.acquireLock({
        productSlug: params.productSlug,
        actor: params.actor,
        actorRole: params.actorRole,
      });
    }
    const workspace = CatalogueReviewWorkspaceService.getProductWorkspace(
      params.productSlug,
      params.priorityFilter || 'P0'
    );
    if (!workspace) return { success: false, error: 'Product not found.' };
    return {
      success: true,
      workspace,
      lock: lockResult,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function releaseProductReviewLockAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  force?: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.releaseLock(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function assignProductReviewerAction(params: {
  productSlug: string;
  role: RoleName;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.assignReviewer(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageRecommendationDecisionAction(params: {
  productSlug: string;
  recommendationId: string;
  action: WorkspaceDecisionAction;
  reason: string;
  editedValue?: any;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageRecommendationAction(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stagePricingDecisionAction(params: {
  productSlug: string;
  decision: 'APPROVE_CURRENT_EU_PRICE' | 'SET_EUR' | 'SET_GBP' | 'KEEP_UNRESOLVED' | 'DEFER';
  priceEUR?: MinorUnits;
  priceGBP?: MinorUnits;
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stagePricingDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageComplianceDecisionAction(params: {
  productSlug: string;
  classification: ComplianceClassification;
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageComplianceDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageCountryDecisionAction(params: {
  productSlug: string;
  countryCode: string;
  status: CountryAvailabilityStatus;
  reason?: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageCountryDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageContentDecisionAction(params: {
  productSlug: string;
  action: 'APPROVE' | 'REWRITE' | 'BLOCK' | 'DEFER';
  rewrittenContent?: string;
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageContentDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageVariantDecisionAction(params: {
  groupId: string;
  productSlug: string;
  decision: 'MERGE_AS_VARIANTS' | 'KEEP_SEPARATE' | 'DEFER';
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageVariantDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageMediaDecisionAction(params: {
  productSlug: string;
  mediaId: string;
  action: 'SET_PRIMARY' | 'KEEP' | 'REJECT' | 'MARK_MISSING';
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageMediaDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageTranslationDecisionAction(params: {
  productSlug: string;
  locale: Exclude<LocaleCode, 'en'>;
  value: string;
  approve: boolean;
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageTranslationDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageSeoDecisionAction(params: {
  productSlug: string;
  action: 'APPROVE' | 'EDIT' | 'DEFER';
  title?: string;
  description?: string;
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageSeoDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageReviewModerationAction(params: {
  productSlug: string;
  reviewId: string;
  action: 'APPROVE' | 'REJECT' | 'ARCHIVE' | 'DEFER';
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.stageReviewModeration(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveProductReviewAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason?: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.saveProductReview(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveAndNextProductReviewAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  priorityFilter?: RecommendationPriority | 'ALL';
  reason?: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewWorkspaceService.saveAndNext(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getWorkspacePublicationPreviewAction(params: {
  productSlug: string;
  locale?: LocaleCode;
  currency?: 'EUR' | 'GBP';
  countryCode?: string;
  role?: RoleName;
}) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return CatalogueReviewWorkspaceService.getPublicationPreview(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function exportProductDecisionAuditAction(params: {
  productSlug: string;
  role?: RoleName;
}) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return CatalogueReviewWorkspaceService.exportProductAudit(params.productSlug);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
