'use server';

import { cookies } from 'next/headers';
import { AuthService } from '../domain/auth/AuthService';
import { ConsentType, PrivacyService } from '../domain/privacy/PrivacyService';

/**
 * Server Action: Records customer privacy / cookie consent choices with timestamp.
 */
export async function recordConsentAction(input: {
  email: string;
  consentType: ConsentType;
  granted: boolean;
}) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('fb_session')?.value;
    let customerId: string | null = null;

    if (sessionToken) {
      const session = AuthService.verifySessionToken(sessionToken);
      if (session) customerId = session.id;
    }

    const record = PrivacyService.recordConsent({
      customerId,
      email: input.email,
      consentType: input.consentType,
      granted: input.granted,
    });

    return { success: true, record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Exports all customer data (GDPR Right of Access).
 * Authenticated customer only.
 */
export async function exportCustomerDataAction() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('fb_session')?.value;
    if (!sessionToken) {
      return { success: false, error: 'Authentication required to export account data.' };
    }

    const session = AuthService.verifySessionToken(sessionToken);
    if (!session) {
      return { success: false, error: 'Invalid or expired session.' };
    }

    const exportData = await PrivacyService.exportCustomerData(session.id, session.email);
    return { success: true, exportData };
  } catch (error: any) {
    return { success: false, error: error.message || 'Export failed' };
  }
}

/**
 * Server Action: Deletes customer account and anonymizes PII (GDPR Right to Erasure).
 * Authenticated customer only.
 */
export async function deleteCustomerAccountAction() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('fb_session')?.value;
    if (!sessionToken) {
      return { success: false, error: 'Authentication required to delete account.' };
    }

    const session = AuthService.verifySessionToken(sessionToken);
    if (!session) {
      return { success: false, error: 'Invalid or expired session.' };
    }

    const result = await PrivacyService.deleteCustomerAccount(session.id, session.email);

    // Destroy session cookie
    cookieStore.delete('fb_session');

    return {
      success: true,
      message: 'Your account and personal data have been deleted. Order history has been anonymized.',
      anonymizedOrdersCount: result.anonymizedOrdersCount,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Deletion failed' };
  }
}
