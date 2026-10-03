import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';

export default function LegalSettingsPage() {
  const report = LegalGovernanceService.report();
  const profile = report.profile;
  const fields = [
    ['Display name', profile.displayName],
    ['Support email', profile.supportEmail],
    ['Legal company name', profile.legalName],
    ['Registration number', profile.registrationNumber],
    ['VAT number', profile.vatNumber],
    ['Registered address', profile.registeredAddress],
    ['Jurisdiction', profile.jurisdiction],
  ] as const;
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Business information</h2>
        <ul className="mt-2 space-y-1">
          {fields.map(([label, field]) => (
            <li key={label}>{label}: {field.state}{field.state === 'CONFIGURED' && profile.publicFields.includes(label) ? ' · public' : ''}</li>
          ))}
        </ul>
        <p className="mt-2 text-[#5C5852]">Missing legal identity is not filled in. Configured does not mean approved for publication.</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Documents</h2>
        <ul className="mt-2 space-y-1">
          {report.documents.map((doc) => (
            <li key={`${doc.type}-${doc.locale}`}>{doc.type} / {doc.locale}: {doc.status} · version {doc.version}</li>
          ))}
        </ul>
        <p className="mt-2 text-[#5C5852]">German, French, Spanish, Italian, and Dutch copies are not created automatically.</p>
      </section>
      <p>Production: {report.production}</p>
    </div>
  );
}
