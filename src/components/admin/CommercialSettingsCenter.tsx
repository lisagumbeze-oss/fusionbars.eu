'use client';

import React, { useEffect, useState } from 'react';
import { getCommercialDashboardAction } from '@/actions/commercial';
import { useAdminRole } from '@/components/admin/AdminShell';

export default function CommercialSettingsCenter() {
  const { role } = useAdminRole();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getCommercialDashboardAction(role).then((result) => {
      if (!result.success) setError(result.error);
      else setData(result);
    });
  }, [role]);

  if (error) return <p className="text-sm text-rose-800">{error}</p>;
  if (!data) return <p className="text-sm text-[#5C5852]">Loading commercial settings…</p>;
  const summary = data.summary;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Currency">
        <Row label="Primary" value={summary.primaryCurrency} />
        <Row label="Supported" value={summary.supportedCurrencies.join(', ')} />
        <Row label="Pricing mode" value={summary.pricingMode} />
        <Row label="FX configuration" value={summary.fxStatus} />
        <Row label="FX maximum age" value={summary.fxMaxAgeHours == null ? 'NOT_CONFIGURED' : `${summary.fxMaxAgeHours} hours`} />
      </Section>
      <Section title="Pricing">
        <Row label="Minor units" value="EUR cents and GBP pence" />
        <Row label="Active rounding strategy" value={summary.roundingStrategy} />
        <Row label="Four-eyes approval" value={summary.fourEyes ? 'Required' : 'Not required'} />
        <Row label="Price lock" value={summary.priceLock} />
        <Row label="Calculation order" value={summary.calculationOrder.join(' → ')} />
      </Section>
      <Section title="Tax">
        <Row label="Display mode" value={summary.taxDisplayMode} />
        <Row label="Jurisdictions" value={summary.jurisdictions.length ? summary.jurisdictions.join(', ') : 'NOT_CONFIGURED'} />
        <Row label="Tax classes" value={summary.taxClasses.join(', ')} />
        <Row label="Configured VAT rates" value={String(summary.vatRates)} />
        <Row label="Products with an explicit class" value={String(summary.productTaxClasses)} />
      </Section>
      <Section title="Shipping">
        <Row label="Strategy" value={summary.shipping.strategy} />
        <Row label="Standard EUR" value="€15.00" />
        <Row label="Express EUR" value="€20.00" />
        <Row label="Free standard threshold" value="€300.00" />
        <Row label="Threshold basis" value={summary.shipping.thresholdBasis} />
        <Row label="GBP shipping" value="Explicit £13.00 / £17.50 / £260.00 threshold" />
        <Row label="Hubs" value={summary.shipping.hubs.join(', ')} />
      </Section>
      <Section title="Promotions">
        <Row label="Stacking" value={summary.promotions.stacking} />
        <Row label="Prices below zero" value={summary.promotions.allowBelowZero ? 'Permitted' : 'Not permitted'} />
        <Row label="Write access" value={data.canWrite ? 'Finance or Super Admin' : 'View only'} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#E5E3DD] bg-white p-4">
      <h2 className="font-serif text-lg text-[#121212]">{title}</h2>
      <dl className="mt-3 space-y-2">{children}</dl>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <dt className="text-[#5C5852]">{label}</dt>
      <dd className="text-right font-medium text-[#121212]">{value}</dd>
    </div>
  );
}
