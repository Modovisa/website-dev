// src/types/profile.ts

// TypeScript types for profile-related data

export interface Website {
  id: string | number;
  website_name: string;
  domain: string;
  tracking_token: string;
  timezone: string;
}

export interface UserProfile {
  username: string;
  email: string;
  plan_name?: string;
  created_at?: string;
  last_login_at?: string;
  twofa_enabled?: boolean;
  is_new_user?: boolean;
}

export interface BillingInfo {
  plan_name: string;
  price: number;
  interval: string | null;
  active_until: string;
  is_free_forever: string | boolean;
  is_popular?: boolean;
  plan_features?: string;
  payment_method?: string | null;
}

export interface Invoice {
  issued_date: string;
  total: number;
  invoice_status: string;
  invoice_id: string;
  pdf_link: string;
  issued_ts?: number;
  invoice_seq?: number;
  api_index?: number;
}

export interface PricingTier {
  tier_id: number;
  plan_id: number;
  stripe_price_id: string;
  price: number;
  interval: 'month' | 'year';
  label: string;
  events_min: number;
  events_max: number;
  is_popular?: boolean;
}

export interface TwoFactorSetup {
  secret: string;
  qr_svg: string;
}

export interface DeletionPolicy {
  deactivate_grace_days: number;
  hard_delete_grace_days: number;
  username_cooldown_days: number;
}

export interface PasswordChangeData {
  old_password: string;
  new_password: string;
}

export interface TwoFactorVerifyData {
  code: string;
}

export interface AccountDeleteData {
  mode: 'deactivate' | 'immediate';
  reason: string;
}

export interface UpdateWebsiteData {
  id: string | number;
  website_name: string;
  timezone: string;
}

export interface DeleteWebsiteData {
  id: string | number;
}

export interface StripeConfig {
  publishableKey: string;
}