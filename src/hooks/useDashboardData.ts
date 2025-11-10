// src/hooks/useDashboardData.ts

import { useQuery } from "@tanstack/react-query";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";
import { secureFetch } from "@/lib/auth";

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
      const url = `https://api.modovisa.com/api/user-dashboard-analytics?range=${range}&tz_offset=${tzOffset}&site_id=${encodeURIComponent(
        siteId || 0
      )}`;
      const res = await secureFetch(url, { credentials: "include" });
      if (res.status === 401) throw new Error("unauthorized");
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      return (await res.json()) as DashboardPayload;
    },
  });
}
