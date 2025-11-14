// src/services/dashboard.store.ts
// REST seed + WebSocket realtime for the dashboard (bootstrap-aligned).
// - Ticket-only WS (no hello/subscribe/set_range).
// - Frame delta logs (views/visitors) for visibility.
// - Optional lightweight snapshot poll every 45s to avoid stalls.

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
  analyticsVersion: number;
  frameKey: number;
  seriesSig: string;
  siteId: number | null;
  range: RangeKey;
};

export type TrackingWebsite = { id: number; website_name: string; domain: string };

/* ---------------- Consts ---------------- */
const API = "https://api.modovisa.com";
const BACKOFF_MAX = 60_000;
const SNAPSHOT_POLL_MS = 45_000; // small safety net; comment out to disable
const TICKET_THROTTLE_MS = 1500;

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
const W: any = typeof window !== "undefined" ? window : {};
const cacheKey = (sid: number, r: RangeKey) => `mv:snapshot:${sid}:${r}`;
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

const cap = (arr: any[] | undefined, n = 24) => Array.isArray(arr) ? arr.slice(-n) : [];

// 🔍 sum helper (as requested)
const sumBy = (arr: any[], k: string) =>
  Array.isArray(arr) ? arr.reduce((s, x) => s + (Number(x?.[k]) || 0), 0) : 0;

function signature(d: DashboardPayload | null, r: RangeKey): string {
  if (!d) return "";
  const tgv = cap((d as any).time_grouped_visits);
  const evt = cap((d as any).events_timeline);
  const uv  = cap((d as any).unique_visitors_timeline);
  const imp = cap((d as any).impressions_timeline);
  const clk = cap((d as any).clicks_timeline);
  const src = cap((d as any).search_visitors_timeline);
  const cnv = cap((d as any).conversions_timeline);
  return JSON.stringify({
    r,
    tgvL: tgv.length, tgvV: sumBy(tgv, "visitors"), tgvW: sumBy(tgv, "views"),
    evtL: evt.length, evtC: sumBy(evt, "count"),
    uvL:  uv.length,  uvC:  sumBy(uv,  "count"),
    impL: imp.length, impC: sumBy(imp, "count"),
    clkL: clk.length, clkC: sumBy(clk, "count"),
    srcL: src.length, srcC: sumBy(src, "count"),
    cnvL: cnv.length, cnvC: sumBy(cnv, "count"),
  });
}

function saveSnapshot(siteId: number, range: RangeKey, data: DashboardPayload) {
  try { localStorage.setItem(cacheKey(siteId, range), JSON.stringify({ ts: Date.now(), data })); } catch {}
}

function emitCached(siteId: number, range: RangeKey) {
  try {
    const raw = localStorage.getItem(cacheKey(siteId, range));
    if (!raw) return false;
    const obj = JSON.parse(raw) as { ts: number; data: DashboardPayload };
    if (!obj?.data) return false;
    const data = obj.data as DashboardPayload;
    (data as any).range = range;
    const sig = signature(data, range);
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

/* ---------- Merge policy ---------- */
const KPI_KEYS = new Set<string>([
  "live_visitors","unique_visitors","bounce_rate","bounce_rate_delta",
  "avg_duration","avg_duration_delta","multi_page_visits","multi_page_visits_delta",
]);

function mergeSameRange(base: DashboardPayload | null, frame: Partial<DashboardPayload>) {
  const merged = { ...(base || {}), ...frame } as DashboardPayload;
  (merged as any).range = state.range;
  return merged;
}
function mergeKPIsOnly(base: DashboardPayload | null, frame: Partial<DashboardPayload>) {
  const next = { ...(base || {}) } as any;
  for (const k of Object.keys(frame || {})) if (KPI_KEYS.has(k)) next[k] = (frame as any)[k];
  next.range = state.range;
  return next as DashboardPayload;
}

function debugDelta(prev: DashboardPayload | null, next: DashboardPayload | null) {
  if (!W.__mvDashDbg) return;
  const p = prev?.time_grouped_visits || [];
  const n = next?.time_grouped_visits || [];
  const pV = sumBy(p, "views");
  const nV = sumBy(n, "views");
  const pU = sumBy(p, "visitors");
  const nU = sumBy(n, "visitors");
  if (nV !== pV || nU !== pU) {
    const last = n[n.length - 1];
    console.debug(
      `💹 [frame] views Δ=${nV - pV}, visitors Δ=${nU - pU}` +
      (last ? ` | last="${last.label}" v=${last.visitors} w=${last.views}` : "")
    );
  }
}

/* ---------------- REST ---------------- */
export async function getTrackingWebsites(): Promise<TrackingWebsite[]> {
  const res = await secureFetch(`${API}/api/tracking-websites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`tracking_websites_${res.status}:${await res.text().catch(()=> "")}`);
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
      console.error("❌ [REST] Snapshot failed:", res.status, await res.text().catch(()=> ""));
      set({ error: `snapshot_${res.status}`, isLoading: false });
      return;
    }
    const data = (await res.json()) as DashboardPayload;
    (data as any).range = state.range;
    saveSnapshot(state.siteId, state.range, data);

    const sig = signature(data, state.range);
    set({
      data,
      isLoading: false,
      analyticsVersion: state.analyticsVersion + 1,
      frameKey: state.frameKey + 1,
      seriesSig: sig,
      error: null,
    });
    if (W.__mvDashDbg) console.debug("✅ [REST] Snapshot received");
  } catch (e: any) {
    console.error("❌ [REST] Snapshot error:", e?.message || e);
    set({ error: "snapshot_error", isLoading: false });
  }
}

/* ---------------- WS (bootstrap-aligned) ---------------- */
let ws: WebSocket | null = null;
let wsConnecting = false;
let pingTimer: number | null = null;
let reconnectTimer: number | null = null;
let pollTimer: number | null = null;
let backoffMs = 4000;

W._wsTicketLock ??= false;
W._wsLastTicketAt ??= 0;

function scheduleReconnect(ms: number) {
  if (reconnectTimer) return;
  const jitter = 250 + Math.floor(Math.random() * 500);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    void connectWS(true);
  }, ms + jitter) as unknown as number;
}

async function getWSTicket(): Promise<string> {
  const now = Date.now();
  const since = now - (W._wsLastTicketAt || 0);
  if (W._wsTicketLock || since < TICKET_THROTTLE_MS) {
    const wait = Math.max(TICKET_THROTTLE_MS - since, 500);
    await new Promise((r) => setTimeout(r, wait));
  }

  W._wsTicketLock = true;
  W._wsLastTicketAt = Date.now();
  try {
    const res = await secureFetch(`${API}/api/ws-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: state.siteId }),
    });
    if (!res.ok) throw new Error(`ticket_${res.status}:${await res.text().catch(()=> "")}`);
    const j = await res.json();
    return j.ticket as string;
  } finally {
    W._wsTicketLock = false;
  }
}

export async function connectWS(forceNew = false) {
  if (!state.siteId) return;
  if (!forceNew && ws && ws.readyState === WebSocket.OPEN) return;
  if (wsConnecting) return;

  wsConnecting = true;
  if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }
  if (pollTimer) { window.clearInterval(pollTimer); pollTimer = null; }

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
      if (reconnectTimer) { window.clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (W.__mvDashDbg) console.debug("✅ [WS] Connected", { site: state.siteId, range: state.range });

      // keepalive
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try { socket.send(JSON.stringify({ type: "ping" })); } catch {}
        }
      }, 25_000) as unknown as number;

      // request a fresh snapshot to sync series right away
      void fetchSnapshot();

      // small poll safety net so KPIs/series don’t stall if stream is quiet
      pollTimer = window.setInterval(() => { void fetchSnapshot(); }, SNAPSHOT_POLL_MS) as unknown as number;
    };

    socket.onmessage = (ev) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg = safeJSON<any>(ev.data);
      if (!msg) return;
      if (state.siteId && String(msg?.site_id ?? "") !== String(state.siteId)) return;

      switch (msg.type) {
        case "dashboard_analytics":
        case "analytics_frame": {
          const frame = (msg.payload || {}) as Partial<DashboardPayload>;
          const frameRange = (frame as any)?.range as RangeKey | undefined;
          const next = frameRange && frameRange !== state.range
            ? mergeKPIsOnly(state.data, frame)
            : mergeSameRange(state.data, frame);

          // Existing optional debug (guarded by __mvDashDbg)
          debugDelta(state.data, next);

          // ✅ Clear delta log (always prints) — inserted right after computing `next`
          {
            const prevTGV = Array.isArray(state.data?.time_grouped_visits) ? (state.data as any).time_grouped_visits : [];
            const nextTGV = Array.isArray((frame as any)?.time_grouped_visits) ? (frame as any).time_grouped_visits : [];

            if (nextTGV.length) {
              const pv = sumBy(prevTGV, "views");
              const nv = sumBy(nextTGV, "views");
              const pu = sumBy(prevTGV, "visitors");
              const nu = sumBy(nextTGV, "visitors");
              if (pv !== nv || pu !== nu) {
                console.log(`📈 [TGV Δ] views: ${pv} → ${nv}, visitors: ${pu} → ${nu}, buckets: ${nextTGV.length}`);
              } else {
                console.log(`⏸ [TGV] no change (views=${nv}, visitors=${nu})`);
              }
            }
          }

          // recompute live count if not provided explicitly
          let liveCount = state.liveCount;
          if (Array.isArray(state.liveCities) && state.liveCities.length) {
            liveCount = state.liveCities.reduce((s, p) => s + (p.count || 0), 0);
          } else if ((next as any).live_visitors != null) {
            liveCount = Number((next as any).live_visitors) || liveCount || 0;
          }

          const sig = signature(next, state.range);
          const bump = sig !== state.seriesSig;

          set({
            data: next,
            isLoading: false,
            analyticsVersion: state.analyticsVersion + 1,
            frameKey: bump ? state.frameKey + 1 : state.frameKey,
            seriesSig: sig,
            liveCount,
            error: null,
          });
          break;
        }

        case "live_visitor_location_grouped": {
          const points = normalizeCities(msg.payload || []);
          const total = points.reduce((s, p) => s + (p.count || 0), 0);
          set({ liveCities: points, liveCount: total });
          break;
        }

        case "live_visitor_update":
          set({ liveCount: Number(msg?.payload?.count ?? 0) || 0 });
          break;
      }
    };

    socket.onerror = (e) => console.error("❌ [WS] error:", e);
    socket.onclose = (e) => {
      if (W.__mvDashDbg) console.warn("🔌 [WS] closed:", e.code, e.reason);
      if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }
      if (pollTimer) { window.clearInterval(pollTimer); pollTimer = null; }
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
  if (!bootstrapped && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") scheduleReconnect(800);
    });
    window.addEventListener("online", () => scheduleReconnect(500));
    bootstrapped = true;
  }

  set({ range: initialRange });

  const saved = localStorage.getItem("current_website_id");
  if (saved) set({ siteId: Number(saved) });

  if (state.siteId) {
    emitCached(state.siteId, state.range);
    void connectWS(true);
    void fetchSnapshot();
  }
}

export function setSite(siteId: number) {
  if (state.siteId === siteId) return;
  localStorage.setItem("current_website_id", String(siteId));
  set({ siteId, data: null, isLoading: true, liveCities: [], liveCount: null, error: null, seriesSig: "" });

  emitCached(siteId, state.range);
  void connectWS(true);
  void fetchSnapshot();
}

export function setRange(range: RangeKey) {
  if (state.range === range) return;
  set({ range, data: null, isLoading: true, error: null, seriesSig: "" });

  if (state.siteId) {
    emitCached(state.siteId, range);
    void fetchSnapshot();
    // no range message — ticket scopes the site, not range
    void connectWS(false);
  }
}

export function cleanup() {
  try { ws?.close(); } catch {}
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  if (pingTimer) window.clearInterval(pingTimer);
  if (pollTimer) window.clearInterval(pollTimer);
}

/* ---------------- React hook ---------------- */
export function useDashboard() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state
  );
}
