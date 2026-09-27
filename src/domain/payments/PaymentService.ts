// ===================================================
// FUSION MUSHROOM BARS EU - PAYMENT SERVICE ENGINE
// Provider-Agnostic European Payment Rails
// Bank Transfer (SEPA/IBAN) & Cryptocurrency
// ===================================================

import { CurrencyCode, MinorUnits, PaymentMethodType, TransactionStatus } from '@/types';

export interface PaymentInitializationInput {
  orderId: string;
  orderNumber: string;
  amount: MinorUnits;
  currency: CurrencyCode;
}

export interface CryptoReceivingWallet {
  symbol: string;
  name: string;
  network: string;
  address: string;
  amount?: string;
  qrDataUrl?: string;
}

export interface PaymentInstructions {
  methodCode: string;
  methodName: string;
  type: PaymentMethodType;
  reference: string;
  amount: MinorUnits;
  currency: CurrencyCode;
  instructions: string;
  details: Record<string, string | number | null | undefined>;
  wallets?: CryptoReceivingWallet[];
}

export interface IPaymentProcessor {
  readonly type: PaymentMethodType;
  generateInstructions(input: PaymentInitializationInput): PaymentInstructions;
  validateProofSubmission(payload: { referenceOrTxid: string; senderOrProof?: string }): { valid: boolean; error?: string };
}

export class BankTransferPaymentService implements IPaymentProcessor {
  readonly type: PaymentMethodType = 'BANK_TRANSFER';

  constructor(
    private config: {
      accountHolder: string;
      bankName: string;
      iban: string;
      bicSwift: string;
      customInstructions?: string;
    }
  ) {}

  generateInstructions(input: PaymentInitializationInput): PaymentInstructions {
    const reference = input.orderNumber;
    return {
      methodCode: 'SEPA_IBAN',
      methodName: 'Bank Transfer (SEPA / IBAN)',
      type: this.type,
      reference,
      amount: input.amount,
      currency: input.currency,
      instructions:
        this.config.customInstructions ||
        `Please initiate a SEPA transfer from your banking portal. It is crucial to include the Reference "${reference}" in your transfer description.`,
      details: {
        accountHolder: this.config.accountHolder,
        bankName: this.config.bankName,
        iban: this.config.iban,
        bicSwift: this.config.bicSwift,
        mandatoryReference: reference,
      },
    };
  }

  validateProofSubmission(payload: { referenceOrTxid: string; senderOrProof?: string }): { valid: boolean; error?: string } {
    if (!payload.referenceOrTxid || payload.referenceOrTxid.trim().length < 4) {
      return { valid: false, error: 'A valid bank transfer reference or order number is required.' };
    }
    return { valid: true };
  }
}

export class CryptoPaymentService implements IPaymentProcessor {
  readonly type: PaymentMethodType = 'CRYPTOCURRENCY';

  constructor(
    private config: {
      cryptoName: string;
      network: string;
      receivingAddress: string;
      customInstructions?: string;
    }
  ) {}

  generateInstructions(input: PaymentInitializationInput): PaymentInstructions {
    const reference = input.orderNumber;
    // Standard BIP21 / URI format
    const uriScheme = this.config.cryptoName.toLowerCase().includes('bitcoin') ? 'bitcoin' : 'ethereum';
    const qrPayload = `${uriScheme}:${this.config.receivingAddress}?reference=${encodeURIComponent(reference)}`;

    return {
      methodCode: 'CRYPTO',
      methodName: `Cryptocurrency (${this.config.cryptoName})`,
      type: this.type,
      reference,
      amount: input.amount,
      currency: input.currency,
      instructions:
        this.config.customInstructions ||
        `Transfer funds to the designated ${this.config.cryptoName} address on the ${this.config.network} network. Enter your transaction hash (TXID) after broadcasting.`,
      details: {
        cryptoName: this.config.cryptoName,
        network: this.config.network,
        receivingAddress: this.config.receivingAddress,
        qrPayload,
        orderReference: reference,
      },
    };
  }

  validateProofSubmission(payload: { referenceOrTxid: string; senderOrProof?: string }): { valid: boolean; error?: string } {
    if (!payload.referenceOrTxid || payload.referenceOrTxid.trim().length < 8) {
      return { valid: false, error: 'A valid blockchain transaction hash (TXID) is required.' };
    }
    return { valid: true };
  }
}

export class PaymentService {
  /**
   * Evaluates state transition for a payment transaction.
   * Customers can submit proof, but only managers can confirm or reject.
   */
  static evaluateTransactionTransition(
    currentStatus: TransactionStatus,
    targetStatus: TransactionStatus,
    actorRole: string
  ): { allowed: boolean; error?: string } {
    if (currentStatus === targetStatus) return { allowed: true };

    if (actorRole === 'CUSTOMER') {
      if (currentStatus === 'PENDING_CUSTOMER_ACTION' && targetStatus === 'PROOF_SUBMITTED') {
        return { allowed: true };
      }
      return { allowed: false, error: 'Customers can only submit payment proof.' };
    }

    if (['SUPER_ADMIN', 'FINANCE_MANAGER'].includes(actorRole)) {
      return { allowed: true };
    }

    return { allowed: false, error: `Role ${actorRole} cannot modify financial transaction statuses.` };
  }
}
