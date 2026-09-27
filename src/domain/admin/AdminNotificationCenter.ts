export type NotificationCategory = 'Orders' | 'Payments' | 'Catalogue' | 'Compliance' | 'Inventory' | 'System' | 'Security';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface AdminNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  severity: NotificationSeverity;
  timestamp: string;
  entityType: string;
  entityId: string;
  href: string;
}

export interface NotificationSource {
  generatedAt: string;
  locale?: string;
  specialistPending: number;
  countryPending: number;
  compliancePending: number;
  translationPending: number;
  paymentsAwaiting: number;
  lowStock: number;
  productionPaused: boolean;
}

const SEVERITY_RANK: Record<NotificationSeverity, number> = { critical: 0, warning: 1, info: 2 };

export class AdminNotificationCenter {
  private static readIds = new Set<string>();

  static build(source: NotificationSource): AdminNotification[] {
    const locale = source.locale || 'en';
    const items: AdminNotification[] = [];
    if (source.paymentsAwaiting > 0) {
      items.push({
        id: 'payments-awaiting-verification',
        category: 'Payments',
        title: `${source.paymentsAwaiting} payment${source.paymentsAwaiting === 1 ? '' : 's'} require verification`,
        severity: 'critical',
        timestamp: source.generatedAt,
        entityType: 'Payment',
        entityId: 'PAYMENT_SUBMITTED',
        href: `/${locale}/admin/payments?status=PAYMENT_SUBMITTED`,
      });
    }
    if (source.specialistPending > 0) {
      items.push({
        id: 'catalogue-specialist-pending',
        category: 'Catalogue',
        title: `${source.specialistPending} product${source.specialistPending === 1 ? '' : 's'} require specialist review`,
        severity: 'warning',
        timestamp: source.generatedAt,
        entityType: 'Catalogue',
        entityId: 'SPECIALIST_REVIEW',
        href: `/${locale}/admin/catalogue/review-workspace/specialist-review`,
      });
    }
    if (source.countryPending > 0) {
      items.push({
        id: 'country-decisions-pending',
        category: 'Compliance',
        title: `${source.countryPending} product${source.countryPending === 1 ? '' : 's'} have unresolved country decisions`,
        severity: 'warning',
        timestamp: source.generatedAt,
        entityType: 'CountryEligibility',
        entityId: 'NOT_CONFIGURED',
        href: `/${locale}/admin/compliance/countries`,
      });
    }
    if (source.compliancePending > 0) {
      items.push({
        id: 'compliance-reviews-pending',
        category: 'Compliance',
        title: `${source.compliancePending} product${source.compliancePending === 1 ? '' : 's'} have compliance reviews pending`,
        severity: 'warning',
        timestamp: source.generatedAt,
        entityType: 'Compliance',
        entityId: 'REQUIRES_REVIEW',
        href: `/${locale}/admin/compliance`,
      });
    }
    if (source.translationPending > 0) {
      items.push({
        id: 'translation-reviews-pending',
        category: 'Catalogue',
        title: `${source.translationPending} product${source.translationPending === 1 ? '' : 's'} have translations pending`,
        severity: 'info',
        timestamp: source.generatedAt,
        entityType: 'Translation',
        entityId: 'PENDING',
        href: `/${locale}/admin/catalogue/translations`,
      });
    }
    if (source.lowStock > 0) {
      items.push({
        id: 'inventory-low-stock',
        category: 'Inventory',
        title: `${source.lowStock} low-stock product${source.lowStock === 1 ? '' : 's'} require attention`,
        severity: 'warning',
        timestamp: source.generatedAt,
        entityType: 'Inventory',
        entityId: 'LOW_STOCK',
        href: `/${locale}/admin/inventory`,
      });
    }
    if (source.productionPaused) {
      items.push({
        id: 'system-production-paused',
        category: 'System',
        title: 'Production remains PAUSED',
        severity: 'warning',
        timestamp: source.generatedAt,
        entityType: 'LaunchControl',
        entityId: 'PAUSED',
        href: `/${locale}/admin/system/launch`,
      });
    }
    return items.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  }

  static isRead(id: string): boolean {
    return this.readIds.has(id);
  }

  static markRead(id: string): void {
    this.readIds.add(id);
  }

  static markAllRead(ids: string[]): void {
    ids.forEach((id) => this.readIds.add(id));
  }

  static resetReads(): void {
    this.readIds.clear();
  }
}
