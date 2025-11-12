// src/hooks/useDashboardRealtime.ts

import { useEffect, useRef, useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import type { GeoCityPoint } from "@/services/dashboardService";

/**
 * Realtime dashboard + live visitors + live city points.
 * - Prefers WS snapshots.
 * - Keeps a polling safety-net.
 * - Aligns live city payload to GeoCityPoint[] for WorldMap.
 */
export function useDashboardRealtime(siteId?: number | string, range: string = "24h") {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);

  // initial REST snapshot (cheap and ensures the page isn't empty before WS)
  useEffect(() => {
    if (!siteId) return;
    const tz = new Date().getTimezoneOffset();
    fetch(
      `https://api.modovisa.com/api/user-dashboard-analytics?site_id=${siteId}&range=${range}&tz_offset=${tz}`,
      { credentials: "include" }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) setData(j as DashboardPayload);
      })
      .catch(() => {});
  }, [siteId, range]);

  // websocket live stream
  useEffect(() => {
    if (!siteId) return;

    let closed = false;

    const connect = async () => {
      try {
        const tRes = await fetch("https://api.modovisa.com/api/ws-ticket", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site_id: siteId }),
        });
        if (!tRes.ok) throw new Error("ticket failed");
        const { ticket } = await tRes.json();

        // Close previous if any
        try {
          wsRef.current?.close();
        } catch {}
        if (pingRef.current) {
          clearInterval(pingRef.current);
          pingRef.current = null;
        }

        const ws = new WebSocket(
          `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
          // ping keepalive
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

          // 1) full dashboard snapshot
          if (msg.type === "dashboard_analytics" && msg.payload) {
            // ignore snapshots from other ranges (if any)
            if (msg.payload?.range && msg.payload.range !== range) return;
            setData(msg.payload as DashboardPayload);
          }

          // 2) live city groups (already in GeoCityPoint shape per BE contract)
          if (msg.type === "live_visitor_location_grouped") {
            const incoming: GeoCityPoint[] = Array.isArray(msg.payload)
              ? (msg.payload as any[]).map((v) => ({
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

          // 3) lightweight live count update
          if (msg.type === "live_visitor_update") {
            setLiveCount(Number(msg.payload?.count) || 0);
          }
        };

        ws.onclose = () => {
          if (pingRef.current) {
            clearInterval(pingRef.current);
            pingRef.current = null;
          }
          if (!closed) {
            // jittered reconnect 4.5–5.5s
            reconnectRef.current = window.setTimeout(connect, 4000 + Math.floor(Math.random() * 1500));
          }
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch {
        // retry ticket fetch in ~5s
        reconnectRef.current = window.setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      closed = true;
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

  // polling safety-net (kept)
  useEffect(() => {
    if (!siteId) return;
    const id = window.setInterval(async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const r = await fetch(
          `https://api.modovisa.com/api/user-dashboard-analytics?site_id=${siteId}&range=${range}&tz_offset=${tz}`,
          { credentials: "include" }
        );
        if (!r.ok) return;
        const snap = (await r.json()) as DashboardPayload;
        setData(snap);
      } catch {}
    }, 25000);

    return () => clearInterval(id);
  }, [siteId, range]);

  return { data, liveCount, liveCities };
}
