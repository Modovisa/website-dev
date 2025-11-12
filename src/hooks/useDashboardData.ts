// src/hooks/useDashboardData.ts

import { useQuery } from "@tanstack/react-query";
import type { RangeKey } from "@/types/dashboard";
import { getDashboardData, getTrackingWebsites } from "@/services/dashboardService";

export function useDashboardData({ siteId, range }: { siteId?: number; range: RangeKey }) {
  return useQuery({
    queryKey: ["dashboard", siteId, range],
    enabled: !!siteId,
    queryFn: () => getDashboardData({ siteId: siteId!, range }),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}

export function useTrackingWebsites() {
  return useQuery({
    queryKey: ["tracking-websites"],
    queryFn: getTrackingWebsites,
    staleTime: 5 * 60 * 1000,
  });
}
