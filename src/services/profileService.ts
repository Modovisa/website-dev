// src/services/profileService.ts

// Profile API service - uses existing http utility

import { http } from './http';
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
  return await http('/api/me?include=meta');
}

// ==================== Websites ====================
export async function getWebsites(): Promise<Website[]> {
  const response = await http('/api/tracking-websites', {
    method: 'POST',
  });
  return response?.projects || [];
}

export async function updateWebsite(data: UpdateWebsiteData): Promise<void> {
  await http('/api/update-tracking-config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteWebsite(data: DeleteWebsiteData): Promise<void> {
  await http('/api/delete-tracking-config', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==================== Billing ====================
export async function getBillingInfo(): Promise<BillingInfo> {
  return await http('/api/user-billing-info');
}

export async function getPricingTiers(): Promise<PricingTier[]> {
  return await http('/api/billing-pricing-tiers');
}

export async function getInvoices(): Promise<Invoice[]> {
  const response = await http('/api/user/invoices');
  return Array.isArray(response?.data) ? response.data : [];
}

export async function getStripeConfig(): Promise<StripeConfig> {
  const response = await http('/api/stripe/runtime-config');
  if (!response?.publishableKey) throw new Error('No Stripe publishable key');
  return response;
}

// ==================== Security ====================
export async function changePassword(data: PasswordChangeData): Promise<void> {
  await http('/api/update-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function setup2FA(): Promise<TwoFactorSetup> {
  return await http('/api/2fa/setup', {
    method: 'POST',
  });
}

export async function verify2FA(data: TwoFactorVerifyData): Promise<void> {
  await http('/api/2fa/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function reset2FA(): Promise<void> {
  await http('/api/2fa/reset', {
    method: 'POST',
  });
}

// ==================== Account Management ====================
export async function getDeletionPolicy(): Promise<DeletionPolicy> {
  try {
    return await http('/api/user/deletion-policy');
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
  await http('/api/user/delete-account', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ==================== Dashboard Stats ====================
export async function getDashboardStats(): Promise<any> {
  return await http('/api/dashboard-stats');
}