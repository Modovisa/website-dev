// src/pages/app/Dashboard.tsx
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, MousePointerClick, TrendingUp, AlertTriangle, RefreshCcw, Clock } from "lucide-react";
import type { RangeKey } from "@/types/dashboard";

import TimeGroupedVisits from "@/components/dashboard/TimeGroupedVisits";
import EventVolume from "@/components/dashboard/EventVolume";
import UniqueReturning from "@/components/dashboard/UniqueReturning";
import PerformanceLine from "@/components/dashboard/PerformanceLine";
import Donut from "@/components/dashboard/Donut";
import UTMCampaignsTable from "@/components/dashboard/UTMCampaignsTable";
import UTMSourcesTable from "@/components/dashboard/UTMSourcesTable";
import TopPagesTable from "@/components/dashboard/TopPagesTable";
import ReferrersTable from "@/components/dashboard/ReferrersTable";
import WorldMap from "@/components/dashboard/WorldMap";
import VisitorsHeatmap from "@/components/dashboard/VisitorsHeatmap";
import CountryVisits from "@/components/dashboard/CountryVisits";

import {
  useDashboard,
  init as dsInit,
  setSite as dsSetSite,
  setRange as dsSetRange,
  fetchSnapshot as dsFetchSnapshot,
  connectWS as dsReconnect,
  getTrackingWebsites,
} from "@/services/dashboard.store";
import { nf } from "@/lib/format";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type Website = { id: number; website_name: string; domain: string };

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const [siteId, setSiteId] = useState<number | null>(() => {
    const saved = localStorage.getItem("current_website_id");
    return saved ? Number(saved) : null;
  });
  const [range, setRange] = useState<RangeKey>("24h");

  // Boot the store only after auth is ready
  useEffect(() => {
    if (!isAuthenticated) return;
    dsInit(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const { data: websitesRaw = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["tracking-websites"],
    queryFn: getTrackingWebsites,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated, // don’t fire until auth is ready
  });

  const websites: Website[] = (websitesRaw || []).map((p: any) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));

  // After websites load, select site and seed/reconnect once
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!websites || websites.length === 0) return;

    const saved = Number(localStorage.getItem("current_website_id") || 0);
    const savedExists = websites.some((w) => w.id === saved);
    const chosen = savedExists ? saved : websites[0].id;

    if (siteId !== chosen) {
      setSiteId(chosen);
      localStorage.setItem("current_website_id", String(chosen));
    }
    dsSetSite(chosen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websites, isAuthenticated]);

  // When the user changes site
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!siteId) return;
    dsSetSite(siteId);
  }, [siteId, isAuthenticated]);

  // When the user changes range
  useEffect(() => {
    if (!isAuthenticated) return;
    dsSetRange(range);        // store handles cache→fetch→(non-forced) WS connect
  }, [range, isAuthenticated]);

  // Subscribe to store
  const {
    data,
    liveCount,
    liveCities,
    isLoading,
    error,
    analyticsVersion,
    frameKey,
    seriesSig,
  } = useDashboard();

  // First paint gating (skeletons)
  const [firstPaintDone, setFirstPaintDone] = useState(false);
  useEffect(() => {
    if (data && !firstPaintDone) setFirstPaintDone(true);
  }, [data, firstPaintDone]);

  const prevSiteRef = useRef<number | null>(siteId);
  useEffect(() => {
    if (prevSiteRef.current !== siteId) {
      setFirstPaintDone(false);
      prevSiteRef.current = siteId;
    }
  }, [siteId]);

  const prevRangeRef = useRef<RangeKey>(range);
  useEffect(() => {
    if (prevRangeRef.current !== range) {
      setFirstPaintDone(false);
      prevRangeRef.current = range;
    }
  }, [range]);

  const showKpiSkeleton = !firstPaintDone || isLoading;
  const showPageSkeleton = !firstPaintDone || isLoading;

  const topCards = [
    { key: "live", name: "Live Visitors", value: liveCount ?? data?.live_visitors ?? 0, icon: Users, change: null as number | null },
    { key: "unique", name: "Total Visitors", value: data?.unique_visitors?.total ?? 0, icon: Eye, change: data?.unique_visitors?.delta ?? null },
    { key: "bounce", name: "Bounce Rate", value: (data?.bounce_rate ?? 0) + "%", icon: TrendingUp, change: data?.bounce_rate_delta ?? null, reverseColor: true },
    { key: "avg", name: "Avg. Session", value: data?.avg_duration ?? "--", icon: Clock, change: data?.avg_duration_delta ?? null },
    { key: "multipage", name: "Multi-Page Visits", value: data?.multi_page_visits ?? "--", icon: MousePointerClick, change: data?.multi_page_visits_delta ?? null },
  ];

  // If not authenticated at all, don’t render sensitive UI
  if (!isAuthenticated) return null;

  return (
    <DashboardLayout>
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Your traffic at a glance.</p>
          </div>
          <div className="flex gap-3 items-center">
            <Select
              value={siteId != null ? String(siteId) : undefined}
              onValueChange={(v) => {
                const n = Number(v);
                setSiteId(n);
                localStorage.setItem("current_website_id", String(n));
              }}
              disabled={sitesLoading || websites.length === 0}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={sitesLoading ? "Loading..." : "Choose Website"} />
              </SelectTrigger>
              <SelectContent>
                {(websites.length === 0 && !sitesLoading)
                  ? <div className="px-2 py-1.5 text-sm text-muted-foreground">No websites found</div>
                  : websites.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.website_name}</SelectItem>)
                }
              </SelectContent>
            </Select>

            <Select value={range} onValueChange={(v: RangeKey) => setRange(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="12mo">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => { dsFetchSnapshot(); dsReconnect(true); }}
              disabled={!siteId}
              className="gap-2"
              title="Refresh snapshot and retry live stream"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">Live stream error.</div>
              <div className="text-muted-foreground mt-1">{error}</div>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { dsReconnect(true); dsFetchSnapshot(); }} disabled={!siteId}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {topCards.map((stat) => (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {showKpiSkeleton ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-28" />
                    <div className="flex gap-2 justify-start">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold">
                      {typeof stat.value === "number" ? nf(stat.value) : stat.value}
                    </div>
                    {stat.change != null && (
                      <p
                        className={`text-xs mt-1 ${
                          (stat as any).reverseColor
                            ? (Number(stat.change) <= 0 ? "text-green-600" : "text-red-600")
                            : (Number(stat.change) >= 0 ? "text-green-600" : "text-red-600")
                        }`}
                      >
                        {Number(stat.change) >= 0 ? "↑" : "↓"} {Math.abs(Number(stat.change)).toFixed(1)}% from last period
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* First paint skeletons */}
        {showPageSkeleton ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <Skeleton className="h-[360px] w-full" />
              </div>
              <Skeleton className="h-[300px] w-full" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <Skeleton className="h-[260px] w-full" />
              <Skeleton className="h-[260px] w-full" />
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
              <Skeleton className="h-[280px] w-full" />
            </div>
          </div>
        ) : (
          data && (
            <>
              {/* Charts Row 1 */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <TimeGroupedVisits
                    key={`tgv-${frameKey}-${seriesSig}-${range}-${siteId}`}
                    data={data.time_grouped_visits ?? []}
                    range={range}
                    loading={false}
                    hasData={!!data.time_grouped_visits?.length}
                    version={analyticsVersion}
                    frameKey={frameKey}
                  />
                </div>
                <EventVolume
                  key={`evt-${frameKey}-${seriesSig}-${range}-${siteId}`}
                  data={data.events_timeline ?? []}
                  loading={false}
                  hasData={!!data.events_timeline?.length}
                  version={analyticsVersion}
                />
              </div>

              {/* Tables */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
                  <CardContent>
                    <TopPagesTable rows={(data.top_pages ?? []).map((p: any) => ({ url: p.url, views: p.views }))} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Referrers</CardTitle></CardHeader>
                  <CardContent>
                    <ReferrersTable rows={(data.referrers ?? []).map((r: any) => ({ domain: r.domain, visitors: r.visitors }))} />
                  </CardContent>
                </Card>
              </div>

              {/* Geographic */}
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card className="h-[660px]">
                    <CardHeader className="px-6 pt-6 pb-0">
                      <CardTitle>World Visitors</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {range === "24h" ? "Past 24 hours" :
                         range === "7d"  ? "Past 7 days"   :
                         range === "30d" ? "Past 30 days"  :
                         range === "90d" ? "Past 90 days"  : "Past 12 months"}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-2 h-[540px]">
                      <WorldMap
                        key={`map-${siteId}-${range}`}
                        countries={data.countries ?? []}
                        cities={liveCities}
                        height={540}
                      />
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Card className="h-[660px]">
                    <CardHeader><CardTitle>Visits by Country</CardTitle></CardHeader>
                    <CardContent className="h-[540px] overflow-auto">
                      <CountryVisits countries={data.countries ?? []} />
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Heatmap */}
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Visitor Density Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <VisitorsHeatmap
                    key={`heat-${frameKey}-${seriesSig}-${range}-${siteId}`}
                    data={data.calendar_density ?? []}
                    height={220}
                  />
                </CardContent>
              </Card>

              {/* Lines */}
              <div className="grid gap-6 md:grid-cols-2">
                <UniqueReturning
                  key={`ur-${frameKey}-${seriesSig}-${range}-${siteId}`}
                  data={data.unique_vs_returning ?? []}
                  version={analyticsVersion}
                />
                <PerformanceLine
                  key={`conv-${frameKey}-${seriesSig}-${range}-${siteId}`}
                  title="Conversions"
                  current={data.conversions_timeline ?? []}
                  previous={data.conversions_previous_timeline ?? []}
                  color="#8b5cf6"
                  filled
                  version={analyticsVersion}
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <PerformanceLine
                  key={`imp-${frameKey}-${seriesSig}-${range}-${siteId}`}
                  title="Impressions"
                  current={data.impressions_timeline ?? []}
                  previous={data.impressions_previous_timeline ?? []}
                  color="#22c55e"
                  filled
                  version={analyticsVersion}
                />
                <PerformanceLine
                  key={`clk-${frameKey}-${seriesSig}-${range}-${siteId}`}
                  title="Clicks"
                  current={data.clicks_timeline ?? []}
                  previous={data.clicks_previous_timeline ?? []}
                  color="#3b82f6"
                  filled
                  version={analyticsVersion}
                />
                <PerformanceLine
                  key={`srch-${frameKey}-${seriesSig}-${range}-${siteId}`}
                  title="Visitors from Search"
                  current={data.search_visitors_timeline ?? []}
                  previous={data.search_visitors_previous_timeline ?? []}
                  color="#f59e0b"
                  filled
                  version={analyticsVersion}
                />
                <PerformanceLine
                  key={`all-${frameKey}-${seriesSig}-${range}-${siteId}`}
                  title="All Visitors"
                  current={(data as any)?.unique_visitors_timeline ?? []}
                  previous={(data as any)?.previous_unique_visitors_timeline ?? []}
                  color="#0ea5e9"
                  filled
                  version={analyticsVersion}
                />
              </div>

              {/* Donuts + UTMs */}
              <div className="grid gap-6 md:grid-cols-3">
                <Donut key={`br-${frameKey}-${seriesSig}`} title="Browsers" data={data.browsers ?? []} nameKey="name" valueKey="count" />
                <Donut key={`dev-${frameKey}-${seriesSig}`} title="Devices"  data={data.devices ?? []}  nameKey="type" valueKey="count" />
                <Donut key={`os-${frameKey}-${seriesSig}`}  title="OS"       data={data.os ?? []}       nameKey="name" valueKey="count" />
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-2">
                  <CardHeader><CardTitle>UTM Campaign URLs</CardTitle></CardHeader>
                  <CardContent><UTMCampaignsTable rows={data.utm_campaigns ?? []} /></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>UTM Sources</CardTitle></CardHeader>
                  <CardContent><UTMSourcesTable rows={data.utm_sources ?? []} /></CardContent>
                </Card>
              </div>
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
