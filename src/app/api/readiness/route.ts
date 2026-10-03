import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, AdminAuthService } from '@/domain/auth/AdminAuthService';
import { ProductionInfrastructureService } from '@/domain/infrastructure/ProductionInfrastructureService';

export async function GET() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const session = AdminAuthService.sessionFromToken(token);
  if (!session || session.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return NextResponse.json(ProductionInfrastructureService.readiness(), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
