// Production payment readiness. Placeholder credentials stay TEST and cannot become ACTIVE.

import { RoleName } from '@/types';
import { PaymentConfigService } from '@/domain/payments/PaymentConfig';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/AdminDashboardService';

export type PaymentConfigState = 'NOT_CONFIGURED' | 'TEST' | 'ACTIVE' | 'DISABLED' | 'REVIEW_REQUIRED';

interface MethodRecord {
  code: string;
  state: PaymentConfigState;
  version: number;
  history: Array<{ at: string; from: PaymentConfigState; to: PaymentConfigState; actor: string; role: RoleName; rationale: string }>;
}

function placeholder(value: string): boolean {
  const text = value.toLowerCase();
  return !text || text.includes('placeholder') || text.includes('test_only') || text.includes('test') || text.includes('0000000000') || text.includes('dead');
}

export class PaymentConfigurationService {
  private static methods = new Map<string, MethodRecord>();
  private static audit: Array<Record<string, unknown>> = [];
  private static expirationHours: number | null = null;
  private static storedCryptoRate: { asset: string; rate: string; source: string; at: string } | null = null;

  static resetForTests(): void {
    this.methods.clear();
    this.audit = [];
    this.expirationHours = null;
    this.storedCryptoRate = null;
  }

  static customerReference(orderNumber: string): string {
    const safe = orderNumber.replace(/[^A-Z0-9-]/gi, '');
    return `FUSION-${safe}`;
  }

  static bankState(): PaymentConfigState {
    return this.overlay('SEPA_IBAN') || this.inferredBank();
  }

  static cryptoState(asset: 'BTC' | 'USDT' | 'ETH'): PaymentConfigState {
    return this.overlay(`CRYPTO_${asset}`) || this.inferredCrypto(asset);
  }

  static productionOptions(): string[] {
    return ['SEPA_IBAN', 'CRYPTO_BTC', 'CRYPTO_USDT', 'CRYPTO_ETH'].filter((code) => this.stateFor(code) === 'ACTIVE');
  }

  static blockers(code: string): string[] {
    const blockers: string[] = [];
    if (code === 'SEPA_IBAN') {
      const bank = PaymentConfigService.getBankConfig();
      if (placeholder(bank.iban) || placeholder(bank.bicSwift) || placeholder(bank.accountHolder)) {
        blockers.push('Bank transfer credentials are test placeholders. No production account was entered.');
      }
    }
    if (code.startsWith('CRYPTO_')) {
      const asset = code.replace('CRYPTO_', '') as 'BTC' | 'USDT' | 'ETH';
      const config = PaymentConfigService.getCryptoConfig(asset);
      if (!config || placeholder(config.receivingAddress)) blockers.push(`${code} has no approved receiving address.`);
      if (!this.storedCryptoRate || this.storedCryptoRate.asset !== asset) blockers.push('CRYPTO_RATE_CONFIGURATION_REQUIRED');
    }
    if (this.stateFor(code) === 'DISABLED') blockers.push(`${code} is disabled.`);
    if (PRODUCTION_CONTROL_STATE !== 'PAUSED' && blockers.length === 0) blockers.push('Production control must stay paused until a real activation.');
    return blockers;
  }

  static activate(params: { code: string; actor: string; role: RoleName; confirmation: string; rationale: string }): { success: false; error: string } | { success: true; state: PaymentConfigState } {
    if (params.role !== 'SUPER_ADMIN') return { success: false, error: 'Only SUPER_ADMIN can activate a payment method.' };
    if (params.confirmation !== 'ACTIVATE_PAYMENT_METHOD') return { success: false, error: 'Explicit activation confirmation is required.' };
    const blockers = this.blockers(params.code).filter((item) => !item.startsWith('Production control'));
    if (blockers.length) return { success: false, error: blockers[0] };
    if (PRODUCTION_CONTROL_STATE === 'PAUSED') return { success: false, error: 'Production is PAUSED. Payment methods cannot become ACTIVE.' };
    this.transition(params.code, 'ACTIVE', params.actor, params.role, params.rationale);
    return { success: true, state: 'ACTIVE' };
  }

  static disable(params: { code: string; actor: string; role: RoleName; rationale: string }): void {
    if (params.role !== 'SUPER_ADMIN' && params.role !== 'FINANCE_MANAGER') throw new Error('Unauthorized payment configuration change.');
    this.transition(params.code, 'DISABLED', params.actor, params.role, params.rationale);
  }

  static quoteCrypto(asset: string): { error?: 'CRYPTO_RATE_CONFIGURATION_REQUIRED'; asset?: string; rate?: string; source?: string; at?: string } {
    if (!this.storedCryptoRate || this.storedCryptoRate.asset !== asset) return { error: 'CRYPTO_RATE_CONFIGURATION_REQUIRED' };
    return this.storedCryptoRate;
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
    };
  }

  private static stateFor(code: string): PaymentConfigState {
    if (code === 'SEPA_IBAN') return this.bankState();
    if (code === 'CRYPTO_BTC' || code === 'CRYPTO_USDT' || code === 'CRYPTO_ETH') return this.cryptoState(code.replace('CRYPTO_', '') as 'BTC' | 'USDT' | 'ETH');
    return 'NOT_CONFIGURED';
  }

  private static inferredBank(): PaymentConfigState {
    const bank = PaymentConfigService.getBankConfig();
    if (bank.status !== 'ACTIVE') return 'DISABLED';
    if (placeholder(bank.iban) || placeholder(bank.bicSwift)) return 'TEST';
    return 'REVIEW_REQUIRED';
  }

  private static inferredCrypto(asset: 'BTC' | 'USDT' | 'ETH'): PaymentConfigState {
    const config = PaymentConfigService.getCryptoConfig(asset);
    if (!config || config.status !== 'ACTIVE') return 'NOT_CONFIGURED';
    if (placeholder(config.receivingAddress)) return 'TEST';
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
