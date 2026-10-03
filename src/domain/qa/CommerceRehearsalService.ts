import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { AdminAccess } from '@/domain/admin/AdminAccess';
import { RBACService } from '@/domain/auth/RBACService';
import { AuthService } from '@/domain/auth/AuthService';
import { PublicationReadinessService, ReadinessInput } from '@/domain/catalog/PublicationReadinessService';
import { CartPricingService, CartProductVariantRecord } from '@/domain/cart/CartPricingService';
import { PricingEngine } from '@/domain/commercial/PricingEngine';
import { TaxEngine } from '@/domain/commercial/TaxEngine';
import { CommercialConfigurationService } from '@/domain/commercial/CommercialConfigurationService';
import { ShippingService } from '@/domain/shipping/ShippingService';
import { DestinationEngine } from '@/domain/shipping/DestinationEngine';
import { FulfilmentRoutingService } from '@/domain/shipping/FulfilmentRoutingService';
import { InventoryService } from '@/domain/inventory/InventoryService';
import { OrderStatusService } from '@/domain/orders/OrderStatusService';
import { OrderDatabasePersistence } from '@/domain/orders/OrderDatabasePersistence';
import { PaymentVerificationService } from '@/domain/payments/PaymentVerificationService';
import { PaymentConfigurationService } from '@/domain/payments/PaymentConfigurationService';
import { EmailProductionReadinessService } from '@/services/email/EmailProductionReadinessService';
import { EmailDeliveryLedger } from '@/services/email/EmailDeliveryLedger';
import { EmailTemplateRegistry } from '@/domain/admin/EmailTemplateRegistry';
import { MockEmailProvider } from '@/services/email/EmailProvider';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { ProductionInfrastructureService } from '@/domain/infrastructure/ProductionInfrastructureService';
import { LaunchReadinessService } from '@/domain/launch/LaunchReadinessService';
import { FileUploadSecurityService } from '@/lib/file-upload-security';
import { ObservabilityService } from '@/lib/observability';
import { safeInternalAdminPath } from '@/domain/infrastructure/safe-path';
import { getDictionary, SUPPORTED_LOCALES } from '@/i18n';
import { prisma } from '@/lib/prisma';
import { EnvironmentService } from '@/config/environment';
import firstBatchState from '@/data/catalogue-first-batch-state.json';
import specialistExecution from '@/data/catalogue-specialist-review-state.json';

export type RehearsalState = 'PASS' | 'FAIL' | 'BLOCKED' | 'WARNING' | 'NOT_CONFIGURED' | 'DEFERRED' | 'BLOCKED_BY_SCHEMA_DRIFT' | 'BLOCKED_BY_CONFIGURATION' | 'BLOCKED_BY_BACKUP_CONFIGURATION';

export interface RehearsalCheck {
  area: string;
  check: string;
  state: RehearsalState;
  evidence: string;
  requiredAction: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'NONE';
}

let lastPersistence: { persisted: boolean; rolledBack: boolean; concurrentWins: number; error: string } = {
  persisted: false,
  rolledBack: false,
  concurrentWins: 0,
  error: 'The isolated database rehearsal has not run.',
};

const VARIANT: CartProductVariantRecord = {
  id: 'rehearsal-variant',
  sku: 'REHEARSAL-SKU',
  name: 'Rehearsal Bar',
  priceEUR: 2000,
  priceGBP: null,
  stockLevel: 20,
  product: {
    id: 'rehearsal-product',
    slug: 'rehearsal-bar',
    status: 'PUBLISHED',
    availabilityType: 'REGION',
    images: [{ url: '/images/products/rehearsal.png', isPrimary: true }],
  },
};

function fixture(slug: string): ReadinessInput {
  const locales = ['en', 'de', 'fr', 'es', 'it', 'nl'];
  const translations: Record<string, { state: 'APPROVED'; draft: string; reviewer: string; timestamp: string }> = {};
  for (const locale of locales) {
    translations[locale] = { state: 'APPROVED', draft: `Public ${locale} copy.`, reviewer: 'content.review@fusionbars.eu', timestamp: '2026-10-01T00:00:00.000Z' };
  }
  return {
    slug,
    dataStatus: 'ADJUDICATED',
    testRecord: false,
    review: {
      productSlug: slug,
      reviewer: 'content.review@fusionbars.eu',
      updatedAt: '2026-10-01T00:00:00.000Z',
      pricing: { state: 'PRICE_APPROVED', approvedCurrency: 'EUR', approvedPrice: 20, rationale: 'Fixture price.', evidence: 'Fixture worksheet', reviewer: 'finance.review@fusionbars.eu', timestamp: '2026-10-01T00:00:00.000Z' },
      compliance: { state: 'APPROVED_FOR_PUBLICATION', rationale: 'Fixture confection.', evidence: 'Fixture file', reviewer: 'compliance.review@fusionbars.eu', timestamp: '2026-10-01T00:00:00.000Z' },
      countries: [{ country: 'NL', decision: 'ALLOWED', rationale: 'Fixture destination.', evidence: 'Fixture country file', reviewer: 'compliance.review@fusionbars.eu', timestamp: '2026-10-01T00:00:00.000Z' }],
      content: { state: 'CONTENT_APPROVED', candidatePublicContent: 'A rehearsal bar.', approvedPublicContent: 'A rehearsal bar.', reviewer: 'content.review@fusionbars.eu', timestamp: '2026-10-01T00:00:00.000Z' },
      translations,
      media: { state: 'VERIFIED', reviewer: 'catalogue.review@fusionbars.eu', timestamp: '2026-10-01T00:00:00.000Z', note: 'Fixture image.' },
      publication: 'NOT_READY',
    },
  };
}

export class CommerceRehearsalService {
  static async run(): Promise<{ production: 'PAUSED'; checks: RehearsalCheck[] }> {
    const checks: RehearsalCheck[] = [];
    const add = (check: RehearsalCheck) => checks.push(check);
    const beforeBatch = JSON.stringify(firstBatchState);
    const beforeSpecialist = JSON.stringify(specialistExecution);

    add(this.productionCheck());
    await this.infrastructure(add);
    await this.commerce(add);
    await this.payments(add);
    await this.orders(add);
    this.governance(add);
    this.security(add);
    this.admin(add);

    if (JSON.stringify(firstBatchState) !== beforeBatch || JSON.stringify(specialistExecution) !== beforeSpecialist) {
      add({ area: 'Catalogue', check: 'Pilot files unchanged', state: 'FAIL', evidence: 'The rehearsal wrote a pilot catalogue file.', requiredAction: 'Restore the pilot files from version control.', severity: 'P0' });
    } else {
      add({ area: 'Catalogue', check: 'Pilot files unchanged', state: 'PASS', evidence: 'First-batch and specialist files were not written.', requiredAction: 'None.', severity: 'NONE' });
    }
    if (PublicationReadinessService.evaluateCurrent('audit-test-product').readiness !== 'DO_NOT_PUBLISH') {
      add({ area: 'Catalogue', check: 'Audit Test Product', state: 'FAIL', evidence: 'Audit Test Product is not DO_NOT_PUBLISH.', requiredAction: 'Restore the do-not-publish decision.', severity: 'P0' });
    }
    return { production: 'PAUSED', checks };
  }

  private static productionCheck(): RehearsalCheck {
    return PRODUCTION_CONTROL_STATE === 'PAUSED'
      ? { area: 'Launch', check: 'Production control', state: 'PASS', evidence: 'Production remains PAUSED.', requiredAction: 'Leave production paused until every P0 blocker is cleared.', severity: 'NONE' }
      : { area: 'Launch', check: 'Production control', state: 'FAIL', evidence: `Production control is ${PRODUCTION_CONTROL_STATE}.`, requiredAction: 'Return production to PAUSED.', severity: 'P0' };
  }

  private static async infrastructure(add: (check: RehearsalCheck) => void): Promise<void> {
    let schema: 'PARITY' | 'DRIFT' | 'UNREACHABLE' = 'UNREACHABLE';
    try {
      const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Customer' AND column_name = 'preferredCurrency'
      `;
      schema = rows.length > 0 ? 'PARITY' : 'DRIFT';
    } catch {
      schema = 'UNREACHABLE';
    }
    add({
      area: 'Database',
      check: 'Schema parity',
      state: schema === 'PARITY' ? 'PASS' : schema === 'DRIFT' ? 'BLOCKED_BY_SCHEMA_DRIFT' : 'BLOCKED',
      evidence: schema === 'PARITY'
        ? 'Customer.preferredCurrency exists on the connected database.'
        : schema === 'DRIFT'
          ? 'Customer.preferredCurrency is absent. Migration 20261001231500_schema_parity is the forward fix and was not confirmed on the database.'
          : 'The connected database could not be queried. No destructive repair was attempted.',
      requiredAction: schema === 'PARITY' ? 'None.' : 'Apply prisma migrate deploy to the development database when it is reachable. Do not use db push or migrate reset.',
      severity: schema === 'PARITY' ? 'NONE' : 'P0',
    });

    const secrets = ProductionInfrastructureService.secretChecklist();
    const weak = secrets.filter((item) => item.state === 'PRODUCTION_SECRET_TOO_WEAK').map((item) => item.name);
    const missing = secrets.filter((item) => item.state === 'MISSING').map((item) => item.name);
    add({
      area: 'Secrets',
      check: 'Production strength',
      state: weak.length || missing.length ? 'BLOCKED' : 'PASS',
      evidence: `Weak: ${weak.join(', ') || 'none'}. Missing: ${missing.join(', ') || 'none'}. Values were not read.`,
      requiredAction: 'Replace weak secrets with distinct 32+ character values. Do not generate them into source control.',
      severity: weak.length ? 'P0' : 'NONE',
    });
    const storage = ProductionInfrastructureService.publicHealth().storage;
    add({
      area: 'Storage',
      check: 'Production bucket',
      state: storage === 'CONFIGURED' ? 'PASS' : 'NOT_CONFIGURED',
      evidence: storage === 'CONFIGURED' ? 'A non-mock storage provider is configured. Credentials are not shown.' : 'Object storage is still the mock provider.',
      requiredAction: 'Configure a private production bucket. Do not publish payment evidence.',
      severity: storage === 'CONFIGURED' ? 'NONE' : 'P0',
    });
    add({
      area: 'Backups',
      check: 'Provider backup',
      state: 'BLOCKED_BY_BACKUP_CONFIGURATION',
      evidence: LaunchReadinessService.checkBackups().validationMessage,
      requiredAction: 'Enable backups on the database host and set BACKUP_PROVIDER. No restore was performed.',
      severity: 'P0',
    });
    add({
      area: 'Monitoring',
      check: 'External monitoring',
      state: 'NOT_CONFIGURED',
      evidence: ProductionInfrastructureService.monitoringStatus(),
      requiredAction: 'Set MONITORING_DSN from a real monitoring destination.',
      severity: 'P1',
    });
    const rate = LaunchReadinessService.checkRateLimiting(EnvironmentService.getConfig());
    add({
      area: 'Rate Limiting',
      check: 'Distributed',
      state: rate.status === 'READY' ? 'PASS' : 'WARNING',
      evidence: rate.validationMessage,
      requiredAction: 'Configure Upstash for production. In-memory limiting remains for this process.',
      severity: rate.status === 'READY' ? 'NONE' : 'P1',
    });
    const email = EmailProductionReadinessService.report();
    add({
      area: 'Email',
      check: 'DNS and provider',
      state: email.state === 'ACTIVE' && email.blockers.length === 0 ? 'PASS' : 'BLOCKED',
      evidence: `Email state ${email.state}. Blockers: ${email.blockers.join('; ') || 'none'}.`,
      requiredAction: 'Leave production email inactive until DNS and a successful test send exist.',
      severity: 'P0',
    });
    const site = process.env.SITE_URL || '';
    add({
      area: 'Environment',
      check: 'Canonical site URL',
      state: site === 'https://fusionbars.eu' ? 'PASS' : 'BLOCKED',
      evidence: site === 'https://fusionbars.eu' ? 'SITE_URL is the canonical host.' : 'Loaded SITE_URL is not https://fusionbars.eu.',
      requiredAction: 'Set SITE_URL and NEXT_PUBLIC_SITE_URL to https://fusionbars.eu for production.',
      severity: 'P0',
    });
    const payments = PaymentConfigurationService.report();
    add({
      area: 'Payments',
      check: 'Production config',
      state: payments.productionOptions.length === 0 ? 'NOT_CONFIGURED' : 'BLOCKED',
      evidence: `Bank ${payments.bank}. BTC ${payments.crypto.BTC}. Production options: ${payments.productionOptions.length}. Conversion ${payments.conversion}.`,
      requiredAction: 'Do not activate live bank or wallet methods until real credentials and finance approval exist.',
      severity: 'P0',
    });
    const legal = LegalGovernanceService.launchBlockers();
    add({
      area: 'Legal',
      check: 'Company information',
      state: legal.length ? 'NOT_CONFIGURED' : 'PASS',
      evidence: legal.join(' ') || 'No legal launch blocker was returned.',
      requiredAction: 'Enter verified company facts and publish policies through the legal workflow.',
      severity: 'P0',
    });
  }

  private static async commerce(add: (check: RehearsalCheck) => void): Promise<void> {
    const fetchVariants = async (ids: string[]) => [VARIANT].filter((item) => ids.includes(item.id));
    const standard = await CartPricingService.calculateCart({
      items: [{ variantId: VARIANT.id, quantity: 1, unitPrice: 1 } as never],
      currency: 'EUR',
      destinationCountry: 'DE',
      selectedShippingMethod: 'STANDARD',
      fetchVariantsByIds: fetchVariants,
    });
    add({
      area: 'Commerce',
      check: 'Server price and standard shipping',
      state: standard.subtotal === 2000 && standard.shippingAmount === 1500 && standard.totalAmount === 3500 ? 'PASS' : 'FAIL',
      evidence: `Subtotal ${standard.subtotal}, shipping ${standard.shippingAmount}, total ${standard.totalAmount}. Client unit price was ignored.`,
      requiredAction: standard.totalAmount === 3500 ? 'None.' : 'Keep checkout totals on the server.',
      severity: standard.totalAmount === 3500 ? 'NONE' : 'P0',
    });
    const express = ShippingService.calculateShipping({ subtotal: 2000, currency: 'EUR', destinationCountry: 'DE', selectedMethodCode: 'EXPRESS' });
    const free = ShippingService.calculateShipping({ subtotal: 30000, currency: 'EUR', destinationCountry: 'NL', selectedMethodCode: 'STANDARD' });
    const below = ShippingService.calculateShipping({ subtotal: 29999, currency: 'EUR', destinationCountry: 'NL', selectedMethodCode: 'STANDARD' });
    add({
      area: 'Shipping',
      check: 'EUR standard, express, and free threshold',
      state: express.selectedMethod.cost === 2000 && free.qualifiesForFreeShipping && free.selectedMethod.cost === 0 && !below.qualifiesForFreeShipping && below.selectedMethod.cost === 1500 ? 'PASS' : 'FAIL',
      evidence: `Express ${express.selectedMethod.cost}. At €300 shipping ${free.selectedMethod.cost}. Below threshold shipping ${below.selectedMethod.cost}. Threshold basis ${CommercialConfigurationService.get().shipping.thresholdBasis}.`,
      requiredAction: 'Keep the configured €15 / €20 / €300 values.',
      severity: 'NONE',
    });
    let gbp: 'PASS' | 'BLOCKED_BY_CONFIGURATION' = 'BLOCKED_BY_CONFIGURATION';
    try {
      PricingEngine.resolveUnitPrice({ slug: 'rehearsal-bar', catalogue: { priceEUR: 2000, priceGBP: null }, currency: 'GBP' });
      gbp = 'PASS';
    } catch {
      gbp = 'BLOCKED_BY_CONFIGURATION';
    }
    add({
      area: 'Currency',
      check: 'GBP price',
      state: gbp,
      evidence: gbp === 'PASS' ? 'An approved GBP price was resolved.' : 'GBP checkout stopped with CONFIGURATION_REQUIRED. No conversion was invented.',
      requiredAction: 'Approve an explicit GBP price or an FX policy before GBP checkout.',
      severity: 'P1',
    });
    const tax = TaxEngine.resolve({ country: 'DE', taxClass: 'STANDARD', taxableMinor: 2000, at: new Date().toISOString() });
    add({
      area: 'Tax',
      check: 'Missing tax configuration',
      state: tax.status === 'TAX_CONFIGURATION_REQUIRED' && tax.taxMinor == null ? 'PASS' : 'FAIL',
      evidence: `Tax status ${tax.status}. Tax amount ${tax.taxMinor === null ? 'not calculated' : tax.taxMinor}.`,
      requiredAction: 'Configure a tax class and rate before treating tax as calculated.',
      severity: tax.taxMinor == null ? 'NONE' : 'P0',
    });
    add({
      area: 'Tax',
      check: 'Configured tax rate',
      state: 'NOT_CONFIGURED',
      evidence: 'No VAT rate or jurisdiction is configured. The missing-tax guard did not invent one.',
      requiredAction: 'Enter an approved tax configuration before launch.',
      severity: 'P0',
    });
    const allowed = DestinationEngine.evaluate({ slug: 'rehearsal-bar', country: 'DE' });
    const blocked = DestinationEngine.evaluate({ slug: 'audit-test-product', country: 'DE' });
    const disabled = DestinationEngine.evaluate({ slug: 'rehearsal-bar', country: 'US' });
    add({
      area: 'Shipping',
      check: 'Destination eligibility',
      state: !allowed.blockCheckout && blocked.blockCheckout && disabled.blockCheckout ? 'PASS' : 'FAIL',
      evidence: `DE unresolved blockCheckout=${allowed.blockCheckout}. Audit product blockCheckout=${blocked.blockCheckout}. US blockCheckout=${disabled.blockCheckout}.`,
      requiredAction: 'Keep unresolved and disabled destinations from becoming allowed.',
      severity: 'P0',
    });
    const exact = InventoryService.applyReservation({ variantId: 'rehearsal-variant', locationCode: 'NL', quantityOnHand: 1, quantityReserved: 0 }, 1);
    let oversell = false;
    try {
      InventoryService.applyReservation(exact.updatedRecord, 1);
      oversell = true;
    } catch {
      oversell = false;
    }
    const released = InventoryService.releaseReservation(exact.updatedRecord, 1);
    const committed = InventoryService.commitReservation(exact.updatedRecord, 1);
    add({
      area: 'Inventory',
      check: 'Reservation, release, and no oversell',
      state: !oversell && released.updatedRecord.quantityReserved === 0 && committed.updatedRecord.quantityOnHand === 0 ? 'PASS' : 'FAIL',
      evidence: 'A second reservation of the last unit was rejected. Release and commit stayed non-negative. This is the in-memory reservation engine, not a database row lock.',
      requiredAction: 'Keep the reservation rules. A database concurrency rehearsal remains separate from this engine.',
      severity: 'NONE',
    });
    try {
      const persistence = await OrderDatabasePersistence.rehearseIsolatedOrder();
      lastPersistence = { ...persistence, error: '' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The isolated order rehearsal failed.';
      lastPersistence = {
        persisted: false,
        rolledBack: false,
        concurrentWins: 0,
        error: message.includes('postgres://') || message.includes('@') ? 'The isolated order rehearsal failed. The connection string was not recorded.' : message,
      };
    }
    const persistence = lastPersistence.error ? null : lastPersistence;
    add({
      area: 'Inventory',
      check: 'Database concurrency',
      state: persistence?.concurrentWins === 1 ? 'PASS' : 'FAIL',
      evidence: persistence
        ? `Two competing reservations of one database unit produced ${persistence.concurrentWins} commit.`
        : lastPersistence.error,
      requiredAction: persistence?.concurrentWins === 1 ? 'Keep the conditional reservation update.' : 'Fix the database reservation before launch.',
      severity: persistence?.concurrentWins === 1 ? 'NONE' : 'P1',
    });
    const split = FulfilmentRoutingService.plan({
      destinationCountry: 'DE',
      items: [
        { variantId: 'a', quantity: 1, requiredHub: 'NL' },
        { variantId: 'b', quantity: 1, requiredHub: 'ES' },
      ],
    });
    add({
      area: 'Shipping',
      check: 'Multi-hub cart',
      state: split.ok === false && split.code === 'MULTI_HUB_NOT_CONFIGURED' ? 'PASS' : 'FAIL',
      evidence: `Routing result ${split.code}. Split orders are ${DestinationEngine.get().splitOrders}.`,
      requiredAction: 'Keep an unsupported split from becoming an order.',
      severity: 'NONE',
    });
    for (const locale of SUPPORTED_LOCALES) {
      const dictionary = getDictionary(locale);
      const complete = Boolean(dictionary.navigation.shop && dictionary.commerce.checkout && dictionary.commerce.total);
      add({
        area: 'Storefront',
        check: `${locale} interface copy`,
        state: complete ? 'PASS' : 'FAIL',
        evidence: complete ? 'Navigation, checkout, and total labels exist.' : 'A required interface label is missing.',
        requiredAction: complete ? 'Published legal translations remain separate and are not complete.' : 'Add the missing interface label.',
        severity: complete ? 'NONE' : 'P2',
      });
    }
  }

  private static async payments(add: (check: RehearsalCheck) => void): Promise<void> {
    PaymentVerificationService.resetForTests();
    EmailDeliveryLedger.resetForTests();
    const provider = new MockEmailProvider();
    PaymentVerificationService.registerProof({ orderNumber: 'FB-EU-REHEARSAL-1', reference: 'FUSION-REHEARSAL-1', expectedAmount: 3500, submittedAmount: 3500, evidenceKey: 'private/rehearsal/proof.pdf' });
    const mismatch = PaymentVerificationService.review({ orderNumber: 'FB-EU-REHEARSAL-1', actor: 'finance@fusionbars.eu', role: 'FINANCE_MANAGER', decision: 'VERIFIED', submittedAmount: 3400, reason: 'Amount check' });
    const verified = PaymentVerificationService.review({ orderNumber: 'FB-EU-REHEARSAL-1', actor: 'finance@fusionbars.eu', role: 'FINANCE_MANAGER', decision: 'VERIFIED', submittedAmount: 3500, reason: 'Fixture verification' });
    const again = PaymentVerificationService.review({ orderNumber: 'FB-EU-REHEARSAL-1', actor: 'finance@fusionbars.eu', role: 'FINANCE_MANAGER', decision: 'VERIFIED', submittedAmount: 3500, reason: 'Repeat' });
    let duplicate = false;
    try {
      PaymentVerificationService.registerProof({ orderNumber: 'FB-EU-REHEARSAL-2', reference: 'FUSION-REHEARSAL-1', expectedAmount: 3500, evidenceKey: 'private/rehearsal/proof-2.pdf' });
      duplicate = true;
    } catch {
      duplicate = false;
    }
    let publicProof = false;
    try {
      PaymentVerificationService.registerProof({ orderNumber: 'FB-EU-REHEARSAL-3', reference: 'FUSION-REHEARSAL-3', expectedAmount: 3500, evidenceKey: 'https://example.com/proof.pdf' });
      publicProof = true;
    } catch {
      publicProof = false;
    }
    const handoff = await provider.sendEmail({ to: 'rehearsal@example.test', subject: 'TEST EMAIL rehearsal', html: 'TEST EMAIL', text: 'TEST EMAIL' });
    const status = await provider.getDeliveryStatus(handoff.messageId || '');
    const claimed = EmailDeliveryLedger.claim('rehearsal-mail', { template: 'payment-verified', recipient: 'rehearsal@example.test', provider: 'mock', orderNumber: 'FB-EU-REHEARSAL-1' });
    const repeat = EmailDeliveryLedger.claim('rehearsal-mail', { template: 'payment-verified', recipient: 'rehearsal@example.test', provider: 'mock', orderNumber: 'FB-EU-REHEARSAL-1' });
    PaymentVerificationService.resetForTests();
    EmailDeliveryLedger.resetForTests();
    add({
      area: 'Payments',
      check: 'Mismatch, duplicate, public proof, idempotent verify',
      state: mismatch.code === 'AMOUNT_MISMATCH' && verified.state === 'VERIFIED' && again.idempotent && !duplicate && !publicProof ? 'PASS' : 'FAIL',
      evidence: `Mismatch ${mismatch.code || mismatch.state}. Verified ${verified.state}. Repeat idempotent ${Boolean(again.idempotent)}. Duplicate accepted ${duplicate}. Public proof accepted ${publicProof}.`,
      requiredAction: 'Keep finance verification authoritative.',
      severity: 'NONE',
    });
    add({
      area: 'Email',
      check: 'Mock handoff and idempotency',
      state: handoff.success && status.status !== 'DELIVERED' && claimed && !repeat ? 'PASS' : 'FAIL',
      evidence: `Mock status ${status.status}. Duplicate claim accepted ${repeat}. This is not provider delivery.`,
      requiredAction: 'Keep production email blocked until DNS and a controlled test send pass.',
      severity: 'NONE',
    });
    const templates = EmailTemplateRegistry.validateAll();
    add({
      area: 'Email',
      check: 'Template validation',
      state: templates.ok ? 'PASS' : 'FAIL',
      evidence: templates.ok ? `${templates.validated} templates validated.` : templates.error || 'A template failed.',
      requiredAction: templates.ok ? 'None.' : 'Repair the failing template before any send.',
      severity: templates.ok ? 'NONE' : 'P1',
    });
  }

  private static async orders(add: (check: RehearsalCheck) => void): Promise<void> {
    const path: Array<'PENDING_PAYMENT' | 'PAYMENT_SUBMITTED' | 'PAYMENT_VERIFIED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'> = ['PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'PAYMENT_VERIFIED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    let cursor: typeof path[number] = 'PENDING_PAYMENT';
    let legal = true;
    for (const next of path.slice(1)) {
      if (!OrderStatusService.isTransitionAllowed(cursor, next)) legal = false;
      cursor = next;
    }
    const invalid = OrderStatusService.isTransitionAllowed('PENDING_PAYMENT', 'SHIPPED') || OrderStatusService.isTransitionAllowed('DELIVERED', 'PROCESSING');
    const deprecated = !('PAYMENT_CONFIRMED' in (OrderStatusService as unknown as Record<string, unknown>));
    add({
      area: 'Orders',
      check: 'Canonical lifecycle',
      state: legal && !invalid ? 'PASS' : 'FAIL',
      evidence: `Happy path reached ${cursor}. Invalid jumps accepted: ${invalid}. Deprecated statuses are absent from the transition map: ${deprecated}.`,
      requiredAction: 'Keep the canonical status graph.',
      severity: 'NONE',
    });
    add({
      area: 'Orders',
      check: 'Live database order insert',
      state: lastPersistence.persisted && lastPersistence.rolledBack ? 'PASS' : 'FAIL',
      evidence: lastPersistence.persisted && lastPersistence.rolledBack
        ? 'An isolated order committed with a real ProductVariant and payment row, then a failed reservation left no order row. The rehearsal order was deleted.'
        : lastPersistence.error || 'The isolated order did not commit and roll back.',
      requiredAction: lastPersistence.persisted && lastPersistence.rolledBack ? 'Keep transactional persistence on the production path.' : 'Fix order persistence before launch.',
      severity: lastPersistence.persisted && lastPersistence.rolledBack ? 'NONE' : 'P0',
    });
    add({
      area: 'Storefront',
      check: 'Browser navigation',
      state: 'DEFERRED',
      evidence: 'Homepage, search, and locale clicks were not exercised in a browser.',
      requiredAction: 'Click through the storefront when a browser session is available.',
      severity: 'P2',
    });
  }

  private static governance(add: (check: RehearsalCheck) => void): void {
    PublicationReadinessService.resetForTests();
    const input = fixture('fixture-rehearsal-bar');
    PublicationReadinessService.installFixture(input);
    const ready = PublicationReadinessService.evaluateCurrent(input.slug).readiness === 'READY_FOR_PUBLICATION';
    const audit = PublicationReadinessService.evaluateCurrent('audit-test-product');
    add({
      area: 'Catalogue',
      check: 'Fixture ready and audit product blocked',
      state: ready && audit.readiness === 'DO_NOT_PUBLISH' && !PublicationReadinessService.isPubliclyVisible('audit-test-product') ? 'PASS' : 'FAIL',
      evidence: `Fixture readiness ${PublicationReadinessService.evaluateCurrent(input.slug).readiness}. Audit ${audit.readiness}.`,
      requiredAction: 'Do not publish unresolved catalogue products.',
      severity: 'NONE',
    });
    LegalGovernanceService.resetForTests();
    const consent = LegalGovernanceService.recordConsent({ categories: { preferences: true, analytics: false, marketing: false }, locale: 'en', privacyVersion: null, cookieVersion: null });
    LegalGovernanceService.withdrawOptionalConsent(consent.id);
    add({
      area: 'Governance',
      check: 'Unpublished legal documents and consent',
      state: LegalGovernanceService.publicLinks().length === 0 && LegalGovernanceService.analyticsStatus() === 'NOT_CONFIGURED' ? 'PASS' : 'FAIL',
      evidence: `Public legal links ${LegalGovernanceService.publicLinks().length}. Analytics ${LegalGovernanceService.analyticsStatus()}.`,
      requiredAction: 'Publish legal documents only after the company facts are verified.',
      severity: 'NONE',
    });
    PublicationReadinessService.resetForTests();
    LegalGovernanceService.resetForTests();
  }

  private static security(add: (check: RehearsalCheck) => void): void {
    const expired = AuthService.generateSessionToken({ id: 'rehearsal', email: 'rehearsal@example.test', role: 'CUSTOMER' }, 1);
    const current = AuthService.generateSessionToken({ id: 'rehearsal', email: 'rehearsal@example.test', role: 'CUSTOMER' });
    let ssrf = false;
    try {
      ProductionInfrastructureService.assertSafeRemoteUrl('http://169.254.169.254/latest/meta-data');
      ssrf = true;
    } catch {
      ssrf = false;
    }
    let webhook = false;
    try {
      ProductionInfrastructureService.rejectUnconfiguredWebhook('signed');
      webhook = true;
    } catch {
      webhook = false;
    }
    const upload = FileUploadSecurityService.validateUpload({ filename: 'proof.html', mimeType: 'text/html', sizeBytes: 32 });
    const scrubbed = JSON.stringify(ObservabilityService.scrub({ password: 'hunter2', DATABASE_URL: 'postgres://user:secret@db.example/app', correlationId: ProductionInfrastructureService.createCorrelationId() }));
    const safe = !AuthService.verifySessionToken(expired)
      && !AuthService.verifySessionToken(`${current.slice(0, -4)}forged`)
      && !AdminAccess.can('CUSTOMER', 'payments')
      && safeInternalAdminPath('https://evil.example/en/admin', 'en') === '/en/admin'
      && !ssrf
      && !upload.valid
      && !webhook
      && !scrubbed.includes('hunter2')
      && !scrubbed.includes('postgres://');
    add({
      area: 'Security',
      check: 'Session, RBAC, redirect, upload, SSRF, webhook, logs',
      state: safe ? 'PASS' : 'FAIL',
      evidence: safe ? 'The Phase 19 regression checks still stop the attempted actions.' : 'A security regression check was accepted.',
      requiredAction: safe ? 'None.' : 'Block the failing control before any launch.',
      severity: safe ? 'NONE' : 'P0',
    });
  }

  private static admin(add: (check: RehearsalCheck) => void): void {
    const finance = AdminAccess.canVerifyPayments('FINANCE_MANAGER') && !RBACService.hasPermission('FINANCE_MANAGER', 'content:publish');
    const compliance = RBACService.hasPermission('COMPLIANCE_MANAGER', 'compliance:write') && !AdminAccess.canVerifyPayments('COMPLIANCE_MANAGER');
    const content = RBACService.hasPermission('CONTENT_MANAGER', 'content:write') && !AdminAccess.canVerifyPayments('CONTENT_MANAGER');
    const orders = RBACService.hasPermission('ORDER_MANAGER', 'orders:read');
    const customer = !AdminAccess.can('CUSTOMER', 'payments') && !RBACService.hasPermission('CUSTOMER', 'orders:verify_payment');
    add({
      area: 'Admin',
      check: 'Role boundaries',
      state: finance && compliance && content && orders && customer ? 'PASS' : 'FAIL',
      evidence: `Finance verify ${AdminAccess.canVerifyPayments('FINANCE_MANAGER')}. Compliance write ${RBACService.hasPermission('COMPLIANCE_MANAGER', 'compliance:write')}. Content payment verify ${AdminAccess.canVerifyPayments('CONTENT_MANAGER')}. Customer admin ${AdminAccess.can('CUSTOMER', 'payments')}.`,
      requiredAction: 'Keep authority on the server.',
      severity: 'NONE',
    });
  }
}
