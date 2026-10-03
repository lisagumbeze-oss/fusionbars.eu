import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import type { RoleName } from '@/types';

export type BackupReadinessState =
  | 'BACKUP_CONFIGURATION_REQUIRED'
  | 'BACKUP_CONFIGURED'
  | 'BACKUP_VERIFIED'
  | 'RESTORE_REHEARSAL_REQUIRED'
  | 'RESTORE_REHEARSED'
  | 'RESTORE_REHEARSAL_FAILED'
  | 'BACKUP_READY'
  | 'BACKUP_ERROR';

export type BackupPresence = 'CONFIGURED' | 'MISSING' | 'INVALID';
export type StructureCheck = 'PRESENT' | 'MISSING' | 'QUERY_FAILED' | 'NOT_CHECKED';

const STRUCTURES = ['catalogue', 'customers', 'orders', 'payments', 'inventory', 'audit'] as const;
const PLACEHOLDERS = new Set(['pending', 'placeholder', 'not_configured', 'mock', 'local', 'filesystem', 'example', 'none', 'todo']);

export interface BackupEvidence {
  databaseFamily: 'neon' | 'local' | 'missing' | 'unknown';
  providerName: string;
  backupEnabled: 'YES' | 'NO' | 'UNKNOWN';
  recoveryCopy: 'PRESENT' | 'MISSING' | 'UNKNOWN';
  retention: 'CONFIGURED' | 'RETENTION_POLICY_NOT_CONFIGURED';
  pitr: 'AVAILABLE' | 'CONFIGURED' | 'NOT_CONFIGURED';
  encryption: 'ENCRYPTED' | 'NOT_ENCRYPTED' | 'UNKNOWN';
  lastBackupAt: string | null;
  restoreResult: 'NOT_RUN' | 'PASS' | 'FAIL';
  restoreAt: string | null;
  restoreTargetIsolated: boolean;
  schemaCompatible: boolean | null;
  structures: Record<(typeof STRUCTURES)[number], StructureCheck>;
  monitoring: 'NOT_CONNECTED' | 'CONNECTED';
  error?: string;
}

function emptyStructures(value: StructureCheck): BackupEvidence['structures'] {
  return {
    catalogue: value,
    customers: value,
    orders: value,
    payments: value,
    inventory: value,
    audit: value,
  };
}

function databaseFamily(raw: string | undefined): BackupEvidence['databaseFamily'] {
  if (!raw?.trim()) return 'missing';
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'local';
    if (host.endsWith('.neon.tech')) return 'neon';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function safeProviderName(raw: string): string {
  const name = raw.trim().toLowerCase();
  if (!name || name.length > 32 || /[:/@\s]/.test(name) || name.includes('postgres') || name.includes('password')) return '';
  return name;
}

export class BackupReadinessService {
  static liveEvidence(): BackupEvidence {
    const family = databaseFamily(process.env.DIRECT_URL || process.env.DATABASE_URL);
    const providerName = safeProviderName(process.env.BACKUP_PROVIDER || '');
    return {
      databaseFamily: family,
      providerName,
      backupEnabled: 'UNKNOWN',
      recoveryCopy: 'UNKNOWN',
      retention: 'RETENTION_POLICY_NOT_CONFIGURED',
      pitr: 'NOT_CONFIGURED',
      encryption: 'UNKNOWN',
      lastBackupAt: null,
      restoreResult: 'NOT_RUN',
      restoreAt: null,
      restoreTargetIsolated: false,
      schemaCompatible: null,
      structures: emptyStructures('NOT_CHECKED'),
      monitoring: 'NOT_CONNECTED',
    };
  }

  static providerVariable(evidence: BackupEvidence): BackupPresence {
    if (!evidence.providerName) return 'MISSING';
    if (PLACEHOLDERS.has(evidence.providerName)) return 'INVALID';
    if (evidence.databaseFamily !== 'neon' || evidence.providerName !== evidence.databaseFamily) return 'INVALID';
    return 'CONFIGURED';
  }

  static evaluate(evidence: BackupEvidence): BackupReadinessState {
    if (evidence.error) return 'BACKUP_ERROR';
    const declared = evidence.databaseFamily === 'neon' && evidence.providerName === 'neon' && !PLACEHOLDERS.has(evidence.providerName);
    if (!declared || evidence.backupEnabled !== 'YES') return 'BACKUP_CONFIGURATION_REQUIRED';
    if (evidence.recoveryCopy !== 'PRESENT') return 'BACKUP_CONFIGURED';
    if (evidence.restoreResult === 'FAIL') return 'RESTORE_REHEARSAL_FAILED';
    if (evidence.restoreResult === 'PASS') {
      const structuresPass = STRUCTURES.every((name) => evidence.structures[name] === 'PRESENT');
      if (!evidence.restoreTargetIsolated || evidence.schemaCompatible !== true || !structuresPass) return 'RESTORE_REHEARSAL_FAILED';
      if (evidence.retention !== 'CONFIGURED' || !evidence.lastBackupAt) return 'RESTORE_REHEARSED';
      return 'BACKUP_READY';
    }
    if (evidence.lastBackupAt) return 'BACKUP_VERIFIED';
    return 'RESTORE_REHEARSAL_REQUIRED';
  }

  static report(evidence?: BackupEvidence) {
    const live = !evidence;
    const resolved = evidence || this.liveEvidence();
    const state = this.evaluate(resolved);
    const rawProvider = (process.env.BACKUP_PROVIDER || '').trim();
    const providerVariable = live && rawProvider && !resolved.providerName ? 'INVALID' as const : this.providerVariable(resolved);
    return {
      production: PRODUCTION_CONTROL_STATE,
      provider: resolved.databaseFamily === 'neon' ? 'neon' : resolved.databaseFamily,
      providerVariable,
      capability: resolved.databaseFamily === 'neon' ? 'NEON_BRANCH_AND_PITR' : 'UNKNOWN',
      capabilityVerified: resolved.backupEnabled === 'YES' && resolved.recoveryCopy === 'PRESENT',
      state,
      publicStatus: state === 'BACKUP_READY' ? 'READY' as const : 'BACKUP_CONFIGURATION_REQUIRED' as const,
      launchBlocked: state !== 'BACKUP_READY',
      backupEnabled: resolved.backupEnabled,
      recoveryCopy: resolved.recoveryCopy,
      retention: resolved.retention,
      pitr: resolved.pitr,
      encryption: resolved.encryption,
      lastBackupAt: resolved.lastBackupAt,
      verification: resolved.recoveryCopy === 'PRESENT' && resolved.lastBackupAt ? 'BACKUP_VERIFIED' as const : 'UNVERIFIED' as const,
      restore: resolved.restoreResult,
      restoreAt: resolved.restoreAt,
      restoreTargetIsolated: resolved.restoreTargetIsolated,
      schema: resolved.schemaCompatible === true ? 'COMPATIBLE' as const : resolved.schemaCompatible === false ? 'INCOMPATIBLE' as const : 'NOT_CHECKED' as const,
      structures: resolved.structures,
      rpo: 'NOT_CONFIGURED' as const,
      rto: 'NOT_CONFIGURED' as const,
      maxBackupAge: 'NOT_CONFIGURED' as const,
      monitoring: resolved.monitoring,
      access: {
        applicationCanManageBackups: false as const,
        detailedStatus: 'SUPER_ADMIN' as const,
      },
      error: resolved.error || null,
    };
  }

  static authorize(role: RoleName | 'CUSTOMER' | string | undefined): boolean {
    return role === 'SUPER_ADMIN';
  }

  static view(role: RoleName | 'CUSTOMER' | string | undefined) {
    if (!this.authorize(role)) return { allowed: false as const };
    return { allowed: true as const, report: this.report() };
  }
}
