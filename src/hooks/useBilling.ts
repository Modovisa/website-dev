// src/hooks/useBilling.ts
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe, Stripe, StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { apiBase, authHeaders } from "@/lib/api";

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
  | { mode?: "test" | "live"; test_pk?: string; live_pk?: string }; // support both shapes

/* ---------------- Internals ---------------- */
let stripePromise: Promise<Stripe | null> | null = null;

async function resolvePublishableKey(): Promise<string> {
  // 1) Prefer Vite env for local/dev overrides
  const envPk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  if (envPk && envPk.trim()) return envPk;

  // 2) Fall back to runtime-config controlled from Admin (your screenshot)
  try {
    const res = await fetch(`${apiBase()}/api/stripe/runtime-config`, {
      // no caching; this is cheap and keeps Test/Live in sync with admin
      cache: "no-store",
      headers: { ...(await authHeaders()) },
    });
    const j: RuntimeStripeConfig = await res.json();

    // Accept either direct `publishableKey` or a (mode, test_pk, live_pk) trio
    if ("publishableKey" in j && j.publishableKey) return j.publishableKey;

    const mode = j.mode || "test";
    const pick =
      mode === "live"
        ? (j as any).live_pk || (j as any).livePublishableKey
        : (j as any).test_pk || (j as any).testPublishableKey;

    if (pick && typeof pick === "string") return pick;
  } catch {
    // ignore; final fallback below
  }

  // 3) Last-resort empty key (Stripe will error visibly)
  return "";
}

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = (async () => {
      const pk = await resolvePublishableKey();
      if (!pk) {
        console.warn("Stripe publishable key could not be resolved (env or runtime-config).");
      }
      return loadStripe(pk);
    })();
  }
  return stripePromise;
};

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const data = (await res.json()) as any;
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data as T;
}

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
    queryFn: async () =>
      json<BillingInfo>(`${apiBase()}/api/user-billing-info`, {
        headers: { ...(await authHeaders()) },
      }),
    staleTime: 30_000,
  });

  // Pricing tiers (Bootstrap parity: array)
  const tiersQ = useQuery({
    queryKey: ["billing:tiers"],
    queryFn: async () =>
      json<PricingTier[]>(`${apiBase()}/api/billing-pricing-tiers`, {
        headers: { ...(await authHeaders()) },
      }),
    staleTime: 60_000,
  });

  // Invoices (Bootstrap parity: { data: Invoice[] })
  const invoicesQ = useQuery({
    queryKey: ["billing:invoices"],
    queryFn: async () =>
      json<{ data: Invoice[] }>(`${apiBase()}/api/user/invoices`, {
        headers: { ...(await authHeaders()) },
      }).then((r) => r.data || []),
    staleTime: 30_000,
  });

  /* -------- Actions -------- */

  /**
   * Launches Stripe Embedded Checkout inside:
   * #react-billing-embedded-modal > #react-billing-stripe-element
   */
  const startEmbeddedCheckout = useCallback(
    async (tierId: number, interval: "month" | "year", onMounted?: () => void) => {
      const stripe = await getStripe();
      if (!stripe) throw new Error("Stripe failed to load");

      // Ask backend for an Embedded Checkout client_secret for this tier/interval
      const { client_secret } = await json<{ client_secret: string }>(
        `${apiBase()}/api/stripe/embedded-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(await authHeaders()),
          },
          body: JSON.stringify({ tier_id: tierId, interval }),
        }
      );

      // Show the modal shell
      show("react-billing-embedded-modal");

      // Mount Embedded Checkout
      let checkout: StripeEmbeddedCheckout | null = null;
      try {
        checkout = await stripe.initEmbeddedCheckout({ clientSecret: client_secret });
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
        // refresh plan + invoices
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

  /**
   * Opens a small modal and mounts a Payment Element for updating the card.
   * Backend must return a SetupIntent client secret.
   */
  const startUpdateCard = useCallback(async () => {
    const stripe = await getStripe();
    if (!stripe) throw new Error("Stripe failed to load");

    // Ask backend for a SetupIntent client secret
    const { client_secret } = await json<{ client_secret: string }>(
      `${apiBase()}/api/stripe/update-payment-method`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders()),
        },
      }
    );

    // Show the modal shell
    show("react-billing-updatecard-modal");

    // Mount Elements + PaymentElement
    const elements = stripe.elements({
      clientSecret: client_secret,
      appearance: { theme: "stripe" },
    });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#react-billing-updatecard-element");

    const submit = async () => {
      const { error } = await stripe.confirmSetup({ elements, redirect: "if_required" });
      if (error) return; // Keep modal open for user to fix
      hide("react-billing-updatecard-modal");
      elements?.destroy();
    };

    // Close on overlay click or Escape
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

  const cancelSubscription = useCallback(async () => {
    await json(`${apiBase()}/api/stripe/cancel-subscription`, {
      method: "POST",
      headers: { ...(await authHeaders()) },
    });
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  }, [qc]);

  const reactivateSubscription = useCallback(async () => {
    await json(`${apiBase()}/api/stripe/reactivate`, {
      method: "POST",
      headers: { ...(await authHeaders()) },
    });
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  }, [qc]);

  const cancelDowngrade = useCallback(async () => {
    await json(`${apiBase()}/api/stripe/cancel-downgrade`, {
      method: "POST",
      headers: { ...(await authHeaders()) },
    });
    await qc.invalidateQueries({ queryKey: ["billing:info"] });
  }, [qc]);

  /* -------- Exports -------- */
  const loading = useMemo(
    () => infoQ.isLoading || tiersQ.isLoading || invoicesQ.isLoading,
    [infoQ.isLoading, tiersQ.isLoading, invoicesQ.isLoading]
  );

  const isFreePlan =
    !!infoQ.data?.is_free_plan || (!infoQ.data?.price && !infoQ.data?.interval);
  const isFreeForever =
    String(infoQ.data?.is_free_forever) === "1" || infoQ.data?.is_free_forever === true;

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
