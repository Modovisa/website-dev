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
        
        // Log what we received
        if (incoming.time_grouped_visits) {
          console.log("📊 [Hook] WebSocket data points:", incoming.time_grouped_visits.length, "metadata range:", incoming.range);
        }
        
        // CRITICAL: Validate data array sizes match expected range
        // Backend bug: WebSocket sends 30d data even when range is 24h
        // We must reject mismatched CHART data but still accept METRICS updates
        if (incoming.time_grouped_visits && incoming.time_grouped_visits.length > 0) {
          const dataPoints = incoming.time_grouped_visits.length;
          
          // TIGHT validation ranges based on actual expected data
          const expectedPoints: Record<RangeKey, [number, number]> = {
            '24h': [20, 28],   // 24h hourly = ~24 points (±2 for edge cases)
            '7d': [6, 9],      // 7d daily = ~7 points
            '30d': [28, 32],   // 30d daily = ~30 points
            '90d': [85, 95],   // 90d daily = ~90 points
            '12mo': [11, 13],  // 12mo monthly = ~12 points
          };
          
          const [min, max] = expectedPoints[range] || [0, 1000];
          console.log(`🔍 [Hook] Validating: got ${dataPoints} points, expected ${min}-${max} for range "${range}"`);
          
          if (dataPoints < min || dataPoints > max) {
            console.warn(
              `⚠️ [Hook] REJECTING chart arrays - data size mismatch!`,
              `Expected ${min}-${max} points for range "${range}", got ${dataPoints} points.`,
              `Keeping existing chart data but updating metrics/counts.`
            );
            
            // Merge ONLY non-chart fields (metrics, counts, simple arrays)
            setState((s) => {
              const merged: DashboardPayload = {
                ...(s.data || {}),
                ...incoming,
                // REJECT: Keep old chart data, don't merge incoming chart arrays
                time_grouped_visits: s.data?.time_grouped_visits,
                unique_vs_returning: s.data?.unique_vs_returning,
                events_timeline: s.data?.events_timeline,
                funnel: s.data?.funnel,
                calendar_density: s.data?.calendar_density,
                
                // ACCEPT: Merge scalar metrics and simple lists
                unique_visitors: incoming.unique_visitors ?? s.data?.unique_visitors,
                live_visitors: incoming.live_visitors ?? s.data?.live_visitors,
                bounce_rate: incoming.bounce_rate ?? s.data?.bounce_rate,
                avg_duration: incoming.avg_duration ?? s.data?.avg_duration,
                multi_page_visits: incoming.multi_page_visits ?? s.data?.multi_page_visits,
                
                // ACCEPT: Simple data arrays (not time-series charts)
                referrers: incoming.referrers ?? s.data?.referrers,
                browsers: incoming.browsers ?? s.data?.browsers,
                devices: incoming.devices ?? s.data?.devices,
                os: incoming.os ?? s.data?.os,
                countries: incoming.countries ?? s.data?.countries,
                top_pages: incoming.top_pages ?? s.data?.top_pages,
                utm_campaigns: incoming.utm_campaigns ?? s.data?.utm_campaigns,
                utm_sources: incoming.utm_sources ?? s.data?.utm_sources,
                page_flow: incoming.page_flow ?? s.data?.page_flow,
              } as DashboardPayload;
              
              console.log("📊 [Hook] Partial merge: kept chart data, updated metrics");
              return { ...s, data: merged, error: null };
            });
            setAnalyticsVersion((v) => v + 1);
            return; // Skip full merge
          } else {
            console.log(`✅ [Hook] Validation passed - ${dataPoints} points is valid for range "${range}"`);
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
          
          if (merged.time_grouped_visits) {
            console.log("📊 [Hook] After merge, data points:", merged.time_grouped_visits.length, "range:", merged.range);
          }
          
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
  }, [range]); // CRITICAL: Add range as dependency to fix closure bug!

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