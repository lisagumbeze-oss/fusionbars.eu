'use server';

import { RoleName } from '@/types';
import {
  CatalogueSpecialistReviewService,
  ComplianceDecisionState,
  ContentDecisionState,
  CountryDecisionState,
  PricingDecisionState,
  TranslationSlotState,
} from '@/domain/catalog/CatalogueSpecialistReviewService';

function guard(role?: RoleName) {
  CatalogueSpecialistReviewService.assertAccess(role);
}

export async function getSpecialistQueueAction(role: RoleName) {
  try {
    guard(role);
    return { success: true, products: CatalogueSpecialistReviewService.listFirstBatch() };
  } catch (err: any) {
    return { success: false, error: err.message, products: [] };
  }
}

export async function getSpecialistDetailAction(params: { productSlug: string; role: RoleName }) {
  try {
    guard(params.role);
    const detail = CatalogueSpecialistReviewService.getDetail(params.productSlug);
    if (!detail) return { success: false, error: 'Product is not in the first specialist batch.' };
    return { success: true, detail };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordSpecialistPricingAction(params: {
  productSlug: string;
  state: PricingDecisionState;
  approvedCurrency?: string;
  approvedPrice?: number;
  rationale?: string;
  evidence?: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    return CatalogueSpecialistReviewService.recordPricingDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordSpecialistComplianceAction(params: {
  productSlug: string;
  state: ComplianceDecisionState;
  rationale?: string;
  evidence?: string;
  restrictions?: {
    permittedRegions?: string;
    prohibitedRegions?: string;
    contentRestrictions?: string;
    terminologyRestrictions?: string;
    internalNotes?: string;
  };
  actor: string;
  actorRole: RoleName;
}) {
  try {
    return CatalogueSpecialistReviewService.recordComplianceDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordSpecialistCountryAction(params: {
  productSlug: string;
  country: string;
  decision: CountryDecisionState;
  effectiveDate?: string;
  rationale: string;
  evidence: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    return CatalogueSpecialistReviewService.recordCountryDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordSpecialistContentAction(params: {
  productSlug: string;
  state: ContentDecisionState;
  candidatePublicContent?: string;
  restrictions?: string;
  rationale?: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    return CatalogueSpecialistReviewService.recordContentDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordSpecialistTranslationAction(params: {
  productSlug: string;
  locale: string;
  state: TranslationSlotState;
  draft?: string;
  actor: string;
  actorRole: RoleName;
}) {
  try {
    return CatalogueSpecialistReviewService.recordTranslation(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function recordSpecialistMediaAction(params: {
  productSlug: string;
  decision: 'RETAIN_MEDIA_REVIEW' | 'CONFIRM_EXISTING_VERIFIED';
  unrelatedImageUrl?: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}) {
  try {
    return CatalogueSpecialistReviewService.recordMediaReview(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function acknowledgePublicationGateAction(params: { productSlug: string; actor: string; actorRole: RoleName }) {
  try {
    return CatalogueSpecialistReviewService.acknowledgePublicationGate(params);
  } catch (err: any) {
    return { success: false, error: err.message, published: false as const };
  }
}
