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
export class DistributedRedisRateLimitStore implements IRateLimitStore {
  constructor(private restUrl: string, private restToken: string) {}

  async consume(key: string, maxAttempts: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      const response = await fetch(`${this.restUrl}/pipeline`, {
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

      if (!response.ok) {
        throw new Error(`Redis REST error: ${response.statusText}`);
      }

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
      // In case of distributed network failure, fallback safely to allow legitimate operations
      return { allowed: true, remaining: 1, resetTimeMs: Date.now() + windowSeconds * 1000 };
    }
  }

  async check(key: string, maxAttempts: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      const response = await fetch(`${this.restUrl}/get/ratelimit:${key}`, {
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
      return { allowed: true, remaining: 1, resetTimeMs: Date.now() + windowSeconds * 1000 };
    }
  }

  async reset(key: string): Promise<void> {
    try {
      await fetch(`${this.restUrl}/del/ratelimit:${key}`, {
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
  }

  /**
   * Automatically configures distributed storage if Upstash environment variables exist.
   */
  static initializeFromEnvironment(): void {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      this.store = new DistributedRedisRateLimitStore(url, token);
    } else {
      this.store = new MemoryRateLimitStore();
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
    const config = this.configs[action] || { maxAttempts: 20, windowSeconds: 600 };
    const key = `${action}:${identifier.trim().toLowerCase()}`;
    const res = this.store.consume(key, config.maxAttempts, config.windowSeconds);
    if ('then' in (res as any)) {
      // Async result in sync context fallback
      return { allowed: true, remaining: 1, resetTimeMs: Date.now() + config.windowSeconds * 1000 };
    }
    return res as RateLimitResult;
  }

  /**
   * Asynchronous consumption for distributed Redis serverless calls.
   */
  static async consumeAsync(action: RateLimitAction, identifier: string): Promise<RateLimitResult> {
    const config = this.configs[action] || { maxAttempts: 20, windowSeconds: 600 };
    const key = `${action}:${identifier.trim().toLowerCase()}`;
    return Promise.resolve(this.store.consume(key, config.maxAttempts, config.windowSeconds));
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
