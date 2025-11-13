// src/compat/bootstrap-bridge.ts
import { mvBus } from "@/lib/mvBus";
import { secureFetch } from "@/lib/auth";

type GeoCityPoint = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  debug_ids?: string[];
};

type RangeKey = "24h" | "7d" | "30d" | "90d" | "12mo";

const API = "https://api.modovisa.com";

let selectedRange: RangeKey = "24h";
let currentSiteId: number | null = null;
let ws: WebSocket | null = null;
let pingTimer: number | null = null;
let ticketLock = false;
let lastTicketAt = 0;
let reconnectTimer: number | null = null;
let visHandler: (() => void) | null = null;

const TICKET_THROTTLE_MS = 1500;

function safeJSON<T = any>(x: string): T | null {
  try {
    return JSON.parse(x) as T;
  } catch {
    return null;
  }
}

function normalizeCities(payload: any): GeoCityPoint[] {
  const arr = Array.isArray(payload?.points)
    ? payload.points
    : Array.isArray(payload?.clusters)
    ? payload.clusters
    : Array.isArray(payload)
    ? payload
    : [];
  return arr
    .map((v: any) => {
      const lat = Number(v.lat ?? v.location?.lat ?? 0);
      const lng = Number(v.lng ?? v.location?.lng ?? 0);
      const count = Number(v.count ?? v.visitors ?? v.value ?? 0);
      return {
        city: String(v.city ?? v.city_name ?? v.name ?? "Unknown"),
        country: String(v.country ?? v.country_name ?? v.cc ?? "Unknown"),
        lat: Number.isFinite(lat) ? lat : 0,
        lng: Number.isFinite(lng) ? lng : 0,
        count: Number.isFinite(count) ? count : 0,
        debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : undefined,
      };
    })
    .filter((p) => p.lat !== 0 || p.lng !== 0);
}

/** Public: allow React to set the time range used for REST/WS */
export function setCompatRange(range: RangeKey) {
  selectedRange = range;
}

/** Public: set/remember site and kick a REST prime */
export async function setCompatSite(siteId: number) {
  currentSiteId = siteId;
  try {
    localStorage.setItem("current_website_id", String(siteId));
    mvBus.emit("mv:site:changed", { siteId });
    await primeSnapshot();
    await connectWS(true);
  } catch (e: any) {
    mvBus.emit("mv:error", { message: e?.message || "site_change_failed" });
  }
}

/** One-shot REST snapshot (no UI flicker in React; React controls skeleton) */
export async function primeSnapshot() {
  if (!currentSiteId) return;
  const tz = new Date().getTimezoneOffset();
  const url = `${API}/api/user-dashboard-analytics?range=${selectedRange}&tz_offset=${tz}&site_id=${encodeURIComponent(
    currentSiteId
  )}`;
  const res = await secureFetch(url, { method: "GET" });
  if (res.status === 401) {
    (window as any).logoutAndRedirect?.("401");
    throw new Error("unauthorized");
  }
  if (!res.ok) throw new Error("snapshot_failed");
  const data = await res.json();
  mvBus.emit("mv:dashboard:snapshot", data);
}

/** Internal: debounce/throttle ticket fetches */
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
      headers: { "Content-Type": "application/json" }, // ✅ required for Worker req.json()
      body: JSON.stringify({ site_id: currentSiteId }),
    });

    if (res.status === 401) {
      (window as any).logoutAndRedirect?.("401");
      throw new Error("unauthorized");
    }

    if (res.status === 429) {
      // Respect Retry-After if present; otherwise back off ~8s
      const ra = Number(res.headers.get("retry-after") || "8");
      scheduleReconnect((Math.max(3, ra)) * 1000);
      throw new Error("too_many_requests");
    }

    if (!res.ok) {
      // Surface backend message if any (helps when diagnosing 5xx)
      const body = await res.text().catch(() => "");
      if (res.status >= 500) {
        scheduleReconnect(5000 + Math.floor(Math.random() * 3000));
      }
      throw new Error(body || `ticket_failed_${res.status}`);
    }

    const { ticket } = (await res.json()) as { ticket?: string };
    if (!ticket) throw new Error("no_ticket");
    return ticket;
  } finally {
    ticketLock = false;
  }
}

function scheduleReconnect(ms: number = 1200) {
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  reconnectTimer = window.setTimeout(() => connectWS(true), ms) as unknown as number;
}

/** Public: connect (or reconnect) WS; forceNewTicket optionally */
export async function connectWS(_forceNewTicket = false) {
  if (!currentSiteId) return;

  // Close any prior
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
    mvBus.emit("mv:error", { message: e?.message || "ticket_failed" });
    scheduleReconnect();
    return;
  }

  const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
  const socket = new WebSocket(url);
  ws = socket;

  const openFail = window.setTimeout(() => {
    if (ws === socket && socket.readyState !== WebSocket.OPEN) {
      primeSnapshot().catch(() => {});
    }
  }, 6000);

  socket.onopen = () => {
    window.clearTimeout(openFail);
    try {
      socket.send(
        JSON.stringify({
          type: "subscribe",
          channels: ["dashboard_analytics", "live_visitor_location_grouped"],
          site_id: currentSiteId,
          range: selectedRange,
        })
      );
      socket.send(
        JSON.stringify({
          type: "request_dashboard_snapshot",
          site_id: currentSiteId,
          range: selectedRange,
        })
      );
      socket.send(
        JSON.stringify({
          type: "request_live_cities",
          site_id: currentSiteId,
          range: selectedRange,
        })
      );
    } catch {}

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

    const msgSite = String(msg?.site_id ?? msg?.payload?.site_id ?? "");
    if (currentSiteId && msgSite && msgSite !== String(currentSiteId)) return;

    if (msg.type === "dashboard_analytics" && msg.payload) {
      if (msg.payload.range && msg.payload.range !== selectedRange) return;
      mvBus.emit("mv:dashboard:frame", msg.payload);
    }

    if (
      msg.type === "live_visitor_location_grouped" ||
      msg.type === "live_visitors_clustered" ||
      msg.type === "live_city_groups"
    ) {
      const points = normalizeCities(msg.payload ?? msg.data ?? msg.points ?? msg.clusters ?? []);
      const total = points.reduce((s, p) => s + (p.count || 0), 0);
      mvBus.emit("mv:live:cities", { points, total });
    }

    if (msg.type === "live_visitor_update" || msg.type === "live_count") {
      const c = Number(msg?.payload?.count ?? msg?.count ?? 0) || 0;
      mvBus.emit("mv:live:count", { count: c });
    }
  };

  socket.onerror = () => {
    scheduleReconnect(1500 + Math.floor(Math.random() * 600));
  };

  socket.onclose = (ev) => {
    if ([4001, 4003, 4401].includes(ev.code)) return; // policy → stop
    scheduleReconnect(1500 + Math.floor(Math.random() * 600));
  };

  // Focus → reconnect with fresh ticket (mirrors Bootstrap)
  if (visHandler) document.removeEventListener("visibilitychange", visHandler);
  visHandler = () => {
    if (document.visibilityState === "visible") {
      try {
        socket.close();
      } catch {}
      if (pingTimer) {
        window.clearInterval(pingTimer);
        pingTimer = null;
      }
      connectWS(true);
    } else {
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
}

/** Public one-call init that also preloads site from localStorage */
export async function initDashboardCompat(initialRange: RangeKey) {
  selectedRange = initialRange;
  const saved = localStorage.getItem("current_website_id");
  if (saved) currentSiteId = Number(saved);
  if (currentSiteId) {
    await primeSnapshot().catch(() => {});
    await connectWS(true);
  }
}
