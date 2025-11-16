// src/pages/admin/Dashboard.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
} from "lucide-react";
import { secureAdminFetch } from "@/lib/auth/adminAuth";

// 🔽 same chart stack as app dashboard
import { Line } from "react-chartjs-2";
import { chartTheme, useBaseOptions } from "@/components/dashboard/ChartKit";

const API = "https://api.modovisa.com";
const REFRESH_MS = 60_000;
const REFRESH_MRR_MS = 120_000;

type AdminTotals = {
  events_24h?: number;
  unique_visitors_24h?: number;
  new_signups_7d?: number;
  paying_users?: number;
  failed_payments_7d?: number;
  active_users?: number;
  pending_users?: number;
};

type DashboardMetricsResponse = {
  totals?: AdminTotals;
};

type IngestionSilenceItem = {
  domain: string;
  minutes_since: number;
  last_seen: string;
  site_id: number;
};

type DunningItem = {
  email?: string;
  user_id: number;
  fail_count: number;
  last_failed: string;
};

type OpsQueueResponse = {
  ingestion_silence?: IngestionSilenceItem[];
  dunning?: DunningItem[];
};

type MrrPoint = {
  month: string;
  mrr: number;
};

type MrrSeriesResponse = {
  points?: MrrPoint[];
};

function safeGetLocalTz(): string {
  if (typeof window === "undefined") return "Asia/Kolkata";
  try {
    return localStorage.getItem("mv_admin_tz") || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

function setLocalTz(tz: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("mv_admin_tz", tz);
  } catch {
    // ignore
  }
}

function tzShortLabel(tz: string) {
  if (tz === "Asia/Kolkata") return "IST";
  if (tz === "UTC") return "UTC";
  return tz;
}

function fmtAgoFromMinutes(mins: number | null | undefined) {
  const m = Math.max(0, Math.floor(Number(mins) || 0));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h && r) return `${h}h ${r}m ago`;
  if (h) return `${h}h ago`;
  return `${r}m ago`;
}

function fmtUtc(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString();
}

const tzOptions = [
  { value: "Asia/Kolkata", label: "IST (Asia/Kolkata)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
];

const AdminDashboard = () => {
  const [tz, setTz] = useState<string>(safeGetLocalTz);
  const [totals, setTotals] = useState<AdminTotals | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  const [ingestion, setIngestion] = useState<IngestionSilenceItem[]>([]);
  const [dunning, setDunning] = useState<DunningItem[]>([]);
  const [opsLoading, setOpsLoading] = useState(false);

  const [mrrMonths, setMrrMonths] = useState<number>(12);
  const [mrrPoints, setMrrPoints] = useState<MrrPoint[]>([]);
  const [mrrLoading, setMrrLoading] = useState(false);

  // shared chart options baseline (same as app charts)
  const baseChartOptions = useBaseOptions({
    yBeginAtZero: true,
    showLegend: false,
  });

  // ── Load KPIs (respecting TZ) ──────────────────────────────────────────────
  const loadKpis = useCallback(async (tzValue: string) => {
    setKpiLoading(true);
    try {
      const url = `${API}/api/admin/dashboard-metrics?window=calendar&tz=${encodeURIComponent(
        tzValue,
      )}&_=${Date.now()}`;
      const res = await secureAdminFetch(url, {
        method: "GET",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as DashboardMetricsResponse;
      setTotals(json.totals ?? {});
    } catch (e) {
      console.warn("[admin dashboard] loadKpis error:", e);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  // ── Load Action Center ─────────────────────────────────────────────────────
  const loadActionCenter = useCallback(async () => {
    setOpsLoading(true);
    try {
      const url = `${API}/api/admin/ops-queue`;
      const res = await secureAdminFetch(url, {
        method: "GET",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as OpsQueueResponse;
      setIngestion(
        Array.isArray(json.ingestion_silence) ? json.ingestion_silence : [],
      );
      setDunning(Array.isArray(json.dunning) ? json.dunning : []);
    } catch (e) {
      console.warn("[admin dashboard] loadActionCenter error:", e);
    } finally {
      setOpsLoading(false);
    }
  }, []);

  // ── Load MRR series ───────────────────────────────────────────────────────
  const loadMrr = useCallback(async (months: number) => {
    const clamped = Math.max(1, Math.min(36, Number(months || 12)));
    setMrrLoading(true);
    try {
      const url = `${API}/api/admin/mrr-series?months=${clamped}`;
      const res = await secureAdminFetch(url, {
        method: "GET",
        cache: "no-store",
      });
      const json = (await res.json().catch(() => ({}))) as MrrSeriesResponse;
      // keep old data if BE returns null/undefined
      const pts = Array.isArray(json.points) ? json.points : [];
      setMrrPoints(pts);
    } catch (e) {
      console.warn("[admin dashboard] loadMrr error:", e);
    } finally {
      setMrrLoading(false);
    }
  }, []);

  // Initial + interval refresh for KPIs + Action Center
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await loadKpis(tz);
      if (cancelled) return;
      await loadActionCenter();
    };

    run();

    const timer = setInterval(run, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tz, loadKpis, loadActionCenter]);

  // Initial + interval refresh for MRR
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await loadMrr(mrrMonths);
    };

    run();
    const timer = setInterval(run, REFRESH_MRR_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mrrMonths, loadMrr]);

  // ── Derived KPI values ────────────────────────────────────────────────────
  const eventsToday = totals?.events_24h ?? totals?.unique_visitors_24h;
  const newSignups7d = totals?.new_signups_7d;
  const activeSubs = totals?.paying_users;
  const failedPayments7d = totals?.failed_payments_7d;

  const eventsSubtitle = useMemo(
    () => `(Today, ${tzShortLabel(tz)})`,
    [tz],
  );

  // ── MRR chart data/options (Chart.js) ─────────────────────────────────────
  const mrrLabels = useMemo(
    () => mrrPoints.map((p) => p.month),
    [mrrPoints],
  );
  const mrrValues = useMemo(
    () => mrrPoints.map((p) => Number(p.mrr || 0)),
    [mrrPoints],
  );

  const mrrChartData = useMemo(
    () => ({
      labels: mrrLabels,
      datasets: [
        {
          label: "MRR",
          data: mrrValues.slice(),
          borderColor: chartTheme.info,
          backgroundColor: chartTheme.info,
          tension: 0.35,
          borderWidth: 2,
          fill: false,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBorderWidth: 2,
          pointBackgroundColor: chartTheme.info,
          pointBorderColor: "#ffffff",
          spanGaps: true,
        },
      ],
    }),
    [mrrLabels, mrrValues],
  );

  const mrrChartOptions = useMemo(
    () =>
      ({
        ...baseChartOptions,
        interaction: { mode: "index" as const, intersect: false },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            grid: { color: chartTheme.grid },
          },
        },
        plugins: {
          ...baseChartOptions.plugins,
          legend: { display: false },
          tooltip: { mode: "index" as const, intersect: false },
        },
        maintainAspectRatio: false,
      } as const),
    [baseChartOptions],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* KPIs row (5 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Events Today */}
          <Card className="h-full">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-semibold text-foreground">
                    Events Today
                  </h5>
                  <div className="flex items-baseline gap-2 my-1">
                    <p className="text-3xl font-bold">
                      {kpiLoading ? "…" : formatNumber(eventsToday)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {eventsSubtitle}
                  </p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Signups */}
          <Card className="h-full">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-semibold text-foreground">
                    New Signups
                  </h5>
                  <div className="flex items-baseline gap-2 my-1">
                    <p className="text-3xl font-bold">
                      {kpiLoading ? "…" : formatNumber(newSignups7d)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/10">
                  <UserPlus className="h-5 w-5 text-sky-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Subscriptions */}
          <Card className="h-full">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-semibold text-foreground">
                    Active Subscriptions
                  </h5>
                  <div className="flex items-baseline gap-2 my-1">
                    <p className="text-3xl font-bold">
                      {kpiLoading ? "…" : formatNumber(activeSubs)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stripe status = active
                  </p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Failed Payments */}
          <Card className="h-full">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h5 className="text-sm font-semibold text-foreground">
                    Failed Payments
                  </h5>
                  <div className="flex items-baseline gap-2 my-1">
                    <p className="text-3xl font-bold">
                      {kpiLoading ? "…" : formatNumber(failedPayments7d)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timezone selector */}
          <Card className="h-full">
            <CardContent className="pt-6 pb-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-foreground">
                      Timezone
                    </h5>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for calendar-day KPIs
                  </p>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              <div className="mt-4">
                <Select
                  value={tz}
                  onValueChange={(value) => {
                    setTz(value);
                    setLocalTz(value);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {tzOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Center + MRR Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Action Center */}
          <Card className="h-full min-h-[440px]">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Action Center</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Live platform signals
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ingestion Health */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      Ingestion Health (last 60m)
                    </h4>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Badge variant="secondary">
                    {opsLoading ? "…" : ingestion.length.toString()}
                  </Badge>
                </div>

                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {opsLoading && !ingestion.length ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Loading ingestion signals…
                    </div>
                  ) : ingestion.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      All clear in the last 60 minutes.
                    </div>
                  ) : (
                    ingestion.map((item) => {
                      const sev = item.minutes_since >= 180 ? "danger" : "warning";
                      const badgeVariant =
                        sev === "danger" ? "destructive" : "outline";
                      return (
                        <div
                          key={`${item.site_id}-${item.domain}`}
                          className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 text-sm"
                          title={`Last seen: ${fmtUtc(
                            item.last_seen,
                          )} • Quiet ${item.minutes_since}m • site_id ${
                            item.site_id
                          }`}
                        >
                          <span className="truncate flex-1">{item.domain}</span>
                          <div className="flex items-center gap-2 ml-3">
                            <span className="text-xs text-muted-foreground">
                              {fmtAgoFromMinutes(item.minutes_since)}
                            </span>
                            <Badge
                              variant={badgeVariant}
                              className="text-[10px] capitalize"
                            >
                              silent
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Dunning & At-Risk Accounts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold">
                      Dunning &amp; At-Risk Accounts
                    </h4>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Badge variant="secondary">
                    {opsLoading ? "…" : dunning.length.toString()}
                  </Badge>
                </div>

                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {opsLoading && !dunning.length ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Loading dunning signals…
                    </div>
                  ) : dunning.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No accounts in dunning right now.
                    </div>
                  ) : (
                    dunning.map((d) => {
                      const who = d.email || `user#${d.user_id}`;
                      const sev = d.fail_count >= 2 ? "danger" : "warning";
                      const badgeText =
                        sev === "danger" ? "at risk" : "attention";
                      const badgeVariant =
                        sev === "danger" ? "destructive" : "outline";
                      const failClass =
                        sev === "danger"
                          ? "text-destructive"
                          : "text-muted-foreground";

                      return (
                        <div
                          key={`${d.user_id}-${d.last_failed}`}
                          className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 text-sm"
                          title={`Last failed: ${fmtUtc(
                            d.last_failed,
                          )} • Failures: ${d.fail_count} • user_id ${
                            d.user_id
                          }`}
                        >
                          <span className="truncate flex-1">{who}</span>
                          <div className="flex items-center gap-2 ml-3">
                            <span className={`text-xs ${failClass}`}>
                              {d.fail_count} failed
                            </span>
                            <Badge
                              variant={badgeVariant}
                              className="text-[10px] capitalize"
                            >
                              {badgeText}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MRR Growth */}
          <Card className="h-full min-h-[440px]">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">MRR Growth</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Monthly Recurring Revenue
                </p>
              </div>
              <Select
                value={String(mrrMonths)}
                onValueChange={(v) => setMrrMonths(Number(v || 12))}
              >
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                  <SelectItem value="24">Last 24 months</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {mrrLoading && !mrrPoints.length ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  Loading MRR…
                </div>
              ) : !mrrPoints.length ? (
                <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                  No MRR data for the selected range.
                </div>
              ) : (
                <div className="h-72">
                  <Line data={mrrChartData} options={mrrChartOptions} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
