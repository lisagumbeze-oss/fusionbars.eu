import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, AdminAuthService } from '@/domain/auth/AdminAuthService';
import { AuthService } from '@/domain/auth/AuthService';
import { FileUploadSecurityService } from '@/lib/file-upload-security';
import { ObjectStorageService } from '@/services/storage/ObjectStorageService';

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key') || '';
  if (!key || key.includes('..') || key.startsWith('catalogue/public/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const cookieStore = await cookies();
  const admin = AdminAuthService.sessionFromToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const session = AuthService.verifySessionToken(cookieStore.get('fb_session')?.value);
  const actor = admin || session;
  if (!actor) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const stored = await ObjectStorageService.readAuthorizedObject({
    storageKey: key,
    requester: { role: actor.role, customerId: actor.id, email: actor.email },
  });
  if (!stored) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return new NextResponse(new Uint8Array(stored.buffer), {
    headers: FileUploadSecurityService.getPrivateSecurityHeaders(stored.mimeType, stored.filename),
  });
}
