// ==============================================================================
// FUSION MUSHROOM BARS EU - PAYMENT METHOD ACTIVATION GATE
// Multi-Tier Governance: CONFIGURED -> APPROVED -> ACTIVE
// Restricts Payment Activation Strictly to SUPER_ADMIN Role with Audit Logging
// ==============================================================================

import { CommerceRepository } from '@/lib/commerce-repository';
import { RoleName } from '@/types';
import { EnvironmentService } from '@/config/environment';

export type PaymentMethodActivationStage = 'CONFIGURED' | 'APPROVED' | 'ACTIVE';

export interface PaymentMethodState {
  code: string;
  name: string;
  stage: PaymentMethodActivationStage;
  approvedBy?: string;
  approvedAt?: string;
  activatedBy?: string;
  activatedAt?: string;
  lastUpdated: string;
}

export class PaymentActivationService {
  private static states = new Map<string, PaymentMethodState>([
    [
      'BANK_TRANSFER',
      {
        code: 'BANK_TRANSFER',
        name: 'Direct European Bank Transfer (SEPA / IBAN)',
        stage: 'CONFIGURED',
        lastUpdated: new Date().toISOString(),
      },
    ],
    [
      'CRYPTO_BTC',
      {
        code: 'CRYPTO_BTC',
        name: 'Bitcoin Mainnet (Cold Storage)',
        stage: 'CONFIGURED',
        lastUpdated: new Date().toISOString(),
      },
    ],
    [
      'CRYPTO_USDT',
      {
        code: 'CRYPTO_USDT',
        name: 'Tether USD (ERC-20)',
        stage: 'CONFIGURED',
        lastUpdated: new Date().toISOString(),
      },
    ],
    [
      'CRYPTO_ETH',
      {
        code: 'CRYPTO_ETH',
        name: 'Ethereum Mainnet',
        stage: 'CONFIGURED',
        lastUpdated: new Date().toISOString(),
      },
    ],
  ]);

  static getActivationStates(): PaymentMethodState[] {
    return Array.from(this.states.values());
  }

  static getMethodState(code: string): PaymentMethodState | undefined {
    return this.states.get(code);
  }

  /**
   * Promotes payment method stage: CONFIGURED -> APPROVED -> ACTIVE.
   * Strictly requires SUPER_ADMIN role.
   */
  static async updateMethodStage(input: {
    code: string;
    newStage: PaymentMethodActivationStage;
    actor: { id: string; role: RoleName };
    reason?: string;
  }): Promise<{ success: boolean; state?: PaymentMethodState; error?: string }> {
    const { code, newStage, actor, reason } = input;

    // 1. Role Enforcement: SUPER_ADMIN only
    if (actor.role !== 'SUPER_ADMIN') {
      CommerceRepository.logAudit({
        action: 'UNAUTHORIZED_PAYMENT_ACTIVATION_ATTEMPT',
        entityType: 'PaymentMethod',
        entityId: code,
        actorRole: actor.role,
        actorId: actor.id,
        metadata: JSON.stringify({ attemptedStage: newStage }),
      });
      return {
        success: false,
        error: 'Forbidden: Only SUPER_ADMIN can advance payment activation stages.',
      };
    }

    const current = this.states.get(code);
    if (!current) {
      return { success: false, error: `Payment method "${code}" not found.` };
    }

    // 2. State Progression Validation
    if (newStage === 'APPROVED' && current.stage !== 'CONFIGURED') {
      return { success: false, error: 'Only CONFIGURED methods can be APPROVED.' };
    }
    if (newStage === 'ACTIVE' && current.stage !== 'APPROVED') {
      return { success: false, error: 'Payment method must be APPROVED before becoming ACTIVE.' };
    }

    // 3. Reject unspendable test placeholders from becoming ACTIVE in production mode
    const env = EnvironmentService.getConfig();
    if (newStage === 'ACTIVE' && env.isProduction) {
      if (code === 'CRYPTO_BTC') {
        const btcAddr = process.env.CRYPTO_BTC_ADDRESS || '';
        if (!btcAddr || btcAddr.includes('placeholder') || btcAddr.includes('test_only')) {
          return {
            success: false,
            error: 'Cannot ACTIVATE Bitcoin in production with a test placeholder address.',
          };
        }
      }
      if (code === 'BANK_TRANSFER') {
        const iban = process.env.BANK_IBAN || '';
        if (!iban || iban.includes('0000000000') || iban.includes('TEST')) {
          return {
            success: false,
            error: 'Cannot ACTIVATE Bank Transfer in production with a test/dummy IBAN.',
          };
        }
      }
    }

    // 4. Mutate State
    const now = new Date().toISOString();
    const updated: PaymentMethodState = {
      ...current,
      stage: newStage,
      lastUpdated: now,
    };

    if (newStage === 'APPROVED') {
      updated.approvedBy = actor.id;
      updated.approvedAt = now;
    } else if (newStage === 'ACTIVE') {
      updated.activatedBy = actor.id;
      updated.activatedAt = now;
    }

    this.states.set(code, updated);

    // 5. Audit Logging
    CommerceRepository.logAudit({
      action: `PAYMENT_METHOD_${newStage}`,
      entityType: 'PaymentMethod',
      entityId: code,
      actorRole: 'SUPER_ADMIN',
      actorId: actor.id,
      metadata: JSON.stringify({
        previousStage: current.stage,
        newStage,
        reason: reason || 'Administrative review completed',
      }),
    });

    return { success: true, state: updated };
  }
}
