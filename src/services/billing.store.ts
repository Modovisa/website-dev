// src/services/billing.store.ts
/**
 * Complete Billing Store - mirrors Bootstrap user-profile.js billing logic.
 *
 * Handles:
 * - Loading pricing tiers / billing info / invoices
 * - Stripe helper & embedded checkout
 * - Upgrade / downgrade / cancel / reactivate
 * - Card-update embedded flow
 */

import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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

type CheckoutContext = {
  fromFree: boolean;
  intervalChanged: boolean;
};

export type EmbeddedCheckoutResult =
  | {
      mode: "server_handled";
      context: CheckoutContext;
    }
  | {
      mode: "embedded_checkout";
      checkout: any;
      context: CheckoutContext;
    }
  | {
      mode: "require_payment_update";
      context: CheckoutContext;
    }
  | null;

/* ============================================
   🌍 BILLING STORE CLASS
   ============================================ */

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

  // Mirrors window.isFreePlanBeforeUpgrade in Bootstrap
  public isFreePlanBeforeUpgrade: boolean = false;

  /* ============================================
     📦 LOAD PRICING TIERS
     ============================================ */
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

  /* ============================================
     🔄 LOAD BILLING INFO
     ============================================ */
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

  /* ============================================
     💳 LOAD INVOICES
     ============================================ */
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

  /* ============================================
     🎨 STRIPE HELPER
     ============================================ */

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

  /* ============================================
     💳 UPGRADE LOGIC
     ============================================ */

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

    const selectedPrice =
      interval === "year" ? Math.ceil(tier.monthly_price * 0.8) : tier.monthly_price;

    const isSameTier = currentPlanId === tier.plan_id;
    const isSameInterval = currentInterval === interval;
    const isLowerPrice = selectedPrice < currentPrice;

    return isSameTier && isSameInterval && isLowerPrice;
  }

  hasPaymentMethod(): boolean {
    return !!this.selectedPaymentMethod;
  }

  /* ============================================
     💳 STRIPE EMBEDDED CHECKOUT
     ============================================ */

  async openStripeEmbeddedCheckout(
    tierId: number,
    interval: "month" | "year",
    previousPlanId: number = 0,
    previousInterval: "month" | "year" = "month",
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<EmbeddedCheckoutResult> {
    const stripe = await this.getStripe();
    if (!stripe) {
      const err = new Error("Stripe failed to load/initialize");
      console.error("[billing] getStripe failed:", err);
      onError?.(err);
      throw err;
    }

    const overlay =
      typeof document !== "undefined"
        ? document.getElementById("react-billing-embedded-modal")
        : null;

    try {
      if (overlay) overlay.classList.remove("hidden");

      // Send both tierId (new) and tier_id (legacy) so BE can handle either safely
      const res = await secureFetch(`${apiBase()}/api/stripe/embedded-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId, tier_id: tierId, interval }),
      });

      const data = await res.json();
      console.log("📦 Server Response:", data);

      const fromFree = this.isFreePlanBeforeUpgrade === true;
      const intervalChanged = previousInterval !== interval;
      const context: CheckoutContext = { fromFree, intervalChanged };

      // Card-on-file upgrade handled fully server-side
      if (data.success || data.embedded_handled === true) {
        if (overlay) overlay.classList.add("hidden");
        await this.loadUserBillingInfo();
        onComplete?.();
        return { mode: "server_handled", context };
      }

      // Backend says: card must be re-authenticated
      if (data.require_payment_update) {
        console.warn("⚠️ Card needs update");
        if (overlay) overlay.classList.add("hidden");
        return { mode: "require_payment_update", context };
      }

      if (!res.ok || !data.clientSecret) {
        if (overlay) overlay.classList.add("hidden");
        const err = new Error(data.error || "Missing Stripe clientSecret");
        onError?.(err);
        throw err;
      }

      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: data.clientSecret,
        onComplete: async () => {
          if (overlay) overlay.classList.add("hidden");
          await this.loadUserBillingInfo();
          onComplete?.();
        },
      });

      checkout.mount("#react-billing-stripe-element");

      const debugEl =
        typeof document !== "undefined"
          ? document.getElementById("react-billing-stripe-debug")
          : null;
      if (debugEl) debugEl.textContent = "";

      return { mode: "embedded_checkout", checkout, context };
    } catch (err) {
      console.error("❌ Stripe checkout failed:", err);
      if (overlay) overlay.classList.add("hidden");
      onError?.(err as Error);
      throw err;
    }
  }

  async confirmUpgrade(
    tierId: number,
    interval: "month" | "year",
    currentPlanId: number,
    currentInterval: "month" | "year"
  ) {
    return this.openStripeEmbeddedCheckout(
      tierId,
      interval,
      currentPlanId,
      currentInterval
    );
  }

  /* ============================================
     💳 UPDATE CARD (embedded)
     ============================================ */

  async openStripeUpdateCardSession(
    onComplete?: () => void,
    onError?: (error: Error) => void
  ): Promise<{ mode: "update_card"; checkout: any } | null> {
    const stripe = await this.getStripe();
    if (!stripe) {
      const err = new Error("Stripe failed to load");
      console.error("[billing] getStripe failed (update-card):", err);
      onError?.(err);
      return null;
    }

    const overlay =
      typeof document !== "undefined"
        ? document.getElementById("react-billing-updatecard-modal")
        : null;

    try {
      if (overlay) overlay.classList.remove("hidden");

      const res = await secureFetch(`${apiBase()}/api/stripe/update-payment-method`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.clientSecret) {
        if (overlay) overlay.classList.add("hidden");
        const err = new Error(data.error || "Missing clientSecret");
        console.error("❌ Failed to launch update card session:", err);
        onError?.(err);
        return null;
      }

      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: data.clientSecret,
        onComplete: async () => {
          if (overlay) overlay.classList.add("hidden");
          await this.loadUserBillingInfo();
          onComplete?.();
        },
      });

      checkout.mount("#react-billing-updatecard-element");
      return { mode: "update_card", checkout };
    } catch (err) {
      console.error("❌ Failed to launch update card session:", err);
      if (overlay) overlay.classList.add("hidden");
      onError?.(err as Error);
      return null;
    }
  }

  /* ============================================
     💳 CANCEL / REACTIVATE / DOWNGRADE
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

  async reactivateSubscription(): Promise<{ success: boolean }> {
    try {
      const res = await secureFetch(`${apiBase()}/api/reactivate-subscription`, {
        method: "POST",
      });
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
        body: JSON.stringify({ tierId, tier_id: tierId, interval }),
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
    return (
      this.pricingTiers.find(
        (tier) => events >= tier.min_events && events <= tier.max_events
      ) || null
    );
  }

  calculatePrice(tier: PricingTier, interval: "month" | "year"): number {
    const monthly = tier.monthly_price;
    return interval === "year" ? Math.ceil(monthly * 0.8) : monthly;
  }
}

/* ============================================
   🔄 SINGLETON STORE + HOOK
   ============================================ */

export const billingStore = new BillingStore();

/**
 * React hook wrapper around the billing store.
 */
export function useBilling() {
  const qc = useQueryClient();

  const infoQ = useQuery({
    queryKey: ["billing:info"],
    queryFn: () => billingStore.loadUserBillingInfo(),
    staleTime: 30_000,
  });

  const tiersQ = useQuery({
    queryKey: ["billing:tiers"],
    queryFn: () => billingStore.loadPricingTiers(),
    staleTime: 60_000,
  });

  const invoicesQ = useQuery({
    queryKey: ["billing:invoices"],
    queryFn: () => billingStore.loadInvoices(),
    staleTime: 30_000,
  });

  const startEmbeddedCheckout = async (
    tierId: number,
    interval: "month" | "year",
    onSuccess?: () => void
  ): Promise<EmbeddedCheckoutResult> => {
    const currentPlanId = infoQ.data?.plan_id || 0;
    const currentInterval = infoQ.data?.interval || "month";

    return billingStore.openStripeEmbeddedCheckout(
      tierId,
      interval,
      currentPlanId,
      currentInterval,
      async () => {
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["billing:info"] }),
          qc.invalidateQueries({ queryKey: ["billing:invoices"] }),
        ]);
        onSuccess?.();
      }
    );
  };

  const startUpdateCard = async (onSuccess?: () => void) => {
    return billingStore.openStripeUpdateCardSession(async () => {
      await qc.invalidateQueries({ queryKey: ["billing:info"] });
      onSuccess?.();
    });
  };

  const cancelSubscription = async () => {
    const result = await billingStore.cancelSubscription();
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
    return result;
  };

  const reactivateSubscription = async () => {
    const result = await billingStore.reactivateSubscription();
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
    return result;
  };

  const cancelDowngrade = async () => {
    const result = await billingStore.cancelDowngrade();
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
    return result;
  };

  const confirmDowngrade = async (tierId: number, interval: "month" | "year") => {
    await billingStore.confirmDowngrade(tierId, interval);
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  };

  const isDowngrade = (tierId: number, interval: "month" | "year") => {
    return billingStore.isDowngrade(tierId, interval);
  };

  const updateSelectedTier = (
    tierId: number,
    interval: "month" | "year",
    tier: PricingTier,
    price: number
  ) => {
    billingStore.updateSelectedTier(tierId, interval, tier, price);
  };

  return {
    loading: infoQ.isLoading || tiersQ.isLoading || invoicesQ.isLoading,
    info: infoQ.data,
    tiers: tiersQ.data || [],
    invoices: invoicesQ.data || [],
    isFreePlan: billingStore.isFreePlan(),
    isFreeForever: billingStore.isFreeForever(),
    paymentMethod: billingStore.getPaymentMethod(),

    startEmbeddedCheckout,
    startUpdateCard,
    cancelSubscription,
    reactivateSubscription,
    cancelDowngrade,
    confirmDowngrade,
    isDowngrade,
    updateSelectedTier,
  };
}
