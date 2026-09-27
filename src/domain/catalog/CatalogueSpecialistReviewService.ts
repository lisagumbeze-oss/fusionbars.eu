// Specialist review for the first adjudication batch.
// Organises human decisions. Does not invent prices, legality, translations, or publication.

import { RoleName } from '@/types';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { CatalogueReviewService } from '@/domain/catalog/CatalogueReviewService';
import { CatalogueAdjudicationService } from '@/domain/catalog/CatalogueAdjudicationService';
import { CatalogueFirstBatchService, TRANSLATION_LOCALES } from '@/domain/catalog/CatalogueFirstBatchService';
import { RBACService } from '@/domain/auth/RBACService';

function getFs(): any {
  try {
    if (typeof window === 'undefined') return eval('require')('fs');
  } catch {}
  return null;
}
function getPath(): any {
  try {
    if (typeof window === 'undefined') return eval('require')('path');
  } catch {}
  return null;
}
function cloneJson<T>(value: T): T {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

const CLAIM_PATTERN =
  /\b(treat|cure|heal|medicine|therapeutic|dosage|dose|microdose|psychoactive|psilocybin|clinical|certified|lab[- ]tested|allergen|boost immune)\b/i;

export const SPECIALIST_ACCESS_ROLES: RoleName[] = [
  'SUPER_ADMIN',
  'CATALOG_MANAGER',
  'COMPLIANCE_MANAGER',
  'CONTENT_MANAGER',
  'FINANCE_MANAGER',
];

export type PricingDecisionState =
  | 'PRICE_REVIEW_PENDING'
  | 'PRICE_APPROVED'
  | 'PRICE_REJECTED'
  | 'PRICE_DEFERRED'
  | 'PRICE_NOT_APPLICABLE';

export type ComplianceDecisionState =
  | 'COMPLIANCE_PENDING'
  | 'REQUIRES_REVIEW'
  | 'APPROVED_FOR_PUBLICATION'
  | 'APPROVED_WITH_RESTRICTIONS'
  | 'REJECTED'
  | 'DEFERRED'
  | 'DO_NOT_PUBLISH';

export type CountryDecisionState = 'NOT_CONFIGURED' | 'REVIEW_PENDING' | 'ALLOWED' | 'RESTRICTED' | 'BLOCKED' | 'DEFERRED';

export type ContentDecisionState =
  | 'CONTENT_PENDING'
  | 'INTERNAL_SOURCE_ONLY'
  | 'CONTENT_APPROVED'
  | 'CONTENT_APPROVED_WITH_RESTRICTIONS'
  | 'CONTENT_REJECTED'
  | 'CONTENT_DEFERRED'
  | 'DO_NOT_PUBLISH';

export type TranslationSlotState = 'PENDING' | 'DRAFTED' | 'APPROVED' | 'REJECTED' | 'DEFERRED';

export type PublicationGateState = 'NOT_READY' | 'READY_FOR_PUBLICATION' | 'DO_NOT_PUBLISH';

export interface SpecialistAudit {
  id: string;
  actor: string;
  actorRole: RoleName;
  timestamp: string;
  product: string;
  section: string;
  decision: string;
  beforeValue: any;
  afterValue: any;
  reason: string;
}

export interface CountryDecision {
  country: string;
  decision: CountryDecisionState;
  effectiveDate?: string;
  rationale: string;
  evidence: string;
  reviewer: string;
  timestamp: string;
}

export interface SpecialistProductReview {
  productSlug: string;
  reviewer: string | null;
  updatedAt: string | null;
  pricing: {
    state: PricingDecisionState;
    approvedCurrency?: string;
    approvedPrice?: number;
    rationale?: string;
    evidence?: string;
    reviewer?: string;
    timestamp?: string;
  };
  compliance: {
    state: ComplianceDecisionState;
    rationale?: string;
    evidence?: string;
    reviewer?: string;
    timestamp?: string;
    restrictions?: {
      permittedRegions?: string;
      prohibitedRegions?: string;
      contentRestrictions?: string;
      terminologyRestrictions?: string;
      internalNotes?: string;
    };
  };
  countries: CountryDecision[];
  content: {
    state: ContentDecisionState;
    candidatePublicContent: string;
    approvedPublicContent: string;
    reviewer?: string;
    timestamp?: string;
    restrictions?: string;
  };
  translations: Record<string, { state: TranslationSlotState; draft: string; reviewer?: string; timestamp?: string }>;
  media: { state: 'VERIFIED' | 'MEDIA_REVIEW'; reviewer?: string; timestamp?: string; note?: string };
  publication: PublicationGateState;
}

interface SpecialistState {
  version: number;
  products: Record<string, SpecialistProductReview>;
  auditTrail: SpecialistAudit[];
}

const EMPTY_TRANSLATIONS = () =>
  Object.fromEntries(TRANSLATION_LOCALES.map((locale) => [locale, { state: 'PENDING' as const, draft: '' }]));

export class CatalogueSpecialistReviewService {
  private static cached: SpecialistState | null = null;
  private static persistEnabled = true;
  private static readonly STATE_FILE = 'src/data/catalogue-specialist-review-state.json';

  static setPersistenceEnabled(enabled: boolean): void {
    this.persistEnabled = enabled;
  }

  static resetStateForTests(state?: SpecialistState): SpecialistState {
    this.persistEnabled = false;
    this.cached = state || { version: 1, products: {}, auditTrail: [] };
    return this.cached;
  }

  static getState(): SpecialistState {
    if (this.cached) return this.cached;
    const fs = getFs();
    const path = getPath();
    if (this.persistEnabled && fs && path) {
      const full = path.resolve(process.cwd(), this.STATE_FILE);
      if (fs.existsSync(full)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
          if (parsed?.version) {
            this.cached = parsed;
            return this.cached!;
          }
        } catch {}
      }
    }
    this.cached = { version: 1, products: {}, auditTrail: [] };
    return this.cached;
  }

  private static persist(): void {
    if (!this.cached || !this.persistEnabled) return;
    const fs = getFs();
    const path = getPath();
    if (!fs || !path) return;
    const full = path.resolve(process.cwd(), this.STATE_FILE);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, JSON.stringify(this.cached, null, 2));
  }

  static assertAccess(role?: RoleName): void {
    if (!role || role === 'CUSTOMER' || !SPECIALIST_ACCESS_ROLES.includes(role)) {
      throw new Error(`Unauthorized. Role '${role || 'ANONYMOUS'}' cannot access specialist review.`);
    }
    const allowed =
      RBACService.hasPermission(role, '*') ||
      RBACService.hasPermission(role, 'catalog:review') ||
      RBACService.hasPermission(role, 'finance:write') ||
      RBACService.hasPermission(role, 'compliance:write') ||
      RBACService.hasPermission(role, 'content:write');
    if (!allowed) throw new Error(`Unauthorized. Role '${role}' lacks specialist-review permission.`);
  }

  private static requireSectionRole(role: RoleName, section: 'pricing' | 'compliance' | 'country' | 'content' | 'translation' | 'media') {
    this.assertAccess(role);
    const ok =
      role === 'SUPER_ADMIN' ||
      (section === 'pricing' && role === 'FINANCE_MANAGER') ||
      ((section === 'compliance' || section === 'country') && role === 'COMPLIANCE_MANAGER') ||
      ((section === 'content' || section === 'translation') && role === 'CONTENT_MANAGER') ||
      (section === 'media' && (role === 'CATALOG_MANAGER' || role === 'CONTENT_MANAGER'));
    if (!ok) throw new Error(`Role ${role} cannot decide ${section}.`);
  }

  static firstBatchSlugs(): string[] {
    const existing = CatalogueFirstBatchService.getSelectedSlugs();
    if (existing.length) return existing.slice(0, 10);
    const selected = CatalogueFirstBatchService.selectFirstBatch({ size: 10 });
    return selected.selected.map((row) => row.productSlug).slice(0, 10);
  }

  private static blankReview(slug: string): SpecialistProductReview {
    const packet = CatalogueFirstBatchService.getReviewPacket(slug);
    const testRecord = Boolean(packet?.testRecord?.flagged);
    const mediaReview = packet?.media?.status === 'MEDIA_REVIEW' || testRecord;
    return {
      productSlug: slug,
      reviewer: null,
      updatedAt: null,
      pricing: { state: 'PRICE_REVIEW_PENDING' },
      compliance: { state: testRecord ? 'DO_NOT_PUBLISH' : 'REQUIRES_REVIEW' },
      countries: [],
      content: {
        state: 'INTERNAL_SOURCE_ONLY',
        candidatePublicContent: '',
        approvedPublicContent: '',
      },
      translations: EMPTY_TRANSLATIONS(),
      media: { state: mediaReview ? 'MEDIA_REVIEW' : 'VERIFIED' },
      publication: testRecord ? 'DO_NOT_PUBLISH' : 'NOT_READY',
    };
  }

  static getReview(slug: string): SpecialistProductReview {
    const state = this.getState();
    if (!state.products[slug]) state.products[slug] = this.blankReview(slug);
    return state.products[slug];
  }

  static listFirstBatch() {
    return this.firstBatchSlugs().map((slug) => {
      const product = CatalogueReviewService.getProductDetail(slug);
      const packet = CatalogueFirstBatchService.getReviewPacket(slug);
      const review = this.getReview(slug);
      const gate = this.evaluatePublication(slug);
      const unresolved = gate.blockers.length;
      return {
        productSlug: slug,
        productName: product?.name || slug,
        sourceIdentity: (product?.retainedSourceMappings || []).map((m) => m.sourceRecordId),
        dataStatus: packet?.batchProduct?.lastSummary?.statusBoard?.data || 'ADJUDICATED',
        imageStatus: review.media.state,
        pricingStatus: review.pricing.state,
        complianceStatus: review.compliance.state,
        countryStatus: review.countries.some((c) => c.decision === 'ALLOWED') ? 'CONFIGURED' : 'NOT_CONFIGURED',
        contentStatus: review.content.state,
        translationStatus: TRANSLATION_LOCALES.every((locale) => review.translations[locale]?.state === 'APPROVED')
          ? 'APPROVED'
          : 'PENDING',
        publicationStatus: gate.publication,
        unresolvedDecisionCount: unresolved,
        blockingDecisionCount: unresolved,
        reviewer: review.reviewer,
        updatedAt: review.updatedAt,
        testRecord: Boolean(packet?.testRecord?.flagged),
        relationship: packet?.relationshipHint?.relationship || null,
      };
    });
  }

  static getDetail(slug: string) {
    if (!this.firstBatchSlugs().includes(slug)) return null;
    const product = CatalogueReviewService.getProductDetail(slug);
    const packet = CatalogueFirstBatchService.getReviewPacket(slug);
    if (!product || !packet) return null;
    return {
      banner: 'FIRST BATCH — SPECIALIST REVIEW. Data adjudication is complete. Specialist decisions remain unresolved. Nothing is published automatically.',
      identity: {
        name: product.name,
        slug: product.canonicalSlug,
        sku: product.sku || null,
        category: product.categoryName,
        sourceRecordIds: product.retainedSourceMappings.map((m) => m.sourceRecordId),
        relationship: packet.relationshipHint,
        commercialDisposition: packet.testRecord?.flagged ? 'NON_COMMERCIAL_TEST_RECORD' : packet.batchProduct?.commercialDisposition || 'COMMERCIAL_CANDIDATE',
        readOnly: true,
      },
      sourcePrices: packet.pricing,
      internalSourceContent: product.originalSourceContent || '',
      approvedEuContent: product.approvedStoreContent || '',
      destinations: CountryRegistry.getActiveDestinations().map((c) => ({ code: c.code, name: c.name, category: c.category })),
      review: this.getReview(slug),
      publication: this.evaluatePublication(slug),
      adjudicationHref: `/admin/catalogue/review-workspace/first-batch`,
    };
  }

  private static audit(entry: Omit<SpecialistAudit, 'id' | 'timestamp'>) {
    this.getState().auditTrail.push({
      ...entry,
      id: `SR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
    });
  }

  private static guardCatalogue(slug: string, before: { name: string; priceEUR: number | null; mappings: string }) {
    const after = CatalogueReviewService.getProductDetail(slug);
    if (!after) throw new Error('Product missing.');
    if (after.name !== before.name) throw new Error('Specialist review must not change the confirmed product name.');
    if ((after.priceEUR ?? null) !== before.priceEUR) throw new Error('Specialist review must not write a catalogue EUR price.');
    if (JSON.stringify(after.retainedSourceMappings) !== before.mappings) {
      throw new Error('Specialist review must not change source identity.');
    }
  }

  private static snapshotProduct(slug: string) {
    const product = CatalogueReviewService.getProductDetail(slug);
    if (!product) throw new Error('Product not found.');
    return {
      name: product.name,
      priceEUR: product.priceEUR ?? null,
      mappings: JSON.stringify(product.retainedSourceMappings),
    };
  }

  static recordPricingDecision(params: {
    productSlug: string;
    state: PricingDecisionState;
    approvedCurrency?: string;
    approvedPrice?: number;
    rationale?: string;
    evidence?: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    const beforeCatalogue = this.snapshotProduct(params.productSlug);
    const snap = cloneJson(this.getState());
    try {
      this.requireSectionRole(params.actorRole, 'pricing');
      if (!this.firstBatchSlugs().includes(params.productSlug)) throw new Error('Product is outside the first batch.');
      const review = this.getReview(params.productSlug);
      if (params.state === 'PRICE_APPROVED') {
        if (!params.approvedCurrency || !['EUR', 'GBP', 'USD'].includes(params.approvedCurrency)) {
          throw new Error('PRICE_APPROVED requires an explicit currency. USD is not converted.');
        }
        if (params.approvedPrice == null || !(params.approvedPrice > 0)) {
          throw new Error('PRICE_APPROVED requires an explicit human-entered price.');
        }
        if (!params.rationale?.trim() || !params.evidence?.trim()) {
          throw new Error('PRICE_APPROVED requires rationale and evidence.');
        }
      }
      const before = cloneJson(review.pricing);
      review.pricing = {
        state: params.state,
        approvedCurrency: params.state === 'PRICE_APPROVED' ? params.approvedCurrency : undefined,
        approvedPrice: params.state === 'PRICE_APPROVED' ? params.approvedPrice : undefined,
        rationale: params.rationale,
        evidence: params.evidence,
        reviewer: params.actor,
        timestamp: new Date().toISOString(),
      };
      review.reviewer = params.actor;
      review.updatedAt = new Date().toISOString();
      review.publication = this.evaluatePublication(params.productSlug).publication;
      this.guardCatalogue(params.productSlug, beforeCatalogue);
      this.audit({
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        section: 'pricing',
        decision: params.state,
        beforeValue: before,
        afterValue: review.pricing,
        reason: params.rationale || params.state,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      this.cached = snap;
      return { success: false, error: err.message };
    }
  }

  static recordComplianceDecision(params: {
    productSlug: string;
    state: ComplianceDecisionState;
    rationale?: string;
    evidence?: string;
    restrictions?: SpecialistProductReview['compliance']['restrictions'];
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    const beforeCatalogue = this.snapshotProduct(params.productSlug);
    const snap = cloneJson(this.getState());
    try {
      this.requireSectionRole(params.actorRole, 'compliance');
      const review = this.getReview(params.productSlug);
      const packet = CatalogueFirstBatchService.getReviewPacket(params.productSlug);
      if (packet?.testRecord?.flagged && params.state !== 'DO_NOT_PUBLISH' && params.state !== 'REJECTED' && params.state !== 'DEFERRED') {
        throw new Error('NON_COMMERCIAL_TEST_RECORD cannot receive a publication approval.');
      }
      const approving = params.state === 'APPROVED_FOR_PUBLICATION' || params.state === 'APPROVED_WITH_RESTRICTIONS';
      if (approving && (!params.rationale?.trim() || !params.evidence?.trim())) {
        throw new Error('Compliance approval requires rationale and supporting evidence.');
      }
      if (params.state === 'APPROVED_WITH_RESTRICTIONS') {
        const filled = Object.values(params.restrictions || {}).some((v) => String(v || '').trim());
        if (!filled) throw new Error('Restrictions must be entered by the reviewer.');
      }
      if (params.state === 'DO_NOT_PUBLISH' && !params.rationale?.trim()) {
        throw new Error('DO_NOT_PUBLISH requires a reason.');
      }
      const before = cloneJson(review.compliance);
      review.compliance = {
        state: params.state,
        rationale: params.rationale,
        evidence: params.evidence,
        restrictions: params.restrictions,
        reviewer: params.actor,
        timestamp: new Date().toISOString(),
      };
      review.reviewer = params.actor;
      review.updatedAt = new Date().toISOString();
      review.publication = this.evaluatePublication(params.productSlug).publication;
      this.guardCatalogue(params.productSlug, beforeCatalogue);
      this.audit({
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        section: 'compliance',
        decision: params.state,
        beforeValue: before,
        afterValue: review.compliance,
        reason: params.rationale || params.state,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      this.cached = snap;
      return { success: false, error: err.message };
    }
  }

  static recordCountryDecision(params: {
    productSlug: string;
    country: string;
    decision: CountryDecisionState;
    effectiveDate?: string;
    rationale: string;
    evidence: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    const beforeCatalogue = this.snapshotProduct(params.productSlug);
    const countryBefore = JSON.stringify(CatalogueReviewService.getProductDetail(params.productSlug)?.countryAvailability || {});
    const snap = cloneJson(this.getState());
    try {
      this.requireSectionRole(params.actorRole, 'country');
      if (!CountryRegistry.isKnown(params.country)) throw new Error('Unknown country code.');
      if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('Country decision requires rationale and evidence.');
      if ((params.decision === 'ALLOWED' || params.decision === 'RESTRICTED') && !params.effectiveDate?.trim()) {
        throw new Error('ALLOWED and RESTRICTED require an effective date.');
      }
      const review = this.getReview(params.productSlug);
      const entry: CountryDecision = {
        country: params.country.toUpperCase(),
        decision: params.decision,
        effectiveDate: params.effectiveDate,
        rationale: params.rationale,
        evidence: params.evidence,
        reviewer: params.actor,
        timestamp: new Date().toISOString(),
      };
      review.countries = review.countries.filter((c) => c.country !== entry.country);
      review.countries.push(entry);
      review.reviewer = params.actor;
      review.updatedAt = entry.timestamp;
      review.publication = this.evaluatePublication(params.productSlug).publication;
      this.guardCatalogue(params.productSlug, beforeCatalogue);
      const countryAfter = JSON.stringify(CatalogueReviewService.getProductDetail(params.productSlug)?.countryAvailability || {});
      if (countryAfter !== countryBefore) throw new Error('Specialist review must not write catalogue country availability.');
      this.audit({
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        section: 'country',
        decision: `${entry.country}:${entry.decision}`,
        beforeValue: null,
        afterValue: entry,
        reason: params.rationale,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      this.cached = snap;
      return { success: false, error: err.message };
    }
  }

  static recordContentDecision(params: {
    productSlug: string;
    state: ContentDecisionState;
    candidatePublicContent?: string;
    restrictions?: string;
    actor: string;
    actorRole: RoleName;
    rationale?: string;
  }): { success: boolean; error?: string } {
    const beforeCatalogue = this.snapshotProduct(params.productSlug);
    const approvedBefore = CatalogueReviewService.getProductDetail(params.productSlug)?.approvedStoreContent || '';
    const snap = cloneJson(this.getState());
    try {
      this.requireSectionRole(params.actorRole, 'content');
      const review = this.getReview(params.productSlug);
      const source = CatalogueReviewService.getProductDetail(params.productSlug)?.originalSourceContent || '';
      const candidate = params.candidatePublicContent ?? review.content.candidatePublicContent;
      if ((params.state === 'CONTENT_APPROVED' || params.state === 'CONTENT_APPROVED_WITH_RESTRICTIONS') && !candidate.trim()) {
        throw new Error('Public content approval requires reviewer-authored candidate text.');
      }
      if (params.state === 'CONTENT_APPROVED' && candidate.trim() === source.trim() && source.trim()) {
        throw new Error('Raw source content cannot be approved as public content without an explicit public draft.');
      }
      if (params.state === 'CONTENT_APPROVED' && CLAIM_PATTERN.test(candidate)) {
        throw new Error('Claim-bearing text cannot be approved without restrictions.');
      }
      if (params.state === 'CONTENT_APPROVED_WITH_RESTRICTIONS' && !params.restrictions?.trim()) {
        throw new Error('Restricted content approval requires reviewer-entered restrictions.');
      }
      if (params.state === 'DO_NOT_PUBLISH' && !params.rationale?.trim()) throw new Error('DO_NOT_PUBLISH requires a reason.');
      review.content.candidatePublicContent = candidate;
      if (params.state === 'CONTENT_APPROVED' || params.state === 'CONTENT_APPROVED_WITH_RESTRICTIONS') {
        review.content.approvedPublicContent = candidate;
      }
      review.content.state = params.state;
      review.content.restrictions = params.restrictions;
      review.content.reviewer = params.actor;
      review.content.timestamp = new Date().toISOString();
      review.reviewer = params.actor;
      review.updatedAt = review.content.timestamp;
      review.publication = this.evaluatePublication(params.productSlug).publication;
      this.guardCatalogue(params.productSlug, beforeCatalogue);
      const approvedAfter = CatalogueReviewService.getProductDetail(params.productSlug)?.approvedStoreContent || '';
      if (approvedAfter !== approvedBefore) throw new Error('Specialist review must not write storefront content automatically.');
      this.audit({
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        section: 'content',
        decision: params.state,
        beforeValue: null,
        afterValue: { state: params.state, hasApproved: Boolean(review.content.approvedPublicContent) },
        reason: params.rationale || params.state,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      this.cached = snap;
      return { success: false, error: err.message };
    }
  }

  static recordTranslation(params: {
    productSlug: string;
    locale: string;
    state: TranslationSlotState;
    draft?: string;
    actor: string;
    actorRole: RoleName;
  }): { success: boolean; error?: string } {
    const snap = cloneJson(this.getState());
    try {
      this.requireSectionRole(params.actorRole, 'translation');
      if (!TRANSLATION_LOCALES.includes(params.locale as any)) throw new Error('Unsupported locale.');
      const review = this.getReview(params.productSlug);
      const slot = review.translations[params.locale] || { state: 'PENDING' as const, draft: '' };
      if (params.state === 'DRAFTED' || params.state === 'APPROVED') {
        const text = params.draft ?? slot.draft;
        if (!text?.trim()) throw new Error('Translation text must be entered by a reviewer. Nothing is auto-translated.');
        slot.draft = text;
      }
      if (params.state === 'APPROVED' && slot.state !== 'DRAFTED' && slot.state !== 'APPROVED') {
        throw new Error('A locale must be drafted before approval.');
      }
      slot.state = params.state;
      slot.reviewer = params.actor;
      slot.timestamp = new Date().toISOString();
      review.translations[params.locale] = slot;
      review.reviewer = params.actor;
      review.updatedAt = slot.timestamp;
      review.publication = this.evaluatePublication(params.productSlug).publication;
      this.audit({
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        section: 'translation',
        decision: `${params.locale}:${params.state}`,
        beforeValue: null,
        afterValue: { locale: params.locale, state: params.state },
        reason: 'Human translation slot decision',
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      this.cached = snap;
      return { success: false, error: err.message };
    }
  }

  static recordMediaReview(params: {
    productSlug: string;
    decision: 'RETAIN_MEDIA_REVIEW' | 'CONFIRM_EXISTING_VERIFIED';
    unrelatedImageUrl?: string;
    actor: string;
    actorRole: RoleName;
    reason: string;
  }): { success: boolean; error?: string } {
    const snap = cloneJson(this.getState());
    try {
      this.requireSectionRole(params.actorRole, 'media');
      if (params.unrelatedImageUrl) throw new Error('An unrelated image cannot satisfy media review.');
      const review = this.getReview(params.productSlug);
      const packet = CatalogueFirstBatchService.getReviewPacket(params.productSlug);
      if (params.decision === 'CONFIRM_EXISTING_VERIFIED') {
        if (packet?.media?.status === 'MEDIA_REVIEW' || packet?.testRecord?.flagged) {
          throw new Error('Placeholder or unverified media stays in MEDIA_REVIEW.');
        }
        review.media.state = 'VERIFIED';
      } else {
        review.media.state = 'MEDIA_REVIEW';
      }
      review.media.reviewer = params.actor;
      review.media.timestamp = new Date().toISOString();
      review.media.note = params.reason;
      review.reviewer = params.actor;
      review.updatedAt = review.media.timestamp;
      review.publication = this.evaluatePublication(params.productSlug).publication;
      this.audit({
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        section: 'media',
        decision: params.decision,
        beforeValue: null,
        afterValue: review.media.state,
        reason: params.reason,
      });
      this.persist();
      return { success: true };
    } catch (err: any) {
      this.cached = snap;
      return { success: false, error: err.message };
    }
  }

  static evaluatePublication(slug: string): { publication: PublicationGateState; ready: boolean; blockers: string[]; published: false } {
    const review = this.getReview(slug);
    const packet = CatalogueFirstBatchService.getReviewPacket(slug);
    const blockers: string[] = [];
    if (packet?.testRecord?.flagged) {
      return { publication: 'DO_NOT_PUBLISH', ready: false, blockers: ['NON_COMMERCIAL_TEST_RECORD'], published: false };
    }
    if (review.compliance.state === 'DO_NOT_PUBLISH' || review.content.state === 'DO_NOT_PUBLISH') {
      return { publication: 'DO_NOT_PUBLISH', ready: false, blockers: ['DO_NOT_PUBLISH'], published: false };
    }
    if (review.pricing.state !== 'PRICE_APPROVED' && review.pricing.state !== 'PRICE_NOT_APPLICABLE') blockers.push('Pricing pending');
    if (review.compliance.state !== 'APPROVED_FOR_PUBLICATION' && review.compliance.state !== 'APPROVED_WITH_RESTRICTIONS') {
      blockers.push('Compliance review required');
    }
    if (!review.countries.some((c) => c.decision === 'ALLOWED')) blockers.push('Country eligibility not configured');
    if (review.content.state !== 'CONTENT_APPROVED' && review.content.state !== 'CONTENT_APPROVED_WITH_RESTRICTIONS') {
      blockers.push('Public content not approved');
    }
    if (TRANSLATION_LOCALES.some((locale) => review.translations[locale]?.state !== 'APPROVED')) blockers.push('Translation pending');
    if (review.media.state !== 'VERIFIED') blockers.push('Media review required');
    const ready = blockers.length === 0;
    return { publication: ready ? 'READY_FOR_PUBLICATION' : 'NOT_READY', ready, blockers, published: false };
  }

  /** Records the gate result. Never publishes and never adds the product to the published catalogue. */
  static acknowledgePublicationGate(params: { productSlug: string; actor: string; actorRole: RoleName }): {
    success: boolean;
    error?: string;
    publication?: PublicationGateState;
    published: false;
  } {
    try {
      this.assertAccess(params.actorRole);
      const publishedBefore = CatalogueAdjudicationService.getState().published.length;
      const gate = this.evaluatePublication(params.productSlug);
      const review = this.getReview(params.productSlug);
      review.publication = gate.publication;
      review.updatedAt = new Date().toISOString();
      if (CatalogueAdjudicationService.getState().published.length !== publishedBefore) {
        throw new Error('Publication gate must not publish.');
      }
      this.audit({
        actor: params.actor,
        actorRole: params.actorRole,
        product: params.productSlug,
        section: 'publication',
        decision: gate.publication,
        beforeValue: null,
        afterValue: { blockers: gate.blockers, published: false },
        reason: 'Publication gate evaluated without publishing',
      });
      this.persist();
      return { success: true, publication: gate.publication, published: false };
    } catch (err: any) {
      return { success: false, error: err.message, published: false };
    }
  }

  static getAuditTrail(): SpecialistAudit[] {
    return [...this.getState().auditTrail].reverse();
  }
}
