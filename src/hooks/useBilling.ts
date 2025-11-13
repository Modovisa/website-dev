// src/hooks/useBilling.ts
import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

/* ---------------- Globals from basil script ---------------- */
declare global {
  interface Window {
    Stripe?: (pk: string) => any;
  }
}

/* ---------------- Internals ---------------- */
let stripePromise: Promise<any | null> | null = null;

async function jsonSecure<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await secureFetch(url, init);
  const data = await res.json();
  if (!res.ok) throw new Error((data && (data.error as string)) || "Request failed");
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

/** Wait for window.Stripe injected by basil script, with a short timeout (Firefox/ETP friendly). */
function waitForStripeGlobal(maxMs = 6000, stepMs = 120): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (typeof window !== "undefined" && typeof window.Stripe === "function") return resolve();
      if (Date.now() - start >= maxMs) return reject(new Error("Stripe.js global not available"));
      setTimeout(tick, stepMs);
    };
    tick();
  });
}

const getStripe = () => {
  if (!stripePromise) {
    stripePromise = (async () => {
      const pk = await resolvePublishableKey();
      if (!pk) {
        console.warn("[billing] Stripe publishable key could not be resolved.");
      }
      await waitForStripeGlobal().catch((e) => {
        console.error("[billing] window.Stripe not ready:", e);
        return null;
      });
      if (!window.Stripe) return null;
      try {
        return window.Stripe(pk);
      } catch (err) {
        console.error("[billing] window.Stripe(init) failed:", err);
        return null;
      }
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

  // Pricing tiers
  const tiersQ = useQuery({
    queryKey: ["billing:tiers"],
    queryFn: async () => jsonSecure<PricingTier[]>(`${apiBase()}/api/billing-pricing-tiers`),
    staleTime: 60_000,
  });

  // Invoices
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
      if (!stripe) {
        console.error("[billing] Stripe failed to load/initialize.");
        throw new Error("Stripe failed to load");
      }

      // Ask backend for an Embedded Checkout client_secret for this tier/interval
      const resp = await jsonSecure<any>(`${apiBase()}/api/stripe/embedded-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier_id: tierId, interval }),
      });

      // ✅ Server-side success fallback (card already on file)
      if (resp?.success === true || resp?.embedded_handled === true) {
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
        console.error("[billing] Missing Stripe client secret in response:", resp);
        throw new Error(resp?.error || "Missing Stripe client secret");
      }

      // Show the modal shell; keep it open even on mount errors (debuggable)
      show("react-billing-embedded-modal");

      // Mount Embedded Checkout
      let checkout: any | null = null;
      try {
        checkout = await stripe.initEmbeddedCheckout({ clientSecret });
        await checkout.mount("#react-billing-stripe-element");
        onMounted?.();
      } catch (e) {
        console.error("[billing] initEmbeddedCheckout/mount failed:", e);
        // Do NOT auto-close; leave modal visible for diagnostics.
        throw e;
      }

      // Close handlers: overlay click or Escape
      const modalEl = document.getElementById("react-billing-embedded-modal");
      const cleanup = () => {
        try {
          checkout?.destroy();
        } catch {}
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
    cancelSubscription,
    reactivateSubscription,
    cancelDowngrade,
  };
}
