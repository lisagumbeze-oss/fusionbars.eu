'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { loginAdminAction } from '@/actions/admin-auth';

export default function AdminLoginForm() {
  const params = useParams<{ locale: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = params?.locale || 'en';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginAdminAction({ email, password });
      if (!result.success) {
        setError(result.error || 'Email or password is incorrect.');
        return;
      }
      const next = searchParams.get('next') || '';
      const safeNext = next.startsWith(`/${locale}/admin`) && !next.includes('/admin/login') ? next : `/${locale}/admin`;
      router.replace(safeNext);
      router.refresh();
    } catch {
      setError('Email or password is incorrect.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F3EF] text-[#121212] flex items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-[#E5E3DD] bg-[#FBFBF9] p-6 shadow-sm">
        <p className="font-serif text-2xl">Fusion EU</p>
        <h1 className="mt-1 text-sm font-semibold">Super Admin sign in</h1>
        <p className="mt-1 text-xs text-[#5C5852]">Use the admin email and password.</p>
        <label className="mt-5 block text-xs font-semibold" htmlFor="admin-email">Email</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[#E5E3DD] bg-white px-3 py-2 text-sm"
        />
        <label className="mt-3 block text-xs font-semibold" htmlFor="admin-password">Password</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-[#E5E3DD] bg-white px-3 py-2 text-sm"
        />
        {error && <p className="mt-3 text-xs text-red-700" role="alert">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-lg bg-[#4A5D4E] px-3 py-2 text-sm font-semibold text-[#FBFBF9] hover:bg-[#3B4A3E] disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
