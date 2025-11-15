// src/services/billing.store.ts
/**
 * Centralized Billing Store
 * Mirrors the Bootstrap implementation from user-profile.js (lines 8-1355)
 * All billing logic in one place for easier maintenance and parity with Bootstrap
 */

import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth";

/* ============================================
   🌍 TYPES & INTERFACES
   ============================================ */

export type PricingTier = {
  id: number;
  plan_id: number;
  name: string;
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

/* ============================================
   🌍 GLOBAL STATE (mirroring Bootstrap)
   ============================================ */

class BillingStore {
  // Global billing vars (lines 8-18 in Bootstrap)
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
  
  // Stripe instance cache
  private stripePromise: Promise<any> | null = null;
  
  // User status tracking (mirroring Bootstrap global)
  public isFreePlanBeforeUpgrade: boolean = false;

  /* ============================================
     📦 LOAD PRICING TIERS (lines 21-32)
     ============================================ */
  async loadPricingTiers(): Promise<PricingTier[]> {
    try {
      const res = await secureFetch(`${apiBase()}/api/billing-pricing-tiers`);
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to load pricing tiers");
      this.pricingTiers = await res.json();
      return this.pricingTiers;
    } catch (err) {
      console.error("❌ Failed to load pricing tiers:", err);
      throw err;
    }
  }

  /* ============================================
     🔄 FETCH BILLING INFO (lines 35-64)
     ============================================ */
  async loadUserBillingInfo(): Promise<BillingInfo> {
    try {
      const res = await secureFetch(`${apiBase()}/api/user-billing-info`);
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error("Failed to fetch billing info");

      const data = await res.json();
      this.billingInfo = data;
      this.selectedPaymentMethod = data.payment_method || null;

      // Track if upgrading from free plan (line 57-59)
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

  /* ============================================
     💳 LOAD INVOICES
     ============================================ */
  async loadInvoices(): Promise<Invoice[]> {
    try {
      const res = await secureFetch(`${apiBase()}/api/user/invoices`);
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
      const json = await res.json();
      this.invoices = Array.isArray(json.data) ? json.data : [];
      return this.invoices;
    } catch (err) {
      console.error("❌ Failed to load invoices:", err);
      throw err;
    }
  }

  /* ============================================
     🎨 STRIPE HELPER (lines 66-84)
     ============================================ */
  private async resolvePublishableKey(): Promise<string> {
    // 1) Prefer Vite env override
    const envPk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (envPk && envPk.trim()) return envPk;

    // 2) Admin runtime config
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

  /* ============================================
     💳 UPGRADE PLAN LOGIC (lines 850-906)
     ============================================ */
  
  /**
   * Update selected tier metadata (mirroring lines 1328-1338)
   */
  updateSelectedTier(
    tierId: number,
    interval: "month" | "year",
    tier: PricingTier,
    price: number
  ) {
    this.selectedTierMeta = {
      tier_id: tierId,
      plan_id: tier.plan_id,
      price,
      interval,
      stripe_price_id:
        interval === "year" ? tier.stripe_price_id_year : tier.stripe_price_id_month,
      label: `${tier.max_events.toLocaleString()} events/${interval}`,
    };
  }

  /**
   * Detect if upgrade is a downgrade (lines 860-873)
   */
  isDowngrade(tierId: number, interval: "month" | "year"): boolean {
    if (!this.billingInfo) return false;

    const currentPlanId = this.billingInfo.plan_id || 0;
    const currentInterval = this.billingInfo.interval || "month";
    const currentPrice = this.billingInfo.price || 0;

    const tier = this.pricingTiers.find((t) => t.id === tierId);
    if (!tier) return false;

    const selectedPrice = interval === "year" 
      ? Math.ceil(tier.monthly_price * 0.8) 
      : tier.monthly_price;

    const isSameTier = currentPlanId === tier.plan_id;
    const isSameInterval = currentInterval === interval;
    const isLowerPrice = selectedPrice < currentPrice;

    return isSameTier && isSameInterval && isLowerPrice;
  }

  /**
   * Check if user has saved payment method (line 880)
   */
  hasPaymentMethod(): boolean {
    return !!this.selectedPaymentMethod;
  }

  /* ============================================
     💳 STRIPE EMBEDDED CHECKOUT (lines 917-1003)
     ============================================ */
  
  async openStripeEmbeddedCheckout(
    tierId: number,
    interval: "month" | "year",
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const stripe = await this.getStripe();
    if (!stripe) {
      const err = new Error("Stripe failed to load/initialize");
      onError?.(err);
      throw err;
    }

    try {
      // Get current plan details for context
      const previousPlanId = this.billingInfo?.plan_id || 0;
      const previousInterval = this.billingInfo?.interval || "month";
      const fromFree = this.isFreePlanBeforeUpgrade;
      const intervalChanged = previousInterval !== interval;

      // Request embedded session from backend (lines 934-940)
      const res = await secureFetch(`${apiBase()}/api/stripe/embedded-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, interval }),
      });

      const data = await res.json();
      console.log("📦 Server Response:", data);

      // 🔁 Modal fallback - card-on-file upgrade handled server-side (lines 945-962)
      if (data.success || data.embedded_handled === true) {
        await this.loadUserBillingInfo();
        
        // Show appropriate success based on context
        if (fromFree) {
          onComplete?.(); // Free → Paid upgrade
        } else if (intervalChanged) {
          onComplete?.(); // Interval change (Monthly ↔ Yearly)
        } else {
          onComplete?.(); // Regular upgrade
        }
        return;
      }

      // 🧾 Require card update (lines 964-970)
      if (data.require_payment_update) {
        console.warn("⚠️ Card needs update");
        throw new Error("Card declined or expired — user must re-authenticate payment");
      }

      // Validate client secret (lines 972-974)
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Missing Stripe clientSecret");
      }

      // ✅ Proceed with embedded checkout (lines 980-996)
      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: data.clientSecret,
        onComplete: async () => {
          await this.loadUserBillingInfo();
          
          // Context-aware success handling
          if (fromFree) {
            onComplete?.(); // 🎉 Free → Monthly/Yearly
          } else if (intervalChanged) {
            onComplete?.(); // Monthly → Yearly
          } else {
            onComplete?.(); // Regular upgrade
          }
        },
      });

      return checkout;
    } catch (err) {
      console.error("❌ Stripe checkout failed:", err);
      onError?.(err as Error);
      throw err;
    }
  }

  /* ============================================
     💳 UPDATE CARD (lines 1041-1077)
     ============================================ */
  
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

  /* ============================================
     💳 CANCEL SUBSCRIPTION (lines 1095-1122)
     ============================================ */
  
  async cancelSubscription(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/cancel-subscription`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        await this.loadUserBillingInfo();
      }
      return data;
    } catch (err) {
      console.error("❌ Cancel error:", err);
      throw err;
    }
  }

  /* ============================================
     💳 REACTIVATE SUBSCRIPTION (lines 1141-1175)
     ============================================ */
  
  async reactivateSubscription(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/reactivate-subscription`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        await this.loadUserBillingInfo();
      }
      return data;
    } catch (err) {
      console.error("❌ Reactivate request failed:", err);
      throw err;
    }
  }

  /* ============================================
     💳 CONFIRM DOWNGRADE (lines 1181-1217)
     ============================================ */
  
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

  /* ============================================
     💳 CANCEL DOWNGRADE (lines 1237-1268)
     ============================================ */
  
  async cancelDowngrade(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/cancel-downgrade`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        await this.loadUserBillingInfo();
      }
      return data;
    } catch (err) {
      console.error("❌ Cancel downgrade error:", err);
      throw err;
    }
  }

  /* ============================================
     📊 GETTERS
     ============================================ */
  
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
    return (
      this.billingInfo.is_free_plan ||
      (!this.billingInfo.price && !this.billingInfo.interval) ||
      (this.billingInfo.plan_id || 0) === 0
    );
  }

  isFreeForever(): boolean {
    if (!this.billingInfo) return false;
    return (
      String(this.billingInfo.is_free_forever) === "1" ||
      this.billingInfo.is_free_forever === true
    );
  }
}

// Export singleton instance
export const billingStore = new BillingStore();