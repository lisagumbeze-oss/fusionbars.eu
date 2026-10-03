import { isPlaceholderCustomerPaymentDetail } from '@/domain/payments/payment-format';

// ===================================================
// FUSION MUSHROOM BARS EU - PAYMENT CONFIGURATION SERVICE
// Safe, Configurable Payment Rails Architecture
// Strictly Protects Secrets & Limits Public Data Exposure
// ===================================================

export type CryptoAsset = 'BTC' | 'USDT' | 'ETH';
export type PaymentMethodStatus = 'ACTIVE' | 'INACTIVE';

export interface CryptoPaymentConfig {
  asset: CryptoAsset;
  displayName: string;
  network: string;
  receivingAddress: string;
  status: PaymentMethodStatus;
  minimumAmount?: number; // Minor units (e.g., 2000 = €20.00)
  confirmationPolicy: string;
}

export interface BankPaymentConfig {
  accountHolder: string;
  bankName: string;
  iban: string;
  bicSwift: string;
  status: PaymentMethodStatus;
}

export interface PublicPaymentOption {
  code: string;
  name: string;
  type: 'BANK_TRANSFER' | 'CRYPTOCURRENCY';
  asset?: CryptoAsset;
  network?: string;
  confirmationPolicy?: string;
  minimumAmount?: number;
}

function configuredDetail(name: string): string {
  const value = process.env[name]?.trim() || '';
  return isPlaceholderCustomerPaymentDetail(value) ? '' : value;
}

function configuredStatus(statusName: string, detail: string): PaymentMethodStatus {
  const explicit = process.env[statusName];
  if (explicit === 'INACTIVE') return 'INACTIVE';
  if (explicit === 'ACTIVE') return detail ? 'ACTIVE' : 'INACTIVE';
  return detail ? 'ACTIVE' : 'INACTIVE';
}

export class PaymentConfigService {
  private static forcedActive = new Set<string>();

  static forceMethodActiveForTests(codes: string[]): void {
    this.forcedActive = new Set(codes);
  }

  // Environment-backed configuration. Missing values stay empty. No account or wallet is invented.
  private static cryptoConfigs: Record<CryptoAsset, CryptoPaymentConfig> = {
    BTC: {
      asset: 'BTC',
      displayName: 'Bitcoin (BTC)',
      network: configuredDetail('CRYPTO_BTC_NETWORK'),
      receivingAddress: configuredDetail('CRYPTO_BTC_ADDRESS'),
      status: configuredStatus('CRYPTO_BTC_STATUS', configuredDetail('CRYPTO_BTC_ADDRESS')),
      minimumAmount: 2000,
      confirmationPolicy: '',
    },
    USDT: {
      asset: 'USDT',
      displayName: 'Tether (USDT)',
      network: configuredDetail('CRYPTO_USDT_NETWORK'),
      receivingAddress: configuredDetail('CRYPTO_USDT_ADDRESS'),
      status: configuredStatus('CRYPTO_USDT_STATUS', configuredDetail('CRYPTO_USDT_ADDRESS')),
      minimumAmount: 2500,
      confirmationPolicy: '',
    },
    ETH: {
      asset: 'ETH',
      displayName: 'Ethereum (ETH)',
      network: configuredDetail('CRYPTO_ETH_NETWORK'),
      receivingAddress: configuredDetail('CRYPTO_ETH_ADDRESS'),
      status: configuredStatus('CRYPTO_ETH_STATUS', configuredDetail('CRYPTO_ETH_ADDRESS')),
      minimumAmount: 3000,
      confirmationPolicy: '',
    },
  };

  private static bankConfig: BankPaymentConfig = {
    accountHolder: configuredDetail('BANK_ACCOUNT_HOLDER'),
    bankName: configuredDetail('BANK_NAME'),
    iban: configuredDetail('BANK_IBAN'),
    bicSwift: configuredDetail('BANK_BIC_SWIFT'),
    status: configuredStatus('BANK_STATUS', configuredDetail('BANK_IBAN') && configuredDetail('BANK_BIC_SWIFT') ? 'set' : ''),
  };

  /**
   * Returns list of currently ACTIVE crypto configurations.
   */
  static getActiveCryptoConfigs(): CryptoPaymentConfig[] {
    return Object.values(this.cryptoConfigs).filter((c) => c.status === 'ACTIVE');
  }

  /**
   * Retrieves full crypto configuration by asset symbol.
   * Internal / server-side only for order creation.
   */
  static getCryptoConfig(asset: CryptoAsset): CryptoPaymentConfig | null {
    return this.cryptoConfigs[asset] || null;
  }

  /**
   * Retrieves server-side bank configuration.
   * Internal / server-side only for order creation.
   */
  static getBankConfig(): BankPaymentConfig {
    return this.bankConfig;
  }

  /**
   * Sets status for a crypto asset (for administrative configuration).
   */
  static setCryptoStatus(asset: CryptoAsset, status: PaymentMethodStatus): void {
    if (this.cryptoConfigs[asset]) {
      this.cryptoConfigs[asset].status = status;
    }
  }

  /**
   * Updates crypto receiving address safely in-memory or admin settings.
   */
  static setCryptoReceivingAddress(asset: CryptoAsset, address: string): void {
    if (this.cryptoConfigs[asset] && address.trim()) {
      this.cryptoConfigs[asset].receivingAddress = address.trim();
    }
  }

  static setCryptoNetwork(asset: CryptoAsset, network: string): void {
    if (this.cryptoConfigs[asset] && network.trim()) {
      this.cryptoConfigs[asset].network = network.trim();
    }
  }

  static snapshotForTests(): () => void {
    const bank = { ...this.bankConfig };
    const forced = new Set(this.forcedActive);
    const crypto = {
      BTC: { ...this.cryptoConfigs.BTC },
      USDT: { ...this.cryptoConfigs.USDT },
      ETH: { ...this.cryptoConfigs.ETH },
    };
    return () => {
      this.bankConfig = bank;
      this.forcedActive = forced;
      this.cryptoConfigs = crypto;
    };
  }

  static replaceBankForTests(next: BankPaymentConfig): void {
    this.bankConfig = { ...next };
  }

  /**
   * Returns safe PUBLIC payment options for customer-facing checkout.
   * Strictly omits sensitive details: No IBAN, No BIC, No receiving wallet addresses!
   */
  static getPublicPaymentOptions(): PublicPaymentOption[] {
    const options: PublicPaymentOption[] = [];

    if (this.bankConfig.status === 'ACTIVE' && !isPlaceholderCustomerPaymentDetail(this.bankConfig.iban) && !isPlaceholderCustomerPaymentDetail(this.bankConfig.bicSwift)) {
      options.push({
        code: 'SEPA_IBAN',
        name: 'Bank Transfer (SEPA / IBAN)',
        type: 'BANK_TRANSFER',
      });
    }

    const activeCryptos = this.getActiveCryptoConfigs();
    for (const c of activeCryptos) {
      if (isPlaceholderCustomerPaymentDetail(c.receivingAddress)) continue;
      options.push({
        code: `CRYPTO_${c.asset}`,
        name: c.displayName,
        type: 'CRYPTOCURRENCY',
        asset: c.asset,
        network: c.network,
        confirmationPolicy: c.confirmationPolicy,
        minimumAmount: c.minimumAmount,
      });
    }

    return options;
  }

  /**
   * Checks whether a given payment method code is valid and currently ACTIVE.
   */
  static isPaymentMethodActive(methodCode: string): boolean {
    if (this.forcedActive.has(methodCode)) return true;
    if (methodCode === 'SEPA_IBAN') {
      return this.bankConfig.status === 'ACTIVE'
        && !isPlaceholderCustomerPaymentDetail(this.bankConfig.iban)
        && !isPlaceholderCustomerPaymentDetail(this.bankConfig.bicSwift)
        && !isPlaceholderCustomerPaymentDetail(this.bankConfig.accountHolder)
        && !isPlaceholderCustomerPaymentDetail(this.bankConfig.bankName);
    }

    if (methodCode.startsWith('CRYPTO_')) {
      const asset = methodCode.replace('CRYPTO_', '') as CryptoAsset;
      const config = this.cryptoConfigs[asset];
      return Boolean(
        config
        && config.status === 'ACTIVE'
        && !isPlaceholderCustomerPaymentDetail(config.receivingAddress)
        && !isPlaceholderCustomerPaymentDetail(config.network),
      );
    }

    return false;
  }

  static configurationPresence(): Array<{ field: string; env: string; state: 'CONFIGURED' | 'MISSING' }> {
    const rows: Array<[string, string, string]> = [
      ['account_holder', 'BANK_ACCOUNT_HOLDER', this.bankConfig.accountHolder],
      ['bank_name', 'BANK_NAME', this.bankConfig.bankName],
      ['iban', 'BANK_IBAN', this.bankConfig.iban],
      ['bic', 'BANK_BIC_SWIFT', this.bankConfig.bicSwift],
      ['payment_reference_format', 'BANK_REFERENCE_FORMAT', configuredDetail('BANK_REFERENCE_FORMAT')],
      ['payment_instructions', 'BANK_PAYMENT_INSTRUCTIONS', configuredDetail('BANK_PAYMENT_INSTRUCTIONS')],
      ['asset', 'CRYPTO_BTC_ADDRESS', this.cryptoConfigs.BTC.receivingAddress ? this.cryptoConfigs.BTC.asset : ''],
      ['network', 'CRYPTO_BTC_NETWORK', this.cryptoConfigs.BTC.network],
      ['wallet_address', 'CRYPTO_BTC_ADDRESS', this.cryptoConfigs.BTC.receivingAddress],
      ['payment_instructions', 'CRYPTO_PAYMENT_INSTRUCTIONS', configuredDetail('CRYPTO_PAYMENT_INSTRUCTIONS')],
    ];
    return rows.map(([field, env, value]) => ({ field, env, state: value ? 'CONFIGURED' : 'MISSING' }));
  }
}
