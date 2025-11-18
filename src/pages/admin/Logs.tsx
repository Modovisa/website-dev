// src/pages/admin/Logs.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  AlertTriangle,
  Radio,
  XCircle,
  Printer,
  FileSpreadsheet,
  FileText,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import { adminSecureFetch } from "@/lib/auth/adminAuth";

type LogsMetrics = {
  errors_24h?: number;
  warnings_24h?: number;
  api_requests_24h?: number;
  failed_webhooks_24h?: number;
  top_error_source?: string;
  top_warn_source?: string;
  error_rate_pct?: string | number;
};

type LogRow = {
  id: number;
  ts?: string | null;
  level?: string | null;
  source?: string | null;
  message?: string | null;
  meta_json?: string | null;
  ray_id?: string | null;
};

type ArchiveRow = {
  key: string;
  size: number;
  uploaded: string;
};

function fmtInt(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v.toLocaleString() : "0";
}

function fmtBytes(n: number = 0): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let x = Number(n);
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  const fixed = x < 10 && i ? x.toFixed(1) : x.toFixed(0);
  return `${fixed} ${units[i]}`;
}

function fmtIso(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function shortTs(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function levelBadgeClasses(level?: string | null): string {
  const v = (level || "").toLowerCase();
  if (v === "error") {
    return "bg-red-100 text-red-800 border border-red-200";
  }
  if (v === "warn" || v === "warning") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (v === "info") {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function normalizeLevel(level?: string | null): string {
  const v = (level || "").toLowerCase();
  if (!v) return "info";
  if (v === "warn") return "warning";
  return v;
}

function cfInvestigateRoot() {
  const to = "/:account/workers-and-pages/observability/investigate";
  return `https://dash.cloudflare.com/?to=${encodeURIComponent(to)}`;
}

const BATCH_LIMIT = 100;

const Logs = () => {
  // KPIs
  const [metrics, setMetrics] = useState<LogsMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Logs
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsMoreLoading, setLogsMoreLoading] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);

  // Archives
  const [archives, setArchives] = useState<ArchiveRow[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(false);
  const [archivesSupported, setArchivesSupported] = useState(true);

  // Table UI
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");

  // Metadata modal
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [metaDialogContent, setMetaDialogContent] = useState("");

  const archivesCardRef = useRef<HTMLDivElement | null>(null);

  const handleUnauthorized = () => {
    window.location.href = "/admin/login";
  };

  // admin-me just to prime access like the Bootstrap version
  const loadAdminProfile = async () => {
    try {
      const res = await adminSecureFetch("/api/admin-me", { method: "GET" });
      if (res.status === 401) {
        handleUnauthorized();
        return null;
      }
      if (!res.ok) {
        console.warn("admin-me failed", res.status);
        return null;
      }
      return await res.json();
    } catch (err) {
      console.warn("admin-me error:", err);
      return null;
    }
  };

  const loadMetrics = async () => {
    try {
      setMetricsLoading(true);
      const res = await adminSecureFetch("/api/admin/logs/metrics", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      const t = json?.totals || {};
      setMetrics({
        errors_24h: t.errors_24h,
        warnings_24h: t.warnings_24h,
        api_requests_24h: t.api_requests_24h,
        failed_webhooks_24h: t.failed_webhooks_24h,
        top_error_source: t.top_error_source,
        top_warn_source: t.top_warn_source,
        error_rate_pct: t.error_rate_pct,
      });
    } catch (err) {
      console.warn("logs/metrics failed:", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const mapLogsResponse = (json: any): { rows: LogRow[]; next: number | null } => {
    const rowsSrc: any[] = Array.isArray(json?.logs)
      ? json.logs
      : Array.isArray(json)
      ? json
      : [];
    const rows: LogRow[] = rowsSrc.map((r) => ({
      id: Number(r.id),
      ts: r.ts ?? r.created_at ?? null,
      level: r.level ?? null,
      source: r.source ?? null,
      message: r.message ?? null,
      meta_json: r.meta_json ?? null,
      ray_id: r.ray_id ?? null,
    }));
    const next =
      typeof json?.next_offset !== "undefined" && json.next_offset !== null
        ? Number(json.next_offset)
        : null;
    return { rows, next };
  };

  const loadLogsInitial = async () => {
    try {
      setLogsLoading(true);
      setPage(1);
      const res = await adminSecureFetch(
        `/api/admin/logs/list?limit=${BATCH_LIMIT}&offset=0`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("logs/list failed", res.status, json);
        setLogs([]);
        setNextOffset(null);
        return;
      }
      const { rows, next } = mapLogsResponse(json);
      setLogs(rows);
      setNextOffset(next);
    } catch (err) {
      console.error("logs initial load error", err);
      setLogs([]);
      setNextOffset(null);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadMoreLogs = async () => {
    if (nextOffset == null || logsMoreLoading) return;
    try {
      setLogsMoreLoading(true);
      const res = await adminSecureFetch(
        `/api/admin/logs/list?limit=${BATCH_LIMIT}&offset=${nextOffset}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("logs more failed", res.status, json);
        return;
      }
      const { rows, next } = mapLogsResponse(json);
      if (rows.length) {
        setLogs((prev) => [...prev, ...rows]);
      }
      setNextOffset(next);
    } catch (err) {
      console.error("logs more load error", err);
    } finally {
      setLogsMoreLoading(false);
    }
  };

  const loadArchives = async () => {
    try {
      setArchivesLoading(true);
      const res = await adminSecureFetch("/api/admin/logs/archives", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json: any = await res.json().catch(() => ({}));

      if (!res.ok) {
        setArchivesSupported(false);
        console.error("archives failed", res.status, json);
        setArchives([]);
        return;
      }

      const arr: any[] = Array.isArray(json?.objects) ? json.objects : [];
      const mapped: ArchiveRow[] = arr.map((o) => ({
        key: o.key,
        size: Number(o.size || 0),
        uploaded: o.uploaded,
      }));
      setArchivesSupported(true);
      setArchives(mapped);
    } catch (err) {
      console.warn("archives load error", err);
      setArchivesSupported(false);
      setArchives([]);
    } finally {
      setArchivesLoading(false);
    }
  };

  const purgeOnly = async (days: number) => {
    try {
      const res = await adminSecureFetch("/api/admin/logs/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ older_than_days: Number(days) }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      alert(`Purged ${json?.deleted ?? 0} rows (no archive created).`);
      await loadMetrics();
      await loadLogsInitial();
      await loadArchives();
    } catch (err: any) {
      alert("Purge failed: " + (err?.message || "Unknown error"));
    }
  };

  const archiveOrFallback = async (days: number, purge: boolean) => {
    try {
      const res = await adminSecureFetch("/api/admin/logs/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          older_than_days: Number(days),
          purge: !!purge,
        }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }

      const msg = purge
        ? `Archived: ${json.key}\nDeleted: ${json.deleted} rows`
        : `Archived to: ${json.key}`;
      alert(msg);

      await loadMetrics();
      await loadLogsInitial();
      await loadArchives();
    } catch (err: any) {
      const isInternal =
        /HTTP 500|internal/i.test(err?.message || "") || !archivesSupported;

      if (isInternal && !purge) {
        const go = window.confirm(
          "Archive storage is unavailable right now (internal error).\n" +
            `Do you want to purge logs older than ${days} day(s) WITHOUT archiving?`
        );
        if (go) {
          return purgeOnly(days);
        }
      }

      alert("Archive failed: " + (err?.message || "Unknown error"));
    }
  };

  const handleArchiveOlder = (days: number) => {
    const ok = window.confirm(
      `Archive logs older than ${days} day(s)?`
    );
    if (!ok) return;
    archiveOrFallback(days, false);
  };

  const handleArchiveAndPurgeOlder = (days: number) => {
    const ok = window.confirm(
      `Archive & DELETE logs older than ${days} day(s)?`
    );
    if (!ok) return;
    archiveOrFallback(days, true);
  };

  const handleOpenArchivesSection = () => {
    loadArchives();
    archivesCardRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDownloadArchive = async (archive: ArchiveRow) => {
    try {
      const res = await adminSecureFetch(
        `/api/admin/logs/archive?key=${encodeURIComponent(archive.key)}`,
        {
          method: "GET",
        }
      );
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        const json: any = await res.json().catch(() => ({}));
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const parts = archive.key.split("/");
      a.href = url;
      a.download = parts[parts.length - 1] || "logs-archive.gz";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Download failed: " + (err?.message || "Unknown error"));
    }
  };

  const handleDeleteArchive = async (archive: ArchiveRow) => {
    const ok = window.confirm(
      `Delete archive?\n\n${archive.key}`
    );
    if (!ok) return;
    try {
      const res = await adminSecureFetch(
        `/api/admin/logs/archive?key=${encodeURIComponent(archive.key)}`,
        { method: "DELETE" }
      );
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const json: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || `HTTP ${res.status}`);
      }
      await loadArchives();
    } catch (err: any) {
      alert("Delete failed: " + (err?.message || "Unknown error"));
    }
  };

  const handleViewMeta = (raw: string | null | undefined) => {
    if (!raw) {
      setMetaDialogContent("No metadata.");
      setMetaDialogOpen(true);
      return;
    }
    let display = raw;
    try {
      const parsed = JSON.parse(raw);
      display = JSON.stringify(parsed, null, 2);
    } catch {
      // keep as-is if not valid JSON
    }
    setMetaDialogContent(display);
    setMetaDialogOpen(true);
  };

  const handleCopyRayId = (rayId?: string | null) => {
    if (!rayId) return;
    navigator.clipboard.writeText(rayId).catch(() => {});
  };

  const handleCopyMeta = (meta?: string | null) => {
    if (!meta) return;
    navigator.clipboard.writeText(meta).catch(() => {});
  };

  useEffect(() => {
    // initial boot: prime admin, then just rely on 401 checks everywhere
    loadAdminProfile();
    loadMetrics();
    loadLogsInitial();
    loadArchives();

    const id = setInterval(loadMetrics, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((log) => {
      const buf = [
        log.ts,
        log.level,
        log.source,
        log.message,
        log.meta_json,
        log.ray_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return buf.includes(q);
    });
  }, [logs, search]);

  const totalEntries = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const visibleLogs = filteredLogs.slice(startIndex, endIndex);

  const stats = useMemo(
    () => [
      {
        key: "errors",
        title: "Errors (24h)",
        icon: AlertCircle,
        color: "text-destructive",
        tooltip:
          "app_logs rows with level=error since 00:00 UTC",
        value:
          metrics && metrics.errors_24h != null
            ? fmtInt(metrics.errors_24h)
            : metricsLoading
            ? "…"
            : "—",
        subtitle:
          metrics && metrics.top_error_source
            ? `Top source: ${metrics.top_error_source}`
            : "Top source: —",
      },
      {
        key: "warnings",
        title: "Warnings (24h)",
        icon: AlertTriangle,
        color: "text-warning",
        tooltip:
          "app_logs rows with level=warn since 00:00 UTC",
        value:
          metrics && metrics.warnings_24h != null
            ? fmtInt(metrics.warnings_24h)
            : metricsLoading
            ? "…"
            : "—",
        subtitle:
          metrics && metrics.top_warn_source
            ? `Top source: ${metrics.top_warn_source}`
            : "Top source: —",
      },
      {
        key: "requests",
        title: "API Requests (24h)",
        icon: Radio,
        color: "text-primary",
        tooltip:
          "Count of app_logs where source like 'cf-worker-event'",
        value:
          metrics && metrics.api_requests_24h != null
            ? fmtInt(metrics.api_requests_24h)
            : metricsLoading
            ? "…"
            : "—",
        subtitle:
          metrics && metrics.error_rate_pct != null
            ? `Error rate: ${metrics.error_rate_pct}`
            : "Error rate: —",
      },
      {
        key: "webhooks",
        title: "Failed Webhooks (24h)",
        icon: XCircle,
        color: "text-cyan-500",
        tooltip:
          "Stripe/outbound failures today (UTC)",
        value:
          metrics && metrics.failed_webhooks_24h != null
            ? fmtInt(metrics.failed_webhooks_24h)
            : metricsLoading
            ? "…"
            : "—",
        subtitle: "Stripe/non-2xx",
      },
    ],
    [metrics, metricsLoading]
  );

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.key}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-lg ${
                      stat.color === "text-destructive"
                        ? "bg-destructive/10"
                        : stat.color === "text-warning"
                        ? "bg-warning/10"
                        : stat.color === "text-primary"
                        ? "bg-primary/10"
                        : "bg-cyan-500/10"
                    }`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <button
                    className="text-muted-foreground hover:text-foreground"
                    title={stat.tooltip}
                    type="button"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Application Logs */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Application Logs
                </h2>

                {/* Actions dropdown (archive, purge, open archives) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" type="button">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleArchiveOlder(7)}
                    >
                      Archive older than 7 days
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleArchiveAndPurgeOlder(30)}
                    >
                      Archive + Purge older than 30 days
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleOpenArchivesSection}
                    >
                      Open Archives section
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search logs"
                    className="w-full sm:w-64"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" type="button">
                        <svg
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 pl-2">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          disabled
                        />
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        TIME
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        LEVEL
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        SOURCE
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        MESSAGE
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        META
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading && visibleLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          Loading logs…
                        </td>
                      </tr>
                    ) : visibleLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No logs found.
                        </td>
                      </tr>
                    ) : (
                      visibleLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-3 pl-2">
                            <input
                              type="checkbox"
                              className="rounded border-input"
                            />
                          </td>
                          <td className="py-3 text-xs whitespace-nowrap">
                            {shortTs(log.ts)}
                          </td>
                          <td className="py-3">
                            <Badge
                              className={`text-xs ${levelBadgeClasses(
                                log.level
                              )}`}
                            >
                              {normalizeLevel(log.level)}
                            </Badge>
                          </td>
                          <td className="py-3 text-xs max-w-[220px] truncate">
                            {log.source || "—"}
                          </td>
                          <td className="py-3 text-xs max-w-[360px] truncate">
                            {log.message || "—"}
                          </td>
                          <td className="py-3 text-xs">
                            {log.meta_json ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-xs"
                                onClick={() =>
                                  handleViewMeta(log.meta_json)
                                }
                              >
                                View
                              </Button>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    window.open(
                                      cfInvestigateRoot(),
                                      "_blank",
                                      "noopener,noreferrer"
                                    );
                                  }}
                                >
                                  Open Logs (Investigate)
                                </DropdownMenuItem>
                                {log.ray_id && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCopyRayId(log.ray_id)
                                    }
                                  >
                                    Copy Ray ID
                                  </DropdownMenuItem>
                                )}
                                {log.meta_json && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleCopyMeta(log.meta_json)
                                    }
                                  >
                                    Copy metadata
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {nextOffset !== null && (
                <div className="flex justify-center pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreLogs}
                    disabled={logsMoreLoading}
                  >
                    {logsMoreLoading ? "Loading more…" : "Load more"}
                  </Button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-sm gap-4">
                <span className="text-muted-foreground">
                  {totalEntries === 0
                    ? "Showing 0 entries"
                    : `Showing ${startIndex + 1} to ${endIndex} of ${totalEntries} entries`}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clampedPage === 1}
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                  >
                    &lt;
                  </Button>
                  {Array.from(
                    { length: totalPages },
                    (_, i) => i + 1
                  ).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={
                        p === clampedPage ? "default" : "outline"
                      }
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={clampedPage === totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    &gt;
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archives */}
        <Card ref={archivesCardRef}>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Archives</h2>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={loadArchives}
                >
                  Refresh
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        KEY
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground text-right">
                        SIZE
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        UPLOADED
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground text-right">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivesLoading ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-4 text-sm text-muted-foreground text-center"
                        >
                          Loading archives…
                        </td>
                      </tr>
                    ) : !archivesSupported ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-4 text-sm text-destructive text-center"
                        >
                          Archive listing failed or is unavailable.
                        </td>
                      </tr>
                    ) : archives.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-4 text-sm text-muted-foreground text-center"
                        >
                          No archives yet.
                        </td>
                      </tr>
                    ) : (
                      archives.map((archive) => (
                        <tr
                          key={archive.key}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 text-xs font-mono max-w-[420px] truncate">
                            {archive.key}
                          </td>
                          <td className="py-3 text-sm text-right whitespace-nowrap">
                            {fmtBytes(archive.size)}
                          </td>
                          <td className="py-3 text-sm">
                            {fmtIso(archive.uploaded)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="inline-flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                type="button"
                                onClick={() =>
                                  handleDownloadArchive(archive)
                                }
                              >
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs text-destructive border-destructive"
                                type="button"
                                onClick={() =>
                                  handleDeleteArchive(archive)
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta JSON viewer */}
      <Dialog
        open={metaDialogOpen}
        onOpenChange={setMetaDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log metadata</DialogTitle>
          </DialogHeader>
          <pre className="bg-muted p-3 rounded border text-xs whitespace-pre-wrap break-words mb-0">
            {metaDialogContent || "No metadata."}
          </pre>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Logs;
