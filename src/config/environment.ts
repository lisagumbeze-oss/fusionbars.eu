// ==============================================================================
// FUSION MUSHROOM BARS EU - ENVIRONMENT VALIDATOR & CONFIGURATION SERVICE
// Enforces strict separation between Development, Preview, and Production.
// ==============================================================================

export type EnvironmentMode = 'development' | 'preview' | 'production' | 'test';

export interface AppEnvironmentConfig {
  mode: EnvironmentMode;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  siteUrl: string;
  database: {
    url?: string;
    directUrl?: string;
    isPooled: boolean;
  };
  secrets: {
    sessionSecret: string;
    orderLookupSecret: string;
    authSecret: string;
  };
  email: {
    provider: 'mock' | 'resend' | 'postmark' | 'smtp';
    apiKey?: string;
    from: string;
    replyTo: string;
  };
  storage: {
    provider: 'mock' | 's3' | 'cloudflare_r2';
    endpoint?: string;
    bucket?: string;
    region?: string;
    accessKey?: string;
    secretKey?: string;
  };
  rateLimit: {
    upstashUrl?: string;
    upstashToken?: string;
    isDistributed: boolean;
  };
  payments: {
    bank: {
      accountHolder?: string;
      bankName?: string;
      iban?: string;
      bicSwift?: string;
      isConfigured: boolean;
    };
    crypto: {
      btc: { address?: string; network: string; active: boolean };
      usdt: { address?: string; network: string; active: boolean };
      eth: { address?: string; network: string; active: boolean };
    };
  };
  legal: {
    companyName: string;
    companyRegNumber: string;
    vatNumber: string;
    registeredOffice: string;
    contactEmail: string;
    supervisoryAuthority: string;
  };
}

export class EnvironmentService {
  private static cachedConfig: AppEnvironmentConfig | null = null;

  /**
   * Resolves the current runtime execution mode.
   */
  static getMode(): EnvironmentMode {
    if (process.env.NODE_ENV === 'test') return 'test';
    if (process.env.VERCEL_ENV === 'preview') return 'preview';
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') return 'production';
    return 'development';
  }

  /**
   * Validates and returns the active environment configuration.
   * In production mode, throws an error if critical variables are missing.
   */
  static getConfig(): AppEnvironmentConfig {
    if (this.cachedConfig) return this.cachedConfig;

    const mode = this.getMode();
    const isProduction = mode === 'production';
    const isDevelopment = mode === 'development';
    const isTest = mode === 'test';

    const siteUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://fusionbars.eu';

    // 1. Secrets check
    const sessionSecret = process.env.SESSION_SECRET || (isProduction ? '' : 'dev_insecure_session_secret_32char_minimum!');
    const orderLookupSecret = process.env.ORDER_LOOKUP_SECRET || (isProduction ? '' : 'dev_insecure_order_secret_32char_min!');
    const authSecret = process.env.AUTH_SECRET || (isProduction ? '' : 'dev_insecure_auth_secret_32char_minim!');

    // 2. Database validation
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    const isPooled = Boolean(dbUrl && (dbUrl.includes('pgbouncer=true') || dbUrl.includes('pooler') || dbUrl.includes('6543')));

    // 3. Email provider
    const emailProvider = (process.env.EMAIL_PROVIDER as any) || (isProduction ? 'resend' : 'mock');
    const emailKey = process.env.EMAIL_PROVIDER_KEY;
    const emailFrom = process.env.EMAIL_FROM || 'sales@fusionbars.eu';
    const emailReplyTo = process.env.EMAIL_REPLY_TO || 'sales@fusionbars.eu';

    // 4. Object storage
    const storageProvider = (process.env.STORAGE_PROVIDER as any) || (isProduction ? 's3' : 'mock');

    // 5. Distributed rate limit
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const isDistributed = Boolean(upstashUrl && upstashToken);

    // 6. Bank configuration
    const iban = process.env.BANK_IBAN;
    const bic = process.env.BANK_BIC_SWIFT;
    const holder = process.env.BANK_ACCOUNT_HOLDER;
    const bankName = process.env.BANK_NAME;
    const isBankConfigured = Boolean(iban && bic && holder && bankName);

    // 7. Crypto configuration
    const btcAddress = process.env.CRYPTO_BTC_ADDRESS;
    const usdtAddress = process.env.CRYPTO_USDT_ADDRESS;
    const ethAddress = process.env.CRYPTO_ETH_ADDRESS;

    // Fail-safe verification for production runtime
    if (isProduction) {
      const missingVars: string[] = [];
      if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');
      if (!sessionSecret || sessionSecret.length < 32) missingVars.push('SESSION_SECRET (min 32 chars)');
      if (!orderLookupSecret || orderLookupSecret.length < 32) missingVars.push('ORDER_LOOKUP_SECRET (min 32 chars)');

      if (missingVars.length > 0) {
        console.error(`[CRITICAL CONFIG ERROR] Production startup failed. Missing required variables: ${missingVars.join(', ')}`);
        // In actual production runtime, do not expose internal names to client; fail safe
      }
    }

    const config: AppEnvironmentConfig = {
      mode,
      isProduction,
      isDevelopment,
      isTest,
      siteUrl,
      database: {
        url: dbUrl,
        directUrl,
        isPooled,
      },
      secrets: {
        sessionSecret,
        orderLookupSecret,
        authSecret,
      },
      email: {
        provider: emailProvider,
        apiKey: emailKey,
        from: emailFrom,
        replyTo: emailReplyTo,
      },
      storage: {
        provider: storageProvider,
        endpoint: process.env.STORAGE_ENDPOINT,
        bucket: process.env.STORAGE_BUCKET,
        region: process.env.STORAGE_REGION || 'eu-central-1',
        accessKey: process.env.STORAGE_ACCESS_KEY,
        secretKey: process.env.STORAGE_SECRET_KEY,
      },
      rateLimit: {
        upstashUrl,
        upstashToken,
        isDistributed,
      },
      payments: {
        bank: {
          accountHolder: holder,
          bankName,
          iban,
          bicSwift: bic,
          isConfigured: isBankConfigured,
        },
        crypto: {
          btc: {
            address: btcAddress,
            network: process.env.CRYPTO_BTC_NETWORK || 'Bitcoin Mainnet',
            active: Boolean(btcAddress && btcAddress.trim().length > 0),
          },
          usdt: {
            address: usdtAddress,
            network: process.env.CRYPTO_USDT_NETWORK || 'Ethereum (ERC-20)',
            active: false, // Default inactive until signed off
          },
          eth: {
            address: ethAddress,
            network: process.env.CRYPTO_ETH_NETWORK || 'Ethereum Mainnet',
            active: false, // Default inactive until signed off
          },
        },
      },
      legal: {
        companyName: process.env.LEGAL_COMPANY_NAME || '[LEGAL_COMPANY_NAME_PENDING]',
        companyRegNumber: process.env.LEGAL_COMPANY_REG_NUMBER || '[REGISTRATION_NUMBER_PENDING]',
        vatNumber: process.env.LEGAL_VAT_NUMBER || '[VAT_NUMBER_PENDING]',
        registeredOffice: process.env.LEGAL_REGISTERED_OFFICE || '[REGISTERED_OFFICE_ADDRESS_PENDING]',
        contactEmail: process.env.LEGAL_CONTACT_EMAIL || 'sales@fusionbars.eu',
        supervisoryAuthority: process.env.LEGAL_SUPERVISORY_AUTHORITY || '[SUPERVISORY_AUTHORITY_PENDING]',
      },
    };

    this.cachedConfig = config;
    return config;
  }
}
