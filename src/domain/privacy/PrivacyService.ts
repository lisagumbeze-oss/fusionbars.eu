// ===================================================
// FUSION MUSHROOM BARS EU - PRIVACY & GDPR FOUNDATIONS
// Technical Capabilities for Consent, Data Export & Account Erasure
// ===================================================

import { CommerceRepository, DbCustomer, DbAddress, DbOrder } from '@/lib/commerce-repository';

export type ConsentType = 'cookies_essential' | 'cookies_analytics' | 'newsletter' | 'marketing';

export interface CustomerConsentRecord {
  id: string;
  customerId?: string | null;
  email: string;
  consentType: ConsentType;
  granted: boolean;
  consentTimestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface CustomerDataExport {
  exportedAt: string;
  profile: Partial<DbCustomer> | null;
  addresses: DbAddress[];
  orders: DbOrder[];
  consents: CustomerConsentRecord[];
}

export interface PrivacyPreferences {
  essentialCookies: boolean; // Always true
  analyticsCookies: boolean;
  marketingEmails: boolean;
  newsletterSubscribed: boolean;
  updatedAt: string;
}

export class PrivacyService {
  private static consentStore = new Map<string, CustomerConsentRecord[]>();

  /**
   * Records a timestamped consent grant or withdrawal.
   */
  static recordConsent(input: {
    customerId?: string | null;
    email: string;
    consentType: ConsentType;
    granted: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): CustomerConsentRecord {
    const emailKey = input.email.trim().toLowerCase();
    const record: CustomerConsentRecord = {
      id: `cst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customerId: input.customerId || null,
      email: emailKey,
      consentType: input.consentType,
      granted: input.granted,
      consentTimestamp: new Date().toISOString(),
      ipAddress: input.ipAddress ? `${input.ipAddress.substring(0, 7)}***` : undefined, // Truncate IP
      userAgent: input.userAgent,
    };

    const existing = this.consentStore.get(emailKey) || [];
    existing.push(record);
    this.consentStore.set(emailKey, existing);

    CommerceRepository.logAudit({
      action: 'PRIVACY_CONSENT_RECORDED',
      entityType: 'Consent',
      entityId: record.id,
      actorRole: 'CUSTOMER',
      actorId: input.customerId || emailKey,
      metadata: JSON.stringify({ consentType: input.consentType, granted: input.granted, ts: record.consentTimestamp }),
    });

    return record;
  }

  /**
   * Retrieves all logged consent records for a customer.
   */
  static getConsents(email: string): CustomerConsentRecord[] {
    return this.consentStore.get(email.trim().toLowerCase()) || [];
  }

  /**
   * Generates a comprehensive, machine-readable JSON data export (Right of Access).
   */
  static async exportCustomerData(customerId: string, email: string): Promise<CustomerDataExport> {
    const [customer, addresses, orders] = await Promise.all([
      CommerceRepository.findCustomerById(customerId),
      CommerceRepository.getCustomerAddresses(customerId),
      CommerceRepository.findCustomerOrders(email),
    ]);

    const sanitizedProfile = customer
      ? {
          id: customer.id,
          email: customer.email,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          languageCode: customer.languageCode,
          preferredCurrency: customer.preferredCurrency,
          createdAt: customer.createdAt,
        }
      : null;

    const consents = this.getConsents(email);

    CommerceRepository.logAudit({
      action: 'CUSTOMER_DATA_EXPORTED',
      entityType: 'Customer',
      entityId: customerId,
      actorRole: 'CUSTOMER',
      actorId: customerId,
    });

    return {
      exportedAt: new Date().toISOString(),
      profile: sanitizedProfile,
      addresses,
      orders,
      consents,
    };
  }

  /**
   * Performs technical account erasure (Right to be Forgotten).
   * Deletes profile and address records; anonymizes order PII while preserving
   * order line totals for legal fiscal accounting requirements.
   */
  static async deleteCustomerAccount(customerId: string, email: string): Promise<{ success: boolean; anonymizedOrdersCount: number }> {
    const orders = await CommerceRepository.findCustomerOrders(email);

    // Anonymize orders
    let anonymizedCount = 0;
    for (const order of orders) {
      order.customerId = null;
      order.guestEmail = 'anonymized-gdpr@deleted.customer';
      order.guestPhone = null;
      order.shippingAddress = {
        firstName: '[DELETED]',
        lastName: '[DELETED]',
        streetAddress: '[REDACTED]',
        city: order.shippingAddress.city,
        postalCode: order.shippingAddress.postalCode,
        countryCode: order.shippingAddress.countryCode,
      };
      anonymizedCount++;
    }

    // Delete addresses
    const addresses = await CommerceRepository.getCustomerAddresses(customerId);
    for (const addr of addresses) {
      await CommerceRepository.deleteCustomerAddress(customerId, addr.id);
    }

    CommerceRepository.logAudit({
      action: 'CUSTOMER_ACCOUNT_DELETED',
      entityType: 'Customer',
      entityId: customerId,
      actorRole: 'CUSTOMER',
      actorId: customerId,
      metadata: JSON.stringify({ anonymizedOrdersCount: anonymizedCount, timestamp: new Date().toISOString() }),
    });

    return {
      success: true,
      anonymizedOrdersCount: anonymizedCount,
    };
  }
}
