// src/hooks/useLiveVisitorsWS.ts

import { useEffect, useRef } from "react";
import type { DashboardPayload } from "@/types/dashboard";

type Opts = {
  siteId?: number;
  onLiveCount?: (n: number) => void;
  onDashboardSnapshot?: (payload: DashboardPayload) => void;
  getTicket: (siteId: number) => Promise<string>;
};

export function useLiveVisitorsWS({
  siteId,
  onLiveCount,
  onDashboardSnapshot,
  getTicket,
}: Opts) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const activeSite = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!siteId) return;

    activeSite.current = siteId;

    let closed = false;

    async function connect() {
      try {
        const ticket = await getTicket(siteId);
        if (closed) return;

        // close any previous
        try {
          wsRef.current?.close();
        } catch {}
        if (pingRef.current) window.clearInterval(pingRef.current);

        const ws = new WebSocket(
          `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(
            ticket
          )}`
        );
        wsRef.current = ws;

        ws.onopen = () => {
          // Ping keepalive
          pingRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 25000);
        };

        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg?.site_id?.toString() !== activeSite.current?.toString())
              return;

            if (msg.type === "live_visitor_update") {
              const n = Number(msg.payload?.count) || 0;
              onLiveCount?.(n);
            }
            if (msg.type === "live_visitor_location_grouped") {
              const total = (msg.payload || []).reduce(
                (s: number, v: any) => s + (Number(v.count) || 0),
                0
              );
              onLiveCount?.(total);
            }
            if (msg.type === "dashboard_analytics" && msg.payload) {
              onDashboardSnapshot?.(msg.payload as DashboardPayload);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (closed) return;
          // backoff ~4.5–5.5s
          const jitter = 500 + Math.floor(Math.random() * 500);
          setTimeout(connect, 4000 + jitter);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch {
        // retry ticket
        setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      closed = true;
      try {
        wsRef.current?.close();
      } catch {}
      if (pingRef.current) window.clearInterval(pingRef.current);
    };
  }, [siteId, getTicket, onLiveCount, onDashboardSnapshot]);
}
