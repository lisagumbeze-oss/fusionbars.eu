// Authoritative commercial policy. Empty tax and price ledgers are intentional.
// Missing values stay NOT_CONFIGURED. This service does not invent rates or selling prices.

import { CurrencyCode, MinorUnits, RoleName } from '@/types';
import { RBACService } from '@/domain/auth/RBACService';

export type PricingMode = 'INDEPENDENT' | 'FX_DERIVED';
export type TaxDisplayMode = 'NOT_CONFIGURED' | 'TAX_INCLUDED' | 'TAX_EXCLUDED';
export type CommercialPriceStatus =
  | 'PRICE_REVIEW_PENDING'
  | 'PRICE_DRAFT'
  | 'PRICE_APPROVED'
  | 'PRICE_REJECTED'
  | 'PRICE_DEFERRED'
  | 'PRICE_NOT_APPLICABLE';
export type TaxClass = 'STANDARD' | 'REDUCED' | 'ZERO' | 'EXEMPT' | 'SPECIAL' | 'NOT_CONFIGURED';
export type RoundingStrategy = 'NEAREST_0_01' | 'NEAREST_0_05' | 'PSYCHOLOGICAL' | 'NONE';
export type ThresholdBasis = 'ACTIVE_DISPLAY_CURRENCY' | 'CANONICAL_EUR';
export type PromotionStacking = 'SINGLE' | 'SEQUENTIAL';

export interface CommercialPriceVersion {
  id: string;
  productSlug: string;
  variantId: string | null;
  currency: CurrencyCode;
  amountMinor: MinorUnits;
  basis: 'EXPLICIT' | 'FX_DERIVED';
  effectiveFrom: string;
  effectiveTo: string | null;
  status: CommercialPriceStatus;
  reviewer: string;
  approver: string | null;
  rationale: string;
  evidence: string;
  taxClass: TaxClass;
  createdAt: string;
  updatedAt: string;
  version: number;
  sourceCurrency: string | null;
  sourceAmount: number | null;
}

export type TaxConfigStatus = 'NOT_CONFIGURED' | 'DRAFT' | 'REVIEW_REQUIRED' | 'APPROVED' | 'ACTIVE' | 'SUPERSEDED' | 'REJECTED';

export interface VatRateVersion {
  id: string;
  country: string;
  taxClass: TaxClass;
  rateBps: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  evidence: string;
  rationale: string;
  status: TaxConfigStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  activatedBy: string | null;
  activatedAt: string | null;
  createdAt: string;
}

export interface FxRateVersion {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  rateScaled: number;
  provider: string;
  rateTimestamp: string;
  markupBps: number;
  rounding: RoundingStrategy;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface CommercialAuditEvent {
  id: string;
  entity: string;
  beforeValue: unknown;
  afterValue: unknown;
  currency: string | null;
  amountMinor: number | null;
  country: string | null;
  taxClass: string | null;
  taxRateBps: number | null;
  actor: string;
  role: RoleName;
  timestamp: string;
  rationale: string;
  evidence: string;
  effectiveFrom: string | null;
}

export interface CommercialState {
  version: number;
  currency: { primary: 'EUR'; supported: CurrencyCode[]; pricingMode: PricingMode };
  precision: { minorUnitFactor: 100; roundingMode: 'HALF_UP'; intermediateRounding: 'NONE' };
  roundingStrategy: RoundingStrategy;
  fourEyes: boolean;
  priceLock: 'RECALCULATE_AT_CHECKOUT';
  fx: { status: 'NOT_CONFIGURED' | 'CONFIGURED'; maxAgeHours: number | null; rates: FxRateVersion[] };
  tax: {
    displayMode: TaxDisplayMode;
    classes: TaxClass[];
    jurisdictions: string[];
    rates: VatRateVersion[];
    exemptions: Array<{ id: string; country: string; taxClass: TaxClass; evidence: string; approvedBy: string; effectiveFrom: string; effectiveTo: string | null }>;
    productClasses: Record<string, TaxClass>;
    shippingTaxClass: TaxClass;
  };
  shipping: {
    strategy: 'EXPLICIT_PER_CURRENCY';
    thresholdBasis: ThresholdBasis;
    discreetPackaging: true;
    hubs: Array<'NL' | 'ES' | 'DE' | 'FR'>;
    rates: Record<CurrencyCode, { STANDARD: MinorUnits; EXPRESS: MinorUnits; FREE_THRESHOLD: MinorUnits }>;
  };
  promotions: { stacking: PromotionStacking; allowBelowZero: false };
  prices: CommercialPriceVersion[];
  audit: CommercialAuditEvent[];
}

const TAX_CLASSES: TaxClass[] = ['STANDARD', 'REDUCED', 'ZERO', 'EXEMPT', 'SPECIAL', 'NOT_CONFIGURED'];

function defaults(): CommercialState {
  return {
    version: 1,
    currency: { primary: 'EUR', supported: ['EUR', 'GBP'], pricingMode: 'INDEPENDENT' },
    precision: { minorUnitFactor: 100, roundingMode: 'HALF_UP', intermediateRounding: 'NONE' },
    roundingStrategy: 'NEAREST_0_01',
    fourEyes: false,
    priceLock: 'RECALCULATE_AT_CHECKOUT',
    fx: { status: 'NOT_CONFIGURED', maxAgeHours: null, rates: [] },
    tax: { displayMode: 'NOT_CONFIGURED', classes: [...TAX_CLASSES], jurisdictions: [], rates: [], exemptions: [], productClasses: {}, shippingTaxClass: 'NOT_CONFIGURED' },
    shipping: {
      strategy: 'EXPLICIT_PER_CURRENCY',
      thresholdBasis: 'ACTIVE_DISPLAY_CURRENCY',
      discreetPackaging: true,
      hubs: ['NL', 'ES', 'DE', 'FR'],
      rates: {
        EUR: { STANDARD: 1500, EXPRESS: 2000, FREE_THRESHOLD: 30000 },
        GBP: { STANDARD: 1300, EXPRESS: 1750, FREE_THRESHOLD: 26000 },
      },
    },
    promotions: { stacking: 'SINGLE', allowBelowZero: false },
    prices: [],
    audit: [],
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function getFs(): any {
  try {
    if (typeof window === 'undefined') return eval('require')('fs');
  } catch {}
  return null;
}

export class CommercialConfigurationService {
  private static cached: CommercialState | null = null;
  private static persistEnabled = true;

  static resetForTests(): CommercialState {
    this.persistEnabled = false;
    this.cached = defaults();
    return this.cached;
  }

  static get(): CommercialState {
    if (!this.cached) this.cached = this.read() || defaults();
    return this.cached;
  }

  static canView(role: RoleName): boolean {
    return role === 'SUPER_ADMIN' || role === 'FINANCE_MANAGER' || role === 'CATALOG_MANAGER';
  }

  static canWrite(role: RoleName): boolean {
    if (role !== 'SUPER_ADMIN' && role !== 'FINANCE_MANAGER') return false;
    return RBACService.hasPermission(role, '*') || RBACService.hasPermission(role, 'finance:write');
  }

  static assertWrite(role: RoleName): void {
    if (!this.canWrite(role)) throw new Error(`Unauthorized. Role '${role}' cannot change commercial configuration.`);
  }

  static shippingRates(currency: CurrencyCode) {
    const rates = this.get().shipping.rates[currency];
    if (!rates) throw new Error(`CONFIGURATION_REQUIRED: shipping is not configured for ${currency}.`);
    return rates;
  }

  static updatePolicy(params: {
    actor: string;
    actorRole: RoleName;
    rationale: string;
    evidence: string;
    pricingMode?: PricingMode;
    fourEyes?: boolean;
    roundingStrategy?: RoundingStrategy;
    taxDisplayMode?: TaxDisplayMode;
    thresholdBasis?: ThresholdBasis;
    stacking?: PromotionStacking;
    fxMaxAgeHours?: number | null;
  }): CommercialState {
    this.assertWrite(params.actorRole);
    if (!params.rationale?.trim() || !params.evidence?.trim()) {
      throw new Error('A commercial policy change requires rationale and evidence.');
    }
    const state = this.get();
    const before = clone({
      pricingMode: state.currency.pricingMode,
      fourEyes: state.fourEyes,
      roundingStrategy: state.roundingStrategy,
      taxDisplayMode: state.tax.displayMode,
      thresholdBasis: state.shipping.thresholdBasis,
      stacking: state.promotions.stacking,
      fxMaxAgeHours: state.fx.maxAgeHours,
    });
    if (params.pricingMode) {
      if (params.pricingMode !== 'INDEPENDENT' && params.pricingMode !== 'FX_DERIVED') throw new Error('Unsupported pricing mode.');
      state.currency.pricingMode = params.pricingMode;
    }
    if (params.fourEyes != null) state.fourEyes = params.fourEyes;
    if (params.roundingStrategy) {
      if (!['NEAREST_0_01', 'NEAREST_0_05', 'PSYCHOLOGICAL', 'NONE'].includes(params.roundingStrategy)) {
        throw new Error('Unsupported rounding strategy.');
      }
      state.roundingStrategy = params.roundingStrategy;
    }
    if (params.taxDisplayMode) {
      if (!['NOT_CONFIGURED', 'TAX_INCLUDED', 'TAX_EXCLUDED'].includes(params.taxDisplayMode)) throw new Error('Unsupported tax display mode.');
      state.tax.displayMode = params.taxDisplayMode;
    }
    if (params.thresholdBasis) {
      if (params.thresholdBasis !== 'ACTIVE_DISPLAY_CURRENCY' && params.thresholdBasis !== 'CANONICAL_EUR') {
        throw new Error('Unsupported free-shipping threshold basis.');
      }
      state.shipping.thresholdBasis = params.thresholdBasis;
    }
    if (params.stacking) {
      if (params.stacking !== 'SINGLE' && params.stacking !== 'SEQUENTIAL') throw new Error('Unsupported promotion stacking.');
      state.promotions.stacking = params.stacking;
    }
    if (params.fxMaxAgeHours !== undefined) {
      if (params.fxMaxAgeHours != null && (!Number.isInteger(params.fxMaxAgeHours) || params.fxMaxAgeHours < 0)) {
        throw new Error('FX maximum age must be a non-negative integer hour value or left unconfigured.');
      }
      state.fx.maxAgeHours = params.fxMaxAgeHours;
    }
    state.version += 1;
    this.audit(state, {
      entity: 'commercial-policy',
      beforeValue: before,
      afterValue: {
        pricingMode: state.currency.pricingMode,
        fourEyes: state.fourEyes,
        roundingStrategy: state.roundingStrategy,
        taxDisplayMode: state.tax.displayMode,
        thresholdBasis: state.shipping.thresholdBasis,
        stacking: state.promotions.stacking,
        fxMaxAgeHours: state.fx.maxAgeHours,
      },
      currency: null,
      amountMinor: null,
      country: null,
      taxClass: null,
      taxRateBps: null,
      actor: params.actor,
      role: params.actorRole,
      rationale: params.rationale.trim(),
      evidence: params.evidence.trim(),
      effectiveFrom: null,
    });
    this.persist();
    return state;
  }

  static draftPrice(params: {
    actor: string;
    actorRole: RoleName;
    productSlug: string;
    variantId?: string | null;
    currency: CurrencyCode;
    amountMinor: MinorUnits;
    effectiveFrom: string;
    effectiveTo?: string | null;
    rationale: string;
    evidence: string;
    taxClass: TaxClass;
    sourceCurrency?: string | null;
    sourceAmount?: number | null;
  }): CommercialPriceVersion {
    this.assertWrite(params.actorRole);
    this.assertAmount(params.amountMinor, params.currency);
    this.assertDate(params.effectiveFrom);
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('A draft price requires rationale and evidence.');
    if (!TAX_CLASSES.includes(params.taxClass)) throw new Error('Tax class must be an explicit configuration value.');
    const state = this.get();
    const now = new Date().toISOString();
    const record: CommercialPriceVersion = {
      id: `CPR-${state.prices.length + 1}`,
      productSlug: params.productSlug,
      variantId: params.variantId || null,
      currency: params.currency,
      amountMinor: params.amountMinor,
      basis: 'EXPLICIT',
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo || null,
      status: 'PRICE_DRAFT',
      reviewer: params.actor,
      approver: null,
      rationale: params.rationale.trim(),
      evidence: params.evidence.trim(),
      taxClass: params.taxClass,
      createdAt: now,
      updatedAt: now,
      version: state.prices.filter((row) => row.productSlug === params.productSlug && row.currency === params.currency).length + 1,
      sourceCurrency: params.sourceCurrency || null,
      sourceAmount: params.sourceAmount ?? null,
    };
    state.prices.push(record);
    state.version += 1;
    this.audit(state, {
      entity: 'commercial-price',
      beforeValue: null,
      afterValue: { id: record.id, status: record.status, version: record.version },
      currency: record.currency,
      amountMinor: record.amountMinor,
      country: null,
      taxClass: record.taxClass,
      taxRateBps: null,
      actor: params.actor,
      role: params.actorRole,
      rationale: record.rationale,
      evidence: record.evidence,
      effectiveFrom: record.effectiveFrom,
    });
    this.persist();
    return record;
  }

  static approvePrice(params: { actor: string; actorRole: RoleName; priceId: string; rationale: string; evidence: string }): CommercialPriceVersion {
    this.assertWrite(params.actorRole);
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('Price approval requires rationale and evidence.');
    const state = this.get();
    const draft = state.prices.find((row) => row.id === params.priceId);
    if (!draft) throw new Error('Commercial price record was not found.');
    if (draft.status !== 'PRICE_DRAFT') throw new Error('Only a draft commercial price can be approved.');
    if (state.fourEyes && draft.reviewer === params.actor) {
      throw new Error('Four-eyes approval requires a different authorised reviewer.');
    }
    const candidate = { ...draft, status: 'PRICE_APPROVED' as const, effectiveTo: draft.effectiveTo };
    const clash = state.prices.find((row) => row.status === 'PRICE_APPROVED' && this.sameTarget(row, candidate) && this.overlaps(row, candidate));
    if (clash) throw new Error('An active commercial price already covers this effective period.');
    const now = new Date().toISOString();
    const approved: CommercialPriceVersion = {
      ...draft,
      id: `CPR-${state.prices.length + 1}`,
      status: 'PRICE_APPROVED',
      approver: params.actor,
      rationale: params.rationale.trim(),
      evidence: params.evidence.trim(),
      version: draft.version + 1,
      updatedAt: now,
      createdAt: now,
    };
    state.prices.push(approved);
    state.version += 1;
    this.audit(state, {
      entity: 'commercial-price',
      beforeValue: { id: draft.id, status: draft.status, amountMinor: draft.amountMinor },
      afterValue: { id: approved.id, status: approved.status, version: approved.version },
      currency: approved.currency,
      amountMinor: approved.amountMinor,
      country: null,
      taxClass: approved.taxClass,
      taxRateBps: null,
      actor: params.actor,
      role: params.actorRole,
      rationale: approved.rationale,
      evidence: approved.evidence,
      effectiveFrom: approved.effectiveFrom,
    });
    this.persist();
    return approved;
  }

  static rejectPrice(params: { actor: string; actorRole: RoleName; priceId: string; rationale: string; evidence: string }): CommercialPriceVersion {
    this.assertWrite(params.actorRole);
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('Price rejection requires rationale and evidence.');
    const state = this.get();
    const draft = state.prices.find((row) => row.id === params.priceId);
    if (!draft || draft.status !== 'PRICE_DRAFT') throw new Error('Only a draft commercial price can be rejected.');
    const now = new Date().toISOString();
    const rejected: CommercialPriceVersion = { ...draft, id: `CPR-${state.prices.length + 1}`, status: 'PRICE_REJECTED', approver: params.actor, rationale: params.rationale.trim(), evidence: params.evidence.trim(), version: draft.version + 1, updatedAt: now, createdAt: now };
    state.prices.push(rejected);
    state.version += 1;
    this.audit(state, {
      entity: 'commercial-price',
      beforeValue: { id: draft.id, status: draft.status },
      afterValue: { id: rejected.id, status: rejected.status },
      currency: rejected.currency,
      amountMinor: rejected.amountMinor,
      country: null,
      taxClass: rejected.taxClass,
      taxRateBps: null,
      actor: params.actor,
      role: params.actorRole,
      rationale: rejected.rationale,
      evidence: rejected.evidence,
      effectiveFrom: rejected.effectiveFrom,
    });
    this.persist();
    return rejected;
  }

  static addVatRate(params: {
    actor: string;
    actorRole: RoleName;
    country: string;
    taxClass: TaxClass;
    rateBps: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
    evidence: string;
  }): VatRateVersion {
    this.assertWrite(params.actorRole);
    if (!/^[A-Z]{2}$/.test(params.country)) throw new Error('VAT jurisdiction must be an explicit ISO country code.');
    if (!TAX_CLASSES.includes(params.taxClass) || params.taxClass === 'NOT_CONFIGURED') {
      throw new Error('A VAT rate requires an explicit tax class.');
    }
    if (!Number.isInteger(params.rateBps) || params.rateBps < 0 || params.rateBps > 10000) {
      throw new Error('VAT rate must be an integer basis-point value from 0 to 10000.');
    }
    this.assertDate(params.effectiveFrom);
    if (!params.evidence?.trim()) throw new Error('A VAT rate requires evidence.');
    const state = this.get();
    const record: VatRateVersion = {
      id: `VAT-${state.tax.rates.length + 1}`,
      country: params.country,
      taxClass: params.taxClass,
      rateBps: params.rateBps,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo || null,
      evidence: params.evidence.trim(),
      rationale: 'Draft VAT rate. Entering a number does not activate it.',
      status: 'DRAFT',
      approvedBy: null,
      approvedAt: null,
      activatedBy: null,
      activatedAt: null,
      createdAt: new Date().toISOString(),
    };
    const clash = state.tax.rates.find((row) => row.status !== 'REJECTED' && row.status !== 'SUPERSEDED' && row.country === record.country && row.taxClass === record.taxClass && this.overlaps(row, record));
    if (clash) throw new Error('A VAT rate already covers this jurisdiction, class, and effective period.');
    state.tax.rates.push(record);
    state.version += 1;
    this.audit(state, {
      entity: 'vat-rate',
      beforeValue: null,
      afterValue: { id: record.id, rateBps: record.rateBps, status: record.status },
      currency: null,
      amountMinor: null,
      country: record.country,
      taxClass: record.taxClass,
      taxRateBps: record.rateBps,
      actor: params.actor,
      role: params.actorRole,
      rationale: 'Explicit VAT rate configuration.',
      evidence: record.evidence,
      effectiveFrom: record.effectiveFrom,
    });
    this.persist();
    return record;
  }

  static approveVatRate(params: { actor: string; actorRole: RoleName; rateId: string; rationale: string; evidence: string }): VatRateVersion {
    if (params.actorRole !== 'SUPER_ADMIN') throw new Error('Only SUPER_ADMIN can approve a tax rate.');
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('Tax approval requires rationale and evidence.');
    const state = this.get();
    const rate = state.tax.rates.find((row) => row.id === params.rateId);
    if (!rate || (rate.status !== 'DRAFT' && rate.status !== 'REVIEW_REQUIRED')) throw new Error('Only a draft tax rate can be approved.');
    const before = rate.status;
    rate.status = 'APPROVED';
    rate.approvedBy = params.actor;
    rate.approvedAt = new Date().toISOString();
    rate.rationale = params.rationale.trim();
    rate.evidence = params.evidence.trim();
    state.version += 1;
    this.audit(state, {
      entity: 'vat-rate',
      beforeValue: { id: rate.id, status: before, rateBps: rate.rateBps },
      afterValue: { id: rate.id, status: rate.status, rateBps: rate.rateBps },
      currency: null,
      amountMinor: null,
      country: rate.country,
      taxClass: rate.taxClass,
      taxRateBps: rate.rateBps,
      actor: params.actor,
      role: params.actorRole,
      rationale: rate.rationale,
      evidence: rate.evidence,
      effectiveFrom: rate.effectiveFrom,
    });
    this.persist();
    return rate;
  }

  static activateVatRate(params: { actor: string; actorRole: RoleName; rateId: string; confirmation: string; rationale: string }): VatRateVersion {
    if (params.actorRole !== 'SUPER_ADMIN') throw new Error('Only SUPER_ADMIN can activate a tax rate.');
    if (params.confirmation !== 'ACTIVATE_TAX_RATE') throw new Error('Explicit tax activation is required.');
    if (!params.rationale?.trim()) throw new Error('Tax activation requires a rationale.');
    const state = this.get();
    const rate = state.tax.rates.find((row) => row.id === params.rateId);
    if (!rate || rate.status !== 'APPROVED') throw new Error('Only an approved tax rate can be activated.');
    for (const current of state.tax.rates) {
      if (current.id !== rate.id && current.status === 'ACTIVE' && current.country === rate.country && current.taxClass === rate.taxClass && this.overlaps(current, rate)) {
        current.status = 'SUPERSEDED';
      }
    }
    rate.status = 'ACTIVE';
    rate.activatedBy = params.actor;
    rate.activatedAt = new Date().toISOString();
    rate.rationale = params.rationale.trim();
    if (!state.tax.jurisdictions.includes(rate.country)) state.tax.jurisdictions.push(rate.country);
    state.version += 1;
    this.audit(state, {
      entity: 'vat-rate',
      beforeValue: { id: rate.id, status: 'APPROVED', rateBps: rate.rateBps },
      afterValue: { id: rate.id, status: rate.status, rateBps: rate.rateBps },
      currency: null,
      amountMinor: null,
      country: rate.country,
      taxClass: rate.taxClass,
      taxRateBps: rate.rateBps,
      actor: params.actor,
      role: params.actorRole,
      rationale: rate.rationale,
      evidence: rate.evidence,
      effectiveFrom: rate.effectiveFrom,
    });
    this.persist();
    return rate;
  }

  static setShippingTaxClass(params: { actor: string; actorRole: RoleName; taxClass: TaxClass; rationale: string; evidence: string }): void {
    if (params.actorRole !== 'SUPER_ADMIN') throw new Error('Only SUPER_ADMIN can set shipping tax treatment.');
    if (!TAX_CLASSES.includes(params.taxClass)) throw new Error('Shipping tax class must be explicit.');
    if (!params.rationale?.trim() || !params.evidence?.trim()) throw new Error('Shipping tax treatment requires rationale and evidence.');
    const state = this.get();
    const before = state.tax.shippingTaxClass || 'NOT_CONFIGURED';
    state.tax.shippingTaxClass = params.taxClass;
    state.version += 1;
    this.audit(state, {
      entity: 'shipping-tax-class',
      beforeValue: before,
      afterValue: params.taxClass,
      currency: null,
      amountMinor: null,
      country: null,
      taxClass: params.taxClass,
      taxRateBps: null,
      actor: params.actor,
      role: params.actorRole,
      rationale: params.rationale.trim(),
      evidence: params.evidence.trim(),
      effectiveFrom: null,
    });
    this.persist();
  }

  static taxReadiness(): { displayMode: TaxDisplayMode; shippingTaxClass: TaxClass; jurisdictions: string[]; activeRates: number; state: 'TAX_CONFIGURATION_REQUIRED' | 'CONFIGURED' } {
    const tax = this.get().tax;
    const activeRates = tax.rates.filter((row) => row.status === 'ACTIVE').length;
    const configured = tax.displayMode !== 'NOT_CONFIGURED' && activeRates > 0;
    return {
      displayMode: tax.displayMode,
      shippingTaxClass: tax.shippingTaxClass || 'NOT_CONFIGURED',
      jurisdictions: [...tax.jurisdictions],
      activeRates,
      state: configured ? 'CONFIGURED' : 'TAX_CONFIGURATION_REQUIRED',
    };
  }

  static assignTaxClass(params: { actor: string; actorRole: RoleName; productSlug: string; taxClass: TaxClass; evidence: string }): void {
    this.assertWrite(params.actorRole);
    if (!TAX_CLASSES.includes(params.taxClass)) throw new Error('Tax class must be explicit.');
    if (!params.evidence?.trim()) throw new Error('A tax-class decision requires evidence.');
    const state = this.get();
    const before = state.tax.productClasses[params.productSlug] || null;
    state.tax.productClasses[params.productSlug] = params.taxClass;
    state.version += 1;
    this.audit(state, {
      entity: 'tax-class',
      beforeValue: before,
      afterValue: params.taxClass,
      currency: null,
      amountMinor: null,
      country: null,
      taxClass: params.taxClass,
      taxRateBps: null,
      actor: params.actor,
      role: params.actorRole,
      rationale: 'Explicit product tax class.',
      evidence: params.evidence.trim(),
      effectiveFrom: null,
    });
    this.persist();
  }

  static addFxRate(params: {
    actor: string;
    actorRole: RoleName;
    sourceCurrency: string;
    targetCurrency: string;
    rateScaled: number;
    provider: string;
    rateTimestamp: string;
    markupBps: number;
    evidence: string;
    effectiveFrom: string;
  }): FxRateVersion {
    this.assertWrite(params.actorRole);
    if (this.get().currency.pricingMode !== 'FX_DERIVED') {
      throw new Error('FX rates cannot be stored while pricing mode is INDEPENDENT.');
    }
    if (!Number.isInteger(params.rateScaled) || params.rateScaled <= 0) throw new Error('FX rate must be a positive integer scaled by 1,000,000.');
    if (!params.provider?.trim() || !params.evidence?.trim()) throw new Error('An FX rate requires a provider and evidence.');
    this.assertDate(params.rateTimestamp);
    this.assertDate(params.effectiveFrom);
    const state = this.get();
    const record: FxRateVersion = {
      id: `FX-${state.fx.rates.length + 1}`,
      sourceCurrency: params.sourceCurrency,
      targetCurrency: params.targetCurrency,
      rateScaled: params.rateScaled,
      provider: params.provider.trim(),
      rateTimestamp: params.rateTimestamp,
      markupBps: params.markupBps,
      rounding: state.roundingStrategy,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: null,
    };
    state.fx.rates.push(record);
    state.fx.status = 'CONFIGURED';
    state.version += 1;
    this.audit(state, {
      entity: 'fx-rate',
      beforeValue: null,
      afterValue: { id: record.id, rateScaled: record.rateScaled, provider: record.provider },
      currency: params.targetCurrency,
      amountMinor: null,
      country: null,
      taxClass: null,
      taxRateBps: null,
      actor: params.actor,
      role: params.actorRole,
      rationale: 'Explicit stored FX rate. Checkout does not call a live FX provider.',
      evidence: params.evidence.trim(),
      effectiveFrom: record.effectiveFrom,
    });
    this.persist();
    return record;
  }

  static previewExplicitPrices(rows: Array<{ productSlug?: string; currency?: string; amountMinor?: number; taxClass?: string; effectiveFrom?: string }>) {
    return rows.map((row, index) => {
      const errors: string[] = [];
      if (!row.productSlug) errors.push('product is required');
      if (row.currency !== 'EUR' && row.currency !== 'GBP') errors.push('currency must be EUR or GBP');
      if (!Number.isInteger(row.amountMinor) || (row.amountMinor || 0) <= 0) errors.push('amount must be a positive minor-unit integer');
      if (!row.taxClass || !TAX_CLASSES.includes(row.taxClass as TaxClass)) errors.push('tax class is required');
      if (!row.effectiveFrom || Number.isNaN(Date.parse(row.effectiveFrom))) errors.push('effective date is required');
      return { line: index + 1, productSlug: row.productSlug || '', currency: row.currency || '', amountMinor: row.amountMinor ?? null, taxClass: row.taxClass || '', effectiveFrom: row.effectiveFrom || '', errors };
    });
  }

  static confirmExplicitPrices(params: {
    actor: string;
    actorRole: RoleName;
    confirmation: string;
    rows: Array<{ productSlug: string; currency: CurrencyCode; amountMinor: number; taxClass: TaxClass; effectiveFrom: string; rationale: string; evidence: string }>;
  }): CommercialPriceVersion[] {
    if (params.confirmation !== 'APPLY_EXPLICIT_PRICES') throw new Error('Explicit confirmation is required before prices are stored.');
    const preview = this.previewExplicitPrices(params.rows);
    if (preview.some((row) => row.errors.length)) throw new Error('The price import still has validation errors.');
    return params.rows.map((row) => {
      const draft = this.draftPrice({ ...row, actor: params.actor, actorRole: params.actorRole, variantId: null });
      return this.approvePrice({ actor: params.actor, actorRole: params.actorRole, priceId: draft.id, rationale: row.rationale, evidence: row.evidence });
    });
  }

  static rejectUnsafeBulk(action: string): void {
    if (action === 'CONVERT_ALL_USD_TO_EUR' || action === 'APPLY_ONE_PRICE_TO_ALL' || action === 'APPROVE_ALL_PRICES') {
      throw new Error('Bulk pricing conversion is not available.');
    }
    throw new Error('Bulk pricing conversion is not available.');
  }

  private static sameTarget(a: { productSlug: string; variantId: string | null; currency: string }, b: { productSlug: string; variantId: string | null; currency: string }) {
    return a.productSlug === b.productSlug && a.variantId === b.variantId && a.currency === b.currency;
  }

  private static overlaps(a: { effectiveFrom: string; effectiveTo: string | null }, b: { effectiveFrom: string; effectiveTo: string | null }) {
    const startA = Date.parse(a.effectiveFrom);
    const endA = a.effectiveTo ? Date.parse(a.effectiveTo) : Number.POSITIVE_INFINITY;
    const startB = Date.parse(b.effectiveFrom);
    const endB = b.effectiveTo ? Date.parse(b.effectiveTo) : Number.POSITIVE_INFINITY;
    return startA < endB && startB < endA;
  }

  private static assertAmount(amount: number, currency: string): void {
    if (currency !== 'EUR' && currency !== 'GBP') throw new Error('Unsupported currency.');
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Commercial amount must be a positive integer minor-unit value.');
  }

  private static assertDate(value: string): void {
    if (!value || Number.isNaN(Date.parse(value))) throw new Error('A valid effective date is required.');
  }

  private static audit(state: CommercialState, event: Omit<CommercialAuditEvent, 'id' | 'timestamp'>): void {
    state.audit.push({ ...event, id: `COM-AUD-${state.audit.length + 1}`, timestamp: new Date().toISOString() });
  }

  private static read(): CommercialState | null {
    const fs = getFs();
    if (!this.persistEnabled || !fs) return null;
    try {
      const path = eval('require')('path');
      const full = path.resolve(process.cwd(), 'src/data/commercial-configuration-state.json');
      if (!fs.existsSync(full)) return null;
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (parsed?.version && parsed?.shipping?.rates?.EUR) return parsed;
    } catch {}
    return null;
  }

  private static persist(): void {
    if (!this.persistEnabled || !this.cached) return;
    const fs = getFs();
    if (!fs) return;
    try {
      const path = eval('require')('path');
      const full = path.resolve(process.cwd(), 'src/data/commercial-configuration-state.json');
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, JSON.stringify(this.cached, null, 2));
    } catch {}
  }
}
