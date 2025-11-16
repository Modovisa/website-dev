// src/types/google-gsi.d.ts
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          // GSI prompt can optionally pass a notification callback
          prompt: (callback?: (notification: any) => void) => void;
          // Optional helpers we use in logout:
          revoke?: (hint: string, done: () => void) => void;
          disableAutoSelect?: () => void;
        };
      };
    };
  }
}
