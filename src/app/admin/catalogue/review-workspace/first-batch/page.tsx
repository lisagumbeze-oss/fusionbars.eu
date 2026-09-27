import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/i18n';

export default function DirectFirstBatchPage() {
  redirect(`/${DEFAULT_LOCALE}/admin/catalogue/review-workspace/first-batch`);
}
