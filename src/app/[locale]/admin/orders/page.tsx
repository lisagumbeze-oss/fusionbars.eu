import { Suspense } from 'react';
import { CommerceOperations } from '@/components/admin/CommerceOperations';

export default function OrdersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#5C5852]">Loading orders…</p>}>
      <CommerceOperations initialTab="orders" />
    </Suspense>
  );
}
