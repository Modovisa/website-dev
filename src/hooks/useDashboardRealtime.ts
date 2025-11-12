// src/hooks/useDashboardRealtime.ts

iimport { useCallback, useEffect, useRef, useState } from "react";
import {
  getDashboardSnapshot,
  getWSTicket,
  UnauthorizedError,
  GeoCityPoint,
  // ✅ optional REST fallback to fetch clustered cities if WS never sends them
  // (implement getGeoEvents below in dashboardService.ts)
  // remove if you don’t want REST fallback
  // @ts-ignore
  getGeoEvents,
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
  wsSilentTimeoutMs?: number;
  // how long after open before we declare “no analytics frames”
  analyticsFailoverMs?: number;
  // try REST city points if WS never sends them
  enableCitiesRestFallback?: boolean;
};

const DEFAULTS: Required<Options> = {
  stopRetryOn401: true,
  wsSilentTimeoutMs: 6000,
  analyticsFailoverMs: 7000,
  enableCitiesRestFallback: true,
};

export function useDashboardRealtime(siteId: number | null | undefined, range: RangeKey, opts?: Options) {
  const { stopRetryOn401, wsSilentTimeoutMs, analyticsFailoverMs, enableCitiesRestFallback } = {
    ...DEFAULTS,
    ...(opts || {}),
  };

  const [state, setState] = useState<State>({
    data: null,
    liveCities: [],
    liveCount: null,
    isLoading: false,
    error: null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const hardStopRef = useRef<boolean>(false);
  const currentSiteRef = useRef<number | null>(null);
  const lastRangeRef = useRef<RangeKey>(range);
  const backoffRef = useRef<number>(1000);

  // track whether we’ve seen frames after open
  const seenAnalyticsRef = useRef(false);
  const seenCitiesRef = useRef(false);
  const failoverTimerRef = useRef<number | null>(null);

  const setLoading = (v: boolean) => setState((s) => ({ ...s, isLoading: v }));
  const setError   = (msg: string | null) => setState((s) => ({ ...s, error: msg }));

  const log  = (...a: any[]) => { if (DEBUG) console.log("[DashboardWS]", ...a); };
  const warn = (...a: any[]) => { if (DEBUG) console.warn("[DashboardWS]", ...a); };

  const clearSocket = useCallback(() => {
    try { socketRef.current?.close(); } catch {}
    socketRef.current = null;
    if (pingRef.current) { window.clearInterval(pingRef.current); pingRef.current = null; }
  }, []);

  const resetBackoff = () => {
    backoffRef.current = 1000;
    if (reconnectTimerRef.current) { window.clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
  };

  const scheduleReconnect = (sid: number) => {
    if (hardStopRef.current) return;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    const wait = backoffRef.current + Math.floor(Math.random() * 500);
    reconnectTimerRef.current = window.setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 2, 15000);
      log(`Reconnecting in ${wait}ms (site ${sid})…`);
      connectWS(sid);
    }, wait) as unknown as number;
  };

  const primeREST = useCallback(
    async (sid: number) => {
      setLoading(true);
      log("REST snapshot…", { siteId: sid, range });
      try {
        const snap = await getDashboardSnapshot({ siteId: sid, range, tzOffset: new Date().getTimezoneOffset() });
        setState((s) => ({ ...s, data: snap, isLoading: false, error: null }));
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

  const startFailoverTimer = (sid: number) => {
    if (failoverTimerRef.current) window.clearTimeout(failoverTimerRef.current);
    failoverTimerRef.current = window.setTimeout(async () => {
      if (!seenAnalyticsRef.current) {
        warn("No analytics frame after open → REST prime.");
        primeREST(sid);
      }
      if (!seenCitiesRef.current && enableCitiesRestFallback) {
        try {
          log("No city clusters via WS → REST fallback for live cities.");
          const pts = await getGeoEvents?.(sid);
          if (Array.isArray(pts) && pts.length) {
            const total = pts.reduce((s: number, p: GeoCityPoint) => s + (p.count || 0), 0);
            setState((s) => ({ ...s, liveCities: pts, liveCount: total }));
            log(`REST cities fallback: ${pts.length} clusters, total=${total}.`);
          }
        } catch (e) {
          warn("REST cities fallback failed:", e);
        }
      }
    }, analyticsFailoverMs) as unknown as number;
  };

  const connectWS = useCallback(
    async (sid: number, forceTicket = false) => {
      if (hardStopRef.current) return;

      seenAnalyticsRef.current = false;
      seenCitiesRef.current = false;

      let ticket: string;
      try {
        ticket = await getWSTicket(sid, { force: forceTicket });
        log(forceTicket ? "Ticket (forced) OK." : "Ticket OK (cached/ok).");
      } catch (e: any) {
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

      clearSocket();
      const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;
      log("WS connecting…", url);

      const openFallback = window.setTimeout(() => {
        if (socketRef.current === ws && ws.readyState !== WebSocket.OPEN) {
          warn("WS open timeout → REST prime.");
          primeREST(sid);
        }
      }, wsSilentTimeoutMs);

      ws.onopen = () => {
        window.clearTimeout(openFallback);
        log("WS open.");

        // --- Bootstrap-exact handshake ---
        // 1) subscribe to frames
        // 2) request dashboard snapshot
        // 3) request live city clusters
        const payload = { site_id: sid, range: lastRangeRef.current };
        try {
          ws.send(JSON.stringify({
            type: "subscribe",
            channels: ["dashboard_analytics", "live_visitor_location_grouped"],
            ...payload,
          }));
          ws.send(JSON.stringify({ type: "request_dashboard_snapshot", ...payload }));
          ws.send(JSON.stringify({ type: "request_live_cities", ...payload }));
        } catch (e) {
          warn("WS send failed:", e);
        }
        // --- end Bootstrap-exact ---

        // keepalive (unchanged)
        pingRef.current = window.setInterval(() => {
          try {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          } catch {}
        }, 25000) as unknown as number;

        // optional: your existing failover timer call if present
        startFailoverTimer?.(sid);
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
          seenAnalyticsRef.current = true;
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
          seenCitiesRef.current = true;
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
        scheduleReconnect(sid);
      };

      ws.onclose = (ev) => {
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
    if (failoverTimerRef.current) { window.clearTimeout(failoverTimerRef.current); failoverTimerRef.current = null; }
    resetBackoff();
    currentSiteRef.current = siteId;
    lastRangeRef.current = range;

    primeREST(siteId).then(() => connectWS(siteId));

    const vis = () => {
      if (document.visibilityState === "visible") {
        if (!hardStopRef.current) {
          resetBackoff();
          connectWS(siteId);
        }
      } else {
        log("Hidden → closing WS.");
        clearSocket();
      }
    };
    document.addEventListener("visibilitychange", vis);

    return () => {
      document.removeEventListener("visibilitychange", vis);
      clearSocket();
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
      if (failoverTimerRef.current) window.clearTimeout(failoverTimerRef.current);
    };
  }, [siteId, range, connectWS, clearSocket, primeREST]);

  // public API
  const reconnectWS = useCallback(() => {
    if (!siteId || hardStopRef.current) return;
    resetBackoff();
    connectWS(siteId);
  }, [siteId, connectWS]);

  const refreshSnapshot = useCallback(() => {
    if (!siteId) return;
    primeREST(siteId);
  }, [siteId, primeREST]);

  const restart = useCallback(() => {
    if (!siteId || hardStopRef.current) return;
    resetBackoff();
    connectWS(siteId, true); // force a brand new ticket
    primeREST(siteId);
  }, [siteId, connectWS, primeREST]);

  const disconnect = useCallback(() => {
    hardStopRef.current = true;
    clearSocket();
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    if (failoverTimerRef.current) window.clearTimeout(failoverTimerRef.current);
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
