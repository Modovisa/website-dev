// src/hooks/useDashboardRealtime.ts
import { useEffect, useRef, useState } from "react";

type DashboardPayload = any; // shape matches /api/user-dashboard-analytics
type LivePoint = { name: string; value: [number, number, number]; debug_ids?: string[] };

export function useDashboardRealtime(siteId?: number | string, range: string = "24h") {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [livePoints, setLivePoints] = useState<LivePoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);

  // initial REST snapshot (and whenever site/range changes)
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
          // keep-alive
          pingRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
          }, 25000);
        };

        ws.onmessage = (ev) => {
          let msg: any;
          try { msg = JSON.parse(ev.data); } catch { return; }
          if (String(msg.site_id) !== String(siteId)) return;

          if (msg.type === "dashboard_analytics") {
            // ignore snapshots for other ranges
            if (msg.payload?.range && msg.payload.range !== range) return;
            setData(msg.payload);
          }

          if (msg.type === "live_visitor_location_grouped") {
            const pts: LivePoint[] = (msg.payload || []).map((v: any) => ({
              name: `${v.city || "Unknown"}, ${v.country || "Unknown"}`,
              value: [v.lng, v.lat, v.count],
              debug_ids: Array.isArray(v.debug_ids) ? v.debug_ids : []
            }));
            setLivePoints(pts);
            const total = (msg.payload || []).reduce((s: number, v: any) => s + (Number(v.count) || 0), 0);
            setLiveCount(total);
          }

          if (msg.type === "live_visitor_update") {
            setLiveCount(Number(msg.payload?.count) || 0);
          }
        };

        ws.onclose = () => {
          if (pingRef.current) clearInterval(pingRef.current);
          if (!closed) {
            // jittered reconnect
            reconnectRef.current = window.setTimeout(connect, 4000 + Math.floor(Math.random() * 800));
          }
        };

        ws.onerror = () => {
          try { ws.close(); } catch {}
        };
      } catch (e) {
        // failed to get ticket; backoff
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

  return { data, liveCount, livePoints };
}
