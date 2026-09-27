import { Suspense } from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-[#5C5852]">Loading…</p>}>
      <AdminLoginForm />
    </Suspense>
  );
}
