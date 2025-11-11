// src/hooks/useGeoEvents.ts

import { useQuery } from "@tanstack/react-query";
import { getGeoEvents, type GeoCityPoint } from "@/services/dashboardService";

export function useGeoEvents(siteId?: number) {
  return useQuery<GeoCityPoint[]>({
    queryKey: ["geo-events", siteId],
    enabled: !!siteId,
    queryFn: () => getGeoEvents(siteId!),
    staleTime: 60_000, // cache a minute
  });
}
