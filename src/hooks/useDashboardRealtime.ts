// src/hooks/useDashboardRealtime.ts
// Listener-only hook that subscribes to mvBus events emitted by the
// consolidated realtime-dashboard-service and exposes a React-friendly API.
// It does NOT open sockets. Your page should boot the service (rtInit/rtSetSite/rtSetRange).

import { useCallback, useEffect, useRef, useState } from "react";
import { mvBus } from "@/lib/mvBus";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";
import type { GeoCityPoint } from "@/services/realtime-dashboard-service";
import {
  fetchSnapshot as svcFetchSnapshot,
  reconnectWebSocket as svcReconnectWS,
} from "@/services/realtime-dashboard-service";

type ReturnShape = {
  data: DashboardPayload | null;
  liveCount: number | null;
  liveCities: GeoCityPoint[];
  isLoading: boolean;
  error: string | null;
  analyticsVersion: number;
  refreshSnapshot: () => void;
  reconnectWS: () => void;
  restart: () => void;
};

// shallow merge that prefers new arrays/values from the frame
function mergeFrames(base: DashboardPayload | null, frame: Partial<DashboardPayload>): DashboardPayload {
  if (!base) return frame as DashboardPayload;
  return {
    ...base,
    ...frame,
    // ensure range stays what the UI selected
    range: base.range,
  };
}

export function useDashboardRealtime(siteId: number | null, range: RangeKey): ReturnShape {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [analyticsVersion, setAnalyticsVersion] = useState<number>(0);

  const selectedRangeRef = useRef<RangeKey>(range);
  const siteRef = useRef<number | null>(siteId);

  useEffect(() => { selectedRangeRef.current = range; }, [range]);
  useEffect(() => { siteRef.current = siteId; }, [siteId]);

  // Handlers
  const onSnapshot = useCallback((payload: DashboardPayload) => {
    if (payload?.range && payload.range !== selectedRangeRef.current) return;
    setData(payload);
    setIsLoading(false);
    setError(null);
    setAnalyticsVersion((v) => v + 1);
  }, []);

  const onFrame = useCallback((frame: Partial<DashboardPayload>) => {
    if ((frame as any)?.range && (frame as any).range !== selectedRangeRef.current) return;
    setData((prev) => mergeFrames(prev, frame));
    setIsLoading(false);
    setAnalyticsVersion((v) => v + 1);
  }, []);

  const onLiveCities = useCallback((p: { points: GeoCityPoint[]; total: number }) => {
    setLiveCities(Array.isArray(p?.points) ? p.points : []);
    if (typeof p?.total === "number") setLiveCount(p.total);
  }, []);

  const onLiveCount = useCallback((p: { count: number }) => {
    setLiveCount(Number(p?.count) || 0);
  }, []);

  const onError = useCallback((e: { message: string }) => {
    setError(String(e?.message || "error"));
  }, []);

  // Subscribe to mvBus once per mount
  useEffect(() => {
    const offSnapshot = mvBus.on<DashboardPayload>("mv:dashboard:snapshot", onSnapshot);
    const offFrame = mvBus.on<Partial<DashboardPayload>>("mv:dashboard:frame", onFrame);
    const offCities = mvBus.on<{ points: GeoCityPoint[]; total: number }>("mv:live:cities", onLiveCities);
    const offCount = mvBus.on<{ count: number }>("mv:live:count", onLiveCount);
    const offErr = mvBus.on<{ message: string }>("mv:error", onError);

    return () => {
      offSnapshot();
      offFrame();
      offCities();
      offCount();
      offErr();
    };
  }, [onSnapshot, onFrame, onLiveCities, onLiveCount, onError]);

  // Reset loading when site or range changes (Dashboard skeletons use this)
  useEffect(() => {
    setIsLoading(true);
    setData(null);
    setLiveCities([]);
  }, [siteId, range]);

  const refreshSnapshot = useCallback(() => {
    svcFetchSnapshot().catch(() => {});
  }, []);

  const reconnectWS = useCallback(() => {
    svcReconnectWS().catch(() => {});
  }, []);

  const restart = useCallback(() => {
    svcReconnectWS().catch(() => {});
    svcFetchSnapshot().catch(() => {});
  }, []);

  return {
    data,
    liveCount,
    liveCities,
    isLoading,
    error,
    analyticsVersion,
    refreshSnapshot,
    reconnectWS,
    restart,
  };
}
