// src/hooks/useDashboardRealtime.ts

import { useEffect, useRef, useState } from "react";
import type { GeoCityPoint } from "@/services/dashboardService"; // <-- make sure this type is exported from there

type DashboardPayload = any; // matches /api/user-dashboard-analytics
type LivePoint = { name: string; value: [number, number, number]; debug_ids?: string[] };

export function useDashboardRealtime(siteId?: number | string, range: string = "24h") {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [livePoints, setLivePoints] = useState<LivePoint[]>([]);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]); // ✅ add this
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);

  // initial REST snapshot
  useEffect(() => {
    if (!siteId) return;
    const tz = new Date().getTimezoneOffset();
    fetch(`https://api.modovisa.com/api/user-dashboard-analytics?site_id=${siteId}&range=${range}&tz_offset=${tz}`, { credentials: "include" })
      .then(r => r.json())
      .then(setData)
      .catch(console.error);
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
          body: JSON.stringify({ site_id: siteId })
        });
        if (!tRes.ok) throw new Error("ticket failed");
        const { ticket } = await tRes.json();

        const ws = new WebSocket(`wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`);
        wsRef.current = ws;

        ws.onopen = () => {
          pingRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
          }, 25000);
        };

        ws.onmessage = (ev) => {
          let msg: any;
          try { msg = JSON.parse(ev.data); } catch { return; }
          if (String(msg.site_id) !== String(siteId)) return;

          if (msg.type === "dashboard_analytics") {
            if (msg.payload?.range && msg.payload.range !== range) return;
            setData(msg.payload);
          }

          if (msg.type === "live_visitor_location_grouped") {
            // Raw points for WorldMap (GeoCityPoint[])
            const geo: GeoCityPoint[] = (msg.payload || []).map((v: any) => ({
              city: v.city || "Unknown",
              country: v.country || "Unknown",
              lat: Number(v.lat),
              lng: Number(v.lng),
              count: Number(v.count) || 0,
              debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : [],
            }));
            setLiveCities(geo); // ✅ expose raw geo points

            // Optional pre-shaped points for other charts if needed
            const pts: LivePoint[] = geo.map((g) => ({
              name: `${g.city}, ${g.country}`,
              value: [g.lng, g.lat, g.count],
              debug_ids: g.debug_ids,
            }));
            setLivePoints(pts);

            const total = geo.reduce((s, g) => s + (g.count || 0), 0);
            setLiveCount(total);
          }

          if (msg.type === "live_visitor_update") {
            setLiveCount(Number(msg.payload?.count) || 0);
          }
        };

        ws.onclose = () => {
          if (pingRef.current) clearInterval(pingRef.current);
          if (!closed) {
            reconnectRef.current = window.setTimeout(connect, 4000 + Math.floor(Math.random() * 800));
          }
        };

        ws.onerror = () => {
          try { ws.close(); } catch {}
        };
      } catch {
        reconnectRef.current = window.setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      closed = true;
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      try { wsRef.current?.close(); } catch {}
    };
  }, [siteId, range]);

  // polling fallback (kept)
  useEffect(() => {
    if (!siteId) return;
    const id = window.setInterval(async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const r = await fetch(`https://api.modovisa.com/api/user-dashboard-analytics?site_id=${siteId}&range=${range}&tz_offset=${tz}`, { credentials: "include" });
        if (!r.ok) return;
        const snap = await r.json();
        setData(snap);
      } catch {}
    }, 25000);
    return () => clearInterval(id);
  }, [siteId, range]);

  return { data, liveCount, livePoints, liveCities }; // ✅ return it
}
