'use server';

import {
  CatalogueDecisionRecommendationService,
  RecommendationReviewStatus,
  RecommendationPriority,
  RecommendationDecisionType,
  SafeBulkGroupKey,
} from '@/domain/catalog/CatalogueDecisionRecommendationService';
import { RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';

const AUTHORIZED_ROLES: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];

function assertAuthorized(role?: RoleName) {
  if (!role || !AUTHORIZED_ROLES.includes(role)) {
    throw new Error(`Unauthorized. Role '${role || 'ANONYMOUS'}' cannot access recommendation engine.`);
  }
  if (!RBACService.hasPermission(role, 'catalog:review') && !RBACService.hasPermission(role, '*')) {
    throw new Error(`Unauthorized. Role '${role}' lacks catalog:review.`);
  }
}

export async function generateRecommendationsAction(params: { actor: string; actorRole: RoleName }) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueDecisionRecommendationService.generateAll(params);
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

export async function getRecommendationDashboardAction(role: RoleName = 'SUPER_ADMIN') {
  try {
    assertAuthorized(role);
    const state = CatalogueDecisionRecommendationService.getState();
    if (!state.lastGeneratedAt || Object.keys(state.recommendations).length === 0) {
      CatalogueDecisionRecommendationService.generateAll();
    }
    return {
      success: true,
      dashboard: CatalogueDecisionRecommendationService.getDashboard(),
      report: CatalogueDecisionRecommendationService.getOperatorReport(),
      auditTrail: CatalogueDecisionRecommendationService.getAuditTrail().slice(0, 100),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getRecommendationsAction(params: {
  role?: RoleName;
  status?: RecommendationReviewStatus;
  priority?: RecommendationPriority;
  decisionType?: RecommendationDecisionType;
  bulkGroup?: SafeBulkGroupKey;
  productSlug?: string;
  limit?: number;
}) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return {
      success: true,
      recommendations: CatalogueDecisionRecommendationService.getRecommendations(params),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getRecommendationPreviewAction(params: { id: string; role?: RoleName }) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return {
      success: true,
      preview: CatalogueDecisionRecommendationService.getDecisionPreview(params.id),
      recommendation: CatalogueDecisionRecommendationService.getRecommendation(params.id),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getPublicationChecklistAction(params: { productSlug: string; role?: RoleName }) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return {
      success: true,
      checklist: CatalogueDecisionRecommendationService.getPublicationChecklist(params.productSlug),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function acceptRecommendationAction(params: {
  id: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
  confirm: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueDecisionRecommendationService.acceptRecommendation(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectRecommendationAction(params: {
  id: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueDecisionRecommendationService.rejectRecommendation(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deferRecommendationAction(params: {
  id: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueDecisionRecommendationService.deferRecommendation(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function editRecommendationAction(params: {
  id: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
  proposedValue?: any;
  proposedAction?: string;
  recommendation?: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueDecisionRecommendationService.editRecommendation(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
