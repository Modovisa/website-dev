// src/hooks/useDashboardRealtime.ts

import { useEffect, useRef, useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import type { GeoCityPoint } from "@/services/dashboardService";
import { API_BASE } from "@/services/http";
import { secureFetch } from "@/lib/auth";

/* ---------------------------- helpers ---------------------------- */

function redirectOn401(res: Response) {
  if (res.status === 401) {
    window.location.replace("/login");
    throw new Error("unauthorized");
  }
}

function wsUrlFromApiBase(apiBase: string, path: string) {
  // turns https://api.example.com -> wss://api.example.com
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

/**
 * Make sure all arrays exist and are numeric/string-safe.
 * Only shape what's commonly charted. Add more fields as needed.
 */
function sanitizeDashboardPayload(raw: any): DashboardPayload {
  const safe = { ...(raw || {}) };

  // time series buckets
  safe.time_grouped_visits = Array.isArray(safe.time_grouped_visits)
    ? safe.time_grouped_visits.map((b: any) => ({
        label: toStringSafe(b?.label),
        visitors: clampNumber(b?.visitors),
        views: clampNumber(b?.views),
      }))
    : [];

  // generic series (example names: event_volume, conversions, etc.)
  if (Array.isArray(safe.event_volume)) {
    safe.event_volume = safe.event_volume.map((r: any) => ({
      label: toStringSafe(r?.label),
      count: clampNumber(r?.count),
    }));
  } else {
    safe.event_volume = [];
  }

  // keep range string for gating
  safe.range = toStringSafe(safe.range || "24h", "24h");

  // anything else can pass through as-is; charts/components should guard
  return safe as DashboardPayload;
}

/* --------------------------- main hook --------------------------- */

/**
 * Bootstrap model:
 * 1) One REST snapshot (siteId+range) for first paint.
 * 2) Then a WS stream drives live updates.
 * 3) Ignore WS frames for a different `range`.
 * 4) No periodic refetch.
 */
export function useDashboardRealtime(siteId?: number | string, range: string = "24h") {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const currentRangeRef = useRef<string>(range);
  currentRangeRef.current = range;

  const backoffRef = useRef<number>(0); // ms
  const closedRef = useRef<boolean>(false);

  // One-time REST snapshot for first paint (per site+range)
  useEffect(() => {
    if (!siteId) return;

    let aborted = false;
    const ctrl = new AbortController();

    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await secureFetch(
          `${API_BASE}/api/user-dashboard-analytics?site_id=${siteId}&range=${encodeURIComponent(
            range
          )}&tz_offset=${tz}`,
          { method: "GET", credentials: "include", signal: ctrl.signal }
        );
        redirectOn401(res);
        if (!res.ok) return;
        const json = await res.json();
        if (!aborted) setData(sanitizeDashboardPayload(json));
      } catch (err) {
        // ignore aborts/401 (already redirected)
      }
    })();

    return () => {
      aborted = true;
      ctrl.abort();
    };
  }, [siteId, range]);

  // WebSocket stream (ticket via secureFetch)
  useEffect(() => {
    if (!siteId) return;

    closedRef.current = false;

    const connect = async () => {
      try {
        // 1) fetch short-lived WS ticket
        const tRes = await secureFetch(`${API_BASE}/api/ws-ticket`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site_id: siteId }),
        });
        redirectOn401(tRes);
        if (!tRes.ok) throw new Error("ticket_failed");
        const { ticket } = await tRes.json();
        if (!ticket) throw new Error("no_ticket");

        // 2) open WS (close any existing first)
        try {
          wsRef.current?.close();
        } catch {}
        if (pingRef.current) {
          clearInterval(pingRef.current);
          pingRef.current = null;
        }

        const url = wsUrlFromApiBase(API_BASE, `/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          // reset backoff on successful open
          backoffRef.current = 0;

          // heartbeat
          pingRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = (ev) => {
          let msg: any;
          try {
            msg = JSON.parse(ev.data);
          } catch {
            return;
          }
          if (String(msg.site_id) !== String(siteId)) return;

          // Dashboard analytics stream (range-gated)
          if (msg.type === "dashboard_analytics" && msg.payload) {
            const want = String(currentRangeRef.current || "24h");
            const got = toStringSafe(msg.payload.range || want, want);
            if (got !== want) return;

            const safePayload = sanitizeDashboardPayload(msg.payload);
            setData(safePayload);
          }

          // Grouped live visitor positions
          if (msg.type === "live_visitor_location_grouped") {
            const incoming: GeoCityPoint[] = Array.isArray(msg.payload)
              ? msg.payload.map((v: any) => ({
                  city: toStringSafe(v?.city || "Unknown", "Unknown"),
                  country: toStringSafe(v?.country || "Unknown", "Unknown"),
                  lat: clampNumber(v?.lat, 0),
                  lng: clampNumber(v?.lng, 0),
                  count: clampNumber(v?.count, 0),
                  debug_ids: Array.isArray(v?.debug_ids) ? v.debug_ids : undefined,
                }))
              : [];
            setLiveCities(incoming);
            const total = incoming.reduce((s, g) => s + clampNumber(g.count, 0), 0);
            setLiveCount(total);
          }

          // Single live count update
          if (msg.type === "live_visitor_update") {
            setLiveCount(clampNumber(msg?.payload?.count, 0));
          }
        };

        ws.onclose = () => {
          if (pingRef.current) {
            clearInterval(pingRef.current);
            pingRef.current = null;
          }
          if (closedRef.current) return;

          // exponential backoff with jitter (max ~20s)
          const prev = backoffRef.current || 1000;
          const next = Math.min(prev * 2, 20000);
          backoffRef.current = next;
          const jitter = Math.floor(Math.random() * 1000);
          reconnectRef.current = window.setTimeout(connect, next + jitter);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch {
        if (closedRef.current) return;
        // ticket failed; retry with capped backoff
        const prev = backoffRef.current || 1000;
        const next = Math.min(prev * 2, 20000);
        backoffRef.current = next;
        const jitter = Math.floor(Math.random() * 1000);
        reconnectRef.current = window.setTimeout(connect, next + jitter);
      }
    };

    connect();

    return () => {
      closedRef.current = true;
      if (pingRef.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [siteId, range]);

  return { data, liveCount, liveCities };
}
