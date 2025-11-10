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
import { nf, pct, truncateMiddle } from '@/lib/format';

// NOTE: Keep ECharts only for the world map & calendar later.
// Everything else will be Recharts components we add one-by-one.

export default function Dashboard() {
  // ── Controls
  const [siteId, setSiteId] = useState<number | null>(() => {
    const saved = localStorage.getItem('current_website_id');
    return saved ? Number(saved) : null;
  });
  const [range, setRange] = useState<RangeKey>('24h');

  // ── Data
  const { data, isLoading, refetch } = useDashboardData({ siteId: siteId ?? undefined, range });
  const qc = useQueryClient();

  // ── Live WS
  const [liveCount, setLiveCount] = useState<number | null>(null);
  useLiveVisitorsWS({
    siteId: siteId ?? undefined,
    onLiveCount: (n) => setLiveCount(n),
    onDashboardSnapshot: (payload: DashboardPayload) => {
      // Optional: if snapshot range matches, optimistically update cache
      if (payload?.range === range) {
        qc.setQueryData(['dashboard', siteId, range], (old: any) => ({ ...(old || {}), ...payload }));
      }
    },
    getTicket: async (sid) => {
      const res = await fetch('https://api.modovisa.com/api/ws-ticket', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: sid }),
      });
      if (!res.ok) throw new Error('ticket');
      const j = await res.json();
      return j.ticket as string;
    },
  });

  // ── Fake “your sites” list (replace with your real source)
  const sites = useMemo(
    () =>
      JSON.parse(localStorage.getItem('mv.sites') || '[]') as { id: number; name: string }[],
    []
  );

  useEffect(() => {
    // fallback: if no local cache, ask a minimal endpoint and cache
    if (!sites.length) {
      (async () => {
        try {
          const r = await fetch('https://api.modovisa.com/api/tracking-websites', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          const j = await r.json();
          const arr = (j?.projects || []).map((p: any) => ({ id: p.id, name: p.website_name }));
          localStorage.setItem('mv.sites', JSON.stringify(arr));
          if (!siteId && arr[0]) setSiteId(arr[0].id);
        } catch {}
      })();
    } else if (!siteId && sites[0]) {
      setSiteId(sites[0].id);
    }
  }, [sites, siteId]);

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
              value={siteId ? String(siteId) : undefined}
              onValueChange={(v) => {
                const n = Number(v);
                setSiteId(n);
                localStorage.setItem('current_website_id', String(n));
                refetch();
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Choose Website" />
              </SelectTrigger>
              <SelectContent>
                {sites.map(s => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                ))}
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

            <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
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
                <div className="text-3xl font-bold">{typeof stat.value === 'number' ? nf(stat.value) : stat.value}</div>
                {stat.change != null && (
                  <p className={`text-xs mt-1 ${Number(stat.change) >= 0 ? 'text-success' : 'text-destructive'}`}>
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
            <CardHeader><CardTitle>Visits</CardTitle></CardHeader>
            <CardContent>
              <TimeGroupedVisits data={data?.time_grouped_visits ?? []} range={range} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Event Volume</CardTitle></CardHeader>
            <CardContent>
              <EventVolume data={data?.events_timeline ?? []} />
            </CardContent>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Top Pages</CardTitle></CardHeader>
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
            <CardHeader><CardTitle>Referrers</CardTitle></CardHeader>
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

        {/* TODO (next drops):
            - Unique vs Returning (AreaChart)
            - 4x Performance lines with previous (LineChart)
            - Donuts (PieChart) for browsers/devices/os
            - UTM tables
            - Calendar heatmap (keep with ECharts or @nivo/calendar)
            - World map (keep ECharts)
        */}
      </div>
    </DashboardLayout>
  );
}
