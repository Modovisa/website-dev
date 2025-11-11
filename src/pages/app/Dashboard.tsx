// src/pages/app/Dashboard.tsx

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, MousePointerClick, TrendingUp } from "lucide-react";
import { useDashboardData, useTrackingWebsites } from "@/hooks/useDashboardData";
import { useLiveVisitorsWS } from "@/hooks/useLiveVisitorsWS";
import type { RangeKey, DashboardPayload } from "@/types/dashboard";

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
import { useGeoEvents } from "@/hooks/useGeoEvents";

import { nf, pct } from "@/lib/format";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { getWSTicket } from "@/services/dashboardService";

type Website = { id: number; website_name: string; domain: string };

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const [siteId, setSiteId] = useState<number | null>(() => {
    const saved = localStorage.getItem("current_website_id");
    return saved ? Number(saved) : null;
  });
  const [range, setRange] = useState<RangeKey>("24h");

  // Websites via service-layer hook
  const { data: websitesRaw = [], isLoading: sitesLoading } = useTrackingWebsites();
  const websites: Website[] = (websitesRaw || []).map((p: any) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));

  // Keep a tiny local cache + auto-select first site if none chosen
  useEffect(() => {
    if (websites.length) {
      try {
        localStorage.setItem("mv.sites", JSON.stringify(websites));
      } catch {}
    }
    if ((siteId == null || Number.isNaN(siteId)) && websites[0]) {
      setSiteId(websites[0].id);
      localStorage.setItem("current_website_id", String(websites[0].id));
    }
  }, [websites, siteId]);

  const { data, isLoading, refetch } = useDashboardData({ siteId: siteId ?? undefined, range });
  const qc = useQueryClient();

  const [liveCount, setLiveCount] = useState<number | null>(null);
  useLiveVisitorsWS({
    siteId: siteId ?? undefined,
    onLiveCount: (n) => setLiveCount(n),
    onDashboardSnapshot: (payload: DashboardPayload) => {
      if (payload?.range === range) {
        qc.setQueryData(["dashboard", siteId, range], (old: any) => ({ ...(old || {}), ...payload }));
      }
    },
    getTicket: async (sid) => getWSTicket(sid),
  });

  const { data: geoCities = [] } = useGeoEvents(siteId ?? undefined);

  const siteOptions = useMemo(
    () => websites.map((w) => ({ value: String(w.id), label: w.website_name })),
    [websites]
  );

  const topCards = [
    { key: "live", name: "Live Visitors", value: liveCount ?? data?.live_visitors ?? 0, icon: Users, change: null },
    { key: "unique", name: "Total Visitors", value: data?.unique_visitors?.total ?? 0, icon: Eye, change: data?.unique_visitors?.delta ?? null },
    { key: "avg", name: "Avg. Session", value: data?.avg_duration ?? "--", icon: MousePointerClick, change: data?.avg_duration_delta ?? null },
    { key: "bounce", name: "Bounce Rate", value: `${data?.bounce_rate ?? 0}%`, icon: TrendingUp, change: data?.bounce_rate_delta ?? null },
  ];

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-lg text-muted-foreground">Verifying authentication...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }
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
                refetch();
              }}
              disabled={sitesLoading || siteOptions.length === 0}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={sitesLoading ? "Loading..." : "Choose Website"} />
              </SelectTrigger>
              <SelectContent>
                {siteOptions.length === 0 && !sitesLoading ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">No websites found</div>
                ) : (
                  siteOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))
                )}
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

            <Button variant="outline" onClick={() => refetch()} disabled={!siteId}>
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {topCards.map((stat) => (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-24" />
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
                      <p className={`text-xs mt-1 ${Number(stat.change) >= 0 ? "text-success" : "text-destructive"}`}>
                        {pct(Number(stat.change))} from last period
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <TimeGroupedVisits data={data?.time_grouped_visits ?? []} range={range} loading={isLoading} />
          </div>
          <EventVolume data={data?.events_timeline ?? []} loading={isLoading} />
        </div>

        {/* Tables Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <TopPagesTable rows={(data?.top_pages ?? []).map((p) => ({ url: p.url, views: p.views }))} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referrers</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <ReferrersTable rows={(data?.referrers ?? []).map((r) => ({ domain: r.domain, visitors: r.visitors }))} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Geographic Insights */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>World Visitors</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {range === "24h" ? "Past 24 hours" :
                  range === "7d"  ? "Past 7 days"   :
                  range === "30d" ? "Past 30 days"  :
                  range === "90d" ? "Past 90 days"  :
                  range === "12mo"? "Past 12 months": ""}
                </p>
              </CardHeader>
              <CardContent className="pt-2">
                {isLoading ? (
                  <Skeleton className="h-[540px] w-full" />
                ) : (
                  <WorldMap
                    countries={data?.countries ?? []}
                    cities={geoCities}
                    rangeLabel={
                      range === "24h" ? "Past 24 hours" :
                      range === "7d"  ? "Past 7 days"   :
                      range === "30d" ? "Past 30 days"  :
                      range === "90d" ? "Past 90 days"  :
                      range === "12mo"? "Past 12 months": undefined
                    }
                    height={540}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Visits by Country</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : (
                  <CountryVisits countries={data?.countries ?? []} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Visitor Density Calendar */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Visitor Density Calendar</CardTitle>
            {/* If you want a year picker later, lift state to Dashboard and pass as prop */}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <VisitorsHeatmap data={data?.calendar_density ?? []} height={220} />
            )}
          </CardContent>
        </Card>

        {/* Charts Row 2 */}
        <div className="grid gap-6 md:grid-cols-2">
          <UniqueReturning data={data?.unique_vs_returning ?? []} loading={isLoading} />
          <PerformanceLine
            title="Conversions"
            current={data?.conversions_timeline ?? []}
            previous={data?.conversions_previous_timeline ?? []}
            color="#8b5cf6"
            filled
            loading={isLoading}
          />
        </div>

        {/* Charts Row 3 (translucent fills) */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <PerformanceLine
            title="Impressions"
            current={data?.impressions_timeline ?? []}
            previous={data?.impressions_previous_timeline ?? []}
            color="#22c55e"
            filled
            loading={isLoading}
          />
          <PerformanceLine
            title="Clicks"
            current={data?.clicks_timeline ?? []}
            previous={data?.clicks_previous_timeline ?? []}
            color="#3b82f6"
            filled
            loading={isLoading}
          />
          <PerformanceLine
            title="Visitors from Search"
            current={data?.search_visitors_timeline ?? []}
            previous={data?.search_visitors_previous_timeline ?? []}
            color="#f59e0b"
            filled
            loading={isLoading}
          />
          <PerformanceLine
            title="All Visitors"
            current={(data as any)?.unique_visitors_timeline ?? []}
            previous={(data as any)?.previous_unique_visitors_timeline ?? []}
            color="#0ea5e9"
            filled
            loading={isLoading}
          />
        </div>

        {/* Donuts */}
        <div className="grid gap-6 md:grid-cols-3">
          <Donut title="Browsers" data={data?.browsers ?? []} nameKey="name" valueKey="count" loading={isLoading} />
          <Donut title="Devices" data={data?.devices ?? []} nameKey="type" valueKey="count" loading={isLoading} />
          <Donut title="OS" data={data?.os ?? []} nameKey="name" valueKey="count" loading={isLoading} />
        </div>

        {/* UTM tables */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>UTM Campaign URLs</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <UTMCampaignsTable rows={data?.utm_campaigns ?? []} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>UTM Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : (
                <UTMSourcesTable rows={data?.utm_sources ?? []} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
