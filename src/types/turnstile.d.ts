// src/types/turnstile.d.ts

export {};

declare global {
  interface TurnstileRenderOptions {
    sitekey: string;
    callback?: (token: string) => void;
    "refresh-expired"?: "auto" | "manual";
  }

  interface Window {
    // Used by both AdminForgotPassword (render) and ContactUs (reset)
    turnstile?: {
      render: (el: HTMLElement | string, opts: TurnstileRenderOptions) => void;
      reset: () => void;
    };

    // Used by ContactUs Turnstile data-callback
    onTurnstileSuccess?: (token: string) => void;
  }
}
