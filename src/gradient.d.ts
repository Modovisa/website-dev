// src/gradient.d.ts

// Type definitions for animated-gradient.js
// This makes TypeScript aware of the global Gradient class

declare global {
  interface Window {
    Gradient: new () => {
      initGradient: (selector: string) => void;
      pause: () => void;
      play: () => void;
    };
  }
}

export {};