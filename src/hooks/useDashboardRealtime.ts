// src/hooks/useDashboardRealtime.ts
import { useEffect, useState, useRef } from "react";
import { mvBus } from "@/lib/mvBus";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";
import * as DashboardService from "@/services/realtime-dashboard-service";

type GeoCityPoint = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  debug_ids?: string[];
};

type State = {
  data: DashboardPayload | null;
  liveCities: GeoCityPoint[];
  liveCount: number | null;
  error: string | null;
};

export function useDashboardRealtime(siteId: number | null, range: RangeKey) {
  const [state, setState] = useState<State>({
    data: null,
    liveCities: [],
    liveCount: null,
    error: null,
  });
  const [analyticsVersion, setAnalyticsVersion] = useState(0);
  
  const isFirstMount = useRef(true);
  const initialRange = useRef(range);
  const initialSite = useRef(siteId);

  useEffect(() => {
    console.log("🎬 [Hook] Initializing dashboard service");
    DashboardService.initialize(range).catch((e) => {
      console.error("❌ [Hook] Initialization failed:", e);
    });

    return () => {
      console.log("🎬 [Hook] Cleaning up dashboard service");
      DashboardService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (isFirstMount.current && range === initialRange.current) return;
    
    console.log("🎯 [Hook] Range changed to:", range);
    DashboardService.setRange(range);
    DashboardService.fetchSnapshot().catch(() => {});
  }, [range]);

  useEffect(() => {
    if (isFirstMount.current && siteId === initialSite.current) {
      isFirstMount.current = false;
      return;
    }
    
    if (siteId) {
      console.log("🌐 [Hook] Site changed to:", siteId);
      DashboardService.setSite(siteId).catch(() => {});
    }
  }, [siteId]);

  useEffect(() => {
    console.log("📡 [Hook] Subscribing to mvBus events for range:", range);

    const offSnapshot = mvBus.on<DashboardPayload>(
      "mv:dashboard:snapshot",
      (payload) => {
        console.log("📊 [Hook] Received snapshot event, updating state");
        if (payload.time_grouped_visits) {
          console.log("📊 [Hook] Snapshot data points:", payload.time_grouped_visits.length, "range:", payload.range);
        }
        setState((s) => ({ ...s, data: payload, error: null }));
        setAnalyticsVersion((v) => v + 1);
      }
    );

    const offFrame = mvBus.on<DashboardPayload>(
      "mv:dashboard:frame",
      (incoming) => {
        console.log("📊 [Hook] Received frame event for range:", range);
        
        if (incoming.time_grouped_visits) {
          console.log("📊 [Hook] WebSocket data points:", incoming.time_grouped_visits.length, "backend range:", incoming.range);
        }
        
        if (incoming.range && incoming.range !== range) {
          console.warn(`⚠️ [Hook] Range mismatch! Backend sent "${incoming.range}" but we want "${range}"`);
          setState((s) => ({
            ...s,
            data: {
              ...s.data!,
              live_visitors: incoming.live_visitors ?? s.data?.live_visitors,
            } as DashboardPayload,
          }));
          console.log("📊 [Hook] Updated live_visitors only, rejected all other data");
          return;
        }
        
        console.log(`✅ [Hook] Range matches - accepting all data for range "${range}"`);
        
        setState((s) => {
          // CRITICAL FIX: Clone arrays to create new references
          // This forces Chart.js to see data as changed even if values are same
          const merged: DashboardPayload = {
            ...(s.data || {}),
            ...incoming,
            time_grouped_visits: incoming.time_grouped_visits 
              ? [...incoming.time_grouped_visits]
              : s.data?.time_grouped_visits ? [...s.data.time_grouped_visits] : undefined,
            unique_vs_returning: incoming.unique_vs_returning
              ? [...incoming.unique_vs_returning]
              : s.data?.unique_vs_returning ? [...s.data.unique_vs_returning] : undefined,
            funnel: incoming.funnel 
              ? [...incoming.funnel]
              : s.data?.funnel ? [...s.data.funnel] : undefined,
            referrers: incoming.referrers
              ? [...incoming.referrers]
              : s.data?.referrers ? [...s.data.referrers] : undefined,
            browsers: incoming.browsers
              ? [...incoming.browsers]
              : s.data?.browsers ? [...s.data.browsers] : undefined,
            devices: incoming.devices
              ? [...incoming.devices]
              : s.data?.devices ? [...s.data.devices] : undefined,
            os: incoming.os
              ? [...incoming.os]
              : s.data?.os ? [...s.data.os] : undefined,
            countries: incoming.countries
              ? [...incoming.countries]
              : s.data?.countries ? [...s.data.countries] : undefined,
            events_timeline: incoming.events_timeline
              ? [...incoming.events_timeline]
              : s.data?.events_timeline ? [...s.data.events_timeline] : undefined,
            utm_campaigns: incoming.utm_campaigns
              ? [...incoming.utm_campaigns]
              : s.data?.utm_campaigns ? [...s.data.utm_campaigns] : undefined,
            utm_sources: incoming.utm_sources
              ? [...incoming.utm_sources]
              : s.data?.utm_sources ? [...s.data.utm_sources] : undefined,
            calendar_density: incoming.calendar_density
              ? [...incoming.calendar_density]
              : s.data?.calendar_density ? [...s.data.calendar_density] : undefined,
            top_pages: incoming.top_pages
              ? [...incoming.top_pages]
              : s.data?.top_pages ? [...s.data.top_pages] : undefined,
            page_flow: incoming.page_flow
              ? {...incoming.page_flow}
              : s.data?.page_flow ? {...s.data.page_flow} : undefined,
          } as DashboardPayload;
          
          if (merged.time_grouped_visits) {
            console.log("📊 [Hook] After merge, data points:", merged.time_grouped_visits.length, "range:", merged.range);
          }
          
          return { ...s, data: merged, error: null };
        });
        
        console.log("🔄 [Hook] Incrementing version to trigger re-render (like bootstrap)");
        setAnalyticsVersion((v) => v + 1);
      }
    );

    const offCities = mvBus.on<{ points: GeoCityPoint[]; total: number }>(
      "mv:live:cities",
      ({ points, total }) => {
        console.log("🌍 [Hook] Received live cities event:", { total, pointsCount: points.length });
        setState((s) => ({ ...s, liveCities: points, liveCount: total }));
      }
    );

    const offCount = mvBus.on<{ count: number }>("mv:live:count", ({ count }) => {
      console.log("👥 [Hook] Received live count event:", count);
      setState((s) => ({ ...s, liveCount: count }));
    });

    const offErr = mvBus.on<{ message: string }>("mv:error", ({ message }) => {
      console.error("❌ [Hook] Received error event:", message);
      setState((s) => ({ ...s, error: message || "error" }));
    });

    return () => {
      console.log("📡 [Hook] Unsubscribing from mvBus events");
      offSnapshot();
      offFrame();
      offCities();
      offCount();
      offErr();
    };
  }, [range]);

  const refreshSnapshot = () => {
    console.log("🔄 [Hook] Manually refreshing snapshot");
    DashboardService.fetchSnapshot().catch(() => {});
  };

  const reconnectWS = () => {
    console.log("🔄 [Hook] Manually reconnecting WebSocket");
    DashboardService.reconnectWebSocket().catch(() => {});
  };

  const restart = () => {
    console.log("🔄 [Hook] Restarting service");
    DashboardService.fetchSnapshot().catch(() => {});
    DashboardService.reconnectWebSocket().catch(() => {});
  };

  return {
    data: state.data,
    liveCities: state.liveCities,
    liveCount: state.liveCount,
    error: state.error,
    isLoading: !state.data,
    analyticsVersion,
    refreshSnapshot,
    reconnectWS,
    restart,
  };
}