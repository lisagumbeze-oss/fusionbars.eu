import { Suspense } from 'react';
import CommercialPricingCenter from '@/components/admin/CommercialPricingCenter';

export default function PricingAdminPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#5C5852]">Loading commercial pricing…</p>}>
      <CommercialPricingCenter />
    </Suspense>
  );
}
