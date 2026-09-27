import { PaymentConfigurationService } from '@/domain/payments/PaymentConfigurationService';

export default function PaymentSettingsPage() {
  const report = PaymentConfigurationService.report();
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Production</h2>
        <p>{report.production}</p>
        <p>Production payment options: {report.productionOptions.join(', ') || 'None'}</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Bank transfer</h2>
        <p>State: {report.bank}</p>
        <ul className="list-disc pl-5">{report.bankBlockers.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Cryptocurrency</h2>
        <p>Bitcoin: {report.crypto.BTC}</p>
        <p>USDT: {report.crypto.USDT}</p>
        <p>Ethereum: {report.crypto.ETH}</p>
        <p>Amount rule: {report.conversion}</p>
        <ul className="list-disc pl-5">{report.cryptoBlockers.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <p className="text-[#5C5852]">Account numbers, wallet addresses, and secrets are not shown. Saving configuration does not activate a method.</p>
    </div>
  );
}
