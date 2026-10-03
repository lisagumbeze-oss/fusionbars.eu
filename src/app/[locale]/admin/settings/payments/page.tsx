import { PaymentProductionReadinessService } from '@/domain/payments/PaymentProductionReadinessService';
import { PaymentConfigService } from '@/domain/payments/PaymentConfig';
import { paymentProofUploadChoice } from '@/domain/launch/operator-configuration';

export const dynamic = 'force-dynamic';

export default function PaymentSettingsPage() {
  const report = PaymentProductionReadinessService.report();
  const fields = PaymentConfigService.configurationPresence();
  const proofChoice = paymentProofUploadChoice();
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Production</h2>
        <p>{report.production}</p>
        <p>Production payment options: {report.productionOptions.join(', ') || 'None'}</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Bank transfer</h2>
        <p>Configuration: {report.bank.state}</p>
        <p>Business verification: {report.bank.verification}</p>
        <p>IBAN format: {report.bank.format}</p>
        <p>BIC format: {report.bank.bic}</p>
        <p>Currencies: {report.bank.currencies.join(', ')}</p>
        <p>Reference: {report.bank.reference}</p>
        <p>Controlled test: {report.controlledTest.SEPA_IBAN}</p>
        <ul className="list-disc pl-5">{report.blockers.bank.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Cryptocurrency</h2>
        <p>Bitcoin: {report.crypto.assets.BTC}. Approval: {report.crypto.approval.BTC}. Network: {report.crypto.networks.BTC}. Address: {report.crypto.addressVerification.BTC}</p>
        <p>USDT: {report.crypto.assets.USDT}. Approval: {report.crypto.approval.USDT}. Network: {report.crypto.networks.USDT}. Address: {report.crypto.addressVerification.USDT}</p>
        <p>Ethereum: {report.crypto.assets.ETH}. Approval: {report.crypto.approval.ETH}. Network: {report.crypto.networks.ETH}. Address: {report.crypto.addressVerification.ETH}</p>
        <p>Conversion: {report.crypto.conversion}</p>
        <p>Controlled test: {report.controlledTest.CRYPTO_BTC}</p>
        <ul className="list-disc pl-5">{report.blockers.bitcoin.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Operations</h2>
        <p>Submitted: {report.operations.submitted}</p>
        <p>Mismatches: {report.operations.mismatches}</p>
        <p>Rejected: {report.operations.rejected}</p>
        <p>Verified: {report.operations.verified}</p>
        <p>Evidence storage: {report.evidenceStorage}</p>
        <p>Notifications: {report.notifications}</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Operator entry</h2>
        <p>Manual payment instructions: {report.bank.verification === 'VERIFIED' && report.bank.format === 'FORMAT_VALID' ? 'READY' : 'CONFIGURATION_REQUIRED'}</p>
        <p>Payment proof upload: {proofChoice}</p>
        <ul className="mt-2 space-y-1">
          {fields.map((field) => (
            <li key={`${field.env}-${field.field}`}>{field.field} ({field.env}): {field.state}</li>
          ))}
        </ul>
        <p className="mt-2 text-[#5C5852]">Set the named environment variables. This screen does not accept or display account numbers, wallet addresses, or networks. A missing field stays MISSING until a non-placeholder value is present and business verification is recorded.</p>
      </section>
      <p className="text-[#5C5852]">Account numbers, wallet addresses, private keys, and secrets are not shown. Saving configuration does not activate a method. Format validation does not prove the account belongs to the business.</p>
    </div>
  );
}