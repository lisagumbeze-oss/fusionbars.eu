import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';

export type StorageReadinessState = 'NOT_CONFIGURED' | 'TEST' | 'ACTIVE' | 'DISABLED' | 'REVIEW_REQUIRED' | 'CONFIGURATION_REQUIRED';
export type StoragePresence = 'CONFIGURED' | 'MISSING' | 'INVALID';

const PLACEHOLDER_VALUES = new Set([
  'aws_or_r2_access_key_id',
  'aws_or_r2_secret_access_key',
  'change_me',
  'changeme',
  'placeholder',
  'example',
  'your-access-key',
  'your-secret-key',
  'mock',
]);

function clean(name: string): string {
  return (process.env[name] || '').trim();
}

function placeholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (PLACEHOLDER_VALUES.has(normalized)) return true;
  return normalized.includes('change_me') || normalized.includes('placeholder') || normalized.includes('your-access-key') || normalized.includes('your-secret-key');
}

export class StorageReadinessService {
  private static lastTest: 'NOT_RUN' | 'PASS' | 'FAIL' = 'NOT_RUN';

  static noteTest(result: 'PASS' | 'FAIL' | 'NOT_RUN') {
    this.lastTest = result;
  }

  static resetForTests() {
    this.lastTest = 'NOT_RUN';
  }

  static productionHealth() {
    const report = this.report();
    return {
      state: report.state === 'ACTIVE' ? 'READY' as const : 'CONFIGURATION_REQUIRED' as const,
      provider: report.provider,
      variables: report.variables,
      privateStorage: report.privateStorage,
      lastTest: report.lastTest,
    };
  }

  static report() {
    const mode = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const provider = (clean('STORAGE_PROVIDER') || 'mock').toLowerCase();
    const bucket = clean('STORAGE_BUCKET');
    const endpoint = clean('STORAGE_ENDPOINT');
    const region = clean('STORAGE_REGION');
    const accessKey = clean('STORAGE_ACCESS_KEY');
    const secretKey = clean('STORAGE_SECRET_KEY');
    const target = clean('STORAGE_ENVIRONMENT').toLowerCase();
    const supported = provider === 's3' || provider === 'cloudflare_r2';
    const credentialsConfigured = Boolean(accessKey && secretKey && !placeholder(accessKey) && !placeholder(secretKey) && accessKey.length >= 16 && secretKey.length >= 16);
    const bucketConfigured = Boolean(bucket && !placeholder(bucket));
    const endpointConfigured = Boolean(endpoint && /^https:\/\//i.test(endpoint) && !placeholder(endpoint));
    const previewUsesProduction = mode === 'preview' && target === 'production';
    const developmentUsesProduction = mode !== 'production' && mode !== 'preview' && target === 'production';
    let state: StorageReadinessState = 'CONFIGURATION_REQUIRED';
    if (provider === 'disabled') state = 'DISABLED';
    else if (!provider || provider === 'mock') state = mode === 'production' ? 'CONFIGURATION_REQUIRED' : 'TEST';
    else if (!supported || !credentialsConfigured || !bucketConfigured || !endpointConfigured) state = 'CONFIGURATION_REQUIRED';
    else if (previewUsesProduction || developmentUsesProduction || mode === 'preview') state = 'REVIEW_REQUIRED';
    else if (mode === 'production' && this.lastTest === 'PASS') state = 'ACTIVE';
    else state = 'REVIEW_REQUIRED';
    if (provider === 'mock') state = mode === 'production' ? 'CONFIGURATION_REQUIRED' : 'TEST';
    const blockers: string[] = [];
    if (provider === 'mock') blockers.push(mode === 'production' ? 'Mock storage cannot be the production provider.' : 'Storage is using the development mock provider.');
    if (supported && !credentialsConfigured) blockers.push('Storage credentials are not configured.');
    if (supported && !bucketConfigured) blockers.push('Storage bucket is not configured.');
    if (supported && !endpointConfigured) blockers.push('Storage endpoint is not configured.');
    if (previewUsesProduction || developmentUsesProduction) blockers.push('This environment must not use the production storage target.');
    if (state === 'REVIEW_REQUIRED') blockers.push('Storage is configured but has not passed a production connectivity test.');
    return {
      production: PRODUCTION_CONTROL_STATE,
      provider,
      state,
      environment: mode,
      variables: {
        STORAGE_PROVIDER: provider && provider !== 'mock' ? 'CONFIGURED' as StoragePresence : provider === 'mock' ? 'INVALID' as StoragePresence : 'MISSING' as StoragePresence,
        STORAGE_BUCKET: bucketConfigured ? 'CONFIGURED' as StoragePresence : bucket ? 'INVALID' as StoragePresence : 'MISSING' as StoragePresence,
        STORAGE_ENDPOINT: endpointConfigured ? 'CONFIGURED' as StoragePresence : endpoint ? 'INVALID' as StoragePresence : 'MISSING' as StoragePresence,
        STORAGE_REGION: region ? 'CONFIGURED' as StoragePresence : 'MISSING' as StoragePresence,
        STORAGE_CREDENTIALS: credentialsConfigured ? 'CONFIGURED' as StoragePresence : 'MISSING' as StoragePresence,
      },
      privateStorage: state === 'ACTIVE' ? 'READY' as const : 'NOT_READY' as const,
      publicMedia: state === 'ACTIVE' ? 'READY' as const : 'NOT_READY' as const,
      retention: 'NOT_CONFIGURED' as const,
      lastTest: this.lastTest,
      environmentSeparation: previewUsesProduction || developmentUsesProduction ? 'FAIL' as const : 'PASS' as const,
      blockers,
    };
  }
}
