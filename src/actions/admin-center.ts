'use server';

import { AdminAccess, AdminSection } from '@/domain/admin/AdminAccess';
import { AdminDashboardService, PRODUCTION_CONTROL_STATE } from '@/domain/admin/AdminDashboardService';
import { AdminNotificationCenter } from '@/domain/admin/AdminNotificationCenter';
import { EmailTemplateRegistry } from '@/domain/admin/EmailTemplateRegistry';
import { deliveryLogExposesSecrets, projectDeliveryLog } from '@/domain/admin/EmailDeliveryLog';
import { recentDeliveries } from '@/services/email/EmailProvider';
import { getAllOrdersAdminAction } from '@/actions/orders';
import { getInventoryMatrixAction } from '@/actions/inventory';
import { CommerceRepository } from '@/lib/commerce-repository';
import { CatalogService } from '@/lib/catalog';
import { EmailService } from '@/services/email/EmailService';
import { LaunchReadinessService } from '@/domain/launch/LaunchReadinessService';
import { RBACService } from '@/domain/auth/RBACService';
import { PublicationReadinessService } from '@/domain/catalog/PublicationReadinessService';
import { CatalogueRolloutService, QueueFilters } from '@/domain/catalog/CatalogueRolloutService';
import { RoleName } from '@/types';
import { AdminOverrides } from '@/domain/admin/AdminOverrides';
import { ensureAdminOverridesLoaded, persistAdminOverrides } from '@/domain/admin/AdminOverrideStore';

function denied(role: RoleName, section: AdminSection) {
  return { success: false as const, error: `${role} cannot open ${section}. Server authorization remains in effect.` };
}

export async function getAdminDashboardAction(role: RoleName = 'SUPER_ADMIN', locale = 'en') {
  if (!AdminAccess.can(role, 'dashboard')) return denied(role, 'dashboard');
  const catalogue = AdminDashboardService.catalogueSnapshot();
  let ordersAvailable = false;
  let ordersError = '';
  let orderCounts = AdminDashboardService.countOrders([]);
  let payments = { awaiting: 0, verified: 0, rejected: 0 };
  if (RBACService.hasPermission(role, 'orders:read') || role === 'SUPER_ADMIN') {
    const result = await getAllOrdersAdminAction(role);
    if (result.success && result.orders) {
      ordersAvailable = true;
      orderCounts = AdminDashboardService.countOrders(result.orders);
      payments = {
        awaiting: orderCounts.PAYMENT_SUBMITTED,
        verified: orderCounts.PAYMENT_VERIFIED,
        rejected: result.orders.filter((order) =>
          order.statusHistory?.some((entry) => /reject|clarification/i.test(entry.note || ''))
        ).length,
      };
    } else {
      ordersError = result.error || 'Orders are unavailable.';
    }
  } else {
    ordersError = `${role} cannot view order metrics.`;
  }

  let inventory = { available: false, error: '', lowStock: 0, outOfStock: 0, reserved: 0 };
  if (AdminAccess.can(role, 'inventory') || role === 'SUPER_ADMIN') {
    const result = await getInventoryMatrixAction(role);
    if (result.success) {
      const summary = AdminDashboardService.inventorySummary(result.inventory || []);
      inventory = { available: true, error: '', ...summary };
    } else {
      inventory = { available: false, error: result.error || 'Inventory is unavailable.', lowStock: 0, outOfStock: 0, reserved: 0 };
    }
  }

  let launchBlockers: Array<{ id: string; name: string; status: string; message: string }> = [];
  let launchError = '';
  if (AdminAccess.can(role, 'launch')) {
    try {
      const report = await LaunchReadinessService.evaluateReadiness();
      launchBlockers = report.requirements
        .filter((item) => item.status !== 'READY')
        .map((item) => ({ id: item.id, name: item.name, status: item.status, message: item.validationMessage }));
    } catch (error: any) {
      launchError = error?.message || 'Launch checks are unavailable.';
    }
  }

  const generatedAt = new Date().toISOString();
  const notifications = AdminNotificationCenter.build({
    generatedAt,
    locale,
    specialistPending: catalogue.specialistPending,
    countryPending: catalogue.countryPending,
    compliancePending: catalogue.compliancePending,
    translationPending: catalogue.translationPending,
    paymentsAwaiting: payments.awaiting,
    lowStock: inventory.lowStock,
    productionPaused: PRODUCTION_CONTROL_STATE === 'PAUSED',
  }).map((item) => ({ ...item, read: AdminNotificationCenter.isRead(item.id) }));

  return {
    success: true as const,
    productionState: PRODUCTION_CONTROL_STATE,
    catalogue,
    ordersAvailable,
    ordersError,
    orderCounts,
    payments,
    inventory,
    launchBlockers,
    launchError,
    notifications,
  };
}

export async function getAdminNotificationsAction(role: RoleName = 'SUPER_ADMIN', locale = 'en') {
  if (!AdminAccess.can(role, 'notifications')) return denied(role, 'notifications');
  const dashboard = await getAdminDashboardAction(role, locale);
  if (!dashboard.success) return dashboard;
  return { success: true as const, notifications: dashboard.notifications };
}

export async function markAdminNotificationReadAction(role: RoleName, id: string) {
  if (!AdminAccess.can(role, 'notifications')) return denied(role, 'notifications');
  AdminNotificationCenter.markRead(id);
  return { success: true as const };
}

export async function markAllAdminNotificationsReadAction(role: RoleName, ids: string[]) {
  if (!AdminAccess.can(role, 'notifications')) return denied(role, 'notifications');
  AdminNotificationCenter.markAllRead(ids);
  return { success: true as const };
}

export async function getEmailTemplateCenterAction(role: RoleName) {
  if (!AdminAccess.can(role, 'email-templates')) return denied(role, 'email-templates');
  return {
    success: true as const,
    canModify: AdminAccess.canModifyTemplates(role),
    templates: EmailTemplateRegistry.list(),
  };
}

export async function previewEmailTemplateAction(role: RoleName, templateId: string) {
  if (!AdminAccess.can(role, 'email-templates')) return denied(role, 'email-templates');
  const preview = EmailTemplateRegistry.preview(templateId);
  if (!preview) return { success: false as const, error: 'Template not found.' };
  if (deliveryLogExposesSecrets(preview)) return { success: false as const, error: 'Preview withheld because it contained a secret.' };
  return { success: true as const, preview, canModify: AdminAccess.canModifyTemplates(role) };
}

export async function getEmailDeliveryLogAction(role: RoleName) {
  if (!AdminAccess.can(role, 'email-delivery')) return denied(role, 'email-delivery');
  const provider = EmailService.getProvider();
  const recorded = recentDeliveries();
  const mockSent = 'sentMessages' in provider && Array.isArray((provider as { sentMessages?: unknown[] }).sentMessages)
    ? (provider as { sentMessages: Array<Record<string, unknown>> }).sentMessages
    : [];
  const sent = recorded.length > 0 ? recorded : mockSent;
  const entries = projectDeliveryLog(sent, provider.name);
  if (deliveryLogExposesSecrets(entries)) return { success: false as const, error: 'Email delivery history is unavailable. Retry.' };
  return { success: true as const, provider: provider.name, entries };
}

export async function getAdminSettingsAction(role: RoleName) {
  if (!AdminAccess.can(role, 'settings')) return denied(role, 'settings');
  ensureAdminOverridesLoaded();
  const settings = AdminDashboardService.settingsSnapshot();
  if (deliveryLogExposesSecrets(settings)) return { success: false as const, error: 'Settings withheld.' };
  return { success: true as const, settings, productionState: PRODUCTION_CONTROL_STATE };
}

export async function getAdminAuditAction(role: RoleName) {
  if (!AdminAccess.can(role, 'audit')) return denied(role, 'audit');
  return { success: true as const, entries: AdminDashboardService.auditEntries() };
}

export async function getAdminCustomersAction(role: RoleName) {
  if (!AdminAccess.can(role, 'customers')) return denied(role, 'customers');
  ensureAdminOverridesLoaded();
  const orders = await getAllOrdersAdminAction(role);
  if (!orders.success || !orders.orders) return { success: false as const, error: orders.error || 'Customer directory is unavailable.' };
  const customers = AdminDashboardService.customerDirectory(orders.orders).map((row) => {
    const edit = AdminOverrides.customer(row.email);
    if (!edit) return { ...row, phone: '', note: '' };
    return {
      ...row,
      name: edit.name || row.name,
      phone: edit.phone || '',
      note: edit.note || '',
    };
  });
  return {
    success: true as const,
    canEdit: RBACService.hasPermission(role, 'orders:write') || role === 'SUPER_ADMIN',
    customers,
  };
}

export async function getAdminPaymentsAction(role: RoleName) {
  if (!AdminAccess.can(role, 'payments')) return denied(role, 'payments');
  const orders = await getAllOrdersAdminAction(role);
  if (!orders.success || !orders.orders) return { success: false as const, error: orders.error || 'Payments are unavailable.' };
  const queue = orders.orders
    .filter((order) => order.status === 'PAYMENT_SUBMITTED' || order.status === 'PENDING_PAYMENT' || order.proofFileUrl)
    .map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customer: order.guestEmail,
      amount: order.totalAmount,
      currency: order.currency,
      method: order.paymentMethodCode,
      status: order.status,
      proof: order.proofFileUrl || '',
      reference: order.paymentReference || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));
  return { success: true as const, payments: queue, canVerify: AdminAccess.canVerifyPayments(role) };
}

export async function getAdminProductListAction(role: RoleName, query = '') {
  if (!AdminAccess.can(role, 'products')) return denied(role, 'products');
  const needle = query.trim().toLowerCase();
  const products = CatalogService.getProducts()
    .filter((product) => {
      if (!needle) return true;
      const sku = product.variants.some((variant) => variant.sku.toLowerCase().includes(needle));
      return sku || product.name.toLowerCase().includes(needle) || product.slug.toLowerCase().includes(needle);
    })
    .slice(0, 80)
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      category: product.categoryName,
      sku: product.variants[0]?.sku || '',
      importStatus: product.status,
    }));
  return { success: true as const, products };
}

export async function getAdminProductDetailAction(role: RoleName, slug: string) {
  if (!AdminAccess.can(role, 'products') && !AdminAccess.can(role, 'catalogue-review') && !AdminAccess.can(role, 'specialist-review')) {
    return denied(role, 'products');
  }
  const view = AdminDashboardService.productAdminView(slug);
  if (!view) return { success: false as const, error: 'No catalogue product matches this filter.' };
  return {
    success: true as const,
    product: view,
    canPublish: PublicationReadinessService.canPublish(role),
    canEditCommercial: RBACService.hasPermission(role, 'catalog:write') || RBACService.hasPermission(role, 'content:write'),
    canEditPrice: RBACService.hasPermission(role, 'catalog:write'),
  };
}

export async function getPublicationDashboardAction(role: RoleName) {
  if (!AdminAccess.can(role, 'publication') && !AdminAccess.can(role, 'catalogue-review')) return denied(role, 'publication');
  const report = PublicationReadinessService.cohortReport();
  const recent = PublicationReadinessService.getAuditEvents().filter((event) => event.method !== 'REJECTED').slice(-12).reverse();
  return {
    success: true as const,
    production: PRODUCTION_CONTROL_STATE,
    ...report,
    recent,
    importedCatalogue: CatalogService.getProducts().length,
    publiclyVisible: CatalogService.getPublicProducts().length,
  };
}

export async function publishProductAction(role: RoleName, slug: string, confirm: boolean) {
  if (!PublicationReadinessService.canPublish(role)) {
    return { success: false as const, error: `403 Unauthorized. Role '${role}' cannot publish catalogue products.` };
  }
  const result = await PublicationReadinessService.publish({
    slug,
    actor: 'admin.catalogue@fusionbars.eu',
    role,
    confirm,
    expectedReady: true,
  });
  if (!result.success) return { success: false as const, error: result.error || 'Publication blocked.', report: result.report };
  return { success: true as const, report: result.report, idempotent: Boolean(result.idempotent) };
}

export async function unpublishProductAction(role: RoleName, slug: string, confirm: boolean) {
  if (!PublicationReadinessService.canPublish(role)) {
    return { success: false as const, error: `403 Unauthorized. Role '${role}' cannot unpublish catalogue products.` };
  }
  const result = await PublicationReadinessService.unpublish({
    slug,
    actor: 'admin.catalogue@fusionbars.eu',
    role,
    confirm,
  });
  if (!result.success) return { success: false as const, error: result.error || 'Unpublish blocked.', report: result.report };
  return { success: true as const, report: result.report, idempotent: Boolean(result.idempotent) };
}

export async function saveAdminSettingsAction(role: RoleName, form: {
  storeName: string;
  supportEmail: string;
  standardShippingEuros: number;
  expressShippingEuros: number;
  freeShippingEuros: number;
  cryptoDiscountPercent: number;
}) {
  if (!AdminAccess.can(role, 'settings')) return denied(role, 'settings');
  ensureAdminOverridesLoaded();
  const storeName = form.storeName.trim();
  const supportEmail = form.supportEmail.trim().toLowerCase();
  if (storeName.length < 2 || storeName.length > 80) {
    return { success: false as const, error: 'Store name must be between 2 and 80 characters.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail)) {
    return { success: false as const, error: 'Support email must be a valid address.' };
  }
  const cryptoDiscountPercent = Math.round(Number(form.cryptoDiscountPercent));
  if (!Number.isInteger(cryptoDiscountPercent) || cryptoDiscountPercent < 0 || cryptoDiscountPercent > 50) {
    return { success: false as const, error: 'Cryptocurrency discount must be a whole number from 0 to 50.' };
  }
  const cents = (euros: number, label: string) => {
    if (!Number.isFinite(euros) || euros < 0 || euros > 10000) {
      throw new Error(`${label} must be a euro amount between 0 and 10000.`);
    }
    return Math.round(euros * 100);
  };
  try {
    const saved = AdminOverrides.saveSettings({
      storeName,
      supportEmail,
      standardShippingCents: cents(form.standardShippingEuros, 'Standard shipping'),
      expressShippingCents: cents(form.expressShippingEuros, 'Express shipping'),
      freeShippingThresholdCents: cents(form.freeShippingEuros, 'Free-shipping threshold'),
      cryptoDiscountPercent,
    });
    persistAdminOverrides();
    CommerceRepository.logAudit({
      action: 'STORE_SETTINGS_UPDATED',
      entityType: 'Settings',
      entityId: 'store',
      actorRole: role,
      actorId: 'admin.dashboard',
      metadata: JSON.stringify(saved),
    });
    return { success: true as const, settings: AdminDashboardService.settingsSnapshot() };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Settings could not be saved.' };
  }
}

export async function saveAdminProductCommercialAction(role: RoleName, slug: string, form: {
  name: string;
  headline: string;
  description: string;
  priceEuros: number;
}) {
  if (!AdminAccess.can(role, 'products')) return denied(role, 'products');
  const canWriteCopy = RBACService.hasPermission(role, 'catalog:write') || RBACService.hasPermission(role, 'content:write');
  const canWritePrice = RBACService.hasPermission(role, 'catalog:write');
  if (!canWriteCopy) return { success: false as const, error: `${role} cannot edit catalogue products.` };
  ensureAdminOverridesLoaded();
  const product = CatalogService.getProductBySlug(slug);
  if (!product) return { success: false as const, error: 'No catalogue product matches this filter.' };
  const name = form.name.trim();
  const headline = form.headline.trim();
  const description = form.description.trim();
  if (name.length < 2 || name.length > 160) return { success: false as const, error: 'Product name must be between 2 and 160 characters.' };
  if (headline.length > 220) return { success: false as const, error: 'Headline must be 220 characters or fewer.' };
  if (description.length > 4000) return { success: false as const, error: 'Description must be 4000 characters or fewer.' };
  const priceEuros = Number(form.priceEuros);
  if (!Number.isFinite(priceEuros) || priceEuros <= 0 || priceEuros > 10000) {
    return { success: false as const, error: 'Price must be a euro amount between 0.01 and 10000.' };
  }
  const priceEUR = Math.round(priceEuros * 100);
  const currentPrice = product.variants[0]?.priceEUR;
  if (!canWritePrice && priceEUR !== currentPrice) {
    return { success: false as const, error: 'This role can edit product copy. Price changes stay with catalogue management.' };
  }
  const saved = AdminOverrides.saveProduct(slug, {
    name,
    headline,
    description,
    ...(canWritePrice ? { priceEUR } : {}),
  });
  persistAdminOverrides();
  CommerceRepository.logAudit({
    action: 'PRODUCT_COMMERCIAL_UPDATED',
    entityType: 'Product',
    entityId: slug,
    actorRole: role,
    actorId: 'admin.dashboard',
    metadata: JSON.stringify(saved),
  });
  return { success: true as const };
}

export async function saveAdminCustomerAction(role: RoleName, email: string, form: { name: string; phone: string; note: string }) {
  if (!AdminAccess.can(role, 'customers')) return denied(role, 'customers');
  ensureAdminOverridesLoaded();
  if (!RBACService.hasPermission(role, 'orders:write') && role !== 'SUPER_ADMIN') {
    return { success: false as const, error: `${role} can view the customer directory but cannot edit it.` };
  }
  const key = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return { success: false as const, error: 'Customer email is not valid.' };
  const name = form.name.trim();
  const phone = form.phone.trim();
  const note = form.note.trim();
  if (name.length > 120 || phone.length > 30 || note.length > 500) {
    return { success: false as const, error: 'Name, telephone, or note is too long.' };
  }
  const saved = AdminOverrides.saveCustomer(key, { name, phone, note });
  persistAdminOverrides();
  CommerceRepository.logAudit({
    action: 'CUSTOMER_DIRECTORY_UPDATED',
    entityType: 'Customer',
    entityId: key,
    actorRole: role,
    actorId: 'admin.dashboard',
    metadata: JSON.stringify(saved),
  });
  return { success: true as const };
}

export async function getCatalogueRolloutAction(role: RoleName) {
  if (!AdminAccess.can(role, 'catalogue-review') && !AdminAccess.can(role, 'publication')) return denied(role, 'catalogue-review');
  return {
    success: true as const,
    production: PRODUCTION_CONTROL_STATE,
    snapshot: CatalogueRolloutService.snapshot(),
    batches: CatalogueRolloutService.batchSummaries(),
  };
}

export async function queryCatalogueQueueAction(role: RoleName, filters: QueueFilters) {
  if (!AdminAccess.can(role, 'catalogue-review') && !AdminAccess.can(role, 'specialist-review') && !AdminAccess.can(role, 'publication')) {
    return denied(role, 'catalogue-review');
  }
  return { success: true as const, result: CatalogueRolloutService.query(filters) };
}

export async function createReviewBatchAction(role: RoleName, size: number) {
  try {
    const batch = CatalogueRolloutService.createBatch({
      size,
      actor: 'catalogue.manager@fusionbars.eu',
      actorRole: role,
      name: 'Review batch',
    });
    return { success: true as const, batch };
  } catch (err: any) {
    return { success: false as const, error: err.message || 'Batch was not created.' };
  }
}

export async function deferCatalogueQueueAction(role: RoleName, slugs: string[], reason: string, expectedVersions: Record<string, number>) {
  const result = CatalogueRolloutService.deferProducts({
    slugs,
    reason,
    actor: 'catalogue.manager@fusionbars.eu',
    actorRole: role,
    expectedVersions,
  });
  return result.success ? { success: true as const } : { success: false as const, error: result.error };
}

export async function assignCatalogueReviewerAction(role: RoleName, slugs: string[], reviewer: string, expectedVersions: Record<string, number>) {
  const result = CatalogueRolloutService.assignReviewer({
    slugs,
    reviewer,
    reviewerRole: 'CATALOG_MANAGER',
    actor: 'catalogue.manager@fusionbars.eu',
    actorRole: role,
    expectedVersions,
  });
  return result.success ? { success: true as const } : { success: false as const, error: result.error };
}

export async function getAdminPromotionsAction(role: RoleName) {
  if (!AdminAccess.can(role, 'promotions')) return denied(role, 'promotions');
  const coupons = await CommerceRepository.listCoupons();
  return {
    success: true as const,
    coupons: coupons.map((coupon) => ({
      code: coupon.code,
      discount: coupon.discount,
      isPercent: coupon.isPercent,
      active: coupon.isActive,
      expiresAt: coupon.expiresAt || '',
      maxUses: coupon.maxUses ?? null,
      usedCount: coupon.usedCount,
    })),
  };
}
