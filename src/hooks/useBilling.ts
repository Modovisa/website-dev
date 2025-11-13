// src/hooks/useBilling.ts
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadStripe, Stripe, StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { apiBase, authHeaders } from "@/lib/api";

// ---------------- Types ----------------
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

// ---------------- Internals ----------------
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
    if (!pk) {
      console.warn("VITE_STRIPE_PUBLISHABLE_KEY is missing.");
    }
    stripePromise = loadStripe(pk || "");
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

// ---------------- Hook ----------------
export function useBilling() {
  const qc = useQueryClient();

  // Info
  const infoQ = useQuery({
    queryKey: ["billing:info"],
    queryFn: async () =>
      json<BillingInfo>(`${apiBase()}/api/user-billing-info`, {
        headers: { ...(await authHeaders()) },
      }),
    staleTime: 30_000,
  });

  // Tiers
  const tiersQ = useQuery({
    queryKey: ["billing:tiers"],
    queryFn: async () =>
      json<{ tiers: PricingTier[] }>(`${apiBase()}/api/billing/tiers`, {
        headers: { ...(await authHeaders()) },
      }).then((r) => r.tiers),
    staleTime: 60_000,
  });

  // Invoices
  const invoicesQ = useQuery({
    queryKey: ["billing:invoices"],
    queryFn: async () =>
      json<{ invoices: Invoice[] }>(`${apiBase()}/api/stripe/invoices`, {
        headers: { ...(await authHeaders()) },
      }).then((r) => r.invoices),
    staleTime: 30_000,
  });

  // ---------------- Actions ----------------

  /**
   * Launches Stripe Embedded Checkout inside
   * #react-billing-embedded-modal > #react-billing-stripe-element
   */
  const startEmbeddedCheckout = useCallback(
    async (
      tierId: number,
      interval: "month" | "year",
      onMounted?: () => void
    ) => {
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

      // Open the modal shell
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

      // Close on overlay click or Escape
      const modalEl = document.getElementById("react-billing-embedded-modal");
      const onKey = (ev: KeyboardEvent) => {
        if (ev.key === "Escape") {
          checkout?.destroy();
          hide("react-billing-embedded-modal");
          window.removeEventListener("keydown", onKey);
          // refresh current plan
          qc.invalidateQueries({ queryKey: ["billing:info"] });
          qc.invalidateQueries({ queryKey: ["billing:invoices"] });
        }
      };
      modalEl?.addEventListener("click", (e) => {
        if (e.target === modalEl) {
          checkout?.destroy();
          hide("react-billing-embedded-modal");
          window.removeEventListener("keydown", onKey);
          qc.invalidateQueries({ queryKey: ["billing:info"] });
          qc.invalidateQueries({ queryKey: ["billing:invoices"] });
        }
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
    const elements = stripe.elements({ clientSecret: client_secret, appearance: { theme: "stripe" } });
    const paymentElement = elements.create("payment");
    paymentElement.mount("#react-billing-updatecard-element");

    // Submit on Enter (optional) — you can wire a button if you add one to the modal
    const submit = async () => {
      const { error } = await stripe.confirmSetup({ elements, redirect: "if_required" });
      if (error) {
        // keep modal open; your page can toast the error
        return;
      }
      // success
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

  // ---------------- Exports ----------------
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
