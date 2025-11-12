// src/hooks/useDashboardRealtime.ts

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDashboardSnapshot,
  getWSTicket,
  UnauthorizedError,
  GeoCityPoint,
} from "@/services/dashboardService";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

const DEBUG = true;

type State = {
  data: DashboardPayload | null;
  liveCities: GeoCityPoint[];
  liveCount: number | null;
  isLoading: boolean;
  error: string | null;
};

type Options = {
  stopRetryOn401?: boolean;
  wsSilentTimeoutMs?: number;      // how long to wait for WS open before priming REST (first mount only)
};

const DEFAULTS: Required<Options> = {
  stopRetryOn401: true,
  wsSilentTimeoutMs: 6000,
};

export function useDashboardRealtime(
  siteId: number | null | undefined,
  range: RangeKey,
  opts?: Options
) {
  const { stopRetryOn401, wsSilentTimeoutMs } = { ...DEFAULTS, ...(opts || {}) };

  const [state, setState] = useState<State>({
    data: null,
    liveCities: [],
    liveCount: null,
    isLoading: false,
    error: null,
  });

  // --- refs (lifecycle + guards) ---
  const socketRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);

  const hardStopRef = useRef<boolean>(false);
  const currentSiteRef = useRef<number | null>(null);
  const lastRangeRef = useRef<RangeKey>(range);

  // prevent overlapping connects (the “double connect” → 1006 loop)
  const connectingRef = useRef<boolean>(false);

  // whether we’ve primed REST once on initial mount/open wait
  const didInitialPrimeRef = useRef<boolean>(false);

  const log = (...a: any[]) => { if (DEBUG) console.log("[DashboardWS]", ...a); };
  const warn = (...a: any[]) => { if (DEBUG) console.warn("[DashboardWS]", ...a); };

  const setLoading = (v: boolean) => setState((s) => ({ ...s, isLoading: v }));
  const setError   = (msg: string | null) => setState((s) => ({ ...s, error: msg }));

  const clearSocket = useCallback(() => {
    try { socketRef.current?.close(); } catch {}
    socketRef.current = null;
    if (pingRef.current) { window.clearInterval(pingRef.current); pingRef.current = null; }
  }, []);

  const resetReconnect = () => {
    if (reconnectTimerRef.current) { window.clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
  };

  const scheduleReconnect = (sid: number, wait = 1200) => {
    if (hardStopRef.current) return;
    if (connectingRef.current) return;
    resetReconnect();
    reconnectTimerRef.current = window.setTimeout(() => {
      connectWS(sid);
    }, wait) as unknown as number;
  };

  // REST snapshot (no navigation, no reload – pure state set)
  const primeREST = useCallback(
    async (sid: number) => {
      setLoading(true);
      log("REST snapshot…", { siteId: sid, range });
      try {
        const snap = await getDashboardSnapshot({ siteId: sid, range, tzOffset: new Date().getTimezoneOffset() });
        setState((s) => ({ ...s, data: mergeForRealtime(s.data, snap), isLoading: false, error: null }));
        log("Snapshot OK.");
      } catch (e: any) {
        setLoading(false);
        if (e instanceof UnauthorizedError) {
          setError("unauthorized");
          (window as any).logoutAndRedirect?.("401");
          if (stopRetryOn401) hardStopRef.current = true;
          warn("Snapshot unauthorized → stop.");
          return;
        }
        setError(e?.message || "snapshot_failed");
        warn("Snapshot failed:", e?.message || e);
      }
    },
    [range, stopRetryOn401]
  );

  // normalize live city payloads from WS
  const normalizeCityPoints = (payload: any): GeoCityPoint[] => {
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
    }).filter((p: GeoCityPoint) => p.lat !== 0 || p.lng !== 0);
  };

  const connectWS = useCallback(
    async (sid: number, forceTicket = false) => {
      if (hardStopRef.current) return;
      if (connectingRef.current) return;
      connectingRef.current = true;

      // do not clear/close existing WS if it’s already OPEN to avoid churn
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && !forceTicket) {
        connectingRef.current = false;
        return;
      }

      // always close any half-open sockets
      clearSocket();

      let ticket: string;
      try {
        ticket = await getWSTicket(sid, { force: forceTicket });
        log(forceTicket ? "Ticket (forced) OK." : "Ticket OK (cached/ok).");
      } catch (e: any) {
        connectingRef.current = false;
        if (e instanceof UnauthorizedError) {
          setError("unauthorized");
          (window as any).logoutAndRedirect?.("401");
          if (stopRetryOn401) hardStopRef.current = true;
          warn("Ticket unauthorized → stop.");
          return;
        }
        warn("Ticket error:", e?.message || e);
        scheduleReconnect(sid);
        return;
      }

      const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;
      log("WS connecting…", url);

      // One-time open wait: if server is slow to accept, prime a snapshot ONCE.
      const openFallback = window.setTimeout(() => {
        if (!didInitialPrimeRef.current && socketRef.current === ws && ws.readyState !== WebSocket.OPEN) {
          log("WS open timeout → one-time REST prime.");
          didInitialPrimeRef.current = true;
          primeREST(sid);
        }
      }, wsSilentTimeoutMs);

      ws.onopen = () => {
        window.clearTimeout(openFallback);
        connectingRef.current = false;
        log("WS open.");

        // Subscribe + request snapshot+live cities (Bootstrap handshake)
        const payload = { site_id: sid, range: lastRangeRef.current };
        try {
          ws.send(JSON.stringify({ type: "subscribe", channels: ["dashboard_analytics", "live_visitor_location_grouped"], ...payload }));
          ws.send(JSON.stringify({ type: "request_dashboard_snapshot", ...payload }));
          ws.send(JSON.stringify({ type: "request_live_cities", ...payload }));
        } catch (e) { warn("WS send failed:", e); }

        // keepalive
        pingRef.current = window.setInterval(() => {
          try { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); } catch {}
        }, 25000) as unknown as number;
      };

      ws.onmessage = (ev) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }

        const msgSiteId = String(msg?.site_id ?? msg?.payload?.site_id ?? "");
        if (msgSiteId && String(msgSiteId) !== String(currentSiteRef.current)) return;

        if (msg.type === "dashboard_analytics" && msg.payload) {
          const incoming = msg.payload as DashboardPayload;
          if (incoming.range && incoming.range !== lastRangeRef.current) return;
          setState((s) => ({ ...s, data: mergeForRealtime(s.data, incoming), error: null }));
          log("Frame: dashboard_analytics");
        }

        if (
          msg.type === "live_visitor_location_grouped" ||
          msg.type === "live_city_groups" ||
          msg.type === "live_visitor_cities" ||
          msg.type === "city_groups" ||
          msg.type === "live_visitors_clustered"
        ) {
          const points = normalizeCityPoints(msg.payload ?? msg.data ?? msg.points ?? msg.clusters ?? []);
          const total = points.reduce((sum, p) => sum + (p.count || 0), 0);
          setState((s) => ({ ...s, liveCities: points, liveCount: total }));
          log(`Frame: live cities (${points.length} clusters, total=${total}).`);
        }

        if (msg.type === "live_visitor_update" || msg.type === "live_count") {
          const c = Number(msg?.payload?.count ?? msg?.count ?? 0) || 0;
          setState((s) => ({ ...s, liveCount: c }));
          log(`Frame: live count = ${c}.`);
        }
      };

      ws.onerror = (ev) => {
        warn("WS error", ev);
      };

      ws.onclose = (ev) => {
        connectingRef.current = false;
        // Policy closes → stop. Otherwise, single mild reconnect.
        if ([4001, 4003, 4401].includes(ev.code)) {
          warn(`WS closed (policy ${ev.code}) → stop.`);
          if (stopRetryOn401) hardStopRef.current = true;
          return;
        }
        warn(`WS closed (${ev.code}) → reconnect.`);
        scheduleReconnect(sid);
      };
    },
    [clearSocket, primeREST, stopRetryOn401, wsSilentTimeoutMs]
  );

  // lifecycle
  useEffect(() => {
    if (!siteId) return;

    hardStopRef.current = false;
    currentSiteRef.current = siteId;
    lastRangeRef.current = range;

    // One initial snapshot (Bootstrap parity), then WS
    didInitialPrimeRef.current = false;
    primeREST(siteId).finally(() => connectWS(siteId));

    // IMPORTANT: no visibilitychange handler.
    // Bootstrap code doesn’t auto-close WS on tab hide; React shouldn’t either.

    return () => {
      // cleanup on unmount/unroute
      resetReconnect();
      clearSocket();
    };
  }, [siteId, range, connectWS, clearSocket, primeREST]);

  // public API
  const reconnectWS = useCallback(() => {
    if (!siteId || hardStopRef.current) return;
    connectWS(siteId);
  }, [siteId, connectWS]);

  const refreshSnapshot = useCallback(() => {
    if (!siteId) return;
    primeREST(siteId);
  }, [siteId, primeREST]);

  const restart = useCallback(() => {
    if (!siteId || hardStopRef.current) return;
    clearSocket();
    connectWS(siteId, true); // force new ticket
    primeREST(siteId);
  }, [siteId, connectWS, primeREST, clearSocket]);

  const disconnect = useCallback(() => {
    hardStopRef.current = true;
    resetReconnect();
    clearSocket();
  }, [clearSocket]);

  return {
    data: state.data,
    liveCities: state.liveCities,
    liveCount: state.liveCount,
    isLoading: state.isLoading,
    error: state.error,
    refreshSnapshot,
    reconnectWS,
    restart,
    disconnect,
  };
}

function mergeForRealtime(prev: DashboardPayload | null, next: DashboardPayload): DashboardPayload {
  if (!prev) return next;
  return {
    ...prev,
    ...next,
    time_grouped_visits: next.time_grouped_visits ?? prev.time_grouped_visits,
    unique_vs_returning: next.unique_vs_returning ?? prev.unique_vs_returning,
    funnel: next.funnel ?? prev.funnel,
    referrers: next.referrers ?? prev.referrers,
    browsers: next.browsers ?? prev.browsers,
    devices: next.devices ?? prev.devices,
    os: next.os ?? prev.os,
    countries: next.countries ?? prev.countries,
    events_timeline: next.events_timeline ?? prev.events_timeline,
    utm_campaigns: next.utm_campaigns ?? prev.utm_campaigns,
    utm_sources: next.utm_sources ?? prev.utm_sources,
    calendar_density: next.calendar_density ?? prev.calendar_density,
  };
}
