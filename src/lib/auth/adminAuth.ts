// src/lib/auth/adminAuth.ts

interface AdminAccessToken {
  token: string;
  exp: number;
}

declare global {
  interface Window {
    __mvAdminAccess?: AdminAccessToken;
  }
}

const API = "https://api.modovisa.com";
const REFRESH_URL = `${API}/api/refresh-token?aud=admin`;

// Parse JWT payload
function parseJwt(token: string): any {
  try {
    const base = (token || "").split(".")[1] || "";
    const norm = base.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (norm.length % 4)) % 4);
    return JSON.parse(atob(norm + pad));
  } catch {
    return null;
  }
}

// Check if token expires in next 60 seconds
function expiringSoonAdmin(): boolean {
  if (!window.__mvAdminAccess?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return window.__mvAdminAccess.exp - now < 60;
}

let refreshInFlight: Promise<AdminAccessToken> | null = null;

// Refresh admin access token
async function refreshAdmin(): Promise<AdminAccessToken> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const res = await fetch(REFRESH_URL, {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) throw new Error("admin_refresh_failed");

    const { token } = await res.json();
    if (!token) throw new Error("no_admin_token");

    const payload = parseJwt(token);
    if (!payload?.exp) throw new Error("bad_admin_token");

    const accessToken: AdminAccessToken = { token, exp: payload.exp };
    window.__mvAdminAccess = accessToken;
    return accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function ensureAdminAccess(): Promise<AdminAccessToken> {
  if (!window.__mvAdminAccess || expiringSoonAdmin()) {
    return refreshAdmin();
  }
  return window.__mvAdminAccess;
}

// Secure fetch for admin APIs
export async function secureAdminFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  try {
    await ensureAdminAccess();
  } catch (err) {
    console.error("Failed to get admin access token:", err);
    throw new Error("admin_unauthorized");
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${window.__mvAdminAccess!.token}`);

  // First attempt
  const firstAttempt = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // If 401, try to refresh and retry once
  if (firstAttempt.status === 401) {
    try {
      await refreshAdmin();
      headers.set("Authorization", `Bearer ${window.__mvAdminAccess!.token}`);

      return await fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to refresh admin token:", err);
      throw new Error("admin_unauthorized");
    }
  }

  return firstAttempt;
}

// Proactive token refresh (every 2 minutes)
if (typeof window !== "undefined") {
  setInterval(() => {
    if (expiringSoonAdmin()) {
      refreshAdmin().catch(() => {
        console.warn("Admin proactive token refresh failed");
      });
    }
  }, 120_000);
}

// Initialize admin auth on page load
export async function initAdminAuth(): Promise<boolean> {
  try {
    console.log("🔐 Initializing admin auth...");
    await refreshAdmin();
    console.log("✅ Admin auth initialized");
    return true;
  } catch (err) {
    console.warn("⚠️ Admin auth initialization failed:", err);
    return false;
  }
}
