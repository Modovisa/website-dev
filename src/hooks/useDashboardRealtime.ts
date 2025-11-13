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
  
  // Track first mount to prevent duplicate fetches
  const isFirstMount = useRef(true);
  const initialRange = useRef(range);
  const initialSite = useRef(siteId);

  // Initialize service once on mount
  useEffect(() => {
    console.log("🎬 [Hook] Initializing dashboard service");
    DashboardService.initialize(range).catch((e) => {
      console.error("❌ [Hook] Initialization failed:", e);
    });

    // Cleanup on unmount
    return () => {
      console.log("🎬 [Hook] Cleaning up dashboard service");
      DashboardService.cleanup();
    };
  }, []); // Empty deps - run once only!

  // Update range when it changes (skip first mount)
  useEffect(() => {
    if (isFirstMount.current && range === initialRange.current) {
      // Skip - already handled by initialize
      return;
    }
    
    console.log("🎯 [Hook] Range changed to:", range);
    DashboardService.setRange(range);
    DashboardService.fetchSnapshot().catch(() => {});
  }, [range]);

  // Update site when it changes (skip first mount)
  useEffect(() => {
    if (isFirstMount.current && siteId === initialSite.current) {
      // Skip - already handled by initialize
      isFirstMount.current = false; // Mark as no longer first mount
      return;
    }
    
    if (siteId) {
      console.log("🌐 [Hook] Site changed to:", siteId);
      DashboardService.setSite(siteId).catch(() => {});
    }
  }, [siteId]);

  // Subscribe to mvBus events
  useEffect(() => {
    console.log("📡 [Hook] Subscribing to mvBus events");

    const offSnapshot = mvBus.on<DashboardPayload>(
      "mv:dashboard:snapshot",
      (payload) => {
        console.log("📊 [Hook] Received snapshot event, updating state");
        setState((s) => ({ ...s, data: payload, error: null }));
        setAnalyticsVersion((v) => v + 1);
      }
    );

    const offFrame = mvBus.on<DashboardPayload>(
      "mv:dashboard:frame",
      (incoming) => {
        console.log("📊 [Hook] Received frame event, merging with state");
        
        // CRITICAL: Validate data array sizes match expected range
        // Backend bug: WebSocket sometimes sends 30d data even when range is 24h
        // We must reject mismatched data to prevent chart from switching ranges
        if (incoming.time_grouped_visits && incoming.time_grouped_visits.length > 0) {
          const dataPoints = incoming.time_grouped_visits.length;
          const expectedPoints: Record<RangeKey, [number, number]> = {
            '24h': [18, 50],   // 24h should have ~24-48 hourly points
            '7d': [6, 15],     // 7d should have ~7-14 daily points  
            '30d': [25, 35],   // 30d should have ~30 daily points
            '90d': [80, 100],  // 90d should have ~90 daily points
            '12mo': [10, 15],  // 12mo should have ~12 monthly points
          };
          
          const [min, max] = expectedPoints[range] || [0, 1000];
          if (dataPoints < min || dataPoints > max) {
            console.warn(
              `⚠️ [Hook] Rejecting WebSocket frame - data size mismatch!`,
              `Expected ${min}-${max} points for range "${range}", got ${dataPoints} points.`,
              `This suggests backend sent wrong range data. Keeping existing data.`
            );
            // Don't merge - just update live counts, keep existing chart data
            setState((s) => ({
              ...s,
              liveCount: incoming.live_visitors ?? s.liveCount,
              error: null,
            }));
            return; // Skip the full merge
          }
        }
        
        setState((s) => {
          const merged: DashboardPayload = {
            ...(s.data || {}),
            ...incoming,
            // Preserve arrays that might not be in every frame
            time_grouped_visits:
              incoming.time_grouped_visits ?? s.data?.time_grouped_visits,
            unique_vs_returning:
              incoming.unique_vs_returning ?? s.data?.unique_vs_returning,
            funnel: incoming.funnel ?? s.data?.funnel,
            referrers: incoming.referrers ?? s.data?.referrers,
            browsers: incoming.browsers ?? s.data?.browsers,
            devices: incoming.devices ?? s.data?.devices,
            os: incoming.os ?? s.data?.os,
            countries: incoming.countries ?? s.data?.countries,
            events_timeline: incoming.events_timeline ?? s.data?.events_timeline,
            utm_campaigns: incoming.utm_campaigns ?? s.data?.utm_campaigns,
            utm_sources: incoming.utm_sources ?? s.data?.utm_sources,
            calendar_density:
              incoming.calendar_density ?? s.data?.calendar_density,
            top_pages: incoming.top_pages ?? s.data?.top_pages,
            page_flow: incoming.page_flow ?? s.data?.page_flow,
          } as DashboardPayload;
          return { ...s, data: merged, error: null };
        });
        setAnalyticsVersion((v) => v + 1);
      }
    );

    const offCities = mvBus.on<{ points: GeoCityPoint[]; total: number }>(
      "mv:live:cities",
      ({ points, total }) => {
        console.log("🌍 [Hook] Received live cities event:", {
          total,
          pointsCount: points.length,
        });
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
  }, []);

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