import { ObservabilityService } from '@/lib/observability';

// ==============================================================================
// FUSION MUSHROOM BARS EU - DISTRIBUTED RATE LIMITING SERVICE
// Sliding-Window Abuse & Probing Defense Engine
// Supports In-Memory (Dev/Test) & Distributed Redis / Upstash (Production Serverless)
// ==============================================================================

export type RateLimitAction =
  | 'login'
  | 'registration'
  | 'password_reset'
  | 'email_verification'
  | 'guest_order_lookup'
  | 'payment_proof_submission'
  | 'admin_auth'
  | 'newsletter_contact'
  | 'public_order_creation';

export interface RateLimitConfig {
  maxAttempts: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTimeMs: number;
  retryAfterSeconds?: number;
}

const PLACEHOLDER = /placeholder|change_me|example|your-token|your-url|mock/i;

export function classifyUpstash(urlRaw: string, tokenRaw: string): { url: 'CONFIGURED' | 'MISSING' | 'INVALID'; token: 'CONFIGURED' | 'MISSING' | 'INVALID' } {
  const url = urlRaw.trim();
  const token = tokenRaw.trim();
  let urlState: 'CONFIGURED' | 'MISSING' | 'INVALID' = 'MISSING';
  if (url) {
    try {
      const parsed = new URL(url);
      urlState = parsed.protocol === 'https:' && parsed.hostname.endsWith('.upstash.io') && !parsed.username && !parsed.password && !PLACEHOLDER.test(parsed.hostname) ? 'CONFIGURED' : 'INVALID';
    } catch {
      urlState = 'INVALID';
    }
  }
  const tokenState = !token ? 'MISSING' : token.length >= 16 && !PLACEHOLDER.test(token) ? 'CONFIGURED' : 'INVALID';
  return { url: urlState, token: tokenState };
}

export interface IRateLimitStore {
  consume(key: string, maxAttempts: number, windowSeconds: number): Promise<RateLimitResult> | RateLimitResult;
  check(key: string, maxAttempts: number, windowSeconds: number): Promise<RateLimitResult> | RateLimitResult;
  reset(key: string): Promise<void> | void;
}

/**
 * In-Memory Sliding-Window Store.
 * Used for development, testing, and offline execution.
 */
export class MemoryRateLimitStore implements IRateLimitStore {
  private store = new Map<string, { timestamps: number[] }>();

  consume(key: string, maxAttempts: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    let bucket = this.store.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.store.set(key, bucket);
    }

    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

    if (bucket.timestamps.length >= maxAttempts) {
      const oldestInWindow = bucket.timestamps[0];
      const resetTimeMs = oldestInWindow + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));
      return { allowed: false, remaining: 0, resetTimeMs, retryAfterSeconds };
    }

    bucket.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxAttempts - bucket.timestamps.length,
      resetTimeMs: now + windowMs,
    };
  }

  check(key: string, maxAttempts: number, windowSeconds: number): RateLimitResult {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    const bucket = this.store.get(key);
    if (!bucket) {
      return { allowed: true, remaining: maxAttempts, resetTimeMs: now + windowMs };
    }

    const validTimestamps = bucket.timestamps.filter((ts) => ts > windowStart);
    if (validTimestamps.length >= maxAttempts) {
      const oldestInWindow = validTimestamps[0];
      const resetTimeMs = oldestInWindow + windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetTimeMs - now) / 1000));
      return { allowed: false, remaining: 0, resetTimeMs, retryAfterSeconds };
    }

    return {
      allowed: true,
      remaining: maxAttempts - validTimestamps.length,
      resetTimeMs: now + windowMs,
    };
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

/**
 * Distributed Redis REST Store for serverless multi-region deployments (e.g. Upstash).
 * Communicates via standard HTTP fetch without importing vendor-specific packages into core domain.
 */
class RejectingRateLimitStore implements IRateLimitStore {
  consume(_key: string, _maxAttempts: number, windowSeconds: number): RateLimitResult {
    return { allowed: false, remaining: 0, resetTimeMs: Date.now() + windowSeconds * 1000, retryAfterSeconds: windowSeconds };
  }
  check(_key: string, maxAttempts: number, windowSeconds: number): RateLimitResult {
    return { allowed: false, remaining: 0, resetTimeMs: Date.now() + windowSeconds * 1000, retryAfterSeconds: windowSeconds };
  }
  reset(): void {}
}

export class DistributedRedisRateLimitStore implements IRateLimitStore {
  constructor(private restUrl: string, private restToken: string, private fetchImpl: typeof fetch = fetch) {}

  async consume(key: string, maxAttempts: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      const response = await this.fetchImpl(`${this.restUrl}/pipeline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.restToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', `ratelimit:${key}`],
          ['EXPIRE', `ratelimit:${key}`, windowSeconds, 'NX'],
          ['TTL', `ratelimit:${key}`],
        ]),
      });

      if (!response.ok) throw new Error('REDIS_UNAVAILABLE');

      const results = (await response.json()) as Array<{ result: any }>;
      const count = Number(results[0]?.result || 1);
      const ttl = Number(results[2]?.result || windowSeconds);
      const resetTimeMs = Date.now() + ttl * 1000;

      if (count > maxAttempts) {
        return {
          allowed: false,
          remaining: 0,
          resetTimeMs,
          retryAfterSeconds: Math.max(1, ttl),
        };
      }

      return {
        allowed: true,
        remaining: Math.max(0, maxAttempts - count),
        resetTimeMs,
      };
    } catch {
      return { allowed: false, remaining: 0, resetTimeMs: Date.now() + windowSeconds * 1000, retryAfterSeconds: windowSeconds };
    }
  }

  async check(key: string, maxAttempts: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      const response = await this.fetchImpl(`${this.restUrl}/get/ratelimit:${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${this.restToken}` },
      });
      const data = (await response.json()) as { result: string | null };
      const count = data.result ? parseInt(data.result, 10) : 0;
      const allowed = count < maxAttempts;
      return {
        allowed,
        remaining: Math.max(0, maxAttempts - count),
        resetTimeMs: Date.now() + windowSeconds * 1000,
        retryAfterSeconds: allowed ? undefined : windowSeconds,
      };
    } catch {
      return { allowed: false, remaining: 0, resetTimeMs: Date.now() + windowSeconds * 1000, retryAfterSeconds: windowSeconds };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await this.fetchImpl(`${this.restUrl}/del/ratelimit:${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.restToken}` },
      });
    } catch {
      // Fail silently
    }
  }
}

/**
 * Primary rate limiting coordinator for all authentication, checkout, and lookup endpoints.
 */
export class RateLimiterService {
  private static store: IRateLimitStore = new MemoryRateLimitStore();
  private static pinned = false;

  // Configured European commerce production thresholds
  private static configs: Record<RateLimitAction, RateLimitConfig> = {
    login: { maxAttempts: 10, windowSeconds: 900 }, // 10 attempts per 15m
    registration: { maxAttempts: 5, windowSeconds: 3600 }, // 5 per hour
    password_reset: { maxAttempts: 5, windowSeconds: 3600 }, // 5 per hour
    email_verification: { maxAttempts: 10, windowSeconds: 3600 }, // 10 per hour
    guest_order_lookup: { maxAttempts: 20, windowSeconds: 600 }, // 20 per 10m
    payment_proof_submission: { maxAttempts: 10, windowSeconds: 900 }, // 10 per 15m
    admin_auth: { maxAttempts: 5, windowSeconds: 900 }, // 5 per 15m
    newsletter_contact: { maxAttempts: 5, windowSeconds: 600 }, // 5 per 10m
    public_order_creation: { maxAttempts: 15, windowSeconds: 600 }, // 15 orders per 10m per IP/email
  };

  /**
   * Initializes or swaps the rate limit backend store.
   */
  static setStore(store: IRateLimitStore): void {
    this.store = store;
    this.pinned = true;
  }

  static resetForTests(): void {
    this.store = new MemoryRateLimitStore();
    this.pinned = false;
  }

  static policies(): Array<{ action: RateLimitAction; maxAttempts: number; windowSeconds: number }> {
    return (Object.keys(this.configs) as RateLimitAction[]).map((action) => ({ action, ...this.configs[action] }));
  }

  /**
   * Production uses Upstash only when the URL and token are valid.
   * Development keeps the in-memory window. Preview does not attach a target marked production.
   */
  static initializeFromEnvironment(): void {
    if (this.pinned) return;
    const mode = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
    const target = (process.env.UPSTASH_TARGET || '').trim().toLowerCase();
    if (mode !== 'production') {
      if (target === 'production') this.store = new RejectingRateLimitStore();
      return;
    }
    const url = process.env.UPSTASH_REDIS_REST_URL || '';
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    const classified = classifyUpstash(url, token);
    if (classified.url === 'CONFIGURED' && classified.token === 'CONFIGURED') {
      this.store = new DistributedRedisRateLimitStore(url.trim(), token.trim());
    }
  }

  /**
   * Updates rate limit parameters dynamically.
   */
  static configure(action: RateLimitAction, config: Partial<RateLimitConfig>): void {
    if (this.configs[action]) {
      this.configs[action] = {
        ...this.configs[action],
        ...config,
      };
    }
  }

  /**
   * Synchronous consumption (using MemoryRateLimitStore or fallback).
   * Preserves backward compatibility across synchronous action signatures.
   */
  static consume(action: RateLimitAction, identifier: string): RateLimitResult {
    this.initializeFromEnvironment();
    const config = this.configs[action] || { maxAttempts: 20, windowSeconds: 600 };
    const key = `${action}:${identifier.trim().toLowerCase()}`;
    const res = this.store.consume(key, config.maxAttempts, config.windowSeconds);
    if ('then' in (res as Promise<RateLimitResult>)) {
      const mode = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
      if (mode === 'production') return { allowed: false, remaining: 0, resetTimeMs: Date.now() + config.windowSeconds * 1000, retryAfterSeconds: config.windowSeconds };
      return { allowed: true, remaining: 1, resetTimeMs: Date.now() + config.windowSeconds * 1000 };
    }
    return res as RateLimitResult;
  }

  /**
   * Asynchronous consumption for distributed Redis serverless calls.
   */
  static async consumeAsync(action: RateLimitAction, identifier: string): Promise<RateLimitResult> {
    this.initializeFromEnvironment();
    const config = this.configs[action] || { maxAttempts: 20, windowSeconds: 600 };
    const key = `${action}:${identifier.trim().toLowerCase()}`;
    try {
      return await Promise.resolve(this.store.consume(key, config.maxAttempts, config.windowSeconds));
    } catch {
      const correlationId = `rl_${Date.now().toString(36)}`;
      ObservabilityService.warn('RATE_LIMIT_BACKEND_UNAVAILABLE', 'Distributed rate limiter failed closed.', { correlationId, category: 'REDIS_UNAVAILABLE', action });
      return { allowed: false, remaining: 0, resetTimeMs: Date.now() + config.windowSeconds * 1000, retryAfterSeconds: config.windowSeconds };
    }
  }

  static async enforce(action: RateLimitAction, identifier: string): Promise<{ allowed: boolean; error?: string }> {
    const result = await this.consumeAsync(action, identifier);
    if (result.allowed) return { allowed: true };
    return { allowed: false, error: 'Too many attempts. Try again later.' };
  }

  /**
   * Inspects current status without consuming an attempt.
   */
  static check(action: RateLimitAction, identifier: string): RateLimitResult {
    const config = this.configs[action] || { maxAttempts: 20, windowSeconds: 600 };
    const key = `${action}:${identifier.trim().toLowerCase()}`;
    const res = this.store.check(key, config.maxAttempts, config.windowSeconds);
    if ('then' in (res as any)) {
      return { allowed: true, remaining: 1, resetTimeMs: Date.now() + config.windowSeconds * 1000 };
    }
    return res as RateLimitResult;
  }

  /**
   * Resets rate-limit bucket for a specific key.
   */
  static reset(action: RateLimitAction, identifier: string): void {
    const key = `${action}:${identifier.trim().toLowerCase()}`;
    Promise.resolve(this.store.reset(key));
  }
}
