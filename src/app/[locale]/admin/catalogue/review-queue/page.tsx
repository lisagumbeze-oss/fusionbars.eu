import { Suspense } from 'react';
import CatalogueReviewQueue from '@/components/admin/CatalogueReviewQueue';

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#5C5852]">Loading review queue…</p>}>
      <CatalogueReviewQueue />
    </Suspense>
  );
}
