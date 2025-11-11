// src/services/profileService.ts

// Profile API service - uses existing secureFetch from @/lib/auth

import { secureFetch } from '@/lib/auth';
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

const API_BASE = 'https://api.modovisa.com';

// ==================== User Profile ====================
export async function getUserProfile(): Promise<UserProfile> {
  const response = await secureFetch(`${API_BASE}/api/me?include=meta`);
  if (!response.ok) throw new Error('Failed to fetch profile');
  return await response.json();
}

// ==================== Websites ====================
export async function getWebsites(): Promise<Website[]> {
  const response = await secureFetch(`${API_BASE}/api/tracking-websites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to fetch websites');
  const data = await response.json();
  return data.projects || [];
}

export async function updateWebsite(data: UpdateWebsiteData): Promise<void> {
  const response = await secureFetch(`${API_BASE}/api/update-tracking-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update website');
}

export async function deleteWebsite(data: DeleteWebsiteData): Promise<void> {
  const response = await secureFetch(`${API_BASE}/api/delete-tracking-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to delete website');
}

// ==================== Billing ====================
export async function getBillingInfo(): Promise<BillingInfo> {
  const response = await secureFetch(`${API_BASE}/api/user-billing-info`);
  if (!response.ok) throw new Error('Failed to fetch billing info');
  return await response.json();
}

export async function getPricingTiers(): Promise<PricingTier[]> {
  const response = await secureFetch(`${API_BASE}/api/billing-pricing-tiers`);
  if (!response.ok) throw new Error('Failed to fetch pricing tiers');
  return await response.json();
}

export async function getInvoices(): Promise<Invoice[]> {
  const response = await secureFetch(`${API_BASE}/api/user/invoices`);
  if (!response.ok) throw new Error('Failed to fetch invoices');
  const data = await response.json();
  return Array.isArray(data.data) ? data.data : [];
}

export async function getStripeConfig(): Promise<StripeConfig> {
  const response = await fetch(`${API_BASE}/api/stripe/runtime-config`, {
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch Stripe config');
  const data = await response.json();
  if (!data.publishableKey) throw new Error('No Stripe publishable key');
  return data;
}

// ==================== Security ====================
export async function changePassword(data: PasswordChangeData): Promise<void> {
  const response = await secureFetch(`${API_BASE}/api/update-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to change password');
  }
}

export async function setup2FA(): Promise<TwoFactorSetup> {
  const response = await secureFetch(`${API_BASE}/api/2fa/setup`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to setup 2FA');
  }
  return await response.json();
}

export async function verify2FA(data: TwoFactorVerifyData): Promise<void> {
  const response = await secureFetch(`${API_BASE}/api/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify 2FA');
  }
}

export async function reset2FA(): Promise<void> {
  const response = await secureFetch(`${API_BASE}/api/2fa/reset`, {
    method: 'POST',
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reset 2FA');
  }
}

// ==================== Account Management ====================
export async function getDeletionPolicy(): Promise<DeletionPolicy> {
  const response = await secureFetch(`${API_BASE}/api/user/deletion-policy`);
  if (!response.ok) {
    // Return defaults if not available
    return {
      deactivate_grace_days: 0,
      hard_delete_grace_days: 0,
      username_cooldown_days: 0,
    };
  }
  return await response.json();
}

export async function deleteAccount(data: AccountDeleteData): Promise<void> {
  const response = await secureFetch(`${API_BASE}/api/user/delete-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete account');
  }
}

// ==================== Dashboard Stats ====================
export async function getDashboardStats(): Promise<any> {
  const response = await secureFetch(`${API_BASE}/api/dashboard-stats`);
  if (!response.ok) throw new Error('Failed to fetch dashboard stats');
  return await response.json();
}