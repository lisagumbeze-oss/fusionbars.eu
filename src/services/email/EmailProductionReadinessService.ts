import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { EmailTemplateRegistry } from '@/domain/admin/EmailTemplateRegistry';
import { RoleName } from '@/types';

export type EmailConfigState = 'NOT_CONFIGURED' | 'TEST' | 'REVIEW_REQUIRED' | 'READY' | 'ACTIVE' | 'DISABLED' | 'FAILED';
export type DnsAuthStatus = 'VERIFIED' | 'PENDING' | 'FAILED' | 'NOT_CONFIGURED';
type DnsRecord = 'SPF' | 'DKIM' | 'DMARC';

const REQUIRED_TEMPLATES = [
  'sepa-order-confirmation',
  'crypto-order-confirmation',
  'payment-proof-submitted',
  'payment-verified',
  'payment-rejected',
  'order-processing',
  'order-shipped',
  'order-delivered',
  'order-cancelled',
  'order-refunded',
  'customer-welcome',
  'password-reset',
  'email-verification',
  'admin-operational-alert',
  'contact-confirmation',
  'contact-ops-alert',
  'newsletter-confirmation',
  'newsletter-ops-alert',
  'test-email',
];

const CANONICAL_SENDER = 'sales@fusionbars.eu';
const CANONICAL_NAME = 'Fusion Mushroom Bars EU';

export interface EmailDnsGateEvidence {
  credentialAcceptance: 'NOT_CHECKED' | 'ACCEPTED' | 'REJECTED';
  domainVerification: 'NOT_CHECKED' | 'VERIFIED' | 'UNVERIFIED' | 'NOT_AVAILABLE';
  spf: DnsAuthStatus;
  dkim: DnsAuthStatus;
  dmarc: DnsAuthStatus;
  spfRecord: 'NOT_CHECKED' | 'ABSENT' | 'PRESENT' | 'LOOKUP_FAILED';
  dkimRecord: 'NOT_CHECKED' | 'ABSENT' | 'PRESENT' | 'LOOKUP_FAILED';
  dmarcRecord: 'NOT_CHECKED' | 'ABSENT' | 'PRESENT' | 'LOOKUP_FAILED';
  dmarcPolicy: 'NOT_OBSERVED' | 'MISSING' | 'NONE' | 'QUARANTINE' | 'REJECT' | 'OTHER';
  checkedAt: string;
}

function present(name: string): 'CONFIGURED' | 'MISSING' {
  return process.env[name]?.trim() ? 'CONFIGURED' : 'MISSING';
}

function address(value: string | undefined): string {
  const candidate = value?.trim() || '';
  const match = candidate.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : '';
}

function keyReady(): boolean {
  const provider = process.env.EMAIL_PROVIDER || 'mock';
  if (provider === 'mock') return false;
  if (provider === 'smtp') return present('SMTP_HOST') === 'CONFIGURED' && present('SMTP_PASSWORD') === 'CONFIGURED';
  const key = process.env.EMAIL_PROVIDER_KEY || '';
  return key.length >= 16 && !/mock|placeholder|test_only/i.test(key);
}

export class EmailProductionReadinessService {
  private static overlay: EmailConfigState | null = null;
  private static dns: Record<DnsRecord, { status: DnsAuthStatus; checkedAt: string | null }> = {
    SPF: { status: 'NOT_CONFIGURED', checkedAt: null },
    DKIM: { status: 'NOT_CONFIGURED', checkedAt: null },
    DMARC: { status: 'NOT_CONFIGURED', checkedAt: null },
  };
  private static credentialAcceptance: EmailDnsGateEvidence['credentialAcceptance'] = 'NOT_CHECKED';
  private static domainVerification: EmailDnsGateEvidence['domainVerification'] = 'NOT_CHECKED';
  private static observation: EmailDnsGateEvidence | null = null;
  private static testHandoff: 'NOT_RUN' | 'SENT' | 'FAILED' = 'NOT_RUN';
  private static testDelivery: 'NOT_RUN' | 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'UNKNOWN' = 'NOT_RUN';
  private static audit: Array<Record<string, string>> = [];
  private static testSends = new Map<string, number>();

  static resetForTests(): void {
    this.overlay = null;
    this.dns = {
      SPF: { status: 'NOT_CONFIGURED', checkedAt: null },
      DKIM: { status: 'NOT_CONFIGURED', checkedAt: null },
      DMARC: { status: 'NOT_CONFIGURED', checkedAt: null },
    };
    this.credentialAcceptance = 'NOT_CHECKED';
    this.domainVerification = 'NOT_CHECKED';
    this.observation = null;
    this.testHandoff = 'NOT_RUN';
    this.testDelivery = 'NOT_RUN';
    this.audit = [];
    this.testSends.clear();
  }

  static providerName(): string {
    return process.env.EMAIL_PROVIDER || 'mock';
  }

  static sender() {
    const configured = address(process.env.EMAIL_FROM);
    const replyConfigured = address(process.env.EMAIL_REPLY_TO);
    const email = configured || CANONICAL_SENDER;
    const replyTo = replyConfigured || CANONICAL_SENDER;
    const namedFrom = process.env.EMAIL_FROM || '';
    const nameMatch = !namedFrom.trim() || namedFrom.includes(CANONICAL_NAME) || !namedFrom.includes('<');
    return {
      name: CANONICAL_NAME,
      email,
      replyTo,
      domain: email.split('@')[1] || 'fusionbars.eu',
      matchesCanonical: email === CANONICAL_SENDER && replyTo === CANONICAL_SENDER && nameMatch,
    };
  }

  static state(): EmailConfigState {
    if (this.overlay === 'ACTIVE' || this.overlay === 'DISABLED' || this.overlay === 'FAILED') return this.overlay;
    const provider = this.providerName();
    if (provider === 'mock') return 'TEST';
    if (!keyReady()) return 'NOT_CONFIGURED';
    if (this.activationBlockers().length === 0 && EmailTemplateRegistry.validateAll().ok) return 'READY';
    return 'REVIEW_REQUIRED';
  }

  private static activationBlockers(): string[] {
    const blockers: string[] = [];
    const provider = this.providerName();
    if (provider === 'mock') blockers.push('Mock provider cannot be used for production email.');
    if (provider === 'smtp') {
      if (present('SMTP_PASSWORD') === 'MISSING') blockers.push('SMTP_PASSWORD is missing.');
    } else if (provider !== 'mock' && present('EMAIL_PROVIDER_KEY') === 'MISSING') {
      blockers.push('EMAIL_PROVIDER_KEY is missing.');
    } else if (provider !== 'mock' && !keyReady()) {
      blockers.push('EMAIL_PROVIDER_KEY is invalid.');
    }
    if (provider !== 'mock' && this.credentialAcceptance === 'REJECTED') blockers.push('Provider credential was rejected.');
    if (provider !== 'mock' && this.credentialAcceptance !== 'ACCEPTED') blockers.push('Provider credential has not been accepted.');
    const sender = this.sender();
    if (!sender.matchesCanonical) blockers.push('Sender is not sales@fusionbars.eu.');
    if (this.domainVerification !== 'VERIFIED') blockers.push('Sender domain is not verified by the provider.');
    for (const record of ['SPF', 'DKIM', 'DMARC'] as DnsRecord[]) {
      if (this.dns[record].status !== 'VERIFIED') blockers.push(`${record} is ${this.dns[record].status}.`);
    }
    if (this.testHandoff !== 'SENT') blockers.push('A controlled test has not been accepted by the provider.');
    if (this.testDelivery !== 'DELIVERED') blockers.push(`Delivery status is ${this.testDelivery}.`);
    if (this.overlay === 'DISABLED') blockers.push('Email delivery is disabled.');
    return blockers;
  }

  static blockers(): string[] {
    const blockers = this.activationBlockers();
    const templates = EmailTemplateRegistry.validateAll();
    if (!templates.ok) blockers.push(templates.error || 'A transactional template failed validation.');
    return blockers;
  }

  static controlledTestPermitted(): boolean {
    return this.providerName() !== 'mock'
      && this.credentialAcceptance === 'ACCEPTED'
      && this.domainVerification === 'VERIFIED'
      && this.sender().matchesCanonical
      && this.dns.SPF.status === 'VERIFIED'
      && this.dns.DKIM.status === 'VERIFIED'
      && this.dns.DMARC.status === 'VERIFIED'
      && this.overlay !== 'DISABLED';
  }

  static applyObservation(evidence: EmailDnsGateEvidence): void {
    this.credentialAcceptance = evidence.credentialAcceptance;
    this.domainVerification = evidence.domainVerification;
    this.observation = evidence;
    for (const record of ['SPF', 'DKIM', 'DMARC'] as DnsRecord[]) {
      const status = record === 'SPF' ? evidence.spf : record === 'DKIM' ? evidence.dkim : evidence.dmarc;
      this.dns[record] = { status, checkedAt: evidence.checkedAt };
    }
    this.audit.push({ action: 'DNS_OBSERVATION', domain: evidence.domainVerification, spf: evidence.spf, dkim: evidence.dkim, dmarc: evidence.dmarc, at: evidence.checkedAt });
  }

  static recordDnsStatus(params: { role: RoleName; record: DnsRecord; status: DnsAuthStatus }): void {
    if (params.role !== 'SUPER_ADMIN') throw new Error('Unauthorized DNS status change.');
    if (params.status === 'VERIFIED') throw new Error('DNS verification requires provider evidence.');
    this.dns[params.record] = { status: params.status, checkedAt: new Date().toISOString() };
    this.audit.push({ action: 'DNS_STATUS', record: params.record, status: params.status, role: params.role, at: new Date().toISOString() });
  }

  static recordTestDelivery(status: 'PASSED' | 'FAILED', actor: string): void {
    this.recordControlledTest({
      actor,
      eventId: `legacy-${Date.now()}`,
      handoff: status === 'PASSED' ? 'SENT' : 'FAILED',
      delivery: status === 'PASSED' ? 'UNKNOWN' : 'FAILED',
    });
  }

  static recordControlledTest(params: { actor: string; eventId: string; handoff: 'SENT' | 'FAILED'; delivery: 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'UNKNOWN' }): void {
    const count = this.testSends.get(params.actor) || 0;
    if (count >= 5) throw new Error('Test email limit reached.');
    this.testSends.set(params.actor, count + 1);
    this.testHandoff = params.handoff;
    this.testDelivery = params.delivery;
    this.audit.push({ action: 'TEST_EMAIL', eventId: params.eventId, handoff: params.handoff, delivery: params.delivery, actor: params.actor, at: new Date().toISOString() });
  }

  static activate(params: { role: RoleName; actor: string; confirmation: string; rationale: string }): { success: false; error: string } | { success: true; state: EmailConfigState } {
    if (params.role !== 'SUPER_ADMIN') return { success: false, error: 'Only SUPER_ADMIN can activate production email.' };
    if (params.confirmation !== 'ACTIVATE_PRODUCTION_EMAIL') return { success: false, error: 'Explicit activation confirmation is required.' };
    const blockers = this.blockers();
    if (blockers.length) return { success: false, error: blockers[0] };
    this.overlay = 'ACTIVE';
    this.audit.push({ action: 'ACTIVATE', actor: params.actor, role: params.role, rationale: params.rationale, at: new Date().toISOString() });
    return { success: true, state: 'ACTIVE' };
  }

  static disable(params: { role: RoleName; actor: string; rationale: string }): void {
    if (params.role !== 'SUPER_ADMIN') throw new Error('Unauthorized email configuration change.');
    this.overlay = 'DISABLED';
    this.audit.push({ action: 'DISABLE', actor: params.actor, role: params.role, rationale: params.rationale, at: new Date().toISOString() });
  }

  static report() {
    const sender = this.sender();
    const provider = this.providerName();
    const validation = EmailTemplateRegistry.validateAll();
    const credentials = provider === 'smtp'
      ? present('SMTP_PASSWORD')
      : provider === 'mock'
        ? 'MISSING' as const
        : this.credentialAcceptance === 'REJECTED'
          ? 'INVALID' as const
          : present('EMAIL_PROVIDER_KEY');
    return {
      production: PRODUCTION_CONTROL_STATE,
      provider,
      state: this.state(),
      credentials,
      credentialAcceptance: this.credentialAcceptance,
      domainVerification: this.domainVerification,
      sender: { name: sender.name, email: sender.email, replyTo: sender.replyTo, domain: sender.domain, matchesCanonical: sender.matchesCanonical },
      dns: {
        SPF: this.dns.SPF.status,
        DKIM: this.dns.DKIM.status,
        DMARC: this.dns.DMARC.status,
      },
      dnsObservation: this.observation,
      testHandoff: this.testHandoff,
      testDelivery: this.testDelivery,
      deliveryLogging: 'ENABLED' as const,
      templates: validation,
      blockers: this.blockers(),
      requiredTemplates: REQUIRED_TEMPLATES,
      audit: this.audit.length,
    };
  }
}
