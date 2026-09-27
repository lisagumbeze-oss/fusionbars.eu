import { Suspense } from 'react';
import { CommerceOperations } from '@/components/admin/CommerceOperations';

export default function InventoryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#5C5852]">Loading inventory…</p>}>
      <CommerceOperations initialTab="inventory" />
    </Suspense>
  );
}
