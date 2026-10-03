import { CommercialConfigurationService } from '@/domain/commercial/CommercialConfigurationService';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/production-state';

export const dynamic = 'force-dynamic';

export default function TaxSettingsPage() {
  const tax = CommercialConfigurationService.get().tax;
  return (
    <div className="space-y-4 text-sm text-[#1C1917]">
      <section className="rounded-2xl border border-[#E5E3DD] bg-white p-4">
        <h2 className="font-semibold">Tax configuration</h2>
        <ul className="mt-2 space-y-1">
          <li>Display mode: {tax.displayMode}</li>
          <li>Shipping tax class: {tax.shippingTaxClass || 'NOT_CONFIGURED'}</li>
          <li>Classes available to assign: {tax.classes.join(', ')}</li>
          <li>Product class decisions: {Object.keys(tax.productClasses).length}</li>
        </ul>
        <p className="mt-2 text-[#5C5852]">A drafted rate stays inactive until SUPER_ADMIN approval and an explicit activation. No country rate is assumed.</p>
      </section>
      <p>Production: {PRODUCTION_CONTROL_STATE}</p>
    </div>
  );
}
