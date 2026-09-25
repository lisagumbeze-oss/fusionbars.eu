import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/i18n';

export default function DirectCatalogueReviewPage() {
  redirect(`/${DEFAULT_LOCALE}/admin/catalogue/review`);
}
