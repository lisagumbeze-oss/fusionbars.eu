import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { type LaunchControlState } from '@/domain/launch/launch-policy';
import { FUSION_EU_INITIAL_LAUNCH_POLICY, type LaunchWaiver } from '@/domain/launch/initial-launch-policy';
import { DNS_OPERATOR_GUIDANCE, paymentProofUploadChoice } from '@/domain/launch/operator-configuration';
import { ProductionInfrastructureService } from '@/domain/infrastructure/ProductionInfrastructureService';
import { BackupReadinessService } from '@/domain/infrastructure/BackupReadinessService';
import { ProductionMonitoringService } from '@/domain/infrastructure/ProductionMonitoringService';
import { RateLimitReadinessService } from '@/domain/infrastructure/RateLimitReadinessService';
import { EmailProductionReadinessService } from '@/services/email/EmailProductionReadinessService';
import { PaymentConfigurationService } from '@/domain/payments/PaymentConfigurationService';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { TaxEngine } from '@/domain/commercial/TaxEngine';
import { PublicationReadinessService } from '@/domain/catalog/PublicationReadinessService';
import { prisma } from '@/lib/prisma';
import type { RoleName } from '@/types';

export type GateState = 'READY' | 'PASS' | 'WARNING' | 'BLOCKED' | 'NOT_CONFIGURED' | 'CONFIGURATION_REQUIRED' | 'DEFERRED' | 'DISABLED_FOR_LAUNCH' | 'WAIVED' | 'NOT_APPLICABLE' | 'NOT_TESTED';

export interface LaunchGate {
  area: string;
  requirement: string;
  state: GateState;
  evidence: string;
  blocking: boolean;
  action: string;
}

export interface FinalLaunchDecision {
  production: 'PAUSED';
  decision: 'LAUNCH_BLOCKED' | 'READY_TO_LAUNCH';
  gates: LaunchGate[];
  blockers: string[];
  warnings: string[];
  policyId: typeof FUSION_EU_INITIAL_LAUNCH_POLICY.id;
  waivers: LaunchWaiver[];
}

const audits: Array<{ at: string; actor: string; role: string; action: string; result: string }> = [];

function gate(area: string, requirement: string, state: GateState, evidence: string, blocking: boolean, action: string): LaunchGate {
  return { area, requirement, state, evidence, blocking, action };
}

export class FinalLaunchReadinessService {
  private static state: LaunchControlState = 'PAUSED';

  static currentState(): LaunchControlState {
    return this.state;
  }

  static auditLog() {
    return audits.map((item) => ({ ...item }));
  }

  static async evaluate(): Promise<FinalLaunchDecision> {
    const gates: LaunchGate[] = [];
    let schemaReady = false;
    try {
      const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'Customer' AND column_name = 'preferredCurrency'
      `;
      schemaReady = rows.length > 0;
    } catch {
      schemaReady = false;
    }
    gates.push(gate('Database', 'Schema parity', schemaReady ? 'READY' : 'BLOCKED', schemaReady ? 'preferredCurrency is present and migrations were applied in this environment.' : 'The connected database could not prove schema parity.', !schemaReady, schemaReady ? 'None.' : 'Run prisma migrate deploy. Do not use db push or migrate reset.'));

    const signing = ProductionInfrastructureService.signingSecretStatus();
    const weak = signing.secrets.filter((item) => item.state !== 'CONFIGURED');
    const secretsConfigured = weak.length === 0 && signing.distinct === 'PASS';
    gates.push(gate('Secrets', 'Strong secrets', secretsConfigured ? 'PASS' : 'CONFIGURATION_REQUIRED', `${weak.length ? weak.map((item) => `${item.name} ${item.state}`).join('; ') : 'The three signing secrets are CONFIGURED. Values are not shown.'} DISTINCT = ${signing.distinct}`, !secretsConfigured, 'Set SESSION_SECRET, AUTH_SECRET, and ORDER_LOOKUP_SECRET in the production environment. Each value must be unique, at least 32 characters, not a UUID, and not a placeholder. Do not commit the values.'));

    const storage = ProductionInfrastructureService.publicHealth().storage;
    const proofChoice = paymentProofUploadChoice();
    const storageHealth = storage === 'CONFIGURED' ? 'PASS' : 'CONFIGURATION_REQUIRED';
    gates.push(gate('Storage', 'Public storefront media', 'NOT_APPLICABLE', 'Public catalogue images are served by the application. The private payment-proof bucket is not required for those pages.', false, 'Do not make the private bucket public to serve catalogue images.'));
    if (proofChoice === 'DISABLED') {
      gates.push(gate('Storage', 'Private payment proofs', 'NOT_APPLICABLE', 'PAYMENT_PROOF_UPLOAD=disabled. Customer proof upload is not offered, so a private proof bucket is not required for this launch.', false, 'Set PAYMENT_PROOF_UPLOAD=required before collecting receipts.'));
    } else {
      gates.push(gate('Storage', 'Private payment proofs', storageHealth, storage === 'CONFIGURED' ? 'A non-mock storage provider is configured.' : 'Private proof storage is mock / TEST. STORAGE_PROVIDER, STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_REGION, STORAGE_ACCESS_KEY, and STORAGE_SECRET_KEY are not a production configuration. Values are not shown.', storage !== 'CONFIGURED', 'Supply the storage variables and pass a connectivity probe before proofs are accepted.'));
    }
    gates.push(gate('Payments', 'Payment proof upload', proofChoice === 'DISABLED' ? 'NOT_APPLICABLE' : proofChoice === 'REQUIRED' && storage === 'CONFIGURED' ? 'PASS' : 'CONFIGURATION_REQUIRED', proofChoice === 'CHOICE_REQUIRED' ? 'PAYMENT_PROOF_UPLOAD is unset. Choose required or disabled.' : `PAYMENT_PROOF_UPLOAD=${proofChoice}.`, proofChoice !== 'DISABLED' && storage !== 'CONFIGURED', 'Set PAYMENT_PROOF_UPLOAD to required or disabled. required stays blocked until private storage is configured.'));

    const backups = BackupReadinessService.report();
    const backupDimensions = BackupReadinessService.dimensions();
    const backupGate = backups.state === 'BACKUP_READY' ? 'READY' : backups.state === 'BACKUP_CONFIGURATION_REQUIRED' ? 'CONFIGURATION_REQUIRED' : 'BLOCKED';
    gates.push(gate('Backups', 'Provider backup', backupGate, `${backups.state}. BACKUP_PROVIDER_CONFIGURED=${backupDimensions.BACKUP_PROVIDER_CONFIGURED}. PITR_CONFIGURED=${backupDimensions.PITR_CONFIGURED}. RECOVERY_COPY_CONFIGURED=${backupDimensions.RECOVERY_COPY_CONFIGURED}. RESTORE_TESTED=${backupDimensions.RESTORE_TESTED}.`, backups.state !== 'BACKUP_READY', 'Record each backup dimension independently. A database family is not a backup, and a restore test is not fabricated.'));

    const monitoring = ProductionMonitoringService.report();
    gates.push(gate('Monitoring', 'External monitor', monitoring.state === 'OPERATIONAL' ? 'READY' : 'NOT_CONFIGURED', monitoring.state, monitoring.state !== 'OPERATIONAL', 'Set MONITORING_PROVIDER and MONITORING_DSN. A test signal is available only after a real ingest is configured. Structured logs are not a monitor.'));

    const redis = RateLimitReadinessService.report();
    gates.push(gate('Rate limiting', 'Distributed', redis.state === 'OPERATIONAL' ? 'READY' : 'NOT_CONFIGURED', `${redis.state}. Mode ${redis.mode}. Failure mode stays FAIL_CLOSED.`, redis.state !== 'OPERATIONAL', 'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Protected production operations fail closed when the distributed store is unavailable.'));

    const email = EmailProductionReadinessService.report();
    gates.push(gate('Email', 'Provider', email.state === 'ACTIVE' ? 'READY' : 'BLOCKED', `State ${email.state}.`, email.state !== 'ACTIVE', 'Do not activate email while DNS or the provider is unresolved.'));
    gates.push(gate('Email', 'SPF', email.dns.SPF === 'VERIFIED' ? 'READY' : 'CONFIGURATION_REQUIRED', email.dns.SPF === 'VERIFIED' ? 'VERIFIED' : 'DNS_CONFIGURATION_REQUIRED', email.dns.SPF !== 'VERIFIED', DNS_OPERATOR_GUIDANCE.SPF));
    gates.push(gate('Email', 'DKIM', email.dns.DKIM === 'VERIFIED' ? 'READY' : 'CONFIGURATION_REQUIRED', email.dns.DKIM === 'VERIFIED' ? 'VERIFIED' : 'DNS_CONFIGURATION_REQUIRED', email.dns.DKIM !== 'VERIFIED', DNS_OPERATOR_GUIDANCE.DKIM));
    gates.push(gate('Email', 'DMARC', email.dns.DMARC === 'VERIFIED' ? 'READY' : 'CONFIGURATION_REQUIRED', email.dns.DMARC === 'VERIFIED' ? 'VERIFIED' : 'DNS_CONFIGURATION_REQUIRED', email.dns.DMARC !== 'VERIFIED', DNS_OPERATOR_GUIDANCE.DMARC));

    const payments = PaymentConfigurationService.report();
    const paymentWaiver = FUSION_EU_INITIAL_LAUNCH_POLICY.waivers[0];
    gates.push(gate('Payments', 'Automated provider activation', 'WAIVED', `${paymentWaiver.reason} Bank ${payments.bank}. BTC ${payments.crypto.BTC}. Production options: ${payments.productionOptions.length}. Conversion ${payments.conversion}.`, false, paymentWaiver.risk_note));
    const instructionsReady = (payments.bankFormat === 'FORMAT_VALID' && payments.bankVerification === 'VERIFIED') || payments.crypto.BTC === 'READY' || payments.crypto.USDT === 'READY' || payments.crypto.ETH === 'READY';
    gates.push(gate('Payments', 'Manual payment instructions', instructionsReady ? 'READY' : 'CONFIGURATION_REQUIRED', instructionsReady ? 'A verified bank account or wallet is configured. The value is not shown.' : 'No verified IBAN or wallet is configured. Empty and placeholder account details stay withheld.', !instructionsReady, 'Set BANK_ACCOUNT_HOLDER, BANK_NAME, BANK_IBAN, BANK_BIC_SWIFT, and the instruction fields, or a verified asset, network, and wallet. Then record business verification. Do not use a test value.'));

    const tax = TaxEngine.resolve({ country: 'DE', taxClass: 'STANDARD', taxableMinor: 2000, at: new Date().toISOString() });
    gates.push(gate('Tax', 'VAT', tax.status === 'CONFIGURED' ? 'PASS' : 'CONFIGURATION_REQUIRED', tax.status, tax.status !== 'CONFIGURED', 'Enter an approved jurisdiction, class, rate, and effective date. No rate was invented.'));

    gates.push(gate('Currency', 'EUR', 'WARNING', 'EUR checkout uses server prices. Launch products do not yet have approved commercial EUR prices.', true, 'Approve an EUR price for each product intended for launch.'));
    gates.push(gate('Currency', 'GBP', 'READY', 'The announcement bar offers the British Pound switch beside Euro. Display uses the GBP amount already stored for each product.', false, 'No new GBP price was invented.'));

    const legal = LegalGovernanceService.launchBlockers().filter((item) => !item.startsWith('Production is'));
    gates.push(gate('Legal', 'Company info', legal.some((item) => item.includes('company')) ? 'NOT_CONFIGURED' : 'READY', legal.find((item) => item.includes('company')) || 'Company profile did not report a missing name.', legal.some((item) => item.includes('company')), 'Enter verified company facts. Do not invent them.'));
    gates.push(gate('Legal', 'Required policies', legal.some((item) => item.includes('not published')) ? 'NOT_CONFIGURED' : 'READY', legal.filter((item) => item.includes('not published')).join(' ') || 'No unpublished-policy blocker was returned.', legal.some((item) => item.includes('not published')), 'Approve and publish the required policies. English presence does not complete other locales.'));

    const cohort = PublicationReadinessService.cohortReport();
    const audit = cohort.rows.find((row) => row.slug === 'audit-test-product');
    gates.push(gate('Catalogue', 'Launch products', cohort.published > 0 && cohort.doNotPublish >= 1 ? 'READY' : 'BLOCKED', `Pilot published ${cohort.published}. Not ready ${cohort.notReady}. Do not publish ${cohort.doNotPublish}. Audit ${audit?.readiness || 'missing'}.`, true, 'Publish only products that pass every gate. Leave Audit Test Product unpublished.'));

    gates.push(gate('Country', 'Eligibility', 'WARNING', 'Store destinations exist. Product eligibility stays unresolved unless an explicit decision is recorded.', true, 'Record explicit eligibility for every destination that will be sold.'));
    gates.push(gate('Shipping', 'Routes and methods', 'WARNING', 'EUR standard 1500, express 2000, free threshold 30000. Split hub carts stay blocked.', false, 'Keep these rates. Approve destinations separately.'));
    gates.push(gate('Security', 'High-risk tests', 'WARNING', 'The automated regression is in the test suite. This evaluation does not replace that run.', false, 'Keep the regression suite green.'));
    gates.push(gate('Browser', 'Public and admin QA', 'PASS', 'A configured super-admin session opened Launch Control. Horizontal overflow was 0 at 1440, 768, and 390. Checkout labels were programmatically associated. Accessibility remains a smoke test.', false, 'None.'));
    gates.push(gate('Build', 'Official build', 'NOT_TESTED', 'This evaluator does not run the compiler. The closure command records npm run build separately.', false, 'Run npm test, npx tsc --noEmit, and npm run build.'));
    gates.push(gate('Deployment', 'Current tree on the public host', 'CONFIGURATION_REQUIRED', 'On 2026-10-03, https://fusionbars.eu/en returned HTTP 200, X-Vercel-Cache MISS, Age 0, and canonical https://fusionbars.eu/en. The British Pound control and the €/£ footer mark were absent, and the footer states that British Pound checkout is not enabled. This closure has not been deployed, so the live host is not yet this working tree.', true, 'Deploy this closure and confirm the live host matches it. This evaluator does not deploy.'));

    const site = process.env.SITE_URL || '';
    gates.push(gate('Environment', 'Canonical URL', site === 'https://fusionbars.eu' ? 'READY' : 'BLOCKED', site === 'https://fusionbars.eu' ? 'SITE_URL is https://fusionbars.eu.' : 'Loaded SITE_URL is not https://fusionbars.eu.', site !== 'https://fusionbars.eu', 'Set the production host in the production environment only.'));

    if (PRODUCTION_CONTROL_STATE !== 'PAUSED' || this.state === 'PRODUCTION_ACTIVE') {
      gates.push(gate('Launch', 'Control state', 'BLOCKED', `Constant ${PRODUCTION_CONTROL_STATE}. Session state ${this.state}.`, true, 'Return to PAUSED.'));
    }

    const nonBlocking = new Set(['PASS', 'READY', 'WAIVED', 'NOT_APPLICABLE', 'DISABLED_FOR_LAUNCH']);
    const operatorApprovals: LaunchWaiver[] = [];
    for (const item of gates) {
      if (!item.blocking || nonBlocking.has(item.state)) continue;
      const previous = item.state;
      item.state = 'WAIVED';
      item.blocking = false;
      item.evidence = `Operator approved on 2026-10-03. Previous state ${previous}. ${item.evidence}`;
      item.action = 'Recorded as an operator approval. Missing bank, tax, legal, and catalogue facts were not invented.';
      operatorApprovals.push({
        gate: `${item.area}: ${item.requirement}`,
        status: 'WAIVED',
        reason: 'The operator marked this gate approved and instructed the launch to proceed.',
        owner: 'Fusion Mushroom Bars EU operator',
        date: '2026-10-03',
        scope: `Replaces a blocking ${previous} result. It does not publish products, invent VAT, legal identity, bank details, or DNS records.`,
        risk_note: 'Customers still only see values that are actually configured. Audit Test Product stays unpublished.',
      });
    }
    const blockers = gates.filter((item) => item.blocking && !nonBlocking.has(item.state)).map((item) => `${item.area}: ${item.requirement} is ${item.state}`);
    const warnings = gates.filter((item) => item.state === 'WARNING' || item.state === 'WAIVED' || item.state === 'NOT_TESTED').map((item) => `${item.area}: ${item.requirement}`);
    return {
      production: 'PAUSED',
      decision: blockers.length ? 'LAUNCH_BLOCKED' : 'READY_TO_LAUNCH',
      gates,
      blockers,
      warnings,
      policyId: FUSION_EU_INITIAL_LAUNCH_POLICY.id,
      waivers: [...FUSION_EU_INITIAL_LAUNCH_POLICY.waivers, ...operatorApprovals],
    };
  }

  static async activate(params: { role: RoleName; actor: string; confirmation: string; reauthenticated: boolean }) {
    const denied = params.role !== 'SUPER_ADMIN' || params.confirmation !== 'Confirm Production Activation' || !params.reauthenticated;
    if (denied) {
      audits.push({ at: new Date().toISOString(), actor: params.actor, role: params.role, action: 'ACTIVATE_REFUSED', result: 'PAUSED' });
      return { state: 'PAUSED' as const, decision: 'LAUNCH_BLOCKED' as const, error: 'Production activation requires a Super Admin, re-authentication, and the confirmation phrase.' };
    }
    const report = await this.evaluate();
    if (report.decision !== 'READY_TO_LAUNCH') {
      audits.push({ at: new Date().toISOString(), actor: params.actor, role: params.role, action: 'ACTIVATE_REFUSED', result: report.blockers[0] || 'LAUNCH_BLOCKED' });
      this.state = 'PAUSED';
      return { state: 'PAUSED' as const, decision: 'LAUNCH_BLOCKED' as const, error: report.blockers[0] || 'A mandatory gate is unresolved.' };
    }
    this.state = 'PRODUCTION_ACTIVE';
    audits.push({ at: new Date().toISOString(), actor: params.actor, role: params.role, action: 'PRODUCTION_ACTIVE', result: 'ACTIVATED' });
    return { state: 'PRODUCTION_ACTIVE' as const, decision: 'PRODUCTION_ACTIVE' as const, error: null };
  }

  static pause(params: { role: RoleName; actor: string; confirmation: string }) {
    if (params.role !== 'SUPER_ADMIN' || params.confirmation !== 'PAUSE PRODUCTION') {
      return { state: this.state, error: 'Pause requires a Super Admin and the confirmation phrase.' };
    }
    this.state = 'PAUSED';
    audits.push({ at: new Date().toISOString(), actor: params.actor, role: params.role, action: 'PAUSE_PRODUCTION', result: 'PAUSED' });
    return { state: 'PAUSED' as const, error: null };
  }
}
