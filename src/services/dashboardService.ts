// src/services/dashboardService.ts

import { http } from "./http";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

export async function getDashboardData(params: {
  siteId: number;
  range: RangeKey;
}): Promise<DashboardPayload> {
  const tzOffset = new Date().getTimezoneOffset();
  return http<DashboardPayload>(
    `/api/user-dashboard-analytics?range=${params.range}&tz_offset=${tzOffset}&site_id=${params.siteId}`,
    { method: "GET", timeoutMs: 25_000 }
  );
}

/* ---------- Tracking websites ---------- */
export type TrackingWebsite = { id: number; website_name: string; domain: string };

type TrackingWebsitesAPI = {
  projects: Array<{ id: number; website_name?: string; name?: string; domain?: string }>;
};

export async function getTrackingWebsites(): Promise<TrackingWebsite[]> {
  const j = await http<TrackingWebsitesAPI>("/api/tracking-websites", { method: "POST" });
  return (j.projects || []).map((p) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));
}

/* ---------- WS ticket ---------- */
type WSTicketAPI = { ticket: string };

export async function getWSTicket(siteId: number): Promise<string> {
  const j = await http<WSTicketAPI>("/api/ws-ticket", {
    method: "POST",
    body: JSON.stringify({ site_id: siteId }),
  });
  return j.ticket;
}
