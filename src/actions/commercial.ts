'use server';

import { RoleName } from '@/types';
import { CatalogService } from '@/lib/catalog';
import { CommercialConfigurationService } from '@/domain/commercial/CommercialConfigurationService';
import { PricingEngine } from '@/domain/commercial/PricingEngine';
import { PRODUCTION_CONTROL_STATE } from '@/domain/admin/AdminDashboardService';

export async function getCommercialDashboardAction(role: RoleName, search = '', page = 1) {
  if (!CommercialConfigurationService.canView(role)) {
    return { success: false as const, error: `${role} cannot view commercial configuration.` };
  }
  const summary = PricingEngine.commercialSummary();
  const cohort = PricingEngine.cohortReport();
  const query = search.trim().toLowerCase();
  const rows = CatalogService.getProducts()
    .filter((product) => !query || `${product.name} ${product.slug} ${product.categoryName}`.toLowerCase().includes(query))
    .map((product) => {
      const variant = product.variants[0];
      const status = PricingEngine.specialistStatus(product.slug) || 'PRICE_REVIEW_PENDING';
      const eur = PricingEngine.activeApprovedPrice(product.slug, variant?.id || null, 'EUR', new Date().toISOString());
      const gbp = PricingEngine.activeApprovedPrice(product.slug, variant?.id || null, 'GBP', new Date().toISOString());
      return {
        slug: product.slug,
        name: product.name,
        category: product.categoryName,
        variant: variant?.name || variant?.sku || '',
        sourceLabel: 'SOURCE',
        catalogueEur: variant?.priceEUR ?? null,
        catalogueGbp: variant?.priceGBP ?? null,
        approvedEur: eur?.amountMinor ?? null,
        approvedGbp: gbp?.amountMinor ?? null,
        status,
        taxClass: CommercialConfigurationService.get().tax.productClasses[product.slug] || 'NOT_CONFIGURED',
        effectiveFrom: eur?.effectiveFrom || gbp?.effectiveFrom || null,
        reviewer: eur?.approver || gbp?.approver || null,
      };
    });
  const pageSize = 20;
  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    success: true as const,
    production: PRODUCTION_CONTROL_STATE,
    summary,
    cohort,
    page,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
    total: rows.length,
    rows: rows.slice(start, start + pageSize),
    canWrite: CommercialConfigurationService.canWrite(role),
  };
}
