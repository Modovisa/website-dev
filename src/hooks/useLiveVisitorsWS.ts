import { useEffect, useRef } from 'react';

type Options = {
  siteId?: number | string;
  onLiveCount?: (n: number) => void;
  onDashboardSnapshot?: (payload: any) => void; // you can narrow if needed
  getTicket?: (siteId: number | string) => Promise<string>; // fetch ws ticket
};

export function useLiveVisitorsWS({ siteId, onLiveCount, onDashboardSnapshot, getTicket }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<any>(null);

  useEffect(() => {
    if (!siteId || !getTicket) return;

    let cancelled = false;

    (async () => {
      try {
        const ticket = await getTicket(siteId);
        if (cancelled) return;

        const url = `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`;
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          pingRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
          }, 25_000);
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (!msg) return;

            if (msg.type === 'live_visitor_update') {
              const n = Number(msg?.payload?.count) || 0;
              onLiveCount?.(n);
            }

            if (msg.type === 'dashboard_analytics') {
              onDashboardSnapshot?.(msg.payload);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (pingRef.current) clearInterval(pingRef.current);
        };
      } catch (e) {
        // silently ignore; page still shows HTTP metrics
      }
    })();

    return () => {
      cancelled = true;
      if (pingRef.current) clearInterval(pingRef.current);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [siteId, getTicket, onLiveCount, onDashboardSnapshot]);
}
