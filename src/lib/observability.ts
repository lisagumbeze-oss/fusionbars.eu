// ==============================================================================
// FUSION MUSHROOM BARS EU - PRODUCTION OBSERVABILITY & STRUCTURED LOGGING
// Secret & PII Scrubbing, Audit Alignment, and Multi-Provider Telemetry
// ==============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  metadata?: Record<string, any>;
  environment: string;
}

export type MonitoringHandler = (entry: StructuredLogEntry) => void;

export class ObservabilityService {
  private static externalHandler: MonitoringHandler | null = null;
  private static currentLogLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private static readonly SENSITIVE_KEYS = [
    'password',
    'passwordhash',
    'token',
    'secret',
    'sessionsecret',
    'orderlookupsecret',
    'authsecret',
    'iban',
    'bicswift',
    'privatekey',
    'seed',
    'authorization',
    'cookie',
    'creditcard',
    'cvv',
    'cardnumber',
  ];

  private static readonly LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    fatal: 50,
  };

  /**
   * Registers a third-party monitoring telemetry handler (e.g. Sentry, Datadog).
   */
  static setMonitoringHandler(handler: MonitoringHandler): void {
    this.externalHandler = handler;
  }

  static setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Recursively scrubs sensitive credentials, IBANs, and private keys from objects before logging.
   */
  static scrub(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') {
      // Mask IBAN-like patterns
      if (/[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}/i.test(obj)) {
        return `${obj.substring(0, 4)}****[REDACTED_IBAN]`;
      }
      return obj;
    }
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.scrub(item));
    }

    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = this.SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

      if (isSensitive) {
        clean[key] = '[REDACTED_SECRET]';
      } else {
        clean[key] = this.scrub(value);
      }
    }
    return clean;
  }

  private static log(level: LogLevel, event: string, message: string, metadata?: Record<string, any>): void {
    if (this.LEVEL_PRIORITY[level] < this.LEVEL_PRIORITY[this.currentLogLevel]) {
      return;
    }

    const sanitizedMeta = metadata ? this.scrub(metadata) : undefined;
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      metadata: sanitizedMeta,
      environment: process.env.NODE_ENV || 'development',
    };

    // Format output as single-line JSON in production for CloudWatch / Vercel Log Drains
    if (process.env.NODE_ENV === 'production') {
      const out = JSON.stringify(entry);
      if (level === 'error' || level === 'fatal') {
        console.error(out);
      } else if (level === 'warn') {
        console.warn(out);
      } else {
        console.log(out);
      }
    } else {
      // Concise human readable log for development/test
      if (level === 'error' || level === 'fatal') {
        console.error(`[${entry.timestamp}] [${level.toUpperCase()}] ${event}: ${message}`, entry.metadata || '');
      }
    }

    if (this.externalHandler) {
      try {
        this.externalHandler(entry);
      } catch {
        // Fail silently
      }
    }
  }

  // General Log Methods
  static debug(event: string, message: string, metadata?: Record<string, any>): void {
    this.log('debug', event, message, metadata);
  }

  static info(event: string, message: string, metadata?: Record<string, any>): void {
    this.log('info', event, message, metadata);
  }

  static warn(event: string, message: string, metadata?: Record<string, any>): void {
    this.log('warn', event, message, metadata);
  }

  static error(event: string, message: string, metadata?: Record<string, any>): void {
    this.log('error', event, message, metadata);
  }

  static fatal(event: string, message: string, metadata?: Record<string, any>): void {
    this.log('fatal', event, message, metadata);
  }

  // Domain Event Shortcuts
  static reportPaymentFailure(orderNumber: string, reason: string, meta?: Record<string, any>): void {
    this.error('PAYMENT_SUBMISSION_FAILED', `Payment verification failed for order ${orderNumber}: ${reason}`, {
      orderNumber,
      reason,
      ...meta,
    });
  }

  static reportOrderCreationFailure(error: any, payload?: Record<string, any>): void {
    this.error('ORDER_CREATION_FAILED', `Order checkout creation rejected: ${error?.message || error}`, {
      error: error?.message || String(error),
      payload,
    });
  }

  static reportDatabaseError(operation: string, error: any): void {
    this.error('DATABASE_QUERY_ERROR', `Prisma operation "${operation}" failed: ${error?.message || error}`, {
      operation,
      errorCode: error?.code,
    });
  }

  static reportEmailFailure(type: string, recipient: string, error: any): void {
    this.error('EMAIL_DISPATCH_FAILED', `Failed sending ${type} email to ${recipient}: ${error?.message || error}`, {
      type,
      recipient,
      error: error?.message || String(error),
    });
  }

  static reportUploadViolation(reason: string, details?: Record<string, any>): void {
    this.warn('FILE_UPLOAD_VIOLATION', `Security rejected file upload: ${reason}`, details);
  }

  static reportRateLimit(action: string, identifier: string): void {
    this.warn('RATE_LIMIT_EXCEEDED', `Rate limit threshold triggered on ${action} for ${identifier}`, {
      action,
      identifier,
    });
  }
}
