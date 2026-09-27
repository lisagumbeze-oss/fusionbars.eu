import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import { ADMIN_SESSION_COOKIE, AdminAuthService } from '@/domain/auth/AdminAuthService';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const headerStore = await headers();
  const isLogin = headerStore.get('x-admin-route') === 'login';
  const cookieStore = await cookies();
  const session = AdminAuthService.sessionFromToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (isLogin) {
    if (session) redirect(`/${locale}/admin`);
    return children;
  }

  if (!session) redirect(`/${locale}/admin/login`);
  return <AdminShell>{children}</AdminShell>;
}
