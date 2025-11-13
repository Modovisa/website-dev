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

type RangeKey = "24h"|"7d"|"30d"|"90d"|"12mo";

const API = "https://api.modovisa.com";

let selectedRange: RangeKey = "24h";
let currentSiteId: number | null = null;
let ws: WebSocket | null = null;
let pingTimer: number | null = null;
let ticketLock = false;
let lastTicketAt = 0;
let reconnectTimer: number | null = null;
let visHandler: any = null;

const TICKET_THROTTLE_MS = 1500;

function safeJSON<T=any>(x: string): T | null {
  try { return JSON.parse(x) as T; } catch { return null; }
}

function normalizeCities(payload: any): GeoCityPoint[] {
  const arr = Array.isArray(payload?.points) ? payload.points
    : Array.isArray(payload?.clusters) ? payload.clusters
    : Array.isArray(payload) ? payload
    : [];
  return arr.map((v: any) => {
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
  }).filter(p => p.lat !== 0 || p.lng !== 0);
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
  if (!currentSiteId) {
    console.warn("⚠️ [REST] Cannot prime snapshot - no siteId");
    return;
  }
  const tz = new Date().getTimezoneOffset();
  const url = `${API}/api/user-dashboard-analytics?range=${selectedRange}&tz_offset=${tz}&site_id=${encodeURIComponent(
    currentSiteId
  )}`;
  console.log("📡 [REST] Fetching dashboard snapshot:", { siteId: currentSiteId, range: selectedRange });
  const res = await secureFetch(url, { method: "GET" });
  if (res.status === 401) {
    console.error("🚫 [REST] Unauthorized (401)");
    (window as any).logoutAndRedirect?.("401");
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("❌ [REST] Snapshot failed:", {
      status: res.status,
      statusText: res.statusText,
      body: errorBody,
      url: url,
      siteId: currentSiteId,
      range: selectedRange
    });
    throw new Error(`snapshot_failed_${res.status}`);
  }
  const data = await res.json();
  console.log("✅ [REST] Snapshot received, emitting to mvBus:", data);
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
        statusText: res.statusText,
        body: errorBody,
        siteId: currentSiteId
      });
      throw new Error(`ticket_failed_${res.status}: ${errorBody}`);
    }
    const { ticket } = await res.json();
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
export async function connectWS(forceNewTicket = false) {
  if (!currentSiteId) return;

  // Close any prior
  try { ws?.close(); } catch {}
  ws = null;
  if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }

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
    console.log("✅ [WS] Connected successfully", { siteId: currentSiteId, range: selectedRange });
    
    // subscribe to streams similar to Bootstrap
    try {
      const subscribeMsg = {
        type: "subscribe",
        channels: ["dashboard_analytics", "live_visitor_location_grouped"],
        site_id: currentSiteId,
        range: selectedRange,
      };
      console.log("📤 [WS] Subscribing to channels:", subscribeMsg);
      socket.send(JSON.stringify(subscribeMsg));
      
      const snapshotMsg = { type: "request_dashboard_snapshot", site_id: currentSiteId, range: selectedRange };
      console.log("📤 [WS] Requesting dashboard snapshot:", snapshotMsg);
      socket.send(JSON.stringify(snapshotMsg));
      
      const citiesMsg = { type: "request_live_cities", site_id: currentSiteId, range: selectedRange };
      console.log("📤 [WS] Requesting live cities:", citiesMsg);
      socket.send(JSON.stringify(citiesMsg));
    } catch (e) {
      console.error("❌ [WS] Error sending subscription messages:", e);
    }

    pingTimer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try { socket.send(JSON.stringify({ type: "ping" })); } catch {}
      }
    }, 25000) as unknown as number;
  };

  socket.onmessage = (ev) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const msg = safeJSON<any>(ev.data);
    if (!msg) {
      console.warn("⚠️ [WS] Received invalid JSON:", ev.data);
      return;
    }
    
    console.log("📥 [WS] Received message:", msg.type, msg);
    
    const msgSite = String(msg?.site_id ?? msg?.payload?.site_id ?? "");
    if (currentSiteId && msgSite && msgSite !== String(currentSiteId)) {
      console.log("⏭️ [WS] Skipping message for different site:", msgSite, "current:", currentSiteId);
      return;
    }

    if (msg.type === "dashboard_analytics" && msg.payload) {
      // only accept frames for the currently selected range
      if (msg.payload.range && msg.payload.range !== selectedRange) {
        console.log("⏭️ [WS] Skipping message for different range:", msg.payload.range, "current:", selectedRange);
        return;
      }
      console.log("✨ [WS] Emitting dashboard frame update");
      mvBus.emit("mv:dashboard:frame", msg.payload);
    }

    if (
      msg.type === "live_visitor_location_grouped" ||
      msg.type === "live_visitors_clustered" ||
      msg.type === "live_city_groups"
    ) {
      const points = normalizeCities(msg.payload ?? msg.data ?? msg.points ?? msg.clusters ?? []);
      const total = points.reduce((s, p) => s + (p.count || 0), 0);
      console.log("🌍 [WS] Emitting live cities update:", { total, points: points.length });
      mvBus.emit("mv:live:cities", { points, total });
    }

    if (msg.type === "live_visitor_update" || msg.type === "live_count") {
      const c = Number(msg?.payload?.count ?? msg?.count ?? 0) || 0;
      console.log("👥 [WS] Emitting live count update:", c);
      mvBus.emit("mv:live:count", { count: c });
    }
  };

  socket.onerror = (err) => {
    console.error("❌ [WS] WebSocket error:", err);
    scheduleReconnect(1500 + Math.floor(Math.random() * 600));
  };

  socket.onclose = (ev) => {
    console.warn("🔌 [WS] WebSocket closed:", { code: ev.code, reason: ev.reason });
    if ([4001, 4003, 4401].includes(ev.code)) {
      console.error("🚫 [WS] Policy close code - stopping reconnection:", ev.code);
      return; // policy → stop
    }
    scheduleReconnect(1500 + Math.floor(Math.random() * 600));
  };

  // Focus → reconnect with fresh ticket (mirrors Bootstrap)
  if (visHandler) document.removeEventListener("visibilitychange", visHandler);
  visHandler = () => {
    if (document.visibilityState === "visible") {
      try { socket.close(); } catch {}
      if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }
      connectWS(true);
    } else {
      try { socket.close(); } catch {}
      if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }
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