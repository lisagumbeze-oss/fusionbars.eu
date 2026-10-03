import { CommercialConfigurationService } from '@/domain/commercial/CommercialConfigurationService';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';

export const dynamic = 'force-dynamic';

export default function TaxAdminPage() {
  const tax = CommercialConfigurationService.get().tax;
  const readiness = CommercialConfigurationService.taxReadiness();
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Tax readiness</h2>
        <p className="mt-2">State: {readiness.state}</p>
        <p>Display mode: {readiness.displayMode}</p>
        <p>Shipping tax class: {readiness.shippingTaxClass}</p>
        <p>Active rates: {readiness.activeRates}</p>
        <p>Production: {PRODUCTION_CONTROL_STATE}</p>
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Jurisdictions</h2>
        {tax.jurisdictions.length === 0 ? <p className="mt-2 text-[#5C5852]">NOT_CONFIGURED</p> : (
          <ul className="mt-2 space-y-1">{tax.jurisdictions.map((code) => <li key={code}>{code}</li>)}</ul>
        )}
      </section>
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Rates</h2>
        {tax.rates.length === 0 ? <p className="mt-2 text-[#5C5852]">No VAT rate has been supplied.</p> : (
          <ul className="mt-2 space-y-2">
            {tax.rates.map((rate) => (
              <li key={rate.id}>{rate.country} · {rate.taxClass} · {rate.rateBps} bps · {rate.status} · from {rate.effectiveFrom}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
