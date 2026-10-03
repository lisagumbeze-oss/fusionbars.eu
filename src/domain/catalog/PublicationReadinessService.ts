// Authoritative publication readiness and controlled publish/unpublish.
// Reads specialist decisions. Does not create pricing, compliance, country, content, translation, or media decisions.

import type { RoleName } from '@/types';
import type { SpecialistProductReview } from '@/domain/catalog/CatalogueSpecialistReviewService';
import { RBACService } from '@/domain/auth/RBACService';
import specialistSeed from '@/data/catalogue-specialist-review-state.json';
import firstBatchSeed from '@/data/catalogue-first-batch-state.json';
import catalogueData from '@/data/consolidated-catalogue.json';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';

export const REQUIRED_PUBLICATION_LOCALES = ['en', 'de', 'fr', 'es', 'it', 'nl'] as const;

const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  nl: 'Dutch',
};

export type PublicationReadiness = 'NOT_READY' | 'READY_FOR_PUBLICATION' | 'DO_NOT_PUBLISH';
export type PublicationLedgerStatus = 'NOT_PUBLISHED' | 'PUBLISHED' | 'UNPUBLISHED';
export type GateVisual = 'COMPLETE' | 'PENDING' | 'BLOCKED' | 'REJECTED' | 'DO_NOT_PUBLISH';
export type PublicationGateId = 'data' | 'pricing' | 'compliance' | 'country' | 'content' | 'claims' | 'media' | 'translation' | 'audit';

export interface PublicationGateResult {
  gate: PublicationGateId;
  status: string;
  visual: GateVisual;
  blocking: boolean;
  reason: string;
  responsibleRole: string;
  route: string;
}

export interface ReadinessInput {
  slug: string;
  review: SpecialistProductReview | null;
  dataStatus: 'ADJUDICATED' | 'PARTIAL' | 'PENDING' | 'MISSING';
  testRecord: boolean;
  auditTrail?: Array<{ section?: string; actor?: string; actorRole?: string; timestamp?: string; reason?: string }>;
}

export interface ReadinessReport {
  slug: string;
  readiness: PublicationReadiness;
  publicationStatus: PublicationLedgerStatus;
  ready: boolean;
  gates: PublicationGateResult[];
  blockers: PublicationGateResult[];
  summary: string;
}

export interface PublicationAuditEvent {
  id: string;
  productId: string;
  previousState: PublicationLedgerStatus;
  newState: PublicationLedgerStatus;
  actor: string;
  role: RoleName;
  timestamp: string;
  method: 'EXPLICIT_ADMIN_PUBLISH' | 'EXPLICIT_ADMIN_UNPUBLISH' | 'REJECTED';
  readiness: PublicationReadiness;
  decisionReference: string;
}

interface LedgerRecord {
  slug: string;
  status: 'PUBLISHED' | 'UNPUBLISHED';
  updatedAt: string;
  actor: string;
  role: RoleName;
}

interface PublicationSource {
  getReview(slug: string): SpecialistProductReview | null;
  getContext(slug: string): { dataStatus: ReadinessInput['dataStatus']; testRecord: boolean };
}

const COHORT = new Set<string>(((firstBatchSeed as { selectedSlugs?: string[] }).selectedSlugs || []).slice(0, 10));
const CATALOGUE_STATUS = new Map<string, string>(
  ((catalogueData as { products?: Array<{ slug: string; status?: string }> }).products || []).map((product) => [product.slug, product.status || ''])
);

function gate(
  id: PublicationGateId,
  status: string,
  visual: GateVisual,
  reason: string,
  responsibleRole: string,
  route: string
): PublicationGateResult {
  return {
    gate: id,
    status,
    visual,
    blocking: visual !== 'COMPLETE',
    reason,
    responsibleRole,
    route,
  };
}

function hasAudit(record?: { reviewer?: string; timestamp?: string; rationale?: string; evidence?: string }, evidenceText?: string): boolean {
  return Boolean(record?.reviewer && record.timestamp && (record.rationale?.trim() || record.evidence?.trim() || evidenceText?.trim()));
}

export class PublicationReadinessService {
  private static source: PublicationSource | null = null;
  private static overlays = new Map<string, ReadinessInput>();
  private static ledger = new Map<string, LedgerRecord>();
  private static audit: PublicationAuditEvent[] = [];
  private static revalidationLog: string[] = [];
  private static persistEnabled = true;

  static registerSource(source: PublicationSource): void {
    this.source = source;
  }

  static resetForTests(): void {
    this.overlays.clear();
    this.ledger.clear();
    this.audit = [];
    this.revalidationLog = [];
    this.persistEnabled = false;
  }

  static installFixture(input: ReadinessInput): void {
    if (!input.slug.startsWith('fixture-')) {
      throw new Error('Publication fixtures must use the fixture- prefix so saved catalogue decisions stay unchanged.');
    }
    this.overlays.set(input.slug, JSON.parse(JSON.stringify(input)));
  }

  static cohortSlugs(): string[] {
    return [...COHORT];
  }

  static savedDataStatus(slug: string): ReadinessInput['dataStatus'] {
    return this.savedInput(slug).dataStatus;
  }

  static savedTestRecord(slug: string): boolean {
    return this.savedInput(slug).testRecord;
  }

  static canPublish(role?: RoleName | null): boolean {
    if (!role) return false;
    return RBACService.hasPermission(role, '*') || RBACService.hasPermission(role, 'catalog:publish');
  }

  static publicationStatus(slug: string): PublicationLedgerStatus {
    const record = this.ledger.get(slug);
    if (!record) return 'NOT_PUBLISHED';
    return record.status === 'PUBLISHED' ? 'PUBLISHED' : 'UNPUBLISHED';
  }

  static getAuditEvents(): PublicationAuditEvent[] {
    return [...this.audit];
  }

  static getRevalidationLog(): string[] {
    return [...this.revalidationLog];
  }

  static evaluate(input: ReadinessInput): ReadinessReport {
    const review = input.review;
    const gates: PublicationGateResult[] = [];
    const prohibited = input.testRecord
      || review?.compliance.state === 'DO_NOT_PUBLISH'
      || review?.content.state === 'DO_NOT_PUBLISH';

    gates.push(this.dataGate(input.dataStatus));
    gates.push(this.pricingGate(review));
    gates.push(this.complianceGate(review, input.testRecord));
    gates.push(this.countryGate(review));
    gates.push(this.contentGate(review));
    gates.push(this.claimGate(input.slug));
    gates.push(this.mediaGate(review));
    gates.push(this.translationGate(review));
    gates.push(this.auditGate(input));

    const blockers = gates.filter((item) => item.blocking);
    let readiness: PublicationReadiness = 'NOT_READY';
    if (prohibited) readiness = 'DO_NOT_PUBLISH';
    else if (blockers.length === 0) readiness = 'READY_FOR_PUBLICATION';

    const publicationStatus = this.publicationStatus(input.slug);
    const summary = this.summary(readiness, blockers);
    return {
      slug: input.slug,
      readiness,
      publicationStatus,
      ready: readiness === 'READY_FOR_PUBLICATION',
      gates,
      blockers,
      summary,
    };
  }

  static evaluateSaved(slug: string): ReadinessReport {
    return this.evaluate(this.savedInput(slug));
  }

  static evaluateCurrent(slug: string): ReadinessReport {
    const overlay = this.overlays.get(slug);
    if (overlay) return this.evaluate(overlay);
    if (this.source) {
      const context = this.source.getContext(slug);
      return this.evaluate({
        slug,
        review: this.source.getReview(slug),
        dataStatus: context.dataStatus,
        testRecord: context.testRecord,
      });
    }
    return this.evaluateSaved(slug);
  }

  /** Public storefront predicate. READY_FOR_PUBLICATION stays private until the ledger says PUBLISHED. */
  static isPubliclyVisible(slug: string): boolean {
    if (this.overlays.has(slug) || slug.startsWith('fixture-')) {
      return this.publicationStatus(slug) === 'PUBLISHED' && this.evaluateCurrent(slug).readiness === 'READY_FOR_PUBLICATION';
    }
    if (this.publicationStatus(slug) === 'UNPUBLISHED') return false;
    if (this.publicationStatus(slug) === 'PUBLISHED') {
      return this.evaluateCurrent(slug).readiness === 'READY_FOR_PUBLICATION';
    }
    if (COHORT.has(slug)) return false;
    return CATALOGUE_STATUS.get(slug) === 'PUBLISHED';
  }

  static customerPurchaseDecision(slug: string): { allowed: boolean; customerMessage: string } {
    if (!this.isPubliclyVisible(slug)) {
      return { allowed: false, customerMessage: 'This item is currently not available for purchase.' };
    }
    return { allowed: true, customerMessage: '' };
  }

  static async publish(params: {
    slug: string;
    actor: string;
    role: RoleName;
    confirm: boolean;
    expectedReady?: boolean;
  }): Promise<{ success: boolean; error?: string; report: ReadinessReport; idempotent?: boolean }> {
    if (!this.canPublish(params.role)) {
      const report = this.evaluateCurrent(params.slug);
      return { success: false, error: `403 Unauthorized. Role '${params.role}' cannot publish catalogue products.`, report };
    }
    if (params.confirm !== true) {
      const report = this.evaluateCurrent(params.slug);
      return { success: false, error: 'Explicit confirmation is required before publication.', report };
    }

    const report = this.evaluateCurrent(params.slug);
    if (report.readiness === 'DO_NOT_PUBLISH') {
      this.recordAudit(params, report, this.publicationStatus(params.slug), this.publicationStatus(params.slug), 'REJECTED');
      return { success: false, error: 'Publication blocked. This product is classified DO_NOT_PUBLISH.', report };
    }
    if (report.readiness !== 'READY_FOR_PUBLICATION') {
      const changed = params.expectedReady === true;
      this.recordAudit(params, report, this.publicationStatus(params.slug), this.publicationStatus(params.slug), 'REJECTED');
      return {
        success: false,
        error: changed
          ? "Publication blocked. The product's approval state changed before publication."
          : `Publication blocked. ${report.summary}`,
        report,
      };
    }

    const previous = this.publicationStatus(params.slug);
    if (previous === 'PUBLISHED') {
      return { success: true, report, idempotent: true };
    }
    this.ledger.set(params.slug, {
      slug: params.slug,
      status: 'PUBLISHED',
      updatedAt: new Date().toISOString(),
      actor: params.actor,
      role: params.role,
    });
    const next = this.evaluateCurrent(params.slug);
    this.recordAudit(params, next, previous, 'PUBLISHED', 'EXPLICIT_ADMIN_PUBLISH');
    await this.revalidate(params.slug);
    this.persist();
    return { success: true, report: next };
  }

  static async unpublish(params: {
    slug: string;
    actor: string;
    role: RoleName;
    confirm: boolean;
  }): Promise<{ success: boolean; error?: string; report: ReadinessReport; idempotent?: boolean }> {
    if (!this.canPublish(params.role)) {
      const report = this.evaluateCurrent(params.slug);
      return { success: false, error: `403 Unauthorized. Role '${params.role}' cannot unpublish catalogue products.`, report };
    }
    if (params.confirm !== true) {
      const report = this.evaluateCurrent(params.slug);
      return { success: false, error: 'Explicit confirmation is required before unpublishing.', report };
    }
    const previous = this.publicationStatus(params.slug);
    const report = this.evaluateCurrent(params.slug);
    const visible = this.isPubliclyVisible(params.slug);
    if (previous === 'UNPUBLISHED' || (!visible && previous !== 'PUBLISHED')) {
      return { success: true, report, idempotent: true };
    }
    this.ledger.set(params.slug, {
      slug: params.slug,
      status: 'UNPUBLISHED',
      updatedAt: new Date().toISOString(),
      actor: params.actor,
      role: params.role,
    });
    const next = this.evaluateCurrent(params.slug);
    this.recordAudit(params, next, previous, 'UNPUBLISHED', 'EXPLICIT_ADMIN_UNPUBLISH');
    await this.revalidate(params.slug);
    this.persist();
    return { success: true, report: next };
  }

  static cohortReport(): {
    total: number;
    notReady: number;
    readyForPublication: number;
    published: number;
    doNotPublish: number;
    blockingGates: Array<{ gate: string; products: number }>;
    rows: Array<ReadinessReport & { name: string; category: string; reviewer: string; updatedAt: string }>;
  } {
    const products = (specialistSeed as { products?: Record<string, SpecialistProductReview> }).products || {};
    const batch = (firstBatchSeed as { products?: Record<string, any> }).products || {};
    const rows = this.cohortSlugs().map((slug) => {
      const report = this.evaluateSaved(slug);
      const batchProduct = batch[slug];
      return {
        ...report,
        name: batchProduct?.lastSummary?.productName || slug,
        category: batchProduct?.lastSummary?.category || '',
        reviewer: products[slug]?.reviewer || '',
        updatedAt: products[slug]?.updatedAt || '',
      };
    });
    const counts = new Map<string, number>();
    for (const row of rows) {
      const seen = new Set<string>();
      for (const blocker of row.blockers) {
        const key = blocker.gate === 'translation' ? 'translation' : blocker.gate;
        if (seen.has(key)) continue;
        seen.add(key);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      if (row.readiness === 'DO_NOT_PUBLISH') counts.set('doNotPublish', (counts.get('doNotPublish') || 0) + 1);
    }
    return {
      total: rows.length,
      notReady: rows.filter((row) => row.readiness === 'NOT_READY').length,
      readyForPublication: rows.filter((row) => row.readiness === 'READY_FOR_PUBLICATION').length,
      published: rows.filter((row) => row.publicationStatus === 'PUBLISHED').length,
      doNotPublish: rows.filter((row) => row.readiness === 'DO_NOT_PUBLISH').length,
      blockingGates: [...counts.entries()]
        .filter(([gate]) => gate !== 'doNotPublish')
        .map(([gateName, productsBlocked]) => ({ gate: gateName, products: productsBlocked }))
        .sort((a, b) => b.products - a.products),
      rows,
    };
  }

  private static savedInput(slug: string): ReadinessInput {
    const saved = specialistSeed as {
      products?: Record<string, SpecialistProductReview>;
      auditTrail?: ReadinessInput['auditTrail'];
    };
    const products = saved.products || {};
    const batch = (firstBatchSeed as { products?: Record<string, any> }).products || {};
    const batchProduct = batch[slug];
    const dataStatus = batchProduct?.lastSummary?.statusBoard?.data
      || (Array.isArray(batchProduct?.completionLevels) && batchProduct.completionLevels.includes('DATA_ADJUDICATED') ? 'ADJUDICATED' : 'PENDING');
    return {
      slug,
      review: products[slug] || null,
      dataStatus,
      testRecord: batchProduct?.commercialDisposition === 'NON_COMMERCIAL_TEST_RECORD',
      auditTrail: (saved.auditTrail || []).filter((event) => (event as { product?: string }).product === slug),
    };
  }

  private static dataGate(status: ReadinessInput['dataStatus']): PublicationGateResult {
    if (status === 'ADJUDICATED') {
      return gate('data', 'ADJUDICATED', 'COMPLETE', 'Data adjudication is complete.', 'Catalogue', '/admin/catalogue');
    }
    return gate('data', status, 'BLOCKED', 'Data adjudication is not complete.', 'Catalogue', '/admin/catalogue');
  }

  private static pricingGate(review: SpecialistProductReview | null): PublicationGateResult {
    const state = review?.pricing.state || 'MISSING';
    const route = '/admin/catalogue/review-workspace/specialist-review';
    if (state === 'PRICE_NOT_APPLICABLE') {
      return gate('pricing', state, 'COMPLETE', 'Pricing is not applicable to this record.', 'Finance', route);
    }
    if (state === 'PRICE_APPROVED') {
      if (review?.pricing.approvedCurrency !== 'EUR') {
        return gate('pricing', state, 'BLOCKED', 'Approved price must be an explicit EUR amount. No currency conversion is applied.', 'Finance', route);
      }
      if (!(review.pricing.approvedPrice && review.pricing.approvedPrice > 0) || !review.pricing.evidence?.trim()) {
        return gate('pricing', state, 'BLOCKED', 'Pricing approval missing', 'Finance', route);
      }
      return gate('pricing', 'PRICE_APPROVED', 'COMPLETE', 'Explicit EUR price is approved.', 'Finance', route);
    }
    if (state === 'PRICE_REJECTED') return gate('pricing', state, 'REJECTED', 'Pricing approval missing', 'Finance', route);
    if (state === 'PRICE_DEFERRED') return gate('pricing', state, 'PENDING', 'Pricing approval missing', 'Finance', route);
    return gate('pricing', state, 'PENDING', 'Pricing approval missing', 'Finance', route);
  }

  private static complianceGate(review: SpecialistProductReview | null, testRecord: boolean): PublicationGateResult {
    const state = review?.compliance.state || (testRecord ? 'DO_NOT_PUBLISH' : 'MISSING');
    const route = '/admin/catalogue/review-workspace/specialist-review';
    if (state === 'DO_NOT_PUBLISH' || testRecord) {
      return gate('compliance', 'DO_NOT_PUBLISH', 'DO_NOT_PUBLISH', testRecord ? 'NON_COMMERCIAL_TEST_RECORD' : 'DO_NOT_PUBLISH', 'Compliance', route);
    }
    if (state === 'APPROVED_FOR_PUBLICATION' || state === 'APPROVED_WITH_RESTRICTIONS') {
      return gate('compliance', state, 'COMPLETE', 'Compliance is approved for publication.', 'Compliance', route);
    }
    if (state === 'REJECTED') return gate('compliance', state, 'REJECTED', 'Compliance approval missing', 'Compliance', route);
    return gate('compliance', state, 'PENDING', 'Compliance approval missing', 'Compliance', route);
  }

  private static claimGate(slug: string): PublicationGateResult {
    if (LegalGovernanceService.blocksPublication(slug)) {
      return gate('claims', 'REQUIRES_REVIEW', 'BLOCKED', 'Sensitive public wording requires specialist review. This is not a legal determination.', 'Compliance', '/admin/legal');
    }
    return gate('claims', 'NO_RECORD', 'COMPLETE', 'No open claim review is attached to this product.', 'Compliance', '/admin/legal');
  }

  private static countryGate(review: SpecialistProductReview | null): PublicationGateResult {
    const route = '/admin/compliance/countries';
    const allowed = (review?.countries || []).filter((row) => row.decision === 'ALLOWED');
    if (allowed.length > 0) {
      return gate('country', 'CONFIGURED', 'COMPLETE', `Eligible destinations: ${allowed.map((row) => row.country).join(', ')}.`, 'Compliance', route);
    }
    return gate('country', 'NOT_CONFIGURED', 'BLOCKED', 'Country eligibility not configured', 'Compliance', route);
  }

  private static contentGate(review: SpecialistProductReview | null): PublicationGateResult {
    const state = review?.content.state || 'MISSING';
    const route = '/admin/content';
    if (state === 'DO_NOT_PUBLISH') return gate('content', state, 'DO_NOT_PUBLISH', 'DO_NOT_PUBLISH', 'Content', route);
    if (state === 'CONTENT_REJECTED') return gate('content', state, 'REJECTED', 'Public content not approved', 'Content', route);
    if ((state === 'CONTENT_APPROVED' || state === 'CONTENT_APPROVED_WITH_RESTRICTIONS') && review?.content.approvedPublicContent?.trim()) {
      return gate('content', state, 'COMPLETE', 'Public content is approved.', 'Content', route);
    }
    if (state === 'INTERNAL_SOURCE_ONLY') return gate('content', state, 'BLOCKED', 'Public content not approved', 'Content', route);
    return gate('content', state, 'PENDING', 'Public content not approved', 'Content', route);
  }

  private static mediaGate(review: SpecialistProductReview | null): PublicationGateResult {
    const state = review?.media.state || 'MEDIA_REVIEW';
    const route = '/admin/catalogue/media';
    if (state === 'VERIFIED') return gate('media', 'VERIFIED', 'COMPLETE', 'Primary public media is verified.', 'Catalogue', route);
    return gate('media', state, 'BLOCKED', 'Primary public media is not verified.', 'Catalogue', route);
  }

  private static translationGate(review: SpecialistProductReview | null): PublicationGateResult {
    const route = '/admin/catalogue/translations';
    const pending = REQUIRED_PUBLICATION_LOCALES.filter((locale) => {
      const slot = review?.translations?.[locale];
      return !slot || slot.state !== 'APPROVED' || !slot.draft?.trim();
    });
    if (pending.length === 0) {
      return gate('translation', 'APPROVED', 'COMPLETE', 'Required launch locales are approved.', 'Content', route);
    }
    const rejected = pending.some((locale) => review?.translations?.[locale]?.state === 'REJECTED');
    const reason = pending.map((locale) => `${LOCALE_NAMES[locale] || locale} translation pending`).join('; ');
    return gate('translation', rejected ? 'REJECTED' : 'PENDING', rejected ? 'REJECTED' : 'PENDING', reason, 'Content', route);
  }

  private static trailCovers(input: ReadinessInput, section: string): boolean {
    return (input.auditTrail || []).some((event) =>
      event.section === section && Boolean(event.actor && event.actorRole && event.timestamp && event.reason?.trim())
    );
  }

  private static auditGate(input: ReadinessInput): PublicationGateResult {
    const route = '/admin/audit';
    const review = input.review;
    if (!review) return gate('audit', 'MISSING', 'BLOCKED', 'Required decision audit metadata is missing.', 'System', route);
    const missing: string[] = [];
    const covered = (section: string, structOk: boolean) => structOk || this.trailCovers(input, section);
    if ((review.pricing.state === 'PRICE_APPROVED' || review.pricing.state === 'PRICE_DEFERRED' || review.pricing.state === 'PRICE_NOT_APPLICABLE') && !covered('pricing', hasAudit(review.pricing))) {
      missing.push('pricing');
    }
    if ((review.compliance.state === 'APPROVED_FOR_PUBLICATION' || review.compliance.state === 'APPROVED_WITH_RESTRICTIONS' || review.compliance.state === 'DEFERRED' || review.compliance.state === 'DO_NOT_PUBLISH') && !covered('compliance', hasAudit(review.compliance))) {
      missing.push('compliance');
    }
    for (const country of review.countries) {
      const structOk = Boolean(country.reviewer && country.timestamp && country.rationale?.trim() && country.evidence?.trim());
      if (!structOk && !this.trailCovers(input, 'country')) missing.push(`country ${country.country}`);
    }
    if ((review.content.state === 'CONTENT_APPROVED' || review.content.state === 'CONTENT_APPROVED_WITH_RESTRICTIONS' || review.content.state === 'CONTENT_DEFERRED' || review.content.state === 'DO_NOT_PUBLISH' || review.content.state === 'INTERNAL_SOURCE_ONLY') && !covered('content', hasAudit(review.content, review.content.approvedPublicContent))) {
      missing.push('content');
    }
    for (const locale of REQUIRED_PUBLICATION_LOCALES) {
      const slot = review.translations?.[locale];
      if (slot && slot.state !== 'PENDING' && (!slot.reviewer || !slot.timestamp || !slot.draft?.trim()) && !this.trailCovers(input, 'translation')) {
        missing.push(locale);
      }
    }
    if (review.media.state === 'VERIFIED' && input.dataStatus !== 'ADJUDICATED' && (!review.media.reviewer || !review.media.timestamp) && !this.trailCovers(input, 'media')) {
      missing.push('media');
    }
    if (missing.length === 0) return gate('audit', 'COMPLETE', 'COMPLETE', 'Required decision records include reviewer, timestamp, and rationale or evidence.', 'System', route);
    return gate('audit', 'INCOMPLETE', 'BLOCKED', 'Required decision audit metadata is missing.', 'System', route);
  }

  private static summary(readiness: PublicationReadiness, blockers: PublicationGateResult[]): string {
    if (readiness === 'READY_FOR_PUBLICATION') return 'READY_FOR_PUBLICATION';
    const lines = blockers.flatMap((item) => item.reason.split('; ').map((reason) => `- ${reason}`));
    return `${readiness}\n\nBlocking:\n${lines.join('\n')}`;
  }

  private static recordAudit(
    params: { slug: string; actor: string; role: RoleName },
    report: ReadinessReport,
    previousState: PublicationLedgerStatus,
    newState: PublicationLedgerStatus,
    method: PublicationAuditEvent['method']
  ): void {
    this.audit.push({
      id: `pub_${this.audit.length + 1}_${params.slug}`,
      productId: params.slug,
      previousState,
      newState,
      actor: params.actor,
      role: params.role,
      timestamp: new Date().toISOString(),
      method,
      readiness: report.readiness,
      decisionReference: report.summary,
    });
  }

  private static async revalidate(slug: string): Promise<void> {
    let locales = ['en', 'de', 'fr', 'es', 'it', 'nl'];
    try {
      const i18n = await import('@/i18n');
      if (Array.isArray(i18n.SUPPORTED_LOCALES) && i18n.SUPPORTED_LOCALES.length) locales = [...i18n.SUPPORTED_LOCALES];
    } catch {}
    const paths = [`/sitemap.xml`, ...locales.flatMap((locale) => [
      `/${locale}/products/${slug}`,
      `/${locale}/shop`,
      `/${locale}`,
    ])];
    this.revalidationLog.push(...paths);
    try {
      const cache = await import('next/cache');
      for (const path of paths) cache.revalidatePath(path);
    } catch {}
  }

  private static persist(): void {
    if (!this.persistEnabled) return;
    try {
      if (typeof window !== 'undefined') return;
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      const full = path.resolve(process.cwd(), 'src/data/catalogue-publication-state.json');
      const body = {
        version: 1,
        records: Object.fromEntries(this.ledger.entries()),
        audit: this.audit,
      };
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, JSON.stringify(body, null, 2));
    } catch {}
  }
}
