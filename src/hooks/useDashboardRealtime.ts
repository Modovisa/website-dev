// src/hooks/useDashboardRealtime.ts
import { useEffect, useMemo, useState } from "react";
import { mvBus } from "@/lib/mvBus";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";
import { initDashboardCompat, setCompatRange, setCompatSite, primeSnapshot, connectWS } from "@/compat/bootstrap-bridge";

type GeoCityPoint = {
  city: string; country: string; lat: number; lng: number; count: number; debug_ids?: string[];
};

type State = {
  data: DashboardPayload | null;
  liveCities: GeoCityPoint[];
  liveCount: number | null;
  error: string | null;
};

export function useDashboardRealtime(siteId: number | null, range: RangeKey) {
  const [state, setState] = useState<State>({
    data: null, liveCities: [], liveCount: null, error: null,
  });
  const [analyticsVersion, setAnalyticsVersion] = useState(0);

  // only show skeletons until first snapshot lands
  const hasData = !!state.data;

  useEffect(() => {
    // initialize compat once and set current range
    initDashboardCompat(range).catch(() => {});
    setCompatRange(range);
  }, []); // once

  useEffect(() => { setCompatRange(range); primeSnapshot().catch(() => {}); }, [range]);

  useEffect(() => {
    if (siteId) setCompatSite(siteId).catch(() => {});
  }, [siteId]);

  useEffect(() => {
    const offSnapshot = mvBus.on<DashboardPayload>("mv:dashboard:snapshot", (payload) => {
      setState((s) => ({ ...s, data: payload, error: null }));
      setAnalyticsVersion((v) => v + 1);
    });

    const offFrame = mvBus.on<DashboardPayload>("mv:dashboard:frame", (incoming) => {
      setState((s) => {
        const merged: DashboardPayload = {
          ...(s.data || {}),
          ...incoming,
          // Preserve arrays that might not be in every frame
          time_grouped_visits: incoming.time_grouped_visits ?? s.data?.time_grouped_visits,
          unique_vs_returning: incoming.unique_vs_returning ?? s.data?.unique_vs_returning,
          funnel: incoming.funnel ?? s.data?.funnel,
          referrers: incoming.referrers ?? s.data?.referrers,
          browsers: incoming.browsers ?? s.data?.browsers,
          devices: incoming.devices ?? s.data?.devices,
          os: incoming.os ?? s.data?.os,
          countries: incoming.countries ?? s.data?.countries,
          events_timeline: incoming.events_timeline ?? s.data?.events_timeline,
          utm_campaigns: incoming.utm_campaigns ?? s.data?.utm_campaigns,
          utm_sources: incoming.utm_sources ?? s.data?.utm_sources,
          calendar_density: incoming.calendar_density ?? s.data?.calendar_density,
          top_pages: incoming.top_pages ?? s.data?.top_pages,
          page_flow: incoming.page_flow ?? s.data?.page_flow,
        } as DashboardPayload;
        return { ...s, data: merged, error: null };
      });
      setAnalyticsVersion((v) => v + 1);
    });

    const offCities = mvBus.on<{ points: GeoCityPoint[]; total: number }>("mv:live:cities", ({ points, total }) => {
      setState((s) => ({ ...s, liveCities: points, liveCount: total }));
    });

    const offCount = mvBus.on<{ count: number }>("mv:live:count", ({ count }) => {
      setState((s) => ({ ...s, liveCount: count }));
    });

    const offErr = mvBus.on<{ message: string }>("mv:error", ({ message }) => {
      setState((s) => ({ ...s, error: message || "error" }));
    });

    return () => {
      offSnapshot(); offFrame(); offCities(); offCount(); offErr();
    };
  }, []);

  const refreshSnapshot = () => { primeSnapshot().catch(() => {}); };
  const reconnectWS = () => { connectWS(true).catch(() => {}); };
  const restart = () => { primeSnapshot().catch(() => {}); connectWS(true).catch(() => {}); };

  return {
    data: state.data,
    liveCities: state.liveCities,
    liveCount: state.liveCount,
    error: state.error,
    isLoading: !hasData,
    analyticsVersion,
    refreshSnapshot,
    reconnectWS,
    restart,
  };
}