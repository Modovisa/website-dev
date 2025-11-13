// src/services/billingService.ts
import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth"; // <-- use secureFetch
const API = apiBase();

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

async function json<T>(res: Response): Promise<T> {
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(await res.text().catch(() => "request_failed"));
  return (await res.json()) as T;
}

export async function getBillingInfo(): Promise<BillingInfo> {
  const r = await secureFetch(`${API}/api/user-billing-info`, {
    credentials: "include",
    cache: "no-store",
  });
  return json<BillingInfo>(r);
}

export async function getPricingTiers(): Promise<PricingTier[]> {
  const r = await secureFetch(`${API}/api/billing-pricing-tiers`, {
    credentials: "include",
    cache: "no-store",
  });
  return json<PricingTier[]>(r);
}

export async function getStripeRuntime(): Promise<{ publishableKey: string }> {
  const r = await secureFetch(`${API}/api/stripe/runtime-config`, {
    credentials: "include",
    cache: "no-store",
  });
  return json<{ publishableKey: string }>(r);
}

export async function createEmbeddedSession(args: {
  tier_id: number;
  interval: "month" | "year";
}) {
  const r = await secureFetch(`${API}/api/stripe/embedded-session`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  return json<any>(r);
}

export async function openUpdateCardSession(): Promise<{ clientSecret: string }> {
  const r = await secureFetch(`${API}/api/stripe/update-payment-method`, {
    method: "POST",
    credentials: "include",
  });
  return json<{ clientSecret: string }>(r);
}

export async function cancelSubscription(): Promise<{ success: boolean }> {
  const r = await secureFetch(`${API}/api/cancel-subscription`, {
    method: "POST",
    credentials: "include",
  });
  return json<{ success: boolean }>(r);
}

export async function reactivateSubscription(): Promise<{ success: boolean }> {
  const r = await secureFetch(`${API}/api/reactivate-subscription`, {
    method: "POST",
    credentials: "include",
  });
  return json<{ success: boolean }>(r);
}

export async function cancelDowngrade(): Promise<{ success: boolean }> {
  const r = await secureFetch(`${API}/api/cancel-downgrade`, {
    method: "POST",
    credentials: "include",
  });
  return json<{ success: boolean }>(r);
}

export async function listInvoices(): Promise<{ data: InvoiceRow[] }> {
  const r = await secureFetch(`${API}/api/user/invoices`, {
    credentials: "include",
    cache: "no-store",
  });
  return json<{ data: InvoiceRow[] }>(r);
}
