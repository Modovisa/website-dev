// This file has the complete fix with type enforcement and debugging
// Copy this to: src/services/billing.store.ts

import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth";

/* Type definitions */
export type PricingTier = {
  id: number;
  plan_id: number;
  name?: string;
  min_events: number;
  max_events: number;
  monthly_price: number;
  stripe_price_id_month?: string;
  stripe_price_id_year?: string;
  is_popular?: boolean;
};

export type BillingInfo = {
  plan_id?: number;
  plan_name: string | null;
  price: number | null;
  interval: "month" | "year" | null;
  is_popular?: boolean;
  event_count: number;
  active_until: string | "Free Forever" | null;
  days_used?: number;
  total_days?: number;
  days_left?: number | null;
  cancel_at_period_end?: boolean;
  scheduled_downgrade?: boolean;
  is_free_forever?: boolean | 0 | 1;
  is_free_plan?: boolean;
  payment_method?: { brand?: string; last4?: string } | null;
  plan_features?: string;
};

export type Invoice = {
  id?: string;
  number?: string;
  invoice_id?: string;
  amount_due?: number;
  total?: number;
  status?: string;
  invoice_status?: string;
  created_at?: string;
  issued_date?: string;
  invoice_pdf?: string | null;
  pdf_link?: string | null;
};

export type SelectedTierMeta = {
  tier_id: number | null;
  plan_id: number | null;
  stripe_price_id: string | null;
  price: number | null;
  interval: "month" | "year" | null;
  label: string;
};

class BillingStore {
  private pricingTiers: PricingTier[] = [];
  private selectedTierMeta: SelectedTierMeta = {
    tier_id: null,
    plan_id: null,
    stripe_price_id: null,
    price: null,
    interval: null,
    label: "",
  };
  private selectedPaymentMethod: { brand?: string; last4?: string } | null = null;
  private billingInfo: BillingInfo | null = null;
  private invoices: Invoice[] = [];
  private stripePromise: Promise<any> | null = null;
  public isFreePlanBeforeUpgrade: boolean = false;

  async loadPricingTiers(): Promise<PricingTier[]> {
    try {
      const res = await secureFetch(`${apiBase()}/api/billing-pricing-tiers`);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to load pricing tiers");
      this.pricingTiers = await res.json();
      return this.pricingTiers;
    } catch (err) {
      console.error("❌ Failed to load pricing tiers:", err);
      throw err;
    }
  }

  async loadUserBillingInfo(): Promise<BillingInfo> {
    try {
      const res = await secureFetch(`${apiBase()}/api/user-billing-info`);
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch billing info");
      const data = await res.json();
      this.billingInfo = data;
      this.selectedPaymentMethod = data.payment_method || null;
      this.isFreePlanBeforeUpgrade =
        (data.plan_name || "").toLowerCase().includes("free") ||
        data.price === 0 ||
        data.interval == null;
      return data;
    } catch (err) {
      console.error("❌ Failed to load billing info:", err);
      throw err;
    }
  }

  async loadInvoices(): Promise<Invoice[]> {
    try {
      const res = await secureFetch(`${apiBase()}/api/user/invoices`);
      if (res.status === 401) throw new Error("Unauthorized");
      const json = await res.json();
      this.invoices = Array.isArray(json.data) ? json.data : [];
      return this.invoices;
    } catch (err) {
      console.error("❌ Failed to load invoices:", err);
      throw err;
    }
  }

  private async resolvePublishableKey(): Promise<string> {
    const envPk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (envPk && envPk.trim()) return envPk;
    try {
      const res = await fetch(`${apiBase()}/api/stripe/runtime-config`, {
        cache: "no-store",
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.publishableKey) {
        throw new Error(j.error || "Failed to resolve Stripe publishable key");
      }
      return j.publishableKey;
    } catch {
      return "";
    }
  }

  private async waitForStripeGlobal(maxMs = 6000, stepMs = 120): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (typeof window !== "undefined" && typeof (window as any).Stripe === "function") {
          return resolve();
        }
        if (Date.now() - start >= maxMs) {
          return reject(new Error("Stripe.js global not available"));
        }
        setTimeout(tick, stepMs);
      };
      tick();
    });
  }

  async getStripe(): Promise<any> {
    if (!this.stripePromise) {
      this.stripePromise = (async () => {
        const pk = await this.resolvePublishableKey();
        if (!pk) {
          console.warn("[billing] Stripe publishable key could not be resolved.");
          return null;
        }
        await this.waitForStripeGlobal().catch((e) => {
          console.error("[billing] window.Stripe not ready:", e);
          return null;
        });
        if (!(window as any).Stripe) return null;
        try {
          return (window as any).Stripe(pk);
        } catch (err) {
          console.error("[billing] window.Stripe(init) failed:", err);
          return null;
        }
      })();
    }
    return this.stripePromise;
  }

  updateSelectedTier(tierId: number, interval: "month" | "year", tier: PricingTier, price: number) {
    this.selectedTierMeta = {
      tier_id: tierId,
      plan_id: tier.plan_id,
      price,
      interval,
      stripe_price_id: interval === "year" ? tier.stripe_price_id_year : tier.stripe_price_id_month,
      label: `${tier.max_events.toLocaleString()} events/${interval}`,
    };
  }

  isDowngrade(tierId: number, interval: "month" | "year"): boolean {
    if (!this.billingInfo) return false;
    const currentPlanId = this.billingInfo.plan_id || 0;
    const currentInterval = this.billingInfo.interval || "month";
    const currentPrice = this.billingInfo.price || 0;
    const tier = this.pricingTiers.find((t) => t.id === tierId);
    if (!tier) return false;
    const selectedPrice = interval === "year" ? Math.ceil(tier.monthly_price * 0.8) : tier.monthly_price;
    const isSameTier = currentPlanId === tier.plan_id;
    const isSameInterval = currentInterval === interval;
    const isLowerPrice = selectedPrice < currentPrice;
    return isSameTier && isSameInterval && isLowerPrice;
  }

  hasPaymentMethod(): boolean {
    return !!this.selectedPaymentMethod;
  }

  /* CRITICAL: This is where the API call happens */
  async openStripeEmbeddedCheckout(
    tierId: number,
    interval: "month" | "year",  // ✅ MUST be exactly "month" or "year" (Bootstrap compatible)
    previousPlanId: number = 0,
    previousInterval: "month" | "year" = "month",
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<any> {
    const stripe = await this.getStripe();
    if (!stripe) {
      const err = new Error("Stripe failed to load/initialize");
      onError?.(err);
      throw err;
    }

    // ✅ Assert interval is correct (Bootstrap only accepts "month" or "year")
    if (interval !== "month" && interval !== "year") {
      const err = new Error(`Invalid interval: "${interval}". Must be "month" or "year"`);
      console.error(err);
      onError?.(err);
      throw err;
    }

    try {
      // 🐛 DEBUG: Log exactly what we're sending
      console.log("🔍 [billing.store] Calling /api/stripe/embedded-session with:", {
        tier_id: tierId,
        interval,  // Should be "month" or "year" only
        request_body: JSON.stringify({ tier_id: tierId, interval })
      });

      // ✅ API call - matches Bootstrap exactly
      const res = await secureFetch(`${apiBase()}/api/stripe/embedded-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, interval }),  // interval is "month" or "year"
      });

      const data = await res.json();
      console.log("📦 [billing.store] Server response:", data);

      const fromFree = this.isFreePlanBeforeUpgrade === true;
      const intervalChanged = previousInterval !== interval;

      if (data.success || data.embedded_handled === true) {
        await this.loadUserBillingInfo();
        onComplete?.();
        return { success: true, context: { fromFree, intervalChanged } };
      }

      if (data.require_payment_update) {
        console.warn("⚠️ [billing.store] Card needs update");
        throw new Error("Card declined or expired — user must re-authenticate payment");
      }

      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Missing Stripe clientSecret");
      }

      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: data.clientSecret,
        onComplete: async () => {
          await this.loadUserBillingInfo();
          onComplete?.();
        },
      });

      return { checkout, context: { fromFree, intervalChanged } };
    } catch (err) {
      console.error("❌ [billing.store] Stripe checkout failed:", err);
      onError?.(err as Error);
      throw err;
    }
  }

  async confirmUpgrade(
    tierId: number,
    interval: "month" | "year",
    currentPlanId: number,
    currentInterval: "month" | "year"
  ): Promise<any> {
    return this.openStripeEmbeddedCheckout(tierId, interval, currentPlanId, currentInterval);
  }

  async openStripeUpdateCardSession(
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<any> {
    const stripe = await this.getStripe();
    if (!stripe) {
      const err = new Error("Stripe failed to load");
      onError?.(err);
      throw err;
    }
    try {
      const res = await secureFetch(`${apiBase()}/api/stripe/update-payment-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Missing clientSecret");
      }
      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: data.clientSecret,
        onComplete: async () => {
          await this.loadUserBillingInfo();
          onComplete?.();
        },
      });
      return checkout;
    } catch (err) {
      console.error("❌ Failed to launch update card session:", err);
      onError?.(err as Error);
      throw err;
    }
  }

  async cancelSubscription(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/cancel-subscription`, { method: "POST" });
      const data = await res.json();
      if (data.success) await this.loadUserBillingInfo();
      return data;
    } catch (err) {
      console.error("❌ Cancel error:", err);
      throw err;
    }
  }

  async reactivateSubscription(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/reactivate-subscription`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTimeout(async () => {
          await this.loadUserBillingInfo();
        }, 500);
      }
      return data;
    } catch (err) {
      console.error("❌ Reactivate request failed:", err);
      throw err;
    }
  }

  async confirmDowngrade(tierId: number, interval: "month" | "year"): Promise<void> {
    try {
      const res = await secureFetch(`${apiBase()}/api/stripe/embedded-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, interval }),
      });
      const data = await res.json();
      if (res.ok && (data.success || data.message?.includes("successful"))) {
        await this.loadUserBillingInfo();
        return;
      } else {
        throw new Error(data.error || "Downgrade failed");
      }
    } catch (err) {
      console.error("❌ Downgrade request failed:", err);
      throw err;
    }
  }

  async cancelDowngrade(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/cancel-downgrade`, { method: "POST" });
      const data = await res.json();
      if (data.success) await this.loadUserBillingInfo();
      return data;
    } catch (err) {
      console.error("❌ Cancel downgrade error:", err);
      throw err;
    }
  }

  getPricingTiers(): PricingTier[] {
    return this.pricingTiers;
  }

  getBillingInfo(): BillingInfo | null {
    return this.billingInfo;
  }

  getInvoices(): Invoice[] {
    return this.invoices;
  }

  getSelectedTierMeta(): SelectedTierMeta {
    return this.selectedTierMeta;
  }

  getPaymentMethod(): { brand?: string; last4?: string } | null {
    return this.selectedPaymentMethod;
  }

  isFreePlan(): boolean {
    if (!this.billingInfo) return true;
    const isFreeForever =
      String(this.billingInfo.is_free_forever) === "1" || this.billingInfo.is_free_forever === true;
    return (
      isFreeForever ||
      this.billingInfo.price === 0 ||
      this.billingInfo.interval === null ||
      (this.billingInfo.plan_name || "").toLowerCase().includes("free")
    );
  }

  isFreeForever(): boolean {
    if (!this.billingInfo) return false;
    return (
      String(this.billingInfo.is_free_forever) === "1" || this.billingInfo.is_free_forever === true
    );
  }

  findTierByEvents(events: number): PricingTier | null {
    return this.pricingTiers.find((tier) => events >= tier.min_events && events <= tier.max_events) || null;
  }

  calculatePrice(tier: PricingTier, interval: "month" | "year"): number {
    const monthly = tier.monthly_price;
    return interval === "year" ? Math.ceil(monthly * 0.8) : monthly;
  }
}

export const billingStore = new BillingStore();