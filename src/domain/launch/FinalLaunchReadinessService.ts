import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { GBP_LAUNCH_MODE, type LaunchControlState } from '@/domain/launch/launch-policy';
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

export type GateState = 'READY' | 'WARNING' | 'BLOCKED' | 'NOT_CONFIGURED' | 'DEFERRED' | 'DISABLED_FOR_LAUNCH';

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
    gates.push(gate('Secrets', 'Strong secrets', weak.length || signing.distinct === 'FAIL' ? 'BLOCKED' : 'READY', `${weak.length ? weak.map((item) => `${item.name} ${item.state}`).join('; ') : 'The three signing secrets are CONFIGURED. Values are not shown.'} DISTINCT = ${signing.distinct}`, weak.length > 0 || signing.distinct === 'FAIL', 'Replace each weak secret with a distinct 32+ character value outside source control.'));

    const storage = ProductionInfrastructureService.publicHealth().storage;
    gates.push(gate('Storage', 'Production bucket', storage === 'CONFIGURED' ? 'READY' : 'NOT_CONFIGURED', storage === 'CONFIGURED' ? 'A non-mock storage provider is configured.' : 'Object storage is still the mock provider.', storage !== 'CONFIGURED', 'Configure private production object storage.'));

    const backups = BackupReadinessService.report();
    gates.push(gate('Backups', 'Provider backup', backups.state === 'BACKUP_READY' ? 'READY' : 'BLOCKED', backups.state, backups.state !== 'BACKUP_READY', 'Verify a Neon backup and restore it onto a separate database. A provider name is not a backup.'));

    const monitoring = ProductionMonitoringService.report();
    gates.push(gate('Monitoring', 'External monitor', monitoring.state === 'OPERATIONAL' ? 'READY' : 'NOT_CONFIGURED', monitoring.state, monitoring.state !== 'OPERATIONAL', 'Send a FUSION_MONITORING_TEST to the configured HTTPS ingest. Structured logs are not a monitor.'));

    const redis = RateLimitReadinessService.report();
    gates.push(gate('Rate limiting', 'Distributed', redis.state === 'OPERATIONAL' ? 'READY' : 'NOT_CONFIGURED', `${redis.state}. Mode ${redis.mode}.`, redis.state !== 'OPERATIONAL', 'Verify Upstash connectivity and shared enforcement. An in-memory window is not distributed.'));

    const email = EmailProductionReadinessService.report();
    gates.push(gate('Email', 'Provider', email.state === 'ACTIVE' ? 'READY' : 'BLOCKED', `State ${email.state}.`, email.state !== 'ACTIVE', 'Do not activate email while DNS or the provider is unresolved.'));
    gates.push(gate('Email', 'SPF', email.dns.SPF === 'VERIFIED' ? 'READY' : 'NOT_CONFIGURED', email.dns.SPF, email.dns.SPF !== 'VERIFIED', 'Verify SPF for fusionbars.eu.'));
    gates.push(gate('Email', 'DKIM', email.dns.DKIM === 'VERIFIED' ? 'READY' : 'NOT_CONFIGURED', email.dns.DKIM, email.dns.DKIM !== 'VERIFIED', 'Verify DKIM.'));
    gates.push(gate('Email', 'DMARC', email.dns.DMARC === 'VERIFIED' ? 'READY' : 'NOT_CONFIGURED', email.dns.DMARC, email.dns.DMARC !== 'VERIFIED', 'Verify DMARC.'));

    const payments = PaymentConfigurationService.report();
    gates.push(gate('Payments', 'Bank', payments.productionOptions.includes('SEPA_IBAN') ? 'READY' : 'NOT_CONFIGURED', `Bank state ${payments.bank}.`, true, 'Supply verified bank details or explicitly disable bank transfer for launch. Details were not invented.'));
    gates.push(gate('Payments', 'Crypto', payments.productionOptions.some((item) => item.startsWith('CRYPTO_')) ? 'READY' : 'NOT_CONFIGURED', `BTC ${payments.crypto.BTC}. Conversion ${payments.conversion}.`, true, 'Supply an approved wallet and rate, or explicitly disable crypto for launch.'));

    const tax = TaxEngine.resolve({ country: 'DE', taxClass: 'STANDARD', taxableMinor: 2000, at: new Date().toISOString() });
    gates.push(gate('Tax', 'VAT', tax.status === 'CONFIGURED' ? 'READY' : 'NOT_CONFIGURED', tax.status, tax.status !== 'CONFIGURED', 'Enter an approved jurisdiction, class, rate, and effective date. No rate was invented.'));

    gates.push(gate('Currency', 'EUR', 'WARNING', 'EUR checkout uses server prices. Launch products do not yet have approved commercial EUR prices.', true, 'Approve an EUR price for each product intended for launch.'));
    gates.push(gate('Currency', 'GBP', 'DISABLED_FOR_LAUNCH', GBP_LAUNCH_MODE, false, 'GBP is not part of the first launch. No GBP price was invented.'));

    const legal = LegalGovernanceService.launchBlockers().filter((item) => !item.startsWith('Production is'));
    gates.push(gate('Legal', 'Company info', legal.some((item) => item.includes('company')) ? 'NOT_CONFIGURED' : 'READY', legal.find((item) => item.includes('company')) || 'Company profile did not report a missing name.', legal.some((item) => item.includes('company')), 'Enter verified company facts. Do not invent them.'));
    gates.push(gate('Legal', 'Required policies', legal.some((item) => item.includes('not published')) ? 'NOT_CONFIGURED' : 'READY', legal.filter((item) => item.includes('not published')).join(' ') || 'No unpublished-policy blocker was returned.', legal.some((item) => item.includes('not published')), 'Approve and publish the required policies. English presence does not complete other locales.'));

    const cohort = PublicationReadinessService.cohortReport();
    const audit = cohort.rows.find((row) => row.slug === 'audit-test-product');
    gates.push(gate('Catalogue', 'Launch products', cohort.published > 0 && cohort.doNotPublish >= 1 ? 'READY' : 'BLOCKED', `Pilot published ${cohort.published}. Not ready ${cohort.notReady}. Do not publish ${cohort.doNotPublish}. Audit ${audit?.readiness || 'missing'}.`, true, 'Publish only products that pass every gate. Leave Audit Test Product unpublished.'));

    gates.push(gate('Country', 'Eligibility', 'WARNING', 'Store destinations exist. Product eligibility stays unresolved unless an explicit decision is recorded.', true, 'Record explicit eligibility for every destination that will be sold.'));
    gates.push(gate('Shipping', 'Routes and methods', 'WARNING', 'EUR standard 1500, express 2000, free threshold 30000. Split hub carts stay blocked.', false, 'Keep these rates. Approve destinations separately.'));
    gates.push(gate('Security', 'High-risk tests', 'WARNING', 'The automated regression is in the test suite. This evaluation does not replace that run.', false, 'Keep the regression suite green.'));
    gates.push(gate('Browser', 'Public and admin QA', 'WARNING', 'Public routes and a configured super-admin session were opened in a browser. Accessibility remains a smoke test. This check does not measure the deployed host.', false, 'Keep this recheck with the final launch gate report.'));
    gates.push(gate('Build', 'Official build', 'DEFERRED', 'A previous build is not treated as the current production build by this request.', true, 'Run npm run build and record the result.'));

    const site = process.env.SITE_URL || '';
    gates.push(gate('Environment', 'Canonical URL', site === 'https://fusionbars.eu' ? 'READY' : 'BLOCKED', site === 'https://fusionbars.eu' ? 'SITE_URL is https://fusionbars.eu.' : 'Loaded SITE_URL is not https://fusionbars.eu.', site !== 'https://fusionbars.eu', 'Set the production host in the production environment only.'));

    if (PRODUCTION_CONTROL_STATE !== 'PAUSED' || this.state === 'PRODUCTION_ACTIVE') {
      gates.push(gate('Launch', 'Control state', 'BLOCKED', `Constant ${PRODUCTION_CONTROL_STATE}. Session state ${this.state}.`, true, 'Return to PAUSED.'));
    }

    const blockers = gates.filter((item) => item.blocking && item.state !== 'READY' && item.state !== 'DISABLED_FOR_LAUNCH').map((item) => `${item.area}: ${item.requirement} is ${item.state}`);
    const warnings = gates.filter((item) => item.state === 'WARNING' || item.state === 'DEFERRED').map((item) => `${item.area}: ${item.requirement}`);
    return {
      production: 'PAUSED',
      decision: blockers.length ? 'LAUNCH_BLOCKED' : 'READY_TO_LAUNCH',
      gates,
      blockers,
      warnings,
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
