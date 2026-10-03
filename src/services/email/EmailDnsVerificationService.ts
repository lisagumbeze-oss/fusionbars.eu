import type { DnsAuthStatus, EmailDnsGateEvidence } from '@/services/email/EmailProductionReadinessService';

export interface EmailDnsObservation extends EmailDnsGateEvidence {
  provider: string;
}

type TxtResult = string[][] | 'FAILED';

function flatten(records: string[][]): string {
  return records.map((row) => row.join('')).join(' ');
}

function classifyDmarc(records: TxtResult): EmailDnsGateEvidence['dmarcPolicy'] {
  if (records === 'FAILED') return 'NOT_OBSERVED';
  const text = flatten(records);
  if (!text.trim()) return 'MISSING';
  const policy = text.match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\b/i)?.[1]?.toUpperCase();
  if (policy === 'NONE' || policy === 'QUARANTINE' || policy === 'REJECT') return policy;
  return 'OTHER';
}

function recordPresence(records: TxtResult, marker?: RegExp): EmailDnsGateEvidence['spfRecord'] {
  if (records === 'FAILED') return 'LOOKUP_FAILED';
  if (!records.length) return 'ABSENT';
  if (marker && !marker.test(flatten(records))) return 'ABSENT';
  return 'PRESENT';
}

function providerRecordStatus(records: unknown, kind: string): DnsAuthStatus {
  if (!Array.isArray(records)) return 'NOT_CONFIGURED';
  const hit = records.find((record) => {
    if (!record || typeof record !== 'object') return false;
    const row = record as Record<string, unknown>;
    const label = `${row.record || ''} ${row.name || ''} ${row.type || ''}`.toUpperCase();
    return label.includes(kind);
  }) as Record<string, unknown> | undefined;
  if (!hit) return 'NOT_CONFIGURED';
  const status = String(hit.status || '').toLowerCase();
  if (status === 'verified' || status === 'valid') return 'VERIFIED';
  if (status === 'pending' || status === 'temporary_failure') return 'PENDING';
  if (status === 'failed' || status === 'failure') return 'FAILED';
  return 'NOT_CONFIGURED';
}

export function providerDomainEvidence(body: unknown): Pick<EmailDnsGateEvidence, 'domainVerification' | 'spf' | 'dkim' | 'dmarc' | 'dkimRecord'> {
  const root = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rows = Array.isArray(root.data) ? root.data : [];
  const domain = rows.find((row) => {
    if (!row || typeof row !== 'object') return false;
    const name = String((row as Record<string, unknown>).name || '').toLowerCase();
    return name === 'fusionbars.eu';
  }) as Record<string, unknown> | undefined;
  if (!domain) {
    return { domainVerification: 'UNVERIFIED', spf: 'NOT_CONFIGURED', dkim: 'NOT_CONFIGURED', dmarc: 'NOT_CONFIGURED', dkimRecord: 'NOT_CHECKED' };
  }
  const records = domain.records;
  const dkim = providerRecordStatus(records, 'DKIM');
  return {
    domainVerification: String(domain.status || '').toLowerCase() === 'verified' ? 'VERIFIED' : 'UNVERIFIED',
    spf: providerRecordStatus(records, 'SPF'),
    dkim,
    dmarc: providerRecordStatus(records, 'DMARC'),
    dkimRecord: dkim === 'NOT_CONFIGURED' ? 'NOT_CHECKED' : 'PRESENT',
  };
}

async function lookupTxt(host: string, resolveTxt?: (host: string) => Promise<TxtResult>): Promise<TxtResult> {
  if (resolveTxt) return resolveTxt(host);
  try {
    const dns = await import('node:dns');
    return await Promise.race([
      dns.promises.resolveTxt(host),
      new Promise<TxtResult>((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
    ]);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String((error as { code: string }).code) : '';
    if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'ENOENT') return [];
    return 'FAILED';
  }
}

export class EmailDnsVerificationService {
  static async inspect(options?: {
    fetchImpl?: typeof fetch;
    resolveTxt?: (host: string) => Promise<TxtResult>;
    provider?: string;
    apiKey?: string;
  }): Promise<EmailDnsObservation> {
    const provider = (options?.provider ?? process.env.EMAIL_PROVIDER ?? 'mock').trim().toLowerCase() || 'mock';
    const apiKey = options?.apiKey ?? process.env.EMAIL_PROVIDER_KEY ?? '';
    const checkedAt = new Date().toISOString();
    const spfTxt = await lookupTxt('fusionbars.eu', options?.resolveTxt);
    const dmarcTxt = await lookupTxt('_dmarc.fusionbars.eu', options?.resolveTxt);
    const observation: EmailDnsObservation = {
      provider,
      credentialAcceptance: 'NOT_CHECKED',
      domainVerification: 'NOT_CHECKED',
      spf: 'NOT_CONFIGURED',
      dkim: 'NOT_CONFIGURED',
      dmarc: 'NOT_CONFIGURED',
      spfRecord: recordPresence(spfTxt, /v=spf1/i),
      dkimRecord: 'NOT_CHECKED',
      dmarcRecord: recordPresence(dmarcTxt, /v=DMARC1/i),
      dmarcPolicy: classifyDmarc(dmarcTxt),
      checkedAt,
    };

    const keyReady = provider !== 'mock' && provider !== 'smtp' && apiKey.trim().length >= 16 && !/mock|placeholder|test_only/i.test(apiKey);
    if (!keyReady || provider !== 'resend') return observation;

    try {
      const response = await (options?.fetchImpl || fetch)('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey.trim()}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 401 || response.status === 403) {
        observation.credentialAcceptance = 'REJECTED';
        observation.domainVerification = 'NOT_AVAILABLE';
        return observation;
      }
      if (!response.ok) {
        observation.domainVerification = 'NOT_AVAILABLE';
        return observation;
      }
      observation.credentialAcceptance = 'ACCEPTED';
      const evidence = providerDomainEvidence(await response.json());
      observation.domainVerification = evidence.domainVerification;
      observation.spf = evidence.spf;
      observation.dkim = evidence.dkim;
      observation.dmarc = evidence.dmarc;
      observation.dkimRecord = evidence.dkimRecord;
      return observation;
    } catch {
      observation.domainVerification = 'NOT_AVAILABLE';
      return observation;
    }
  }
}
