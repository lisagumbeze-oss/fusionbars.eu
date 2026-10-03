import { permanentRedirect } from 'next/navigation';
import { LocaleCode } from '@/types';

interface ProductsPageProps {
  params: Promise<{ locale: string }> | { locale: string };
}

export default async function ProductsPage({ params }: ProductsPageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as LocaleCode;
  permanentRedirect(`/${locale}/shop`);
}
