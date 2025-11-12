// src/pages/app/Dashboard.tsx

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrackingWebsites } from "@/services/dashboardService";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, MousePointerClick, TrendingUp, AlertTriangle, RefreshCcw } from "lucide-react";

import { useDashboardRealtime } from "@/hooks/useDashboardRealtime";
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

import { nf, pct } from "@/lib/format";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type Website = { id: number; website_name: string; domain: string };

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  const [siteId, setSiteId] = useState<number | null>(() => {
    const saved = localStorage.getItem("current_website_id");
    return saved ? Number(saved) : null;
  });
  const [range, setRange] = useState<RangeKey>("24h");

  // Websites list (REST)
  const { data: websitesRaw = [], isLoading: sitesLoading } = useQuery({
    queryKey: ["tracking-websites"],
    queryFn: getTrackingWebsites,
    staleTime: 5 * 60 * 1000,
  });

  const websites: Website[] = (websitesRaw || []).map((p: any) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));

  useEffect(() => {
    if (websites.length) {
      try { localStorage.setItem("mv.sites", JSON.stringify(websites)); } catch {}
    }
    if ((siteId == null || Number.isNaN(siteId)) && websites[0]) {
      setSiteId(websites[0].id);
      localStorage.setItem("current_website_id", String(websites[0].id));
    }
  }, [websites, siteId]);

  // REST snapshot first, then WS refine
  const { data, liveCount, liveCities, isLoading, error, reconnect } = useDashboardRealtime(
    siteId ?? null,
    range,
    { stopRetryOn401: true }
  );

  // KPI skeletons should show until we have the FIRST snapshot
  const kpiLoading = !data;
  // Page-level loading (charts/table skeletons during first paint)
  const pageLoading = isLoading || (!data && !error);

  const topCards = [
    { key: "live",   name: "Live Visitors", value: liveCount ?? data?.live_visitors ?? 0, icon: Users,            change: null },
    { key: "unique", name: "Total Visitors", value: data?.unique_visitors?.total ?? 0,      icon: Eye,              change: data?.unique_visitors?.delta ?? null },
    { key: "avg",    name: "Avg. Session",   value: data?.avg_duration ?? "--",             icon: MousePointerClick, change: data?.avg_duration_delta ?? null },
    { key: "bounce", name: "Bounce Rate",    value: `${data?.bounce_rate ?? 0}%`,           icon: TrendingUp,       change: data?.bounce_rate_delta ?? null },
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
              onClick={() => reconnect()}
              disabled={!siteId}
              className="gap-2"
              title="Refresh snapshot + keep live stream"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && error !== "unauthorized" && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-destructive">Live stream error.</div>
              <div className="text-muted-foreground mt-1">{error}</div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {topCards.map((stat) => (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.name}</CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {kpiLoading ? (
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

        {/* First paint skeletons for charts/tables */}
        {pageLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-[300px] w-full" />
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
                  <TimeGroupedVisits data={data.time_grouped_visits ?? []} range={range} loading={false} />
                </div>
                <EventVolume data={data.events_timeline ?? []} loading={false} />
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
                         range === "90d" ? "Past 90 days"  :
                         "Past 12 months"}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-2 h-[540px]">
                      <WorldMap
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
                  <VisitorsHeatmap data={data.calendar_density ?? []} height={220} />
                </CardContent>
              </Card>

              {/* Lines */}
              <div className="grid gap-6 md:grid-cols-2">
                <UniqueReturning data={data.unique_vs_returning ?? []} />
                <PerformanceLine
                  title="Conversions"
                  current={data.conversions_timeline ?? []}
                  previous={data.conversions_previous_timeline ?? []}
                  color="#8b5cf6"
                  filled
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <PerformanceLine title="Impressions" current={data.impressions_timeline ?? []} previous={data.impressions_previous_timeline ?? []} color="#22c55e" filled />
                <PerformanceLine title="Clicks" current={data.clicks_timeline ?? []} previous={data.clicks_previous_timeline ?? []} color="#3b82f6" filled />
                <PerformanceLine title="Visitors from Search" current={data.search_visitors_timeline ?? []} previous={data.search_visitors_previous_timeline ?? []} color="#f59e0b" filled />
                <PerformanceLine title="All Visitors" current={(data as any)?.unique_visitors_timeline ?? []} previous={(data as any)?.previous_unique_visitors_timeline ?? []} color="#0ea5e9" filled />
              </div>

              {/* Donuts + UTMs */}
              <div className="grid gap-6 md:grid-cols-3">
                <Donut title="Browsers" data={data.browsers ?? []} nameKey="name" valueKey="count" />
                <Donut title="Devices"  data={data.devices ?? []}  nameKey="type" valueKey="count" />
                <Donut title="OS"       data={data.os ?? []}       nameKey="name" valueKey="count" />
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
