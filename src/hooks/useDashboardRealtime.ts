// src/hooks/useDashboardRealtime.ts
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

  /** Bumps on any analytics change (snapshot or frame) */
  analyticsVersion: number;

  /** 🔑 Bumps on WS frames only – use as React `key` to re-mount charts for animation */
  frameKey: number;

  refreshSnapshot: () => void;
  reconnectWS: () => void;
  restart: () => void;
};

// shallow merge that prefers new arrays/values from the frame
function mergeFrames(base: DashboardPayload | null, frame: Partial<DashboardPayload>): DashboardPayload {
  if (!base) return frame as DashboardPayload;
  return { ...base, ...frame, range: base.range };
}

export function useDashboardRealtime(siteId: number | null, range: RangeKey): ReturnShape {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveCities, setLiveCities] = useState<GeoCityPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [analyticsVersion, setAnalyticsVersion] = useState<number>(0);
  const [frameKey, setFrameKey] = useState<number>(0);

  const selectedRangeRef = useRef<RangeKey>(range);
  const siteRef = useRef<number | null>(siteId);

  useEffect(() => { selectedRangeRef.current = range; }, [range]);
  useEffect(() => { siteRef.current = siteId; }, [siteId]);

  const onSnapshot = useCallback((payload: DashboardPayload) => {
    if (payload?.range && payload.range !== selectedRangeRef.current) return;
    setData(payload);
    setIsLoading(false);
    setError(null);
    setAnalyticsVersion(v => v + 1);
    // snapshot does NOT bump frameKey (animations are driven by WS frames)
  }, []);

  const onFrame = useCallback((frame: Partial<DashboardPayload>) => {
    if ((frame as any)?.range && (frame as any).range !== selectedRangeRef.current) return;
    setData(prev => mergeFrames(prev, frame));
    setIsLoading(false);
    setAnalyticsVersion(v => v + 1);
    // handled via separate 'tick' to ensure a bump only when WS frames arrive
  }, []);

  const onFrameTick = useCallback((_p: { ts: number }) => {
    setFrameKey(k => k + 1);
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

  // Subscribe once per mount
  useEffect(() => {
    const offSnapshot = mvBus.on<DashboardPayload>("mv:dashboard:snapshot", onSnapshot);
    const offFrame = mvBus.on<Partial<DashboardPayload>>("mv:dashboard:frame", onFrame);
    const offTick = mvBus.on<{ ts: number }>("mv:dashboard:tick", onFrameTick);
    const offCities = mvBus.on<{ points: GeoCityPoint[]; total: number }>("mv:live:cities", onLiveCities);
    const offCount = mvBus.on<{ count: number }>("mv:live:count", onLiveCount);
    const offErr = mvBus.on<{ message: string }>("mv:error", onError);

    return () => {
      offSnapshot();
      offFrame();
      offTick();
      offCities();
      offCount();
      offErr();
    };
  }, [onSnapshot, onFrame, onFrameTick, onLiveCities, onLiveCount, onError]);

  // Reset loading and keys when site/range changes
  useEffect(() => {
    setIsLoading(true);
    setData(null);
    setLiveCities([]);
    setFrameKey(0);
    setAnalyticsVersion(0);
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
    frameKey,
    refreshSnapshot,
    reconnectWS,
    restart,
  };
}
