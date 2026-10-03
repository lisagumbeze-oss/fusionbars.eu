import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import type { RoleName } from '@/types';

export type MonitoringState = 'NOT_CONFIGURED' | 'CONFIGURED' | 'CONNECTED' | 'OPERATIONAL' | 'FAILED';
export type MonitoringPresence = 'CONFIGURED' | 'MISSING' | 'INVALID';

const PLACEHOLDER = /placeholder|change_me|example|your-dsn|mock|localhost/i;

export interface MonitoringEvidence {
  dsn: MonitoringPresence;
  webhook: MonitoringPresence;
  environment: string;
  target: string;
  reachability: 'NOT_RUN' | 'PASS' | 'FAIL';
  testSignal: 'NOT_RUN' | 'PASS' | 'FAIL';
  alerting: 'NOT_CONFIGURED' | 'CONFIGURED' | 'OPERATIONAL';
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  error?: string;
}

function presence(raw: string | undefined): MonitoringPresence {
  const value = (raw || '').trim();
  if (!value) return 'MISSING';
  if (value.length > 300 || PLACEHOLDER.test(value) || /postgres:\/\//i.test(value)) return 'INVALID';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return 'INVALID';
    if (url.hostname === 'localhost' || url.hostname.endsWith('.local') || url.hostname === '127.0.0.1') return 'INVALID';
    return 'CONFIGURED';
  } catch {
    return 'INVALID';
  }
}

export class ProductionMonitoringService {
  private static reachability: MonitoringEvidence['reachability'] = 'NOT_RUN';
  private static testSignal: MonitoringEvidence['testSignal'] = 'NOT_RUN';
  private static lastSuccessAt: string | null = null;
  private static lastFailureAt: string | null = null;
  private static lastError: string | null = null;

  static resetForTests(): void {
    this.reachability = 'NOT_RUN';
    this.testSignal = 'NOT_RUN';
    this.lastSuccessAt = null;
    this.lastFailureAt = null;
    this.lastError = null;
  }

  static liveEvidence(): MonitoringEvidence {
    const mode = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    return {
      dsn: presence(process.env.MONITORING_DSN || process.env.SENTRY_DSN),
      webhook: presence(process.env.MONITORING_WEBHOOK_URL),
      environment: mode,
      target: (process.env.MONITORING_TARGET || '').trim().toLowerCase(),
      reachability: this.reachability,
      testSignal: this.testSignal,
      alerting: 'NOT_CONFIGURED',
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: this.lastFailureAt,
      error: this.lastError || undefined,
    };
  }

  static evaluate(evidence: MonitoringEvidence): MonitoringState {
    if (evidence.error) return 'FAILED';
    const configured = evidence.dsn === 'CONFIGURED' || evidence.webhook === 'CONFIGURED';
    const invalid = evidence.dsn === 'INVALID' || evidence.webhook === 'INVALID';
    if (!configured && invalid) return 'FAILED';
    if (!configured) return 'NOT_CONFIGURED';
    if ((evidence.environment === 'preview' || evidence.environment === 'development') && evidence.target === 'production') return 'FAILED';
    if (evidence.testSignal === 'FAIL' || evidence.reachability === 'FAIL') return 'FAILED';
    if (evidence.testSignal === 'PASS') return 'OPERATIONAL';
    if (evidence.reachability === 'PASS') return 'CONNECTED';
    return 'CONFIGURED';
  }

  static report(evidence?: MonitoringEvidence) {
    const resolved = evidence || this.liveEvidence();
    const state = this.evaluate(resolved);
    return {
      production: PRODUCTION_CONTROL_STATE,
      provider: resolved.dsn === 'CONFIGURED' ? 'https-dsn' : resolved.webhook === 'CONFIGURED' ? 'https-webhook' : 'none',
      dsn: resolved.dsn,
      webhook: resolved.webhook,
      state,
      logs: 'STRUCTURED_LOGS' as const,
      externalMonitoring: state,
      alerting: resolved.alerting,
      reachability: resolved.reachability,
      testSignal: resolved.testSignal,
      lastSuccessAt: resolved.lastSuccessAt,
      lastFailureAt: resolved.lastFailureAt,
      launchBlocked: state !== 'OPERATIONAL',
      coveredEvents: ['HTTP_5XX', 'DATABASE', 'CHECKOUT', 'PAYMENT', 'EMAIL', 'STORAGE', 'AUTHENTICATION', 'RATE_LIMIT', 'ORDER_STATE'] as const,
      capturedByExternalMonitor: state === 'OPERATIONAL',
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

  static async sendTestSignal(role: RoleName | 'CUSTOMER' | string | undefined, transport?: (payload: Record<string, string>) => Promise<boolean>): Promise<{ allowed: boolean; state: MonitoringState; error?: string }> {
    if (!this.authorize(role)) return { allowed: false, state: this.report().state, error: 'Forbidden' };
    const before = this.report();
    if (before.state === 'NOT_CONFIGURED' || before.state === 'FAILED') {
      return { allowed: true, state: before.state, error: before.state };
    }
    const payload = {
      event: 'FUSION_MONITORING_TEST',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      severity: 'info',
      correlationId: `mon_${Date.now().toString(36)}`,
      release: process.env.VERCEL_GIT_COMMIT_SHA || 'NOT_CONFIGURED',
      timestamp: new Date().toISOString(),
    };
    try {
      const accepted = transport ? await transport(payload) : false;
      if (!accepted) {
        this.testSignal = 'FAIL';
        this.lastFailureAt = payload.timestamp;
        this.lastError = 'MONITORING_DELIVERY_FAILED';
        return { allowed: true, state: 'FAILED', error: 'MONITORING_DELIVERY_FAILED' };
      }
      this.reachability = 'PASS';
      this.testSignal = 'PASS';
      this.lastSuccessAt = payload.timestamp;
      this.lastError = null;
      return { allowed: true, state: 'OPERATIONAL' };
    } catch {
      this.testSignal = 'FAIL';
      this.lastFailureAt = payload.timestamp;
      this.lastError = 'MONITORING_DELIVERY_FAILED';
      return { allowed: true, state: 'FAILED', error: 'MONITORING_DELIVERY_FAILED' };
    }
  }
}
