// src/hooks/useDashboardRealtime.ts
// Hook that:
// 1) Immediately loads a REST snapshot so the dashboard renders fast.
// 2) Opens a WS to refine live metrics (cities, counts, streaming analytics).
// 3) Optionally stops retry spam on hard 401.

import { useCallback, useEffect, useRef, useState } from "react";
import { getDashboardSnapshot, getWSTicket, HttpError, UnauthorizedError, GeoCityPoint } from "@/services/dashboardService";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

type State = {
  data: DashboardPayload | null;
  liveCities: GeoCityPoint[];
  liveCount: number | null;
  isLoading: boolean;
  error: string | null;
};

type Options = {
  stopRetryOn401?: boolean;   // default true
  wsSilentTimeoutMs?: number; // if WS doesn’t open in this time, do a refresh (default 6000)
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

  /* ---------- helpers ---------- */
  const clearSocket = useCallback(() => {
    try {
      socketRef.current?.close();
    } catch {}
    socketRef.current = null;

    if (pingRef.current) {
      window.clearInterval(pingRef.current);
      pingRef.current = null;
    }
  }, []);

  const setLoading = (v: boolean) => setState((s) => ({ ...s, isLoading: v }));
  const setError = (msg: string | null) => setState((s) => ({ ...s, error: msg }));

  const primeREST = useCallback(
    async (sid: number) => {
      setLoading(true);
      try {
        const snap = await getDashboardSnapshot({ siteId: sid, range, tzOffset: new Date().getTimezoneOffset() });
        setState((s) => ({
          ...s,
          data: snap,
          isLoading: false,
          error: null,
        }));
      } catch (e: any) {
        setLoading(false);
        if (e instanceof UnauthorizedError) {
          setError("unauthorized");
          // hand off to global handler if present
          (window as any).logoutAndRedirect?.("401");
          if (stopRetryOn401) hardStopRef.current = true;
          return;
        }
        setError(e?.message || "snapshot_failed");
      }
    },
    [range, stopRetryOn401]
  );

  const connectWS = useCallback(
    async (sid: number) => {
      if (hardStopRef.current) return;

      // get ticket
      let ticket: string;
      try {
        ticket = await getWSTicket(sid);
      } catch (e: any) {
        if (e instanceof UnauthorizedError) {
          setError("unauthorized");
          (window as any).logoutAndRedirect?.("401");
          if (stopRetryOn401) hardStopRef.current = true;
          return;
        }
        // 429 or other -> schedule reconnect
        scheduleReconnect(sid);
        return;
      }

      // open socket
      const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
      clearSocket();
      const ws = new WebSocket(url);
      socketRef.current = ws;

      // fallback refresh if ws doesn’t open in time
      const openFallback = window.setTimeout(() => {
        if (socketRef.current === ws && ws.readyState !== WebSocket.OPEN) {
          primeREST(sid); // no skeleton; the UI is already showing data
        }
      }, wsSilentTimeoutMs);

      ws.onopen = () => {
        window.clearTimeout(openFallback);
        // keep alive
        pingRef.current = window.setInterval(() => {
          try {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
          } catch {}
        }, 25000) as unknown as number;
      };

      ws.onmessage = (ev) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        let msg: any;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        // Site guard
        if (!msg?.site_id || String(msg.site_id) !== String(currentSiteRef.current)) return;

        // Streamed analytics
        if (msg.type === "dashboard_analytics" && msg.payload) {
          const data = msg.payload as DashboardPayload;
          // ignore mismatched range (e.g., server computed old range)
          if (data.range && data.range !== lastRangeRef.current) return;

          setState((s) => ({
            ...s,
            data: mergeForRealtime(s.data, data),
            error: null,
          }));
        }

        // Live city clusters
        if (msg.type === "live_visitor_location_grouped" && Array.isArray(msg.payload)) {
          const points: GeoCityPoint[] = msg.payload.map((v: any) => ({
            city: v.city || "Unknown",
            country: v.country || "Unknown",
            lat: Number(v.lat) || 0,
            lng: Number(v.lng) || 0,
            count: Number(v.count) || 0,
            debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : undefined,
          }));
          setState((s) => ({ ...s, liveCities: points }));
          const total = points.reduce((sum, p) => sum + (p.count || 0), 0);
          setState((s) => ({ ...s, liveCount: total }));
        }

        // Simple live count
        if (msg.type === "live_visitor_update") {
          const c = Number(msg?.payload?.count) || 0;
          setState((s) => ({ ...s, liveCount: c }));
        }
      };

      ws.onerror = () => {
        // soft error -> reconnect
        scheduleReconnect(sid);
      };

      ws.onclose = (ev) => {
        // policy/unauth close codes: stop reconnecting
        if ([4001, 4003, 4401].includes(ev.code)) {
          if (stopRetryOn401) hardStopRef.current = true;
          return;
        }
        scheduleReconnect(sid);
      };
    },
    [clearSocket, primeREST, stopRetryOn401, wsSilentTimeoutMs]
  );

  const backoffRef = useRef<number>(1000); // start 1s
  const scheduleReconnect = (sid: number) => {
    if (hardStopRef.current) return;
    if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);

    const wait = backoffRef.current + Math.floor(Math.random() * 500);
    reconnectTimerRef.current = window.setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 2, 15000); // cap 15s
      connectWS(sid);
    }, wait) as unknown as number;
  };

  const resetBackoff = () => {
    backoffRef.current = 1000;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  /* ---------- lifecycle ---------- */
  useEffect(() => {
    if (!siteId) return;
    hardStopRef.current = false;
    resetBackoff();
    currentSiteRef.current = siteId;
    lastRangeRef.current = range;

    // Always show a fresh REST snapshot first
    primeREST(siteId).then(() => {
      // Then open WS
      connectWS(siteId);
    });

    // visibility handler: reconnect on focus, close on hide
    const vis = () => {
      if (document.visibilityState === "visible") {
        if (!hardStopRef.current) {
          resetBackoff();
          connectWS(siteId);
        }
      } else {
        clearSocket();
      }
    };
    document.addEventListener("visibilitychange", vis);

    return () => {
      document.removeEventListener("visibilitychange", vis);
      clearSocket();
      if (reconnectTimerRef.current) window.clearTimeout(reconnectTimerRef.current);
    };
  }, [siteId, range, connectWS, primeREST, clearSocket]);

  /* ---------- public API ---------- */
  const reconnect = useCallback(() => {
    if (!siteId || hardStopRef.current) return;
    resetBackoff();
    connectWS(siteId);
  }, [siteId, connectWS]);

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
    reconnect,
    disconnect,
  };
}

/* ---------- tiny merge helper so realtime data doesn’t flicker ---------- */
function mergeForRealtime(prev: DashboardPayload | null, next: DashboardPayload): DashboardPayload {
  if (!prev) return next;

  return {
    ...prev,
    ...next,
    // Prefer freshest arrays if present, otherwise keep previous to avoid blanking charts
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
