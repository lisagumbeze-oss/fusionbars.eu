import { Suspense } from 'react';
import AdminModule from '@/components/admin/AdminModule';
import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';

export default function Page() {
  const blockers = LegalGovernanceService.launchBlockers();
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4 text-sm">
        <h2 className="font-semibold">Legal and disclosure blockers</h2>
        <ul className="mt-2 list-disc pl-5">{blockers.map((item) => <li key={item}>{item}</li>)}</ul>
        <p className="mt-2 text-[#5C5852]">These are workflow states. They are not a compliance score.</p>
      </section>
      <Suspense fallback={<p className="text-sm text-[#5C5852]">Loading…</p>}>
        <AdminModule module="compliance" />
      </Suspense>
    </div>
  );
}
