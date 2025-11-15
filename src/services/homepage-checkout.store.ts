// src/services/homepage-checkout.store.ts

import { secureFetch } from "@/lib/auth";

export const INTENT_KEY = "intent_upgrade";

export type Interval = "month" | "year";

export type PublicPricingTier = {
  id: number;
  name: string;
  min_events: number;
  max_events: number;
  monthly_price: number;
  plan_id?: number;
  stripe_price_id_month?: string | null;
  stripe_price_id_year?: string | null;
};

export type BillingIntent = {
  tier_id: number;
  interval: Interval;
};

type SelectedTierMeta = {
  tier_id: number;
  plan_id?: number;
  interval: Interval;
  price: number;
  stripe_price_id?: string | null;
  label: string;
};

type RouteOptions = {
  navigate: (path: string) => void;
  /**
   * If false, we won't attempt embedded checkout – we'll just route to profile.
   * Default: true
   */
  autoCheckout?: boolean;
};

declare global {
  interface Window {
    Stripe?: any;
    showGlobalLoadingModal?: (msg?: string) => void;
    hideGlobalLoadingModal?: () => void;
  }
}

let pricingTiersCache: PublicPricingTier[] | null = null;
let stripePromise: Promise<any> | null = null;

/* ---------------- LocalStorage helpers ---------------- */

export function getValidParsedIntent(): BillingIntent | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.tier_id || !parsed.interval) return null;
    if (parsed.interval !== "month" && parsed.interval !== "year") return null;
    return {
      tier_id: Number(parsed.tier_id),
      interval: parsed.interval as Interval,
    };
  } catch {
    return null;
  }
}

export function setIntent(intent: BillingIntent) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INTENT_KEY, JSON.stringify(intent));
  } catch {
    // non-fatal
  }
}

export function clearBillingIntent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(INTENT_KEY);
  } catch {
    // ignore
  }
}

function getNewSignupFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("mv_new_signup") === "1";
  } catch {
    return false;
  }
}

function clearNewSignupFlag() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("mv_new_signup");
  } catch {
    // ignore
  }
}

/* ---------------- Pricing tiers ---------------- */

async function fetchPublicPricingTiers(): Promise<PublicPricingTier[]> {
  const res = await secureFetch("/api/billing-pricing-tiers?public=1");
  if (!res.ok) {
    console.error(
      "[homepage-checkout] failed to load public pricing tiers:",
      res.status,
    );
    return [];
  }
  const json = await res.json().catch(() => null);
  if (!Array.isArray(json)) return [];
  return json as PublicPricingTier[];
}

export async function getPublicPricingTiers(): Promise<PublicPricingTier[]> {
  if (pricingTiersCache) return pricingTiersCache;
  pricingTiersCache = await fetchPublicPricingTiers();
  return pricingTiersCache;
}

function pickCheapestTier(tiers: PublicPricingTier[]): PublicPricingTier | null {
  if (!tiers.length) return null;
  return [...tiers].sort(
    (a, b) => (a.max_events ?? 0) - (b.max_events ?? 0),
  )[0];
}

/* ---------------- Stripe helpers ---------------- */

async function getStripe(): Promise<any> {
  if (stripePromise) return stripePromise;

  stripePromise = (async () => {
    const res = await secureFetch("/api/stripe/runtime-config");
    const data = await res.json().catch(() => ({} as any));

    if (!res.ok || !data?.publishableKey) {
      throw new Error(
        data?.error || "Failed to resolve Stripe publishable key",
      );
    }

    if (typeof window === "undefined" || typeof window.Stripe !== "function") {
      throw new Error(
        "Stripe.js not available. Make sure the Stripe script is loaded in index.html",
      );
    }

    return window.Stripe(data.publishableKey);
  })();

  return stripePromise;
}

async function createEmbeddedSession(intent: BillingIntent) {
  const res = await secureFetch("/api/stripe/embedded-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tier_id: intent.tier_id,
      interval: intent.interval,
    }),
  });

  const data = await res.json().catch(() => ({} as any));

  if (!res.ok || !data?.clientSecret) {
    clearBillingIntent();
    throw new Error(
      data?.error ||
        `Embedded session failed (${res.status}) or missing clientSecret`,
    );
  }

  return data.clientSecret as string;
}

/**
 * Very simple fullscreen overlay for embedded checkout.
 * Doesn't depend on any React component – pure DOM so it works from anywhere.
 */
async function mountEmbeddedCheckoutOverlay(
  clientSecret: string,
  opts?: { onComplete?: () => void },
) {
  const stripe = await getStripe();

  // Create overlay
  const overlay = document.createElement("div");
  overlay.id = "mv-stripe-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "9999";
  overlay.style.background =
    "rgba(0, 0, 0, 0.45)"; // dark backdrop
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const container = document.createElement("div");
  container.id = "mv-stripe-embedded-root";
  container.style.width = "min(480px, 100%)";
  container.style.maxWidth = "100%";
  container.style.background = "#0b0b0f";
  container.style.borderRadius = "16px";
  container.style.padding = "24px";
  container.style.boxShadow =
    "0 24px 60px rgba(0, 0, 0, 0.65)";

  // Optional close X (in case user bounces)
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.style.position = "absolute";
  closeBtn.style.top = "16px";
  closeBtn.style.right = "16px";
  closeBtn.style.fontSize = "24px";
  closeBtn.style.background = "transparent";
  closeBtn.style.color = "#ffffff";
  closeBtn.style.border = "none";
  closeBtn.style.cursor = "pointer";

  closeBtn.addEventListener("click", () => {
    try {
      document.body.removeChild(overlay);
    } catch {
      // ignore
    }
  });

  overlay.appendChild(container);
  overlay.appendChild(closeBtn);
  document.body.appendChild(overlay);

  const cleanup = () => {
    try {
      document.body.removeChild(overlay);
    } catch {
      // ignore
    }
    opts?.onComplete?.();
  };

  // NOTE: initEmbeddedCheckout returns quickly; onComplete fires when payment finishes.
  const checkout = await stripe.initEmbeddedCheckout({
    clientSecret,
    onComplete: cleanup,
  });

  checkout.mount("#mv-stripe-embedded-root");
}

/* ---------------- Intent → SelectedTierMeta ---------------- */

function buildSelectedTierMeta(
  tier: PublicPricingTier,
  intent: BillingIntent,
): SelectedTierMeta {
  const baseMonthly = tier.monthly_price ?? 0;
  const isYearly = intent.interval === "year";
  const price = isYearly ? Math.ceil(baseMonthly * 0.8) : baseMonthly;

  return {
    tier_id: tier.id,
    plan_id: tier.plan_id,
    interval: intent.interval,
    price,
    stripe_price_id: isYearly
      ? tier.stripe_price_id_year ?? null
      : tier.stripe_price_id_month ?? null,
    label: `${tier.max_events.toLocaleString()} events/${
      isYearly ? "year" : "month"
    }`,
  };
}

/* ---------------- Main router (React entry point) ---------------- */

/**
 * React-friendly version of the Bootstrap `routeAfterLoginFromHomepage`.
 *
 * Usage: after a successful homepage registration (modal),
 * call:
 *
 *   await routeAfterLoginFromHomepageReact({ navigate });
 *
 * It will:
 *  - Fetch /api/me
 *  - Decide new vs existing user
 *  - For existing user or already subscribed → go to /app/user-profile
 *  - For new user without subscription → derive intent and open embedded checkout
 *  - On successful checkout completion → route to /app/tracking-setup
 */
export async function routeAfterLoginFromHomepageReact(
  opts: RouteOptions,
): Promise<void> {
  const { navigate, autoCheckout = true } = opts;

  let me: any = null;
  try {
    const res = await secureFetch("/api/me");
    if (!res.ok) return;
    me = await res.json().catch(() => null);
  } catch (err) {
    console.error("[homepage-checkout] /api/me failed:", err);
    return;
  }

  const isNew = !!me?.is_new_user;
  const hasSub = !!me?.has_active_subscription;
  const newFlag = getNewSignupFlag();
  const treatAsNew = isNew || newFlag;

  // Existing user or already subscribed → profile (no checkout here)
  if (!treatAsNew || hasSub) {
    clearBillingIntent();
    clearNewSignupFlag();
    if (window.showGlobalLoadingModal) {
      window.showGlobalLoadingModal("Redirecting to your profile...");
    }
    navigate("/app/user-profile");
    return;
  }

  // New user, no subscription yet → need intent
  let intent = getValidParsedIntent();

  let tiers: PublicPricingTier[] = [];
  try {
    tiers = await getPublicPricingTiers();
  } catch (err) {
    console.error("[homepage-checkout] failed to load tiers:", err);
  }

  if (!intent) {
    // Fallback: smallest tier, monthly
    const cheapest = pickCheapestTier(tiers);
    if (cheapest) {
      intent = { tier_id: cheapest.id, interval: "month" };
      setIntent(intent);
    }
  }

  if (!intent) {
    // No intent at all → just go to tracking setup, don't get stuck
    clearNewSignupFlag();
    if (window.showGlobalLoadingModal) {
      window.showGlobalLoadingModal("Setting up your dashboard...");
    }
    navigate("/app/tracking-setup");
    return;
  }

  // If we've been told not to auto-checkout from here, just go to profile
  if (!autoCheckout) {
    navigate("/app/user-profile");
    return;
  }

  const tier = tiers.find((t) => t.id === intent!.tier_id);
  if (!tier) {
    clearBillingIntent();
    clearNewSignupFlag();
    if (window.showGlobalLoadingModal) {
      window.showGlobalLoadingModal("Setting up your dashboard...");
    }
    navigate("/app/tracking-setup");
    return;
  }

  const selected = buildSelectedTierMeta(tier, intent);

  if (window.showGlobalLoadingModal) {
    window.showGlobalLoadingModal("Preparing checkout...");
  }

  try {
    const clientSecret = await createEmbeddedSession(intent);

    await mountEmbeddedCheckoutOverlay(clientSecret, {
      onComplete: () => {
        clearBillingIntent();
        clearNewSignupFlag();
        if (window.showGlobalLoadingModal) {
          window.showGlobalLoadingModal("Setting up your dashboard...");
        }
        navigate("/app/tracking-setup");
      },
    });
  } catch (err) {
    console.error("[homepage-checkout] embedded checkout error:", err);
    clearBillingIntent();
    clearNewSignupFlag();
    if (window.showGlobalLoadingModal) {
      window.showGlobalLoadingModal("Setting up your dashboard...");
    }
    navigate("/app/tracking-setup");
  } finally {
    window.hideGlobalLoadingModal?.();
  }
}
