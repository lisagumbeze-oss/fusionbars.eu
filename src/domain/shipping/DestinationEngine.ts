// Destination layers stay separate. Missing product eligibility is never treated as allowed.

import { RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { CommercialConfigurationService } from '@/domain/commercial/CommercialConfigurationService';
import { TaxEngine } from '@/domain/commercial/TaxEngine';
import specialistSeed from '@/data/catalogue-specialist-review-state.json';
import firstBatchSeed from '@/data/catalogue-first-batch-state.json';

export type StoreDestinationStatus = 'ENABLED' | 'DISABLED' | 'REVIEW_REQUIRED' | 'NOT_CONFIGURED';
export type ProductCountryDecision = 'ALLOWED' | 'RESTRICTED' | 'BLOCKED' | 'DEFERRED' | 'NOT_CONFIGURED';
export type FulfilmentCapability = 'AVAILABLE' | 'UNAVAILABLE' | 'NOT_CONFIGURED';

export interface RestrictionCondition {
  type: 'FULFILMENT' | 'SHIPPING_METHOD' | 'DOCUMENTATION' | 'INTERNAL_APPROVAL' | 'DESTINATION' | 'PRODUCT';
  detail: string;
  releasesCheckout: boolean;
}

export interface ProductCountryRule {
  id: string;
  productSlug: string;
  country: string;
  decision: ProductCountryDecision;
  rationale: string;
  evidence: string;
  reviewer: string;
  role: RoleName;
  timestamp: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  conditions: RestrictionCondition[];
}

interface DestinationState {
  version: number;
  rules: ProductCountryRule[];
  storeOverlays: Record<string, { status: StoreDestinationStatus; note: string; reviewer: string; timestamp: string }>;
  expressDisabled: string[];
  hubs: Record<'NL' | 'ES' | 'DE' | 'FR', { status: 'ACTIVE' | 'INACTIVE'; express: boolean; priority: number }>;
  ageVerificationAtDelivery: false;
  publicCarrierTracking: false;
  discreetPackaging: true;
  splitOrders: false;
  audit: Array<Record<string, unknown>>;
}

const PILOT = ((firstBatchSeed as { selectedSlugs?: string[] }).selectedSlugs || []).slice(0, 10);
const PUBLIC_UNAVAILABLE = 'This product is not currently available for your destination.';
const PUBLIC_METHOD = 'This delivery method is not available for the selected address.';
const PUBLIC_DESTINATION = 'We are unable to complete delivery to this destination at this time.';

function defaults(): DestinationState {
  return {
    version: 1,
    rules: [],
    storeOverlays: {},
    expressDisabled: [],
    hubs: {
      NL: { status: 'ACTIVE', express: true, priority: 1 },
      ES: { status: 'ACTIVE', express: true, priority: 2 },
      DE: { status: 'ACTIVE', express: true, priority: 3 },
      FR: { status: 'ACTIVE', express: true, priority: 4 },
    },
    ageVerificationAtDelivery: false,
    publicCarrierTracking: false,
    discreetPackaging: true,
    splitOrders: false,
    audit: [],
  };
}

export class DestinationEngine {
  private static cached: DestinationState | null = null;
  private static persistEnabled = true;

  static readonly PRECEDENCE = [
    'Compliance terminal decision',
    'Explicit product and country rule',
    'Specialist product and country decision',
    'Store destination configuration',
    'Unresolved product eligibility remains NOT_CONFIGURED',
  ] as const;

  static resetForTests(): void {
    this.persistEnabled = false;
    this.cached = defaults();
  }

  static get(): DestinationState {
    if (!this.cached) this.cached = defaults();
    return this.cached;
  }

  static canView(role: RoleName): boolean {
    return ['SUPER_ADMIN', 'COMPLIANCE_MANAGER', 'ORDER_MANAGER', 'CATALOG_MANAGER', 'FINANCE_MANAGER'].includes(role);
  }

  static canWriteEligibility(role: RoleName): boolean {
    if (role !== 'SUPER_ADMIN' && role !== 'COMPLIANCE_MANAGER') return false;
    return RBACService.hasPermission(role, '*') || RBACService.hasPermission(role, 'compliance:write');
  }

  static storeStatus(country: string): StoreDestinationStatus {
    const overlay = this.get().storeOverlays[country.toUpperCase()];
    if (overlay) return overlay.status;
    return CountryRegistry.storeDestinationStatus(country);
  }

  static recordRule(params: {
    actor: string;
    actorRole: RoleName;
    productSlug: string;
    country: string;
    decision: ProductCountryDecision;
    rationale: string;
    evidence: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
    conditions?: RestrictionCondition[];
  }): ProductCountryRule {
    if (!this.canWriteEligibility(params.actorRole)) throw new Error(`Unauthorized. Role '${params.actorRole}' cannot record country eligibility.`);
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('A country rule requires rationale and evidence.');
    if (!CountryRegistry.isKnown(params.country) && params.decision !== 'NOT_CONFIGURED') throw new Error('Unknown country code.');
    if (params.decision === 'RESTRICTED' && !(params.conditions || []).length) {
      throw new Error('RESTRICTED requires an explicit condition. None was inferred.');
    }
    if (params.decision === 'ALLOWED' && PILOT.includes(params.productSlug)) {
      throw new Error('Pilot products cannot receive a new country approval from the destination engine.');
    }
    const state = this.get();
    const country = params.country.toUpperCase();
    const previous = state.rules.filter((rule) => rule.productSlug === params.productSlug && rule.country === country);
    const rule: ProductCountryRule = {
      id: `DEST-${state.rules.length + 1}`,
      productSlug: params.productSlug,
      country,
      decision: params.decision,
      rationale: params.rationale.trim(),
      evidence: params.evidence.trim(),
      reviewer: params.actor,
      role: params.actorRole,
      timestamp: new Date().toISOString(),
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo || null,
      version: previous.length + 1,
      conditions: params.conditions || [],
    };
    state.rules.push(rule);
    state.version += 1;
    state.audit.push({
      entity: 'product-country-rule',
      beforeValue: previous.at(-1)?.decision || null,
      afterValue: rule.decision,
      country,
      product: params.productSlug,
      actor: params.actor,
      role: params.actorRole,
      timestamp: rule.timestamp,
      rationale: rule.rationale,
      evidence: rule.evidence,
      effectiveFrom: rule.effectiveFrom,
    });
    return rule;
  }

  static rejectUnsafeBulk(action: string): void {
    if (action === 'ALLOW_ALL_EUROPE' || action === 'ALLOW_ALL_COUNTRIES' || action === 'ALLOW_ALL_PRODUCTS') {
      throw new Error('Bulk country approval is not available.');
    }
    throw new Error('Bulk country approval is not available.');
  }

  static deferProducts(params: { actor: string; actorRole: RoleName; productSlugs: string[]; country: string; reason: string; evidence: string }): void {
    for (const productSlug of params.productSlugs) {
      this.recordRule({
        actor: params.actor,
        actorRole: params.actorRole,
        productSlug,
        country: params.country,
        decision: 'DEFERRED',
        rationale: params.reason,
        evidence: params.evidence,
        effectiveFrom: new Date().toISOString(),
      });
    }
  }

  static evaluate(params: { slug: string; country: string; complianceState?: string | null; at?: string }) {
    const country = params.country.toUpperCase();
    const at = Date.parse(params.at || new Date().toISOString());
    const storeStatus = this.storeStatus(country);
    const compliance = params.complianceState || this.specialistCompliance(params.slug);
    const explicit = this.activeRule(params.slug, country, at);
    const specialist = this.specialistDecision(params.slug, country);
    const hasDecision = Boolean(explicit || specialist);
    const productDecision: ProductCountryDecision = explicit?.decision || specialist || 'NOT_CONFIGURED';
    const complianceBlocks = compliance === 'DO_NOT_PUBLISH' || compliance === 'REJECTED';
    const restrictedOpen = productDecision === 'RESTRICTED' && !(explicit?.conditions || []).some((condition) => condition.releasesCheckout);
    const decisionBlocks = hasDecision && (['BLOCKED', 'DEFERRED', 'NOT_CONFIGURED'].includes(productDecision) || restrictedOpen);
    const productBlocks = complianceBlocks || decisionBlocks;
    const storeBlocks = storeStatus !== 'ENABLED';
    const hub = this.preferredHub(country);
    const fulfilment: FulfilmentCapability = storeBlocks || !hub || this.get().hubs[hub].status !== 'ACTIVE' ? 'UNAVAILABLE' : 'AVAILABLE';
    const explicitlyAllowed = productDecision === 'ALLOWED' && !complianceBlocks && !storeBlocks && fulfilment === 'AVAILABLE';
    return {
      country,
      storeStatus,
      productDecision,
      fulfilment,
      explicitlyAllowed,
      unresolved: !hasDecision,
      blockCheckout: storeBlocks || productBlocks || fulfilment !== 'AVAILABLE',
      customerMessage: storeBlocks ? PUBLIC_DESTINATION : productBlocks ? PUBLIC_UNAVAILABLE : fulfilment !== 'AVAILABLE' ? PUBLIC_DESTINATION : '',
      configurationVersion: this.get().version,
      precedence: this.PRECEDENCE,
    };
  }

  static expressAvailable(country: string): boolean {
    if (this.storeStatus(country) !== 'ENABLED') return false;
    if (this.get().expressDisabled.includes(country.toUpperCase())) return false;
    const hub = this.preferredHub(country);
    return Boolean(hub && this.get().hubs[hub].express && this.get().hubs[hub].status === 'ACTIVE');
  }

  static setStoreStatus(params: { country: string; status: StoreDestinationStatus; actor: string; actorRole: RoleName; rationale: string; evidence: string }): void {
    if (params.actorRole !== 'SUPER_ADMIN' && params.actorRole !== 'COMPLIANCE_MANAGER') {
      throw new Error(`Unauthorized. Role '${params.actorRole}' cannot change store destination status.`);
    }
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('A destination change requires rationale and evidence.');
    const state = this.get();
    const country = params.country.toUpperCase();
    const before = state.storeOverlays[country]?.status || CountryRegistry.storeDestinationStatus(country);
    state.storeOverlays[country] = { status: params.status, note: params.rationale.trim(), reviewer: params.actor, timestamp: new Date().toISOString() };
    state.version += 1;
    state.audit.push({ entity: 'store-destination', beforeValue: before, afterValue: params.status, country, actor: params.actor, role: params.actorRole, timestamp: state.storeOverlays[country].timestamp, rationale: params.rationale.trim(), evidence: params.evidence.trim() });
  }

  static disableExpress(country: string, actor: string, role: RoleName, rationale: string): void {
    if (role !== 'SUPER_ADMIN' && role !== 'ORDER_MANAGER') throw new Error(`Unauthorized. Role '${role}' cannot change shipping methods.`);
    const state = this.get();
    const code = country.toUpperCase();
    if (!state.expressDisabled.includes(code)) state.expressDisabled.push(code);
    state.version += 1;
    state.audit.push({ entity: 'shipping-method', country: code, afterValue: 'EXPRESS_DISABLED', actor, role, timestamp: new Date().toISOString(), rationale, evidence: rationale });
  }

  static shippingTax(country: string, amountMinor: number) {
    return TaxEngine.resolve({ country, taxClass: 'NOT_CONFIGURED', taxableMinor: amountMinor, at: new Date().toISOString() });
  }

  static cohort() {
    const products = (specialistSeed as { products?: Record<string, { countries?: Array<{ decision?: string }>; compliance?: { state?: string } }> }).products || {};
    return PILOT.map((slug) => ({
      slug,
      countryDecisions: products[slug]?.countries?.length || 0,
      eligibility: 'NOT_CONFIGURED' as const,
      compliance: products[slug]?.compliance?.state || 'NOT_CONFIGURED',
    }));
  }

  static summary() {
    const countries = CountryRegistry.getAllCountries();
    const rules = this.get().rules;
    return {
      totalCountries: countries.length,
      enabled: countries.filter((country) => this.storeStatus(country.code) === 'ENABLED').length,
      disabled: countries.filter((country) => this.storeStatus(country.code) === 'DISABLED').length,
      reviewRequired: countries.filter((country) => this.storeStatus(country.code) === 'REVIEW_REQUIRED').length,
      notConfigured: countries.filter((country) => this.storeStatus(country.code) === 'NOT_CONFIGURED').length,
      allowed: rules.filter((rule) => rule.decision === 'ALLOWED').length,
      restricted: rules.filter((rule) => rule.decision === 'RESTRICTED').length,
      blocked: rules.filter((rule) => rule.decision === 'BLOCKED').length,
      deferred: rules.filter((rule) => rule.decision === 'DEFERRED').length,
      pilotNotConfigured: this.cohort().filter((row) => row.eligibility === 'NOT_CONFIGURED').length,
      activeHubs: Object.values(this.get().hubs).filter((hub) => hub.status === 'ACTIVE').length,
      inactiveHubs: Object.values(this.get().hubs).filter((hub) => hub.status !== 'ACTIVE').length,
      audit: this.get().audit.length,
      ageVerificationAtDelivery: this.get().ageVerificationAtDelivery,
      publicCarrierTracking: this.get().publicCarrierTracking,
      discreetPackaging: this.get().discreetPackaging,
      splitOrders: this.get().splitOrders,
      shipping: CommercialConfigurationService.get().shipping,
      precedence: this.PRECEDENCE,
    };
  }

  static publicProjection(decision: { explicitlyAllowed: boolean; customerMessage: string }) {
    return { allowed: decision.explicitlyAllowed, message: decision.customerMessage };
  }

  private static activeRule(slug: string, country: string, at: number): ProductCountryRule | null {
    const matches = this.get().rules.filter((rule) => rule.productSlug === slug && rule.country === country && Date.parse(rule.effectiveFrom) <= at && (!rule.effectiveTo || Date.parse(rule.effectiveTo) > at));
    return matches.sort((a, b) => b.version - a.version)[0] || null;
  }

  private static specialistDecision(slug: string, country: string): ProductCountryDecision | null {
    const products = (specialistSeed as { products?: Record<string, { countries?: Array<{ country?: string; decision?: ProductCountryDecision }> }> }).products || {};
    const match = (products[slug]?.countries || []).find((row) => row.country === country);
    return match?.decision || null;
  }

  private static specialistCompliance(slug: string): string | null {
    const products = (specialistSeed as { products?: Record<string, { compliance?: { state?: string } }> }).products || {};
    return products[slug]?.compliance?.state || null;
  }

  private static preferredHub(country: string): 'NL' | 'ES' | 'DE' | 'FR' | null {
    const code = country.toUpperCase();
    if (['NL', 'BE', 'LU', 'DK', 'SE', 'NO', 'FI', 'IS', 'EE', 'LV', 'LT', 'GB', 'IE'].includes(code)) return 'NL';
    if (['ES', 'PT', 'AD', 'IT', 'GR', 'CY', 'MT', 'SM', 'VA'].includes(code)) return 'ES';
    if (['DE', 'AT', 'CH', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'RO', 'BG', 'LI'].includes(code)) return 'DE';
    if (['FR', 'MC'].includes(code)) return 'FR';
    return null;
  }
}
