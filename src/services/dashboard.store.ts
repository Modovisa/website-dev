// src/services/dashboard.store.ts
// Simplified + strict behaviour:
//
// 1. Each chart only listens to WS frames for its OWN range.
//    - If UI is on "24h", only frames with range === "24h" can touch the series.
//    - 7d/30d/90d/12mo WS frames are ignored for 24h (and vice-versa).
//
// 2. 24h axis is fixed to local "12 AM → 11 PM".
//    - We normalize labels into that order, no rotation.
//    - No baseline/backfill. The series is exactly what the BE sends for that range,
//      plus minimal patching for *_delta fields.
//
// 3. No cross-range KPI merging, no stale watchdogs, no backfills.
//    - This removes all the “swinging” caused by mixing multiple ranges.
//
// 4. API surface is unchanged: init, setSite, setRange, fetchSnapshot, fetchSnapshotHard,
//    connectWS, useDashboard, getTrackingWebsites.

import { useSyncExternalStore } from "react";
import { secureFetch } from "@/lib/auth/auth";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

/* ---------------- Types ---------------- */
// Local union that includes your global RangeKey plus "24h"
type AnyRange = RangeKey | "24h";

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
  range: AnyRange;
};

export type TrackingWebsite = {
  id: number;
  website_name: string;
  domain: string;
};

/* ---------------- Consts ---------------- */
const API = "https://api.modovisa.com";
const BACKOFF_MAX = 60_000;
const TICKET_THROTTLE_MS = 1500;
const REQUEST_SERIES_THROTTLE_MS = 20_000;

const HOURS_12 = [
  "12 AM",
  "1 AM",
  "2 AM",
  "3 AM",
  "4 AM",
  "5 AM",
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
  "9 PM",
  "10 PM",
  "11 PM",
] as const;

const SUPPORTED_RANGES = ["24h", "7d", "30d", "90d", "12mo"] as const;

function normalizeRange(
  r: AnyRange | string | undefined
): AnyRange {
  const v = String(r || "24h");
  return (SUPPORTED_RANGES as readonly string[]).includes(v)
    ? (v as AnyRange)
    : ("30d" as AnyRange);
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
const set = (partial: Partial<StoreState>) => {
  state = { ...state, ...partial };
  notify();
};

/* ---------------- Helpers ---------------- */
const W: any = typeof window !== "undefined" ? window : {};
const cacheKey = (sid: number, r: AnyRange, tzOff: number) =>
  `mv:snapshot:${sid}:${r}:${tzOff}`;

const safeJSON = <T = any,>(x: string): T | null => {
  try {
    return JSON.parse(x) as T;
  } catch {
    return null;
  }
};

const cap = (arr: any[] | undefined, n = 24) =>
  Array.isArray(arr) ? arr.slice(-n) : [];
const sumBy = (arr: any[], k: string) =>
  Array.isArray(arr)
    ? arr.reduce((s, x) => s + (Number(x?.[k]) || 0), 0)
    : 0;

/** Normalize incoming live city clusters */
function normalizeCities(payload: any): GeoCityPoint[] {
  const arr = Array.isArray(payload) ? payload : [];
  return arr
    .map((v: any) => ({
      city: String(v?.city ?? "Unknown"),
      country: String(v?.country ?? "Unknown"),
      lat: Number(v?.lat) || 0,
      lng: Number(v?.lng) || 0,
      count: Number(v?.count) || 0,
      debug_ids: Array.isArray(v?.debug_ids) ? v.debug_ids : undefined,
    }))
    .filter((p) => p.lat !== 0 || p.lng !== 0);
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
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return `${h12} ${pm ? "PM" : "AM"}`;
  }

  const m12 = t.match(/^(\d{1,2})(?::\d{2})?\s*(AM|PM)$/);
  if (m12) return `${parseInt(m12[1], 10)} ${m12[2]}`;

  return t;
}

const HOUR_IDX: Record<string, number> = HOURS_12.reduce(
  (acc, lbl, i) => {
    acc[canonHourLabel(lbl)] = i;
    return acc;
  },
  {} as Record<string, number>
);

function isHourLabel(lbl: string): boolean {
  return Object.prototype.hasOwnProperty.call(
    HOUR_IDX,
    canonHourLabel(lbl)
  );
}

function restrictPatchToElapsed<T extends { label?: string }>(
  arr: T[] | undefined
): T[] {
  if (!Array.isArray(arr)) return [];
  const nowHour = new Date().getHours(); // LOCAL hour
  return arr.filter((p) => {
    const i = HOUR_IDX[canonHourLabel(String(p?.label ?? ""))];
    return i != null && i <= nowHour;
  });
}

/* ---------- Logging ---------- */
function logTgvDelta(source: "WS" | "REST", prev?: any[], next?: any[]) {
  const P = Array.isArray(prev) ? prev : [];
  const N = Array.isArray(next) ? next : [];
  if (!N.length) return;
  const pv = P.reduce((s, x) => s + (+x?.views || 0), 0);
  const nv = N.reduce((s, x) => s + (+x?.views || 0), 0);
  const pu = P.reduce((s, x) => s + (+x?.visitors || 0), 0);
  const nu = N.reduce((s, x) => s + (+x?.visitors || 0), 0);
  if (pv !== nv || pu !== nu) {
    console.log(
      `📈 [${source} TGV Δ] views: ${pv} → ${nv}, visitors: ${pu} → ${nu}, buckets: ${N.length}`
    );
  } else {
    console.log(
      `⏸ [${source} TGV] no change (views=${nv}, visitors=${nu})`
    );
  }
}

function signature(d: DashboardPayload | null, r: AnyRange): string {
  if (!d) return "";
  const tgv = cap((d as any).time_grouped_visits);
  const evt = cap((d as any).events_timeline);
  const uv = cap((d as any).unique_visitors_timeline);
  const imp = cap((d as any).impressions_timeline);
  const clk = cap((d as any).clicks_timeline);
  const src = cap((d as any).search_visitors_timeline);
  const cnv = cap((d as any).conversions_timeline);
  return JSON.stringify({
    r: normalizeRange(r),
    tgvL: tgv.length,
    tgvV: sumBy(tgv, "visitors"),
    tgvW: sumBy(tgv, "views"),
    evtL: evt.length,
    evtC: sumBy(evt, "count"),
    uvL: uv.length,
    uvC: sumBy(uv, "count"),
    impL: imp.length,
    impC: sumBy(imp, "count"),
    clkL: clk.length,
    clkC: sumBy(clk, "count"),
    srcL: src.length,
    srcC: sumBy(src, "count"),
    cnvL: cnv.length,
    cnvC: sumBy(cnv, "count"),
  });
}

/* ---------- 24h normalization ---------- */
function normalizeTgvOrder(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series)) return series;
  const by = new Map<string, any>();
  for (const x of series) {
    const lbl = canonHourLabel(String(x?.label ?? ""));
    if (!isHourLabel(lbl)) continue;
    by.set(lbl, {
      label: lbl,
      visitors: Number(x?.visitors || 0),
      views: Number(x?.views || 0),
    });
  }
  const out = HOURS_12.map((lbl) => {
    const key = canonHourLabel(lbl);
    const v = by.get(key);
    return v
      ? { label: key, visitors: v.visitors, views: v.views }
      : { label: key, visitors: 0, views: 0 };
  });
  return out;
}

function normalizeCountOrder(series: any[] | undefined): any[] | undefined {
  if (!Array.isArray(series)) return series;
  const by = new Map<string, any>();
  for (const x of series) {
    const lbl = canonHourLabel(String(x?.label ?? ""));
    if (!isHourLabel(lbl)) continue;
    by.set(lbl, { label: lbl, count: Number(x?.count || 0) });
  }
  const out = HOURS_12.map((lbl) => {
    const key = canonHourLabel(lbl);
    const v = by.get(key);
    return v ? { label: key, count: v.count } : { label: key, count: 0 };
  });
  return out;
}

function normalize24hFrame(
  frame: Partial<DashboardPayload>
): Partial<DashboardPayload> {
  const out: any = { ...frame };

  const guard = (s: any[] | undefined) =>
    Array.isArray(s) && s.every((pt) => isHourLabel(String(pt?.label ?? "")));

  if (guard(out.time_grouped_visits)) {
    out.time_grouped_visits = normalizeTgvOrder(out.time_grouped_visits);
  }

  const COUNT_KEYS: (keyof DashboardPayload)[] = [
    "events_timeline",
    "impressions_timeline",
    "clicks_timeline",
    "conversions_timeline",
    "search_visitors_timeline",
    "unique_visitors_timeline",
  ];

  for (const k of COUNT_KEYS) {
    const arr = out[String(k)];
    if (guard(arr)) {
      out[String(k)] = normalizeCountOrder(arr);
    }
  }

  return out;
}

/* ---------- Patchers for 24h delta fields ---------- */
function applyTgvPatch(base: any[] | undefined, patch: any[]): any[] {
  const baseNorm =
    normalizeTgvOrder(base) ||
    HOURS_12.map((lbl) => ({
      label: lbl,
      visitors: 0,
      views: 0,
    }));

  const idxBy: Record<string, number> = {};
  baseNorm.forEach((b: any, i: number) => {
    idxBy[canonHourLabel(String(b?.label ?? ""))] = i;
  });

  for (const p of patch) {
    const lbl = canonHourLabel(String((p as any)?.label ?? ""));
    if (!lbl || !isHourLabel(lbl)) continue;
    const j = idxBy[lbl];
    if (j == null) continue;
    const v = Number((p as any)?.visitors ?? 0);
    const w = Number((p as any)?.views ?? 0);
    baseNorm[j] = {
      label: baseNorm[j].label,
      visitors: v,
      views: w,
    };
  }
  return baseNorm;
}

function applyCountPatch(base: any[] | undefined, patch: any[]): any[] {
  const baseNorm =
    normalizeCountOrder(base) ||
    HOURS_12.map((lbl) => ({ label: lbl, count: 0 }));
  const idxBy: Record<string, number> = {};
  baseNorm.forEach((b: any, i: number) => {
    idxBy[canonHourLabel(String(b?.label ?? ""))] = i;
  });

  const out = baseNorm.map((b: any) => ({ ...b }));
  for (const p of patch) {
    const lbl = canonHourLabel(String((p as any)?.label ?? ""));
    if (!lbl || !isHourLabel(lbl)) continue;
    const j = idxBy[lbl];
    if (j != null) {
      out[j].count = Number((p as any)?.count ?? 0);
    }
  }
  return out;
}

/* ---------------- REST seed ---------------- */
const seeded = new Set<string>();
let seedInFlight = false;

const seedKey = () => {
  if (!state.siteId) return "";
  const tzOff = new Date().getTimezoneOffset();
  return `${state.siteId}:${state.range}:${tzOff}`;
};

function saveSnapshot(
  siteId: number,
  range: AnyRange,
  data: DashboardPayload
) {
  try {
    const tzOff = new Date().getTimezoneOffset();
    localStorage.setItem(
      cacheKey(siteId, range, tzOff),
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    // ignore
  }
}

function emitCached(siteId: number, range: AnyRange) {
  try {
    const tzOff = new Date().getTimezoneOffset();
    const raw = localStorage.getItem(cacheKey(siteId, range, tzOff));
    if (!raw) return false;
    const obj = JSON.parse(raw) as { ts: number; data: DashboardPayload };
    if (!obj?.data) return false;
    let data = obj.data as DashboardPayload;
    (data as any).range = normalizeRange(range);

    if (range === "24h") {
      data = normalize24hFrame(data) as DashboardPayload;
    }

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
  } catch {
    return false;
  }
}

export async function fetchSnapshotSeedOnce() {
  if (!state.siteId) return;

  const r = normalizeRange(state.range);
  // 24h range is WS-only now; no REST snapshot to avoid jumps.
  if (r === "24h") return;

  const key = seedKey();
  if (!key || seeded.has(key) || seedInFlight) return;
  await doFetchSnapshot(true);
}

async function doFetchSnapshot(addToSeeded: boolean) {
  if (!state.siteId) return;

  const r = normalizeRange(state.range);

  // Safety: don't issue REST calls for 24h at all, we rely on WS frames.
  if (r === "24h") return;

  seedInFlight = true;
  const tz = String(new Date().getTimezoneOffset());
  const url = `${API}/api/user-dashboard-analytics?range=${encodeURIComponent(
    r
  )}&tz_offset=${encodeURIComponent(tz)}&site_id=${encodeURIComponent(
    state.siteId
  )}`;

  try {
    const res = await secureFetch(url, { method: "GET" });
    if (!res.ok) {
      console.error(
        "❌ [REST] Snapshot failed:",
        res.status,
        await res.text().catch(() => "")
      );
      set({ error: `snapshot_${res.status}`, isLoading: false });
      return;
    }

    let data = (await res.json()) as DashboardPayload;
    (data as any).range = r;

    logTgvDelta(
      "REST",
      state.data?.time_grouped_visits as any[],
      (data as any)?.time_grouped_visits as any[]
    );

    saveSnapshot(state.siteId!, r, data);
    const sig = signature(data, r);

    set({
      data,
      isLoading: false,
      analyticsVersion: state.analyticsVersion + 1,
      frameKey: state.frameKey + 1,
      seriesSig: sig,
      error: null,
    });

    if (addToSeeded) seeded.add(seedKey());
    if (W.__mvDashDbg) console.debug("✅ [REST] Snapshot loaded");
  } catch (e: any) {
    console.error("❌ [REST] Snapshot error:", e?.message || e);
    set({ error: "snapshot_error", isLoading: false });
  } finally {
    seedInFlight = false;
  }
}

/** Hard refresh that ignores the one-time 'seeded' guard */
export async function fetchSnapshotHard() {
  await doFetchSnapshot(false);
}

/** COMPAT alias for Dashboard.tsx */
export async function fetchSnapshot() {
  return fetchSnapshotSeedOnce();
}

export async function getTrackingWebsites(): Promise<TrackingWebsite[]> {
  const res = await secureFetch(`${API}/api/tracking-websites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok)
    throw new Error(
      `tracking_websites_${res.status}:${await res
        .text()
        .catch(() => "")}`
    );
  const j = (await res.json()) as {
    projects: Array<{
      id: number;
      website_name?: string;
      name?: string;
      domain?: string;
    }>;
  };
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
let lastSeriesRequestAt = 0;

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
    if (!res.ok)
      throw new Error(
        `ticket_${res.status}:${await res.text().catch(() => "")}`
      );
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
  try {
    ws?.send(
      JSON.stringify({
        type: "request_series",
        range: normalizeRange(state.range),
      })
    );
  } catch {
    // ignore
  }
}

export async function connectWS(forceNew = false) {
  if (!state.siteId) return;
  if (!forceNew && ws && ws.readyState === WebSocket.OPEN) return;
  if (wsConnecting) return;

  wsConnecting = true;
  if (pingTimer) {
    window.clearInterval(pingTimer);
    pingTimer = null;
  }

  try {
    try {
      ws?.close();
    } catch {
      // ignore
    }
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
    const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(
      ticket
    )}`;
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (W.__mvDashDbg)
        console.debug("✅ [WS] Connected", {
          site: state.siteId,
          range: normalizeRange(state.range),
        });

      // Hint TZ (safe if ignored by BE)
      try {
        const tzOff = new Date().getTimezoneOffset();
        const tzIana =
          Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        socket.send(
          JSON.stringify({
            type: "client_tz",
            tz_offset: tzOff,
            tz_iana: tzIana,
          })
        );
      } catch {
        // ignore
      }

      // keepalive
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ type: "ping" }));
          } catch {
            // ignore
          }
        }
      }, 25_000) as unknown as number;

      // For non-24h ranges we still seed once via REST
      void fetchSnapshotSeedOnce();

      // Ask BE for a fresh series for current range
      requestSeries();
    };

    socket.onmessage = (ev) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg = safeJSON<any>(ev.data);
      if (!msg) return;
      if (
        state.siteId &&
        String(msg?.site_id ?? "") !== String(state.siteId)
      )
        return;

      switch (msg.type) {
        case "dashboard_analytics":
        case "analytics_frame": {
          handleAnalyticsFrame(msg.payload || {});
          break;
        }

        case "live_visitor_location_grouped": {
          const points = normalizeCities(msg.payload || []);
          const total = points.reduce((s, p) => s + (p.count || 0), 0);
          set({ liveCities: points, liveCount: total });
          break;
        }

        case "live_visitor_update": {
          set({
            liveCount: Number(msg?.payload?.count ?? 0) || 0,
          });
          break;
        }
      }
    };

    socket.onerror = (e) => console.error("❌ [WS] error:", e);
    socket.onclose = (e) => {
      if (W.__mvDashDbg)
        console.warn("🔌 [WS] closed:", e.code, e.reason);
      if (pingTimer) {
        window.clearInterval(pingTimer);
        pingTimer = null;
      }
      scheduleReconnect(backoffMs);
      backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
    };
  } finally {
    wsConnecting = false;
  }
}

/* ---------- WS analytics handler (core behaviour) ---------- */
function handleAnalyticsFrame(raw: any) {
  const base = state.data as any;

  const incomingRange = normalizeRange(
    (raw as any)?.range || state.range
  );

  // STRICT: Only process frames for the currently selected range.
  if (incomingRange !== state.range) {
    if (W.__mvDashDbg) {
      console.debug(
        "[WS] Ignoring analytics frame for range",
        incomingRange,
        "while UI is on",
        state.range
      );
    }
    return;
  }

  const range = incomingRange;
  const is24h = range === "24h";
  const frame: any = { ...raw, range };

  // Diagnostics: show labels BE is sending
  try {
    const incLabels =
      (frame.time_grouped_visits_delta ||
        frame.tgv_delta ||
        frame.tgv ||
        frame.time_grouped_visits ||
        [])?.map((p: any) => String(p?.label ?? ""));
    if (incLabels.length) {
      const uniq = Array.from(new Set(incLabels));
      console.warn("[DIAG] Incoming WS labels:", uniq.join(", "));
    }
  } catch {
    // ignore
  }

  // --- 24h specialised logic: use *_delta when present, else use full series ---
  if (is24h) {
    const baseTgv = base?.time_grouped_visits as any[] | undefined;

    const isHourSeries = (arr?: any[]) =>
      Array.isArray(arr) &&
      arr.length &&
      arr.every((x) => isHourLabel(String(x?.label ?? "")));

    const tgvDelta =
      (frame.time_grouped_visits_delta &&
        isHourSeries(frame.time_grouped_visits_delta) &&
        frame.time_grouped_visits_delta) ||
      (frame.tgv_delta &&
        isHourSeries(frame.tgv_delta) &&
        frame.tgv_delta) ||
      null;

    if (tgvDelta) {
      const canon = restrictPatchToElapsed(
        tgvDelta.map((x: any) => ({
          ...x,
          label: canonHourLabel(String(x?.label ?? "")),
        }))
      );
      frame.time_grouped_visits = applyTgvPatch(baseTgv, canon);
    } else if (
      frame.time_grouped_visits &&
      isHourSeries(frame.time_grouped_visits)
    ) {
      frame.time_grouped_visits = normalizeTgvOrder(
        frame.time_grouped_visits
      );
    } else {
      delete frame.time_grouped_visits;
    }

    const COUNT_KEYS: (keyof DashboardPayload)[] = [
      "events_timeline",
      "impressions_timeline",
      "clicks_timeline",
      "conversions_timeline",
      "search_visitors_timeline",
      "unique_visitors_timeline",
    ];

    for (const k of COUNT_KEYS) {
      const full = (frame as any)[k];
      const delta = (frame as any)[`${String(k)}_delta`];

      if (delta && isHourSeries(delta)) {
        const canon = restrictPatchToElapsed(
          delta.map((x: any) => ({
            ...x,
            label: canonHourLabel(String(x?.label ?? "")),
          }))
        );
        (frame as any)[k] = applyCountPatch((base as any)?.[k], canon);
      } else if (full && isHourSeries(full)) {
        (frame as any)[k] = normalizeCountOrder(full);
      } else {
        delete (frame as any)[k];
      }
    }
  } else {
    // Non-24h ranges: just trust BE and replace.
  }

  // Merge into current data and normalize (24h only)
  let next: DashboardPayload = {
    ...(state.data || {}),
    ...frame,
  } as DashboardPayload;

  if (is24h) {
    next = normalize24hFrame(next) as DashboardPayload;
  }

  const prevTgv = (state.data as any)
    ?.time_grouped_visits as any[] | undefined;
  const nextTgv = (next as any)
    ?.time_grouped_visits as any[] | undefined;
  logTgvDelta("WS", prevTgv, nextTgv);

  const prevSig = state.seriesSig;
  const sig = signature(next, state.range);
  const bump = sig !== prevSig;

  // liveCount: prefer liveCities aggregate; otherwise BE's live_visitors
  let liveCount = state.liveCount;
  if (Array.isArray(state.liveCities) && state.liveCities.length) {
    liveCount = state.liveCities.reduce(
      (s, p) => s + (p.count || 0),
      0
    );
  } else if ((next as any).live_visitors != null) {
    liveCount =
      Number((next as any).live_visitors) || liveCount || 0;
  }

  // Persist the latest frame into localStorage for this site+range
  if (state.siteId) {
    saveSnapshot(state.siteId, range, next);
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
}

/* ---------------- Public actions ---------------- */
let bootstrapped = false;

export function init(initialRange: AnyRange = "24h") {
  if (!bootstrapped && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        scheduleReconnect(800);
      }
    });
    window.addEventListener("online", () =>
      scheduleReconnect(500)
    );
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
  set({
    siteId,
    data: null,
    isLoading: true,
    liveCities: [],
    liveCount: null,
    error: null,
    seriesSig: "",
  });

  emitCached(siteId, state.range);
  void connectWS(true);
}

// External API stays typed to your original RangeKey
export function setRange(range: RangeKey) {
  const r = normalizeRange(range);
  if (state.range === r) return;
  set({
    range: r,
    data: null,
    isLoading: true,
    error: null,
    seriesSig: "",
  });

  if (state.siteId) {
    emitCached(state.siteId, r);
    void connectWS(false);
  }
}

export function cleanup() {
  try {
    ws?.close();
  } catch {
    // ignore
  }
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  if (pingTimer) window.clearInterval(pingTimer);
}

/* ---------------- React hook ---------------- */
export function useDashboard() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state
  );
}

/* ---------------- Debug hooks ---------------- */
// @ts-ignore
if (typeof window !== "undefined") {
  (window as any).__mvDashSeeded = seeded;
}
