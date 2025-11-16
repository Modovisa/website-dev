// src/services/homepage-checkout.store.ts
// Homepage → registration → Stripe embedded checkout flow

import type { RangeKey, DashboardPayload } from "@/types/dashboard";
import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth";

/* ---------------- Types ---------------- */
export type GeoCityPoint = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  debug_ids?: string[];
};

export type Interval = "month" | "year";

export type PublicPricingTier = {
  id: number | string;
  name: string;
  min_events: number | string;
  max_events: number | string;
  monthly_price: number | string;
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
    // from old bootstrap helpers (if present)
    getApiBaseUrl?: () => string;
    __MV_API_BASE__?: string;
  }
}

export const INTENT_KEY = "intent_upgrade";

let pricingTiersCache: PublicPricingTier[] | null = null;
let stripePromise: Promise<any> | null = null;

/* ---------------- API base + fetch helpers ---------------- */

const DEFAULT_API_BASE = "https://api.modovisa.com";

/**
 * Try very hard to mirror the old Bootstrap flow:
 * - Prefer global getApiBaseUrl()/__MV_API_BASE__ if present
 * - Otherwise pick API based on current hostname
 *
 * NOTE: For dev.* we force https://api.modovisa.com (NOT dev-api)
 * because dev-api currently has CORS/credentials issues.
 */
function getApiBase(): string {
  if (typeof window === "undefined") {
    // SSR / tests – fall back to env, then prod API
    return (
      (import.meta as any).env?.VITE_API_BASE_URL ??
      DEFAULT_API_BASE
    );
  }

  const anyWin = window as any;

  // 1) Shared toggle from /public/api.js (if loaded)
  if (typeof anyWin.getApiBaseUrl === "function") {
    try {
      const v = anyWin.getApiBaseUrl();
      if (typeof v === "string" && v.length > 0) return v;
    } catch {
      // ignore
    }
  }

  // 2) Explicit override
  if (typeof anyWin.__MV_API_BASE__ === "string" && anyWin.__MV_API_BASE__) {
    return anyWin.__MV_API_BASE__;
  }

  // 3) Heuristic: dev host → **main** API (not dev-api)
  const host = window.location.hostname;
  if (host.startsWith("dev.")) {
    return "https://api.modovisa.com";
  }

  // 4) Fallback: prod API
  return DEFAULT_API_BASE;
}

/**
 * Cookie-based fetch that talks directly to the Worker API.
 * This deliberately does NOT use secureFetch – it mirrors the
 * old Bootstrap behaviour so cookies drive auth.
 */
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path}`;

  return fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
  });
}

/* ---------------- LocalStorage helpers ---------------- */

export function getValidParsedIntent(): BillingIntent | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(INTENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const rawTier = (parsed as any).tier_id ?? (parsed as any).tierId;
    const interval = (parsed as any).interval;
    if (!rawTier || !interval) return null;
    if (interval !== "month" && interval !== "year") return null;
    return {
      tier_id: Number(rawTier),
      interval,
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
  console.log("[homepage-checkout] fetching public pricing tiers...");

  let res: Response;
  try {
    res = await apiFetch("/api/billing-pricing-tiers?public=1");
  } catch (err) {
    console.error(
      "[homepage-checkout] /api/billing-pricing-tiers request failed:",
      err,
    );
    return [];
  }

  if (!res.ok) {
    console.error(
      "[homepage-checkout] /api/billing-pricing-tiers non-200:",
      res.status,
    );
    return [];
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch (err) {
    console.error(
      "[homepage-checkout] failed to parse pricing tiers JSON:",
      err,
    );
    return [];
  }

  if (!Array.isArray(json)) {
    console.error(
      "[homepage-checkout] unexpected pricing tiers payload (not array):",
      json,
    );
    return [];
  }

  console.log(
    "[homepage-checkout] fetched pricing tiers:",
    json.map((t: any) => ({
      id: t.id,
      name: t.name,
      max_events: t.max_events,
      monthly_price: t.monthly_price,
    })),
  );

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
    (a, b) =>
      Number(a.max_events ?? 0) - Number(b.max_events ?? 0),
  )[0];
}

/* ---------------- Stripe helpers (mirrors billing.store) ---------------- */

async function getStripe(): Promise<any> {
  if (stripePromise) return stripePromise;

  stripePromise = (async () => {
    console.log("[homepage-checkout] resolving Stripe runtime config...");

    let res: Response;
    try {
      res = await fetch(`${apiBase()}/api/stripe/runtime-config`, {
        cache: "no-store",
        credentials: "include",
      });
    } catch (err) {
      console.error(
        "[homepage-checkout] /api/stripe/runtime-config failed:",
        err,
      );
      throw err;
    }

    const data = await res.json().catch(() => ({} as any));

    if (!res.ok || !data?.publishableKey) {
      console.error(
        "[homepage-checkout] bad runtime-config response:",
        res.status,
        data,
      );
      throw new Error(
        data?.error || "Failed to resolve Stripe publishable key",
      );
    }

    if (
      typeof window === "undefined" ||
      typeof window.Stripe !== "function"
    ) {
      throw new Error(
        "Stripe.js not available. Make sure the Stripe basil script is loaded in index.html",
      );
    }

    console.log(
      "[homepage-checkout] Stripe runtime-config OK, initialising basil client...",
    );
    return window.Stripe(data.publishableKey);
  })();

  return stripePromise;
}

/**
 * IMPORTANT: payload + auth mirror billing.store.ts
 * (sends both tierId and tier_id so BE can handle either).
 */
async function createEmbeddedSession(intent: BillingIntent) {
  console.log(
    "[homepage-checkout] creating embedded session for intent:",
    intent,
  );

  let res: Response;
  try {
    res = await secureFetch(`${apiBase()}/api/stripe/embedded-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tierId: intent.tier_id,
        tier_id: intent.tier_id,
        interval: intent.interval,
      }),
    });
  } catch (err) {
    console.error(
      "[homepage-checkout] /api/stripe/embedded-session request failed:",
      err,
    );
    throw err;
  }

  const data = await res.json().catch(() => ({} as any));

  if (res.status === 401) {
    console.error(
      "[homepage-checkout] embedded-session 401 (unauthorized). " +
        "If Billing & Plans works but this does not, double-check that register/login " +
        "are wiring the same auth cookies / tokens used by secureFetch.",
      data,
    );
  }

  if (!res.ok || !data?.clientSecret) {
    clearBillingIntent();
    console.error(
      "[homepage-checkout] embedded session error response:",
      res.status,
      data,
    );
    throw new Error(
      data?.error ||
        `Embedded session failed (${res.status}) or missing clientSecret`,
    );
  }

  console.log("[homepage-checkout] embedded session OK");
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
  overlay.style.background = "rgba(0, 0, 0, 0.45)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";

  const container = document.createElement("div");
  container.id = "mv-stripe-embedded-root";
  container.style.position = "relative";
  container.style.width = "min(480px, 100%)";
  container.style.maxWidth = "100%";
  container.style.background = "#0b0b0f";
  container.style.borderRadius = "16px";
  container.style.padding = "24px";
  container.style.boxShadow = "0 24px 60px rgba(0, 0, 0, 0.65)";

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

  container.appendChild(closeBtn);
  overlay.appendChild(container);
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

/* ---------------- Intent → SelectedTierMeta (for logging/debug) ---------------- */

function buildSelectedTierMeta(
  tier: PublicPricingTier,
  intent: BillingIntent,
): SelectedTierMeta {
  const baseMonthly = Number(tier.monthly_price ?? 0);
  const isYearly = intent.interval === "year";
  const price = isYearly ? Math.ceil(baseMonthly * 0.8) : baseMonthly;

  const tierId = Number((tier as any).id ?? intent.tier_id);
  const maxEvents = Number(tier.max_events ?? 0);

  return {
    tier_id: tierId,
    plan_id: tier.plan_id,
    interval: intent.interval,
    price,
    stripe_price_id: isYearly
      ? tier.stripe_price_id_year ?? null
      : tier.stripe_price_id_month ?? null,
    label: `${maxEvents.toLocaleString()} events/${
      isYearly ? "year" : "month"
    }`,
  };
}

/* ---------------- Main router (React entry point) ---------------- */

export async function routeAfterLoginFromHomepageReact(
  opts: RouteOptions,
): Promise<void> {
  const { navigate, autoCheckout = true } = opts;

  console.log("[homepage-checkout] routeAfterLoginFromHomepageReact start", {
    autoCheckout,
  });

  let me: any = null;
  try {
    const res = await apiFetch("/api/me");
    if (!res.ok) {
      console.error(
        "[homepage-checkout] /api/me non-200, aborting routing:",
        res.status,
      );
      return;
    }
    me = await res.json().catch(() => null);
  } catch (err) {
    console.error("[homepage-checkout] /api/me failed:", err);
    return;
  }

  console.log("[homepage-checkout] /api/me payload:", me);

  const isNew = !!me?.is_new_user;
  const hasSub = !!me?.has_active_subscription;
  const newFlag = getNewSignupFlag();
  const treatAsNew = isNew || newFlag;

  console.log("[homepage-checkout] flags:", {
    isNew,
    hasSub,
    newFlag,
    treatAsNew,
  });

  // Existing user or already subscribed → profile (no homepage checkout here)
  if (!treatAsNew || hasSub) {
    console.log(
      "[homepage-checkout] existing user or already subscribed → /app/user-profile",
    );
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
  console.log("[homepage-checkout] initial intent from storage:", intent);

  let tiers: PublicPricingTier[] = [];
  try {
    tiers = await getPublicPricingTiers();
  } catch (err) {
    console.error("[homepage-checkout] failed to load tiers:", err);
  }

  console.log("[homepage-checkout] tiers in router:", tiers);

  if (!intent) {
    // Fallback: smallest tier, monthly
    const cheapest = pickCheapestTier(tiers);
    console.log("[homepage-checkout] cheapest tier fallback:", cheapest);
    if (cheapest) {
      intent = {
        tier_id: Number((cheapest as any).id),
        interval: "month",
      };
      setIntent(intent);
    }
  }

  if (!intent) {
    console.warn(
      "[homepage-checkout] no intent and no tiers → falling back to /app/tracking-setup",
    );
    clearNewSignupFlag();
    if (window.showGlobalLoadingModal) {
      window.showGlobalLoadingModal("Setting up your dashboard...");
    }
    navigate("/app/tracking-setup");
    return;
  }

  // If we've been told not to auto-checkout from here, just go to profile
  if (!autoCheckout) {
    console.log(
      "[homepage-checkout] autoCheckout=false → /app/user-profile (no embed)",
    );
    navigate("/app/user-profile");
    return;
  }

  // Try to match tier purely for logging / label purposes;
  // do NOT block checkout if we can't find it.
  let tier: PublicPricingTier | null =
    tiers.find(
      (t: any) =>
        Number((t as any).id) === Number(intent!.tier_id),
    ) || null;

  console.log("[homepage-checkout] tier for intent (may be null):", tier);

  if (!tier) {
    const fallback = pickCheapestTier(tiers);
    if (fallback) {
      console.warn(
        "[homepage-checkout] no exact tier match; falling back to cheapest tier for labels only.",
      );
      tier = fallback;
    }
  }

  if (tier) {
    const selected = buildSelectedTierMeta(tier, intent);
    console.log("[homepage-checkout] final selected meta:", selected);
  } else {
    console.warn(
      "[homepage-checkout] still no tier object – proceeding with checkout using intent only.",
    );
  }

  if (window.showGlobalLoadingModal) {
    window.showGlobalLoadingModal("Preparing checkout...");
  }

  try {
    const clientSecret = await createEmbeddedSession(intent);

    console.log(
      "[homepage-checkout] mounting Stripe embedded checkout overlay...",
    );

    await mountEmbeddedCheckoutOverlay(clientSecret, {
      onComplete: () => {
        console.log(
          "[homepage-checkout] checkout complete → /app/tracking-setup",
        );
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
