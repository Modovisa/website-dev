// src/services/dashboardService.ts
import { http, HttpError } from "./http";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

/* ---------- Websites (keep as-is REST) ---------- */
export type TrackingWebsite = { id: number; website_name: string; domain: string };
type TrackingWebsitesAPI = { projects: Array<{ id: number; website_name?: string; name?: string; domain?: string }> };

export async function getTrackingWebsites(): Promise<TrackingWebsite[]> {
  const j = await http<TrackingWebsitesAPI>("/api/tracking-websites", { method: "POST" });
  return (j.projects || []).map((p) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));
}

/* ---------- WS ticket (dedupe + backoff) ---------- */
type WSTicketAPI = { ticket: string };

const inflightTickets = new Map<number, Promise<string>>();
const lastTicketAt = new Map<number, number>();

export async function getWSTicket(siteId: number): Promise<string> {
  const now = Date.now();
  const last = lastTicketAt.get(siteId) ?? 0;
  if (now - last < 5000) {
    const existing = inflightTickets.get(siteId);
    if (existing) return existing;
  }

  const p = (async () => {
    try {
      const res = await fetch("https://api.modovisa.com/api/ws-ticket", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });

      if (res.status === 429) {
        const ra = Number(res.headers.get("retry-after") || "10");
        await new Promise((r) => setTimeout(r, Math.max(3, ra) * 1000));
        throw new HttpError(429, "Too Many Requests");
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpError(res.status, `ticket failed ${res.status}`, body);
      }

      const j = (await res.json()) as WSTicketAPI;
      if (!j?.ticket) throw new Error("no_ticket");
      return j.ticket;
    } finally {
      lastTicketAt.set(siteId, Date.now());
      inflightTickets.delete(siteId);
    }
  })();

  inflightTickets.set(siteId, p);
  return p;
}

export type GeoCityPoint = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  debug_ids?: string[];
};
