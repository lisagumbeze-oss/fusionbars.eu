// Launch intent is not publication. Missing prices, countries, tax, and legal text stay unresolved.

import type { RoleName } from '@/types';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { PublicationReadinessService, type PublicationGateResult } from '@/domain/catalog/PublicationReadinessService';
import { CommercialConfigurationService } from '@/domain/commercial/CommercialConfigurationService';
import { PricingEngine } from '@/domain/commercial/PricingEngine';
import { DestinationEngine } from '@/domain/shipping/DestinationEngine';
import { ShippingService } from '@/domain/shipping/ShippingService';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { GBP_LAUNCH_MODE } from '@/domain/launch/launch-policy';

export type LaunchSelectionState =
  | 'NOT_SELECTED'
  | 'LAUNCH_CANDIDATE'
  | 'LAUNCH_SELECTED'
  | 'LAUNCH_BLOCKED'
  | 'DO_NOT_LAUNCH'
  | 'PUBLISHED';

export type LaunchSetState = 'DRAFT' | 'REVIEW' | 'APPROVED';
export type LaunchLocaleMode = 'REQUIRED' | 'OPTIONAL' | 'NOT_LAUNCH';
export type LaunchLocale = 'en' | 'de' | 'fr' | 'es' | 'it' | 'nl';

const LOCALES: LaunchLocale[] = ['en', 'de', 'fr', 'es', 'it', 'nl'];
const AUDIT_SLUG = 'audit-test-product';

export interface LaunchChecklistRow {
  id: 'DATA' | 'PRICING' | 'COMPLIANCE' | 'COUNTRY' | 'CONTENT' | 'MEDIA' | 'TRANSLATION' | 'TAX' | 'SHIPPING' | 'LEGAL' | 'PUBLICATION';
  state: string;
  href: string;
}

export interface LaunchAuditEvent {
  product: string;
  decision: string;
  oldState: string | null;
  newState: string | null;
  reviewer: string;
  role: RoleName;
  timestamp: string;
  evidence: string;
  launchSetVersion: number;
}

interface LaunchSetVersion {
  id: 'FUSION-EU-001';
  version: number;
  state: LaunchSetState;
  selections: Record<string, LaunchSelectionState>;
  intendedCountries: string[];
  localePolicy: Partial<Record<LaunchLocale, LaunchLocaleMode>> | null;
  commercialPolicyReference: string | null;
  reviewer: string | null;
  role: RoleName | null;
  timestamp: string | null;
  destinationVersion: number;
  shippingVersion: number;
  taxVersion: number;
}

function emptySet(version: number): LaunchSetVersion {
  return {
    id: 'FUSION-EU-001',
    version,
    state: 'DRAFT',
    selections: {},
    intendedCountries: [],
    localePolicy: null,
    commercialPolicyReference: null,
    reviewer: null,
    role: null,
    timestamp: null,
    destinationVersion: DestinationEngine.get().version,
    shippingVersion: CommercialConfigurationService.get().version,
    taxVersion: CommercialConfigurationService.get().version,
  };
}

export class LaunchCatalogueService {
  static readonly DISTINCT_PRODUCTS = ['a-box-of-10-fusion-gummies', 'a-box-of-fusion-gummies'] as const;
  static readonly AUDIT_PRODUCT = AUDIT_SLUG;

  private static current: LaunchSetVersion = emptySet(1);
  private static history: LaunchSetVersion[] = [];
  private static audit: LaunchAuditEvent[] = [];
  private static persistEnabled = true;

  static resetForTests(): void {
    this.persistEnabled = false;
    this.current = emptySet(1);
    this.history = [];
    this.audit = [];
  }

  static rejectUnsafeBulk(action: string): void {
    const blocked = [
      'SELECT_ALL',
      'APPROVE_ALL_PRICES',
      'APPROVE_ALL_PRODUCTS',
      'ALLOW_ALL_EUROPE',
      'ALLOW_ALL_COUNTRIES',
      'PUBLISH_LAUNCH_SET',
      'CONVERT_ALL_USD_TO_EUR',
      'APPLY_SAME_EUR_TO_ALL',
      'MERGE_DISTINCT_PRODUCTS',
    ];
    if (blocked.includes(action) || action.trim()) {
      throw new Error('Bulk launch approval is not available.');
    }
  }

  static selection(slug: string): LaunchSelectionState {
    if (slug === AUDIT_SLUG || PublicationReadinessService.evaluateCurrent(slug).readiness === 'DO_NOT_PUBLISH') return 'DO_NOT_LAUNCH';
    if (PublicationReadinessService.publicationStatus(slug) === 'PUBLISHED' && PublicationReadinessService.isPubliclyVisible(slug)) return 'PUBLISHED';
    return this.current.selections[slug] || 'NOT_SELECTED';
  }

  static selectedSlugs(): string[] {
    return Object.entries(this.current.selections).filter(([, state]) => state === 'LAUNCH_SELECTED').map(([slug]) => slug);
  }

  static selectForLaunch(params: { slug: string; actor: string; role: RoleName; evidence: string }): LaunchSelectionState {
    this.assertSelector(params.role);
    if (!params.evidence?.trim()) throw new Error('Launch selection requires an evidence reference.');
    if (params.slug === AUDIT_SLUG) throw new Error('Audit Test Product cannot be selected for launch.');
    const readiness = PublicationReadinessService.evaluateCurrent(params.slug);
    if (readiness.readiness === 'DO_NOT_PUBLISH') throw new Error('DO_NOT_PUBLISH overrides launch selection.');
    const previous = this.selection(params.slug);
    this.bump();
    this.current.selections[params.slug] = 'LAUNCH_SELECTED';
    this.record(params.slug, 'LAUNCH_SELECTED', previous, 'LAUNCH_SELECTED', params.actor, params.role, params.evidence.trim());
    this.persist();
    return 'LAUNCH_SELECTED';
  }

  static markCandidate(params: { slug: string; actor: string; role: RoleName; evidence: string }): void {
    this.assertSelector(params.role);
    if (params.slug === AUDIT_SLUG) throw new Error('Audit Test Product cannot be a launch candidate.');
    const previous = this.selection(params.slug);
    this.bump();
    this.current.selections[params.slug] = 'LAUNCH_CANDIDATE';
    this.record(params.slug, 'LAUNCH_CANDIDATE', previous, 'LAUNCH_CANDIDATE', params.actor, params.role, params.evidence.trim());
    this.persist();
  }

  static removeFromLaunch(params: { slug: string; actor: string; role: RoleName; evidence: string }): void {
    this.assertSelector(params.role);
    const previous = this.selection(params.slug);
    this.bump();
    delete this.current.selections[params.slug];
    this.record(params.slug, 'NOT_SELECTED', previous, 'NOT_SELECTED', params.actor, params.role, params.evidence.trim());
    this.persist();
  }

  static blockLaunch(params: { slug: string; actor: string; role: RoleName; evidence: string }): void {
    this.assertSelector(params.role);
    if (params.slug === AUDIT_SLUG) throw new Error('Audit Test Product is already excluded from launch.');
    const previous = this.selection(params.slug);
    this.bump();
    this.current.selections[params.slug] = 'LAUNCH_BLOCKED';
    this.record(params.slug, 'LAUNCH_BLOCKED', previous, 'LAUNCH_BLOCKED', params.actor, params.role, params.evidence.trim());
    this.persist();
  }

  static setIntendedCountries(params: { countries: string[]; actor: string; role: RoleName; evidence: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'COMPLIANCE_MANAGER') throw new Error('Unauthorized launch destination change.');
    if (!params.evidence?.trim()) throw new Error('Launch destinations require evidence.');
    if (params.countries.some((code) => code === 'ALL' || code === 'EUROPE' || code === 'ALL_EUROPE')) {
      throw new Error('A launch destination list must name countries. Europe is not a product eligibility decision.');
    }
    this.bump();
    this.current.intendedCountries = params.countries.map((code) => code.toUpperCase());
    this.current.destinationVersion = DestinationEngine.get().version;
    this.record('*', 'LAUNCH_DESTINATIONS', null, this.current.intendedCountries.join(',') || 'NONE', params.actor, params.role, params.evidence.trim());
    this.persist();
  }

  static configureLocales(params: { policy: Partial<Record<LaunchLocale, LaunchLocaleMode>>; actor: string; role: RoleName; confirmation: string; evidence: string }): void {
    if (params.role !== 'SUPER_ADMIN') throw new Error('Only SUPER_ADMIN can set the launch locale policy.');
    if (params.confirmation !== 'SET_LAUNCH_LOCALES') throw new Error('Launch locale policy requires explicit confirmation.');
    if (!params.evidence?.trim()) throw new Error('Launch locale policy requires evidence.');
    const policy = params.policy;
    if (!LOCALES.some((locale) => policy[locale])) throw new Error('Launch locale policy must name at least one locale.');
    this.bump();
    this.current.localePolicy = { ...policy };
    this.record('*', 'LAUNCH_LOCALE_POLICY', null, LOCALES.map((locale) => `${locale}:${policy[locale] || 'UNSET'}`).join(','), params.actor, params.role, params.evidence.trim());
    this.persist();
  }

  static approveLaunchSet(params: { actor: string; role: RoleName; confirmation: string; evidence: string; commercialPolicyReference: string }): LaunchSetVersion {
    if (params.role !== 'SUPER_ADMIN') throw new Error('Only SUPER_ADMIN can approve a launch set.');
    if (params.confirmation !== 'APPROVE_LAUNCH_SET') throw new Error('Launch-set approval requires explicit confirmation.');
    if (!params.evidence?.trim() || !params.commercialPolicyReference?.trim()) throw new Error('Launch-set approval requires evidence and a commercial policy reference.');
    if (!this.current.localePolicy) throw new Error('Launch locale policy is NOT_CONFIGURED.');
    if (this.current.intendedCountries.length === 0) throw new Error('Launch destinations are NOT_CONFIGURED.');
    const previous = this.current.state;
    this.current.state = 'APPROVED';
    this.current.reviewer = params.actor;
    this.current.role = params.role;
    this.current.timestamp = new Date().toISOString();
    this.current.commercialPolicyReference = params.commercialPolicyReference.trim();
    this.current.taxVersion = CommercialConfigurationService.get().version;
    this.current.shippingVersion = CommercialConfigurationService.get().version;
    this.current.destinationVersion = DestinationEngine.get().version;
    this.record('*', 'LAUNCH_SET_APPROVED', previous, 'APPROVED', params.actor, params.role, params.evidence.trim());
    this.persist();
    return { ...this.current, selections: { ...this.current.selections } };
  }

  static publicationCandidate(slug: string): boolean {
    if (slug === AUDIT_SLUG || this.current.selections[slug] !== 'LAUNCH_SELECTED') return false;
    const report = PublicationReadinessService.evaluateCurrent(slug);
    return report.readiness === 'READY_FOR_PUBLICATION';
  }

  static checklist(slug: string): LaunchChecklistRow[] {
    const report = PublicationReadinessService.evaluateCurrent(slug);
    const gateState = (id: PublicationGateResult['gate'], href: string, label: LaunchChecklistRow['id']): LaunchChecklistRow => {
      const row = report.gates.find((item) => item.gate === id);
      return { id: label, state: row?.visual === 'COMPLETE' ? 'PASS' : (row?.status || 'NOT_CONFIGURED'), href };
    };
    const pricing = this.pricingRow(slug);
    const country = this.countryRow(slug, gateState('country', '/admin/shipping/product-eligibility?scope=launch', 'COUNTRY'));
    const translation = this.translationRow(gateState('translation', '/admin/catalogue/translations', 'TRANSLATION'));
    return [
      gateState('data', '/admin/catalogue', 'DATA'),
      pricing,
      gateState('compliance', '/admin/catalogue/review-workspace/specialist-review', 'COMPLIANCE'),
      country,
      gateState('content', '/admin/content', 'CONTENT'),
      gateState('media', '/admin/catalogue/media', 'MEDIA'),
      translation,
      this.taxRow(slug),
      this.shippingRow(slug),
      this.legalRow(),
      { id: 'PUBLICATION', state: report.readiness === 'READY_FOR_PUBLICATION' ? 'PASS' : report.readiness, href: '/admin/catalogue/publication' },
    ];
  }

  static fullyLaunchReady(slug: string): boolean {
    return this.publicationCandidate(slug) && this.checklist(slug).every((row) => row.state === 'PASS');
  }

  static detail(slug: string): { slug: string; name: string; selection: LaunchSelectionState; launchStatus: string; blocking: LaunchChecklistRow[] } {
    const cohort = PublicationReadinessService.cohortReport().rows.find((row) => row.slug === slug);
    const rows = this.checklist(slug);
    const blocking = rows.filter((row) => row.state !== 'PASS');
    const ready = this.fullyLaunchReady(slug);
    return {
      slug,
      name: cohort?.name || slug,
      selection: this.selection(slug),
      launchStatus: ready ? 'READY' : 'BLOCKED',
      blocking,
    };
  }

  static queue(filter = 'all') {
    const rows = PublicationReadinessService.cohortReport().rows.map((row) => {
      const selection = this.selection(row.slug);
      return {
        slug: row.slug,
        name: row.name,
        data: row.gates.find((gate) => gate.gate === 'data')?.status || 'MISSING',
        pricing: row.gates.find((gate) => gate.gate === 'pricing')?.status || 'MISSING',
        compliance: row.gates.find((gate) => gate.gate === 'compliance')?.status || 'MISSING',
        country: row.gates.find((gate) => gate.gate === 'country')?.status || 'NOT_CONFIGURED',
        content: row.gates.find((gate) => gate.gate === 'content')?.status || 'MISSING',
        media: row.gates.find((gate) => gate.gate === 'media')?.status || 'MEDIA_REVIEW',
        translation: row.gates.find((gate) => gate.gate === 'translation')?.status || 'PENDING',
        publication: row.readiness,
        selection,
        distinct: (this.DISTINCT_PRODUCTS as readonly string[]).includes(row.slug),
      };
    });
    return rows.filter((row) => this.matches(row, filter));
  }

  static eligibilityRows() {
    const countries = this.current.intendedCountries;
    const products = this.queue('all');
    if (countries.length === 0) {
      return products.map((product) => ({
        product: product.slug,
        country: 'NOT_CONFIGURED',
        decision: 'NOT_CONFIGURED',
        evidence: null as string | null,
        reviewer: null as string | null,
        effectiveDate: null as string | null,
        shipping: 'NOT_CONFIGURED',
        blocking: 'Launch destinations are not configured.',
      }));
    }
    return products.flatMap((product) => countries.map((country) => {
      const decision = DestinationEngine.evaluate({ slug: product.slug, country });
      const rule = DestinationEngine.get().rules.filter((item) => item.productSlug === product.slug && item.country === country).at(-1);
      let shipping = 'NOT_CONFIGURED';
      if (decision.storeStatus === 'ENABLED') {
        try {
          const quote = ShippingService.calculateShipping({ subtotal: 1000, currency: 'EUR', destinationCountry: country, selectedMethodCode: 'STANDARD' });
          shipping = quote.selectedMethod.cost === 1500 ? 'STANDARD_AVAILABLE' : 'REVIEW_REQUIRED';
        } catch {
          shipping = 'UNAVAILABLE';
        }
      }
      return {
        product: product.slug,
        country,
        decision: decision.productDecision,
        evidence: rule?.evidence || null,
        reviewer: rule?.reviewer || null,
        effectiveDate: rule?.effectiveFrom || null,
        shipping,
        blocking: decision.explicitlyAllowed ? '' : (decision.customerMessage || decision.productDecision),
      };
    }));
  }

  static report() {
    const queue = this.queue('all');
    const checklists = queue.map((row) => ({ slug: row.slug, rows: this.checklist(row.slug) }));
    const priceStates = queue.map((row) => row.pricing);
    const complianceStates = queue.map((row) => row.compliance);
    const contentStates = queue.map((row) => row.content);
    return {
      production: PRODUCTION_CONTROL_STATE,
      gbp: GBP_LAUNCH_MODE,
      launchSet: {
        id: this.current.id,
        version: this.current.version,
        state: this.current.state,
        productCount: this.selectedSlugs().length,
        intendedCountries: [...this.current.intendedCountries],
        localePolicy: this.current.localePolicy,
        commercialPolicyReference: this.current.commercialPolicyReference,
        reviewer: this.current.reviewer,
        timestamp: this.current.timestamp,
        destinationVersion: this.current.destinationVersion,
        shippingVersion: this.current.shippingVersion,
        taxVersion: this.current.taxVersion,
        history: this.history.length,
      },
      catalogue: {
        selected: queue.filter((row) => row.selection === 'LAUNCH_SELECTED').length,
        ready: queue.filter((row) => this.fullyLaunchReady(row.slug)).length,
        blocked: queue.filter((row) => row.publication === 'NOT_READY').length,
        doNotLaunch: queue.filter((row) => row.selection === 'DO_NOT_LAUNCH' || row.publication === 'DO_NOT_PUBLISH').length,
        published: queue.filter((row) => PublicationReadinessService.isPubliclyVisible(row.slug)).length,
        publicationCandidates: queue.filter((row) => this.publicationCandidate(row.slug)).length,
      },
      pricing: {
        approved: priceStates.filter((state) => state === 'PRICE_APPROVED').length,
        pending: priceStates.filter((state) => state !== 'PRICE_APPROVED' && state !== 'PRICE_DEFERRED' && state !== 'PRICE_NOT_APPLICABLE').length,
        deferred: priceStates.filter((state) => state === 'PRICE_DEFERRED').length,
        notApplicable: priceStates.filter((state) => state === 'PRICE_NOT_APPLICABLE').length,
        commercialEurVersions: CommercialConfigurationService.get().prices.filter((row) => row.currency === 'EUR').length,
      },
      compliance: {
        approved: complianceStates.filter((state) => state === 'APPROVED_FOR_PUBLICATION' || state === 'APPROVED_WITH_RESTRICTIONS').length,
        deferred: complianceStates.filter((state) => state === 'DEFERRED').length,
        rejected: complianceStates.filter((state) => state === 'REJECTED').length,
        doNotPublish: complianceStates.filter((state) => state === 'DO_NOT_PUBLISH').length,
      },
      content: {
        approved: contentStates.filter((state) => state === 'CONTENT_APPROVED' || state === 'CONTENT_APPROVED_WITH_RESTRICTIONS').length,
        pending: contentStates.filter((state) => state !== 'CONTENT_APPROVED' && state !== 'CONTENT_APPROVED_WITH_RESTRICTIONS' && state !== 'DO_NOT_PUBLISH').length,
        restricted: contentStates.filter((state) => state === 'DO_NOT_PUBLISH' || state === 'CONTENT_REJECTED').length,
      },
      countries: {
        intended: this.current.intendedCountries.length,
        unresolved: queue.filter((row) => row.country === 'NOT_CONFIGURED').length,
      },
      tax: CommercialConfigurationService.taxReadiness().state,
      legalPublished: LegalGovernanceService.publicLinks().length,
      audit: this.audit.length,
      checklists,
    };
  }

  static auditEvents(): LaunchAuditEvent[] {
    return [...this.audit];
  }

  private static pricingRow(slug: string): LaunchChecklistRow {
    const approved = PricingEngine.activeApprovedPrice(slug, null, 'EUR', new Date().toISOString());
    if (approved && approved.amountMinor > 0 && approved.currency === 'EUR') {
      return { id: 'PRICING', state: 'PASS', href: '/admin/pricing?scope=launch' };
    }
    const specialist = PricingEngine.specialistStatus(slug);
    return { id: 'PRICING', state: specialist || 'NOT_CONFIGURED', href: '/admin/pricing?scope=launch' };
  }

  private static countryRow(slug: string, publication: LaunchChecklistRow): LaunchChecklistRow {
    if (publication.state !== 'PASS') return publication;
    const compliance = PublicationReadinessService.evaluateCurrent(slug).gates.find((gate) => gate.gate === 'compliance');
    if (compliance && compliance.visual !== 'COMPLETE') return { id: 'COUNTRY', state: compliance.status, href: publication.href };
    if (this.current.intendedCountries.length === 0) return { id: 'COUNTRY', state: 'NOT_CONFIGURED', href: publication.href };
    const blocked = this.current.intendedCountries.filter((country) => !DestinationEngine.evaluate({ slug, country }).explicitlyAllowed);
    if (blocked.length === 0 && publication.state === 'PASS') return { id: 'COUNTRY', state: 'PASS', href: publication.href };
    return { id: 'COUNTRY', state: blocked.length ? 'NOT_CONFIGURED' : publication.state, href: publication.href };
  }

  private static translationRow(publication: LaunchChecklistRow): LaunchChecklistRow {
    if (!this.current.localePolicy) return { id: 'TRANSLATION', state: 'NOT_CONFIGURED', href: publication.href };
    if (publication.state !== 'PASS') return publication;
    return { id: 'TRANSLATION', state: 'PASS', href: publication.href };
  }

  private static taxRow(slug: string): LaunchChecklistRow {
    const readiness = CommercialConfigurationService.taxReadiness();
    const taxClass = CommercialConfigurationService.get().tax.productClasses[slug] || 'NOT_CONFIGURED';
    if (readiness.state !== 'CONFIGURED' || taxClass === 'NOT_CONFIGURED') {
      return { id: 'TAX', state: readiness.state === 'CONFIGURED' ? 'NOT_CONFIGURED' : readiness.state, href: '/admin/settings/tax' };
    }
    return { id: 'TAX', state: 'PASS', href: '/admin/settings/tax' };
  }

  private static shippingRow(slug: string): LaunchChecklistRow {
    if (this.current.intendedCountries.length === 0) return { id: 'SHIPPING', state: 'NOT_CONFIGURED', href: '/admin/shipping' };
    for (const country of this.current.intendedCountries) {
      const decision = DestinationEngine.evaluate({ slug, country });
      if (!decision.explicitlyAllowed || decision.fulfilment !== 'AVAILABLE') {
        return { id: 'SHIPPING', state: decision.productDecision, href: '/admin/shipping/product-eligibility?scope=launch' };
      }
      try {
        ShippingService.calculateShipping({ subtotal: 1000, currency: 'EUR', destinationCountry: country, selectedMethodCode: 'STANDARD' });
      } catch {
        return { id: 'SHIPPING', state: 'UNAVAILABLE', href: '/admin/shipping' };
      }
    }
    return { id: 'SHIPPING', state: 'PASS', href: '/admin/shipping/product-eligibility?scope=launch' };
  }

  private static legalRow(): LaunchChecklistRow {
    const blockers = LegalGovernanceService.launchBlockers().filter((item) => !item.startsWith('Production is'));
    return { id: 'LEGAL', state: blockers.length === 0 ? 'PASS' : 'REVIEW_REQUIRED', href: '/admin/settings/legal' };
  }

  private static matches(row: { data: string; pricing: string; compliance: string; country: string; content: string; media: string; translation: string; publication: string; selection: string }, filter: string): boolean {
    if (filter === 'data-adjudicated') return row.data === 'ADJUDICATED';
    if (filter === 'pricing-approved') return row.pricing === 'PRICE_APPROVED';
    if (filter === 'compliance-approved') return row.compliance === 'APPROVED_FOR_PUBLICATION' || row.compliance === 'APPROVED_WITH_RESTRICTIONS';
    if (filter === 'country-configured') return row.country !== 'NOT_CONFIGURED';
    if (filter === 'content-approved') return row.content === 'CONTENT_APPROVED' || row.content === 'CONTENT_APPROVED_WITH_RESTRICTIONS';
    if (filter === 'media-verified') return row.media === 'VERIFIED';
    if (filter === 'translations-complete') return row.translation === 'APPROVED';
    if (filter === 'ready') return row.publication === 'READY_FOR_PUBLICATION';
    if (filter === 'blocked') return row.publication === 'NOT_READY' || row.selection === 'LAUNCH_BLOCKED';
    if (filter === 'do-not-publish') return row.publication === 'DO_NOT_PUBLISH' || row.selection === 'DO_NOT_LAUNCH';
    return true;
  }

  private static assertSelector(role: RoleName): void {
    if (role !== 'SUPER_ADMIN' && role !== 'CATALOG_MANAGER') throw new Error(`Unauthorized. Role '${role}' cannot change launch selection.`);
  }

  private static bump(): void {
    this.history.push(JSON.parse(JSON.stringify(this.current)));
    const next = emptySet(this.current.version + 1);
    next.selections = { ...this.current.selections };
    next.intendedCountries = [...this.current.intendedCountries];
    next.localePolicy = this.current.localePolicy ? { ...this.current.localePolicy } : null;
    next.commercialPolicyReference = this.current.commercialPolicyReference;
    next.state = 'DRAFT';
    next.reviewer = null;
    next.role = null;
    next.timestamp = null;
    this.current = next;
  }

  private static record(product: string, decision: string, oldState: string | null, newState: string | null, reviewer: string, role: RoleName, evidence: string): void {
    this.audit.push({
      product,
      decision,
      oldState,
      newState,
      reviewer,
      role,
      timestamp: new Date().toISOString(),
      evidence,
      launchSetVersion: this.current.version,
    });
  }

  private static persist(): void {
    if (!this.persistEnabled) return;
    try {
      if (typeof window !== 'undefined') return;
      const fs = eval('require')('fs');
      const path = eval('require')('path');
      const full = path.resolve(process.cwd(), 'src/data/launch-catalogue-state.json');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, JSON.stringify({ current: this.current, history: this.history, audit: this.audit }, null, 2));
    } catch {}
  }
}
