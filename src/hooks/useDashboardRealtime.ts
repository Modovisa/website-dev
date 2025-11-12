// src/hooks/useDashboardRealtime.ts

import { useEffect, useRef, useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import type { GeoCityPoint } from "@/services/dashboardService";
import { API_BASE } from "@/services/http";
import { secureFetch } from "@/lib/auth";

function redirectOn401(res: Response) {
  if (res.status === 401) {
    window.location.replace("/login");
    throw new Error("unauthorized");
  }
}

/**
 * Bootstrap-like model:
 * - Take one REST snapshot (per siteId+range) for first paint.
 * - After that, WebSocket drives live updates.
 * - Ignore WS frames for a different `range`.
 * - No periodic refetch; charts never blank.
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

  // One-time REST snapshot for first paint (per site+range)
  useEffect(() => {
    if (!siteId) return;
    let aborted = false;
    (async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const res = await secureFetch(
          `${API_BASE}/api/user-dashboard-analytics?site_id=${siteId}&range=${range}&tz_offset=${tz}`,
          { method: "GET", credentials: "include" }
        );
        redirectOn401(res);
        if (!res.ok) return;
        const j = (await res.json()) as DashboardPayload;
        if (!aborted) setData(j);
      } catch {
        /* noop: 401 handler above already redirected */
      }
    })();
    return () => { aborted = true; };
  }, [siteId, range]);

  // WebSocket stream (ticket via secureFetch)
  useEffect(() => {
    if (!siteId) return;

    let closed = false;

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

        // 2) open WS
        try { wsRef.current?.close(); } catch {}
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

        const ws = new WebSocket(
          `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
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

          // dashboard analytics stream (range-gated like Bootstrap)
          if (msg.type === "dashboard_analytics" && msg.payload) {
            const want = String(currentRangeRef.current || "24h");
            if (!msg.payload.range || msg.payload.range === want) {
              setData(msg.payload as DashboardPayload);
            }
          }

          // grouped live visitor positions (also compute total)
          if (msg.type === "live_visitor_location_grouped") {
            const incoming: GeoCityPoint[] = Array.isArray(msg.payload)
              ? msg.payload.map((v: any) => ({
                  city: String(v.city ?? "Unknown"),
                  country: String(v.country ?? "Unknown"),
                  lat: Number(v.lat),
                  lng: Number(v.lng),
                  count: Number(v.count) || 0,
                  debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : undefined,
                }))
              : [];
            setLiveCities(incoming);
            const total = incoming.reduce((s, g) => s + (g.count || 0), 0);
            setLiveCount(total);
          }

          // single live count update
          if (msg.type === "live_visitor_update") {
            setLiveCount(Number(msg.payload?.count) || 0);
          }
        };

        ws.onclose = () => {
          if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
          if (!closed) {
            reconnectRef.current = window.setTimeout(
              connect,
              4000 + Math.floor(Math.random() * 1500)
            );
          }
        };

        ws.onerror = () => {
          try { ws.close(); } catch {}
        };
      } catch {
        // retry ticket after a short backoff
        reconnectRef.current = window.setTimeout(() => {
          if (!closed) connect();
        }, 5000);
      }
    };

    connect();

    return () => {
      closed = true;
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      try { wsRef.current?.close(); } catch {}
    };
  }, [siteId, range]);

  return { data, liveCount, liveCities };
}
