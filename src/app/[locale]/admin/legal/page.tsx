import { LegalGovernanceService } from '@/domain/legal/LegalGovernanceService';
import { PaymentConfigurationService } from '@/domain/payments/PaymentConfigurationService';

export default function LegalAdminPage() {
  const report = LegalGovernanceService.report();
  const payments = PaymentConfigurationService.report();
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Legal documents</h2>
        <ul className="mt-2 space-y-1">
          {report.documents.map((doc) => (
            <li key={`${doc.type}-${doc.locale}`}>{doc.type} · {doc.locale} · {doc.status} · v{doc.version} · {doc.effectiveDate || 'no effective date'}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Consent and cookies</h2>
        <p>Analytics: {report.analytics}</p>
        <p>Newsletter: {report.newsletter}</p>
        <p>Stored consent records in this process: {report.consentCount}</p>
        <ul className="mt-2 space-y-1">
          {LegalGovernanceService.cookieInventory().map((item) => (
            <li key={item.key}>{item.key}: {item.category} · {item.necessary ? 'necessary' : 'optional'} · {item.party} party</li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Public disclosures</h2>
        <p>Payment methods in production: {payments.productionOptions.join(', ') || 'None active'}</p>
        <p>Bank transfer state: {payments.bank}</p>
        <p>Bitcoin state: {payments.crypto.BTC}</p>
        <p>Age verification at delivery: not configured</p>
        <p>Public carrier tracking: not offered</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Launch blockers</h2>
        <ul className="list-disc pl-5">{report.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </div>
  );
}
