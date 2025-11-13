// src/services/billingService.ts
import { httpGet, httpPost } from "@/services/http";

export type BillingInfo = {
  plan_id: number | 0;
  plan_name: string;
  price: number;
  interval: "month" | "year" | null;
  is_popular?: number | boolean;
  is_free_forever?: 0 | 1 | boolean;
  active_until?: string | "Free Forever" | null;
  days_used?: number;
  total_days?: number;
  days_left?: number;
  cancel_at_period_end?: 0 | 1 | boolean;
  scheduled_downgrade?: 0 | 1 | boolean;
  event_count: number;
  payment_method?: { brand?: string; last4?: string } | null;
};

export type PricingTier = {
  id: number;
  plan_id: number;
  min_events: number;
  max_events: number;
  monthly_price: number;
  stripe_price_id_month?: string;
  stripe_price_id_year?: string;
};

export type InvoiceRow = {
  issued_date: string;
  total: number;
  invoice_status: string;
  invoice_id: string;
  pdf_link?: string | null;
};

export async function getBillingInfo(): Promise<BillingInfo> {
  return await httpGet<BillingInfo>("/api/user-billing-info", { cache: "no-store" });
}

export async function getPricingTiers(): Promise<PricingTier[]> {
  return await httpGet<PricingTier[]>("/api/billing-pricing-tiers", { cache: "no-store" });
}

export async function getStripeRuntime(): Promise<{ publishableKey: string }> {
  return await httpGet<{ publishableKey: string }>("/api/stripe/runtime-config", { cache: "no-store" });
}

export async function createEmbeddedSession(args: { tier_id: number; interval: "month" | "year" }) {
  return await httpPost<any>("/api/stripe/embedded-session", args);
}

export async function openUpdateCardSession(): Promise<{ clientSecret: string }> {
  return await httpPost<{ clientSecret: string }>("/api/stripe/update-payment-method");
}

export async function cancelSubscription(): Promise<{ success: boolean }> {
  return await httpPost<{ success: boolean }>("/api/cancel-subscription");
}

export async function reactivateSubscription(): Promise<{ success: boolean }> {
  return await httpPost<{ success: boolean }>("/api/reactivate-subscription");
}

export async function cancelDowngrade(): Promise<{ success: boolean }> {
  return await httpPost<{ success: boolean }>("/api/cancel-downgrade");
}

export async function listInvoices(): Promise<{ data: InvoiceRow[] }> {
  return await httpGet<{ data: InvoiceRow[] }>("/api/user/invoices", { cache: "no-store" });
}
