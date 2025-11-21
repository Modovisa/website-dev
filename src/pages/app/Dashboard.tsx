// src/pages/app/Dashboard.tsx

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Users,
  Eye,
  MousePointerClick,
  TrendingUp,
  AlertTriangle,
  RefreshCcw,
  Clock,
} from "lucide-react";
import type { RangeKey } from "@/types/dashboard";

import { KpiCard } from "@/components/dashboard/KpiCard";
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
import { SectionHeader } from "@/components/dashboard/ChartKit";

import {
  useDashboard,
  init as dsInit,
  setSite as dsSetSite,
  setRange as dsSetRange,
  fetchSnapshot as dsFetchSnapshot,
  fetchSnapshotHard as dsFetchSnapshotHard,
  connectWS as dsConnectWS,
  getTrackingWebsites,
} from "@/services/dashboard.store";

import { useAuthGuard } from "@/hooks/useAuthGuard";

type Website = { id: number; website_name: string; domain: string };

// FE supports only BE ranges: 24h | 7d | 30d | 12mo
const ALLOWED_RANGES = ["24h", "7d", "30d", "12mo"] as const;
const normalizeRange = (r: RangeKey): RangeKey =>
  (ALLOWED_RANGES as readonly string[]).includes(String(r))
    ? r
    : ("30d" as RangeKey);

export default function Dashboard() {
  const { isAuthenticated } = useAuthGuard();

  const [siteId, setSiteId] = useState<number | null>(() => {
    const saved = localStorage.getItem("current_website_id");
    return saved ? Number(saved) : null;
  });
  const [range, setRange] = useState<RangeKey>(
    normalizeRange("24h" as RangeKey),
  );

  // Boot the store exactly once after auth
  useEffect(() => {
    if (!isAuthenticated) return;
    dsInit(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const {
    data: websitesRaw = [],
    isLoading: sitesLoading,
  } = useQuery({
    queryKey: ["tracking-websites"],
    queryFn: getTrackingWebsites,
    staleTime: 5 * 60 * 1000,
    enabled: isAuthenticated,
  });

  const websites: Website[] = (websitesRaw || []).map((p: any) => ({
    id: Number(p.id),
    website_name: String(p.website_name || p.name || `Site ${p.id}`),
    domain: String(p.domain || ""),
  }));

  // Pick initial site once websites arrive (no WS calls here)
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!websites || websites.length === 0) return;

    const saved = Number(localStorage.getItem("current_website_id") || 0);
    const picked = websites.some((w) => w.id === saved)
      ? saved
      : websites[0].id;

    if (siteId !== picked) {
      setSiteId(picked);
      localStorage.setItem("current_website_id", String(picked));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websites, isAuthenticated]);

  // When the user changes site → single source of truth for WS/subscription
  useEffect(() => {
    if (!isAuthenticated || !siteId) return;
    dsSetSite(siteId);
  }, [siteId, isAuthenticated]);

  // When the user changes range → store handles cache + REST + WS set_range
  useEffect(() => {
    if (!isAuthenticated) return;
    dsSetRange(normalizeRange(range));
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
    {
      key: "live",
      name: "Live Visitors",
      value: liveCount ?? data?.live_visitors ?? 0,
      icon: Users,
      change: null as number | null,
      info: "Number of users currently active on your site in real time.",
    },
    {
      key: "unique",
      name: "Total Visitors",
      value: data?.unique_visitors?.total ?? 0,
      icon: Eye,
      change: data?.unique_visitors?.delta ?? null,
      info: "Unique users who visited during the selected time range.",
    },
    {
      key: "bounce",
      name: "Bounce Rate",
      value: (data?.bounce_rate ?? 0) + "%",
      icon: TrendingUp,
      change: data?.bounce_rate_delta ?? null,
      reverseColor: true,
      info: "Percentage of visitors who left after viewing only one page. Lower is better.",
    },
    {
      key: "avg",
      name: "Avg. Session",
      value: data?.avg_duration ?? "--",
      icon: Clock,
      change: data?.avg_duration_delta ?? null,
      info: "Average time users spent on your site during a session.",
    },
    {
      key: "multipage",
      name: "Multi-Page Visits",
      value: data?.multi_page_visits ?? "--",
      icon: MousePointerClick,
      change: data?.multi_page_visits_delta ?? null,
      info: "Sessions with more than one page viewed. Indicates deeper user engagement.",
    },
  ];

  if (!isAuthenticated) return null;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Your traffic at a glance.
          </p>
        </header>
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
                <SelectValue
                  placeholder={sitesLoading ? "Loading..." : "Choose Website"}
                />
              </SelectTrigger>
              <SelectContent>
                {websites.length === 0 && !sitesLoading ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No websites found
                  </div>
                ) : (
                  websites.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.website_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select
              value={normalizeRange(range)}
              onValueChange={(v: RangeKey) => setRange(v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Today</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="12mo">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh: snapshot only */}
            <Button
              variant="outline"
              onClick={() => dsFetchSnapshot()}
              disabled={!siteId}
              className="gap-2"
              title="Refresh snapshot"
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
              <div className="font-semibold text-destructive">
                Live stream error.
              </div>
              <div className="text-muted-foreground mt-1">{error}</div>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const r = normalizeRange(range);
                    if (r === "24h") {
                      dsConnectWS(true);
                    } else {
                      dsFetchSnapshotHard();
                    }
                  }}
                  disabled={!siteId}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
          {topCards.map((stat) => (
            <KpiCard
              key={stat.key}
              title={stat.name}
              info={stat.info}
              icon={stat.icon}
              value={stat.value}
              change={stat.change}
              reverseColor={stat.reverseColor}
              loading={showKpiSkeleton}
            />
          ))}
        </div>

        {/* Charts & tables */}
        <>
          {/* Charts Row 1 */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <TimeGroupedVisits
                key={`tgv-${frameKey}-${seriesSig}-${range}-${siteId}`}
                data={data?.time_grouped_visits ?? []}
                range={normalizeRange(range)}
                loading={showPageSkeleton}
                hasData={!!data?.time_grouped_visits?.length}
                version={analyticsVersion}
                frameKey={frameKey}
              />
            </div>
            <EventVolume
              key={`evt-${frameKey}-${seriesSig}-${range}-${siteId}`}
              data={data?.events_timeline ?? []}
              loading={showPageSkeleton}
              hasData={!!data?.events_timeline?.length}
              version={analyticsVersion}
            />
          </div>

          {/* Tables */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <SectionHeader
                  title="Top Pages"
                  info="List of most visited pages. Helps you identify your most engaging content."
                />
              </CardHeader>
              <CardContent className="pt-0">
                <TopPagesTable
                  rows={(data?.top_pages ?? []).map((p: any) => ({
                    url: p.url,
                    views: p.views,
                  }))}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <SectionHeader
                  title="Referrers"
                  info="Breakdown of external sites that sent visitors to you. Useful for traffic source attribution."
                />
              </CardHeader>
              <CardContent className="pt-0">
                <ReferrersTable
                  rows={(data?.referrers ?? []).map((r: any) => ({
                    domain: r.domain,
                    visitors: r.visitors,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Geographic */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="h-[660px]">
                <CardHeader className="px-6 pt-6 pb-0 space-y-1">
                  <SectionHeader
                    title="World Visitors"
                    info="Live map of where your visitors are located. Great for identifying geographic interest and potential target regions."
                  />
                  <p className="text-sm text-muted-foreground px-4">
                    {range === "24h"
                      ? "Past 24 hours"
                      : range === "7d"
                      ? "Past 7 days"
                      : range === "30d"
                      ? "Past 30 days"
                      : "Past 12 months"}
                  </p>
                </CardHeader>

                <CardContent className="pt-2 h-[540px]">
                  <WorldMap
                    key={`map-${siteId}-${range}`}
                    countries={data?.countries ?? []}
                    cities={liveCities}
                    height={540}
                  />
                </CardContent>
              </Card>
            </div>

            <div>
              <Card className="h-[660px]">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <SectionHeader
                    title="Visits by Country"
                    info="Table view of visitor counts by country. Helps you prioritize markets and tailor content to regions."
                  />
                </CardHeader>
                <CardContent className="h-[540px] overflow-auto">
                  <CountryVisits countries={data?.countries ?? []} />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Heatmap */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <SectionHeader
                title="Visitor Density Calendar"
                info="Shows how many visitors came to your site on each day of the year. Helps track long-term trends."
              />
            </CardHeader>
            <CardContent>
              <VisitorsHeatmap
                key={`heat-${frameKey}-${seriesSig}-${range}-${siteId}`}
                data={data?.calendar_density ?? []}
                height={220}
              />
            </CardContent>
          </Card>

          {/* Lines */}
          <div className="grid gap-6 md:grid-cols-2">
            <UniqueReturning
              key={`ur-${frameKey}-${seriesSig}-${range}-${siteId}`}
              data={data?.unique_vs_returning ?? []}
              loading={showPageSkeleton}
              version={analyticsVersion}
            />
            <PerformanceLine
              key={`conv-${frameKey}-${seriesSig}-${range}-${siteId}`}
              title="Conversions"
              info="Counts completed conversions like thank-you page loads or order completions."
              current={data?.conversions_timeline ?? []}
              previous={data?.conversions_previous_timeline ?? []}
              color="#8b5cf6"
              filled
              loading={showPageSkeleton}
              version={analyticsVersion}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <PerformanceLine
              key={`imp-${frameKey}-${seriesSig}-${range}-${siteId}`}
              title="Impressions"
              info="Displays the total number of pageviews (impressions) recorded over time. The dotted line shows the previous period for comparison."
              current={data?.impressions_timeline ?? []}
              previous={data?.impressions_previous_timeline ?? []}
              color="#22c55e"
              filled
              loading={showPageSkeleton}
              version={analyticsVersion}
            />
            <PerformanceLine
              key={`clk-${frameKey}-${seriesSig}-${range}-${siteId}`}
              title="Clicks"
              info="Tracks click events across your site, such as product clicks or outbound links."
              current={data?.clicks_timeline ?? []}
              previous={data?.clicks_previous_timeline ?? []}
              color="#3b82f6"
              filled
              loading={showPageSkeleton}
              version={analyticsVersion}
            />
            <PerformanceLine
              key={`srch-${frameKey}-${seriesSig}-${range}-${siteId}`}
              title="Visitors from Search"
              info="Shows how many unique visitors arrived from search engines like Google or Bing."
              current={data?.search_visitors_timeline ?? []}
              previous={data?.search_visitors_previous_timeline ?? []}
              color="#f59e0b"
              filled
              loading={showPageSkeleton}
              version={analyticsVersion}
            />
            <PerformanceLine
              key={`all-${frameKey}-${seriesSig}-${range}-${siteId}`}
              title="All Visitors"
              info="Number of unique visitors per time bucket."
              current={(data as any)?.unique_visitors_timeline ?? []}
              previous={
                (data as any)?.previous_unique_visitors_timeline ?? []
              }
              color="#0ea5e9"
              filled
              loading={showPageSkeleton}
              version={analyticsVersion}
            />
          </div>

          {/* Donuts */}
          <div className="grid gap-6 md:grid-cols-3">
            <Donut
              key={`br-${frameKey}-${seriesSig}`}
              title="Browsers"
              info="Breakdown of which web browsers your visitors are using (e.g. Chrome, Safari). Helps with compatibility decisions."
              data={data?.browsers ?? []}
              nameKey="name"
              valueKey="count"
              loading={showPageSkeleton}
            />
            <Donut
              key={`dev-${frameKey}-${seriesSig}`}
              title="Devices"
              info="Shows whether visitors are browsing from phones, tablets, or desktops. Useful for responsive design and mobile prioritization."
              data={data?.devices ?? []}
              nameKey="type"
              valueKey="count"
              loading={showPageSkeleton}
            />
            <Donut
              key={`os-${frameKey}-${seriesSig}`}
              title="OS"
              info="Distribution of operating systems like Windows, macOS, Android, etc. Good for optimizing user experience."
              data={data?.os ?? []}
              nameKey="name"
              valueKey="count"
              loading={showPageSkeleton}
            />
          </div>

          {/* UTMs */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <SectionHeader
                  title="UTM Campaign URLs"
                  info="List of pages with UTM campaign parameters and how many visitors they attracted. Helps evaluate campaign performance."
                />
              </CardHeader>
              <CardContent>
                <UTMCampaignsTable rows={data?.utm_campaigns ?? []} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <SectionHeader
                  title="UTM Sources"
                  info="Breakdown of traffic by utm_source tag. Useful for measuring campaign channel effectiveness."
                />
              </CardHeader>
              <CardContent>
                <UTMSourcesTable rows={data?.utm_sources ?? []} />
              </CardContent>
            </Card>
          </div>
        </>
    </AppLayout>
  );
}
