// src/services/dashboardService.ts
// Single source of truth for dashboard REST + WS ticket
// - No dependency on src/lib/api (build-safe)
// - Dedupe + throttle WS ticket requests
// - Friendly HttpError + Unauthorized handling

import { secureFetch } from "@/lib/auth";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

/* ---------- Types ---------- */
export type TrackingWebsite = { id: number; website_name: string; domain: string };
type TrackingWebsitesAPI = {
  projects: Array<{ id: number; website_name?: string; name?: string; domain?: string }>;
};

type WSTicketAPI = { ticket: string };

export type GeoCityPoint = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  debug_ids?: string[];
};

/* ---------- Small error class ---------- */
export class HttpError extends Error {
  status: number;
  body?: string;
  constructor(status: number, message: string, body?: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}
export class UnauthorizedError extends HttpError {
  constructor(body?: string) {
    super(401, "unauthorized", body);
  }
}

/* ---------- REST: tracking websites ---------- */
export async function getTrackingWebsites(): Promise<TrackingWebsite[]> {
  const res = await secureFetch("https://api.modovisa.com/api/tracking-websites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new HttpError(res.status, "failed_tracking_websites", await res.text().catch(() => ""));

  const j = (await res.json()) as TrackingWebsitesAPI;
  return (j.projects || []).map((p) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));
}

/* ---------- REST: dashboard snapshot ---------- */
export async function getDashboardSnapshot(args: {
  siteId: number;
  range: RangeKey;
  tzOffset?: number;
}): Promise<DashboardPayload> {
  const tz = Number.isFinite(args.tzOffset) ? String(args.tzOffset) : String(new Date().getTimezoneOffset());
  const url =
    `https://api.modovisa.com/api/user-dashboard-analytics` +
    `?range=${encodeURIComponent(args.range)}` +
    `&tz_offset=${encodeURIComponent(tz)}` +
    `&site_id=${encodeURIComponent(args.siteId)}`;

  const res = await secureFetch(url, { method: "GET" });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) throw new HttpError(res.status, "failed_dashboard_snapshot", await res.text().catch(() => ""));

  return (await res.json()) as DashboardPayload;
}

/* ---------- WS ticket (dedupe + throttle + 429 backoff) ---------- */
const inflightTickets = new Map<number, Promise<string>>();
const lastTicketAt = new Map<number, number>();
const MIN_TICKET_MS = 1500;

export async function getWSTicket(siteId: number): Promise<string> {
  const now = Date.now();
  const last = lastTicketAt.get(siteId) ?? 0;

  if (now - last < MIN_TICKET_MS) {
    const existing = inflightTickets.get(siteId);
    if (existing) return existing;
  }

  const p = (async () => {
    try {
      const res = await secureFetch("https://api.modovisa.com/api/ws-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });

      if (res.status === 401) {
        throw new UnauthorizedError(await res.text().catch(() => ""));
      }

      if (res.status === 429) {
        const ra = Number(res.headers.get("retry-after") || "10");
        const wait = Math.max(3, ra) * 1000;
        await new Promise((r) => setTimeout(r, wait));
        throw new HttpError(429, "too_many_requests");
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpError(res.status, `ticket_failed_${res.status}`, body);
      }

      const j = (await res.json()) as WSTicketAPI;
      if (!j?.ticket) throw new HttpError(500, "no_ticket");
      return j.ticket;
    } finally {
      lastTicketAt.set(siteId, Date.now());
      inflightTickets.delete(siteId);
    }
  })();

  inflightTickets.set(siteId, p);
  return p;
}
