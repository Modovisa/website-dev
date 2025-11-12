// src/hooks/useDashboardRealtime.ts
import { useEffect, useRef, useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import type { GeoCityPoint } from "@/services/dashboardService";
import { API_BASE } from "@/services/http";
import { secureFetch } from "@/lib/auth";

/** Toggle verbose logs with localStorage.setItem('mv.debug','1') */
const DEBUG = typeof window !== "undefined" && localStorage.getItem("mv.debug") === "1";
const log = (...args: any[]) => { if (DEBUG) console.log("[dashboard:ws]", ...args); };
const warn = (...args: any[]) => { if (DEBUG) console.warn("[dashboard:ws]", ...args); };
const err  = (...args: any[]) => { console.error("[dashboard:ws]", ...args); };

function wsUrlFromApiBase(apiBase: string, path: string) {
  const base = new URL(apiBase);
  const proto = base.protocol === "http:" ? "ws:" : "wss:";
  return `${proto}//${base.host}${path}`;
}

function clampNumber(n: any, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}
function toStringSafe(v: any, fallback = "") {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function sanitizeDashboardPayload(raw: any): DashboardPayload {
  const safe = { ...(raw || {}) };
  // Defensive defaults for commonly charted arrays
  if (!Array.isArray(safe.time_grouped_visits)) safe.time_grouped_visits = [];
  if (!Array.isArray(safe.events_timeline)) safe.events_timeline = [];
  if (!Array.isArray(safe.unique_vs_returning)) safe.unique_vs_returning = [];
  if (!Array.isArray(safe.impressions_timeline)) safe.impressions_timeline = [];
  if (!Array.isArray(safe.impressions_previous_timeline)) safe.impressions_previous_timeline = [];
  if (!Array.isArray(safe.clicks_timeline)) safe.clicks_timeline = [];
  if (!Array.isArray(safe.clicks_previous_timeline)) safe.clicks_previous_timeline = [];
  if (!Array.isArray(safe.conversions_timeline)) safe.conversions_timeline = [];
  if (!Array.isArray(safe.conversions_previous_timeline)) safe.conversions_previous_timeline = [];
  if (!Array.isArray(safe.search_visitors_timeline)) safe.search_visitors_timeline = [];
  if (!Array.isArray(safe.search_visitors_previous_timeline)) safe.search_visitors_previous_timeline = [];
  if (!Array.isArray(safe.unique_visitors_timeline)) safe.unique_visitors_timeline = [];
  if (!Array.isArray(safe.previous_unique_visitors_timeline)) safe.previous_unique_visitors_timeline = [];
  if (!Array.isArray(safe.top_pages)) safe.top_pages = [];
  if (!Array.isArray(safe.referrers)) safe.referrers = [];
  if (!Array.isArray(safe.browsers)) safe.browsers = [];
  if (!Array.isArray(safe.devices)) safe.devices = [];
  if (!Array.isArray(safe.os)) safe.os = [];
  if (!Array.isArray(safe.utm_campaigns)) safe.utm_campaigns = [];
  if (!Array.isArray(safe.utm_sources)) safe.utm_sources = [];
  if (!Array.isArray(safe.countries)) safe.countries = [];
  if (!Array.isArray(safe.calendar_density)) safe.calendar_density = [];
  safe.range = toStringSafe(safe.range || "24h", "24h");
  return safe as DashboardPayload;
}

export type WSStatus = "idle" | "connecting" | "open" | "closed" | "error" | "handshake-timeout";

/**
 * WS-only dashboard stream (no REST).
 * - Fetch short-lived ticket
 * - Open WS
 * - (Optionally) send subscribe + range
 * - Emit frames into `data`, `liveCount`, `liveCities`
 * - Watchdog: if no dashboard frame within 10s, surface `handshake-timeout`
 */
export function useDashboardRealtime(siteId?: number | string, range: string = "24h") {
  const [status, setStatus] = useState<WSStatus>("idle");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]);
  const [lastFrameAt, setLastFrameAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const backoffRef = useRef<number>(0);
  const closedRef = useRef<boolean>(false);

  const currentSiteRef = useRef<string | number | undefined>(siteId);
  const currentRangeRef = useRef<string>(range);
  currentSiteRef.current = siteId;
  currentRangeRef.current = range;

  // Handshake watchdog: if we don’t get ANY dashboard payload within N seconds, mark timeout
  useEffect(() => {
    if (!siteId) return;
    setStatus("connecting");
    setLastFrameAt(null);
    setLastError(null);
    const t = window.setTimeout(() => {
      if (status === "connecting" && lastFrameAt == null) {
        warn("Handshake timeout — no dashboard frames received.");
        setStatus("handshake-timeout");
      }
    }, 10000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId, range]);

  useEffect(() => {
    if (!siteId) return;

    closedRef.current = false;

    const connect = async () => {
      try {
        setStatus("connecting");
        log("Ticket: POST /api/ws-ticket", { site_id: siteId });

        const tRes = await secureFetch(`${API_BASE}/api/ws-ticket`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site_id: siteId }),
        });

        if (tRes.status === 401) {
          setLastError("unauthorized");
          err("401 Unauthorized — redirecting to /login");
          window.location.replace("/login");
          return;
        }
        if (!tRes.ok) {
          const body = await tRes.text().catch(() => "");
          setLastError(`ticket_failed_${tRes.status}`);
          err("Ticket fetch failed", tRes.status, body);
          throw new Error("ticket_failed");
        }

        const { ticket } = await tRes.json();
        if (!ticket) {
          setLastError("no_ticket");
          err("No ticket in response");
          throw new Error("no_ticket");
        }

        // close existing
        try { wsRef.current?.close(); } catch {}
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

        const url = wsUrlFromApiBase(API_BASE, `/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`);
        log("WS opening:", url);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus("open");
          backoffRef.current = 0;
          log("WS open");

          // Optional subscribe (harmless if server doesn’t require it)
          const subscribeMsg = {
            type: "dashboard_subscribe",
            payload: { site_id: siteId, range }
          };
          try { ws.send(JSON.stringify(subscribeMsg)); log("→ sent subscribe", subscribeMsg); } catch {}

          // Also nudge range explicitly (covers servers that split subscribe vs set-range)
          const rangeMsg = { type: "set_dashboard_range", payload: { range } };
          try { ws.send(JSON.stringify(rangeMsg)); log("→ sent range", rangeMsg); } catch {}

          // Heartbeat
          pingRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify({ type: "ping" })); } catch {}
            }
          }, 25000);
        };

        ws.onmessage = (ev) => {
          let msg: any;
          try { msg = JSON.parse(ev.data); }
          catch { return; }

          if (String(msg.site_id) !== String(currentSiteRef.current)) return;

          // Live count frames
          if (msg.type === "live_visitor_update") {
            const n = clampNumber(msg?.payload?.count, 0);
            setLiveCount(n);
            if (DEBUG) log("← live_visitor_update", n);
          }

          // Live grouped locations
          if (msg.type === "live_visitor_location_grouped") {
            const arr: GeoCityPoint[] = Array.isArray(msg.payload)
              ? msg.payload.map((v: any) => ({
                  city: toStringSafe(v?.city || "Unknown", "Unknown"),
                  country: toStringSafe(v?.country || "Unknown", "Unknown"),
                  lat: clampNumber(v?.lat, 0),
                  lng: clampNumber(v?.lng, 0),
                  count: clampNumber(v?.count, 0),
                  debug_ids: Array.isArray(v?.debug_ids) ? v.debug_ids : undefined,
                }))
              : [];
            setLiveCities(arr);
            const total = arr.reduce((s, g) => s + clampNumber(g.count, 0), 0);
            setLiveCount(total);
            if (DEBUG) log("← live_visitor_location_grouped", { groups: arr.length, total });
          }

          // Dashboard analytics (range-gated)
          if (msg.type === "dashboard_analytics" && msg.payload) {
            const want = String(currentRangeRef.current || "24h");
            const got = toStringSafe(msg.payload.range || want, want);
            if (got !== want) {
              if (DEBUG) log("skip dashboard_analytics (range mismatch)", { got, want });
              return;
            }
            const safe = sanitizeDashboardPayload(msg.payload);
            setData(safe);
            setLastFrameAt(Date.now());
            if (DEBUG) log("← dashboard_analytics", { series:
              {
                time: safe.time_grouped_visits?.length ?? 0,
                pages: safe.top_pages?.length ?? 0,
                refs: safe.referrers?.length ?? 0
              }
            });
          }
        };

        ws.onerror = (e) => {
          setStatus("error");
          setLastError("ws_error");
          err("WS error", e);
          try { ws.close(); } catch {}
        };

        ws.onclose = () => {
          if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
          if (closedRef.current) { setStatus("closed"); return; }
          setStatus("closed");
          const prev = backoffRef.current || 1000;
          const next = Math.min(prev * 2, 20000);
          backoffRef.current = next;
          const jitter = Math.floor(Math.random() * 1000);
          const delay = next + jitter;
          warn(`WS closed — reconnecting in ${delay}ms`);
          reconnectRef.current = window.setTimeout(connect, delay);
        };
      } catch (e: any) {
        if (closedRef.current) return;
        setStatus("error");
        setLastError(e?.message || "connect_failed");
        const prev = backoffRef.current || 1000;
        const next = Math.min(prev * 2, 20000);
        backoffRef.current = next;
        const jitter = Math.floor(Math.random() * 1000);
        const delay = next + jitter;
        warn(`Connect failed — retrying in ${delay}ms`, e);
        reconnectRef.current = window.setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      closedRef.current = true;
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      try { wsRef.current?.close(); } catch {}
    };
  }, [siteId, range]);

  // If range changes while socket is open, nudge the server (don’t tear down the WS)
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      const msg = { type: "set_dashboard_range", payload: { range } };
      ws.send(JSON.stringify(msg));
      log("→ range update", msg);
    } catch {}
  }, [range]);

  return { status, data, liveCount, liveCities, lastError };
}
