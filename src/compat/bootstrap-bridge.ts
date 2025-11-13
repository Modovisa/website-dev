// src/compat/bootstrap-bridge.ts
// FIXED: Matches bootstrap version behavior exactly

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
  const arr = Array.isArray(payload) ? payload : [];
  return arr.map((v: any) => {
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
  }).filter(p => p.lat !== 0 || p.lng !== 0);
}

export function setCompatRange(range: RangeKey) {
  selectedRange = range;
}

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

function scheduleReconnect(ms: number = 4000) {
  if (reconnectTimer) window.clearTimeout(reconnectTimer);
  const jitter = 500 + Math.floor(Math.random() * 500);
  reconnectTimer = window.setTimeout(() => connectWS(true), ms + jitter) as unknown as number;
}

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

  socket.onopen = () => {
    console.log("✅ [WS] Connected successfully", { siteId: currentSiteId, range: selectedRange });
    
    // IMPORTANT: Just ping - NO subscription messages!
    // The backend automatically sends data without explicit subscriptions
    pingTimer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        try { socket.send(JSON.stringify({ type: "ping" })); } catch {}
      }
    }, 25000) as unknown as number;
    
    // Fetch initial data via REST
    primeSnapshot().catch(() => {});
  };

  socket.onmessage = (ev) => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const msg = safeJSON<any>(ev.data);
    if (!msg) {
      console.warn("⚠️ [WS] Received invalid JSON:", ev.data);
      return;
    }
    
    // Debug ALL non-ping messages
    if (msg.type !== "ping" && msg.type !== "pong") {
      console.log("📥 [WS] Received message type:", msg.type, "| Full message:", msg);
    }
    
    const msgSite = String(msg?.site_id ?? "");
    if (currentSiteId && msgSite && msgSite !== String(currentSiteId)) {
      console.log("⏭️ [WS] Skipping message for different site:", msgSite, "current:", currentSiteId);
      return;
    }

    // Dashboard analytics stream
    if (msg.type === "dashboard_analytics") {
      const data = msg.payload;
      if (!data) return;
      
      // Warn if range mismatch but still process (backend sends wrong range)
      if (data.range && data.range !== selectedRange) {
        console.warn("⚠️ [WS] Range mismatch (processing anyway):", data.range, "expected:", selectedRange);
      }
      
      console.log("✨ [WS] Emitting dashboard frame update");
      mvBus.emit("mv:dashboard:frame", data);
    }

    // Grouped live visitor locations (for world map)
    if (msg.type === "live_visitor_location_grouped") {
      const points = normalizeCities(msg.payload || []);
      const total = points.reduce((s, p) => s + (p.count || 0), 0);
      console.log("🌍 [WS] Emitting live cities update:", { total, points: points.length });
      mvBus.emit("mv:live:cities", { points, total });
      
      // Also update live count from city data
      if (total > 0) {
        mvBus.emit("mv:live:count", { count: total });
      }
    }

    // Live visitor count update
    if (msg.type === "live_visitor_update") {
      const c = Number(msg?.payload?.count ?? 0) || 0;
      console.log("👥 [WS] Emitting live count update:", c);
      mvBus.emit("mv:live:count", { count: c });
    }
  };

  socket.onerror = (err) => {
    console.error("❌ [WS] WebSocket error:", err);
    scheduleReconnect();
  };

  socket.onclose = (ev) => {
    console.warn("🔌 [WS] WebSocket closed:", { code: ev.code, reason: ev.reason });
    scheduleReconnect();
  };

  // Focus → reconnect with fresh ticket
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

export async function initDashboardCompat(initialRange: RangeKey) {
  console.log("🚀 [Compat] Initializing dashboard compatibility layer");
  selectedRange = initialRange;
  const saved = localStorage.getItem("current_website_id");
  if (saved) currentSiteId = Number(saved);
  if (currentSiteId) {
    await primeSnapshot().catch(() => {});
    await connectWS(true);
  }
}