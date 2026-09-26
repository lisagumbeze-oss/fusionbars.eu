'use server';

import {
  CatalogueReviewService,
  ReviewQueueFilter,
  ReviewSortField,
  FieldApprovalChoice,
  VariantStructureOption,
  ContentModerationAction,
  ReviewDashboardStats,
  ReviewProductItem,
  CategoryMappingDecision,
  ReviewModerationItem,
  AuditRecord,
} from '@/domain/catalog/CatalogueReviewService';
import { ComplianceClassification, CountryAvailabilityStatus, MinorUnits, PurchaseEligibilityDecision, RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';

const AUTHORIZED_ROLES: RoleName[] = ['SUPER_ADMIN', 'CATALOG_MANAGER', 'CONTENT_MANAGER', 'COMPLIANCE_MANAGER'];

function assertAuthorized(role?: RoleName) {
  if (!role || !AUTHORIZED_ROLES.includes(role) || !RBACService.hasPermission(role, 'catalog:review')) {
    if (role && RBACService.hasPermission(role, '*')) return;
    throw new Error(`Unauthorized. Role '${role || 'ANONYMOUS'}' lacks permissions for Catalogue Review Center.`);
  }
}

export async function getCatalogueReviewDashboardAction(role: RoleName = 'SUPER_ADMIN'): Promise<{
  success: boolean;
  stats?: ReviewDashboardStats;
  categoryMappings?: CategoryMappingDecision[];
  reviews?: ReviewModerationItem[];
  error?: string;
}> {
  try {
    assertAuthorized(role);
    const stats = CatalogueReviewService.getDashboardStats();
    const state = CatalogueReviewService.getState();
    return {
      success: true,
      stats,
      categoryMappings: state.categoryMappings,
      reviews: state.reviews,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getFilteredReviewProductsAction(params: {
  filter?: ReviewQueueFilter;
  sortField?: ReviewSortField;
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
  role?: RoleName;
}): Promise<{
  success: boolean;
  products?: ReviewProductItem[];
  error?: string;
}> {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    const products = CatalogueReviewService.getFilteredProducts(
      params.filter || 'ALL',
      params.sortField || 'name',
      params.sortOrder || 'asc',
      params.searchQuery || ''
    );
    return { success: true, products };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getProductReviewDetailAction(params: {
  slugOrId: string;
  role?: RoleName;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    const product = CatalogueReviewService.getProductDetail(params.slugOrId);
    if (!product) return { success: false, error: `Product '${params.slugOrId}' not found.` };
    return { success: true, product };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveFieldDecisionAction(params: {
  productSlug: string;
  fieldName: string;
  choice: FieldApprovalChoice;
  customValue?: any;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.approveFieldDecision(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function decideVariantStructureAction(params: {
  productSlug: string;
  decision: VariantStructureOption;
  parentTargetSlug?: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.decideVariantStructure(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveWholesalePricingAction(params: {
  productSlug: string;
  approvedPriceEUR: MinorUnits;
  approvedPriceGBP?: MinorUnits;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.approveWholesalePricing(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveCollaborationAction(params: {
  productSlug: string;
  authorizedForEuropeanSale: boolean;
  complianceClassification: ComplianceClassification;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.approveCollaboration(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveCategoryMappingAction(params: {
  sourceCategorySlug: string;
  targetCategorySlug: string;
  targetCategoryName: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  mapping?: CategoryMappingDecision;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.approveCategoryMapping(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function moderateContentAction(params: {
  productSlug: string;
  action: ContentModerationAction;
  rewrittenContent?: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.moderateContent(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateComplianceClassificationAction(params: {
  productSlug: string;
  classification: ComplianceClassification;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.updateComplianceClassification(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateCountryAvailabilityAction(params: {
  productSlug: string;
  countryCode: string;
  status: CountryAvailabilityStatus;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.updateCountryAvailability(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function moderateMediaAction(params: {
  productSlug: string;
  mediaId: string;
  action: 'SET_PRIMARY' | 'REMOVE' | 'KEEP' | 'FLAG_BROKEN';
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.moderateMedia(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function moderateReviewAction(params: {
  reviewId: string;
  action: 'APPROVE' | 'REJECT' | 'ARCHIVE';
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  review?: ReviewModerationItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.moderateReview(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function approveSeoAction(params: {
  productSlug: string;
  approvedTitle: string;
  approvedDescription: string;
  approvedCanonical?: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.approveSeo(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function publishProductAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.publishProduct(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function blockProductAction(params: {
  productSlug: string;
  actor: string;
  actorRole: RoleName;
  reason: string;
}): Promise<{
  success: boolean;
  product?: ReviewProductItem;
  error?: string;
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.blockProduct(params);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function executeBulkReviewAction(params: {
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
}): Promise<{
  success: boolean;
  affectedCount: number;
  errors?: string[];
}> {
  try {
    assertAuthorized(params.actorRole);
    return CatalogueReviewService.executeBulkAction(params);
  } catch (err: any) {
    return { success: false, affectedCount: 0, errors: [err.message] };
  }
}

export async function getAuditTrailAction(role: RoleName = 'SUPER_ADMIN'): Promise<{
  success: boolean;
  auditTrail?: AuditRecord[];
  error?: string;
}> {
  try {
    assertAuthorized(role);
    return { success: true, auditTrail: CatalogueReviewService.getAuditTrail() };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function evaluateReviewPurchaseEligibilityAction(params: {
  productSlug: string;
  countryCode: string;
  role?: RoleName;
}): Promise<{
  success: boolean;
  decision?: PurchaseEligibilityDecision;
  error?: string;
}> {
  try {
    assertAuthorized(params.role || 'SUPER_ADMIN');
    return {
      success: true,
      decision: CatalogueReviewService.evaluatePurchaseEligibility(params.productSlug, params.countryCode),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
