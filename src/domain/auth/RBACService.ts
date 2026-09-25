// ===================================================
// FUSION MUSHROOM BARS EU - ROLE-BASED ACCESS CONTROL
// Multi-Tiered Permission Verification
// ===================================================

import { RoleName } from '@/types';

export class RBACService {
  private static readonly ROLE_PERMISSIONS: Record<RoleName, string[]> = {
    SUPER_ADMIN: ['*'], // Wildcard: full governance
    CATALOG_MANAGER: [
      'catalog:read',
      'catalog:write',
      'catalog:publish',
      'catalog:restrictions',
      'content:write',
    ],
    ORDER_MANAGER: [
      'catalog:read',
      'orders:read',
      'orders:write',
      'orders:dispatch',
      'inventory:read',
    ],
    FINANCE_MANAGER: [
      'orders:read',
      'orders:verify_payment',
      'finance:read',
      'finance:write',
      'payments:manage',
    ],
    CONTENT_MANAGER: [
      'content:write',
      'content:publish',
      'catalog:read',
    ],
    CUSTOMER: [
      'customer:profile',
      'customer:orders_read',
      'customer:proof_submit',
    ],
    SYSTEM: ['*'],
  };

  /**
   * Evaluates if a role has the required action permission.
   */
  static hasPermission(role: RoleName, requiredAction: string): boolean {
    const permissions = this.ROLE_PERMISSIONS[role] || [];
    if (permissions.includes('*')) return true;
    return permissions.includes(requiredAction);
  }

  /**
   * Asserts permission, throwing an unauthorized error if check fails.
   */
  static assertPermission(role: RoleName, requiredAction: string): void {
    if (!this.hasPermission(role, requiredAction)) {
      throw new Error(`Forbidden: Role "${role}" lacks required permission "${requiredAction}".`);
    }
  }

  /**
   * Validates if a role has administrative clearance.
   */
  static isAdminRole(role: RoleName): boolean {
    return role !== 'CUSTOMER';
  }
}
