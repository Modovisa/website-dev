// src/pages/admin/AdminUsers.tsx

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Shield, UserCheck, Lock, Activity, MoreVertical } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { apiBase } from "@/lib/api";
import { adminSecureFetch } from "@/lib/auth/adminAuth";

type AdminMetrics = {
  total_admins: number;
  active_admins: number;
  twofa_enabled: number;
  admin_actions_24h: number;
};

type AdminUserRow = {
  id: number;
  name: string | null;
  email: string | null;
  roles: string | null; // comma-separated
  created_at: string | null;
  last_login_at: string | null;
  status: string | null;
};

type AdminProfile = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

type AdminRoleOption = {
  name: string;
};

const API = apiBase();

function handleUnauthorized() {
  try {
    (window as any).showSessionExpiredModal?.();
  } catch {
    // ignore
  }
  window.location.href = "/mv-admin/login.html";
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await adminSecureFetch(`${API}${path}`, init);
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("unauthorized");
  }
  return res;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLastLogin(iso: string | null | undefined): { label: string; stale: boolean } {
  if (!iso) return { label: "—", stale: false };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { label: "—", stale: false };

  const label = formatDate(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (Number.isNaN(days)) return { label, stale: false };
  return { label, stale: days > 30 };
}

function initialsFromName(name: string | null | undefined): string {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return initials.slice(0, 2) || "AD";
}

function humanRoleLabel(role: string): string {
  return role
    .replace(/_/g, " ")
    .split(" ")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

const AdminUsers = () => {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAdmin, setCurrentAdmin] = useState<AdminProfile | null>(null);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState(0);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [role, setRole] = useState<string>("");
  const [roles, setRoles] = useState<AdminRoleOption[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const isSuperadmin =
    currentAdmin?.role && currentAdmin.role.toLowerCase() === "superadmin";

  // -------- Load admin profile, metrics, users, roles ----------
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      try {
        // 1) Current admin profile (/api/admin-me)
        const meRes = await adminFetch("/api/admin-me", { method: "GET" });
        const meJson = (await meRes.json().catch(() => ({}))) as AdminProfile;
        if (cancelled) return;
        setCurrentAdmin(meJson);

        // 2) Metrics
        const metricsRes = await adminFetch("/api/admin/admin-users/metrics", {
          method: "GET",
        });
        const metricsJson = await metricsRes.json().catch(() => ({}));
        if (!cancelled) {
          setMetrics(metricsJson?.metrics ?? null);
        }

        // 3) Users
        await refreshUsers(cancelled);

        // 4) Admin roles dropdown
        const rolesRes = await adminFetch("/api/dropdown/admin-user-roles", {
          method: "GET",
        });
        const rolesJson = await rolesRes.json().catch(() => ({}));
        if (!cancelled) {
          setRoles(Array.isArray(rolesJson.roles) ? rolesJson.roles : []);
        }
      } catch (err) {
        if ((err as Error)?.message === "unauthorized") return;
        // Log but don't flip to error UI for now
        console.error("[AdminUsers] init failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function refreshUsers(cancel: boolean) {
      const usersRes = await adminFetch("/api/admin/admin-users", {
        method: "GET",
      });
      const usersJson = await usersRes.json().catch(() => ({}));
      if (cancel) return;

      let rows: AdminUserRow[] = [];
      if (Array.isArray(usersJson.users)) rows = usersJson.users;
      else if (Array.isArray(usersJson.data)) rows = usersJson.data;
      setUsers(rows);
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  // separate function for reuse after actions
  const reloadMetrics = async () => {
    try {
      const res = await adminFetch("/api/admin/admin-users/metrics", {
        method: "GET",
      });
      const json = await res.json().catch(() => ({}));
      setMetrics(json?.metrics ?? null);
    } catch (err) {
      if ((err as Error)?.message === "unauthorized") return;
      console.error("[AdminUsers] reloadMetrics failed:", err);
    }
  };

  const reloadUsers = async () => {
    try {
      const res = await adminFetch("/api/admin/admin-users", { method: "GET" });
      const json = await res.json().catch(() => ({}));
      let rows: AdminUserRow[] = [];
      if (Array.isArray(json.users)) rows = json.users;
      else if (Array.isArray(json.data)) rows = json.data;
      setUsers(rows);
    } catch (err) {
      if ((err as Error)?.message === "unauthorized") return;
      console.error("[AdminUsers] reloadUsers failed:", err);
    }
  };

  // -------- Filtering + pagination ----------
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const roles = (u.roles || "").toLowerCase();
      return (
        name.includes(term) || email.includes(term) || roles.includes(term)
      );
    });
  }, [search, users]);

  const totalEntries = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const currentPage = Math.min(page, totalPages - 1);

  const pageUsers = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const fromEntry = totalEntries === 0 ? 0 : currentPage * pageSize + 1;
  const toEntry = Math.min(totalEntries, (currentPage + 1) * pageSize);

  // -------- Metrics cards ----------
  const totalAdmins = metrics?.total_admins ?? 0;
  const activeAdmins = metrics?.active_admins ?? 0;
  const twofaEnabled = metrics?.twofa_enabled ?? 0;
  const actions24h = metrics?.admin_actions_24h ?? 0;
  const twofaPercent =
    totalAdmins > 0 ? Math.round((twofaEnabled / totalAdmins) * 100) : 0;

  const showTwofaBanner =
    totalAdmins > 0 && twofaEnabled < totalAdmins && !loading;

  const stats = [
    {
      title: "Total Admins",
      value: loading ? "—" : String(totalAdmins),
      subtitle: "All roles",
      icon: Shield,
      color: "text-primary",
      tooltip: "Total accounts in admin_users.",
    },
    {
      title: "Active Admins",
      value: loading ? "—" : String(activeAdmins),
      subtitle: "Can sign in now",
      icon: UserCheck,
      color: "text-emerald-500",
      tooltip: "Status = active.",
    },
    {
      title: "2FA Coverage",
      value: loading ? "—/—" : `${twofaEnabled}/${totalAdmins || "—"}`,
      subtitle: "We recommend ≥ 100%",
      icon: Lock,
      color: "text-amber-500",
      tooltip: "Admins with two-factor authentication enabled.",
      percentage: loading ? "" : `(${twofaPercent || 0}%)`,
    },
    {
      title: "Admin Actions (24h)",
      value: loading ? "—" : String(actions24h),
      subtitle: "From audit trail",
      icon: Activity,
      color: "text-cyan-500",
      tooltip: "Count of rows in audit_log in the last 24 hours.",
    },
  ];

  // -------- Row actions: suspend / block / activate / delete ----------
  async function handleStatusChange(
    userId: number,
    status: "active" | "blocked" | "suspended",
    label: string
  ) {
    if (!isSuperadmin) return;

    const reason =
      window.prompt(`Optional comment for ${label}:`) || "";

    try {
      const res = await adminFetch(
        `/api/admin/admin-users/${userId}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reason }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      await Promise.all([reloadUsers(), reloadMetrics()]);
      window.alert("✅ Done.");
    } catch (err: any) {
      if (err?.message === "unauthorized") return;
      console.error("[AdminUsers] status change failed:", err);
      window.alert("❌ " + (err?.message || "Operation failed"));
    }
  }

  async function handleDelete(userId: number) {
    if (!isSuperadmin) return;
    const confirmText = window.prompt(
      "Type DELETE to permanently remove this admin (cannot delete the last superadmin)."
    );
    if (confirmText !== "DELETE") return;

    try {
      const res = await adminFetch(`/api/admin/admin-users/${userId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }
      await Promise.all([reloadUsers(), reloadMetrics()]);
      window.alert("✅ User deleted.");
    } catch (err: any) {
      if (err?.message === "unauthorized") return;
      console.error("[AdminUsers] delete failed:", err);
      window.alert("❌ " + (err?.message || "Delete failed"));
    }
  }

  // -------- Add New User ----------
  async function handleCreateUser() {
    if (!fullName.trim() || !email.trim()) {
      window.alert("Full name and email are required.");
      return;
    }
    if (!role) {
      window.alert("Please select a role.");
      return;
    }

    const payload = {
      name: fullName.trim(),
      email: email.trim(),
      role,
      status: 2, // active (kept same as Bootstrap)
      contact, // optional; backend can ignore if unused
    };

    setIsCreating(true);
    try {
      const res = await adminFetch("/api/admin-create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      window.alert("✅ User created.");
      setIsAddUserOpen(false);
      setFullName("");
      setEmail("");
      setContact("");
      setRole("");
      await Promise.all([reloadUsers(), reloadMetrics()]);
    } catch (err: any) {
      if (err?.message === "unauthorized") return;
      console.error("[AdminUsers] create user failed:", err);
      window.alert("❌ " + (err?.message || "Failed to create user"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx} className="h-full">
              <CardContent className="pt-6 h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-lg ${
                      stat.color === "text-primary"
                        ? "bg-primary/10"
                        : stat.color === "text-emerald-500"
                        ? "bg-emerald-500/10"
                        : stat.color === "text-amber-500"
                        ? "bg-amber-500/10"
                        : "bg-cyan-500/10"
                    }`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  {/* Info icon - simple, no tooltip for now */}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={stat.tooltip}
                    title={stat.tooltip}
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
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    {"percentage" in stat && stat.percentage ? (
                      <span className="text-sm text-muted-foreground">
                        {stat.percentage}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 2FA banner (mirror of Bootstrap alert) */}
        {showTwofaBanner && (
          <Alert className="border-amber-300 bg-amber-50/80">
            <AlertTitle>2FA recommended</AlertTitle>
            <AlertDescription>
              Not all admins have two-factor authentication enabled.{" "}
              <span className="text-muted-foreground">
                Enforce 2FA in security settings.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Admin Users Table */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Admin Users</h2>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {/* Page size */}
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    const num = parseInt(v, 10);
                    setPageSize(num || 10);
                    setPage(0);
                  }}
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

                {/* Search + Export + Add user */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search User"
                    className="w-full sm:w-64"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      type="button"
                      onClick={() => {
                        // Stub: you can wire real export later.
                        window.alert(
                          "Export in React version is not wired yet. Use Bootstrap admin for now."
                        );
                      }}
                    >
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

                    {isSuperadmin ? (
                      <Sheet
                        open={isAddUserOpen}
                        onOpenChange={setIsAddUserOpen}
                      >
                        <SheetTrigger asChild>
                          <Button type="button" className="flex-1 sm:flex-none">
                            + Add New User
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Add User</SheetTitle>
                            <SheetDescription>
                              Add a new admin user. This mirrors the Bootstrap
                              offcanvas flow.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="add-user-fullname">
                                Full Name
                              </Label>
                              <Input
                                id="add-user-fullname"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="add-user-email">Email</Label>
                              <Input
                                id="add-user-email"
                                type="email"
                                placeholder="john.doe@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="add-user-contact">
                                Contact (optional)
                              </Label>
                              <Input
                                id="add-user-contact"
                                placeholder="+1 (609) 988-44-11"
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="admin-role">Admin Role</Label>
                              <Select
                                value={role}
                                onValueChange={(v) => setRole(v)}
                              >
                                <SelectTrigger id="admin-role">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">
                                    Select Role
                                  </SelectItem>
                                  {roles.map((r) => (
                                    <SelectItem key={r.name} value={r.name}>
                                      {humanRoleLabel(r.name)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                className="flex-1"
                                type="button"
                                disabled={isCreating}
                                onClick={handleCreateUser}
                              >
                                {isCreating ? "Saving…" : "Submit"}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddUserOpen(false)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        disabled
                        type="button"
                      >
                        + Add New User
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 pl-2 w-10">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          disabled
                        />
                      </th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground">
                        USER
                      </th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground">
                        ROLE
                      </th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground">
                        CREATED
                      </th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground">
                        LAST LOGIN
                      </th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground">
                        STATUS
                      </th>
                      <th className="pb-3 text-xs font-semibold text-muted-foreground">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && users.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          Loading…
                        </td>
                      </tr>
                    ) : pageUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No admin users found.
                        </td>
                      </tr>
                    ) : (
                      pageUsers.map((user) => {
                        const name = user.name || "(No name)";
                        const email = user.email || "—";
                        const rolesStr = user.roles || "";
                        const rolesArr = rolesStr
                          .split(",")
                          .map((r) => r.trim())
                          .filter(Boolean);
                        const isRowSuperadmin = rolesArr
                          .map((r) => r.toLowerCase())
                          .includes("superadmin");

                        const statusKey = (user.status || "").toLowerCase();
                        const statusMeta: {
                          label: string;
                          className: string;
                        } =
                          statusKey === "active"
                            ? {
                                label: "Active",
                                className:
                                  "bg-emerald-100 text-emerald-700 border border-emerald-200",
                              }
                            : statusKey === "pending"
                            ? {
                                label: "Pending",
                                className:
                                  "bg-sky-100 text-sky-700 border border-sky-200",
                              }
                            : statusKey === "suspended"
                            ? {
                                label: "Suspended",
                                className:
                                  "bg-amber-100 text-amber-700 border border-amber-200",
                              }
                            : statusKey === "blocked"
                            ? {
                                label: "Blocked",
                                className:
                                  "bg-red-100 text-red-700 border border-red-200",
                              }
                            : {
                                label: "Inactive",
                                className:
                                  "bg-slate-100 text-slate-700 border border-slate-200",
                              };

                        const { label: lastLoginLabel, stale } = formatLastLogin(
                          user.last_login_at
                        );

                        return (
                          <tr key={user.id} className="border-b last:border-0">
                            <td className="py-4 pl-2 align-top">
                              <input
                                type="checkbox"
                                className="rounded border-input"
                                disabled
                              />
                            </td>
                            <td className="py-4 align-top">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {initialsFromName(name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 align-top">
                              <div className="flex flex-wrap gap-1">
                                {rolesArr.length === 0 ? (
                                  <Badge variant="outline" className="text-xs">
                                    —
                                  </Badge>
                                ) : (
                                  rolesArr.map((r) => (
                                    <Badge
                                      key={r}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {humanRoleLabel(r)}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="py-4 align-top text-xs">
                              {formatDate(user.created_at)}
                            </td>
                            <td className="py-4 align-top text-xs">
                              <div className="flex items-center gap-2">
                                <span>{lastLoginLabel}</span>
                                {stale && (
                                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                    stale
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 align-top">
                              <Badge
                                className={`text-xs ${statusMeta.className}`}
                              >
                                {statusMeta.label}
                              </Badge>
                            </td>
                            <td className="py-4 align-top">
                              {!isSuperadmin || isRowSuperadmin ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground"
                                  disabled
                                >
                                  —
                                </Button>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 rounded-full"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-amber-600"
                                      onClick={() =>
                                        handleStatusChange(
                                          user.id,
                                          "suspended",
                                          "suspend"
                                        )
                                      }
                                    >
                                      Suspend
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() =>
                                        handleStatusChange(
                                          user.id,
                                          "blocked",
                                          "block"
                                        )
                                      }
                                    >
                                      Block
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-emerald-600"
                                      onClick={() =>
                                        handleStatusChange(
                                          user.id,
                                          "active",
                                          "activate"
                                        )
                                      }
                                    >
                                      Activate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-red-700"
                                      onClick={() => handleDelete(user.id)}
                                    >
                                      Delete…
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 text-xs gap-2">
                <span className="text-muted-foreground">
                  {totalEntries === 0
                    ? "Showing 0 to 0 of 0 entries"
                    : `Showing ${fromEntry} to ${toEntry} of ${totalEntries} entries`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    &lt;
                  </Button>
                  {Array.from({ length: totalPages }, (_, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant={
                        idx === currentPage ? "default" : "outline"
                      }
                      onClick={() => setPage(idx)}
                    >
                      {idx + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
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

export default AdminUsers;
