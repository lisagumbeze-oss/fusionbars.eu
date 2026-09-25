'use server';

// ==============================================================================
// FUSION MUSHROOM BARS EU - LAUNCH READINESS SERVER ACTIONS
// Restricted to SUPER_ADMIN Role with Full Audit Logging
// ==============================================================================

import { cookies } from 'next/headers';
import { AuthService } from '@/domain/auth/AuthService';
import { RBACService } from '@/domain/auth/RBACService';
import { LaunchReadinessService, LaunchReadinessReport } from '@/domain/launch/LaunchReadinessService';
import { PaymentActivationService, PaymentMethodActivationStage } from '@/domain/payments/PaymentActivationService';
import { EmailService } from '@/services/email/EmailService';
import { EmailTemplates } from '@/emails/templates';
import { ObjectStorageService } from '@/services/storage/ObjectStorageService';
import { CommerceRepository } from '@/lib/commerce-repository';
import { ObservabilityService } from '@/lib/observability';
import { EnvironmentService } from '@/config/environment';

/**
 * Validates that the active session caller has SUPER_ADMIN role.
 */
async function assertSuperAdminCaller() {
  const cookieStore = await cookies();
  const token = cookieStore.get('fb_session')?.value;
  if (!token) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const user = AuthService.verifySessionToken(token);
  if (!user) {
    throw new Error('Unauthorized: Invalid or expired session.');
  }

  if (user.role !== 'SUPER_ADMIN') {
    CommerceRepository.logAudit({
      action: 'UNAUTHORIZED_LAUNCH_CENTER_ACCESS',
      entityType: 'System',
      entityId: 'launch_center',
      actorRole: user.role,
      actorId: user.id,
    });
    throw new Error('Forbidden: Only SUPER_ADMIN can access the Launch Control Center.');
  }

  return user;
}

/**
 * Retrieves the comprehensive launch readiness report.
 */
export async function getLaunchReadinessReportAction(): Promise<{
  success: boolean;
  report?: LaunchReadinessReport;
  error?: string;
}> {
  try {
    await assertSuperAdminCaller();
    const report = await LaunchReadinessService.evaluateReadiness();
    return { success: true, report };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to evaluate launch readiness.' };
  }
}

/**
 * Dispatches a single test email to a recipient specified by SUPER_ADMIN.
 * NEVER runs automatically during background or health check queries.
 */
export async function sendTestEmailAction(input: {
  recipientEmail: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const admin = await assertSuperAdminCaller();
    const { recipientEmail } = input;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return { success: false, error: 'A valid recipient email address is required.' };
    }

    const provider = EmailService.getProvider();
    const result = await provider.sendEmail({
      to: recipientEmail,
      subject: '[TEST] Fusion Mushroom Bars EU - Email Infrastructure Probe',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2 style="color: #4A5D4E;">Transactional Email Test Verified</h2>
          <p>This is a controlled verification message initiated by SUPER_ADMIN (${admin.email}).</p>
          <p>Provider: <strong>${provider.name}</strong></p>
          <p>Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
      text: `Fusion Mushroom Bars EU - Email Infrastructure Probe initiated by ${admin.email} at ${new Date().toISOString()}`,
    });

    CommerceRepository.logAudit({
      action: 'TEST_EMAIL_DISPATCHED',
      entityType: 'Email',
      entityId: recipientEmail,
      actorRole: 'SUPER_ADMIN',
      actorId: admin.id,
      metadata: JSON.stringify({ success: result.success, messageId: result.messageId, provider: provider.name }),
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to send test email.' };
    }

    return {
      success: true,
      message: `Test email dispatched successfully via ${provider.name} (ID: ${result.messageId}).`,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Test email action failed.' };
  }
}

/**
 * Performs a safe, non-destructive probe of private object storage.
 */
export async function testStorageConnectivityAction(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const admin = await assertSuperAdminCaller();
    const probeBuffer = Buffer.from('%PDF-1.4\n%probe-test\n%%EOF');
    const orderNumber = `FB-EU-PROBE-${Date.now()}`;

    const res = await ObjectStorageService.uploadPaymentProof({
      buffer: probeBuffer,
      filename: 'storage_probe.pdf',
      mimeType: 'application/pdf',
      orderNumber,
      uploadedByEmail: admin.email,
    });

    if (!res.success || !res.storageKey) {
      return { success: false, error: res.error || 'Storage write probe failed.' };
    }

    // Verify authorized retrieval
    const authRes = await ObjectStorageService.getAuthorizedDownloadUrl({
      storageKey: res.storageKey,
      requester: { role: 'SUPER_ADMIN' },
    });

    if (!authRes.allowed) {
      return { success: false, error: 'Storage read authorization gate failed.' };
    }

    return {
      success: true,
      message: `Object storage write and presigned download URL verified successfully (Key: ${res.storageKey}).`,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Storage connectivity probe failed.' };
  }
}

/**
 * Promotes payment method activation stage: CONFIGURED -> APPROVED -> ACTIVE.
 */
export async function updatePaymentMethodStageAction(input: {
  code: string;
  newStage: PaymentMethodActivationStage;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await assertSuperAdminCaller();
    const res = await PaymentActivationService.updateMethodStage({
      code: input.code,
      newStage: input.newStage,
      actor: { id: admin.id, role: admin.role },
      reason: input.reason,
    });

    return res;
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update payment method activation stage.' };
  }
}

/**
 * Retrieves current payment method activation states.
 */
export async function getPaymentMethodStatesAction(): Promise<{
  success: boolean;
  states?: ReturnType<typeof PaymentActivationService.getActivationStates>;
  error?: string;
}> {
  try {
    await assertSuperAdminCaller();
    const states = PaymentActivationService.getActivationStates();
    return { success: true, states };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to load payment activation states.' };
  }
}

/**
 * Updates publishing status of legal documents.
 */
export async function updateLegalDocumentStatusAction(input: {
  slug: string;
  status: 'MISSING' | 'DRAFT' | 'PUBLISHED';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await assertSuperAdminCaller();
    LaunchReadinessService.setLegalStatus(input.slug, input.status);

    CommerceRepository.logAudit({
      action: 'LEGAL_DOCUMENT_STATUS_UPDATED',
      entityType: 'LegalDocument',
      entityId: input.slug,
      actorRole: 'SUPER_ADMIN',
      actorId: admin.id,
      metadata: JSON.stringify({ slug: input.slug, status: input.status }),
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update legal document status.' };
  }
}

/**
 * Generates an in-memory preview of transactional email templates without sending.
 */
export async function getTransactionalEmailPreviewAction(input: {
  templateKey: string;
  locale?: string;
}): Promise<{
  success: boolean;
  subject?: string;
  html?: string;
  text?: string;
  error?: string;
}> {
  try {
    await assertSuperAdminCaller();
    const { templateKey } = input;

    const sampleOrderContext: any = {
      customerName: 'Marcus Aurelius',
      orderNumber: 'FB-EU-2026-10024',
      totalAmount: 18000,
      currency: 'EUR',
      items: [
        { name: 'Fusion Belgian Chocolate Bar (Matcha Green Tea)', quantity: 2, price: 9000 },
      ],
      supportEmail: 'sales@fusionbars.eu',
      orderStatusUrl: 'https://fusionbars.eu/en/orders/lookup?orderNumber=FB-EU-2026-10024',
    };

    let rendered: { subject: string; text: string; html: string };

    switch (templateKey) {
      case 'sepa_confirmation':
        rendered = EmailTemplates.renderSepaOrderConfirmation({
          ...sampleOrderContext,
          iban: 'NL91ABNA0417164300',
          bic: 'ABNANL2A',
          bankName: 'ABN AMRO Bank N.V.',
          accountHolder: 'Fusion European Logistics B.V.',
        });
        break;

      case 'crypto_confirmation':
        rendered = EmailTemplates.renderCryptoOrderConfirmation({
          ...sampleOrderContext,
          cryptoName: 'Bitcoin',
          network: 'Bitcoin Mainnet',
          receivingAddress: 'bc1q_placeholder_btc_test_only',
        });
        break;

      case 'payment_submitted':
        rendered = EmailTemplates.renderPaymentProofSubmittedNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          referenceOrTxid: 'TX-9482-EUR-BANK-WIRE',
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'payment_verified':
        rendered = EmailTemplates.renderPaymentVerifiedNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'payment_rejected':
        rendered = EmailTemplates.renderPaymentRejectedNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          reason: 'Transfer reference memo did not match invoice number',
          orderStatusUrl: sampleOrderContext.orderStatusUrl,
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'order_processing':
        rendered = EmailTemplates.renderOrderProcessingNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          orderStatusUrl: sampleOrderContext.orderStatusUrl,
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'order_shipped':
        rendered = EmailTemplates.renderOrderShippedNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          trackingNumber: 'EU-9281-PRIORITY',
          carrierName: 'European Express Logistics',
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'order_delivered':
        rendered = EmailTemplates.renderOrderDeliveredNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'order_cancelled':
        rendered = EmailTemplates.renderOrderCancelledNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          reason: 'Payment window expired (7 calendar days)',
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'order_refunded':
        rendered = EmailTemplates.renderOrderRefundedNotice({
          customerName: sampleOrderContext.customerName,
          orderNumber: sampleOrderContext.orderNumber,
          refundAmountFormatted: '€180.00',
          reason: 'Mutual consignment cancellation',
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'welcome':
        rendered = EmailTemplates.renderCustomerWelcomeNotice({
          customerName: sampleOrderContext.customerName,
          accountUrl: 'https://fusionbars.eu/en/account',
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'verification':
        rendered = EmailTemplates.renderEmailVerificationEmail({
          customerName: sampleOrderContext.customerName,
          verifyUrl: 'https://fusionbars.eu/en/account?token=tok_verify_example',
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      case 'password_reset':
        rendered = EmailTemplates.renderPasswordResetEmail({
          customerName: sampleOrderContext.customerName,
          resetUrl: 'https://fusionbars.eu/en/account?token=tok_reset_example',
          supportEmail: 'sales@fusionbars.eu',
        });
        break;

      default:
        return { success: false, error: `Unknown template key "${templateKey}".` };
    }

    return {
      success: true,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to generate email preview.' };
  }
}
