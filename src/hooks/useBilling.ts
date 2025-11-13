// src/hooks/useBilling.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BillingInfo,
  PricingTier,
  getBillingInfo,
  getPricingTiers,
  getStripeRuntime,
  createEmbeddedSession,
  openUpdateCardSession,
  cancelSubscription as apiCancel,
  reactivateSubscription as apiReactivate,
  cancelDowngrade as apiCancelDowngrade,
  listInvoices,
  InvoiceRow,
} from "@/services/billingService";

export type UpgradeSelection = {
  tier: PricingTier | null;
  interval: "month" | "year";
  price: number;
  label: string; // e.g., "25,000 events/month"
};

export function useBilling() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [stripeKey, setStripeKey] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [i, t] = await Promise.all([getBillingInfo(), getPricingTiers()]);
      setInfo(i);
      setTiers(t);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    getStripeRuntime().then((r) => setStripeKey(r.publishableKey)).catch(() => setStripeKey(null));
    listInvoices().then((r) => setInvoices(r.data || [])).catch(() => setInvoices([]));
  }, [refresh]);

  const isFreeForever = useMemo(
    () => String(info?.is_free_forever) === "1" || info?.is_free_forever === true,
    [info]
  );

  const isFreePlan = useMemo(() => {
    if (!info) return false;
    return isFreeForever || info.price === 0 || info.interval == null || (info.plan_name || "").toLowerCase().includes("free");
  }, [info, isFreeForever]);

  // Actions
  const startEmbeddedCheckout = useCallback(
    async (tierId: number, interval: "month" | "year", onComplete: () => void) => {
      const stripe = (window as any).Stripe && stripeKey ? (window as any).Stripe(stripeKey) : null;
      const res = await createEmbeddedSession({ tier_id: tierId, interval });

      // Server-side handled (card on file / upgrade executed)
      if (res.success === true || res.embedded_handled === true) {
        await refresh();
        onComplete();
        return;
      }

      if (!stripe || !res.clientSecret) throw new Error("Missing Stripe clientSecret");

      const modal = document.getElementById("react-billing-embedded-modal") as HTMLDivElement | null;
      modal?.classList.remove("hidden");

      const checkout = await stripe.initEmbeddedCheckout({
        clientSecret: res.clientSecret,
        onComplete: async () => {
          modal?.classList.add("hidden");
          await refresh();
          onComplete();
        },
      });

      checkout.mount("#react-billing-stripe-element");
    },
    [stripeKey, refresh]
  );

  const startUpdateCard = useCallback(async () => {
    const stripe = (window as any).Stripe && stripeKey ? (window as any).Stripe(stripeKey) : null;
    const res = await openUpdateCardSession();
    if (!stripe || !res.clientSecret) throw new Error("Missing clientSecret");

    const modal = document.getElementById("react-billing-updatecard-modal") as HTMLDivElement | null;
    modal?.classList.remove("hidden");

    const checkout = await stripe.initEmbeddedCheckout({
      clientSecret: res.clientSecret,
      onComplete: async () => {
        modal?.classList.add("hidden");
        await refresh();
      },
    });

    checkout.mount("#react-billing-updatecard-element");
  }, [stripeKey, refresh]);

  const cancelSubscription = useCallback(async () => {
    await apiCancel();
    await refresh();
  }, [refresh]);

  const reactivateSubscription = useCallback(async () => {
    await apiReactivate();
    await refresh();
  }, [refresh]);

  const cancelDowngrade = useCallback(async () => {
    await apiCancelDowngrade();
    await refresh();
  }, [refresh]);

  return {
    loading,
    info,
    tiers,
    invoices,
    isFreeForever,
    isFreePlan,
    stripeKey,
    refresh,
    startEmbeddedCheckout,
    startUpdateCard,
    cancelSubscription,
    reactivateSubscription,
    cancelDowngrade,
  };
}
