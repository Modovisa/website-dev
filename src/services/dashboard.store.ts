// src/services/dashboard.store.ts
// Single source of truth for dashboard state: REST seed + WS frames.
// Exposes a tiny hook (useDashboard) and a few actions (init/setSite/setRange/fetchSnapshot/connectWS/cleanup).

import { useSyncExternalStore } from "react";
import { secureFetch } from "@/lib/auth"; // your existing auth-aware fetch
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

export type StoreState = {
  data: DashboardPayload | null;
  liveCount: number | null;
  liveCities: GeoCityPoint[];
  isLoading: boolean;
  error: string | null;

  // 🔢 Bumps on *every* analytics change (snapshot or frame)
  analyticsVersion: number;

  // 🔑 Bumps on each WS frame (and first snapshot) → charts remount/animate
  frameKey: number;

  siteId: number | null;
  range: RangeKey;
};

export type TrackingWebsite = { id: number; website_name: string; domain: string };

/* ---------------- Consts ---------------- */
const API = "https://api.modovisa.com";
const SNAPSHOT_TTL_MS = 30 * 60 * 1000; // 30m cache
const BACKOFF_MAX = 60_000;
const TICKET_THROTTLE_MS = 5_000;

/* ---------------- Internal mutable state ---------------- */
let state: StoreState = {
  data: null,
  liveCount: null,
  liveCities: [],
  isLoading: true,
  error: null,
  analyticsVersion: 0,
  frameKey: 0,
  siteId: null,
  range: "24h",
};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
const set = (partial: Partial<StoreState>) => { state = { ...state, ...partial }; notify(); };

/* ---------------- Helpers ---------------- */
const cacheKey = (siteId: number, range: RangeKey) => `mv:snapshot:${siteId}:${range}`;
const safeJSON = <T = any,>(x: string): T | null => { try { return JSON.parse(x) as T; } catch { return null; } };

function normalizeCities(payload: any): GeoCityPoint[] {
  const arr = Array.isArray(payload) ? payload : [];
  return arr
    .map((v: any) => ({
      city: String(v.city || "Unknown"),
      country: String(v.country || "Unknown"),
      lat: Number.isFinite(Number(v.lat)) ? Number(v.lat) : 0,
      lng: Number.isFinite(Number(v.lng)) ? Number(v.lng) : 0,
      count: Number.isFinite(Number(v.count)) ? Number(v.count) : 0,
      debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : undefined,
    }))
    .filter((p) => p.lat !== 0 || p.lng !== 0);
}

function hasSeries(d: any) {
  return (
    (Array.isArray(d?.time_grouped_visits) && d.time_grouped_visits.length > 0) ||
    (Array.isArray(d?.events_timeline) && d.events_timeline.length > 0) ||
    (Array.isArray(d?.unique_vs_returning) && d.unique_vs_returning.length > 0)
  );
}

function emitCachedSnapshotIfAny(siteId: number, range: RangeKey) {
  try {
    const raw = localStorage.getItem(cacheKey(siteId, range));
    if (!raw) return false;
    const obj = JSON.parse(raw) as { ts: number; data: DashboardPayload };
    if (!obj?.data) return false;
    const data = obj.data as DashboardPayload;
    (data as any).range = range;
    set({
      data,
      isLoading: false,
      analyticsVersion: state.analyticsVersion + 1,
      frameKey: state.frameKey + 1, // animate first paint
      error: null,
    });
    return true;
  } catch {
    return false;
  }
}

function saveSnapshotToCache(siteId: number, range: RangeKey, data: DashboardPayload) {
  try { localStorage.setItem(cacheKey(siteId, range), JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/* ---------------- Public: small REST helper kept here for convenience ---------------- */
export async function getTrackingWebsites(): Promise<TrackingWebsite[]> {
  const res = await secureFetch(`${API}/api/tracking-websites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`tracking_websites_${res.status}:${body}`);
  }
  const j = (await res.json()) as { projects: Array<{ id: number; website_name?: string; name?: string; domain?: string }> };
  return (j.projects || []).map((p) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));
}

/* ---------------- REST: snapshot (seed only) ---------------- */
export async function fetchSnapshot() {
  if (!state.siteId) return;
  const tz = String(new Date().getTimezoneOffset());
  const url = `${API}/api/user-dashboard-analytics?range=${encodeURIComponent(state.range)}&tz_offset=${encodeURIComponent(
    tz
  )}&site_id=${encodeURIComponent(state.siteId)}`;

  try {
    const res = await secureFetch(url, { method: "GET" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("❌ [REST] Snapshot failed:", res.status, body);
      set({ error: `snapshot_${res.status}`, isLoading: false });
      return;
    }
    const data = (await res.json()) as DashboardPayload;
    (data as any).range = state.range;
    saveSnapshotToCache(state.siteId, state.range, data);
    console.log("✅ [REST] Snapshot received");
    set({
      data,
      isLoading: false,
      analyticsVersion: state.analyticsVersion + 1,
      frameKey: state.frameKey + 1, // animate the first paint
      error: null,
    });
  } catch (e: any) {
    console.error("❌ [REST] Snapshot error:", e?.message || e);
    set({ error: "snapshot_error", isLoading: false });
  }
}

/* ---------------- WS ---------------- */
let ws: WebSocket | null = null;
let wsConnecting = false;
let pingTimer: number | null = null;
let reconnectTimer: number | null = null;
let lastTicketAt = 0;
let ticketLock = false;
let backoffMs = 4000;

async function getWSTicket(): Promise<string> {
  const now = Date.now();
  if (ticketLock || now - lastTicketAt < TICKET_THROTTLE_MS) {
    const wait = Math.max(TICKET_THROTTLE_MS - (now - lastTicketAt), 300);
    await new Promise((r) => setTimeout(r, wait));
  }
  ticketLock = true; lastTicketAt = Date.now();
  try {
    const res = await secureFetch(`${API}/api/ws-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: state.siteId }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`ticket_${res.status}:${body}`);
    }
    const j = await res.json();
    return j.ticket as string;
  } finally {
    ticketLock = false;
  }
}

function scheduleReconnect(ms: number) {
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  const jitter = 250 + Math.floor(Math.random() * 500);
  reconnectTimer = window.setTimeout(() => { void connectWS(true); }, ms + jitter) as unknown as number;
}

export async function connectWS(forceNew = false) {
  if (!state.siteId) return;
  if (ws && ws.readyState === WebSocket.OPEN && !forceNew) return;
  if (wsConnecting) return;
  wsConnecting = true;

  if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }
  try {
    try { ws?.close(); } catch {}
    ws = null;

    let ticket: string;
    try { ticket = await getWSTicket(); }
    catch (e: any) {
      console.warn("❌ [WS] ticket failed:", e?.message || e);
      backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
      scheduleReconnect(backoffMs);
      return;
    }

    backoffMs = 4000;

    const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      console.log("✅ [WS] Connected", { siteId: state.siteId, range: state.range });
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try { socket.send(JSON.stringify({ type: "ping" })); } catch {}
        }
      }, 25_000) as unknown as number;

      // Optional hint; server may ignore
      try { socket.send(JSON.stringify({ type: "request_dashboard_snapshot" })); } catch {}
    };

    socket.onmessage = (ev) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg = safeJSON<any>(ev.data);
      if (!msg) return;

      // Ignore frames for other sites (defensive)
      const msgSite = String(msg?.site_id ?? "");
      if (state.siteId && msgSite && msgSite !== String(state.siteId)) return;

      if (msg.type === "dashboard_analytics") {
        const frame = msg.payload || {};

        // Merge: prefer new fields, keep range stable.
        const merged = { ...(state.data || {}), ...frame, range: state.range } as DashboardPayload;

        // If a frame has any time series (or the merge does), bump frameKey so charts re-animate.
        const bump = hasSeries(frame) || hasSeries(merged);
        set({
          data: merged,
          isLoading: false,
          analyticsVersion: state.analyticsVersion + 1,
          frameKey: bump ? state.frameKey + 1 : state.frameKey,
          error: null,
        });
      }

      if (msg.type === "live_visitor_location_grouped") {
        const points = normalizeCities(msg.payload || []);
        const total = points.reduce((s, p) => s + (p.count || 0), 0);
        set({ liveCities: points, liveCount: total });
      }

      if (msg.type === "live_visitor_update") {
        const c = Number(msg?.payload?.count ?? 0) || 0;
        set({ liveCount: c });
      }

      // We deliberately do NOT fetch snapshots on 'new_event'.
      // WS frames should drive charts; snapshot is for initial seed only.
    };

    socket.onerror = (e) => console.error("❌ [WS] error:", e);
    socket.onclose = (e) => {
      console.warn("🔌 [WS] closed:", e.code, e.reason);
      scheduleReconnect(backoffMs);
      backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
    };
  } finally {
    wsConnecting = false;
  }
}

/* ---------------- Public actions ---------------- */
let bootstrapped = false;

export function init(initialRange: RangeKey = "24h") {
  if (!bootstrapped) {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") scheduleReconnect(800);
      });
      window.addEventListener("online", () => scheduleReconnect(500));
      window.addEventListener("offline", () => {/* noop; visual indicator handled in UI if needed */});
    }
    bootstrapped = true;
  }

  set({ range: initialRange });

  const saved = localStorage.getItem("current_website_id");
  if (saved) set({ siteId: Number(saved) });

  if (state.siteId) {
    emitCachedSnapshotIfAny(state.siteId, state.range); // instant paint
    void connectWS(true);                               // live stream
    void fetchSnapshot();                               // single seed
  }
}

export function setSite(siteId: number) {
  if (state.siteId === siteId) return;
  localStorage.setItem("current_website_id", String(siteId));
  set({ siteId, data: null, isLoading: true, liveCities: [], error: null });

  emitCachedSnapshotIfAny(siteId, state.range);
  void connectWS(true);
  void fetchSnapshot();
}

export function setRange(range: RangeKey) {
  if (state.range === range) return;
  set({ range, data: null, isLoading: true, error: null });

  if (state.siteId) {
    emitCachedSnapshotIfAny(state.siteId, range);
    void fetchSnapshot();   // one seed for the new range
    void connectWS(false);  // keep WS; server frames are range-agnostic
  }
}

export function cleanup() {
  try { ws?.close(); } catch {}
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  if (pingTimer) window.clearInterval(pingTimer);
}

/* ---------------- React hook ---------------- */
export function useDashboard() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state
  );
}
