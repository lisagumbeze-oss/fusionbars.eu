'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';
import { ADMIN_SESSION_COOKIE, AdminAuthService } from '@/domain/auth/AdminAuthService';
import { AuthService } from '@/domain/auth/AuthService';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

function cookieOptions() {
  const base = AuthService.getCookieOptions();
  return {
    httpOnly: base.httpOnly,
    secure: base.secure,
    sameSite: base.sameSite,
    path: base.path,
    maxAge: base.maxAge,
  };
}

export async function loginAdminAction(rawInput: unknown) {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: 'Email or password is incorrect.' };
  }

  const result = AdminAuthService.authenticate(parsed.data.email, parsed.data.password);
  if (!result) {
    return { success: false, error: 'Email or password is incorrect.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, result.token, cookieOptions());
  return { success: true };
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  return { success: true };
}
