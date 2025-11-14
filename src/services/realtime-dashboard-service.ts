// src/services/realtime-dashboard-service.ts
// Consolidated dashboard service - Single source of truth for REST + WebSocket

import { mvBus } from "@/lib/mvBus";
import { secureFetch } from "@/lib/auth";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

/* ---------- Types ---------- */
export type TrackingWebsite = {
  id: number;
  website_name: string;
  domain: string;
};

type TrackingWebsitesAPI = {
  projects: Array<{
    id: number;
    website_name?: string;
    name?: string;
    domain?: string;
  }>;
};

export type GeoCityPoint = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  debug_ids?: string[];
};

/* ---------- Errors ---------- */
export class HttpError extends Error {
  status: number;
  body?: string;
  constructor(status: number, message: string, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(body?: string) {
    super(401, "unauthorized", body);
  }
}

/* ---------- Constants ---------- */
const API = "https://api.modovisa.com";

/* ---------- State (Singleton Pattern) ---------- */
let selectedRange: RangeKey = "24h";
let currentSiteId: number | null = null;
let ws: WebSocket | null = null;
let pingTimer: number | null = null;
let reconnectTimer: number | null = null;
let visHandler: any = null;
let onlineHandler: any = null;
let offlineHandler: any = null;
let initialized = false;

// WS ticket management
let ticketLock = false;
let lastTicketAt = 0;
const TICKET_THROTTLE_MS = 1500;

/* ---------- Debounced REST refresh (to make charts “feel” live) ---------- */
let refreshTimer: number | null = null;
const REFRESH_DEBOUNCE_MS = 2000;

function scheduleSnapshotRefresh(_reason: string) {
  if (!currentSiteId) return;
  if (refreshTimer) window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(async () => {
    try {
      const snap = await getDashboardSnapshot({
        siteId: currentSiteId!,
        range: selectedRange,
      });
      mvBus.emit("mv:dashboard:snapshot", snap);
    } catch (e) {
      console.error("❌ [Service] Snapshot refresh failed:", e);
    }
  }, REFRESH_DEBOUNCE_MS) as unknown as number;
}

/* ---------- OPTIONAL: REST geo fallback (disabled by default) ---------- */
// Flip to true to enable a periodic REST fetch for city clusters (when WS is thin/idle).
const GEO_FALLBACK_ENABLED = false;
let geoFallbackTimer: number | null = null;
const GEO_FALLBACK_MS = 20000;

async function fetchLiveCitiesREST(siteId: number, range: RangeKey) {
  try {
    // If you already expose a REST endpoint for grouped cities, wire it here.
    // Example (adjust to your real route/params if different):
    const url =
      `${API}/api/live-visitor-location-grouped` +
      `?site_id=${encodeURIComponent(siteId)}` +
      `&range=${encodeURIComponent(range)}`;

    const res = await secureFetch(url, { method: "GET" });
    if (res.status === 401) throw new UnauthorizedError();
    if (!res.ok) {
      console.warn("⚠️ [REST-geo] non-OK:", res.status);
      return;
    }
    const payload = await res.json();
    const points = normalizeCities(payload || []);
    const total = points.reduce((s, p) => s + (p.count || 0), 0);
    mvBus.emit("mv:live:cities", { points, total });
    if (typeof total === "number" && total >= 0) {
      mvBus.emit("mv:live:count", { count: total });
    }
  } catch (err) {
    console.warn("⚠️ [REST-geo] failed:", err);
  }
}

function startGeoFallback() {
  if (!GEO_FALLBACK_ENABLED) return;
  if (geoFallbackTimer) window.clearInterval(geoFallbackTimer);
  geoFallbackTimer = window.setInterval(() => {
    if (currentSiteId) fetchLiveCitiesREST(currentSiteId, selectedRange);
  }, GEO_FALLBACK_MS) as unknown as number;
}

function stopGeoFallback() {
  if (geoFallbackTimer) {
    window.clearInterval(geoFallbackTimer);
    geoFallbackTimer = null;
  }
}

/* ---------- Utilities ---------- */
function safeJSON<T = any>(x: string): T | null {
  try {
    return JSON.parse(x) as T;
  } catch {
    return null;
  }
}

function normalizeCities(payload: any): GeoCityPoint[] {
  const arr = Array.isArray(payload) ? payload : [];
  return arr
    .map((v: any) => {
      const lat = Number(v.lat ?? 0);
      const lng = Number(v.lng ?? 0);
      const count = Number(v.count ?? 0);
      return {
        city: String(v.city || "Unknown"),
        country: String(v.country || "Unknown"),
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
        count: Number.isFinite(count) ? count : 0,
        debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : undefined,
      };
    })
    .filter((p) => p.lat !== 0 || p.lng !== 0);
}

/* ---------- REST API ---------- */

export async function getTrackingWebsites(): Promise<TrackingWebsite[]> {
  console.log("📡 [REST] Fetching tracking websites");
  const res = await secureFetch(`${API}/api/tracking-websites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("❌ [REST] Failed to fetch websites:", {
      status: res.status,
      body: errorBody,
    });
    throw new HttpError(res.status, "failed_tracking_websites", errorBody);
  }

  const j = (await res.json()) as TrackingWebsitesAPI;
  return (j.projects || []).map((p) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));
}

export async function getDashboardSnapshot(args: {
  siteId: number;
  range: RangeKey;
  tzOffset?: number;
}): Promise<DashboardPayload> {
  const tz = Number.isFinite(args.tzOffset as number)
    ? String(args.tzOffset)
    : String(new Date().getTimezoneOffset());

  const url =
    `${API}/api/user-dashboard-analytics` +
    `?range=${encodeURIComponent(args.range)}` +
    `&tz_offset=${encodeURIComponent(tz)}` +
    `&site_id=${encodeURIComponent(args.siteId)}`;

  console.log("📡 [REST] Fetching dashboard snapshot:", {
    siteId: args.siteId,
    range: args.range,
  });

  const res = await secureFetch(url, { method: "GET" });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("❌ [REST] Snapshot failed:", {
      status: res.status,
      body: errorBody,
      url,
    });
    throw new HttpError(res.status, "failed_dashboard_snapshot", errorBody);
  }

  const data = await res.json();
  (data as any).range = args.range; // keep client-selected range authoritative for UI

  console.log("✅ [REST] Snapshot received, emitting to mvBus");
  return data as DashboardPayload;
}

/* ---------- WebSocket Ticket ---------- */

async function getWSTicket(): Promise<string> {
  const now = Date.now();
  if (ticketLock || now - lastTicketAt < TICKET_THROTTLE_MS) {
    await new Promise((r) => setTimeout(r, TICKET_THROTTLE_MS));
  }
  ticketLock = true;
  lastTicketAt = Date.now();
  try {
    const res = await secureFetch(`${API}/api/ws-ticket`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site_id: currentSiteId }),
    });
    if (res.status === 401) {
      (window as any).logoutAndRedirect?.("401");
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      console.error("❌ [WS] Ticket request failed:", {
        status: res.status,
        body: errorBody,
      });
      throw new Error(`ticket_failed_${res.status}`);
    }
    const { ticket } = await res.json();
    return ticket;
  } finally {
    ticketLock = false;
  }
}

/* ---------- WebSocket Connection ---------- */

function scheduleReconnect(ms: number = 4000) {
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  const jitter = 500 + Math.floor(Math.random() * 500);
  reconnectTimer = window.setTimeout(() => connectWS(true), ms + jitter) as unknown as number;
}

async function connectWS(_forceNewTicket = false) {
  if (!currentSiteId) {
    console.warn("⚠️ [WS] Cannot connect - no siteId");
    return;
  }

  // Close any prior connection
  try {
    ws?.close();
  } catch {}
  ws = null;
  if (pingTimer) {
    window.clearInterval(pingTimer);
    pingTimer = null;
  }

  let ticket: string;
  try {
    ticket = await getWSTicket();
  } catch (e: any) {
    console.error("❌ [WS] Failed to get ticket:", e?.message || e);
    mvBus.emit("mv:error", { message: e?.message || "ticket_failed" });
    scheduleReconnect();
    return;
  }

  const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
  const socket = new WebSocket(url);
  ws = socket;

  socket.onopen = () => {
    console.log("✅ [WS] Connected", { siteId: currentSiteId, range: selectedRange });

    // CRITICAL: Just ping - NO subscription messages (parity with bootstrap)
    pingTimer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify({ type: "ping" }));
        } catch {}
      }
    }, 25000) as unknown as number;

    // (Re)start optional geo fallback while connected
    startGeoFallback();
  };

  socket.onmessage = (ev) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const msg = safeJSON<any>(ev.data);
    if (!msg) {
      console.warn("⚠️ [WS] Received invalid JSON:", ev.data);
      return;
    }

    if (msg.type !== "ping" && msg.type !== "pong") {
      console.log("📥 [WS] Message:", msg.type);
    }

    const msgSite = String(msg?.site_id ?? "");
    if (currentSiteId && msgSite && msgSite !== String(currentSiteId)) {
      console.log("⏭️ [WS] Skipping other site:", msgSite, "current:", currentSiteId);
      return;
    }

    // 📊 Dashboard analytics stream
    if (msg.type === "dashboard_analytics") {
      const data = msg.payload || {};
      const hasSeries =
        Array.isArray(data.time_grouped_visits) ||
        Array.isArray(data.events_timeline) ||
        Array.isArray(data.unique_vs_returning);

      mvBus.emit("mv:dashboard:frame", data);

      if (!hasSeries) scheduleSnapshotRefresh("thin_dashboard_frame");
    }

    // 🌍 Grouped live visitor locations (for world map)
    if (msg.type === "live_visitor_location_grouped") {
      const points = normalizeCities(msg.payload || []);
      const total = points.reduce((s, p) => s + (p.count || 0), 0);
      mvBus.emit("mv:live:cities", { points, total });

      if (typeof total === "number" && total >= 0) {
        mvBus.emit("mv:live:count", { count: total });
      }
    }

    // 👥 Live visitor count update
    if (msg.type === "live_visitor_update") {
      const c = Number(msg?.payload?.count ?? 0) || 0;
      mvBus.emit("mv:live:count", { count: c });
    }

    // 📝 New event ping → schedule compact refresh (debounced)
    if (msg.type === "new_event") {
      scheduleSnapshotRefresh("new_event");
    }
  };

  socket.onerror = (err) => {
    console.error("❌ [WS] WebSocket error:", err);
    scheduleReconnect();
  };

  socket.onclose = (ev) => {
    console.warn("🔌 [WS] Closed:", { code: ev.code, reason: ev.reason });
    stopGeoFallback();
    scheduleReconnect();
  };

  // Focus/visibility → reconnect with fresh ticket
  if (visHandler) document.removeEventListener("visibilitychange", visHandler);
  visHandler = () => {
    if (document.visibilityState === "visible") {
      console.log("👁️ [WS] Tab visible - reconnecting");
      try {
        socket.close();
      } catch {}
      if (pingTimer) {
        window.clearInterval(pingTimer);
        pingTimer = null;
      }
      connectWS(true);
    } else {
      console.log("👁️ [WS] Tab hidden - closing connection");
      try {
        socket.close();
      } catch {}
      if (pingTimer) {
        window.clearInterval(pingTimer);
        pingTimer = null;
      }
    }
  };
  document.addEventListener("visibilitychange", visHandler);

  // Online/offline awareness
  if (onlineHandler) window.removeEventListener("online", onlineHandler);
  if (offlineHandler) window.removeEventListener("offline", offlineHandler);
  onlineHandler = () => {
    console.log("🌐 [WS] Browser online - reconnect");
    scheduleReconnect(500);
  };
  offlineHandler = () => {
    console.log("🌐 [WS] Browser offline - closing WS");
    try {
      socket.close();
    } catch {}
  };
  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);
}

/* ---------- Public API ---------- */

export function setRange(range: RangeKey) {
  console.log("🎯 [Service] Setting range:", range);
  selectedRange = range;
}

export async function setSite(siteId: number) {
  console.log("🌐 [Service] Setting site:", siteId);
  currentSiteId = siteId;
  try {
    localStorage.setItem("current_website_id", String(siteId));
    mvBus.emit("mv:site:changed", { siteId });

    // Fetch new snapshot and reconnect WebSocket
    const data = await getDashboardSnapshot({
      siteId: currentSiteId,
      range: selectedRange,
    });
    mvBus.emit("mv:dashboard:snapshot", data);
    await connectWS(true);
  } catch (e: any) {
    console.error("❌ [Service] Failed to set site:", e);
    mvBus.emit("mv:error", { message: e?.message || "site_change_failed" });
  }
}

export async function fetchSnapshot() {
  if (!currentSiteId) {
    console.warn("⚠️ [Service] Cannot fetch snapshot - no siteId");
    return;
  }
  try {
    const data = await getDashboardSnapshot({
      siteId: currentSiteId,
      range: selectedRange,
    });
    mvBus.emit("mv:dashboard:snapshot", data);
  } catch (e: any) {
    console.error("❌ [Service] Failed to fetch snapshot:", e);
    mvBus.emit("mv:error", { message: e?.message || "snapshot_failed" });
  }
}

export async function reconnectWebSocket() {
  console.log("🔄 [Service] Manually reconnecting WebSocket");
  await connectWS(true);
}

export async function initialize(initialRange: RangeKey = "24h") {
  if (initialized) {
    console.warn("⚠️ [Service] Already initialized - skipping");
    return;
  }

  console.log("🚀 [Service] Initializing realtime dashboard service");
  initialized = true;
  selectedRange = initialRange;

  const saved = localStorage.getItem("current_website_id");
  if (saved) {
    currentSiteId = Number(saved);
    console.log("📍 [Service] Loaded site from localStorage:", currentSiteId);
  }

  if (currentSiteId) {
    try {
      const data = await getDashboardSnapshot({
        siteId: currentSiteId,
        range: selectedRange,
      });
      mvBus.emit("mv:dashboard:snapshot", data);
      await connectWS(true);
    } catch (e: any) {
      console.error("❌ [Service] Initialization failed:", e);
    }
  } else {
    console.warn("⚠️ [Service] No site ID found - waiting for site selection");
  }
}

/* ---------- Cleanup ---------- */

export function cleanup() {
  console.log("🧹 [Service] Cleaning up");
  try {
    ws?.close();
  } catch {}
  if (pingTimer) window.clearInterval(pingTimer);
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  if (visHandler) document.removeEventListener("visibilitychange", visHandler);
  if (onlineHandler) window.removeEventListener("online", onlineHandler);
  if (offlineHandler) window.removeEventListener("offline", offlineHandler);
  if (refreshTimer) window.clearTimeout(refreshTimer);
  stopGeoFallback();
  initialized = false;
}
