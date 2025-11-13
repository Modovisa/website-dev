// src/hooks/useBilling.ts
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe, Stripe, StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth";

/* ---------------- Types ---------------- */
export type PricingTier = {
  id: number;
  name: string;
  min_events: number;
  max_events: number;
  monthly_price: number;
  is_popular?: boolean;
};

export type BillingInfo = {
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
};

type Invoice = {
  id: string;
  number: string;
  amount_due: number;
  status: string;
  created_at: string;
  invoice_pdf?: string | null;
};

type RuntimeStripeConfig =
  | { publishableKey?: string; mode?: "test" | "live" }
  | { mode?: "test" | "live"; test_pk?: string; live_pk?: string };

/* ---------------- Internals ---------------- */
let stripePromise: Promise<Stripe | null> | null = null;

async function jsonSecure<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await secureFetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error((data && data.error) || "Request failed");
  return data as T;
}

async function resolvePublishableKey(): Promise<string> {
  // 1) Prefer Vite env override for local/dev
  const envPk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (envPk && envPk.trim()) return envPk;

  // 2) Admin runtime config (Test/Live)
  try {
    const j = await jsonSecure<RuntimeStripeConfig>(`${apiBase()}/api/stripe/runtime-config`, {
      cache: "no-store",
    });
    if ("publishableKey" in j && j.publishableKey) return j.publishableKey!;
    const mode = j.mode || "test";
    const pick =
      mode === "live"
        ? (j as any).live_pk || (j as any).livePublishableKey
        : (j as any).test_pk || (j as any).testPublishableKey;
    if (pick && typeof pick === "string") return pick;
  } catch {
    /* noop – fall through */
  }
  return "";
}

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = (async () => {
      const pk = await resolvePublishableKey();
      if (!pk) console.warn("Stripe publishable key could not be resolved.");
      return loadStripe(pk);
    })();
  }
  return stripePromise;
};

function show(id: string) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("hidden");
}
function hide(id: string) {
  const el = document.getElementById(id);
  if (el) el.classList.add("hidden");
}

/* ---------------- Hook ---------------- */
export function useBilling() {
  const qc = useQueryClient();

  // Current billing info
  const infoQ = useQuery({
    queryKey: ["billing:info"],
    queryFn: async () => jsonSecure<BillingInfo>(`${apiBase()}/api/user-billing-info`),
    staleTime: 30_000,
  });

  // Pricing tiers (array)
  const tiersQ = useQuery({
    queryKey: ["billing:tiers"],
    queryFn: async () => jsonSecure<PricingTier[]>(`${apiBase()}/api/billing-pricing-tiers`),
    staleTime: 60_000,
  });

  // Invoices ({ data: [...] })
  const invoicesQ = useQuery({
    queryKey: ["billing:invoices"],
    queryFn: async () =>
      jsonSecure<{ data: Invoice[] }>(`${apiBase()}/api/user/invoices`).then((r) => r.data || []),
    staleTime: 30_000,
  });

  /* -------- Actions -------- */

  /** Stripe Embedded Checkout inside #react-billing-embedded-modal */
    const startEmbeddedCheckout = useCallback(
    async (tierId: number, interval: "month" | "year", onMounted?: () => void) => {
      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe failed to load");

      // Ask backend for an Embedded Checkout client_secret for this tier/interval
      const resp = await jsonSecure<any>(`${apiBase()}/api/stripe/embedded-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, interval }),
      });

      // ✅ If server handled the upgrade without a checkout (card on file), treat as success
      if (resp?.success === true || resp?.embedded_handled === true) {
        // refresh plan + invoices, then let caller close their UI
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["billing:info"] }),
          qc.invalidateQueries({ queryKey: ["billing:invoices"] }),
        ]);
        onMounted?.();
        return;
      }

      // Normal embedded flow
      const clientSecret: string | undefined = resp?.client_secret || resp?.clientSecret;
      if (!clientSecret) {
        throw new Error(resp?.error || "Missing Stripe client secret");
      }

      // Show the modal shell
      show("react-billing-embedded-modal");

      // Mount Embedded Checkout
      let checkout: StripeEmbeddedCheckout | null = null;
      try {
        checkout = await stripe.initEmbeddedCheckout({ clientSecret });
        await checkout.mount("#react-billing-stripe-element");
        onMounted?.();
      } catch (e) {
        hide("react-billing-embedded-modal");
        throw e;
      }

      // Close handlers: overlay click or Escape
      const modalEl = document.getElementById("react-billing-embedded-modal");
      const cleanup = () => {
        checkout?.destroy();
        hide("react-billing-embedded-modal");
        window.removeEventListener("keydown", onKey);
        qc.invalidateQueries({ queryKey: ["billing:info"] });
        qc.invalidateQueries({ queryKey: ["billing:invoices"] });
      };
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") cleanup();
      };
      modalEl?.addEventListener("click", (e) => {
        if (e.target === modalEl) cleanup();
      });
      window.addEventListener("keydown", onKey);
    },
    [qc]
  );


  /** Update card via SetupIntent + Payment Element in #react-billing-updatecard-modal */
  const startUpdateCard = useCallback(async () => {
    const stripe = await getStripe();
    if (!stripe) throw new Error("Stripe failed to load");

    const { client_secret } = await jsonSecure<{ client_secret: string }>(
      `${apiBase()}/api/stripe/update-payment-method`,
      { method: "POST", headers: { "Content-Type": "application/json" } }
    );

    show("react-billing-updatecard-modal");

    const elements = stripe.elements({ clientSecret: client_secret, appearance: { theme: "stripe" } });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#react-billing-updatecard-element");

    const submit = async () => {
      const { error } = await stripe.confirmSetup({ elements, redirect: "if_required" });
      if (error) return;
      hide("react-billing-updatecard-modal");
      elements?.destroy();
    };

    const modalEl = document.getElementById("react-billing-updatecard-modal");
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        hide("react-billing-updatecard-modal");
        elements?.destroy();
        window.removeEventListener("keydown", onKey);
      }
      if (ev.key === "Enter") submit();
    };
    modalEl?.addEventListener("click", (e) => {
      if (e.target === modalEl) {
        hide("react-billing-updatecard-modal");
        elements?.destroy();
        window.removeEventListener("keydown", onKey);
      }
    });
    window.addEventListener("keydown", onKey);
  }, []);

  // Note: endpoints without /stripe prefix per your billingService.ts
  const cancelSubscription = useCallback(async () => {
    await jsonSecure(`${apiBase()}/api/cancel-subscription`, { method: "POST" });
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  }, [qc]);

  const reactivateSubscription = useCallback(async () => {
    await jsonSecure(`${apiBase()}/api/reactivate-subscription`, { method: "POST" });
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  }, [qc]);

  const cancelDowngrade = useCallback(async () => {
    await jsonSecure(`${apiBase()}/api/cancel-downgrade`, { method: "POST" });
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  }, [qc]);

  /* -------- Exports -------- */
  const loading = useMemo(
    () => infoQ.isLoading || tiersQ.isLoading || invoicesQ.isLoading,
    [infoQ.isLoading, tiersQ.isLoading, invoicesQ.isLoading]
  );

  const isFreePlan = !!infoQ.data?.is_free_plan || (!infoQ.data?.price && !infoQ.data?.interval);
  const isFreeForever = String(infoQ.data?.is_free_forever) === "1" || infoQ.data?.is_free_forever === true;

  return {
    // state
    loading,
    info: infoQ.data,
    tiers: tiersQ.data || [],
    invoices: invoicesQ.data || [],
    isFreePlan,
    isFreeForever,

    // actions
    startEmbeddedCheckout,
    startUpdateCard,
    cancelSubscription,
    reactivateSubscription,
    cancelDowngrade,
  };
}
