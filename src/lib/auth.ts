// src/lib/auth.ts

interface AccessToken {
  token: string;
  exp: number;
}

declare global {
  interface Window {
    __mvAccess?: AccessToken;
    __authRole?: string;
    secureFetch?: typeof secureFetch;
  }
}

const API = 'https://api.modovisa.com';
const REFRESH_URL = `${API}/api/refresh-token?aud=user`;
const ROLE = 'user';

// Parse JWT payload
function parseJwt(token: string): any {
  try {
    const base = (token || '').split('.')[1] || '';
    const norm = base.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (norm.length % 4)) % 4);
    return JSON.parse(atob(norm + pad));
  } catch {
    return null;
  }
}

// Check if token expires in next 60 seconds
function expiringSoon(): boolean {
  if (!window.__mvAccess?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return (window.__mvAccess.exp - now) < 60;
}

let refreshInFlight: Promise<AccessToken> | null = null;

// Refresh access token
async function refresh(): Promise<AccessToken> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const res = await fetch(REFRESH_URL, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store'
    });

    if (!res.ok) throw new Error('refresh_failed');

    const { token } = await res.json();
    if (!token) throw new Error('no_token');

    const payload = parseJwt(token);
    if (!payload?.exp) throw new Error('bad_token');

    const accessToken = { token, exp: payload.exp };
    window.__mvAccess = accessToken;
    return accessToken;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

// Ensure we have a valid access token
async function ensureAccess(): Promise<AccessToken> {
  if (!window.__mvAccess || expiringSoon()) {
    return refresh();
  }
  return window.__mvAccess;
}

// Secure fetch with automatic token refresh and retry
export async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Ensure we have a valid token
  try {
    await ensureAccess();
  } catch (err) {
    console.error('Failed to get access token:', err);
    throw new Error('unauthorized');
  }

  // Add Authorization header
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${window.__mvAccess!.token}`);

  // First attempt
  const firstAttempt = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });

  // If 401, try to refresh and retry once
  if (firstAttempt.status === 401) {
    try {
      await refresh();
      headers.set('Authorization', `Bearer ${window.__mvAccess!.token}`);
      
      return await fetch(url, {
        ...options,
        headers,
        credentials: 'include'
      });
    } catch (err) {
      console.error('Failed to refresh token:', err);
      throw new Error('unauthorized');
    }
  }

  return firstAttempt;
}

// Proactive token refresh (every 2 minutes)
setInterval(() => {
  if (expiringSoon()) {
    refresh().catch(() => {
      console.warn('Proactive token refresh failed');
    });
  }
}, 120000);

// Export to window for compatibility
if (typeof window !== 'undefined') {
  // Only claim if no other role owns it
  if (!window.__authRole || window.__authRole === ROLE) {
    window.secureFetch = secureFetch;
    window.__authRole = ROLE;
  }
}