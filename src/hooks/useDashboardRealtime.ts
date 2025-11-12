// src/hooks/useDashboardRealtime.ts

import { useEffect, useRef, useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import type { GeoCityPoint } from "@/services/dashboardService";
import { API_BASE } from "@/services/http"; // optional, used for base URL
import { secureFetch } from "@/lib/auth";

function redirectOn401(res: Response) {
  if (res.status === 401) {
    // Hard redirect is safest for blank screens
    window.location.replace("/login");
    throw new Error("unauthorized");
  }
}

export function useDashboardRealtime(siteId?: number | string, range: string = "24h") {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectRef = useRef<number | null>(null);

  // initial REST snapshot via secureFetch
  useEffect(() => {
    if (!siteId) return;
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
        setData(j);
      } catch (e) {
        // swallow; auth handler above will redirect on 401
      }
    })();
  }, [siteId, range]);

  // websocket live stream (ticket via secureFetch)
  useEffect(() => {
    if (!siteId) return;

    let closed = false;

    const connect = async () => {
      try {
        // 1) fetch ticket securely
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

          if (msg.type === "dashboard_analytics" && msg.payload) {
            if (msg.payload?.range && msg.payload.range !== range) return;
            setData(msg.payload as DashboardPayload);
          }

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

          if (msg.type === "live_visitor_update") {
            setLiveCount(Number(msg.payload?.count) || 0);
          }
        };

        ws.onclose = () => {
          if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
          if (!closed) {
            reconnectRef.current = window.setTimeout(connect, 4000 + Math.floor(Math.random() * 1500));
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
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      try { wsRef.current?.close(); } catch {}
    };
  }, [siteId, range]);

  // polling safety net via secureFetch (in case WS drops)
  useEffect(() => {
    if (!siteId) return;
    const id = window.setInterval(async () => {
      try {
        const tz = new Date().getTimezoneOffset();
        const r = await secureFetch(
          `${API_BASE}/api/user-dashboard-analytics?site_id=${siteId}&range=${range}&tz_offset=${tz}`,
          { method: "GET", credentials: "include" }
        );
        redirectOn401(r);
        if (!r.ok) return;
        const snap = (await r.json()) as DashboardPayload;
        setData(snap);
      } catch {}
    }, 25000);
    return () => clearInterval(id);
  }, [siteId, range]);

  return { data, liveCount, liveCities };
}
