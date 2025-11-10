// src/pages/app/Dashboard.tsx

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useLiveVisitorsWS } from '@/hooks/useLiveVisitorsWS';
import type { RangeKey, DashboardPayload } from '@/types/dashboard';
import TimeGroupedVisits from '@/components/dashboard/TimeGroupedVisits';
import EventVolume from '@/components/dashboard/EventVolume';
import UniqueReturning from '@/components/dashboard/UniqueReturning';
import PerformanceLine from '@/components/dashboard/PerformanceLine';
import Donut from '@/components/dashboard/Donut';
import UTMCampaignsTable from '@/components/dashboard/UTMCampaignsTable';
import UTMSourcesTable from '@/components/dashboard/UTMSourcesTable';
import { nf, pct, truncateMiddle } from '@/lib/format';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { secureFetch } from '@/lib/auth';

type Website = { id: number; website_name: string; domain: string };

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();

  // ── Controls
  const [siteId, setSiteId] = useState<number | null>(() => {
    const saved = localStorage.getItem('current_website_id');
    return saved ? Number(saved) : null;
  });
  const [range, setRange] = useState<RangeKey>('24h');

  // ── Websites (authoritative source = secureFetch)
  const [websites, setWebsites] = useState<Website[]>([]);
  const [sitesLoading, setSitesLoading] = useState<boolean>(true);

  // ── Data
  const { data, isLoading, refetch } = useDashboardData({ siteId: siteId ?? undefined, range });
  const qc = useQueryClient();

  // ── Live WS
  const [liveCount, setLiveCount] = useState<number | null>(null);
  useLiveVisitorsWS({
    siteId: siteId ?? undefined,
    onLiveCount: (n) => setLiveCount(n),
    onDashboardSnapshot: (payload: DashboardPayload) => {
      if (payload?.range === range) {
        qc.setQueryData(['dashboard', siteId, range], (old: any) => ({ ...(old || {}), ...payload }));
      }
    },
    getTicket: async (sid) => {
      const res = await secureFetch('https://api.modovisa.com/api/ws-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: sid }),
      });
      if (!res.ok) throw new Error('ticket');
      const j = await res.json();
      return j.ticket as string;
    },
  });

  // ── Load websites once (auth’d) and prime localStorage cache
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setSitesLoading(true);
        const res = await secureFetch('https://api.modovisa.com/api/tracking-websites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('tracking-websites failed');
        const j = await res.json();
        const arr: Website[] = (j?.projects || []).map((p: any) => ({
          id: Number(p.id),
          website_name: String(p.website_name || p.name || `Site ${p.id}`),
          domain: String(p.domain || ''),
        }));

        if (cancelled) return;

        setWebsites(arr);
        localStorage.setItem('mv.sites', JSON.stringify(arr));

        // auto-select if nothing selected
        if ((siteId == null || Number.isNaN(siteId)) && arr[0]) {
          setSiteId(arr[0].id);
          localStorage.setItem('current_website_id', String(arr[0].id));
        }
      } catch (err) {
        console.error('❌ /api/tracking-websites', err);
        // fall back to cache if any
        try {
          const cached = JSON.parse(localStorage.getItem('mv.sites') || '[]') as Website[];
          setWebsites(cached);
          if ((siteId == null || Number.isNaN(siteId)) && cached[0]) {
            setSiteId(cached[0].id);
            localStorage.setItem('current_website_id', String(cached[0].id));
          }
        } catch {}
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // once on mount

  // ── Derived site options (pure)
  const siteOptions = useMemo(
    () => websites.map((w) => ({ value: String(w.id), label: w.website_name })),
    [websites]
  );

  const topCards = [
    {
      key: 'live',
      name: 'Live Visitors',
      value: liveCount ?? data?.live_visitors ?? 0,
      icon: Users,
      change: null,
    },
    {
      key: 'unique',
      name: 'Total Visitors',
      value: data?.unique_visitors?.total ?? 0,
      icon: Eye,
      change: data?.unique_visitors?.delta ?? null,
    },
    {
      key: 'avg',
      name: 'Avg. Session',
      value: data?.avg_duration ?? '--',
      icon: MousePointerClick,
      change: data?.avg_duration_delta ?? null,
    },
    {
      key: 'bounce',
      name: 'Bounce Rate',
      value: `${data?.bounce_rate ?? 0}%`,
      icon: TrendingUp,
      change: data?.bounce_rate_delta ?? null,
    },
  ];

  // ── Auth gate (match LiveTracking UX)
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
            {/* Site Selector */}
            <Select
              value={siteId != null ? String(siteId) : undefined}
              onValueChange={(v) => {
                const n = Number(v);
                setSiteId(n);
                localStorage.setItem('current_website_id', String(n));
                refetch();
              }}
              disabled={sitesLoading || siteOptions.length === 0}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={sitesLoading ? 'Loading...' : 'Choose Website'} />
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

            {/* Range */}
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
                <div className="text-3xl font-bold">
                  {typeof stat.value === 'number' ? nf(stat.value) : stat.value}
                </div>
                {stat.change != null && (
                  <p
                    className={`text-xs mt-1 ${
                      Number(stat.change) >= 0 ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {pct(Number(stat.change))} from last period
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Visits</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeGroupedVisits data={data?.time_grouped_visits ?? []} range={range} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Event Volume</CardTitle>
            </CardHeader>
            <CardContent>
              <EventVolume data={data?.events_timeline ?? []} />
            </CardContent>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.top_pages ?? []).map((p) => {
                  const rel = p.url.replace(/^https?:\/\/[^/]+/, '') || '/';
                  const views = nf(p.views);
                  return (
                    <div key={p.url} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                      <span className="text-sm font-medium truncate max-w-[70%]" title={p.url}>
                        {truncateMiddle(rel, 64)}
                      </span>
                      <span className="text-sm text-muted-foreground">{views} views</span>
                    </div>
                  );
                })}
                {!data?.top_pages?.length && (
                  <div className="text-sm text-muted-foreground py-8 text-center">No page data</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referrers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.referrers ?? []).map((r) => (
                  <div key={r.domain} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                    <span className="text-sm font-medium">{r.domain}</span>
                    <span className="text-sm text-muted-foreground">{nf(r.visitors)} visitors</span>
                  </div>
                ))}
                {!data?.referrers?.length && (
                  <div className="text-sm text-muted-foreground py-8 text-center">No referrer data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Unique vs Returning</CardTitle>
            </CardHeader>
            <CardContent>
              <UniqueReturning data={data?.unique_vs_returning ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceLine
                title="Conversions"
                current={data?.conversions_timeline ?? []}
                previous={data?.conversions_previous_timeline ?? []}
                color="#8b5cf6"
              />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 - Performance quartet */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Impressions</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceLine
                title="Impressions"
                current={data?.impressions_timeline ?? []}
                previous={data?.impressions_previous_timeline ?? []}
                color="#22c55e"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceLine
                title="Clicks"
                current={data?.clicks_timeline ?? []}
                previous={data?.clicks_previous_timeline ?? []}
                color="#3b82f6"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visitors from Search</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceLine
                title="Visitors from Search"
                current={data?.search_visitors_timeline ?? []}
                previous={data?.search_visitors_previous_timeline ?? []}
                color="#f97316"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>All Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceLine
                title="All Visitors"
                current={(data as any)?.unique_visitors_timeline ?? []}
                previous={(data as any)?.previous_unique_visitors_timeline ?? []}
                color="#0ea5e9"
              />
            </CardContent>
          </Card>
        </div>

        {/* Donuts */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Browsers</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut data={data?.browsers ?? []} nameKey="name" valueKey="count" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut data={data?.devices ?? []} nameKey="type" valueKey="count" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>OS</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut data={data?.os ?? []} nameKey="name" valueKey="count" />
            </CardContent>
          </Card>
        </div>

        {/* UTM tables */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>UTM Campaign URLs</CardTitle>
            </CardHeader>
            <CardContent>
              <UTMCampaignsTable rows={data?.utm_campaigns ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>UTM Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <UTMSourcesTable rows={data?.utm_sources ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
