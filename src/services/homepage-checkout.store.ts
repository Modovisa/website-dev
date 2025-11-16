// src/services/homepage-checkout.store.ts
// One-time REST seed per (siteId:range) + 100% WS stream thereafter.
// - Ranges aligned to BE: 24h | 7d | 30d | 12mo (any 90d → 30d)
// - For 24h: never rotate axis (local 12 AM → 11 PM), never rebase to UTC
// - WS frames only PATCH the anchored seed; only elapsed hours (≤ current local hour) may change
// - Normalizes all 24h series to fixed hour order and clamps future hours to 0
// - Merges partial frames: TGV + all 24h count series
// - Watchdog pings WS for series if KPIs move but TGV stalls

import type { RangeKey, DashboardPayload } from "@/types/dashboard";

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
 * - Otherwise pick dev/prod API based on current hostname
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

  // 3) Heuristic: dev host → dev API
  const host = window.location.hostname;
  if (host.startsWith("dev.")) {
    return "https://api.modovisa.com";
  }

  // 4) Fallback: prod API
  return DEFAULT_API_BASE;
}

/**
 * Cookie-based fetch that talks directly to the Worker API.
 * This is intentionally "dumb" – no auth/refresh magic – to
 * behave exactly like the working Bootstrap flow.
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
    (a, b) => (a.max_events ?? 0) - (b.max_events ?? 0),
  )[0];
}

/* ---------------- Stripe helpers ---------------- */

async function getStripe(): Promise<any> {
  if (stripePromise) return stripePromise;

  stripePromise = (async () => {
    console.log("[homepage-checkout] resolving Stripe runtime config...");

    let res: Response;
    try {
      res = await apiFetch("/api/stripe/runtime-config");
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

async function createEmbeddedSession(intent: BillingIntent) {
  console.log(
    "[homepage-checkout] creating embedded session for intent:",
    intent,
  );

  let res: Response;
  try {
    res = await apiFetch("/api/stripe/embedded-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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

  // Existing user or already subscribed → profile (no checkout here)
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
      intent = { tier_id: cheapest.id, interval: "month" };
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

  const tier = tiers.find((t) => t.id === intent!.tier_id);
  console.log("[homepage-checkout] selected tier from intent:", tier);

  if (!tier) {
    console.warn(
      "[homepage-checkout] no tier found for intent → /app/tracking-setup",
    );
    clearBillingIntent();
    clearNewSignupFlag();
    if (window.showGlobalLoadingModal) {
      window.showGlobalLoadingModal("Setting up your dashboard...");
    }
    navigate("/app/tracking-setup");
    return;
  }

  const selected = buildSelectedTierMeta(tier, intent);
  console.log("[homepage-checkout] final selected meta:", selected);

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
