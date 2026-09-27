'use server';

import { RoleName } from '@/types';
import { DestinationEngine } from '@/domain/shipping/DestinationEngine';
import { CountryRegistry } from '@/domain/countries/CountryRegistry';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/AdminDashboardService';

export async function getShippingDashboardAction(role: RoleName) {
  if (!DestinationEngine.canView(role)) return { success: false as const, error: `${role} cannot view shipping configuration.` };
  const summary = DestinationEngine.summary();
  const countries = CountryRegistry.getAllCountries().map((country) => ({
    code: country.code,
    alpha3: CountryRegistry.getAlpha3(country.code),
    name: country.name,
    storeStatus: DestinationEngine.storeStatus(country.code),
    currency: country.currency,
    group: country.category,
    express: DestinationEngine.expressAvailable(country.code),
  }));
  return {
    success: true as const,
    production: PRODUCTION_CONTROL_STATE,
    summary,
    cohort: DestinationEngine.cohort(),
    countries,
    canWrite: DestinationEngine.canWriteEligibility(role),
  };
}
