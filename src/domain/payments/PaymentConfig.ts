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

export class PaymentConfigService {
  // In-memory or env-backed configurations (No production secrets committed)
  private static cryptoConfigs: Record<CryptoAsset, CryptoPaymentConfig> = {
    BTC: {
      asset: 'BTC',
      displayName: 'Bitcoin (BTC)',
      network: 'Bitcoin Mainnet',
      receivingAddress: process.env.CRYPTO_BTC_ADDRESS || 'bc1q_placeholder_btc_test_only',
      status: (process.env.CRYPTO_BTC_STATUS as PaymentMethodStatus) || 'ACTIVE',
      minimumAmount: 2000,
      confirmationPolicy: '1 confirmation on Bitcoin network',
    },
    USDT: {
      asset: 'USDT',
      displayName: 'Tether (USDT - TRC20)',
      network: 'Tron TRC-20',
      receivingAddress: process.env.CRYPTO_USDT_ADDRESS || 'T_placeholder_usdt_test_only',
      status: (process.env.CRYPTO_USDT_STATUS as PaymentMethodStatus) || 'INACTIVE',
      minimumAmount: 2500,
      confirmationPolicy: '12 confirmations',
    },
    ETH: {
      asset: 'ETH',
      displayName: 'Ethereum (ETH)',
      network: 'Ethereum Mainnet',
      receivingAddress: process.env.CRYPTO_ETH_ADDRESS || '0x000000000000000000000000000000000000dEaD',
      status: (process.env.CRYPTO_ETH_STATUS as PaymentMethodStatus) || 'INACTIVE',
      minimumAmount: 3000,
      confirmationPolicy: '12 confirmations on Ethereum network',
    },
  };

  private static bankConfig: BankPaymentConfig = {
    accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'Fusion EU Logistics B.V.',
    bankName: process.env.BANK_NAME || 'European Merchant Bank',
    iban: process.env.BANK_IBAN || 'NL00TEST0000000000',
    bicSwift: process.env.BANK_BIC_SWIFT || 'TESTNL2A',
    status: (process.env.BANK_STATUS as PaymentMethodStatus) || 'ACTIVE',
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

  static snapshotForTests(): () => void {
    const bank = { ...this.bankConfig };
    const crypto = {
      BTC: { ...this.cryptoConfigs.BTC },
      USDT: { ...this.cryptoConfigs.USDT },
      ETH: { ...this.cryptoConfigs.ETH },
    };
    return () => {
      this.bankConfig = bank;
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

    if (this.bankConfig.status === 'ACTIVE') {
      options.push({
        code: 'SEPA_IBAN',
        name: 'Bank Transfer (SEPA / IBAN)',
        type: 'BANK_TRANSFER',
      });
    }

    const activeCryptos = this.getActiveCryptoConfigs();
    for (const c of activeCryptos) {
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
    if (methodCode === 'SEPA_IBAN') {
      return this.bankConfig.status === 'ACTIVE';
    }

    if (methodCode.startsWith('CRYPTO_')) {
      const asset = methodCode.replace('CRYPTO_', '') as CryptoAsset;
      const config = this.cryptoConfigs[asset];
      return Boolean(config && config.status === 'ACTIVE');
    }

    return false;
  }
}
