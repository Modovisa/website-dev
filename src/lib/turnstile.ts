// src/lib/turnstile.ts

let turnstilePromise: Promise<void> | null = null;

const TURNSTILE_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function ensureTurnstileLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if (window.turnstile) {
    // Already available
    return Promise.resolve();
  }

  if (turnstilePromise) return turnstilePromise;

  turnstilePromise = new Promise<void>((resolve) => {
    // Check for an existing script tag
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SRC}"]`
    );

    if (existing) {
      if ((existing as any).dataset.loaded === "1") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => {
        (existing as any).dataset.loaded = "1";
        resolve();
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      (script as any).dataset.loaded = "1";
      resolve();
    };
    document.head.appendChild(script);
  });

  return turnstilePromise;
}
