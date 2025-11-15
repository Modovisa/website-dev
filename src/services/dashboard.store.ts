// src/services/dashboard.store.ts
// One-time REST seed per (siteId:range) + 100% WS stream thereafter.
// - Ranges aligned to BE: 24h | 7d | 30d | 12mo (any 90d → 30d)
// - Never rotates 24h series after WS: axis is always 12 AM → 11 PM
// - Normalizes WS/REST frames to fixed hour order and clamps future hours
// - Merges partial frames: TGV (time_grouped_visits_delta / tiny arrays) + all 24h count series
// - Watchdog pings WS for series if KPIs move but TGV stalls

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
const HOURS_12 = [
  "12 AM","1 AM","2 AM","3 AM","4 AM","5 AM",
  "6 AM","7 AM","8 AM","9 AM","10 AM","11 AM",
  "12 PM","1 PM","2 PM","3 PM","4 PM","5 PM",
  "6 PM","7 PM","8 PM","9 PM","10 PM","11 PM"
] as const;

// BE-supported ranges only
const SUPPORTED_RANGES = ["24h","7d","30d","12mo"] as const;
function normalizeRange(r: RangeKey | string | undefined): RangeKey {
  const v = String(r || "24h");
  return (SUPPORTED_RANGES as readonly string[]).includes(v) ? (v as RangeKey) : ("30d" as RangeKey); // map 90d → 30d
}

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

/** Source-tagged delta log with window-shift hint */
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
    r: normalizeRange(r),
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
    let data = obj.data as DashboardPayload;
    (data as any).range = normalizeRange(range);

    // Defensive: ensure cached 24h is in fixed hour order and future hours zeroed
    data = normalize24hAllSeries(data, state.range) as DashboardPayload;
    data = clamp24hAllSeries(data, state.range) as DashboardPayload;

    const sig = signature(data, state.range);
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
]);

function mergeSameRange(base: DashboardPayload | null, frame: Partial<DashboardPayload>) {
  const merged = { ...(base || {}), ...frame } as DashboardPayload;
  (merged as any).range = normalizeRange(state.range);
  return merged;
}
function mergeKPIsOnly(base: DashboardPayload | null, frame: Partial<DashboardPayload>) {
  const next = { ...(base || {}) } as any;
  for (const k of Object.keys(frame || {})) if (KPI_KEYS.has(k)) next[k] = (frame as any)[k];
  next.range = normalizeRange(state.range);
  return next as DashboardPayload;
}

/** Replace/append by label; clamp to original length; then sort to 12AM→11PM */
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

  return normalizeTgvOrder(out);
}

/* ---------- 24h count-series patching (prevents WS from zeroing future hours) ---------- */
function applyCountPatch(base: any[] | undefined, patch: any[]): any[] {
  const baseNorm = normalizeCountOrder(base) || HOURS_12.map(lbl => ({ label: lbl, count: 0 }));
  const idxBy: Record<string, number> = {};
  baseNorm.forEach((b: any, i: number) => { idxBy[String(b?.label ?? "")] = i; });

  const out = baseNorm.map((b: any) => ({ ...b }));
  for (const p of patch) {
    const lbl = String((p as any)?.label ?? "");
    if (!lbl) continue;
    const j = idxBy[lbl];
    if (j != null) out[j].count = Number((p as any)?.count ?? 0);
  }
  return out;
}

function maybePatchCounts(base: any[] | undefined, incoming: any[] | undefined, range: RangeKey): any[] | undefined {
  if (!Array.isArray(incoming) || !incoming.length) return base;
  if (range !== "24h") return incoming; // Only strict for 24h axis
  if (Array.isArray(base) && base.length === 24 && incoming.length < Math.max(8, Math.floor(base.length / 2))) {
    return applyCountPatch(base, incoming);
  }
  return normalizeCountOrder(incoming);
}

/* ---------- Local-hour guards for 24h (prevents UTC overwrite) ---------- */
function clampCounts(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series) || series.length !== 24) return series;
  const nowHour = new Date().getHours();
  return series.map((pt, i) => (i > nowHour ? { ...pt, count: 0 } : pt));
}
function clampTgv(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series) || series.length !== 24) return series;
  const nowHour = new Date().getHours();
  return series.map((pt, i) => (i > nowHour ? { ...pt, visitors: 0, views: 0 } : pt));
}
function clamp24hAllSeries(payload: Partial<DashboardPayload> | null, range: RangeKey): Partial<DashboardPayload> | null {
  if (!payload || range !== "24h") return payload;
  const out: any = { ...payload };
  out.time_grouped_visits       = clampTgv(out.time_grouped_visits);
  out.events_timeline           = clampCounts(out.events_timeline);
  out.impressions_timeline      = clampCounts(out.impressions_timeline);
  out.clicks_timeline           = clampCounts(out.clicks_timeline);
  out.conversions_timeline      = clampCounts(out.conversions_timeline);
  out.search_visitors_timeline  = clampCounts(out.search_visitors_timeline);
  out.unique_visitors_timeline  = clampCounts(out.unique_visitors_timeline);
  return out;
}

/* ---------- Fixed 12AM→11PM ordering for all 24h series ---------- */
function normalizeTgvOrder(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series)) return series;
  const by = new Map<string, any>();
  for (const x of series) by.set(String(x?.label ?? ""), { label: String(x?.label ?? ""), visitors: Number(x?.visitors||0), views: Number(x?.views||0) });
  const out = HOURS_12.map((lbl) => {
    const v = by.get(lbl);
    return v ? { label: lbl, visitors: v.visitors, views: v.views } : { label: lbl, visitors: 0, views: 0 };
  });
  return out;
}
function normalizeCountOrder(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series)) return series;
  const by = new Map<string, any>();
  for (const x of series) by.set(String(x?.label ?? ""), { label: String(x?.label ?? ""), count: Number(x?.count||0) });
  const out = HOURS_12.map((lbl) => {
    const v = by.get(lbl);
    return v ? { label: lbl, count: v.count } : { label: lbl, count: 0 };
  });
  return out;
}
function normalize24hAllSeries(payload: Partial<DashboardPayload> | null, range: RangeKey): Partial<DashboardPayload> | null {
  if (!payload || range !== "24h") return payload;
  const out: any = { ...payload };
  out.time_grouped_visits       = normalizeTgvOrder(out.time_grouped_visits);
  out.events_timeline           = normalizeCountOrder(out.events_timeline);
  out.impressions_timeline      = normalizeCountOrder(out.impressions_timeline);
  out.clicks_timeline           = normalizeCountOrder(out.clicks_timeline);
  out.conversions_timeline      = normalizeCountOrder(out.conversions_timeline);
  out.search_visitors_timeline  = normalizeCountOrder(out.search_visitors_timeline);
  out.unique_visitors_timeline  = normalizeCountOrder(out.unique_visitors_timeline);
  return out;
}

/* ---------------- REST seed (once per siteId:range) ---------------- */
const seeded = new Set<string>();
let seedInFlight = false;
let lastTgvAt = 0;
const seedKey = () => (state.siteId ? `${state.siteId}:${state.range}` : "");

/** One-time seed fetch for the current (siteId:range). */
export async function fetchSnapshotSeedOnce() {
  if (!state.siteId) return;
  const key = seedKey();
  if (!key || seeded.has(key) || seedInFlight) return;

  seedInFlight = true;
  const tz = String(new Date().getTimezoneOffset());
  const r = normalizeRange(state.range);
  const url = `${API}/api/user-dashboard-analytics?range=${encodeURIComponent(r)}&tz_offset=${encodeURIComponent(tz)}&site_id=${encodeURIComponent(state.siteId)}`;

  try {
    const res = await secureFetch(url, { method: "GET" });
    if (!res.ok) {
      console.error("❌ [REST] Seed snapshot failed:", res.status, await res.text().catch(()=> ""));
      set({ error: `snapshot_${res.status}`, isLoading: false });
      return;
    }
    let data = (await res.json()) as DashboardPayload;
    (data as any).range = r;

    data = normalize24hAllSeries(data, r) as DashboardPayload;
    data = clamp24hAllSeries(data, r) as DashboardPayload;

    logTgvDelta("REST", state.data?.time_grouped_visits as any[], (data as any)?.time_grouped_visits as any[]);

    saveSnapshot(state.siteId, r, data);
    const sig = signature(data, r);

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
  try { ws?.send(JSON.stringify({ type: "request_series", range: normalizeRange(state.range) })); } catch {}
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
      if (W.__mvDashDbg) console.debug("✅ [WS] Connected", { site: state.siteId, range: normalizeRange(state.range) });

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

          const base = state.data as any;
          const frame: Partial<DashboardPayload> = { ...frameRaw };

          // Force range to a supported value
          (frame as any).range = normalizeRange((frame as any)?.range || state.range);

          /* ----- TGV: normalize/patch partial arrays ----- */
          const baseTgv = base?.time_grouped_visits as any[] | undefined;
          let patchedTgv: any[] | undefined;

          if (Array.isArray(frameRaw.time_grouped_visits_delta) && frameRaw.time_grouped_visits_delta.length) {
            patchedTgv = applyTgvPatch(baseTgv, frameRaw.time_grouped_visits_delta);
          } else if (Array.isArray(frameRaw.tgv_delta) && frameRaw.tgv_delta.length) {
            patchedTgv = applyTgvPatch(baseTgv, frameRaw.tgv_delta);
          } else if (Array.isArray(frameRaw.tgv) && frameRaw.tgv.length) {
            const arr = frameRaw.tgv.map((x:any)=>({ label: String(x.label ?? ""), visitors: Number(x.visitors ?? 0), views: Number(x.views ?? 0) }));
            patchedTgv = (Array.isArray(baseTgv) && arr.length && arr.length < Math.max(6, Math.floor(baseTgv.length / 3)))
              ? applyTgvPatch(baseTgv, arr)
              : normalizeTgvOrder(arr);
          } else if (Array.isArray(frameRaw.time_grouped_visits) && frameRaw.time_grouped_visits.length) {
            const incoming = frameRaw.time_grouped_visits;
            patchedTgv = (Array.isArray(baseTgv) && incoming.length && incoming.length < Math.max(6, Math.floor(baseTgv.length / 3)))
              ? applyTgvPatch(baseTgv, incoming)
              : normalizeTgvOrder(incoming);
          }
          if (patchedTgv) (frame as any).time_grouped_visits = patchedTgv;

          /* ----- 24h count series: patch partial WS frames too ----- */
          const r = (frame as any).range as RangeKey;
          const keys: (keyof DashboardPayload)[] = [
            "events_timeline","impressions_timeline","clicks_timeline",
            "conversions_timeline","search_visitors_timeline","unique_visitors_timeline",
          ];
          for (const k of keys) {
            const incoming = (frameRaw as any)[k];
            if (incoming) {
              (frame as any)[k] = maybePatchCounts((base as any)?.[k], incoming, r);
            }
          }

          // Merge frame
          const frameRange = (frame as any)?.range as RangeKey | undefined;
          let next = frameRange && frameRange !== state.range
            ? mergeKPIsOnly(state.data, frame)
            : mergeSameRange(state.data, frame);

          // 1) Normalize hour order, 2) clamp future hours
          next = normalize24hAllSeries(next, frameRange || state.range) as DashboardPayload;
          next = clamp24hAllSeries(next, frameRange || state.range) as DashboardPayload;

          // WS delta & staleness handling
          const prevTgv = (state.data as any)?.time_grouped_visits as any[] | undefined;
          const nextTgv = (next as any)?.time_grouped_visits as any[] | undefined;

          logTgvDelta("WS", prevTgv, nextTgv);

          const kpiChanged =
            (frame as any)?.unique_visitors !== undefined && (frame as any)?.unique_visitors !== (state.data as any)?.unique_visitors ||
            (frame as any)?.multi_page_visits !== undefined && (frame as any)?.multi_page_visits !== (state.data as any)?.multi_page_visits;

          const tgvChanged = JSON.stringify(prevTgv || []) !== JSON.stringify(nextTgv || []);
          if (tgvChanged) lastTgvAt = Date.now();
          else if (kpiChanged && Date.now() - lastTgvAt > 75_000) {
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

  set({ range: normalizeRange(initialRange) });

  const saved = localStorage.getItem("current_website_id");
  if (saved) set({ siteId: Number(saved) });

  if (state.siteId) {
    emitCached(state.siteId, state.range);
    void connectWS(true);
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
  const r = normalizeRange(range);
  if (state.range === r) return;
  set({ range: r, data: null, isLoading: true, error: null, seriesSig: "" });

  if (state.siteId) {
    emitCached(state.siteId, r);
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
