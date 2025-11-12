// src/services/dashboardService.ts

// Single source of truth for dashboard REST + WS ticket
// - Ticket caching + dedupe + Retry-After aware
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

/* ---------- Errors ---------- */
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

/* ---------- WS Ticket: cache + dedupe + 429-aware ---------- */
const inflight = new Map<number, Promise<string>>();
const ticketCache = new Map<number, { ticket: string; exp: number }>(); // per siteId
let globalGateUntil = 0; // 429 Retry-After gate for ALL tickets

const TICKET_TTL_MS = 60_000;     // reuse a ticket for 60s (adjust to your server validity)
const MIN_TICKET_MS = 1500;       // fast dedupe window for repeat calls
const lastTicketAt = new Map<number, number>();

export async function getWSTicket(siteId: number, opts?: { force?: boolean }): Promise<string> {
  const now = Date.now();

  // Global 429 gate
  if (now < globalGateUntil) {
    const wait = Math.max(0, globalGateUntil - now);
    console.warn(`[WS] Ticket gated by 429. Waiting ${wait}ms (site ${siteId}).`);
    throw new HttpError(429, "too_many_requests_gated");
  }

  // Per-site cached ticket
  const cached = ticketCache.get(siteId);
  if (!opts?.force && cached && cached.exp > now) {
    console.debug(`[WS] Reusing cached ticket (site ${siteId}, ttl ${cached.exp - now}ms).`);
    return cached.ticket;
  }

  // Dedupe: if a recent request is still inflight or MIN_TICKET_MS since last
  const last = lastTicketAt.get(siteId) ?? 0;
  if (!opts?.force && now - last < MIN_TICKET_MS) {
    const existing = inflight.get(siteId);
    if (existing) return existing;
  }

  const p = (async () => {
    try {
      console.debug(`[WS] Fetching new ticket (site ${siteId})...`);
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
        const waitSec = Number.isFinite(ra) ? Math.max(3, ra) : 10;
        globalGateUntil = Date.now() + waitSec * 1000;
        console.warn(`[WS] /ws-ticket 429. Gating all ticket requests for ~${waitSec}s.`);
        throw new HttpError(429, "too_many_requests");
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpError(res.status, `ticket_failed_${res.status}`, body);
      }

      const j = (await res.json()) as WSTicketAPI;
      if (!j?.ticket) throw new HttpError(500, "no_ticket");

      // Cache ticket
      const exp = Date.now() + TICKET_TTL_MS;
      ticketCache.set(siteId, { ticket: j.ticket, exp });
      console.debug(`[WS] Ticket OK (site ${siteId}); cached for ${TICKET_TTL_MS}ms.`);
      return j.ticket;
    } finally {
      lastTicketAt.set(siteId, Date.now());
      inflight.delete(siteId);
    }
  })();

  inflight.set(siteId, p);
  return p;
}
