'use server';

import { AdminAccess, AdminSection } from '@/domain/admin/AdminAccess';
import { AdminDashboardService, PRODUCTION_CONTROL_STATE } from '@/domain/admin/AdminDashboardService';
import { AdminNotificationCenter } from '@/domain/admin/AdminNotificationCenter';
import { EmailTemplateRegistry } from '@/domain/admin/EmailTemplateRegistry';
import { deliveryLogExposesSecrets, projectDeliveryLog } from '@/domain/admin/EmailDeliveryLog';
import { getAllOrdersAdminAction } from '@/actions/orders';
import { getInventoryMatrixAction } from '@/actions/inventory';
import { CommerceRepository } from '@/lib/commerce-repository';
import { CatalogService } from '@/lib/catalog';
import { EmailService } from '@/services/email/EmailService';
import { LaunchReadinessService } from '@/domain/launch/LaunchReadinessService';
import { RBACService } from '@/domain/auth/RBACService';
import { RoleName } from '@/types';

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
  const sent = 'sentMessages' in provider && Array.isArray((provider as { sentMessages?: unknown[] }).sentMessages)
    ? (provider as { sentMessages: Array<Record<string, unknown>> }).sentMessages
    : [];
  const entries = projectDeliveryLog(sent, provider.name);
  if (deliveryLogExposesSecrets(entries)) return { success: false as const, error: 'Email delivery history is unavailable. Retry.' };
  return { success: true as const, provider: provider.name, entries };
}

export async function getAdminSettingsAction(role: RoleName) {
  if (!AdminAccess.can(role, 'settings')) return denied(role, 'settings');
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
  const orders = await getAllOrdersAdminAction(role);
  if (!orders.success || !orders.orders) return { success: false as const, error: orders.error || 'Customer directory is unavailable.' };
  return { success: true as const, customers: AdminDashboardService.customerDirectory(orders.orders) };
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
  return { success: true as const, product: view };
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
