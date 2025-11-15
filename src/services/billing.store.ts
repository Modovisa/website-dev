// src/services/billing.store.ts
/**
 * Centralized Billing Store
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

/* ============================================
   🌍 BILLING STORE CLASS
   ============================================ */

class BillingStore {
  // ========================================
  // GLOBAL BILLING VARS (Bootstrap lines 8-18)
  // ========================================
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

  // User status tracking (Bootstrap line 57-59)
  public isFreePlanBeforeUpgrade: boolean = false;

  /* ============================================
     📦 LOAD PRICING TIERS (Bootstrap lines 21-32)
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
     🔄 LOAD BILLING INFO (Bootstrap lines 35-64)
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

      // Track if upgrading from free plan (Bootstrap lines 57-59)
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
     🎨 STRIPE HELPER (Bootstrap lines 66-84)
     ============================================ */
  private async resolvePublishableKey(): Promise<string> {
    // 1) Prefer Vite env override
    const envPk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (envPk && envPk.trim()) return envPk;

    // 2) Admin runtime config (matches Bootstrap exactly)
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
     💳 UPGRADE LOGIC (Bootstrap lines 850-906)
     ============================================ */

  /**
   * Update selected tier metadata (Bootstrap lines 1328-1338)
   * Called by React components before upgrade
   */
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

  /**
   * Check if upgrade is a downgrade (Bootstrap lines 864-868)
   */
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

  /**
   * Check if user has saved payment method (Bootstrap line 880)
   */
  hasPaymentMethod(): boolean {
    return !!this.selectedPaymentMethod;
  }

  /* ============================================
     💳 STRIPE EMBEDDED CHECKOUT (Bootstrap lines 917-1003)
     ============================================ */

  async openStripeEmbeddedCheckout(
    tierId: number,
    interval: "month" | "year",
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

    try {
      // Request embedded session from backend (Bootstrap lines 934-940)
      const res = await secureFetch(`${apiBase()}/api/stripe/embedded-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, interval }),
      });

      const data = await res.json();
      console.log("📦 Server Response:", data);

      // Determine upgrade context (Bootstrap lines 950-951)
      const fromFree = this.isFreePlanBeforeUpgrade === true;
      const intervalChanged = previousInterval !== interval;

      // 🔁 Card-on-file upgrade handled server-side (Bootstrap lines 945-962)
      if (data.success || data.embedded_handled === true) {
        await this.loadUserBillingInfo();

        // Show appropriate success based on context
        onComplete?.();
        return { success: true, context: { fromFree, intervalChanged } };
      }

      // 🧾 Require card update (Bootstrap lines 964-970)
      if (data.require_payment_update) {
        console.warn("⚠️ Card needs update");
        throw new Error("Card declined or expired — user must re-authenticate payment");
      }

      // Validate client secret (Bootstrap lines 972-974)
      if (!res.ok || !data.clientSecret) {
        throw new Error(data.error || "Missing Stripe clientSecret");
      }

      // ✅ Proceed with embedded checkout (Bootstrap lines 980-996)
      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: data.clientSecret,
        onComplete: async () => {
          await this.loadUserBillingInfo();
          onComplete?.();
        },
      });

      return { checkout, context: { fromFree, intervalChanged } };
    } catch (err) {
      console.error("❌ Stripe checkout failed:", err);
      onError?.(err as Error);
      throw err;
    }
  }

  /* ============================================
     💳 CONFIRM UPGRADE WITH SAVED CARD
     (Bootstrap lines 1008-1020)
     ============================================ */

  async confirmUpgrade(
    tierId: number,
    interval: "month" | "year",
    currentPlanId: number,
    currentInterval: "month" | "year"
  ): Promise<any> {
    return this.openStripeEmbeddedCheckout(
      tierId,
      interval,
      currentPlanId,
      currentInterval
    );
  }

  /* ============================================
     💳 UPDATE CARD (Bootstrap lines 1041-1077)
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
     💳 CANCEL SUBSCRIPTION (Bootstrap lines 1095-1122)
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
     💳 REACTIVATE SUBSCRIPTION (Bootstrap lines 1141-1175)
     ============================================ */

  async reactivateSubscription(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/reactivate-subscription`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        // Refresh billing info after slight delay (Bootstrap line 1163)
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

  /* ============================================
     💳 CONFIRM DOWNGRADE (Bootstrap lines 1181-1217)
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
     💳 CANCEL DOWNGRADE (Bootstrap lines 1237-1268)
     ============================================ */

  async cancelDowngrade(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/cancel-downgrade`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        // Dynamically update UI (Bootstrap lines 1254-1258)
        await this.loadUserBillingInfo();
      }
      return data;
    } catch (err) {
      console.error("❌ Cancel downgrade error:", err);
      throw err;
    }
  }

  /* ============================================
     📊 GETTERS & HELPERS
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

  /**
   * Check if current plan is free (Bootstrap line 97)
   */
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

  /**
   * Check if free forever (Bootstrap line 96)
   */
  isFreeForever(): boolean {
    if (!this.billingInfo) return false;
    return (
      String(this.billingInfo.is_free_forever) === "1" || this.billingInfo.is_free_forever === true
    );
  }

  /**
   * Find tier by event count (used by React slider)
   */
  findTierByEvents(events: number): PricingTier | null {
    return this.pricingTiers.find((tier) => events >= tier.min_events && events <= tier.max_events) || null;
  }

  /**
   * Calculate price for tier + interval
   */
  calculatePrice(tier: PricingTier, interval: "month" | "year"): number {
    const monthly = tier.monthly_price;
    return interval === "year" ? Math.ceil(monthly * 0.8) : monthly; // 20% discount for yearly
  }
}

// Export singleton instance
export const billingStore = new BillingStore();

/* ============================================
   📝 NOTES ON MISSING BOOTSTRAP CODE
   ============================================ */

// The following Bootstrap functions are NOT included because they are UI-specific:
//
// 1. renderCurrentPlan() (Bootstrap lines ~89-300)
//    → Handled by: BillingAndPlans.tsx component
//    → React renders UI based on billingInfo from the store
//
// 2. renderUpgradeModalFooter() (Bootstrap lines ~303-330)
//    → Handled by: UpgradePlanModal.tsx component
//    → React displays current plan amount directly
//
// 3. setupUpgradeModalSlider() (Bootstrap lines 1288-1380)
//    → Handled by: UpgradePlanModal.tsx component
//    → Uses native HTML5 range input instead of noUiSlider
//    → React manages slider state locally
//
// The store focuses on business logic and API calls.
// React components handle all DOM manipulation and rendering.