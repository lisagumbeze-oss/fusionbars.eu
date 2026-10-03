'use server';

import { cookies } from 'next/headers';
import {
  customerAddressSchema,
  customerLoginSchema,
  customerProfileUpdateSchema,
  customerRegisterSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from '../validation/schemas';
import { CustomerAuthService } from '../domain/auth/CustomerAuthService';
import { AuthService } from '../domain/auth/AuthService';
import { CommerceRepository } from '../lib/commerce-repository';
import { RateLimiterService } from '@/lib/rate-limiter';

const SESSION_COOKIE_NAME = 'fb_session';

/**
 * Server Action: Registers a new customer account and establishes session.
 */
export async function registerCustomerAction(rawInput: unknown) {
  try {
    const validated = customerRegisterSchema.parse(rawInput);
    const limited = await RateLimiterService.enforce('registration', validated.email);
    if (!limited.allowed) return { success: false, error: limited.error };
    const result = await CustomerAuthService.register({
      email: validated.email,
      password: validated.password,
      firstName: validated.firstName,
      lastName: validated.lastName,
      phone: validated.phone,
      preferredLocale: validated.preferredLocale,
      preferredCurrency: validated.preferredCurrency,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      customer: result.customer,
      message: 'Account created successfully.',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Registration failed' };
  }
}

/**
 * Server Action: Authenticates an existing customer.
 */
export async function loginCustomerAction(rawInput: unknown) {
  try {
    const validated = customerLoginSchema.parse(rawInput);
    const limited = await RateLimiterService.enforce('login', validated.email);
    if (!limited.allowed) return { success: false, error: limited.error };
    const result = await CustomerAuthService.login({
      email: validated.email,
      password: validated.password,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return {
      success: true,
      customer: result.customer,
      message: 'Logged in successfully.',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Login failed' };
  }
}

/**
 * Server Action: Logs out the customer and destroys session cookie.
 */
export async function logoutCustomerAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Retrieves the currently authenticated customer profile.
 */
export async function getCurrentCustomerAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return { success: false, customer: null };

    const session = AuthService.verifySessionToken(token);
    if (!session) return { success: false, customer: null };

    const customer = await CommerceRepository.findCustomerById(session.id);
    if (!customer) {
      // Try searching by email
      const byEmail = await CommerceRepository.findCustomerByEmail(session.email);
      if (!byEmail) return { success: false, customer: null };
      return { success: true, customer: CustomerAuthService.sanitizeCustomer(byEmail) };
    }

    return { success: true, customer: CustomerAuthService.sanitizeCustomer(customer) };
  } catch {
    return { success: false, customer: null };
  }
}

/**
 * Server Action: Updates customer profile settings.
 */
export async function updateCustomerProfileAction(rawInput: unknown) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) throw new Error('Authentication required.');

    const session = AuthService.verifySessionToken(token);
    if (!session) throw new Error('Invalid or expired session.');

    const validated = customerProfileUpdateSchema.parse(rawInput);
    const updated = await CommerceRepository.updateCustomerProfile(session.id, {
      firstName: validated.firstName,
      lastName: validated.lastName,
      phone: validated.phone,
      languageCode: validated.preferredLocale,
      preferredCurrency: validated.preferredCurrency,
    });

    return {
      success: true,
      customer: CustomerAuthService.sanitizeCustomer(updated),
      message: 'Profile updated successfully.',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Profile update failed' };
  }
}

/**
 * Server Action: Retrieves customer addresses with ownership isolation.
 */
export async function getCustomerAddressesAction() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return { success: false, addresses: [] };

    const session = AuthService.verifySessionToken(token);
    if (!session) return { success: false, addresses: [] };

    const addresses = await CommerceRepository.getCustomerAddresses(session.id);
    return { success: true, addresses };
  } catch (error: any) {
    return { success: false, addresses: [], error: error.message };
  }
}

/**
 * Server Action: Saves or updates an address for the authenticated customer.
 */
export async function saveCustomerAddressAction(rawInput: unknown) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) throw new Error('Authentication required.');

    const session = AuthService.verifySessionToken(token);
    if (!session) throw new Error('Invalid or expired session.');

    const validated = customerAddressSchema.parse(rawInput);
    const address = await CommerceRepository.saveCustomerAddress(session.id, {
      firstName: validated.firstName,
      lastName: validated.lastName,
      company: validated.company,
      streetAddress: validated.streetAddress,
      houseNumber: validated.houseNumber,
      apartmentUnit: validated.apartmentUnit,
      city: validated.city,
      stateProvince: validated.stateProvince,
      postalCode: validated.postalCode,
      countryCode: validated.countryCode,
      phone: validated.phone,
      isDefault: validated.isDefault,
    });

    return {
      success: true,
      address,
      message: 'Address saved successfully.',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save address' };
  }
}

/**
 * Server Action: Deletes a saved address.
 */
export async function deleteCustomerAddressAction(addressId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) throw new Error('Authentication required.');

    const session = AuthService.verifySessionToken(token);
    if (!session) throw new Error('Invalid or expired session.');

    const deleted = await CommerceRepository.deleteCustomerAddress(session.id, addressId);
    return { success: deleted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Requests a password reset link.
 */
export async function requestPasswordResetAction(rawInput: unknown) {
  try {
    const validated = passwordResetRequestSchema.parse(rawInput);
    const limited = await RateLimiterService.enforce('password_reset', validated.email);
    if (!limited.allowed) return { success: false, error: limited.error };
    const result = await CustomerAuthService.requestPasswordReset(validated.email);
    return {
      success: true,
      message: 'If an account exists with this email, a reset link has been dispatched.',
      ...result,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Server Action: Confirms a password reset with token.
 */
export async function confirmPasswordResetAction(rawInput: unknown) {
  try {
    const validated = passwordResetConfirmSchema.parse(rawInput);
    const result = await CustomerAuthService.confirmPasswordReset(validated.token, validated.newPassword);
    return {
      success: true,
      message: 'Password reset successfully. You may now log in.',
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Password reset failed' };
  }
}
