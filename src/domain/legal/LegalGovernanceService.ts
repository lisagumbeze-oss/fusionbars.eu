import { RoleName } from '@/types';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';

export type LegalDocType = 'terms' | 'privacy' | 'cookies' | 'refunds' | 'shipping' | 'payment' | 'imprint';
export type LegalDocStatus = 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED' | 'ARCHIVED';
export type LegalLocale = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';
export type FieldState = 'NOT_CONFIGURED' | 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'PUBLISHED' | 'SUPERSEDED' | 'CONFIGURED';

export interface LegalDocument {
  type: LegalDocType;
  locale: LegalLocale;
  version: number;
  status: LegalDocStatus;
  title: string;
  content: string;
  effectiveDate: string | null;
  approvedBy: string | null;
  approvalTimestamp: string | null;
  publishedAt: string | null;
  supersededAt: string | null;
  source: string | null;
  reviewer: string | null;
}

const LOCALES: LegalLocale[] = ['en', 'de', 'fr', 'es', 'it', 'nl'];
const TYPES: LegalDocType[] = ['terms', 'privacy', 'cookies', 'refunds', 'shipping', 'payment', 'imprint'];

function placeholder(value: string | undefined): boolean {
  return !value || value.includes('[') || value.toUpperCase().includes('PENDING') || value.trim().length === 0;
}

function sanitize(content: string): string {
  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/javascript:/gi, '');
}

function envField(name: string): { state: FieldState; value: string | null } {
  const value = process.env[name];
  if (placeholder(value)) return { state: 'NOT_CONFIGURED', value: null };
  return { state: 'CONFIGURED', value: value!.trim() };
}

export class LegalGovernanceService {
  private static documents: LegalDocument[] = [];
  private static history: LegalDocument[] = [];
  private static audit: Array<Record<string, string>> = [];
  private static publicFields = new Set<string>();
  private static fallbackLocale: LegalLocale | null = null;
  private static consents: Array<{ id: string; categories: { necessary: boolean; preferences: boolean; analytics: boolean; marketing: boolean }; version: string; timestamp: string; locale: string; privacyVersion: number | null; cookieVersion: number | null }> = [];
  private static claims = new Map<string, { status: 'REQUIRES_REVIEW' | 'APPROVED' | 'RESTRICTED' | 'DO_NOT_PUBLISH'; note: string }>();
  private static fieldRecords = new Map<string, { state: FieldState; evidence: string | null; reviewer: string | null; reviewedAt: string | null; result: string | null }>();
  private static acceptances: Array<{ type: LegalDocType; locale: LegalLocale; version: number; orderReference: string; actor: string; at: string }> = [];

  static resetForTests(): void {
    this.documents = [];
    this.history = [];
    this.audit = [];
    this.publicFields.clear();
    this.fallbackLocale = null;
    this.consents = [];
    this.claims.clear();
    this.fieldRecords.clear();
    this.acceptances = [];
    this.seed();
  }

  static seed(): void {
    if (this.documents.length) return;
    for (const type of TYPES) {
      this.documents.push({
        type,
        locale: 'en',
        version: 0,
        status: 'REVIEW_REQUIRED',
        title: type,
        content: '',
        effectiveDate: null,
        approvedBy: null,
        approvalTimestamp: null,
        publishedAt: null,
        supersededAt: null,
        source: null,
        reviewer: null,
      });
    }
  }

  static profile() {
    this.seed();
    const support = { state: 'CONFIGURED' as FieldState, value: 'sales@fusionbars.eu', source: 'Existing store support identity' };
    const display = { state: 'CONFIGURED' as FieldState, value: 'Fusion Mushroom Bars EU', source: 'Existing store display name' };
    return {
      displayName: display,
      supportEmail: support,
      legalName: this.identity('legalName', 'LEGAL_COMPANY_NAME'),
      registrationNumber: this.identity('registrationNumber', 'LEGAL_COMPANY_REG_NUMBER'),
      vatNumber: this.identity('vatNumber', 'LEGAL_VAT_NUMBER'),
      registeredAddress: this.identity('registeredAddress', 'LEGAL_REGISTERED_ADDRESS'),
      jurisdiction: this.identity('jurisdiction', 'LEGAL_JURISDICTION'),
      publicFields: [...this.publicFields],
    };
  }

  private static identity(key: string, envName: string): { state: FieldState; value: string | null; evidence: string | null } {
    const raw = envField(envName);
    const record = this.fieldRecords.get(key);
    if (!raw.value) return { state: 'NOT_CONFIGURED', value: null, evidence: record?.evidence || null };
    return { state: record?.state || 'REVIEW_REQUIRED', value: raw.value, evidence: record?.evidence || null };
  }

  static publicProfile() {
    const profile = this.profile();
    const visible: Record<string, string> = {};
    if (this.publicFields.has('supportEmail')) visible.supportEmail = profile.supportEmail.value;
    if (this.publicFields.has('displayName')) visible.displayName = profile.displayName.value;
    for (const key of ['legalName', 'registrationNumber', 'vatNumber', 'registeredAddress', 'jurisdiction'] as const) {
      if (profile[key].state === 'PUBLISHED' && profile[key].value) visible[key] = profile[key].value;
    }
    return visible;
  }

  static approveDisclosure(field: string, role: RoleName, actor: string): void {
    this.publishField({ field, role, actor, confirmation: 'PUBLISH_LEGAL_FIELD', rationale: 'Explicit disclosure', evidence: 'Authorized disclosure' });
  }

  static recordFieldEvidence(params: { field: string; reference: string; role: RoleName; reviewer: string; result: 'REVIEW_REQUIRED' | 'APPROVED' }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'COMPLIANCE_MANAGER') throw new Error('Unauthorized legal evidence.');
    if (!params.reference?.trim()) throw new Error('Evidence requires a reference, not a private document.');
    const current = this.fieldRecords.get(params.field);
    this.fieldRecords.set(params.field, {
      state: params.result === 'APPROVED' ? 'APPROVED' : current?.state || 'REVIEW_REQUIRED',
      evidence: params.reference.trim(),
      reviewer: params.reviewer,
      reviewedAt: new Date().toISOString(),
      result: params.result,
    });
    this.audit.push({ action: 'LEGAL_EVIDENCE', field: params.field, reference: params.reference.trim(), actor: params.reviewer, role: params.role, result: params.result, at: new Date().toISOString() });
  }

  static approveField(params: { field: string; role: RoleName; actor: string; rationale: string; evidence: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'COMPLIANCE_MANAGER') throw new Error('Unauthorized legal approval.');
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('Legal approval requires rationale and evidence.');
    const profile = this.profile() as Record<string, { state?: FieldState; value?: string | null }>;
    if (!profile[params.field]?.value) throw new Error('An unconfigured field cannot be approved.');
    this.fieldRecords.set(params.field, { state: 'APPROVED', evidence: params.evidence.trim(), reviewer: params.actor, reviewedAt: new Date().toISOString(), result: 'APPROVED' });
    this.audit.push({ action: 'LEGAL_FIELD_APPROVED', field: params.field, actor: params.actor, role: params.role, at: new Date().toISOString() });
  }

  static publishField(params: { field: string; role: RoleName; actor: string; confirmation: string; rationale: string; evidence: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'COMPLIANCE_MANAGER') throw new Error('Unauthorized public disclosure.');
    if (params.confirmation !== 'PUBLISH_LEGAL_FIELD') throw new Error('Explicit publication confirmation is required.');
    const profile = this.profile() as Record<string, { state?: FieldState; value?: string | null }>;
    if (profile[params.field]?.state !== 'APPROVED' && profile[params.field]?.state !== 'PUBLISHED') {
      throw new Error('Only an approved legal field can be published.');
    }
    this.fieldRecords.set(params.field, { state: 'PUBLISHED', evidence: params.evidence.trim(), reviewer: params.actor, reviewedAt: new Date().toISOString(), result: 'PUBLISHED' });
    this.publicFields.add(params.field);
    this.audit.push({ action: 'LEGAL_FIELD_PUBLISHED', field: params.field, actor: params.actor, role: params.role, at: new Date().toISOString() });
  }

  static saveDraft(params: { type: LegalDocType; locale: LegalLocale; title: string; content: string; role: RoleName; actor: string; source?: string; effectiveDate?: string }): LegalDocument {
    this.seed();
    if (!this.canDraft(params.role)) throw new Error('Unauthorized legal draft.');
    if (!LOCALES.includes(params.locale)) throw new Error('Unsupported locale.');
    const clean = sanitize(params.content);
    if (/<script/i.test(clean)) throw new Error('Legal content cannot contain scripts.');
    let doc = this.documents.find((item) => item.type === params.type && item.locale === params.locale && item.status !== 'PUBLISHED' && item.status !== 'SUPERSEDED');
    if (!doc) {
      doc = { type: params.type, locale: params.locale, version: 0, status: 'DRAFT', title: params.title, content: clean, effectiveDate: params.effectiveDate || null, approvedBy: null, approvalTimestamp: null, publishedAt: null, supersededAt: null, source: params.source || null, reviewer: null };
      this.documents.push(doc);
    }
    doc.status = 'DRAFT';
    doc.title = params.title;
    doc.content = clean;
    doc.source = params.source || doc.source;
    doc.effectiveDate = params.effectiveDate || doc.effectiveDate;
    doc.approvedBy = null;
    this.audit.push({ action: 'LEGAL_DRAFT', type: params.type, locale: params.locale, actor: params.actor, role: params.role, at: new Date().toISOString() });
    return { ...doc };
  }

  static approve(params: { type: LegalDocType; locale: LegalLocale; role: RoleName; actor: string }): LegalDocument {
    if (params.role === 'CONTENT_MANAGER' || !this.canApprove(params.role)) throw new Error('Content editors cannot approve legal documents.');
    const doc = this.editable(params.type, params.locale);
    if (!doc.content.trim()) throw new Error('Empty legal text cannot be approved.');
    doc.status = 'APPROVED';
    doc.approvedBy = params.actor;
    doc.approvalTimestamp = new Date().toISOString();
    doc.reviewer = params.actor;
    this.audit.push({ action: 'LEGAL_APPROVED', type: params.type, locale: params.locale, actor: params.actor, role: params.role, at: doc.approvalTimestamp });
    return { ...doc };
  }

  static publish(params: { type: LegalDocType; locale: LegalLocale; role: RoleName; actor: string; confirmation: string; reason: string }): LegalDocument {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'COMPLIANCE_MANAGER') throw new Error('Unauthorized legal publication.');
    if (params.confirmation !== 'PUBLISH_LEGAL_DOCUMENT') throw new Error('Explicit publication confirmation is required.');
    const doc = this.editable(params.type, params.locale);
    if (doc.status !== 'APPROVED') throw new Error('Only an approved document can be published.');
    const current = this.documents.find((item) => item.type === params.type && item.locale === params.locale && item.status === 'PUBLISHED');
    if (current) {
      current.status = 'SUPERSEDED';
      current.supersededAt = new Date().toISOString();
      this.history.push({ ...current });
    }
    if (!doc.effectiveDate || Number.isNaN(Date.parse(doc.effectiveDate))) throw new Error('Publication requires a valid effective date.');
    doc.status = 'PUBLISHED';
    doc.publishedAt = new Date().toISOString();
    doc.version = (current?.version || doc.version) + 1;
    this.audit.push({ action: 'LEGAL_PUBLISHED', type: params.type, locale: params.locale, version: String(doc.version), actor: params.actor, reason: params.reason, at: new Date().toISOString() });
    return { ...doc };
  }

  static active(type: LegalDocType, locale: LegalLocale): (LegalDocument & { fallback: boolean }) | null {
    this.seed();
    const exact = this.documents.find((item) => item.type === type && item.locale === locale && item.status === 'PUBLISHED');
    if (exact) return { ...exact, fallback: false };
    if (this.fallbackLocale && locale !== this.fallbackLocale) {
      const fallback = this.documents.find((item) => item.type === type && item.locale === this.fallbackLocale && item.status === 'PUBLISHED');
      if (fallback) return { ...fallback, fallback: true };
    }
    return null;
  }

  static publicLinks(): Array<{ type: LegalDocType; href: string }> {
    return TYPES.filter((type) => this.active(type, 'en')).map((type) => ({ type, href: `/legal/${type}` }));
  }

  static recordConsent(params: { categories: { preferences: boolean; analytics: boolean; marketing: boolean }; locale: string; privacyVersion: number | null; cookieVersion: number | null }): { id: string } {
    const record = {
      id: `consent-${this.consents.length + 1}`,
      categories: { necessary: true, ...params.categories },
      version: 'consent-v1',
      timestamp: new Date().toISOString(),
      locale: params.locale,
      privacyVersion: params.privacyVersion,
      cookieVersion: params.cookieVersion,
    };
    this.consents.push(record);
    this.audit.push({ action: 'CONSENT_RECORDED', id: record.id, at: record.timestamp });
    return { id: record.id };
  }

  static withdrawOptionalConsent(id: string): void {
    const record = this.consents.find((item) => item.id === id);
    if (!record) throw new Error('Consent record not found.');
    record.categories.preferences = false;
    record.categories.analytics = false;
    record.categories.marketing = false;
    record.categories.necessary = true;
    this.audit.push({ action: 'CONSENT_WITHDRAWN', id, at: new Date().toISOString() });
  }

  static cookieInventory() {
    return [
      { key: 'fb_session', provider: 'application', purpose: 'Customer session', category: 'necessary', persistence: 'cookie', expiry: 'session configuration', necessary: true, party: 'first', feature: 'account' },
      { key: 'fb_admin_session', provider: 'application', purpose: 'Admin session', category: 'necessary', persistence: 'cookie', expiry: 'session configuration', necessary: true, party: 'first', feature: 'admin' },
      { key: 'fb_cookie_consent_v1', provider: 'application', purpose: 'Stored consent choice', category: 'necessary', persistence: 'cookie and local storage', expiry: '1 year', necessary: true, party: 'first', feature: 'consent' },
      { key: 'fusion_eu_cart', provider: 'application', purpose: 'Cart contents', category: 'necessary', persistence: 'local storage', expiry: 'browser storage', necessary: true, party: 'first', feature: 'cart' },
      { key: 'fusion_eu_currency', provider: 'application', purpose: 'Currency preference', category: 'preferences', persistence: 'local storage', expiry: 'browser storage', necessary: false, party: 'first', feature: 'currency' },
      { key: 'fusion_eu_wishlist', provider: 'application', purpose: 'Wishlist', category: 'preferences', persistence: 'local storage', expiry: 'browser storage', necessary: false, party: 'first', feature: 'wishlist' },
    ];
  }

  static analyticsStatus(): 'NOT_CONFIGURED' {
    return 'NOT_CONFIGURED';
  }

  static flagClaim(slug: string, text: string): 'REQUIRES_REVIEW' | 'NO_FLAG' {
    const pattern = /diagnos|treat|cure|prevent|therapeutic|disease|clinical|certified|laboratory tested|dosage|serving/i;
    if (!pattern.test(text)) return 'NO_FLAG';
    this.claims.set(slug, { status: 'REQUIRES_REVIEW', note: 'Sensitive wording requires specialist review. This is not a legal determination.' });
    return 'REQUIRES_REVIEW';
  }

  static claimStatus(slug: string): string {
    return this.claims.get(slug)?.status || 'NO_RECORD';
  }

  static blocksPublication(slug: string): boolean {
    return this.claims.get(slug)?.status === 'REQUIRES_REVIEW' || this.claims.get(slug)?.status === 'DO_NOT_PUBLISH';
  }

  static recordAcceptance(params: { type: LegalDocType; locale: LegalLocale; version: number; orderReference: string; actor: string }): { type: LegalDocType; locale: LegalLocale; version: number; at: string } {
    const document = this.active(params.type, params.locale);
    if (!document || document.fallback || document.status !== 'PUBLISHED' || document.version !== params.version) {
      throw new Error('Only a published legal document can be accepted.');
    }
    const at = new Date().toISOString();
    this.acceptances.push({ type: params.type, locale: params.locale, version: params.version, orderReference: params.orderReference, actor: params.actor, at });
    this.audit.push({ action: 'LEGAL_ACCEPTED', type: params.type, locale: params.locale, version: String(params.version), orderReference: params.orderReference, actor: params.actor, at });
    return { type: params.type, locale: params.locale, version: params.version, at };
  }

  static launchBlockers(): string[] {
    this.seed();
    const blockers: string[] = [];
    if (this.profile().legalName.state !== 'CONFIGURED') blockers.push('Legal company name is NOT_CONFIGURED.');
    for (const type of ['terms', 'privacy', 'cookies', 'shipping', 'refunds', 'payment'] as LegalDocType[]) {
      if (!this.active(type, 'en')) blockers.push(`${type} is not published.`);
    }
    if (PRODUCTION_CONTROL_STATE === 'PAUSED') blockers.push('Production is PAUSED.');
    return blockers;
  }

  static report() {
    this.seed();
    return {
      production: PRODUCTION_CONTROL_STATE,
      profile: this.profile(),
      documents: this.documents.map((doc) => ({ type: doc.type, locale: doc.locale, status: doc.status, version: doc.version, effectiveDate: doc.effectiveDate })),
      localesWithoutTranslation: LOCALES.filter((locale) => locale !== 'en'),
      consentCount: this.consents.length,
      analytics: this.analyticsStatus(),
      newsletter: 'NOT_ACTIVE',
      ageVerificationAtDelivery: false,
      blockers: this.launchBlockers(),
      audit: this.audit.length,
    };
  }

  private static canDraft(role: RoleName): boolean {
    return role === 'SUPER_ADMIN' || role === 'COMPLIANCE_MANAGER' || role === 'CONTENT_MANAGER';
  }

  private static canApprove(role: RoleName): boolean {
    return role === 'SUPER_ADMIN' || role === 'COMPLIANCE_MANAGER';
  }

  private static editable(type: LegalDocType, locale: LegalLocale): LegalDocument {
    this.seed();
    const doc = [...this.documents].reverse().find((item) => item.type === type && item.locale === locale && item.status !== 'SUPERSEDED' && item.status !== 'ARCHIVED');
    if (!doc) throw new Error('Legal document not found.');
    return doc;
  }
}

LegalGovernanceService.seed();
