import { RBACService } from '@/domain/auth/RBACService';
import { RoleName } from '@/types';

export type AdminSection =
  | 'dashboard'
  | 'orders'
  | 'payments'
  | 'customers'
  | 'promotions'
  | 'inventory'
  | 'products'
  | 'catalogue-review'
  | 'specialist-review'
  | 'media-review'
  | 'translation-review'
  | 'compliance'
  | 'countries'
  | 'content-review'
  | 'audit'
  | 'notifications'
  | 'email-templates'
  | 'email-delivery'
  | 'sales-reports'
  | 'catalogue-reports'
  | 'ops-reports'
  | 'settings'
  | 'roles'
  | 'launch';

const ALL: AdminSection[] = [
  'dashboard', 'orders', 'payments', 'customers', 'promotions', 'inventory',
  'products', 'catalogue-review', 'specialist-review', 'media-review', 'translation-review',
  'compliance', 'countries', 'content-review', 'audit',
  'notifications', 'email-templates', 'email-delivery',
  'sales-reports', 'catalogue-reports', 'ops-reports',
  'settings', 'roles', 'launch',
];

const ROLE_SECTIONS: Record<RoleName, AdminSection[] | '*'> = {
  SUPER_ADMIN: '*',
  SYSTEM: '*',
  ORDER_MANAGER: ['dashboard', 'orders', 'customers', 'inventory', 'notifications', 'ops-reports'],
  FINANCE_MANAGER: ['dashboard', 'orders', 'payments', 'customers', 'notifications', 'sales-reports', 'email-delivery'],
  CATALOG_MANAGER: [
    'dashboard', 'products', 'catalogue-review', 'specialist-review', 'media-review',
    'inventory', 'notifications', 'catalogue-reports', 'audit',
  ],
  CONTENT_MANAGER: [
    'dashboard', 'products', 'content-review', 'translation-review', 'specialist-review',
    'email-templates', 'notifications', 'catalogue-reports',
  ],
  COMPLIANCE_MANAGER: [
    'dashboard', 'compliance', 'countries', 'specialist-review', 'audit', 'notifications', 'catalogue-reports',
  ],
  CUSTOMER: [],
};

export class AdminAccess {
  static sections(role: RoleName): AdminSection[] {
    const allowed = ROLE_SECTIONS[role];
    if (!allowed) return [];
    if (allowed === '*') return [...ALL];
    return allowed.filter((section) => this.serverAllows(role, section));
  }

  static can(role: RoleName, section: AdminSection): boolean {
    return this.sections(role).includes(section);
  }

  static canModifyTemplates(role: RoleName): boolean {
    return role === 'SUPER_ADMIN' || (role === 'CONTENT_MANAGER' && RBACService.hasPermission(role, 'content:write'));
  }

  static canVerifyPayments(role: RoleName): boolean {
    return RBACService.hasPermission(role, 'orders:verify_payment') || role === 'SUPER_ADMIN' || role === 'FINANCE_MANAGER';
  }

  /** Hide a nav item when the underlying permission is absent, even if a role list included it. */
  private static serverAllows(role: RoleName, section: AdminSection): boolean {
    if (role === 'SUPER_ADMIN' || role === 'SYSTEM') return true;
    if (section === 'orders' || section === 'customers' || section === 'sales-reports') {
      return RBACService.hasPermission(role, 'orders:read');
    }
    if (section === 'payments') return this.canVerifyPayments(role);
    if (section === 'inventory') {
      return RBACService.hasPermission(role, 'inventory:read') || RBACService.hasPermission(role, 'catalog:read');
    }
    if (section === 'email-templates') return RBACService.hasPermission(role, 'content:write');
    return true;
  }
}
