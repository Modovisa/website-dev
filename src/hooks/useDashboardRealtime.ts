// src/hooks/useDashboardRealtime.ts

import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardSnapshot, getWSTicket, UnauthorizedError, GeoCityPoint } from "@/services/dashboardService";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

const DEBUG = true; // set false to silence logs

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
};

const DEFAULTS: Required<Options> = {
  stopRetryOn401: true,
  wsSilentTimeoutMs: 6000,
};

export function useDashboardRealtime(siteId: number | null | undefined, range: RangeKey, opts?: Options) {
  const { stopRetryOn401, wsSilentTimeoutMs } = { ...DEFAULTS, ...(opts || {}) };

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

  const setLoading = (v: boolean) => setState((s) => ({ ...s, isLoading: v }));
  const setError = (msg: string | null) => setState((s) => ({ ...s, error: msg }));

  const log = (...a: any[]) => { if (DEBUG) console.log("[DashboardWS]", ...a); };
  const warn = (...a: any[]) => { if (DEBUG) console.warn("[DashboardWS]", ...a); };

  const clearSocket = useCallback(() => {
    try { socketRef.current?.close(); } catch {}
    socketRef.current = null;
    if (pingRef.current) { window.clearInterval(pingRef.current); pingRef.current = null; }
  }, []);

  const resetBackoff = () => {
    backoffRef.current = 1000;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const scheduleReconnect = (sid: number) => {
    if (hardStopRef.current) return;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    const wait = backoffRef.current + Math.floor(Math.random() * 500);
    reconnectTimerRef.current = window.setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 2, 15000);
      log(`Reconnecting WS in ${wait}ms (site ${sid})...`);
      connectWS(sid);
    }, wait) as unknown as number;
  };

  const primeREST = useCallback(
    async (sid: number) => {
      setLoading(true);
      log("Fetching REST snapshot...", { siteId: sid, range });
      try {
        const snap = await getDashboardSnapshot({ siteId: sid, range, tzOffset: new Date().getTimezoneOffset() });
        setState((s) => ({ ...s, data: snap, isLoading: false, error: null }));
        log("Snapshot OK.", { siteId: sid, range });
      } catch (e: any) {
        setLoading(false);
        if (e instanceof UnauthorizedError) {
          setError("unauthorized");
          (window as any).logoutAndRedirect?.("401");
          if (stopRetryOn401) hardStopRef.current = true;
          warn("Snapshot unauthorized → stopping retries.");
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

  const connectWS = useCallback(
    async (sid: number, forceTicket = false) => {
      if (hardStopRef.current) return;

      let ticket: string;
      try {
        ticket = await getWSTicket(sid, { force: forceTicket });
        log(forceTicket ? "Ticket (forced) OK." : "Ticket OK (maybe cached).");
      } catch (e: any) {
        if (e instanceof UnauthorizedError) {
          setError("unauthorized");
          (window as any).logoutAndRedirect?.("401");
          if (stopRetryOn401) hardStopRef.current = true;
          warn("Ticket unauthorized → stopping retries.");
          return;
        }
        // 429 gate or other failure
        warn("Ticket error:", e?.message || e);
        scheduleReconnect(sid);
        return;
      }

      clearSocket();
      const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
      const ws = new WebSocket(url);
      socketRef.current = ws;
      log("WS connecting...", url);

      const openFallback = window.setTimeout(() => {
        if (socketRef.current === ws && ws.readyState !== WebSocket.OPEN) {
          warn("WS open timeout → re-prime REST (non-blocking).");
          primeREST(sid);
        }
      }, wsSilentTimeoutMs);

      ws.onopen = () => {
        window.clearTimeout(openFallback);
        log("WS open.");
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

        // Analytics frames
        if (msg.type === "dashboard_analytics" && msg.payload) {
          const incoming = msg.payload as DashboardPayload;
          if (incoming.range && incoming.range !== lastRangeRef.current) return;
          setState((s) => ({ ...s, data: mergeForRealtime(s.data, incoming), error: null }));
          log("Frame: dashboard_analytics");
        }

        // Live city clusters
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

        // Simple live count
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
          warn(`WS closed (policy ${ev.code}) → stopping retries.`);
          if (stopRetryOn401) hardStopRef.current = true;
          return;
        }
        warn(`WS closed (${ev.code}) → reconnecting.`);
        scheduleReconnect(sid);
      };
    },
    [clearSocket, primeREST, stopRetryOn401, wsSilentTimeoutMs]
  );

  // lifecycle
  useEffect(() => {
    if (!siteId) return;
    hardStopRef.current = false;
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
        log("Page hidden → closing WS.");
        clearSocket();
      }
    };
    document.addEventListener("visibilitychange", vis);

    return () => {
      document.removeEventListener("visibilitychange", vis);
      clearSocket();
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
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
    connectWS(siteId, true); // force new ticket if needed
    primeREST(siteId);
  }, [siteId, connectWS, primeREST]);

  const disconnect = useCallback(() => {
    hardStopRef.current = true;
    clearSocket();
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
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
