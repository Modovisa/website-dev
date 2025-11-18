// src/pages/admin/Sites.tsx

import { useEffect, useMemo, useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Database,
  Activity,
  AlertCircle,
  TrendingUp,
  Printer,
  FileSpreadsheet,
  FileText,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import { adminSecureFetch } from "@/lib/auth/adminAuth";

type SitesMetrics = {
  total_sites?: number;
  active_24h?: number;
  silent_60m?: number;
  events_24h_total?: number;
  top_site?: {
    domain: string;
    events_24h: number;
  };
};

type SiteRow = {
  id: number;
  domain: string;
  owner_name?: string | null;
  owner_email?: string | null;
  plan_name?: string | null;
  status?: string | null;
  events_24h?: number | null;
  unique_24h?: number | null;
  last_seen?: string | null;
};

type AdminProfile = {
  role?: string | null;
  name?: string | null;
  email?: string | null;
};

function fmtInt(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return Number.isFinite(v) ? v.toLocaleString() : "0";
}

function sinceDHM(minsTotal: number): string {
  const m = Math.max(0, Math.floor(minsTotal || 0));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mi = m % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (mi || parts.length === 0) parts.push(`${mi}m`);
  return parts.join(" ") + " ago";
}

function relFrom(iso?: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const mins = Math.round((Date.now() - t) / 60000);
  return sinceDHM(mins);
}

function capitalizeStatus(s?: string | null): string {
  if (!s) return "Unknown";
  const v = s.toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

function statusBadgeClasses(status?: string | null): string {
  const s = (status || "").toLowerCase();
  if (s === "active") {
    return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  }
  if (s === "paused") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (s === "inactive") {
    return "bg-slate-100 text-slate-700 border border-slate-200";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

const Sites = () => {
  const [metrics, setMetrics] = useState<SitesMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);

  const [isSuperadmin, setIsSuperadmin] = useState(false);

  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");

  const handleUnauthorized = () => {
    // Mirror other admin React routes; adjust if your login path differs
    window.location.href = "/admin/login";
  };

  async function loadAdminProfile() {
    try {
      const res = await adminSecureFetch("/api/admin-me", { method: "GET" });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        console.error("admin-me failed:", res.status);
        return;
      }
      const j: any = await res.json();
      const profile: AdminProfile =
        j && typeof j === "object"
          ? {
              role: j.role ?? j.admin?.role ?? null,
              name: j.name ?? j.admin?.name ?? null,
              email: j.email ?? j.admin?.email ?? null,
            }
          : {};
      const role = (profile.role || "").toLowerCase();
      setIsSuperadmin(role === "superadmin");
    } catch (err) {
      console.error("Failed to load admin profile:", err);
    }
  }

  async function loadMetrics() {
    try {
      setMetricsLoading(true);
      const res = await adminSecureFetch("/api/admin/sites/metrics", {
        method: "GET",
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const j: any = await res.json();
      if (!res.ok) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const t = (j && j.totals) || {};
      setMetrics({
        total_sites: t.total_sites,
        active_24h: t.active_24h,
        silent_60m: t.silent_60m,
        events_24h_total: t.events_24h_total,
        top_site: t.top_site,
      });
    } catch (err) {
      console.error("Sites KPIs failed:", err);
    } finally {
      setMetricsLoading(false);
    }
  }

  async function loadSites() {
    try {
      setSitesLoading(true);
      const res = await adminSecureFetch("/api/admin/sites-list", {
        method: "GET",
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const j: any = await res.json();
      if (!res.ok) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      const rows: any[] = Array.isArray(j.sites)
        ? j.sites
        : Array.isArray(j.data)
        ? j.data
        : [];
      const mapped: SiteRow[] = rows.map((r) => ({
        id: Number(r.id),
        domain: r.domain || "",
        owner_name: r.owner_name ?? null,
        owner_email: r.owner_email ?? null,
        plan_name: r.plan_name ?? null,
        status: r.status ?? "active",
        events_24h:
          r.events_24h != null ? Number(r.events_24h) : (null as number | null),
        unique_24h:
          r.unique_24h != null
            ? Number(r.unique_24h)
            : (null as number | null),
        last_seen: r.last_seen ?? null,
      }));
      setSites(mapped);
    } catch (err) {
      console.error("Sites list failed:", err);
    } finally {
      setSitesLoading(false);
    }
  }

  useEffect(() => {
    // Initial boot: profile (for superadmin), KPIs, sites
    loadAdminProfile();
    loadMetrics();
    loadSites();

    const interval = setInterval(loadMetrics, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // reset page when search or page size changes
    setPage(1);
  }, [search, pageSize]);

  const filteredSites = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sites;
    return sites.filter((s) => {
      const haystack = [
        s.domain,
        s.owner_name,
        s.owner_email,
        s.plan_name,
        s.status,
        s.id?.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sites, search]);

  const totalEntries = filteredSites.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);

  const visibleSites = filteredSites.slice(startIndex, endIndex);

  const stats = useMemo(
    () => [
      {
        key: "total_sites",
        title: "Total Sites",
        subtitle: "All connected projects",
        icon: Database,
        color: "text-primary",
        tooltip: "Total rows in tracking_configs.",
        value:
          metrics && metrics.total_sites != null
            ? fmtInt(metrics.total_sites)
            : metricsLoading
            ? "…"
            : "--",
      },
      {
        key: "active_24h",
        title: "Active (24h)",
        subtitle: "Any activity in last 24h",
        icon: Activity,
        color: "text-success",
        tooltip: "Sites that recorded ≥1 event in the last 24 hours.",
        value:
          metrics && metrics.active_24h != null
            ? fmtInt(metrics.active_24h)
            : metricsLoading
            ? "…"
            : "--",
      },
      {
        key: "silent_60m",
        title: "Silent (≥60m)",
        subtitle: "Potential ingestion issue",
        icon: AlertCircle,
        color: "text-warning",
        tooltip: "Sites whose last_seen is older than 60 minutes.",
        value:
          metrics && metrics.silent_60m != null
            ? fmtInt(metrics.silent_60m)
            : metricsLoading
            ? "…"
            : "--",
      },
      {
        key: "events_24h",
        title: "Events (24h)",
        icon: TrendingUp,
        color: "text-cyan-500",
        tooltip:
          "Sum of visitor_events across all sites in the last 24h.",
        value:
          metrics && metrics.events_24h_total != null
            ? fmtInt(metrics.events_24h_total)
            : metricsLoading
            ? "…"
            : "--",
        subtitle:
          metrics && metrics.top_site
            ? `Top: ${metrics.top_site.domain} (${fmtInt(
                metrics.top_site.events_24h
              )})`
            : "Top: —",
      },
    ],
    [metrics, metricsLoading]
  );

  const handleToggleStatus = async (site: SiteRow) => {
    const current = (site.status || "active").toLowerCase();
    const newStatus = current === "paused" ? "active" : "paused";
    const actionLabel = newStatus === "paused" ? "pause" : "resume";

    const ok = window.confirm(
      `Are you sure you want to ${actionLabel} tracking for site #${site.id}?`
    );
    if (!ok) return;

    const prevStatus = site.status ?? "active";
    // optimistic UI update
    setSites((prev) =>
      prev.map((s) =>
        s.id === site.id ? { ...s, status: newStatus } : s
      )
    );

    try {
      const res = await adminSecureFetch("/api/admin/site-update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id, status: newStatus }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok || j.error) {
        throw new Error(j.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error("Site status update failed:", err);
      // rollback
      setSites((prev) =>
        prev.map((s) =>
          s.id === site.id ? { ...s, status: prevStatus } : s
        )
      );
      alert(
        "❌ Failed to update status: " +
          (err?.message || "Please try again.")
      );
    }
  };

  const handleDeleteSite = async (site: SiteRow) => {
    if (!isSuperadmin) {
      alert("Only superadmin can delete sites.");
      return;
    }
    const ok = window.confirm(
      `Delete site #${site.id}? This cannot be undone.`
    );
    if (!ok) return;

    const prevSites = [...sites];
    // optimistic removal
    setSites((prev) => prev.filter((s) => s.id !== site.id));

    try {
      const res = await adminSecureFetch("/api/admin/site-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: site.id }),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      const j: any = await res.json().catch(() => ({}));
      if (!res.ok || j.error) {
        throw new Error(j.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      console.error("Site delete failed:", err);
      // rollback
      setSites(prevSites);
      alert(
        "❌ Failed to delete site: " +
          (err?.message || "Please try again.")
      );
    }
  };

  const handleViewSite = (site: SiteRow) => {
    // Bootstrap opened an internal admin site-details page.
    // For now, open the actual domain in a new tab (still useful).
    const url =
      site.domain && !site.domain.startsWith("http")
        ? `https://${site.domain}`
        : site.domain;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Grid (KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.key}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-lg ${
                      stat.color === "text-primary"
                        ? "bg-primary/10"
                        : stat.color === "text-success"
                        ? "bg-success/10"
                        : stat.color === "text-warning"
                        ? "bg-warning/10"
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
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sites Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-left">Sites</h2>

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
                    placeholder="Search sites"
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
                        SITE
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        OWNER
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        PLAN
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        STATUS
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground text-center">
                        EVENTS (24H)
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground text-center">
                        VISITORS (24H)
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        LAST SEEN
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitesLoading && visibleSites.length === 0 ? (
                      <tr>
                        <td
                          className="py-6 text-center text-sm text-muted-foreground"
                          colSpan={9}
                        >
                          Loading sites…
                        </td>
                      </tr>
                    ) : visibleSites.length === 0 ? (
                      <tr>
                        <td
                          className="py-6 text-center text-sm text-muted-foreground"
                          colSpan={9}
                        >
                          No sites found.
                        </td>
                      </tr>
                    ) : (
                      visibleSites.map((site) => (
                        <tr
                          key={site.id}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="py-4 pl-2">
                            <input
                              type="checkbox"
                              className="rounded border-input"
                            />
                          </td>
                          <td className="py-4">
                            <div>
                              <p className="font-medium text-sm">
                                {site.domain || "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Site no.: {site.id}
                              </p>
                            </div>
                          </td>
                          <td className="py-4">
                            <div>
                              <p className="font-medium text-sm">
                                {site.owner_name || "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {site.owner_email || "—"}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 text-sm">
                            {site.plan_name || "—"}
                          </td>
                          <td className="py-4">
                            <Badge className={statusBadgeClasses(site.status)}>
                              {capitalizeStatus(site.status)}
                            </Badge>
                          </td>
                          <td className="py-4 text-center text-sm">
                            {fmtInt(site.events_24h)}
                          </td>
                          <td className="py-4 text-center text-sm">
                            {fmtInt(site.unique_24h)}
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">
                            {relFrom(site.last_seen)}
                          </td>
                          <td className="py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleViewSite(site)}
                                >
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(site)}
                                >
                                  {(
                                    site.status || "active"
                                  ).toLowerCase() === "paused"
                                    ? "Resume Tracking"
                                    : "Pause Tracking"}
                                </DropdownMenuItem>
                                {isSuperadmin && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => handleDeleteSite(site)}
                                    >
                                      Delete Site
                                    </DropdownMenuItem>
                                  </>
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
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
                    )
                  )}
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
      </div>
    </AdminLayout>
  );
};

export default Sites;
