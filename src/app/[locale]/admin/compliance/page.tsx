import { Suspense } from 'react';
import AdminModule from '@/components/admin/AdminModule';

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-[#5C5852]">Loading…</p>}>
      <AdminModule module="compliance" />
    </Suspense>
  );
}
