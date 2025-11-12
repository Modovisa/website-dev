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
 * Sanitize ONLY keys present on the incoming patch.
 * (Do not create empty arrays for missing keys — missing = unchanged.)
 */
function sanitizePartial(raw: any): Partial<DashboardPayload> {
  const out: any = {};

  // Always normalize range if present
  if (raw.range !== undefined) out.range = toStringSafe(raw.range || "24h", "24h");

  // Time buckets
  if (raw.time_grouped_visits !== undefined) {
    out.time_grouped_visits = Array.isArray(raw.time_grouped_visits)
      ? raw.time_grouped_visits.map((b: any) => ({
          label: toStringSafe(b?.label),
          visitors: clampNumber(b?.visitors),
          views: clampNumber(b?.views),
        }))
      : [];
  }

  // Generic label-count series
  const seriesKeys = [
    "events_timeline",
    "impressions_timeline",
    "impressions_previous_timeline",
    "clicks_timeline",
    "clicks_previous_timeline",
    "conversions_timeline",
    "conversions_previous_timeline",
    "search_visitors_timeline",
    "search_visitors_previous_timeline",
    "unique_visitors_timeline",
    "previous_unique_visitors_timeline",
  ] as const;

  for (const k of seriesKeys) {
    if (raw[k] !== undefined) {
      out[k] = Array.isArray(raw[k])
        ? raw[k].map((r: any) => ({ label: toStringSafe(r?.label), count: clampNumber(r?.count) }))
        : [];
    }
  }

  // Cards + small objects
  if (raw.unique_visitors !== undefined) {
    const u = raw.unique_visitors || {};
    out.unique_visitors = {
      total: clampNumber(u.total),
      delta: u.delta != null ? Number(u.delta) : undefined,
    };
  }
  if (raw.bounce_rate !== undefined) out.bounce_rate = clampNumber(raw.bounce_rate);
  if (raw.bounce_rate_delta !== undefined) out.bounce_rate_delta = clampNumber(raw.bounce_rate_delta);
  if (raw.avg_duration !== undefined) out.avg_duration = raw.avg_duration; // string or number
  if (raw.avg_duration_delta !== undefined) out.avg_duration_delta = clampNumber(raw.avg_duration_delta);
  if (raw.live_visitors !== undefined) out.live_visitors = clampNumber(raw.live_visitors);

  // Tables / lists
  if (raw.top_pages !== undefined) {
    out.top_pages = Array.isArray(raw.top_pages)
      ? raw.top_pages.map((p: any) => ({ url: toStringSafe(p?.url, "/"), views: clampNumber(p?.views) }))
      : [];
  }
  if (raw.referrers !== undefined) {
    out.referrers = Array.isArray(raw.referrers)
      ? raw.referrers.map((r: any) => ({ domain: toStringSafe(r?.domain), visitors: clampNumber(r?.visitors) }))
      : [];
  }
  if (raw.utm_campaigns !== undefined) {
    out.utm_campaigns = Array.isArray(raw.utm_campaigns)
      ? raw.utm_campaigns.map((r: any) => ({ url: toStringSafe(r?.url, "/"), visitors: clampNumber(r?.visitors) }))
      : [];
  }
  if (raw.utm_sources !== undefined) {
    out.utm_sources = Array.isArray(raw.utm_sources)
      ? raw.utm_sources.map((r: any) => ({ source: toStringSafe(r?.source), visitors: clampNumber(r?.visitors) }))
      : [];
  }
  if (raw.browsers !== undefined) out.browsers = Array.isArray(raw.browsers) ? raw.browsers : [];
  if (raw.devices !== undefined) out.devices = Array.isArray(raw.devices) ? raw.devices : [];
  if (raw.os !== undefined) out.os = Array.isArray(raw.os) ? raw.os : [];
  if (raw.countries !== undefined) out.countries = Array.isArray(raw.countries) ? raw.countries : [];
  if (raw.calendar_density !== undefined) out.calendar_density = Array.isArray(raw.calendar_density) ? raw.calendar_density : [];
  if (raw.page_flow !== undefined) out.page_flow = raw.page_flow;

  return out as Partial<DashboardPayload>;
}

/** Shallow merge: only overwrite keys present in the patch. */
function mergePartial<T extends object>(base: T | null, patch: Partial<T>): T {
  return { ...(base || {} as T), ...patch };
}

/* --------------------------- main hook --------------------------- */

/**
 * WS-only model:
 * 1) Connect WS with ticket.
 * 2) Each dashboard_analytics frame is a PATCH onto the last snapshot.
 * 3) Ignore frames for a different `range`.
 * 4) live_visitor_location_grouped drives liveCities + liveCount.
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

  // Reset snapshot when site/range changes (skeleton → wait for WS)
  useEffect(() => {
    setData(null);
    setLiveCities([]);
    setLiveCount(0);
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
        try { wsRef.current?.close(); } catch {}
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

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
          try { msg = JSON.parse(ev.data); } catch { return; }
          if (String(msg.site_id) !== String(siteId)) return;

          // Dashboard analytics stream (range-gated, PATCH)
          if (msg.type === "dashboard_analytics" && msg.payload) {
            const want = String(currentRangeRef.current || "24h");
            const got = toStringSafe(msg.payload.range || want, want);
            if (got !== want) return;

            const patch = sanitizePartial(msg.payload);
            setData((prev) => mergePartial(prev, patch));
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
          if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
          if (closedRef.current) return;

          // exponential backoff with jitter (max ~20s)
          const prev = backoffRef.current || 1000;
          const next = Math.min(prev * 2, 20000);
          backoffRef.current = next;
          const jitter = Math.floor(Math.random() * 1000);
          reconnectRef.current = window.setTimeout(connect, next + jitter);
        };

        ws.onerror = () => {
          try { ws.close(); } catch {}
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
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      try { wsRef.current?.close(); } catch {}
    };
  }, [siteId, range]);

  return { data, liveCount, liveCities };
}
