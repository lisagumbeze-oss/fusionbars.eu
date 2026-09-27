import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/i18n';

export default async function AdminAliasPage({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  const suffix = path?.length ? `/${path.join('/')}` : '';
  redirect(`/${DEFAULT_LOCALE}/admin${suffix}`);
}
