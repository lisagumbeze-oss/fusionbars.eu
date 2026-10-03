import { NextRequest, NextResponse } from 'next/server';
import { ObjectStorageService } from '@/services/storage/ObjectStorageService';

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key') || '';
  if (!ObjectStorageService.isPublicMedia(key)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  const stored = await ObjectStorageService.readAuthorizedObject({ storageKey: key, requester: { role: 'SUPER_ADMIN' } });
  if (!stored || stored.mimeType === 'application/pdf') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }
  return new NextResponse(new Uint8Array(stored.buffer), {
    headers: {
      'Content-Type': stored.mimeType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
