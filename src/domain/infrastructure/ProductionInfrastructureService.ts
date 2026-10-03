import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { safeInternalAdminPath } from '@/domain/infrastructure/safe-path';
import { classifySigningSecrets, secretConfigurationAudit } from '@/domain/infrastructure/secret-readiness';
import { StorageReadinessService } from '@/services/storage/StorageReadinessService';
import { BackupReadinessService } from '@/domain/infrastructure/BackupReadinessService';
import { ProductionMonitoringService } from '@/domain/infrastructure/ProductionMonitoringService';
import { RateLimitReadinessService } from '@/domain/infrastructure/RateLimitReadinessService';
import { EmailProductionReadinessService } from '@/services/email/EmailProductionReadinessService';
import { CommerceRepository } from '@/lib/commerce-repository';

type Presence = 'CONFIGURED' | 'MISSING';

function presence(name: string): Presence {
  return process.env[name]?.trim() ? 'CONFIGURED' : 'MISSING';
}

export class ProductionInfrastructureService {
  static secretChecklist() {
    const names = [
      'SESSION_SECRET',
      'AUTH_SECRET',
      'ORDER_LOOKUP_SECRET',
      'DATABASE_URL',
      'DIRECT_URL',
      'EMAIL_PROVIDER_KEY',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    ];
    const signingNames = new Set<string>(['SESSION_SECRET', 'AUTH_SECRET', 'ORDER_LOOKUP_SECRET']);
    const signing = new Map<string, string>(classifySigningSecrets(process.env).secrets.map((item) => [item.name, item.state]));
    return names.map((name) => ({
      name,
      state: signingNames.has(name) ? signing.get(name) || 'MISSING' : presence(name),
    }));
  }

  static signingSecretStatus() {
    const report = classifySigningSecrets(process.env);
    return {
      secrets: report.secrets,
      distinct: report.distinct,
    };
  }

  static recordSecretConfiguration(params: { actor: string; role: string; environment: string; result: string }) {
    const event = secretConfigurationAudit(params);
    return CommerceRepository.logAudit(event);
  }

  static databaseStatus(): Presence {
    return presence('DATABASE_URL') === 'CONFIGURED' && presence('DIRECT_URL') === 'CONFIGURED' ? 'CONFIGURED' : 'MISSING';
  }

  static backupStatus(): 'CONFIGURED' | 'BACKUP_CONFIGURATION_REQUIRED' {
    return BackupReadinessService.report().state === 'BACKUP_READY' ? 'CONFIGURED' : 'BACKUP_CONFIGURATION_REQUIRED';
  }

  static monitoringStatus(): 'NOT_CONFIGURED' | 'CONFIGURED' | 'CONNECTED' | 'OPERATIONAL' | 'FAILED' {
    return ProductionMonitoringService.report().state;
  }

  static environmentSeparation(): string[] {
    const mode = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const email = process.env.EMAIL_PROVIDER || 'mock';
    const database = process.env.DATABASE_URL || '';
    const blockers: string[] = [];
    if (mode === 'production' && email === 'mock') blockers.push('Mock email cannot be the production provider.');
    if (mode === 'preview' && email !== 'mock') blockers.push('Preview must not use a live email provider.');
    if (mode === 'production' && /sqlite|localhost|127\.0\.0\.1/i.test(database)) blockers.push('A development database cannot be used in production.');
    if (mode === 'production' && (process.env.STORAGE_PROVIDER || 'mock') === 'mock') blockers.push('Mock storage cannot be the production provider.');
    if (mode === 'preview' && process.env.STORAGE_ENVIRONMENT === 'production') blockers.push('Preview must not use the production storage target.');
    return blockers;
  }

  static publicHealth() {
    const database = this.databaseStatus() === 'CONFIGURED' ? 'CONFIGURED' : 'CONFIGURATION_REQUIRED';
    const emailState = EmailProductionReadinessService.state();
    const email = emailState === 'ACTIVE' ? 'ACTIVE' : 'REVIEW_REQUIRED';
    const storage = StorageReadinessService.report().state === 'ACTIVE' ? 'CONFIGURED' : 'CONFIGURATION_REQUIRED';
    const backup = BackupReadinessService.report();
    const monitoring = ProductionMonitoringService.report();
    const rateLimit = RateLimitReadinessService.report();
    const blockers = database === 'CONFIGURATION_REQUIRED' || backup.state !== 'BACKUP_READY' || monitoring.state !== 'OPERATIONAL';
    return {
      application: 'HEALTHY' as const,
      database,
      storage,
      email,
      payments: 'CONFIGURATION_REQUIRED' as const,
      backups: backup.publicStatus,
      monitoring: monitoring.state,
      rateLimit: rateLimit.state,
      status: blockers ? 'CONFIGURATION_REQUIRED' as const : 'HEALTHY' as const,
    };
  }

  static readiness() {
    return {
      production: PRODUCTION_CONTROL_STATE,
      database: this.databaseStatus(),
      secrets: this.secretChecklist(),
      storage: StorageReadinessService.report(),
      backups: BackupReadinessService.report(),
      monitoring: ProductionMonitoringService.report(),
      rateLimit: RateLimitReadinessService.report(),
      environment: this.environmentSeparation(),
    };
  }

  static safeInternalAdminPath(path: string, locale: string): string {
    return safeInternalAdminPath(path, locale);
  }

  static assertSafeRemoteUrl(input: string): void {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new Error('Invalid URL');
    }
    if (url.protocol !== 'https:') throw new Error('Only https destinations are allowed.');
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === 'metadata.google.internal' || host === '169.254.169.254') {
      throw new Error('Private network destinations are not allowed.');
    }
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|0\.0\.0\.0)/.test(host) || host === '::1') {
      throw new Error('Private network destinations are not allowed.');
    }
  }

  static rejectUnconfiguredWebhook(signature: string | null | undefined): void {
    if (!signature?.trim()) throw new Error('Webhook signature is missing.');
    throw new Error('No webhook provider is configured.');
  }

  static assertProductionMigrationCommand(command: string): void {
    if (/migrate\s+reset|db\s+push/i.test(command)) {
      throw new Error('This command is not allowed against production. Use prisma migrate deploy.');
    }
  }

  static createCorrelationId(): string {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}
