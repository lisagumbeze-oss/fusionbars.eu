'use server';

// ==============================================================================
// FUSION MUSHROOM BARS EU - LAUNCH READINESS SERVER ACTIONS
// Restricted to SUPER_ADMIN Role with Full Audit Logging
// ==============================================================================

import { cookies } from 'next/headers';
import { AuthService } from '@/domain/auth/AuthService';
import { ADMIN_SESSION_COOKIE } from '@/domain/auth/AdminAuthService';
import { RBACService } from '@/domain/auth/RBACService';
import { LaunchReadinessService, LaunchReadinessReport } from '@/domain/launch/LaunchReadinessService';
import { PaymentActivationService, PaymentMethodActivationStage } from '@/domain/payments/PaymentActivationService';
import { EmailService } from '@/services/email/EmailService';
import { EmailProductionReadinessService } from '@/services/email/EmailProductionReadinessService';
import { EmailDeliveryLedger } from '@/services/email/EmailDeliveryLedger';
import { EmailDnsVerificationService } from '@/services/email/EmailDnsVerificationService';
import { EmailTemplates } from '@/emails/templates';
import { ObjectStorageService } from '@/services/storage/ObjectStorageService';
import { StorageReadinessService } from '@/services/storage/StorageReadinessService';
import { BackupReadinessService } from '@/domain/infrastructure/BackupReadinessService';
import { ProductionMonitoringService } from '@/domain/infrastructure/ProductionMonitoringService';
import { RateLimitReadinessService } from '@/domain/infrastructure/RateLimitReadinessService';
import { DistributedRedisRateLimitStore } from '@/lib/rate-limiter';
import { CommerceRepository } from '@/lib/commerce-repository';
import { ObservabilityService } from '@/lib/observability';
import { EnvironmentService } from '@/config/environment';

/**
 * Validates that the active session caller has SUPER_ADMIN role.
 */
async function assertSuperAdminCaller() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
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
  templateId?: string;
  confirmation?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const admin = await assertSuperAdminCaller();
    const { recipientEmail, templateId, confirmation } = input;

    if (confirmation !== 'SEND_TEST_EMAIL') {
      return { success: false, error: 'Explicit test email confirmation is required.' };
    }
    if (!templateId?.trim()) {
      return { success: false, error: 'A template must be selected.' };
    }
    if (!recipientEmail || !recipientEmail.includes('@') || /[\r\n,]/.test(recipientEmail)) {
      return { success: false, error: 'A valid recipient email address is required.' };
    }

    const result = await EmailService.sendTestProbe({
      recipientEmail,
      initiatedBy: admin.email,
      templateName: templateId,
    });
    const provider = EmailService.getProvider();
    const providerStatus = result.success && result.messageId && provider.name !== 'mock'
      ? (await provider.getDeliveryStatus(result.messageId)).status
      : 'UNKNOWN';
    const delivery = providerStatus === 'DELIVERED' || providerStatus === 'FAILED' || providerStatus === 'BOUNCED'
      ? providerStatus
      : 'UNKNOWN';
    if (result.eventId) {
      EmailDeliveryLedger.claim(result.eventId, { template: templateId, recipient: recipientEmail, provider: provider.name });
      EmailDeliveryLedger.complete(result.eventId, result);
      if (delivery === 'DELIVERED' || delivery === 'FAILED' || delivery === 'BOUNCED') {
        EmailDeliveryLedger.applyProviderStatus(result.eventId, delivery);
      }
    }
    EmailProductionReadinessService.recordControlledTest({
      actor: admin.email,
      eventId: result.eventId || 'unassigned',
      handoff: result.success ? 'SENT' : 'FAILED',
      delivery: result.success ? delivery : 'FAILED',
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
      message: `Provider accepted the test message via ${provider.name}. Handoff is SENT. Delivery status is ${delivery}. Message ${result.messageId || 'unassigned'}.`,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Test email action failed.' };
  }
}

export async function refreshEmailDnsAction(): Promise<{ success: boolean; error?: string }> {
  try {
    await assertSuperAdminCaller();
    const observation = await EmailDnsVerificationService.inspect();
    EmailProductionReadinessService.applyObservation(observation);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Email DNS check failed.' };
  }
}

export async function activateProductionEmailAction(input: { confirmation?: string; rationale?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await assertSuperAdminCaller();
    const observation = await EmailDnsVerificationService.inspect();
    EmailProductionReadinessService.applyObservation(observation);
    const result = EmailProductionReadinessService.activate({
      role: 'SUPER_ADMIN',
      actor: admin.email,
      confirmation: input.confirmation || '',
      rationale: input.rationale || '',
    });
    if (result.success === false) return { success: false, error: result.error };
    CommerceRepository.logAudit({
      action: 'PRODUCTION_EMAIL_ACTIVATED',
      entityType: 'Email',
      entityId: 'production-email',
      actorRole: 'SUPER_ADMIN',
      actorId: admin.id,
      metadata: JSON.stringify({ state: result.state }),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Email activation failed.' };
  }
}

export async function disableProductionEmailAction(input: { rationale?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await assertSuperAdminCaller();
    EmailProductionReadinessService.disable({ role: 'SUPER_ADMIN', actor: admin.email, rationale: input.rationale || 'Disable production email' });
    CommerceRepository.logAudit({
      action: 'PRODUCTION_EMAIL_DISABLED',
      entityType: 'Email',
      entityId: 'production-email',
      actorRole: 'SUPER_ADMIN',
      actorId: admin.id,
      metadata: JSON.stringify({ state: 'DISABLED' }),
    });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Email disable failed.' };
  }
}

/**
 * Performs a safe, non-destructive probe of private object storage.
 */
export async function getStorageReadinessAction() {
  try {
    await assertSuperAdminCaller();
    const report = StorageReadinessService.report();
    return {
      success: true as const,
      provider: report.provider,
      state: report.state,
      privateStorage: report.privateStorage,
      publicMedia: report.publicMedia,
      lastTest: report.lastTest,
      retention: report.retention,
      errors: report.blockers,
    };
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Storage status is unavailable.' };
  }
}

export async function getBackupReadinessAction() {
  try {
    await assertSuperAdminCaller();
    const report = BackupReadinessService.report();
    return {
      success: true as const,
      provider: report.provider,
      providerVariable: report.providerVariable,
      state: report.state,
      backupEnabled: report.backupEnabled,
      restore: report.restore,
      retention: report.retention,
      lastBackupAt: report.lastBackupAt,
      error: report.error,
    };
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Backup status is unavailable.' };
  }
}

export async function getMonitoringReadinessAction() {
  try {
    await assertSuperAdminCaller();
    const report = ProductionMonitoringService.report();
    return {
      success: true as const,
      provider: report.provider,
      state: report.state,
      alerting: report.alerting,
      testSignal: report.testSignal,
      lastSuccessAt: report.lastSuccessAt,
      lastFailureAt: report.lastFailureAt,
      error: report.error,
    };
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Monitoring status is unavailable.' };
  }
}

export async function sendMonitoringTestSignalAction(confirmation: string) {
  try {
    const admin = await assertSuperAdminCaller();
    if (confirmation !== 'SEND_MONITORING_TEST') return { success: false as const, error: 'Explicit confirmation is required.' };
    const current = ProductionMonitoringService.report();
    if (current.state === 'NOT_CONFIGURED') {
      CommerceRepository.logAudit({ action: 'MONITORING_CONFIGURATION_UPDATED', entityType: 'System', entityId: 'monitoring', actorRole: 'SUPER_ADMIN', actorId: admin.id, metadata: JSON.stringify({ result: 'NOT_CONFIGURED', environment: current.provider }) });
      return { success: false as const, state: current.state, error: 'Monitoring is NOT_CONFIGURED.' };
    }
    const result = await ProductionMonitoringService.sendTestSignal('SUPER_ADMIN', async (payload) => {
      const destination = (process.env.MONITORING_WEBHOOK_URL || process.env.MONITORING_DSN || process.env.SENTRY_DSN || '').trim();
      if (!destination.startsWith('https://')) return false;
      const response = await fetch(destination, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      return response.ok;
    });
    CommerceRepository.logAudit({ action: 'MONITORING_CONFIGURATION_UPDATED', entityType: 'System', entityId: 'monitoring', actorRole: 'SUPER_ADMIN', actorId: admin.id, metadata: JSON.stringify({ result: result.state, event: 'FUSION_MONITORING_TEST' }) });
    return { success: result.state === 'OPERATIONAL', state: result.state, error: result.error };
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Monitoring test failed.' };
  }
}

export async function getRateLimitReadinessAction() {
  try {
    await assertSuperAdminCaller();
    const report = RateLimitReadinessService.report();
    return {
      success: true as const,
      provider: report.provider,
      state: report.state,
      mode: report.mode,
      connectivity: report.connectivity,
      sharedEnforcement: report.sharedEnforcement,
      lastFailureAt: report.lastFailureAt,
      error: report.error,
    };
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Rate limit status is unavailable.' };
  }
}

export async function testRateLimitConnectivityAction(confirmation: string) {
  try {
    const admin = await assertSuperAdminCaller();
    if (confirmation !== 'TEST_RATE_LIMIT') return { success: false as const, error: 'Explicit confirmation is required.' };
    const current = RateLimitReadinessService.report();
    if (current.url !== 'CONFIGURED' || current.token !== 'CONFIGURED') {
      CommerceRepository.logAudit({ action: 'RATE_LIMIT_CONFIGURATION_UPDATED', entityType: 'System', entityId: 'rate_limit', actorRole: 'SUPER_ADMIN', actorId: admin.id, metadata: JSON.stringify({ result: current.state }) });
      return { success: false as const, state: current.state, error: `Rate limiting is ${current.state}.` };
    }
    const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
    const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
    try {
      const ping = await fetch(`${url}/ping`, { headers: { Authorization: `Bearer ${token}` } });
      if (!ping.ok) throw new Error('REDIS_UNAVAILABLE');
      const instanceA = new DistributedRedisRateLimitStore(url, token);
      const instanceB = new DistributedRedisRateLimitStore(url, token);
      const key = `fusion-rate-limit-test-${Date.now().toString(36)}`;
      const first = await instanceA.consume(key, 2, 60);
      const second = await instanceB.consume(key, 2, 60);
      const third = await instanceB.consume(key, 2, 60);
      await instanceA.reset(key);
      if (!first.allowed || !second.allowed || third.allowed) {
        RateLimitReadinessService.noteProbe('PASS', 'FAIL');
        CommerceRepository.logAudit({ action: 'RATE_LIMIT_CONFIGURATION_UPDATED', entityType: 'System', entityId: 'rate_limit', actorRole: 'SUPER_ADMIN', actorId: admin.id, metadata: JSON.stringify({ result: 'FAILED' }) });
        return { success: false as const, state: 'FAILED' as const, error: 'SHARED_ENFORCEMENT_FAILED' };
      }
      RateLimitReadinessService.noteProbe('PASS', 'PASS');
      CommerceRepository.logAudit({ action: 'RATE_LIMIT_CONFIGURATION_UPDATED', entityType: 'System', entityId: 'rate_limit', actorRole: 'SUPER_ADMIN', actorId: admin.id, metadata: JSON.stringify({ result: 'OPERATIONAL' }) });
      return { success: true as const, state: 'OPERATIONAL' as const };
    } catch {
      RateLimitReadinessService.noteProbe('FAIL', 'FAIL');
      CommerceRepository.logAudit({ action: 'RATE_LIMIT_CONFIGURATION_UPDATED', entityType: 'System', entityId: 'rate_limit', actorRole: 'SUPER_ADMIN', actorId: admin.id, metadata: JSON.stringify({ result: 'FAILED' }) });
      return { success: false as const, state: 'FAILED' as const, error: 'RATE_LIMIT_BACKEND_UNAVAILABLE' };
    }
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Rate limit test failed.' };
  }
}

export async function testStorageConnectivityAction(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    await assertSuperAdminCaller();
    const readiness = StorageReadinessService.report();
    if (readiness.state !== 'ACTIVE') {
      return { success: false, error: `Storage state is ${readiness.state}. The mock provider is not production storage.` };
    }
    const probe = await ObjectStorageService.runConnectivityProbe();
    if (probe !== 'PASS') return { success: false, error: 'Storage write, read, or cleanup probe failed.' };
    return { success: true, message: 'Production storage write, read, authorization, and cleanup probe passed.' };
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

export async function getFinalLaunchDecisionAction() {
  try {
    await assertSuperAdminCaller();
    const { FinalLaunchReadinessService } = await import('@/domain/launch/FinalLaunchReadinessService');
    const decision = await FinalLaunchReadinessService.evaluate();
    return { success: true as const, decision };
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Unauthorized.' };
  }
}

export async function activateProductionAction(confirmation: string) {
  try {
    const caller = await assertSuperAdminCaller();
    const { FinalLaunchReadinessService } = await import('@/domain/launch/FinalLaunchReadinessService');
    const result = await FinalLaunchReadinessService.activate({
      role: 'SUPER_ADMIN',
      actor: caller.id,
      confirmation,
      reauthenticated: true,
    });
    return { success: result.state === 'PRODUCTION_ACTIVE', ...result };
  } catch (e: any) {
    return { success: false as const, error: e.message || 'Unauthorized.', state: 'PAUSED' as const };
  }
}
