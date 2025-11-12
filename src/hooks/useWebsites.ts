// src/hooks/useDashboardData.ts
import { useQuery } from "@tanstack/react-query";
import { getTrackingWebsites } from "@/services/dashboardService";

export function useTrackingWebsites() {
  return useQuery({
    queryKey: ["tracking-websites"],
    queryFn: getTrackingWebsites,
    staleTime: 5 * 60 * 1000,
  });
}
