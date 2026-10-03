// Production payment readiness. Placeholder credentials stay TEST and cannot become ACTIVE.

import { RoleName } from '@/types';
import { PaymentConfigService } from '@/domain/payments/PaymentConfig';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { GBP_LAUNCH_MODE } from '@/domain/launch/launch-policy';
import { bicFormat, ibanFormat, receivingAddressFormat, FormatState } from '@/domain/payments/payment-format';
import { StorageReadinessService } from '@/services/storage/StorageReadinessService';
import { EmailProductionReadinessService } from '@/services/email/EmailProductionReadinessService';

export type PaymentConfigState = 'NOT_CONFIGURED' | 'TEST' | 'REVIEW_REQUIRED' | 'READY' | 'ACTIVE' | 'DISABLED' | 'FAILED';
export type BusinessVerificationState = 'NOT_VERIFIED' | 'VERIFIED' | 'REJECTED';
type AssetCode = 'BTC' | 'USDT' | 'ETH';

interface MethodRecord {
  code: string;
  state: PaymentConfigState;
  version: number;
  history: Array<{ at: string; from: PaymentConfigState; to: PaymentConfigState; actor: string; role: RoleName; rationale: string }>;
}

interface VerificationRecord {
  state: BusinessVerificationState;
  reviewer: string | null;
  at: string | null;
  evidence: string | null;
}

interface CryptoRateRecord {
  asset: string;
  rate: string;
  source: string;
  at: string;
  currency: string;
  strategy: 'FIXED_APPROVED' | 'PROVIDER_DERIVED';
  version: string;
  maxAgeSeconds: number | null;
}

function placeholder(value: string): boolean {
  const text = value.toLowerCase();
  return !text || text.includes('placeholder') || text.includes('test_only') || text.includes('test') || text.includes('0000000000') || text.includes('dead');
}

function explicitEnv(name: string): string {
  return process.env[name]?.trim() || '';
}

export class PaymentConfigurationService {
  private static methods = new Map<string, MethodRecord>();
  private static audit: Array<Record<string, unknown>> = [];
  private static expirationHours: number | null = null;
  private static storedCryptoRate: CryptoRateRecord | null = null;
  private static approvedCurrencies: string[] = [];
  private static bankVerification: VerificationRecord = { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null };
  private static addressVerification: Record<AssetCode, VerificationRecord> = {
    BTC: { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null },
    USDT: { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null },
    ETH: { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null },
  };
  private static assetApproval: Record<AssetCode, boolean> = { BTC: false, USDT: false, ETH: false };
  private static networkApproval: Record<AssetCode, boolean> = { BTC: false, USDT: false, ETH: false };
  private static controlledTests: Record<string, 'NOT_RUN' | 'PASSED' | 'FAILED'> = { SEPA_IBAN: 'NOT_RUN', CRYPTO_BTC: 'NOT_RUN', CRYPTO_USDT: 'NOT_RUN', CRYPTO_ETH: 'NOT_RUN' };
  private static prerequisiteOverride: { evidence?: boolean; notifications?: boolean } | null = null;
  private static customerModeOverride: 'production' | 'development' | null = null;

  static resetForTests(): void {
    this.methods.clear();
    this.audit = [];
    this.expirationHours = null;
    this.storedCryptoRate = null;
    this.approvedCurrencies = [];
    this.bankVerification = { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null };
    this.addressVerification = {
      BTC: { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null },
      USDT: { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null },
      ETH: { state: 'NOT_VERIFIED', reviewer: null, at: null, evidence: null },
    };
    this.assetApproval = { BTC: false, USDT: false, ETH: false };
    this.networkApproval = { BTC: false, USDT: false, ETH: false };
    this.controlledTests = { SEPA_IBAN: 'NOT_RUN', CRYPTO_BTC: 'NOT_RUN', CRYPTO_USDT: 'NOT_RUN', CRYPTO_ETH: 'NOT_RUN' };
    this.prerequisiteOverride = null;
    this.customerModeOverride = null;
  }

  static forceCustomerModeForTests(mode: 'production' | 'development' | null): void {
    this.customerModeOverride = mode;
  }

  static usePrerequisiteOverrideForTests(value: { evidence?: boolean; notifications?: boolean } | null): void {
    this.prerequisiteOverride = value;
  }

  static customerReference(orderNumber: string): string {
    const safe = orderNumber.replace(/[^A-Z0-9-]/gi, '');
    return `FUSION-${safe}`;
  }

  static productionCheckoutRequired(): boolean {
    if (this.customerModeOverride) return this.customerModeOverride === 'production';
    return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  }

  static customerMethods(): { mode: 'production' | 'development'; methods: Array<{ code: string; name: string }> } {
    const methods = PaymentConfigService.getPublicPaymentOptions()
      .filter((option) => option.code === 'SEPA_IBAN' || option.code === 'CRYPTO_BTC')
      .filter((option) => this.overlay(option.code) !== 'DISABLED')
      .map((option) => ({ code: option.code, name: option.name }));
    return {
      mode: this.productionCheckoutRequired() ? 'production' : 'development',
      methods,
    };
  }

  static bankState(): PaymentConfigState {
    return this.overlay('SEPA_IBAN') || this.inferredBank();
  }

  static cryptoState(asset: AssetCode): PaymentConfigState {
    return this.overlay(`CRYPTO_${asset}`) || this.inferredCrypto(asset);
  }

  static productionOptions(): string[] {
    return ['SEPA_IBAN', 'CRYPTO_BTC', 'CRYPTO_USDT', 'CRYPTO_ETH'].filter((code) => this.stateFor(code) === 'ACTIVE');
  }

  static blockers(code: string): string[] {
    const blockers: string[] = [];
    if (code === 'SEPA_IBAN') blockers.push(...this.bankBlockers());
    if (code.startsWith('CRYPTO_')) blockers.push(...this.cryptoBlockers(code.replace('CRYPTO_', '') as AssetCode));
    if (this.controlledTests[code] !== 'PASSED') blockers.push('A controlled payment test has not been recorded.');
    if (!this.evidenceReady()) blockers.push('Private payment evidence storage is not production-ready.');
    if (!this.notificationsReady()) blockers.push('Customer payment notifications are not active.');
    if (this.stateFor(code) === 'DISABLED') blockers.push(`${code} is disabled.`);
    return blockers;
  }

  static activate(params: { code: string; actor: string; role: RoleName; confirmation: string; rationale: string }): { success: false; error: string } | { success: true; state: PaymentConfigState } {
    if (params.role !== 'SUPER_ADMIN') return { success: false, error: 'Only SUPER_ADMIN can activate a payment method.' };
    if (params.confirmation !== 'ACTIVATE_PAYMENT_METHOD') return { success: false, error: 'Explicit activation confirmation is required.' };
    const blockers = this.blockers(params.code);
    if (blockers.length) return { success: false, error: blockers[0] };
    this.transition(params.code, 'ACTIVE', params.actor, params.role, params.rationale);
    return { success: true, state: 'ACTIVE' };
  }

  static disable(params: { code: string; actor: string; role: RoleName; rationale: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized payment configuration change.');
    this.transition(params.code, 'DISABLED', params.actor, params.role, params.rationale);
  }

  static recordBankVerification(params: { role: RoleName; reviewer: string; decision: BusinessVerificationState; evidence: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized bank verification.');
    if (params.decision === 'VERIFIED' && (this.inferredBank() === 'TEST' || this.inferredBank() === 'NOT_CONFIGURED' || ibanFormat(PaymentConfigService.getBankConfig().iban) !== 'FORMAT_VALID')) {
      throw new Error('Bank details cannot be verified from a placeholder or invalid account.');
    }
    if (this.containsSecret(params.evidence)) throw new Error('Bank verification evidence cannot contain account credentials.');
    this.bankVerification = { state: params.decision, reviewer: params.reviewer, at: new Date().toISOString(), evidence: params.evidence.slice(0, 80) };
    this.audit.push({ action: 'BANK_VERIFICATION', state: params.decision, reviewer: params.reviewer, at: this.bankVerification.at });
  }

  static recordCurrencies(params: { role: RoleName; currencies: string[] }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized currency configuration.');
    const currencies = params.currencies.map((item) => item.toUpperCase());
    if (currencies.includes('GBP') && GBP_LAUNCH_MODE === 'DISABLED_FOR_LAUNCH') throw new Error('GBP bank transfer is disabled for launch.');
    if (currencies.some((item) => item !== 'EUR')) throw new Error('Only an explicitly approved EUR configuration is available.');
    this.approvedCurrencies = [...new Set(currencies)];
    this.audit.push({ action: 'PAYMENT_CURRENCIES', currencies: this.approvedCurrencies.join(','), at: new Date().toISOString() });
  }

  static recordAssetApproval(params: { asset: AssetCode; role: RoleName; reviewer: string; network: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized asset approval.');
    if (!params.network.trim() || !explicitEnv(`CRYPTO_${params.asset}_NETWORK`)) throw new Error('The asset network has not been explicitly configured.');
    if (explicitEnv(`CRYPTO_${params.asset}_NETWORK`) !== params.network.trim()) throw new Error('The approved network does not match the configured network.');
    this.assetApproval[params.asset] = true;
    this.networkApproval[params.asset] = true;
    this.audit.push({ action: 'ASSET_APPROVAL', asset: params.asset, reviewer: params.reviewer, at: new Date().toISOString() });
  }

  static recordAddressVerification(params: { asset: AssetCode; role: RoleName; reviewer: string; decision: BusinessVerificationState; evidence: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized address verification.');
    const config = PaymentConfigService.getCryptoConfig(params.asset);
    const network = explicitEnv(`CRYPTO_${params.asset}_NETWORK`);
    if (params.decision === 'VERIFIED' && (!config || receivingAddressFormat(params.asset, network, config.receivingAddress) !== 'FORMAT_VALID' || placeholder(config.receivingAddress))) {
      throw new Error('The receiving address cannot be verified.');
    }
    if (/private key|seed phrase|mnemonic/i.test(params.evidence)) throw new Error('Address verification cannot store key material.');
    this.addressVerification[params.asset] = { state: params.decision, reviewer: params.reviewer, at: new Date().toISOString(), evidence: params.evidence.slice(0, 80) };
    this.audit.push({ action: 'ADDRESS_VERIFICATION', asset: params.asset, state: params.decision, reviewer: params.reviewer, at: this.addressVerification[params.asset].at });
  }

  static recordCryptoRate(params: { asset: string; role: RoleName; rate: string; source: string; currency: string; strategy: 'FIXED_APPROVED' | 'PROVIDER_DERIVED'; version: string; at?: string; maxAgeSeconds?: number | null }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized conversion configuration.');
    if (!params.rate.trim() || !params.source.trim() || !params.version.trim()) throw new Error('CRYPTO_RATE_CONFIGURATION_REQUIRED');
    if (params.currency !== 'EUR') throw new Error('The conversion currency is not approved.');
    if (params.strategy === 'PROVIDER_DERIVED' && (params.maxAgeSeconds == null || params.maxAgeSeconds <= 0)) throw new Error('A provider conversion requires an explicit maximum rate age.');
    this.storedCryptoRate = {
      asset: params.asset,
      rate: params.rate,
      source: params.source,
      currency: params.currency,
      strategy: params.strategy,
      version: params.version,
      at: params.at || new Date().toISOString(),
      maxAgeSeconds: params.maxAgeSeconds ?? null,
    };
    this.audit.push({ action: 'CRYPTO_RATE', asset: params.asset, source: params.source, strategy: params.strategy, at: this.storedCryptoRate.at });
  }

  static recordControlledTest(params: { code: string; role: RoleName; actor: string; result: 'PASSED' | 'FAILED'; evidence: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized payment test.');
    if (!params.evidence.trim() || this.containsSecret(params.evidence)) throw new Error('The controlled test record is not valid.');
    this.controlledTests[params.code] = params.result;
    this.audit.push({ action: 'CONTROLLED_PAYMENT_TEST', method: params.code, result: params.result, actor: params.actor, at: new Date().toISOString() });
  }

  static quoteCrypto(asset: string): { error?: 'CRYPTO_RATE_CONFIGURATION_REQUIRED' | 'CRYPTO_RATE_STALE'; asset?: string; rate?: string; source?: string; at?: string } {
    if (!this.storedCryptoRate || this.storedCryptoRate.asset !== asset) return { error: 'CRYPTO_RATE_CONFIGURATION_REQUIRED' };
    if (this.storedCryptoRate.strategy === 'PROVIDER_DERIVED' && this.storedCryptoRate.maxAgeSeconds == null) return { error: 'CRYPTO_RATE_CONFIGURATION_REQUIRED' };
    if (this.storedCryptoRate.maxAgeSeconds != null) {
      const age = Date.now() - Date.parse(this.storedCryptoRate.at);
      if (!Number.isFinite(age) || age > this.storedCryptoRate.maxAgeSeconds * 1000) return { error: 'CRYPTO_RATE_STALE' };
    }
    return { asset: this.storedCryptoRate.asset, rate: this.storedCryptoRate.rate, source: this.storedCryptoRate.source, at: this.storedCryptoRate.at };
  }

  static report() {
    return {
      production: PRODUCTION_CONTROL_STATE,
      bank: this.bankState(),
      crypto: { BTC: this.cryptoState('BTC'), USDT: this.cryptoState('USDT'), ETH: this.cryptoState('ETH') },
      productionOptions: this.productionOptions(),
      bankBlockers: this.blockers('SEPA_IBAN'),
      cryptoBlockers: this.blockers('CRYPTO_BTC'),
      expirationConfigured: this.expirationHours != null,
      conversion: this.storedCryptoRate ? 'CONFIGURED' : 'CRYPTO_RATE_CONFIGURATION_REQUIRED',
      audit: this.audit.length,
      bankVerification: this.bankVerification.state,
      bankFormat: this.bankFormat(),
      bicFormat: this.bicState(),
      supportedCurrencies: this.approvedCurrencies.length ? this.approvedCurrencies : ['NOT_CONFIGURED'],
      reference: 'FUSION-{orderNumber}',
      controlledTest: { ...this.controlledTests },
      assetSupport: { BTC: 'SUPPORTED_IN_CODE', USDT: 'SUPPORTED_IN_CODE', ETH: 'SUPPORTED_IN_CODE' },
      assetApproval: {
        BTC: this.assetApproval.BTC ? 'BUSINESS_APPROVED' : 'NOT_APPROVED',
        USDT: this.assetApproval.USDT ? 'BUSINESS_APPROVED' : 'NOT_APPROVED',
        ETH: this.assetApproval.ETH ? 'BUSINESS_APPROVED' : 'NOT_APPROVED',
      },
      addressVerification: {
        BTC: this.addressVerification.BTC.state,
        USDT: this.addressVerification.USDT.state,
        ETH: this.addressVerification.ETH.state,
      },
      networkApproval: {
        BTC: this.networkStatus('BTC'),
        USDT: this.networkStatus('USDT'),
        ETH: this.networkStatus('ETH'),
      },
      evidenceStorage: this.evidenceReady() ? 'READY' : 'CONFIGURATION_REQUIRED',
      notifications: this.notificationsReady() ? 'ACTIVE' : 'NOT_ACTIVE',
    };
  }

  private static bankFormat(): FormatState {
    const iban = PaymentConfigService.getBankConfig().iban;
    if (placeholder(iban)) return 'NOT_CONFIGURED';
    return ibanFormat(iban);
  }

  private static bicState(): FormatState {
    const bic = PaymentConfigService.getBankConfig().bicSwift;
    if (placeholder(bic)) return 'NOT_CONFIGURED';
    return bicFormat(bic);
  }

  private static networkStatus(asset: AssetCode): 'NOT_CONFIGURED' | 'CONFIGURED_UNVERIFIED' | 'APPROVED' {
    if (this.networkApproval[asset]) return 'APPROVED';
    return explicitEnv(`CRYPTO_${asset}_NETWORK`) ? 'CONFIGURED_UNVERIFIED' : 'NOT_CONFIGURED';
  }

  private static bankBlockers(): string[] {
    const blockers: string[] = [];
    const bank = PaymentConfigService.getBankConfig();
    if (placeholder(bank.iban) || placeholder(bank.bicSwift) || placeholder(bank.accountHolder) || placeholder(bank.bankName)) {
      blockers.push('Bank transfer credentials are test placeholders. No production account was entered.');
    }
    if (this.bankFormat() !== 'FORMAT_VALID') blockers.push('IBAN format is not valid.');
    if (this.bicState() === 'FORMAT_INVALID') blockers.push('BIC format is not valid.');
    if (this.bankVerification.state !== 'VERIFIED') blockers.push('Bank details are not business-verified.');
    if (!this.approvedCurrencies.includes('EUR')) blockers.push('No payment currency has been explicitly approved.');
    return blockers;
  }

  private static cryptoBlockers(asset: AssetCode): string[] {
    const blockers: string[] = [];
    const config = PaymentConfigService.getCryptoConfig(asset);
    if (!config || (config.status !== 'ACTIVE' && asset !== 'BTC')) blockers.push(`${asset} is not configured.`);
    if (!config || placeholder(config.receivingAddress)) blockers.push(`CRYPTO_${asset} has no approved receiving address.`);
    if (!this.assetApproval[asset]) blockers.push(`${asset} is supported in code and is not business-approved.`);
    if (this.networkStatus(asset) !== 'APPROVED') blockers.push(`${asset} network is not approved.`);
    if (this.addressVerification[asset].state !== 'VERIFIED') blockers.push(`${asset} receiving address is not verified.`);
    const quote = this.quoteCrypto(asset);
    if (quote.error) blockers.push(quote.error);
    return blockers;
  }

  private static evidenceReady(): boolean {
    if (this.prerequisiteOverride?.evidence != null) return this.prerequisiteOverride.evidence;
    return StorageReadinessService.report().state === 'ACTIVE';
  }

  private static notificationsReady(): boolean {
    if (this.prerequisiteOverride?.notifications != null) return this.prerequisiteOverride.notifications;
    return EmailProductionReadinessService.state() === 'ACTIVE';
  }

  private static containsSecret(value: string): boolean {
    const iban = PaymentConfigService.getBankConfig().iban.replace(/\s+/g, '').toLowerCase();
    return Boolean(iban && value.replace(/\s+/g, '').toLowerCase().includes(iban)) || /password|seed|private key|api[_-]?key/i.test(value);
  }

  private static stateFor(code: string): PaymentConfigState {
    if (code === 'SEPA_IBAN') return this.bankState();
    if (code === 'CRYPTO_BTC' || code === 'CRYPTO_USDT' || code === 'CRYPTO_ETH') return this.cryptoState(code.replace('CRYPTO_', '') as AssetCode);
    return 'NOT_CONFIGURED';
  }

  private static inferredBank(): PaymentConfigState {
    const bank = PaymentConfigService.getBankConfig();
    if (bank.status !== 'ACTIVE') return 'DISABLED';
    if (placeholder(bank.iban) || placeholder(bank.bicSwift) || placeholder(bank.accountHolder)) return 'TEST';
    if (this.bankVerification.state === 'VERIFIED' && this.bankFormat() === 'FORMAT_VALID' && this.approvedCurrencies.includes('EUR')) return 'READY';
    return 'REVIEW_REQUIRED';
  }

  private static inferredCrypto(asset: AssetCode): PaymentConfigState {
    const config = PaymentConfigService.getCryptoConfig(asset);
    if (!config || config.status !== 'ACTIVE') return 'NOT_CONFIGURED';
    if (placeholder(config.receivingAddress)) return 'TEST';
    if (this.assetApproval[asset] && this.networkApproval[asset] && this.addressVerification[asset].state === 'VERIFIED' && !this.quoteCrypto(asset).error) return 'READY';
    return 'REVIEW_REQUIRED';
  }

  private static overlay(code: string): PaymentConfigState | null {
    return this.methods.get(code)?.state || null;
  }

  private static transition(code: string, to: PaymentConfigState, actor: string, role: RoleName, rationale: string): void {
    const from = this.stateFor(code);
    const current = this.methods.get(code) || { code, state: from, version: 1, history: [] };
    current.history.push({ at: new Date().toISOString(), from, to, actor, role, rationale });
    current.state = to;
    current.version += 1;
    this.methods.set(code, current);
    this.audit.push({ method: code, from, to, actor, role, rationale, at: current.history.at(-1)?.at });
  }
}
