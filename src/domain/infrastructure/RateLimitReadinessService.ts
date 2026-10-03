import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';
import { classifyUpstash, RateLimiterService } from '@/lib/rate-limiter';
import type { RoleName } from '@/types';

export type RateLimitState = 'NOT_CONFIGURED' | 'CONFIGURED' | 'CONNECTED' | 'OPERATIONAL' | 'FAILED';

export interface RateLimitEvidence {
  url: 'CONFIGURED' | 'MISSING' | 'INVALID';
  token: 'CONFIGURED' | 'MISSING' | 'INVALID';
  environment: string;
  target: string;
  connectivity: 'NOT_RUN' | 'PASS' | 'FAIL';
  sharedEnforcement: 'NOT_RUN' | 'PASS' | 'FAIL';
  lastFailureAt: string | null;
  error?: string;
}

const ENFORCED = new Set(['login', 'registration', 'password_reset', 'guest_order_lookup', 'payment_proof_submission', 'admin_auth', 'newsletter_contact', 'public_order_creation']);

export class RateLimitReadinessService {
  private static connectivity: RateLimitEvidence['connectivity'] = 'NOT_RUN';
  private static sharedEnforcement: RateLimitEvidence['sharedEnforcement'] = 'NOT_RUN';
  private static lastFailureAt: string | null = null;
  private static lastError: string | null = null;

  static resetForTests(): void {
    this.connectivity = 'NOT_RUN';
    this.sharedEnforcement = 'NOT_RUN';
    this.lastFailureAt = null;
    this.lastError = null;
    RateLimiterService.resetForTests();
  }

  static liveEvidence(): RateLimitEvidence {
    const classified = classifyUpstash(process.env.UPSTASH_REDIS_REST_URL || '', process.env.UPSTASH_REDIS_REST_TOKEN || '');
    return {
      url: classified.url,
      token: classified.token,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      target: (process.env.UPSTASH_TARGET || '').trim().toLowerCase(),
      connectivity: this.connectivity,
      sharedEnforcement: this.sharedEnforcement,
      lastFailureAt: this.lastFailureAt,
      error: this.lastError || undefined,
    };
  }

  static evaluate(evidence: RateLimitEvidence): RateLimitState {
    if (evidence.error) return 'FAILED';
    if (evidence.url === 'MISSING' || evidence.token === 'MISSING') return 'NOT_CONFIGURED';
    if (evidence.url === 'INVALID' || evidence.token === 'INVALID') return 'FAILED';
    if ((evidence.environment === 'preview' || evidence.environment === 'development') && evidence.target === 'production') return 'FAILED';
    if (evidence.connectivity === 'FAIL' || evidence.sharedEnforcement === 'FAIL') return 'FAILED';
    if (evidence.sharedEnforcement === 'PASS' && evidence.connectivity === 'PASS') return 'OPERATIONAL';
    if (evidence.connectivity === 'PASS') return 'CONNECTED';
    return 'CONFIGURED';
  }

  static report(evidence?: RateLimitEvidence) {
    const resolved = evidence || this.liveEvidence();
    const state = this.evaluate(resolved);
    return {
      production: PRODUCTION_CONTROL_STATE,
      provider: 'upstash',
      mode: state === 'OPERATIONAL' ? 'DISTRIBUTED' as const : 'IN_MEMORY_ONLY' as const,
      url: resolved.url,
      token: resolved.token,
      state,
      environment: resolved.environment,
      targetSeparation: resolved.target === 'production' && resolved.environment !== 'production' ? 'FAIL' as const : 'PASS' as const,
      connectivity: resolved.connectivity,
      sharedEnforcement: resolved.sharedEnforcement,
      failureMode: 'FAIL_CLOSED' as const,
      developmentFallback: 'IN_MEMORY' as const,
      lastFailureAt: resolved.lastFailureAt,
      launchBlocked: state !== 'OPERATIONAL',
      policies: RateLimiterService.policies().map((policy) => ({
        ...policy,
        enforced: ENFORCED.has(policy.action),
        scope: policy.action === 'admin_auth' ? 'AUTHENTICATED_ADMIN' : 'ANONYMOUS_OR_ACCOUNT',
      })),
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

  static noteProbe(result: 'PASS' | 'FAIL', shared: 'PASS' | 'FAIL' | 'NOT_RUN'): void {
    this.connectivity = result;
    this.sharedEnforcement = shared;
    if (result === 'FAIL' || shared === 'FAIL') {
      this.lastFailureAt = new Date().toISOString();
      this.lastError = 'RATE_LIMIT_BACKEND_UNAVAILABLE';
    } else {
      this.lastError = null;
    }
  }
}
