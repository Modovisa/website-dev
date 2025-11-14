// src/hooks/useBillingStripe.ts
// Frontend-only TypeScript hook that mirrors your Bootstrap billing flow.
// No backend changes. It uses only:
//  - POST /api/stripe/embedded-session
//  - POST /api/stripe/update-payment-method  (only when BE returns 402 + require_payment_update)
//  - GET  /api/stripe/runtime-config         (to resolve publishable key)
// Stripe UI is shown only when server says so (clientSecret present) or when BE returns 402.

// ----- Minimal globals -----
declare const Stripe: any; // brought in by <script src="https://js.stripe.com/basil/stripe.js">

type Interval = 'month' | 'year';

type StartUpgradeParams = {
  tierId: number | string;
  interval: Interval;
  // Used purely for UI decisions on success (to show correct modal like Bootstrap)
  fromFree?: boolean;
  previousInterval?: Interval | null;
  // Callbacks so your page can show the exact Bootstrap success modals
  onServerHandled?: (args: { fromFree?: boolean; intervalChanged: boolean }) => void | Promise<void>;
  onSubscriptionComplete?: (args: { fromFree?: boolean; intervalChanged: boolean }) => void | Promise<void>;
  onError?: (err: Error) => void | Promise<void>;
};

type Selectors = {
  // Subscription Embedded Checkout modal + mount point
  subscriptionModalId: string;          // e.g. "embeddedCheckoutReactModal"
  subscriptionMountSelector: string;    // e.g. "#stripe-payment-element-react"
  // Update-Card Embedded Checkout modal + mount point
  updateCardModalId: string;            // e.g. "updateCardReactModal"
  updateCardMountSelector: string;      // e.g. "#update-card-stripe-element-react"
};

let __stripePromise: Promise<any> | null = null;
async function getStripe(): Promise<any> {
  if (__stripePromise) return __stripePromise;
  __stripePromise = (async () => {
    const res = await fetch('https://api.modovisa.com/api/stripe/runtime-config', {
      cache: 'no-store',
      credentials: 'include',
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.publishableKey) {
      throw new Error(j.error || 'Failed to resolve Stripe publishable key');
    }
    return Stripe(j.publishableKey);
  })();
  return __stripePromise;
}

async function secureFetch(url: string, init: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

// --- trivial modal helpers (no Bootstrap dependency) ---
function openModal(id: string) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
}
function closeModal(id: string) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// --- mount a Stripe Embedded Checkout session ---
async function mountEmbedded(clientSecret: string, containerSelector: string, onComplete?: () => void | Promise<void>) {
  const stripe = await getStripe();
  const checkout = await stripe.initEmbeddedCheckout({
    clientSecret,
    onComplete: async () => {
      try { await onComplete?.(); } catch { /* no-op */ }
    },
  });
  await checkout.mount(containerSelector);
  return checkout; // caller can destroy if needed
}

export function useBillingStripe(selectors: Selectors) {
  const {
    subscriptionModalId,
    subscriptionMountSelector,
    updateCardModalId,
    updateCardMountSelector,
  } = selectors;

  // Mount subscription checkout when BE returns a subscription clientSecret
  async function mountSubscriptionCheckout(clientSecret: string, onComplete: () => void | Promise<void>) {
    openModal(subscriptionModalId);
    let destroy: (() => void) | null = null;
    try {
      const checkout = await mountEmbedded(clientSecret, subscriptionMountSelector, async () => {
        closeModal(subscriptionModalId);
        await onComplete();
      });
      destroy = () => checkout?.destroy?.();
      wireModalEscapeToDestroy(subscriptionModalId, destroy);
    } catch (e) {
      destroy?.();
      closeModal(subscriptionModalId);
      throw e;
    }
  }

  // If BE returns 402 + require_payment_update, launch setup-mode Embedded Checkout
  async function mountUpdateCardThenRetry(retry: () => Promise<void>) {
    openModal(updateCardModalId);
    let destroy: (() => void) | null = null;
    try {
      const res = await secureFetch('https://api.modovisa.com/api/stripe/update-payment-method', { method: 'POST' });
      const data = await res.json().catch(() => ({} as any));
      const clientSecret: string | undefined = data.clientSecret || data.client_secret;
      if (!res.ok || !clientSecret) {
        throw new Error(data.error || 'Missing clientSecret for update-payment-method');
      }
      const checkout = await mountEmbedded(clientSecret, updateCardMountSelector, async () => {
        // After setup completes, close, then retry the original upgrade
        closeModal(updateCardModalId);
        await retry();
      });
      destroy = () => checkout?.destroy?.();
      wireModalEscapeToDestroy(updateCardModalId, destroy);
    } catch (e) {
      destroy?.();
      closeModal(updateCardModalId);
      throw e;
    }
  }

  // Mirrors Bootstrap logic:
  // 1) POST /api/stripe/embedded-session with { tier_id, interval }
  //    - If { embedded_handled:true } → server charged on-file card → call onServerHandled()
  //    - If { clientSecret } → mount subscription embedded checkout → onSubscriptionComplete()
  //    - If HTTP 402 + { require_payment_update:true } → open setup flow, then retry upgrade
  async function startUpgrade(params: StartUpgradeParams): Promise<void> {
    const { tierId, interval, fromFree, previousInterval, onServerHandled, onSubscriptionComplete, onError } = params;

    try {
      const res = await secureFetch('https://api.modovisa.com/api/stripe/embedded-session', {
        method: 'POST',
        body: JSON.stringify({ tier_id: tierId, interval }),
      });

      // --- OK path ---
      if (res.ok) {
        const j = await res.json().catch(() => ({} as any));

        // Server-side handled (no UI) — EXACTLY like Bootstrap
        if (j.embedded_handled === true || j.success === true) {
          const intervalChanged = !!previousInterval && previousInterval !== interval;
          await onServerHandled?.({ fromFree, intervalChanged });
          return;
        }

        // Subscription client secret present — mount Embedded Checkout
        const secret: string | undefined = j.clientSecret || j.client_secret;
        if (secret) {
          const intervalChanged = !!previousInterval && previousInterval !== interval;
          await mountSubscriptionCheckout(secret, async () => {
            await onSubscriptionComplete?.({ fromFree, intervalChanged });
          });
          return;
        }

        // Unexpected OK without either path
        throw new Error(j.error || 'Unexpected response from embedded-session');
      }

      // --- 402: Payment method needs update ---
      if (res.status === 402) {
        let j: any = {};
        try { j = await res.json(); } catch { /* ignore */ }
        if (j?.require_payment_update) {
          await mountUpdateCardThenRetry(async () => {
            await startUpgrade(params); // re-run after card update
          });
          return;
        }
        throw new Error(j?.error || 'Payment requires action');
      }

      // --- Other errors ---
      const errJ = await res.json().catch(() => ({}));
      throw new Error(errJ?.error || `Upgrade failed (${res.status})`);
    } catch (e: any) {
      await onError?.(e instanceof Error ? e : new Error(String(e)));
      throw e;
    }
  }

  return { startUpgrade };
}

// Clean up on Esc if you’re using simple CSS modals.
// If you use Bootstrap/HeadlessUI/etc., wire into their close events instead.
function wireModalEscapeToDestroy(modalId: string, destroy?: () => void) {
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      try { destroy?.(); } catch { /* no-op */ }
      closeModal(modalId);
      window.removeEventListener('keydown', onKey);
    }
  };
  window.addEventListener('keydown', onKey);
}
