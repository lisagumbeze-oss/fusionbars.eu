import { PaymentConfigurationService } from '@/domain/payments/PaymentConfigurationService';
import { PaymentVerificationService } from '@/domain/payments/PaymentVerificationService';

export class PaymentProductionReadinessService {
  static report() {
    const payment = PaymentConfigurationService.report();
    return {
      production: payment.production,
      bank: {
        state: payment.bank,
        verification: payment.bankVerification,
        format: payment.bankFormat,
        bic: payment.bicFormat,
        currencies: payment.supportedCurrencies,
        reference: payment.reference,
        activation: payment.bank,
      },
      crypto: {
        assets: payment.crypto,
        support: payment.assetSupport,
        approval: payment.assetApproval,
        networks: payment.networkApproval,
        addressVerification: payment.addressVerification,
        conversion: payment.conversion,
        activation: payment.crypto,
      },
      operations: PaymentVerificationService.operationsSummary(),
      evidenceStorage: payment.evidenceStorage,
      notifications: payment.notifications,
      controlledTest: payment.controlledTest,
      productionOptions: payment.productionOptions,
      blockers: {
        bank: payment.bankBlockers,
        bitcoin: payment.cryptoBlockers,
      },
    };
  }
}
