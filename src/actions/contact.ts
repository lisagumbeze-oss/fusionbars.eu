'use server';

import { z } from 'zod';
import { RateLimiterService } from '@/lib/rate-limiter';
import { PrivacyService } from '@/domain/privacy/PrivacyService';
import { EmailService } from '@/services/email/EmailService';
import { localeSchema } from '@/validation/schemas';

const contactInquirySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  subjectCategory: z.string().min(1).max(120),
  message: z.string().min(10).max(5000),
  locale: localeSchema.default('en'),
});

const newsletterSchema = z.object({
  email: z.string().email(),
  locale: localeSchema.default('en'),
});

export async function submitContactInquiryAction(rawInput: unknown) {
  try {
    const validated = contactInquirySchema.parse(rawInput);
    const rateCheck = await RateLimiterService.enforce('newsletter_contact', validated.email);
    if (!rateCheck.allowed) return { success: false, error: rateCheck.error };

    const result = await EmailService.sendContactInquiryEmails({
      name: validated.name.trim(),
      email: validated.email.trim().toLowerCase(),
      subjectCategory: validated.subjectCategory,
      message: validated.message.trim(),
      locale: validated.locale,
    });

    if (!result.customer.success || !result.ops.success) {
      const unconfigured = result.customer.error === 'Production email is not configured.' || result.ops.error === 'Production email is not configured.';
      return {
        success: false,
        error: unconfigured
          ? 'The message was not sent. Production email is not configured. You can email sales@fusionbars.eu directly.'
          : 'The message was not delivered. You can email sales@fusionbars.eu directly.',
      };
    }

    return { success: true, message: 'Inquiry received. A confirmation was sent to you and to the support desk.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Contact submission failed.' };
  }
}

export async function subscribeNewsletterAction(rawInput: unknown) {
  try {
    const validated = newsletterSchema.parse(rawInput);
    const email = validated.email.trim().toLowerCase();
    const rateCheck = await RateLimiterService.enforce('newsletter_contact', email);
    if (!rateCheck.allowed) return { success: false, error: rateCheck.error };

    const result = await EmailService.sendNewsletterConfirmation(email, validated.locale);
    if (!result.subscriber.success || !result.ops.success) {
      const unconfigured = result.subscriber.error === 'Production email is not configured.' || result.ops.error === 'Production email is not configured.';
      return {
        success: false,
        error: unconfigured
          ? 'Newsletter delivery is not configured. This did not confirm a marketing subscription email.'
          : 'The subscription could not be delivered. Please try again, or email sales@fusionbars.eu directly.',
      };
    }

    PrivacyService.recordConsent({
      email,
      consentType: 'newsletter',
      granted: true,
    });

    return { success: true, message: 'Subscription confirmed. A confirmation was sent to you and to the support desk.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Newsletter subscription failed.' };
  }
}
