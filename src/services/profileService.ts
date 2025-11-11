// src/services/profileService.ts

// Profile API service - uses centralized http utility

import { httpGet, httpPost } from './http';
import type {
  UserProfile,
  Website,
  BillingInfo,
  Invoice,
  PricingTier,
  TwoFactorSetup,
  DeletionPolicy,
  PasswordChangeData,
  TwoFactorVerifyData,
  AccountDeleteData,
  UpdateWebsiteData,
  DeleteWebsiteData,
  StripeConfig,
} from '@/types/profile';

// ==================== User Profile ====================
export async function getUserProfile(): Promise<UserProfile> {
  return await httpGet<UserProfile>('/api/me?include=meta');
}

// ==================== Websites ====================
export async function getWebsites(): Promise<Website[]> {
  const response = await httpPost<{ projects?: Website[] }>('/api/tracking-websites');
  return response?.projects || [];
}

export async function updateWebsite(data: UpdateWebsiteData): Promise<void> {
  await httpPost('/api/update-tracking-config', data);
}

export async function deleteWebsite(data: DeleteWebsiteData): Promise<void> {
  await httpPost('/api/delete-tracking-config', data);
}

// ==================== Billing ====================
export async function getBillingInfo(): Promise<BillingInfo> {
  return await httpGet<BillingInfo>('/api/user-billing-info');
}

export async function getPricingTiers(): Promise<PricingTier[]> {
  return await httpGet<PricingTier[]>('/api/billing-pricing-tiers');
}

export async function getInvoices(): Promise<Invoice[]> {
  const response = await httpGet<{ data?: Invoice[] }>('/api/user/invoices');
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getStripeConfig(): Promise<StripeConfig> {
  const response = await httpGet<StripeConfig>('/api/stripe/runtime-config');
  if (!response?.publishableKey) {
    throw new Error('No Stripe publishable key');
  }
  return response;
}

// ==================== Security ====================
export async function changePassword(data: PasswordChangeData): Promise<void> {
  await httpPost('/api/update-password', data);
}

export async function setup2FA(): Promise<TwoFactorSetup> {
  return await httpPost<TwoFactorSetup>('/api/2fa/setup');
}

export async function verify2FA(data: TwoFactorVerifyData): Promise<void> {
  await httpPost('/api/2fa/verify', data);
}

export async function reset2FA(): Promise<void> {
  await httpPost('/api/2fa/reset');
}

// ==================== Account Management ====================
export async function getDeletionPolicy(): Promise<DeletionPolicy> {
  try {
    return await httpGet<DeletionPolicy>('/api/user/deletion-policy');
  } catch {
    // Return defaults if not available
    return {
      deactivate_grace_days: 0,
      hard_delete_grace_days: 0,
      username_cooldown_days: 0,
    };
  }
}

export async function deleteAccount(data: AccountDeleteData): Promise<void> {
  await httpPost('/api/user/delete-account', data);
}

// ==================== Dashboard Stats ====================
export async function getDashboardStats(): Promise<any> {
  return await httpGet('/api/dashboard-stats');
}
