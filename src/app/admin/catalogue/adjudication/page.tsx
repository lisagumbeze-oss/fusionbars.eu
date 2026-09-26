import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/i18n';

export default function DirectCatalogueAdjudicationPage() {
  redirect(`/${DEFAULT_LOCALE}/admin/catalogue/adjudication`);
}
