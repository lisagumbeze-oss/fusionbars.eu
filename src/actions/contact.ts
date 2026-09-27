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
    const rateKey = validated.email.trim().toLowerCase();
    const rateCheck = RateLimiterService.consume('newsletter_contact', rateKey);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many contact submissions. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      };
    }

    const result = await EmailService.sendContactInquiryEmails({
      name: validated.name.trim(),
      email: validated.email.trim().toLowerCase(),
      subjectCategory: validated.subjectCategory,
      message: validated.message.trim(),
      locale: validated.locale,
    });

    if (!result.customer.success || !result.ops.success) {
      return {
        success: false,
        error: 'The message could not be delivered. Please try again, or email sales@fusionbars.eu directly.',
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
    const rateCheck = RateLimiterService.consume('newsletter_contact', email);
    if (!rateCheck.allowed) {
      return {
        success: false,
        error: `Too many subscription attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
      };
    }

    PrivacyService.recordConsent({
      email,
      consentType: 'newsletter',
      granted: true,
    });

    const result = await EmailService.sendNewsletterConfirmation(email, validated.locale);
    if (!result.subscriber.success || !result.ops.success) {
      return {
        success: false,
        error: 'The subscription could not be delivered. Please try again, or email sales@fusionbars.eu directly.',
      };
    }

    return { success: true, message: 'Subscription confirmed. A confirmation was sent to you and to the support desk.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Newsletter subscription failed.' };
  }
}
