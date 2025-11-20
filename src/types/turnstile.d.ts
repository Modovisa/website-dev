// src/types/turnstile.d.ts

export {};

declare global {
  interface TurnstileOptions {
    sitekey: string;
    callback?: (token: string) => void;
    "refresh-expired"?: "auto" | "manual";
  }

  interface TurnstileAPI {
    render: (el: HTMLElement | string, options: TurnstileOptions) => void;
    reset: (widget?: HTMLElement | string) => void;
    remove?: (widget?: HTMLElement | string) => void;
  }

  interface Window {
    turnstile?: TurnstileAPI;
    onTurnstileSuccess?: (token: string) => void;
  }
}
