'use server';

import {
  CatalogueFirstBatchService,
  FirstBatchFieldKey,
  FirstBatchFieldAction,
  SpecialistQueue,
  FIRST_BATCH_SIZES,
  DEFAULT_FIRST_BATCH_SIZE,
} from '@/domain/catalog/CatalogueFirstBatchService';
import { RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';

const AUTHORIZED_ROLES: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];

function assertAuthorized(role?: RoleName) {
  if (!role || !AUTHORIZED_ROLES.includes(role)) {
    throw new Error(`Unauthorized. Role '${role || 'ANONYMOUS'}' cannot access first-batch review.`);
  }
  if (!RBACService.hasPermission(role, 'catalog:review') && !RBACService.hasPermission(role, '*')) {
    throw new Error(`Unauthorized. Role '${role}' lacks catalog:review.`);
  }
}

export async function selectFirstBatchAction(params: {
  size?: number;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.selectFirstBatch(params);
  } catch (err: any) {
    return { success: false, batchSize: 0, selected: [], excluded: [], error: err.message };
  }
}

export async function getFirstBatchDashboardAction(role: RoleName = 'SUPER_ADMIN') {
  try {
    assertAuthorized(role);
    const state = CatalogueFirstBatchService.getState();
    if (!state.selectedSlugs.length) {
      CatalogueFirstBatchService.selectFirstBatch({ size: state.batchSize || DEFAULT_FIRST_BATCH_SIZE });
    }
    return {
      success: true,
      report: CatalogueFirstBatchService.getOperatorReport(),
      selectedSlugs: CatalogueFirstBatchService.getSelectedSlugs(),
      batchSize: CatalogueFirstBatchService.getState().batchSize,
      batchSizes: FIRST_BATCH_SIZES,
      specialistQueues: CatalogueFirstBatchService.getSpecialistQueues(),
      auditTrail: CatalogueFirstBatchService.getAuditTrail().slice(0, 50),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getFirstBatchPacketAction(params: { productSlug: string; role?: RoleName }) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    const packet = CatalogueFirstBatchService.getReviewPacket(params.productSlug);
    if (!packet) return { success: false, error: 'Product not found.' };
    return { success: true, packet };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageFirstBatchFieldAction(params: {
  productSlug: string;
  field: FirstBatchFieldKey;
  action: FirstBatchFieldAction;
  sourceChoice?: 'REFERENCE' | 'REPO_A' | 'REPO_B';
  editedValue?: any;
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm?: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.stageFieldDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageFirstBatchMediaAction(params: {
  productSlug: string;
  mediaId: string;
  action: 'PRIMARY' | 'GALLERY' | 'REJECT';
  reason: string;
  actor: string;
  actorRole: RoleName;
  confirm?: boolean;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.stageMediaDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addFirstBatchNoteAction(params: {
  productSlug: string;
  text: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.addInternalNote(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveFirstBatchProductAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason?: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.saveProductReview(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function setFirstBatchSizeAction(params: { size: number; role?: RoleName }) {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return { success: true, batchSize: CatalogueFirstBatchService.setBatchSize(params.size) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function saveAndNextFirstBatchAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason?: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.saveAndNext(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function confirmAgreedFieldsAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason?: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.confirmAgreedFields(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function stageFirstBatchContentAction(params: {
  productSlug: string;
  disposition: 'PENDING' | 'KEEP_INTERNAL_SOURCE_ONLY' | 'REWRITE' | 'BLOCK';
  reason: string;
  actor: string;
  actorRole: RoleName;
  rewriteText?: string;
}) {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueFirstBatchService.stageContentDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export type { SpecialistQueue };
