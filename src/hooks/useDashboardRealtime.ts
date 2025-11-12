// src/hooks/useDashboardRealtime.ts
import { useEffect, useRef, useState } from "react";
import { getWSTicket, type GeoCityPoint } from "@/services/dashboardService";

export type WSStatus = "idle" | "connecting" | "open" | "handshake-timeout" | "closed" | "error";
type DashboardPayload = any;
type LivePoint = { name: string; value: [number, number, number]; debug_ids?: string[] };

// Enable console logs with: localStorage.setItem('mv.debug','1')
const DEBUG = typeof window !== "undefined" && localStorage.getItem("mv.debug") === "1";
const log  = (...a: any[]) => { if (DEBUG) console.log("[ws]", ...a); };
const warn = (...a: any[]) => { if (DEBUG) console.warn("[ws]", ...a); };
const err  = (...a: any[]) => { console.error("[ws]", ...a); };

function wsUrl(path: string) {
  const h = "api.modovisa.com";
  return `wss://${h}${path}`;
}

export function useDashboardRealtime(siteId?: number, range: string = "24h") {
  const [status, setStatus] = useState<WSStatus>("idle");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]);
  const [livePoints, setLivePoints] = useState<LivePoint[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<number | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const backoffMs = useRef<number>(2000);
  const openedAt = useRef<number | null>(null);
  const lastFrameAt = useRef<number | null>(null);
  const currentSite = useRef<number | undefined>(siteId);
  const currentRange = useRef<string>(range);
  currentSite.current = siteId;
  currentRange.current = range;

  useEffect(() => {
    if (!siteId) return;
    let closed = false;

    async function connect() {
      try {
        setStatus("connecting");
        setLastError(null);
        openedAt.current = Date.now();
        lastFrameAt.current = null;

        const ticket = await getWSTicket(siteId);
        if (closed) return;

        // close any existing
        try { wsRef.current?.close(); } catch {}
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }

        const ws = new WebSocket(wsUrl(`/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`));
        wsRef.current = ws;

        ws.onopen = () => {
          setStatus("open");
          backoffMs.current = 2000;
          log("WS open");

          // Subscribe to this site + desired range only (server should echo same site_id in frames)
          try { ws.send(JSON.stringify({ type: "dashboard_subscribe", payload: { site_id: siteId, range } })); } catch {}
          try { ws.send(JSON.stringify({ type: "set_dashboard_range", payload: { range } })); } catch {}

          // Heartbeat
          pingRef.current = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try { ws.send(JSON.stringify({ type: "ping" })); } catch {}
            }
          }, 25000);

          // Handshake watchdog: if no dashboard frame within 10s, surface timeout
          window.setTimeout(() => {
            if (!closed && status === "open" && lastFrameAt.current == null) {
              warn("Handshake timeout: no dashboard_analytics frame received.");
              setStatus("handshake-timeout");
            }
          }, 10000);
        };

        ws.onmessage = (ev) => {
          let msg: any;
          try { msg = JSON.parse(ev.data); } catch { return; }

          // site gate
          if (String(msg?.site_id) !== String(currentSite.current)) return;

          // live count (simple)
          if (msg.type === "live_visitor_update") {
            const n = Number(msg?.payload?.count) || 0;
            setLiveCount(n);
            if (DEBUG) log("← live_visitor_update", n);
            return;
          }

          // live, grouped city points
          if (msg.type === "live_visitor_location_grouped") {
            const geo: GeoCityPoint[] = Array.isArray(msg.payload)
              ? msg.payload.map((v: any) => ({
                  city: String(v?.city ?? "Unknown"),
                  country: String(v?.country ?? "Unknown"),
                  lat: Number(v?.lat) || 0,
                  lng: Number(v?.lng) || 0,
                  count: Number(v?.count) || 0,
                  debug_ids: Array.isArray(v?.debug_ids) ? v.debug_ids : undefined,
                }))
              : [];
            setLiveCities(geo);
            setLiveCount(geo.reduce((s, g) => s + (g.count || 0), 0));
            setLivePoints(
              geo.map((g) => ({
                name: `${g.city}, ${g.country}`,
                value: [g.lng, g.lat, g.count],
                debug_ids: g.debug_ids,
              }))
            );
            if (DEBUG) log("← live_visitor_location_grouped", { groups: geo.length });
            return;
          }

          // analytics frame (range-gated)
          if (msg.type === "dashboard_analytics" && msg.payload) {
            const want = String(currentRange.current || "24h");
            const got = String(msg.payload.range || want);
            if (got !== want) {
              if (DEBUG) log("skip analytics (range mismatch)", { got, want });
              return;
            }
            lastFrameAt.current = Date.now();
            setData(sanitize(msg.payload));
            if (DEBUG) log("← dashboard_analytics", {
              tgv: msg.payload?.time_grouped_visits?.length ?? 0,
              pages: msg.payload?.top_pages?.length ?? 0,
            });
            return;
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
          if (closed) { setStatus("closed"); return; }

          setStatus("closed");
          const jitter = Math.floor(Math.random() * 800);
          const delay = Math.min(30000, backoffMs.current + jitter);
          reconnectTimer.current = window.setTimeout(connect, delay) as any;
          backoffMs.current = Math.min(30000, Math.round(backoffMs.current * 1.8));
          warn(`WS closed — reconnecting in ${delay}ms`);
        };
      } catch (e: any) {
        setStatus("error");
        setLastError(e?.message || "ticket_failed");
        const jitter = Math.floor(Math.random() * 800);
        const delay = Math.min(30000, backoffMs.current + jitter);
        reconnectTimer.current = window.setTimeout(connect, delay) as any;
        backoffMs.current = Math.min(30000, Math.round(backoffMs.current * 1.8));
        warn(`Connect failed — retrying in ${delay}ms`, e);
      }
    }

    connect();

    // if range changes while open, nudge (no tear-down)
    const nudgeRange = () => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify({ type: "set_dashboard_range", payload: { range } })); } catch {}
      }
    };
    nudgeRange();

    return () => {
      closed = true;
      try { wsRef.current?.close(); } catch {}
      if (pingRef.current) clearInterval(pingRef.current);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current as any);
    };
  }, [siteId, range]);

  return { status, data, liveCount, liveCities, livePoints, lastError };
}

function sanitize(raw: any): DashboardPayload {
  const s: any = { ...(raw || {}) };
  const arrKeys = [
    "time_grouped_visits","events_timeline","unique_vs_returning",
    "impressions_timeline","impressions_previous_timeline",
    "clicks_timeline","clicks_previous_timeline",
    "conversions_timeline","conversions_previous_timeline",
    "search_visitors_timeline","search_visitors_previous_timeline",
    "unique_visitors_timeline","previous_unique_visitors_timeline",
    "top_pages","referrers","browsers","devices","os",
    "utm_campaigns","utm_sources","countries","calendar_density"
  ];
  for (const k of arrKeys) if (!Array.isArray(s[k])) s[k] = [];
  s.range = String(s.range || "24h");
  return s;
}
