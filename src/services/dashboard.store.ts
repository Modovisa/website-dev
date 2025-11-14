// src/services/dashboard.store.ts
// One-time REST seed per (siteId:range) + 100% WS stream thereafter.
// - Merges partial TGV frames (time_grouped_visits_delta or tiny arrays)
// - Watchdog pings WS for series if KPIs move but TGV stalls
// - Clear delta logs with source tags (WS / REST)

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
const sumBy = (arr: any[], k: string) =>
  Array.isArray(arr) ? arr.reduce((s, x) => s + (Number(x?.[k]) || 0), 0) : 0;

/** Source-tagged delta log with window-shift detection */
function logTgvDelta(source: "WS" | "REST", prev?: any[], next?: any[]) {
  const P = Array.isArray(prev) ? prev : [];
  const N = Array.isArray(next) ? next : [];
  if (!N.length) return;
  const pv = P.reduce((s,x)=>s+(+x?.views||0),0);
  const nv = N.reduce((s,x)=>s+(+x?.views||0),0);
  const pu = P.reduce((s,x)=>s+(+x?.visitors||0),0);
  const nu = N.reduce((s,x)=>s+(+x?.visitors||0),0);
  const shifted = !!(P.length && N.length && (P[P.length-1]?.label === N[N.length-1]?.label) && (P[0]?.label !== N[0]?.label));
  if (pv !== nv || pu !== nu) {
    console.log(`📈 [${source} TGV Δ] views: ${pv} → ${nv}, visitors: ${pu} → ${nu}, buckets: ${N.length}${shifted ? " (window shift)" : ""}`);
  } else {
    console.log(`⏸ [${source} TGV] no change (views=${nv}, visitors=${nu})${shifted ? " (window shift)" : ""}`);
  }
}

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

/* ---------- Merge policy & TGV patching ---------- */
const KPI_KEYS = new Set<string>([
  "live_visitors","unique_visitors","bounce_rate","bounce_rate_delta",
  "avg_duration","avg_duration_delta","multi_page_visits","multi_page_visits_delta",
  // allow country list to refresh even when off-range
  "countries",
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

/** Replace or append patch labels; clamp size to original length (if known) */
function applyTgvPatch(base: any[] | undefined, patch: any[]): any[] {
  const out = Array.isArray(base) ? base.map(b => ({ ...b })) : [];
  const labels = out.map(b => String(b.label));
  for (const p of patch) {
    const lbl = String((p as any)?.label ?? "");
    if (!lbl) continue;
    const v = Number((p as any)?.visitors ?? 0);
    const w = Number((p as any)?.views ?? 0);
    const idx = labels.indexOf(lbl);
    if (idx >= 0) {
      out[idx] = { ...out[idx], label: lbl, visitors: v, views: w };
    } else {
      out.push({ label: lbl, visitors: v, views: w });
      labels.push(lbl);
    }
  }
  const max = Array.isArray(base) && base.length ? base.length : out.length;
  while (out.length > max) out.shift();
  return out;
}

/* ---------------- REST seed (once per siteId:range) ---------------- */
const seeded = new Set<string>();
let seedInFlight = false;
let lastTgvAt = 0; // updated whenever we actually change the series
const seedKey = () => (state.siteId ? `${state.siteId}:${state.range}` : "");

/** One-time seed fetch for the current (siteId:range). */
export async function fetchSnapshotSeedOnce() {
  if (!state.siteId) return;
  const key = seedKey();
  if (!key || seeded.has(key) || seedInFlight) return;

  seedInFlight = true;
  const tz = String(new Date().getTimezoneOffset());
  const url = `${API}/api/user-dashboard-analytics?range=${encodeURIComponent(state.range)}&tz_offset=${encodeURIComponent(tz)}&site_id=${encodeURIComponent(state.siteId)}`;

  try {
    const res = await secureFetch(url, { method: "GET" });
    if (!res.ok) {
      console.error("❌ [REST] Seed snapshot failed:", res.status, await res.text().catch(()=> ""));
      set({ error: `snapshot_${res.status}`, isLoading: false });
      return;
    }
    const data = (await res.json()) as DashboardPayload;
    (data as any).range = state.range;

    logTgvDelta("REST", state.data?.time_grouped_visits as any[], (data as any)?.time_grouped_visits as any[]);

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

    lastTgvAt = Date.now();
    seeded.add(key);
    if (W.__mvDashDbg) console.debug("✅ [REST] Seed snapshot completed once for", key);
  } catch (e: any) {
    console.error("❌ [REST] Seed snapshot error:", e?.message || e);
    set({ error: "snapshot_error", isLoading: false });
  } finally {
    seedInFlight = false;
  }
}

/** COMPAT alias for Dashboard.tsx */
export async function fetchSnapshot() { return fetchSnapshotSeedOnce(); }

/** Still needed by the sites dropdown in Dashboard.tsx */
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

/* ---------------- WS (stream) ---------------- */
let ws: WebSocket | null = null;
let wsConnecting = false;
let pingTimer: number | null = null;
let reconnectTimer: number | null = null;
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

function requestSeries() {
  try { ws?.send(JSON.stringify({ type: "request_series", range: state.range })); } catch {}
}

export async function connectWS(forceNew = false) {
  if (!state.siteId) return;
  if (!forceNew && ws && ws.readyState === WebSocket.OPEN) return;
  if (wsConnecting) return;

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
      if (reconnectTimer) { window.clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (W.__mvDashDbg) console.debug("✅ [WS] Connected", { site: state.siteId, range: state.range });

      // keepalive
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try { socket.send(JSON.stringify({ type: "ping" })); } catch {}
        }
      }, 25_000) as unknown as number;

      // One-time seed after socket opens (per siteId:range)
      void fetchSnapshotSeedOnce();
    };

    socket.onmessage = (ev) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg = safeJSON<any>(ev.data);
      if (!msg) return;
      if (state.siteId && String(msg?.site_id ?? "") !== String(state.siteId)) return;

      switch (msg.type) {
        case "dashboard_analytics":
        case "analytics_frame": {
          const frameRaw = (msg.payload || {}) as Partial<DashboardPayload> & {
            time_grouped_visits?: any[];
            time_grouped_visits_delta?: any[];
            tgv_delta?: any[];
            tgv?: any[];
            range?: RangeKey;
          };

          // Normalize/patch any partial TGV payload first
          const baseTgv = (state.data as any)?.time_grouped_visits as any[] | undefined;
          let patchedTgv: any[] | undefined;

          if (Array.isArray(frameRaw.time_grouped_visits_delta) && frameRaw.time_grouped_visits_delta.length) {
            patchedTgv = applyTgvPatch(baseTgv, frameRaw.time_grouped_visits_delta);
          } else if (Array.isArray(frameRaw.tgv_delta) && frameRaw.tgv_delta.length) {
            patchedTgv = applyTgvPatch(baseTgv, frameRaw.tgv_delta);
          } else if (Array.isArray(frameRaw.tgv) && frameRaw.tgv.length) {
            const arr = frameRaw.tgv.map((x:any)=>({
              label: String(x.label ?? ""),
              visitors: Number(x.visitors ?? 0),
              views: Number(x.views ?? 0),
            }));
            // treat tiny arrays as patches
            if (Array.isArray(baseTgv) && arr.length && arr.length < Math.max(6, Math.floor(baseTgv.length / 3))) {
              patchedTgv = applyTgvPatch(baseTgv, arr);
            } else {
              patchedTgv = arr;
            }
          } else if (Array.isArray(frameRaw.time_grouped_visits) && frameRaw.time_grouped_visits.length) {
            const incoming = frameRaw.time_grouped_visits;
            if (Array.isArray(baseTgv) && incoming.length && incoming.length < Math.max(6, Math.floor(baseTgv.length / 3))) {
              patchedTgv = applyTgvPatch(baseTgv, incoming);
            } else {
              patchedTgv = incoming;
            }
          }

          const frame: Partial<DashboardPayload> = { ...frameRaw };
          if (patchedTgv) (frame as any).time_grouped_visits = patchedTgv;

          // ---------- Range mismatch guard ----------
          // If server sent range != current selection (or omitted range), only merge KPIs (and countries).
          const frameRange = (frame as any)?.range as RangeKey | undefined;
          const selected = (W.selectedRange as RangeKey) ?? state.range;
          const useKpiOnly = !frameRange || frameRange !== selected;

          const next = useKpiOnly
            ? mergeKPIsOnly(state.data, frame)
            : mergeSameRange(state.data, frame);

          // WS delta & staleness handling
          const prevTgv = (state.data as any)?.time_grouped_visits as any[] | undefined;
          const nextTgv = (next as any)?.time_grouped_visits as any[] | undefined;

          logTgvDelta("WS", prevTgv, nextTgv);

          // If KPIs changed but TGV didn't for >75s, nudge server
          const kpiChanged =
            (frame as any)?.unique_visitors !== undefined && (frame as any)?.unique_visitors !== (state.data as any)?.unique_visitors ||
            (frame as any)?.multi_page_visits !== undefined && (frame as any)?.multi_page_visits !== (state.data as any)?.multi_page_visits;

          const tgvChanged = JSON.stringify(prevTgv || []) !== JSON.stringify(nextTgv || []);
          if (tgvChanged) lastTgvAt = Date.now();
          else if (!useKpiOnly && kpiChanged && Date.now() - lastTgvAt > 75_000) {
            console.warn("⚠️ [WS] KPIs moving but series stale >75s — requesting series frame…");
            requestSeries();
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
  // keep a window mirror so non-React handlers can read current selection
  W.selectedRange = initialRange;

  const saved = localStorage.getItem("current_website_id");
  if (saved) set({ siteId: Number(saved) });

  if (state.siteId) {
    emitCached(state.siteId, state.range);
    void connectWS(true);
    // WS onopen triggers one-time seed
  }
}

export function setSite(siteId: number) {
  if (state.siteId === siteId) return;
  localStorage.setItem("current_website_id", String(siteId));
  set({ siteId, data: null, isLoading: true, liveCities: [], liveCount: null, error: null, seriesSig: "" });

  emitCached(siteId, state.range);
  void connectWS(true);
}

export function setRange(range: RangeKey) {
  if (state.range === range) return;
  set({ range, data: null, isLoading: true, error: null, seriesSig: "" });
  // mirror to window for any imperative DOM listeners
  W.selectedRange = range;

  if (state.siteId) {
    emitCached(state.siteId, range);
    // keep socket; rely on stream frames; WS onopen (if reconnect) seeds once
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

/* ---------------- Debug hooks ---------------- */
// @ts-ignore
if (typeof window !== "undefined") window.__mvDashSeeded = seeded;
