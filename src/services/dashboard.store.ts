// src/services/dashboard.store.ts
// One-time REST seed per (siteId:range) + 100% WS stream thereafter.
// - 24h axis is hard-locked to browser-local 12 AM → 11 PM (no UTC flip)
// - WS frames are *patch-only* for elapsed local hours; never full-replace
// - Non-hour labels (e.g., "OCT 17") are ignored for series updates
// - Visual rebase: rotates UTC 24h feeds by browser TZ (nearest hour) to local
// - Baseline backfill: after WS merges, refill missing/zeroed elapsed buckets
//   with the last REST-seeded values so the left side never “hollows out”.

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
const REQUEST_SERIES_THROTTLE_MS = 20_000;

// If the server’s 24h buckets are in UTC, rotate them by browser TZ
// (Set to false if/when the BE emits site-local hours already)
const ASSUME_UTC_SOURCE = true;

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
  return (SUPPORTED_RANGES as readonly string[]).includes(v) ? (v as RangeKey) : ("30d" as RangeKey);
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
const cacheKey = (sid: number, r: RangeKey, tzOff: number) => `mv:snapshot:${sid}:${r}:${tzOff}`;
const safeJSON = <T = any,>(x: string): T | null => { try { return JSON.parse(x) as T; } catch { return null; } };
const cap = (arr: any[] | undefined, n = 24) => Array.isArray(arr) ? arr.slice(-n) : [];
const sumBy = (arr: any[], k: string) => Array.isArray(arr) ? arr.reduce((s, x) => s + (Number(x?.[k]) || 0), 0) : 0;

// Browser TZ shift, rounded to nearest hour (handles half-hour zones pragmatically)
const TZ_SHIFT_INT = Math.round(-new Date().getTimezoneOffset() / 60); // IST (-330) → +6

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

/* ---------- Hour label canonicalization ---------- */
function canonHourLabel(s: string): string {
  let t = String(s || "")
    .replace(/\u00A0|\u202F/g, " ")
    .replace(/\./g, "")
    .trim()
    .toUpperCase();

  const mCompact = t.match(/^(\d{1,2})\s*(AM|PM)$/);
  if (mCompact) return `${parseInt(mCompact[1], 10)} ${mCompact[2]}`;

  const m24 = t.match(/^(\d{1,2})(?::\d{2})?$/);
  if (m24) {
    let h = Math.max(0, Math.min(23, parseInt(m24[1], 10)));
    const pm = h >= 12;
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12} ${pm ? "PM" : "AM"}`;
  }

  const m12 = t.match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/);
  if (m12) return `${parseInt(m12[1], 10)} ${m12[2]}`;

  return t;
}

const HOUR_IDX: Record<string, number> = HOURS_12.reduce((acc, lbl, i) => {
  acc[canonHourLabel(lbl)] = i; return acc;
}, {} as Record<string, number>);

function isHourLabel(lbl: string): boolean {
  return Object.prototype.hasOwnProperty.call(HOUR_IDX, canonHourLabel(lbl));
}

function restrictPatchToElapsed<T extends { label?: string }>(arr: T[] | undefined): T[] {
  if (!Array.isArray(arr)) return [];
  const nowHour = new Date().getHours();
  return arr.filter((p) => {
    const i = HOUR_IDX[canonHourLabel(String(p?.label ?? ""))];
    return i != null && i <= nowHour;
  });
}

/* ---------- Rotation helpers (UTC → local visual rebase) ---------- */
function rotateTgv(series: any[] | undefined, shift: number): any[] | undefined {
  if (!Array.isArray(series) || series.length !== 24) return series;
  const out = HOURS_12.map((_, i) => {
    const src = ((i - shift) % 24 + 24) % 24;
    const s = series[src] || { label: HOURS_12[src], visitors: 0, views: 0 };
    return { label: HOURS_12[i], visitors: Number(s.visitors || 0), views: Number(s.views || 0) };
  });
  return out;
}
function rotateCounts(series: any[] | undefined, shift: number): any[] | undefined {
  if (!Array.isArray(series) || series.length !== 24) return series;
  const out = HOURS_12.map((_, i) => {
    const src = ((i - shift) % 24 + 24) % 24;
    const s = series[src] || { label: HOURS_12[src], count: 0 };
    return { label: HOURS_12[i], count: Number(s.count || 0) };
  });
  return out;
}

/* ---------- Logging ---------- */
function logTgvDelta(source: "WS" | "REST", prev?: any[], next?: any[]) {
  const P = Array.isArray(prev) ? prev : [];
  const N = Array.isArray(next) ? next : [];
  if (!N.length) return;
  const pv = P.reduce((s,x)=>s+(+x?.views||0),0);
  const nv = N.reduce((s,x)=>s+(+x?.views||0),0);
  const pu = P.reduce((s,x)=>s+(+x?.visitors||0),0);
  const nu = N.reduce((s,x)=>s+(+x?.visitors||0),0);
  const lastLblP = P.length ? P[P.length-1]?.label : undefined;
  const lastLblN = N.length ? N[N.length-1]?.label : undefined;
  const shifted = !!(P.length && N.length && canonHourLabel(String(lastLblP)) === canonHourLabel(String(lastLblN)) && canonHourLabel(String(P[0]?.label)) !== canonHourLabel(String(N[0]?.label)));
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

/* ---------- Baseline (last full 24h) for backfill ---------- */
type Baseline = {
  tgv?: { label: string; visitors: number; views: number }[];
  counts: Record<string, { label: string; count: number }[]>;
};
let baseline: Baseline = { counts: {} };

function captureBaseline(d: Partial<DashboardPayload> | null) {
  if (!d) return;

  // Keep the generic, but tell TS exactly what T is at each callsite.
  const saveIf24 = <T extends { label: string }>(arr?: T[]) =>
    (Array.isArray(arr) && arr.length === 24 ? arr : undefined);

  // TGV: has visitors + views
  const tgv = saveIf24<{ label: string; visitors: number; views: number }>(
    (d as any).time_grouped_visits
  );
  if (tgv) {
    baseline.tgv = tgv.map((x) => ({
      label: String(x.label),
      visitors: +x.visitors || 0,
      views: +x.views || 0,
    }));
  }

  // Count series: has count
  const keys: (keyof DashboardPayload)[] = [
    "events_timeline",
    "impressions_timeline",
    "clicks_timeline",
    "conversions_timeline",
    "search_visitors_timeline",
    "unique_visitors_timeline",
  ];

  for (const k of keys) {
    const arr = saveIf24<{ label: string; count: number }>((d as any)[k]);
    if (arr) {
      baseline.counts[String(k)] = arr.map((x) => ({
        label: String(x.label),
        count: +x.count || 0,
      }));
    }
  }
}


function backfillFromBaseline(next: Partial<DashboardPayload> | null): Partial<DashboardPayload> | null {
  if (!next) return next;
  const nowHour = new Date().getHours();
  const out: any = { ...next };

  // TGV
  if (Array.isArray(out.time_grouped_visits) && out.time_grouped_visits.length === 24 && baseline.tgv?.length === 24) {
    out.time_grouped_visits = out.time_grouped_visits.map((pt: any, i: number) => {
      if (i > nowHour) return pt; // never prefill future
      const base = baseline.tgv![i];
      const v = Number(pt?.visitors || 0);
      const w = Number(pt?.views || 0);
      // Only backfill when WS left the bucket at 0/0 and baseline had data
      if (v === 0 && w === 0 && (base.visitors > 0 || base.views > 0)) {
        return { label: pt.label, visitors: base.visitors, views: base.views };
      }
      return pt;
    });
  }

  // Count series
  const COUNT_KEYS: (keyof DashboardPayload)[] = [
    "events_timeline","impressions_timeline","clicks_timeline",
    "conversions_timeline","search_visitors_timeline","unique_visitors_timeline",
  ];
  for (const k of COUNT_KEYS) {
    const arr = out[String(k)];
    const base = baseline.counts[String(k)];
    if (Array.isArray(arr) && arr.length === 24 && Array.isArray(base) && base.length === 24) {
      out[String(k)] = arr.map((pt: any, i: number) => {
        if (i > nowHour) return pt;
        const b = base[i];
        const c = Number(pt?.count || 0);
        if (c === 0 && (b.count > 0)) return { label: pt.label, count: b.count };
        return pt;
      });
    }
  }

  return out;
}

function saveSnapshot(siteId: number, range: RangeKey, data: DashboardPayload) {
  try {
    const tzOff = new Date().getTimezoneOffset();
    localStorage.setItem(cacheKey(siteId, range, tzOff), JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

function emitCached(siteId: number, range: RangeKey) {
  try {
    const tzOff = new Date().getTimezoneOffset();
    const raw = localStorage.getItem(cacheKey(siteId, range, tzOff));
    if (!raw) return false;
    const obj = JSON.parse(raw) as { ts: number; data: DashboardPayload };
    if (!obj?.data) return false;
    let data = obj.data as DashboardPayload;
    (data as any).range = normalizeRange(range);

    data = normalize24hAllSeries(data, state.range) as DashboardPayload;
    data = clamp24hAllSeries(data, state.range) as DashboardPayload;

    captureBaseline(data);

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

/* ---------- Merge policy ---------- */
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

/* ---------- Patchers ---------- */
function applyTgvPatch(base: any[] | undefined, patch: any[]): any[] {
  const out = Array.isArray(base) ? base.map(b => ({ ...b })) : [];
  const labels = out.map(b => canonHourLabel(String(b?.label)));
  for (const p of patch) {
    const lbl = canonHourLabel(String((p as any)?.label ?? ""));
    if (!lbl || !isHourLabel(lbl)) continue;
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

function applyCountPatch(base: any[] | undefined, patch: any[]): any[] {
  const baseNorm = normalizeCountOrder(base) || HOURS_12.map(lbl => ({ label: lbl, count: 0 }));
  const idxBy: Record<string, number> = {};
  baseNorm.forEach((b: any, i: number) => { idxBy[canonHourLabel(String(b?.label ?? ""))] = i; });

  const out = baseNorm.map((b: any) => ({ ...b }));
  for (const p of patch) {
    const lbl = canonHourLabel(String((p as any)?.label ?? ""));
    if (!lbl || !isHourLabel(lbl)) continue;
    const j = idxBy[lbl];
    if (j != null) out[j].count = Number((p as any)?.count ?? 0);
  }
  return out;
}

function maybePatchCounts(base: any[] | undefined, incoming: any[] | undefined, range: RangeKey): any[] | undefined {
  if (!Array.isArray(incoming) || !incoming.length) return base;
  if (range !== "24h") return incoming;

  if (Array.isArray(base) && base.length === 24) {
    const patch = restrictPatchToElapsed(incoming);
    if (!patch.length) return base;
    return applyCountPatch(base, patch);
  }
  return normalizeCountOrder(incoming);
}

/* ---------- 24h guards ---------- */
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

/* ---------- 24h normalization + optional rotation ---------- */
function normalizeTgvOrder(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series)) return series;
  const by = new Map<string, any>();
  for (const x of series) {
    const lbl = canonHourLabel(String(x?.label ?? ""));
    if (!isHourLabel(lbl)) continue;
    by.set(lbl, { label: lbl, visitors: Number(x?.visitors||0), views: Number(x?.views||0) });
  }
  const out = HOURS_12.map((lbl) => {
    const key = canonHourLabel(lbl);
    const v = by.get(key);
    return v ? { label: key, visitors: v.visitors, views: v.views } : { label: key, visitors: 0, views: 0 };
  });
  return out;
}
function normalizeCountOrder(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series)) return series;
  const by = new Map<string, any>();
  for (const x of series) {
    const lbl = canonHourLabel(String(x?.label ?? ""));
    if (!isHourLabel(lbl)) continue;
    by.set(lbl, { label: lbl, count: Number(x?.count||0) });
  }
  const out = HOURS_12.map((lbl) => {
    const key = canonHourLabel(lbl);
    const v = by.get(key);
    return v ? { label: key, count: v.count } : { label: key, count: 0 };
  });
  return out;
}

function normalize24hAllSeries(payload: Partial<DashboardPayload> | null, range: RangeKey): Partial<DashboardPayload> | null {
  if (!payload || range !== "24h") return payload;
  const out: any = { ...payload };

  // If any labels are *not* hour-like (dates, words), discard those series updates
  const guard = (s: any[] | undefined) => Array.isArray(s) && s.every(pt => isHourLabel(String(pt?.label ?? "")));

  if (guard(out.time_grouped_visits)) out.time_grouped_visits = normalizeTgvOrder(out.time_grouped_visits);
  if (guard(out.events_timeline)) out.events_timeline = normalizeCountOrder(out.events_timeline);
  if (guard(out.impressions_timeline)) out.impressions_timeline = normalizeCountOrder(out.impressions_timeline);
  if (guard(out.clicks_timeline)) out.clicks_timeline = normalizeCountOrder(out.clicks_timeline);
  if (guard(out.conversions_timeline)) out.conversions_timeline = normalizeCountOrder(out.conversions_timeline);
  if (guard(out.search_visitors_timeline)) out.search_visitors_timeline = normalizeCountOrder(out.search_visitors_timeline);
  if (guard(out.unique_visitors_timeline)) out.unique_visitors_timeline = normalizeCountOrder(out.unique_visitors_timeline);

  // Optional: rotate UTC → local (nearest hour) to keep “now” column local
  if (ASSUME_UTC_SOURCE) {
    out.time_grouped_visits       = rotateTgv(out.time_grouped_visits, TZ_SHIFT_INT);
    out.events_timeline           = rotateCounts(out.events_timeline, TZ_SHIFT_INT);
    out.impressions_timeline      = rotateCounts(out.impressions_timeline, TZ_SHIFT_INT);
    out.clicks_timeline           = rotateCounts(out.clicks_timeline, TZ_SHIFT_INT);
    out.conversions_timeline      = rotateCounts(out.conversions_timeline, TZ_SHIFT_INT);
    out.search_visitors_timeline  = rotateCounts(out.search_visitors_timeline, TZ_SHIFT_INT);
    out.unique_visitors_timeline  = rotateCounts(out.unique_visitors_timeline, TZ_SHIFT_INT);
  }

  return out;
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

/* ---------------- REST seed (once per siteId:range) ---------------- */
const seeded = new Set<string>();
let seedInFlight = false;
let lastTgvAt = 0;
let lastSeriesRequestAt = 0;
const seedKey = () => {
  if (!state.siteId) return "";
  const tzOff = new Date().getTimezoneOffset();
  return `${state.siteId}:${state.range}:${tzOff}`;
};

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

    // Save baseline BEFORE set() so first WS frame can backfill confidently
    captureBaseline(data);

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
  const now = Date.now();
  if (now - lastSeriesRequestAt < REQUEST_SERIES_THROTTLE_MS) return;
  lastSeriesRequestAt = now;
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

      // Hint TZ (safe if ignored by BE)
      try {
        const tzOff = new Date().getTimezoneOffset();
        const tzIana = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        socket.send(JSON.stringify({ type: "client_tz", tz_offset: tzOff, tz_iana: tzIana }));
      } catch {}

      // keepalive
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try { socket.send(JSON.stringify({ type: "ping" })); } catch {}
        }
      }, 25_000) as unknown as number;

      // One-time REST seed after socket opens (per siteId:range)
      void fetchSnapshotSeedOnce();
    };

    socket.onmessage = (ev) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg = safeJSON<any>(ev.data);
      if (!msg) return;
      if (state.siteId && String(msg?.site_id ?? "") !== String(state.siteId)) return;

      /* ---- DIAGNOSTIC ---- */
      try {
        const nowHour = new Date().getHours();
        const nowLabel = canonHourLabel(HOURS_12[nowHour]);
        const baseLabels = (state.data?.time_grouped_visits ?? []).map((b:any) => canonHourLabel(String(b?.label)));
        const incLabels = (
          msg?.payload?.time_grouped_visits_delta ??
          msg?.payload?.tgv_delta ??
          msg?.payload?.tgv ??
          msg?.payload?.time_grouped_visits ?? []
        ).map((p:any) => String(p?.label ?? ""));
        if (incLabels.length) {
          const uniq = Array.from(new Set(incLabels));
          const baseLast = baseLabels.length ? baseLabels[baseLabels.length - 1] : undefined;
          console.warn("[DIAG] 24h seed axis (local) anchored to:", baseLabels[0], "…", baseLast);
          console.warn("[DIAG] Incoming WS labels:", uniq.join(", "));
          if (!uniq.map(canonHourLabel).some(l => l === nowLabel)) {
            console.warn(`[DIAG] WS frame missing current local hour '${nowLabel}'. Requesting 24h series…`);
            requestSeries();
          }
        }
      } catch {}

      switch (msg.type) {
        case "dashboard_analytics":
        case "analytics_frame": {
          const raw = (msg.payload || {}) as Partial<DashboardPayload> & {
            time_grouped_visits?: any[]; time_grouped_visits_delta?: any[]; tgv_delta?: any[]; tgv?: any[];
            events_timeline?: any[]; impressions_timeline?: any[]; clicks_timeline?: any[];
            conversions_timeline?: any[]; search_visitors_timeline?: any[]; unique_visitors_timeline?: any[];
            range?: RangeKey;
          };

          const base = state.data as any;
          const frame: Partial<DashboardPayload> = { ...raw };
          (frame as any).range = normalizeRange((frame as any)?.range || state.range);
          const r = (frame as any).range as RangeKey;

          // If BE’s frame range mismatches UI, accept KPIs only; ask for series
          if (r !== state.range) {
            set({ data: mergeKPIsOnly(state.data, frame), isLoading: false, analyticsVersion: state.analyticsVersion + 1, error: null });
            requestSeries();
            return;
          }

          // Reject non-hour series frames (e.g., date labels) to prevent flips
          const isHourSeries = (arr?: any[]) => Array.isArray(arr) && arr.length && arr.every(x => isHourLabel(String(x?.label ?? "")));

          // ----- TGV: ALWAYS PATCH-ONLY for 24h -----
          const baseTgv = base?.time_grouped_visits as any[] | undefined;
          const patchSrc =
            (raw.time_grouped_visits_delta && isHourSeries(raw.time_grouped_visits_delta) && raw.time_grouped_visits_delta) ||
            (raw.tgv_delta && isHourSeries(raw.tgv_delta) && raw.tgv_delta) ||
            (raw.tgv && isHourSeries(raw.tgv) && raw.tgv) ||
            (raw.time_grouped_visits && isHourSeries(raw.time_grouped_visits) && raw.time_grouped_visits) ||
            null;

          if (patchSrc) {
            const canon = patchSrc.map((x:any)=>({ ...x, label: canonHourLabel(String(x?.label ?? "")) }));
            (frame as any).time_grouped_visits = applyTgvPatch(baseTgv, restrictPatchToElapsed(canon));
          } else {
            delete (frame as any).time_grouped_visits; // ignore bad labels
          }

          // ----- Counts: PATCH-ONLY, ignore non-hour labels -----
          const COUNT_KEYS: (keyof DashboardPayload)[] = [
            "events_timeline","impressions_timeline","clicks_timeline",
            "conversions_timeline","search_visitors_timeline","unique_visitors_timeline",
          ];
          for (const k of COUNT_KEYS) {
            const incoming = (raw as any)[`${String(k)}_delta`] ?? (raw as any)[k];
            if (!incoming || !isHourSeries(incoming)) continue;
            const canon = incoming.map((x:any)=>({ ...x, label: canonHourLabel(String(x?.label ?? "")) }));
            (frame as any)[k] = maybePatchCounts((base as any)?.[k], canon, r);
          }

          // Merge + normalize + rotate + clamp
          let next = mergeSameRange(state.data, frame);
          next = normalize24hAllSeries(next, r) as DashboardPayload;

          // Backfill from REST baseline for elapsed hours so the left side never hollows out
          next = backfillFromBaseline(next) as DashboardPayload;

          next = clamp24hAllSeries(next, r) as DashboardPayload;

          // Staleness watchdog
          const prevTgv = (state.data as any)?.time_grouped_visits as any[] | undefined;
          const nextTgv = (next as any)?.time_grouped_visits as any[] | undefined;
          logTgvDelta("WS", prevTgv, nextTgv);

          const kpiChanged =
            (frame as any)?.unique_visitors !== undefined && (frame as any)?.unique_visitors !== (state.data as any)?.unique_visitors ||
            (frame as any)?.multi_page_visits !== undefined && (frame as any)?.multi_page_visits !== (state.data as any)?.multi_page_visits;

          const countsChanged = COUNT_KEYS.some((k) => JSON.stringify((state.data as any)?.[k] || []) !== JSON.stringify((next as any)?.[k] || []));
          const tgvChanged = JSON.stringify(prevTgv || []) !== JSON.stringify(nextTgv || []);
          if (tgvChanged) lastTgvAt = Date.now();
          else if (kpiChanged && Date.now() - lastTgvAt > 75_000) {
            console.warn("⚠️ [WS] KPIs moving but series stale >75s — requesting series frame…");
            requestSeries();
          }

          // Update baseline whenever we end up with a full normalized 24h
          captureBaseline(next);

          const prevSig = state.seriesSig;
          const sig = signature(next, state.range);
          const bump = tgvChanged || countsChanged || sig !== prevSig;

          // recompute live count from liveCities if present
          let liveCount = state.liveCount;
          if (Array.isArray(state.liveCities) && state.liveCities.length) {
            liveCount = state.liveCities.reduce((s, p) => s + (p.count || 0), 0);
          } else if ((next as any).live_visitors != null) {
            liveCount = Number((next as any).live_visitors) || liveCount || 0;
          }

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

  // Reset baseline when starting fresh
  baseline = { counts: {} };

  if (state.siteId) {
    emitCached(state.siteId, state.range);
    void connectWS(true);
  }
}

export function setSite(siteId: number) {
  if (state.siteId === siteId) return;
  localStorage.setItem("current_website_id", String(siteId));
  set({ siteId, data: null, isLoading: true, liveCities: [], liveCount: null, error: null, seriesSig: "" });

  // Clear baseline for the new site
  baseline = { counts: {} };

  emitCached(siteId, state.range);
  void connectWS(true);
}

export function setRange(range: RangeKey) {
  const r = normalizeRange(range);
  if (state.range === r) return;
  set({ range: r, data: null, isLoading: true, error: null, seriesSig: "" });

  // Clear baseline for the new range
  baseline = { counts: {} };

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
