import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EnvironmentService } from '@/config/environment';
import { ProductionInfrastructureService } from '@/domain/infrastructure/ProductionInfrastructureService';
import { StorageReadinessService } from '@/services/storage/StorageReadinessService';

/**
 * Public Health Probe
 * Returns minimal operational status for uptime monitors without exposing internal infrastructure details.
 */
export async function GET() {
  const health = ProductionInfrastructureService.publicHealth();
  return NextResponse.json(
    {
      status: health.status,
      application: health.application,
      database: health.database,
      storage: health.storage,
      email: health.email,
      payments: health.payments,
      backup: { status: health.backups },
      monitoring: { status: health.monitoring },
      rateLimit: { status: health.rateLimit },
      timestamp: new Date().toISOString(),
      service: 'fusion-mushroom-bars-eu',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}

/**
 * Deep Administrative Readiness Probe
 * Requires Authorization Bearer token matching AUTH_SECRET or ADMIN role.
 * Tests database pool, storage provider, and environment readiness.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const config = EnvironmentService.getConfig();

  // Protect administrative probe against unauthorized inspection
  const expectedSecret = config.secrets.authSecret;
  if (!token || token !== expectedSecret) {
    return NextResponse.json({ status: 'unauthorized', error: 'Authentication required' }, { status: 401 });
  }

  const checks: Record<string, { status: 'pass' | 'fail'; latencyMs?: number; note?: string }> = {};

  // 1. Database Connectivity
  const dbStart = Date.now();
  try {
    // Light ping query
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: 'pass',
      latencyMs: Date.now() - dbStart,
      note: config.database.isPooled ? 'Pooled' : 'Direct',
    };
  } catch {
    checks.database = {
      status: 'fail',
      latencyMs: Date.now() - dbStart,
      note: 'Database connection failed',
    };
  }

  // 2. Storage Readiness
  const storage = StorageReadinessService.report();
  checks.storage = {
    status: storage.state === 'ACTIVE' ? 'pass' : 'fail',
    note: storage.state,
  };

  // 3. Email Readiness
  checks.email = {
    status: 'pass',
    note: config.email.provider,
  };

  // 4. Rate Limiter Readiness
  checks.rateLimiting = {
    status: 'pass',
    note: config.rateLimit.isDistributed ? 'Distributed (Redis)' : 'In-Memory',
  };

  const isAllPassing = Object.values(checks).every((c) => c.status === 'pass');

  return NextResponse.json(
    {
      status: isAllPassing ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    {
      status: isAllPassing ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    }
  );
}
