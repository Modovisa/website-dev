// src/lib/api.ts

// Central API base; reads a toggle if you have one, else defaults to prod.
export function apiBase(): string {
  // If you already use a localStorage/env toggle, keep it here. Safe default:
  return "https://api.modovisa.com";
}
