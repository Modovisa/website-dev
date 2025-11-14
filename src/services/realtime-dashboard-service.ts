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
let wsConnecting = false;

let pingTimer: number | null = null;
let reconnectTimer: number | null = null;
let visHandler: any = null;
let onlineHandler: any = null;
let offlineHandler: any = null;

let initialized = false;

// WS ticket management + backoff
let ticketLock = false;
let lastTicketAt = 0;
let backoffMs = 4000;
const BACKOFF_MAX = 60000;
const TICKET_THROTTLE_MS = 5000;

// REST refresh debounce
let refreshTimer: number | null = null;
const REFRESH_DEBOUNCE_MS = 2000;

// Once we see a proper WS analytics frame (with series) for the current site+range,
// we stop scheduling REST refreshes from "new_event" etc. until site/range changes.
let seriesSeenForCurrentSelection = false;

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

function scheduleSnapshotRefresh(_reason: string) {
  if (!currentSiteId) return;
  if (seriesSeenForCurrentSelection) return; // WS already driving; skip REST
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
    const wait = Math.max(TICKET_THROTTLE_MS - (now - lastTicketAt), 300);
    await new Promise((r) => setTimeout(r, wait));
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
    if (res.status === 429) {
      const body = await res.text().catch(() => "");
      const err = new Error("ticket_failed_429") as any;
      err.status = 429;
      err.body = body;
      throw err;
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

function scheduleReconnect(ms: number) {
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  const jitter = 250 + Math.floor(Math.random() * 500);
  reconnectTimer = window.setTimeout(() => {
    void connectWS(true);
  }, ms + jitter) as unknown as number;
}

async function connectWS(forceNewTicket = false) {
  if (!currentSiteId) {
    console.warn("⚠️ [WS] Cannot connect - no siteId");
    return;
  }
  if (ws && ws.readyState === WebSocket.OPEN && !forceNewTicket) {
    return; // already open
  }
  if (wsConnecting) return; // single-flight
  wsConnecting = true;

  // Clean previous timers
  if (pingTimer) {
    window.clearInterval(pingTimer);
    pingTimer = null;
  }
  try {
    // Close previous socket if any (without triggering cascaded reconnects)
    try {
      ws?.close();
    } catch {}
    ws = null;

    // Ticket with backoff
    let ticket: string;
    try {
      ticket = await getWSTicket();
    } catch (e: any) {
      console.error("❌ [WS] Failed to get ticket:", e?.message || e);
      mvBus.emit("mv:error", { message: e?.message || "ticket_failed" });
      // Exponential backoff on 429; otherwise use default backoff
      if (e?.status === 429) {
        backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
      } else {
        backoffMs = Math.min(backoffMs + 2000, BACKOFF_MAX);
      }
      scheduleReconnect(backoffMs);
      return;
    }

    // Reset backoff after successful ticket
    backoffMs = 4000;

    const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      console.log("✅ [WS] Connected", { siteId: currentSiteId, range: selectedRange });

      // CRITICAL: Just ping — no subscription message needed
      pingTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({ type: "ping" }));
          } catch {}
        }
      }, 25000) as unknown as number;
    };

    socket.onmessage = (ev) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const msg = safeJSON<any>(ev.data);
      if (!msg) return;

      if (msg.type !== "ping" && msg.type !== "pong") {
        console.log("📥 [WS] Message:", msg.type);
      }

      const msgSite = String(msg?.site_id ?? "");
      if (currentSiteId && msgSite && msgSite !== String(currentSiteId)) {
        // Ignore frames for a different site
        return;
      }

      if (msg.type === "dashboard_analytics") {
        const data = msg.payload || {};
        const hasSeries =
          (Array.isArray(data.time_grouped_visits) && data.time_grouped_visits.length > 0) ||
          (Array.isArray(data.events_timeline) && data.events_timeline.length > 0) ||
          (Array.isArray(data.unique_vs_returning) && data.unique_vs_returning.length > 0);

        mvBus.emit("mv:dashboard:frame", data);

        if (hasSeries) {
          seriesSeenForCurrentSelection = true;
          if (refreshTimer) {
            window.clearTimeout(refreshTimer);
            refreshTimer = null;
          }
        } else {
          // Thin frame — only schedule REST refresh if WS hasn't delivered series yet
          scheduleSnapshotRefresh("thin_dashboard_frame");
        }
      }

      if (msg.type === "live_visitor_location_grouped") {
        const points = normalizeCities(msg.payload || []);
        const total = points.reduce((s, p) => s + (p.count || 0), 0);
        mvBus.emit("mv:live:cities", { points, total });
        mvBus.emit("mv:live:count", { count: total >= 0 ? total : 0 });
      }

      if (msg.type === "live_visitor_update") {
        const c = Number(msg?.payload?.count ?? 0) || 0;
        mvBus.emit("mv:live:count", { count: c });
      }

      if (msg.type === "new_event") {
        // Only schedule a REST refresh if we haven't seen a WS series yet
        if (!seriesSeenForCurrentSelection) {
          scheduleSnapshotRefresh("new_event");
        }
      }
    };

    socket.onerror = (err) => {
      console.error("❌ [WS] WebSocket error:", err);
    };

    socket.onclose = (ev) => {
      console.warn("🔌 [WS] Closed:", { code: ev.code, reason: ev.reason });
      // Reconnect with backoff
      scheduleReconnect(backoffMs);
      backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX);
    };
  } finally {
    wsConnecting = false;
  }
}

/* ---------- Public API ---------- */

export function setRange(range: RangeKey) {
  if (selectedRange === range) return; // no-op
  console.log("🎯 [Service] Setting range:", range);
  selectedRange = range;
  seriesSeenForCurrentSelection = false;
}

export async function setSite(siteId: number) {
  if (currentSiteId === siteId) {
    // Avoid duplicate REST + WS churn
    console.log("🌐 [Service] setSite no-op (already on site):", siteId);
    return;
  }
  console.log("🌐 [Service] Setting site:", siteId);
  currentSiteId = siteId;
  seriesSeenForCurrentSelection = false;
  try {
    localStorage.setItem("current_website_id", String(siteId));
    mvBus.emit("mv:site:changed", { siteId });

    // Seed UI from REST once
    const data = await getDashboardSnapshot({
      siteId: currentSiteId,
      range: selectedRange,
    });
    mvBus.emit("mv:dashboard:snapshot", data);

    // Then connect WS to take over (single-flight, with backoff)
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

  // Visibility/online handlers (do NOT close WS on hidden to avoid ticket churn)
  if (visHandler) document.removeEventListener("visibilitychange", visHandler);
  visHandler = () => {
    if (document.visibilityState === "visible") {
      // If socket isn't open, reconnect with gentle backoff
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        scheduleReconnect(800);
      }
    }
  };
  document.addEventListener("visibilitychange", visHandler);

  if (onlineHandler) window.removeEventListener("online", onlineHandler);
  if (offlineHandler) window.removeEventListener("offline", offlineHandler);
  onlineHandler = () => {
    console.log("🌐 [WS] Browser online - reconnect");
    scheduleReconnect(500);
  };
  offlineHandler = () => {
    console.log("🌐 [WS] Browser offline");
  };
  window.addEventListener("online", onlineHandler);
  window.addEventListener("offline", offlineHandler);

  // If we have a site, seed from REST once, then WS takes over
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
  initialized = false;
}
