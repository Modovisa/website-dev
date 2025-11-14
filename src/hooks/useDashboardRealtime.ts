// src/hooks/useDashboardRealtime.ts
// Mirrors the Bootstrap dashboard WS behavior in React.
// - Fetches short-lived WS ticket per site
// - Connects to wss://api.modovisa.com/ws/visitor-tracking?ticket=...
// - Handles: dashboard_analytics, live_visitor_location_grouped, live_visitor_update
// - Ignores snapshots for a different range
// - Emits events via mvBus so your existing chart/map code stays unchanged
// - Reconnects with jitter, pings every 25s, throttles ticket requests

import { useCallback, useEffect, useRef, useState } from "react";
import { mvBus } from "@/lib/mvBus";
import { secureFetch } from "@/lib/auth";

type DashboardSnapshot = Record<string, any>;
type LivePoint = { city?: string; country?: string; lat: number; lng: number; count: number; debug_ids?: string[] };

type HookArgs = {
  siteId: number | string | null;
  range: "24h" | "7d" | "30d" | "90d" | "12mo";
  /** Called once after the very first successful socket open (good time to refresh REST data with a skeleton) */
  onInitialOpen?: () => void;
};

type HookReturn = {
  status: "idle" | "connecting" | "open" | "closed" | "error";
  liveCount: number | null;
  /** Manually force reconnect (rarely needed) */
  reconnect: () => void;
};

export function useDashboardRealtime({ siteId, range, onInitialOpen }: HookArgs): HookReturn {
  const [status, setStatus] = useState<HookReturn["status"]>("idle");
  const [liveCount, setLiveCount] = useState<number | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<any>(null);
  const hasFiredInitialOpenRef = useRef(false);

  const activeSiteRef = useRef<string>("");
  const desiredRangeRef = useRef(range);
  const closingRef = useRef(false);

  // ticket throttling
  const ticketLockRef = useRef(false);
  const lastTicketAtRef = useRef(0);
  const throttleMs = 1500;
  const retryTimerRef = useRef<any>(null);

  // range changes should be visible inside handlers
  useEffect(() => {
    desiredRangeRef.current = range;
  }, [range]);

  const clearPing = () => {
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  };

  const closeSocket = useCallback(() => {
    closingRef.current = true;
    try {
      socketRef.current?.close();
    } catch {}
    clearPing();
    setStatus("closed");
    closingRef.current = false;
  }, []);

  const connect = useCallback(async () => {
    if (!siteId) return;

    // make “only one connect per siteId” decision
    const normalized = String(siteId);
    activeSiteRef.current = normalized;

    setStatus("connecting");

    // throttle ticket calls
    const now = Date.now();
    const since = now - (lastTicketAtRef.current || 0);
    if (ticketLockRef.current || since < throttleMs) {
      const wait = ticketLockRef.current ? 400 : Math.max(200, throttleMs - since);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(connect, wait);
      return;
    }
    ticketLockRef.current = true;
    lastTicketAtRef.current = now;

    // fetch ticket
    let ticket: string | undefined;
    try {
      const tRes = await secureFetch("https://api.modovisa.com/api/ws-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId })
      });
      if (tRes.status === 401) {
        // rely on your global logout handler if present
        (window as any).logoutAndRedirect?.("401");
        ticketLockRef.current = false;
        return;
      }
      if (!tRes.ok) {
        console.error("ws-ticket error:", await tRes.text());
        ticketLockRef.current = false;
        setStatus("error");
        return;
      }
      ({ ticket } = await tRes.json());
    } catch (e) {
      console.error("ws-ticket fetch failed:", e);
      ticketLockRef.current = false;
      setStatus("error");
      return;
    } finally {
      ticketLockRef.current = false;
    }

    // guard if site switched while fetching ticket
    if (activeSiteRef.current !== normalized) return;

    // close any previous socket first
    try { socketRef.current?.close(); } catch {}
    clearPing();

    const wsUrl = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket!)}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      if (activeSiteRef.current !== normalized) return; // stale
      setStatus("open");

      // 25s ping
      pingTimerRef.current = setInterval(() => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "ping" }));
        }
      }, 25000);

      // ask caller to refresh REST charts with skeleton once (mirrors Bootstrap)
      if (!hasFiredInitialOpenRef.current) {
        hasFiredInitialOpenRef.current = true;
        onInitialOpen?.();
      }
    };

    ws.onmessage = (ev) => {
      // ignore if site switched or socket closing
      if (activeSiteRef.current !== normalized || socketRef.current?.readyState !== WebSocket.OPEN) return;

      let msg: any;
      try { msg = JSON.parse(ev.data); } catch { return; }

      // must match site id
      if (!msg?.site_id || String(msg.site_id) !== activeSiteRef.current) return;

      // ---- live city clusters (authoritative for map effect scatter)
      if (msg.type === "live_visitor_location_grouped") {
        const points: LivePoint[] = (msg.payload || []).map((v: any) => ({
          city: v.city, country: v.country, lat: v.lat, lng: v.lng,
          count: Number(v.count) || 0, debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : []
        }));
        mvBus.emit("map:live_points", { siteId: activeSiteRef.current, points });
        // also update the consolidated live count (sum of clusters)
        const total = points.reduce((s, p) => s + (p.count || 0), 0);
        setLiveCount(total);
        mvBus.emit("live:visitors_count", { count: total });
      }

      // ---- basic live count (if server sends a simple aggregate)
      if (msg.type === "live_visitor_update") {
        const count = Number(msg.payload?.count) || 0;
        setLiveCount(count);
        mvBus.emit("live:visitors_count", { count });
      }

      // ---- streaming dashboard snapshots (identical to Bootstrap contract)
      if (msg.type === "dashboard_analytics") {
        const snapshot: DashboardSnapshot = msg.payload || {};
        const wantRange = desiredRangeRef.current;

        // Ignore if server sent a snapshot for a different selected range
        if (snapshot?.range && snapshot.range !== wantRange) {
          // still update just the cards if present (parity with Bootstrap)
          if (snapshot.live_visitors != null || snapshot.unique_visitors != null) {
            mvBus.emit("dashboard:cards", snapshot);
          }
          return;
        }

        // Emit one event that your React charts can consume (or a bridge can fan out)
        mvBus.emit("dashboard:snapshot", snapshot);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
      setStatus("error");
    };

    ws.onclose = () => {
      clearPing();
      if (closingRef.current) return;
      setStatus("closed");
      // jittered reconnect (mirrors Bootstrap)
      const jitter = 500 + Math.floor(Math.random() * 500);
      setTimeout(() => {
        // if user didn’t switch site meanwhile, reconnect (pulls a fresh ticket)
        if (activeSiteRef.current === normalized) connect();
      }, 4000 + jitter);
    };
  }, [siteId, onInitialOpen]);

  // main effect
  useEffect(() => {
    if (!siteId) return;
    hasFiredInitialOpenRef.current = false; // new site → re-fire onInitialOpen once
    connect();

    // reconnect on tab visibility change (Bootstrap parity)
    const onVis = () => {
      if (!siteId) return;
      if (document.visibilityState === "visible") {
        try { socketRef.current?.close(); } catch {}
        clearPing();
        connect();
      } else {
        try { socketRef.current?.close(); } catch {}
        clearPing();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      closeSocket();
    };
  }, [siteId, connect, closeSocket]);

  return {
    status,
    liveCount,
    reconnect: () => {
      try { socketRef.current?.close(); } catch {}
      clearPing();
      connect();
    }
  };
}
