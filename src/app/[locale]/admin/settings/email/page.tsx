import { EmailDnsVerificationService } from '@/services/email/EmailDnsVerificationService';
import { EmailProductionReadinessService } from '@/services/email/EmailProductionReadinessService';

export const dynamic = 'force-dynamic';

export default async function EmailSettingsPage() {
  const observation = await EmailDnsVerificationService.inspect();
  EmailProductionReadinessService.applyObservation(observation);
  const report = EmailProductionReadinessService.report();
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Provider</h2>
        <p>Provider: {report.provider}</p>
        <p>Status: {report.state}</p>
        <p>Credentials: {report.credentials}</p>
        <p>Credential acceptance: {report.credentialAcceptance}</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Sender</h2>
        <p>Name: {report.sender.name}</p>
        <p>Email: {report.sender.email}</p>
        <p>Reply-To: {report.sender.replyTo}</p>
        <p>Domain: {report.sender.domain}</p>
        <p>Domain verification: {report.domainVerification}</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">DNS</h2>
        <p>SPF: {report.dns.SPF}</p>
        <p>DKIM: {report.dns.DKIM}</p>
        <p>DMARC: {report.dns.DMARC}</p>
        <p>SPF record: {report.dnsObservation?.spfRecord || 'NOT_CHECKED'}</p>
        <p>DKIM record: {report.dnsObservation?.dkimRecord || 'NOT_CHECKED'}</p>
        <p>DMARC record: {report.dnsObservation?.dmarcRecord || 'NOT_CHECKED'}</p>
        <p>DMARC policy: {report.dnsObservation?.dmarcPolicy || 'NOT_OBSERVED'}</p>
        <p>Test handoff: {report.testHandoff}</p>
        <p>Test delivery: {report.testDelivery}</p>
        <p>Delivery logging: {report.deliveryLogging}</p>
        <p className="text-[#5C5852]">A public DNS record does not verify SPF, DKIM, or DMARC. Verification has to come from the selected provider.</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Templates</h2>
        <p>{report.templates.validated} of {report.templates.total} validated.</p>
        <p>Production: {report.production}</p>
        <ul className="list-disc pl-5">{report.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <p className="text-[#5C5852]">API keys, SMTP passwords, and secret tokens are not shown. Saving configuration does not activate delivery. Ordinary production email stays off until a Super Admin activates it after a confirmed provider delivery.</p>
    </div>
  );
}
