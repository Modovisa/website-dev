// src/hooks/useDashboardData.ts

import { useQuery } from "@tanstack/react-query";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";
import { secureFetch } from "@/lib/auth";
import { API_BASE } from "@/services/http";

/** REST snapshot (only if you choose to use it) */
export function useDashboardData({
  siteId,
  range,
}: {
  siteId?: number;
  range: RangeKey;
}) {
  return useQuery({
    queryKey: ["dashboard", siteId, range],
    enabled: !!siteId,
    queryFn: async (): Promise<DashboardPayload> => {
      const tzOffset = new Date().getTimezoneOffset();
      const url = `${API_BASE}/api/user-dashboard-analytics?range=${encodeURIComponent(
        range
      )}&tz_offset=${tzOffset}&site_id=${encodeURIComponent(siteId || 0)}`;

      const res = await secureFetch(url, { credentials: "include" });
      if (res.status === 401) throw new Error("unauthorized");
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      return (await res.json()) as DashboardPayload;
    },
    // If you’re running WS-only, you can leave this unused; no harm keeping it.
    staleTime: 30_000,
  });
}

/** Websites list for the site selector dropdown */
export function useTrackingWebsites() {
  return useQuery({
    queryKey: ["tracking-websites"],
    queryFn: async (): Promise<Array<{ id: number; website_name?: string; name?: string; domain?: string }>> => {
      const res = await secureFetch(`${API_BASE}/api/tracking-websites`, { credentials: "include" });
      if (res.status === 401) throw new Error("unauthorized");
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const json = await res.json().catch(() => ({}));
      // accept either plain array or { websites: [...] }
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.websites)) return json.websites;
      return [];
    },
    staleTime: 60_000,
  });
}
