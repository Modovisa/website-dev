// src/services/dashboard.store.ts
// Single source of truth for dashboard state: REST seed + WS frames.
// Changes:
// - Hardened WS connect with single-flight ticketing + jittered backoff
// - No duplicate reconnects on range/site changes
// - Emits cached snapshot instantly
// - Thicker ticket throttle to avoid 429 loops

import { useSyncExternalStore } from "react";
import { secureFetch } from "@/lib/auth";
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
  analyticsVersion: number;   // bumps on any analytics change
  frameKey: number;           // bump => charts re-mount/re-animate
  seriesSig: string;          // fingerprint of visible series
  siteId: number | null;
  range: RangeKey;
};

export type TrackingWebsite = { id: number; website_name: string; domain: string };

/* ---------------- Consts ---------------- */
const API = "https://api.modovisa.com";
const BACKOFF_MAX = 60_000;
const TICKET_THROTTLE_MS = 10_000; // ↑ thicker than DO limit bursts

/* ---------------- Internal state ---------------- */
let state: StoreState = {
  data: null,
  liveCount: null,
  liveCities: [],
  isLoading: true,
  error: null,
  analyticsVersion: 0,
  frameKey: 0,
  seriesSig: "",
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
  return arr.map((v: any) => ({
    city: String(v.city || "Unknown"),
    country: String(v.country || "Unknown"),
    lat: Number(v.lat) || 0,
    lng: Number(v.lng) || 0,
    count: Number(v.count) || 0,
    debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : undefined,
  })).filter((p) => p.lat !== 0 || p.lng !== 0);
}

function cap(arr: any[] | undefined, n = 24) { return Array.isArray(arr) ? arr.slice(-n) : []; }
function sum(a: any[], k: string) { return a.reduce((s, x) => s + (Number(x?.[k] ?? x?.value ?? x?.count) || 0), 0); }

function seriesSignature(d: DashboardPayload | null, range: RangeKey): string {
  if (!d) return "";
  const tgv = cap((d as any).time_grouped_visits);
  const evt = cap((d as any).events_timeline);
  const uv  = cap((d as any).unique_visitors_timeline);
  const imp = cap((d as any).impressions_timeline);
  const clk = cap((d as any).clicks_timeline);
  const src = cap((d as any).search_visitors_timeline);
  const cnv = cap((d as any).conversions_timeline);
  return JSON.stringify({
    r: range,
    tgvL: tgv.length, tgvV: sum(tgv, "visitors"), tgvW: sum(tgv, "views"),
    evtL: evt.length, evtC: sum(evt, "count"),
    uvL:  uv.length,  uvC:  sum(uv,  "count"),
    impL: imp.length, impC: sum(imp, "count"),
    clkL: clk.length, clkC: sum(clk, "count"),
    srcL: src.length, srcC: sum(src, "count"),
    cnvL: cnv.length, cnvC: sum(cnv, "count"),
  });
}

function saveSnapshotToCache(siteId: number, range: RangeKey, data: DashboardPayload) {
  try { localStorage.setItem(cacheKey(siteId, range), JSON.stringify({ ts: Date.now(), data })); } catch {}
}

function emitCachedSnapshotIfAny(siteId: number, range: RangeKey) {
  try {
    const raw = localStorage.getItem(cacheKey(siteId, range));
    if (!raw) return false;
    const obj = JSON.parse(raw) as { ts: number; data: DashboardPayload };
    if (!obj?.data) return false;
    const data = obj.data as DashboardPayload;
    (data as any).range = range;
    const sig = seriesSignature(data, range);
    set({
      data,
      isLoading: false,
      analyticsVersion: state.analyticsVersion + 1,
      frameKey: state.frameKey + 1,
      seriesSig: sig,
      error: null,
    });
    return true;
  } catch { return false; }
}

/* ---------- Merge policy (range-aware) ---------- */
const KPI_KEYS = new Set<string>([
  "live_visitors","unique_visitors","bounce_rate","bounce_rate_delta",
  "avg_duration","avg_duration_delta","multi_page_visits","multi_page_visits_delta",
]);

function mergeSameRange(base: DashboardPayload | null, frame: Partial<DashboardPayload>): DashboardPayload {
  const merged = { ...(base || {}), ...frame } as DashboardPayload;
  (merged as any).range = state.range;
  return merged;
}
function mergeKPIsOnly(base: DashboardPayload | null, frame: Partial<DashboardPayload>): DashboardPayload {
  const next = { ...(base || {}) } as any;
  for (const k of Object.keys(frame || {})) if (KPI_KEYS.has(k)) next[k] = (frame as any)[k];
  next.range = state.range;
  return next as DashboardPayload;
}

/* ---------------- REST ---------------- */
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

export async function fetchSnapshot() {
  if (!state.siteId) return;
  const tz = String(new Date().getTimezoneOffset());
  const url = `${API}/api/user-dashboard-analytics?range=${encodeURIComponent(state.range)}&tz_offset=${encodeURIComponent(tz)}&site_id=${encodeURIComponent(state.siteId)}`;

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

    const sig = seriesSignature(data, state.range);
    set({
      data,
      isLoading: false,
      analyticsVersion: state.analyticsVersion + 1,
      frameKey: state.frameKey + 1,
      seriesSig: sig,
      error: null,
    });
    console.log("✅ [REST] Snapshot received");
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
  const since = now - lastTicketAt;
  if (ticketLock || since < TICKET_THROTTLE_MS) {
    const wait = Math.max(TICKET_THROTTLE_MS - since, 500);
    await new Promise((r) => setTimeout(r, wait));
  }
  ticketLock = true;
  lastTicketAt = Date.now();
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
  if (reconnectTimer) return; // already scheduled
  const jitter = 250 + Math.floor(Math.random() * 500);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    void connectWS(true);
  }, ms + jitter) as unknown as number;
}

function applyAnalyticsFrame(frame: Partial<DashboardPayload>) {
  const frameRange = (frame as any)?.range as RangeKey | undefined;
  const nextData = (frameRange && frameRange !== state.range)
    ? mergeKPIsOnly(state.data, frame)
    : mergeSameRange(state.data, frame);

  let liveCount = state.liveCount;
  if (Array.isArray(state.liveCities) && state.liveCities.length) {
    liveCount = state.liveCities.reduce((s, p) => s + (p.count || 0), 0);
  } else if ((nextData as any).live_visitors != null) {
    liveCount = Number((nextData as any).live_visitors) || liveCount || 0;
  }

  const newSig = seriesSignature(nextData, state.range);
  const bump = newSig !== state.seriesSig;

  set({
    data: nextData,
    isLoading: false,
    analyticsVersion: state.analyticsVersion + 1,
    frameKey: bump ? state.frameKey + 1 : state.frameKey,
    seriesSig: newSig,
    liveCount,
    error: null,
  });
}

export async function connectWS(forceNew = false) {
  if (!state.siteId) return;
  if (!forceNew && ws && ws.readyState === WebSocket.OPEN) return;
  if (wsConnecting) return;
  if (reconnectTimer && !forceNew) return;

  wsConnecting = true;
  if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }

  try {
    try { ws?.close(); } catch {}
    ws = null;

    let ticket: string;
    try {
      ticket = await getWSTicket();
    } catch (e: any) {
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
      if (reconnectTimer) { window.clearTimeout(reconnectTimer); reconnectTimer = null; }

      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try { socket.send(JSON.stringify({ type: "ping" })); } catch {}
        }
      }, 25_000) as unknown as number;

      try { socket.send(JSON.stringify({ type: "request_dashboard_snapshot" })); } catch {}
    };

    socket.onmessage = (ev) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg = safeJSON<any>(ev.data);
      if (!msg) return;

      const msgSite = String(msg?.site_id ?? "");
      if (state.siteId && msgSite && msgSite !== String(state.siteId)) return;

      if (msg.type === "dashboard_analytics") {
        applyAnalyticsFrame(msg.payload || {});
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
    }
    bootstrapped = true;
  }

  set({ range: initialRange });

  const saved = localStorage.getItem("current_website_id");
  if (saved) set({ siteId: Number(saved) });

  if (state.siteId) {
    emitCachedSnapshotIfAny(state.siteId, state.range);
    void connectWS(true);
    void fetchSnapshot();
  }
}

export function setSite(siteId: number) {
  if (state.siteId === siteId) return;
  localStorage.setItem("current_website_id", String(siteId));
  set({ siteId, data: null, isLoading: true, liveCities: [], liveCount: null, error: null, seriesSig: "" });

  emitCachedSnapshotIfAny(siteId, state.range);
  void connectWS(true);
  void fetchSnapshot();
}

export function setRange(range: RangeKey) {
  if (state.range === range) return;
  set({ range, data: null, isLoading: true, error: null, seriesSig: "" });

  if (state.siteId) {
    emitCachedSnapshotIfAny(state.siteId, range);
    void fetchSnapshot();
    // NOTE: do not forceNew here; the next ping or server push is fine.
    void connectWS(false);
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
