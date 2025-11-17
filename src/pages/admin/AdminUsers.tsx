// src/pages/admin/AdminUsers.tsx

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { apiBase } from "@/lib/api";
import { adminSecureFetch } from "@/lib/auth/adminAuth";

const API = apiBase();

/* ----------------------------- Helpers & Types ----------------------------- */

type AdminMetrics = {
  total_admins: number;
  active_admins: number;
  twofa_enabled: number;
  admin_actions_24h: number;
};

type AdminUsersResponse = {
  users?: AdminUser[];
  data?: AdminUser[];
};

type AdminUser = {
  id: number;
  name: string | null;
  email: string | null;
  roles?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
  status?: string | null;
};

type AdminMe = {
  admin_id: number;
  name: string;
  email: string;
  role: string;
};

type AdminRole = { name: string };

type AdminRolesResponse = {
  roles?: AdminRole[];
};

function handleUnauthorized() {
  try {
    (window as any).showSessionExpiredModal?.();
  } catch {
    // ignore
  }
  window.location.href = "/mv-admin/login.html";
}

async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await adminSecureFetch(url, {
    method: init?.method ?? "GET",
    ...init,
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new Error("unauthorized");
  }
  const json = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json as T;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* -------------------------------- Component -------------------------------- */

const AdminUsers = () => {
  const qc = useQueryClient();

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState("");

  // Add user form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newRole, setNewRole] = useState("");

  // Simple validation errors
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});

  /* ------------------------------- Data Queries ------------------------------ */

  const { data: me } = useQuery<AdminMe>({
    queryKey: ["admin:me"],
    queryFn: () => adminJson<AdminMe>(`${API}/api/admin-me`),
  });

  const { data: metricsData } = useQuery<{ metrics: AdminMetrics }>({
    queryKey: ["adminUsers:metrics"],
    queryFn: () =>
      adminJson<{ metrics: AdminMetrics }>(
        `${API}/api/admin/admin-users/metrics`,
      ),
  });

  const {
    data: usersData,
    isLoading: usersLoading,
  } = useQuery<AdminUsersResponse>({
    queryKey: ["adminUsers:list"],
    queryFn: () =>
      adminJson<AdminUsersResponse>(`${API}/api/admin/admin-users`),
  });

  const { data: rolesData } = useQuery<AdminRolesResponse>({
    queryKey: ["adminUsers:roles"],
    queryFn: () =>
      adminJson<AdminRolesResponse>(
        `${API}/api/dropdown/admin-user-roles`,
      ),
  });

  const isSuperadmin =
    (me?.role || "").toLowerCase() === "superadmin";

  const users: AdminUser[] = useMemo(() => {
    const raw = (usersData?.users ?? usersData?.data ?? []) as AdminUser[];
    if (!search.trim()) return raw;
    const s = search.toLowerCase();
    return raw.filter((u) => {
      return (
        (u.name || "").toLowerCase().includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.roles || "").toLowerCase().includes(s)
      );
    });
  }, [usersData, search]);

  const totalEntries = users.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const pageUsers = users.slice(startIndex, endIndex);

  /* ----------------------------- Metrics Display ----------------------------- */

  const metrics = metricsData?.metrics;
  const twofaTotal = metrics?.total_admins ?? 0;
  const twofaEnabled = metrics?.twofa_enabled ?? 0;
  const twofaPercent =
    twofaTotal > 0
      ? Math.round((twofaEnabled / twofaTotal) * 100)
      : 0;

  const stats = [
    {
      title: "Total Admins",
      value: metrics
        ? String(metrics.total_admins ?? "--")
        : "--",
      subtitle: "All roles",
      icon: Shield,
      color: "text-primary" as const,
    },
    {
      title: "Active Admins",
      value: metrics
        ? String(metrics.active_admins ?? "--")
        : "--",
      subtitle: "Can sign in now",
      icon: UserCheck,
      color: "text-success" as const,
    },
    {
      title: "2FA Coverage",
      value: metrics
        ? `${twofaEnabled}/${twofaTotal}`
        : "--/--",
      percentage: metrics
        ? `(${twofaPercent || 0}%)`
        : undefined,
      subtitle: "We recommend ≥ 100%",
      icon: Lock,
      color: "text-warning" as const,
    },
    {
      title: "Admin Actions (24h)",
      value: metrics
        ? String(metrics.admin_actions_24h ?? "0")
        : "0",
      subtitle: "From audit trail",
      icon: Activity,
      color: "text-cyan-500" as const,
    },
  ];

  /* ------------------------------- Mutations -------------------------------- */

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const errors: Record<string, string> = {};
      if (!newName.trim()) errors.name = "Please enter full name";
      if (!newEmail.trim()) errors.email = "Please enter email";
      else if (
        !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail.trim())
      ) {
        errors.email = "Invalid email address";
      }
      setAddErrors(errors);
      if (Object.keys(errors).length) {
        throw new Error("validation");
      }

      const payload: any = {
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        status: 2, // "active"
      };

      if (newContact.trim()) {
        payload.contact = newContact.trim();
      }

      return adminJson(`${API}/api/admin-create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      alert("✅ User created.");
      setIsAddUserOpen(false);
      setNewName("");
      setNewEmail("");
      setNewContact("");
      setNewRole("");
      setAddErrors({});
      await Promise.all([
        qc.invalidateQueries({
          queryKey: ["adminUsers:list"],
        }),
        qc.invalidateQueries({
          queryKey: ["adminUsers:metrics"],
        }),
      ]);
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized"))
        return;
      if (String(err?.message || "") === "validation") return;
      alert("❌ " + (err?.message || "Failed to create user"));
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (params: {
      id: number;
      status: string;
      reason?: string;
    }) => {
      const res = await adminJson(
        `${API}/api/admin/admin-users/${params.id}/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: params.status,
            reason: params.reason || "",
          }),
        },
      );
      return res;
    },
    onSuccess: async () => {
      alert("✅ Done.");
      await Promise.all([
        qc.invalidateQueries({
          queryKey: ["adminUsers:list"],
        }),
        qc.invalidateQueries({
          queryKey: ["adminUsers:metrics"],
        }),
      ]);
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized"))
        return;
      alert("❌ " + (err?.message || "Operation failed"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return adminJson(`${API}/api/admin/admin-users/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      alert("✅ User deleted.");
      await Promise.all([
        qc.invalidateQueries({
          queryKey: ["adminUsers:list"],
        }),
        qc.invalidateQueries({
          queryKey: ["adminUsers:metrics"],
        }),
      ]);
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized"))
        return;
      alert("❌ " + (err?.message || "Failed to delete user"));
    },
  });

  /* ----------------------------- Effects / helpers -------------------------- */

  useEffect(() => {
    if (isAddUserOpen) {
      setAddErrors({});
    }
  }, [isAddUserOpen]);

  const handleAction = (
    user: AdminUser,
    action: "suspend" | "block" | "activate" | "delete",
  ) => {
    if (!isSuperadmin) return;

    if (action === "delete") {
      const confirmText = window.prompt(
        "Type DELETE to permanently remove this admin (cannot delete the last superadmin).",
      );
      if (confirmText !== "DELETE") return;
      deleteMutation.mutate(user.id);
      return;
    }

    const actionToStatus: Record<string, string> = {
      suspend: "suspended",
      block: "blocked",
      activate: "active",
    };
    const status = actionToStatus[action];
    const reason =
      window.prompt(`Optional comment for ${action}:`) || "";
    statusMutation.mutate({ id: user.id, status, reason });
  };

  const roleOptions = rolesData?.roles ?? [];

  const statusBadgeClasses = (
    status: string | null | undefined,
  ) => {
    const s = (status || "").toLowerCase();
    if (s === "active")
      return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (s === "pending")
      return "bg-sky-100 text-sky-700 border border-sky-200";
    if (s === "suspended")
      return "bg-amber-100 text-amber-700 border border-amber-200";
    if (s === "blocked")
      return "bg-red-100 text-red-700 border border-red-200";
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Grid – layout identical to old code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx}>
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
                    <stat.icon
                      className={`h-5 w-5 ${stat.color}`}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
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
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold">
                      {stat.value}
                    </p>
                    {"percentage" in stat &&
                      stat.percentage && (
                        <span className="text-sm text-muted-foreground">
                          {stat.percentage}
                        </span>
                      )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Users Table – layout mirrors old code */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                Admin Users
              </h2>

              {/* Controls row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Page size select */}
                <Select
                  defaultValue={String(pageSize)}
                  onValueChange={(val) => {
                    const num = Number(val || 10);
                    setPageSize(num);
                    setPage(1);
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

                {/* Search + Export + Add New User */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search User"
                    className="w-full sm:w-64"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                  <div className="flex gap-2">
                    {/* Export */}
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => {
                        const rows = [
                          [
                            "Name",
                            "Email",
                            "Roles",
                            "Created",
                            "Last Login",
                            "Status",
                          ],
                          ...users.map((u) => [
                            u.name || "",
                            u.email || "",
                            u.roles || "",
                            formatDate(u.created_at),
                            formatDate(u.last_login_at),
                            u.status || "",
                          ]),
                        ];
                        const csv = rows.map((r) =>
                          r
                            .map((cell) =>
                              `"${String(cell).replace(
                                /"/g,
                                '""',
                              )}"`,
                            )
                            .join(","),
                        );
                        const blob = new Blob([csv.join("\n")], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const url = URL.createObjectURL(blob);
                        const a =
                          document.createElement("a");
                        a.href = url;
                        a.download = "admin-users.csv";
                        a.click();
                        URL.revokeObjectURL(url);
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      Export
                    </Button>

                    {/* Add New User sheet */}
                    <Sheet
                      open={isAddUserOpen}
                      onOpenChange={setIsAddUserOpen}
                    >
                      <SheetTrigger asChild>
                        <Button
                          type="button"
                          className="flex-1 sm:flex-none"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsAddUserOpen(true);
                          }}
                        >
                          + Add New User
                        </Button>
                      </SheetTrigger>
                      <SheetContent
                        side="right"
                        className="w-full sm:w-[460px]"
                      >
                        <SheetHeader className="border-b pb-3">
                          <SheetTitle>
                            Add Admin User
                          </SheetTitle>
                          <SheetDescription>
                            Enter details to create a new admin
                            user.
                          </SheetDescription>
                        </SheetHeader>

                        <form
                          className="space-y-4 py-4 h-[calc(100%-4rem)] flex flex-col"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (
                              !createUserMutation.isPending
                            ) {
                              createUserMutation.mutate();
                            }
                          }}
                        >
                          <div className="space-y-1.5">
                            <Label htmlFor="add-admin-fullname">
                              Full Name
                            </Label>
                            <Input
                              id="add-admin-fullname"
                              placeholder="John Doe"
                              value={newName}
                              onChange={(e) =>
                                setNewName(e.target.value)
                              }
                            />
                            {addErrors.name && (
                              <p className="text-xs text-destructive">
                                {addErrors.name}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="add-admin-email">
                              Email
                            </Label>
                            <Input
                              id="add-admin-email"
                              type="email"
                              placeholder="john.doe@example.com"
                              value={newEmail}
                              onChange={(e) =>
                                setNewEmail(e.target.value)
                              }
                            />
                            {addErrors.email && (
                              <p className="text-xs text-destructive">
                                {addErrors.email}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="add-admin-contact">
                              Contact
                            </Label>
                            <Input
                              id="add-admin-contact"
                              placeholder="+1 (609) 988-44-11"
                              value={newContact}
                              onChange={(e) =>
                                setNewContact(e.target.value)
                              }
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="add-admin-role">
                              Admin Role
                            </Label>
                            <Select
                              value={newRole || undefined}
                              onValueChange={(val) =>
                                setNewRole(val)
                              }
                            >
                              <SelectTrigger id="add-admin-role">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {roleOptions.map((r) => (
                                  <SelectItem
                                    key={r.name}
                                    value={r.name}
                                  >
                                    {r.name
                                      .replace(/_/g, " ")
                                      .replace(
                                        /\b\w/g,
                                        (c) =>
                                          c.toUpperCase(),
                                      )}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="mt-auto flex gap-2 pt-2">
                            <Button
                              className="flex-1"
                              type="submit"
                              disabled={
                                createUserMutation.isPending ||
                                !newName.trim() ||
                                !newEmail.trim() ||
                                !newRole
                              }
                            >
                              {createUserMutation.isPending
                                ? "Saving…"
                                : "Submit"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                              onClick={() =>
                                setIsAddUserOpen(false)
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </div>

              {/* Table */}
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
                        USER
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        ROLE
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        CREATED
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        LAST LOGIN
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        STATUS
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading && (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-6 text-center text-muted-foreground"
                        >
                          Loading…
                        </td>
                      </tr>
                    )}

                    {!usersLoading &&
                      pageUsers.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="py-6 text-center text-muted-foreground"
                          >
                            No admin users found.
                          </td>
                        </tr>
                      )}

                    {!usersLoading &&
                      pageUsers.map((user) => {
                        const name =
                          user.name || "(No name)";
                        const email = user.email || "—";
                        const initials =
                          (name.match(/\b\w/g) || [])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase() || "MV";
                        const roles = (user.roles || "")
                          .split(",")
                          .map((r) => r.trim());
                        const isRowSuper = roles
                          .map((r) => r.toLowerCase())
                          .includes("superadmin");

                        return (
                          <tr
                            key={user.id}
                            className="border-b last:border-0"
                          >
                            <td className="py-4 pl-2">
                              <input
                                type="checkbox"
                                className="rounded border-input"
                                disabled
                              />
                            </td>
                            <td className="py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">
                                    {name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              {roles.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {roles.map((r) => (
                                    <Badge
                                      key={r}
                                      variant="secondary"
                                      className="capitalize"
                                    >
                                      {r}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="py-4 text-sm">
                              {formatDate(
                                user.created_at,
                              )}
                            </td>
                            <td className="py-4 text-sm">
                              {formatDate(
                                user.last_login_at,
                              )}
                            </td>
                            <td className="py-4">
                              <Badge
                                className={`${statusBadgeClasses(
                                  user.status,
                                )} backdrop-blur-sm`}
                              >
                                {user.status ||
                                  "Inactive"}
                              </Badge>
                            </td>
                            <td className="py-4">
                              {!isSuperadmin || isRowSuper ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
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
                                      type="button"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                      Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleAction(
                                          user,
                                          "suspend",
                                        )
                                      }
                                      className="text-amber-600"
                                    >
                                      Suspend
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleAction(
                                          user,
                                          "block",
                                        )
                                      }
                                      className="text-red-600"
                                    >
                                      Block
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleAction(
                                          user,
                                          "activate",
                                        )
                                      }
                                      className="text-emerald-600"
                                    >
                                      Activate
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleAction(
                                          user,
                                          "delete",
                                        )
                                      }
                                      className="text-red-700"
                                    >
                                      Delete…
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Pager */}
              <div className="flex items-center justify-between pt-4 text-sm">
                <span className="text-muted-foreground">
                  {totalEntries === 0
                    ? "Showing 0 entries"
                    : `Showing ${startIndex + 1} to ${
                        endIndex
                      } of ${totalEntries} entries`}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                  >
                    &lt;
                  </Button>
                  <Button size="sm" type="button">
                    {currentPage}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setPage((p) =>
                        Math.min(totalPages, p + 1),
                      )
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
