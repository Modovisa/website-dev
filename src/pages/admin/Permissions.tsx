// src/pages/admin/Permissions.tsx

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  X,
  Edit2,
  Trash2,
} from "lucide-react";

import { apiBase } from "@/lib/api";
import { adminSecureFetch } from "@/lib/auth/adminAuth";

/* -------------------------------------------------------------------------- */
/*                                   Types                                    */
/* -------------------------------------------------------------------------- */

type AdminMe = {
  admin_id: number;
  name: string;
  email: string;
  role: string;
};

type AdminRole = {
  id: number;
  name: string;
  built_in?: number | boolean;
};

type RolesResponse = {
  roles?: AdminRole[];
  data?: AdminRole[];
};

type PermItem = {
  key: string;
  label: string;
  desc?: string;
};

type PermGroup = {
  key: string;
  title?: string;
  perms?: PermItem[];
};

type PermSchema = {
  groups?: PermGroup[];
};

type RolePermsResponse = {
  permissions?: string[];
};

type RoleMember = {
  id: number;
  name: string | null;
  email: string | null;
};

type RoleMembersResponse = {
  members?: RoleMember[];
};

type AuditRow = {
  when?: string;
  admin?: string;
  action?: string;
  target?: string;
  details?: string;
};

type AuditResponse = {
  rows?: AuditRow[];
};

/* -------------------------------------------------------------------------- */
/*                             Fetch helpers (admin)                          */
/* -------------------------------------------------------------------------- */

const API = apiBase();

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

/* -------------------------------------------------------------------------- */
/*                              Utility helpers                               */
/* -------------------------------------------------------------------------- */

function initialsFor(name?: string | null, email?: string | null): string {
  const src = (name || email || "").trim();
  if (!src) return "MV";
  const letters = (src.match(/\b\w/g) || []).join("").substring(0, 2);
  return letters.toUpperCase() || "MV";
}

function idSafe(s: string): string {
  return String(s).replace(/[^a-z0-9_.-]+/gi, "-");
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/*                               Main component                               */
/* -------------------------------------------------------------------------- */

const Permissions = () => {
  const qc = useQueryClient();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [permFilter, setPermFilter] = useState("");
  const [auditWindow, setAuditWindow] = useState<"24h" | "7d" | "30d">("24h");
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [pendingRemoveAdminId, setPendingRemoveAdminId] = useState<number | null>(null);

  const [savedPerms, setSavedPerms] = useState<Set<string>>(new Set());
  const [workingPerms, setWorkingPerms] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const dirty = useMemo(
    () => !setsEqual(savedPerms, workingPerms),
    [savedPerms, workingPerms]
  );

  /* ------------------------------ Data queries ----------------------------- */

  const { data: me } = useQuery<AdminMe>({
    queryKey: ["admin:me"],
    queryFn: () => adminJson<AdminMe>(`${API}/api/admin-me`),
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery<RolesResponse>({
    queryKey: ["admin:roles"],
    queryFn: () => adminJson<RolesResponse>(`${API}/api/admin/roles`),
  });

  const roles: AdminRole[] = useMemo(() => {
    const raw = (rolesData?.roles ?? rolesData?.data ?? []) as AdminRole[];
    const q = roleSearch.toLowerCase().trim();
    if (!q) return raw;
    return raw.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rolesData, roleSearch]);

  // Select first role by default
  useEffect(() => {
    if (!roles.length) {
      setSelectedRoleId(null);
      return;
    }
    if (selectedRoleId == null || !roles.some((r) => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const { data: schemaData } = useQuery<PermSchema>({
    queryKey: ["admin:permissions:schema"],
    queryFn: () =>
      adminJson<PermSchema>(`${API}/api/admin/permissions/schema`),
  });

  // Expand all groups by default once schema is loaded
  useEffect(() => {
    if (!schemaData?.groups?.length) return;
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const g of schemaData.groups!) {
        if (next[g.key] === undefined) next[g.key] = true;
      }
      return next;
    });
  }, [schemaData]);

  const { data: rolePermsData } = useQuery<RolePermsResponse>({
    queryKey: ["admin:role:permissions", selectedRoleId],
    queryFn: () =>
      adminJson<RolePermsResponse>(
        `${API}/api/admin/roles/${selectedRoleId}/permissions`
      ),
    enabled: selectedRoleId != null,
  });

  useEffect(() => {
    const perms = rolePermsData?.permissions ?? [];
    const next = new Set(perms);
    setSavedPerms(next);
    setWorkingPerms(new Set(next));
  }, [rolePermsData]);

  const { data: membersData, isLoading: membersLoading } =
    useQuery<RoleMembersResponse>({
      queryKey: ["admin:role:members", selectedRoleId],
      queryFn: () =>
        adminJson<RoleMembersResponse>(
          `${API}/api/admin/roles/${selectedRoleId}/members`
        ),
      enabled: selectedRoleId != null,
    });

  const members: RoleMember[] =
    (membersData?.members ?? []) as RoleMember[];

  const { data: auditData, isLoading: auditLoading, refetch: refetchAudit } =
    useQuery<AuditResponse>({
      queryKey: ["admin:permissions:audit", auditWindow],
      queryFn: () =>
        adminJson<AuditResponse>(
          `${API}/api/admin/permissions/audit?window=${encodeURIComponent(
            auditWindow
          )}`
        ),
    });

  const auditRows: AuditRow[] = auditData?.rows ?? [];

  const currentRole = roles.find((r) => r.id === selectedRoleId) || null;
  const isCurrentRoleBuiltIn = !!currentRole?.built_in;
  const isSuperadmin =
    (me?.role || "").toLowerCase() === "superadmin";

  /* ------------------------------- Mutations ------------------------------- */

  const createRoleMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await adminJson<{ id?: number }>(
        `${API}/api/admin/roles`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
      return res;
    },
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["admin:roles"] });
      if (data?.id) {
        setSelectedRoleId(data.id);
        await qc.invalidateQueries({
          queryKey: ["admin:role:permissions", data.id],
        });
        await qc.invalidateQueries({
          queryKey: ["admin:role:members", data.id],
        });
      }
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to create role"));
    },
  });

  const renameRoleMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!selectedRoleId) throw new Error("No role selected");
      return adminJson(
        `${API}/api/admin/roles/${selectedRoleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin:roles"] });
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to rename role"));
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) throw new Error("No role selected");
      return adminJson(
        `${API}/api/admin/roles/${selectedRoleId}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["admin:roles"] });
      // selectedRoleId will be re-set by roles useEffect
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to delete role"));
    },
  });

  const savePermsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) throw new Error("No role selected");
      const arr = Array.from(workingPerms);
      return adminJson(
        `${API}/api/admin/roles/${selectedRoleId}/permissions`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: arr }),
        }
      );
    },
    onSuccess: () => {
      setSavedPerms(new Set(workingPerms));
      alert("✅ Permissions saved.");
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to save permissions"));
    },
  });

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      return adminJson(
        `${API}/api/admin/permissions/seed-defaults`,
        {
          method: "POST",
        }
      );
    },
    onSuccess: async () => {
      alert("✅ Default roles & permissions synced.");
      await qc.invalidateQueries({ queryKey: ["admin:roles"] });
      if (selectedRoleId) {
        await qc.invalidateQueries({
          queryKey: ["admin:role:permissions", selectedRoleId],
        });
        await qc.invalidateQueries({
          queryKey: ["admin:role:members", selectedRoleId],
        });
      }
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to sync defaults"));
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!selectedRoleId) throw new Error("No role selected");
      return adminJson(
        `${API}/api/admin/roles/${selectedRoleId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
    },
    onSuccess: async () => {
      setAddMemberEmail("");
      if (selectedRoleId) {
        await qc.invalidateQueries({
          queryKey: ["admin:role:members", selectedRoleId],
        });
      }
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to add member"));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId || !pendingRemoveAdminId)
        throw new Error("Nothing to remove");
      return adminJson(
        `${API}/api/admin/roles/${selectedRoleId}/members/${pendingRemoveAdminId}`,
        {
          method: "DELETE",
        }
      );
    },
    onSuccess: async () => {
      setPendingRemoveAdminId(null);
      if (selectedRoleId) {
        await qc.invalidateQueries({
          queryKey: ["admin:role:members", selectedRoleId],
        });
      }
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to remove member"));
    },
  });

  /* ----------------------------- Event handlers ---------------------------- */

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTogglePerm = (permKey: string, checked: boolean) => {
    setWorkingPerms((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permKey);
      else next.delete(permKey);
      return next;
    });
  };

  const handleRevertPerms = () => {
    setWorkingPerms(new Set(savedPerms));
  };

  const handleCreateRole = () => {
    if (!isSuperadmin) return;
    const name = window.prompt("Role name (e.g. Ops Admin):", "");
    if (!name) return;
    createRoleMutation.mutate(name.trim());
  };

  const handleRenameRole = () => {
    if (!isSuperadmin || !currentRole || isCurrentRoleBuiltIn) return;
    const name = window.prompt("New name for role:", currentRole.name || "");
    if (!name || name.trim() === currentRole.name) return;
    renameRoleMutation.mutate(name.trim());
  };

  const handleDeleteRole = () => {
    if (!isSuperadmin || !currentRole || isCurrentRoleBuiltIn) return;
    const ok = window.confirm(
      "Delete this role and unassign all members? This cannot be undone."
    );
    if (!ok) return;
    deleteRoleMutation.mutate();
  };

  const handleSeedDefaults = () => {
    if (!isSuperadmin) return;
    const ok = window.confirm(
      "Sync default roles and permissions? This may overwrite some existing configuration."
    );
    if (!ok) return;
    seedDefaultsMutation.mutate();
  };

  const handleAddMember = () => {
    const email = addMemberEmail.trim();
    if (!email) return;
    addMemberMutation.mutate(email);
  };

  const handleConfirmRemoveMember = (memberId: number) => {
    setPendingRemoveAdminId(memberId);
    const ok = window.confirm("Remove this admin from the role?");
    if (!ok) {
      setPendingRemoveAdminId(null);
      return;
    }
    removeMemberMutation.mutate();
  };

  const handleChangeAuditWindow = (val: string) => {
    const cast = val as "24h" | "7d" | "30d";
    setAuditWindow(cast);
  };

  /* --------------------------------- Render -------------------------------- */

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">
              Roles &amp; Permissions
            </h1>
            <p className="text-muted-foreground text-sm">
              Control who can manage users, billing, tracking, and more.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSeedDefaults}
              disabled={!isSuperadmin || seedDefaultsMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync Default Permissions
            </Button>
            <Button
              type="button"
              onClick={handleCreateRole}
              disabled={!isSuperadmin || createRoleMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Role
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Roles list */}
          <Card className="lg:col-span-3 h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <h3 className="font-semibold text-base">Roles</h3>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleRenameRole}
                disabled={
                  !isSuperadmin ||
                  !currentRole ||
                  isCurrentRoleBuiltIn ||
                  renameRoleMutation.isPending
                }
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search roles…"
                  className="pl-8"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
              </div>

              {/* Empty state */}
              {rolesLoading ? (
                <p className="text-sm text-muted-foreground">Loading roles…</p>
              ) : roles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No roles yet. Create one to begin.
                </p>
              ) : null}

              {/* Roles list */}
              <div className="border rounded-md max-h-[520px] overflow-auto divide-y">
                {roles.map((role) => {
                  const isActive = role.id === selectedRoleId;
                  const isBuiltIn = !!role.built_in;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={[
                        "w-full flex items-center justify-between px-3 py-2 text-sm transition-colors text-left",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted",
                      ].join(" ")}
                    >
                      <span className="truncate">{role.name}</span>
                      {isBuiltIn && (
                        <Badge
                          variant="outline"
                          className="text-[11px] font-normal"
                        >
                          built-in
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
            <div className="flex items-center justify-between px-6 py-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={handleDeleteRole}
                disabled={
                  !isSuperadmin ||
                  !currentRole ||
                  isCurrentRoleBuiltIn ||
                  deleteRoleMutation.isPending
                }
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Role
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleCreateRole}
                disabled={!isSuperadmin || createRoleMutation.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Role
              </Button>
            </div>
          </Card>

          {/* MIDDLE: Permissions matrix */}
          <Card className="lg:col-span-6 h-full flex flex-col">
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-base">Permissions</h3>
              <p className="text-xs text-muted-foreground">
                {currentRole
                  ? `Editing: ${currentRole.name}`
                  : "Select a role to edit its permissions."}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pt-0">
              {/* Filter row */}
              <div className="px-1 pt-2 pb-4 flex flex-col md:flex-row md:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter permissions… (e.g. user, billing)"
                    className="pl-8"
                    value={permFilter}
                    onChange={(e) => setPermFilter(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="whitespace-nowrap"
                  onClick={() => setPermFilter("")}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Clear
                </Button>
              </div>

              {/* Matrix */}
              <div className="flex-1 overflow-auto space-y-3">
                {!schemaData?.groups?.length ? (
                  <div className="text-sm text-muted-foreground px-1">
                    No permissions available.
                  </div>
                ) : (
                  schemaData.groups.map((group) => {
                    const groupKey = group.key;
                    const groupTitle = group.title || group.key;
                    const allPerms = group.perms || [];
                    const filter = permFilter.toLowerCase().trim();

                    const visiblePerms = allPerms.filter((p) => {
                      if (!filter) return true;
                      const label = (p.label || p.key || "").toLowerCase();
                      const desc = (p.desc || "").toLowerCase();
                      const gTitle = groupTitle.toLowerCase();
                      return (
                        label.includes(filter) ||
                        desc.includes(filter) ||
                        gTitle.includes(filter)
                      );
                    });

                    if (visiblePerms.length === 0) return null;

                    const expanded = expandedGroups[groupKey] ?? true;

                    return (
                      <div
                        key={groupKey}
                        className="border rounded-md overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupKey)}
                          className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/60 hover:bg-muted transition-colors"
                        >
                          <span className="font-medium text-sm">
                            {groupTitle}
                          </span>
                          {expanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {expanded && (
                          <div className="px-4 py-3 space-y-2">
                            {visiblePerms.map((perm) => {
                              const checked = workingPerms.has(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className="flex flex-col gap-1"
                                >
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={idSafe(`perm-${perm.key}`)}
                                      checked={checked}
                                      onCheckedChange={(val) =>
                                        handleTogglePerm(
                                          perm.key,
                                          Boolean(val)
                                        )
                                      }
                                      disabled={!currentRole}
                                    />
                                    <label
                                      htmlFor={idSafe(`perm-${perm.key}`)}
                                      className="text-sm cursor-pointer"
                                    >
                                      {perm.label || perm.key}
                                    </label>
                                  </div>
                                  {perm.desc && (
                                    <p className="text-xs text-muted-foreground ml-6">
                                      {perm.desc}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                            {visiblePerms.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                No permissions in this group.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer: status + actions */}
              <div className="pt-4 mt-4 border-t flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {dirty ? "Unsaved changes." : "No changes."}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRevertPerms}
                    disabled={!dirty || !currentRole}
                  >
                    Revert
                  </Button>
                  <Button
                    type="button"
                    onClick={() => savePermsMutation.mutate()}
                    disabled={
                      !dirty ||
                      !currentRole ||
                      savePermsMutation.isPending
                    }
                  >
                    <svg
                      className="h-4 w-4 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RIGHT: Members */}
          <Card className="lg:col-span-3 h-full flex flex-col">
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-base">Members</h3>
              <p className="text-xs text-muted-foreground">
                Admins assigned to this role.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-0">
              {/* Add member */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Add by email</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={addMemberEmail}
                    onChange={(e) => setAddMemberEmail(e.target.value)}
                    disabled={!currentRole}
                  />
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    disabled={
                      !currentRole ||
                      !addMemberEmail.trim() ||
                      addMemberMutation.isPending
                    }
                  >
                    Add
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  User must exist in <code>admin_users</code>.
                </p>
              </div>

              {/* Members list */}
              <div className="border rounded-md max-h-[420px] overflow-auto">
                {membersLoading ? (
                  <p className="text-sm text-muted-foreground p-3">
                    Loading members…
                  </p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-3">
                    No admins assigned to this role.
                  </p>
                ) : (
                  <ul>
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {initialsFor(m.name, m.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {m.name || "(No name)"}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {m.email || "—"}
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-7 w-7 text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() =>
                            handleConfirmRemoveMember(m.id)
                          }
                          disabled={
                            removeMemberMutation.isPending ||
                            !currentRole
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Changes / Audit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Changes</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={auditWindow}
                onValueChange={handleChangeAuditWindow}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => refetchAudit()}
                disabled={auditLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 pt-1 text-xs font-semibold text-muted-foreground">
                      WHEN
                    </th>
                    <th className="pb-2 pt-1 text-xs font-semibold text-muted-foreground">
                      ADMIN
                    </th>
                    <th className="pb-2 pt-1 text-xs font-semibold text-muted-foreground">
                      ACTION
                    </th>
                    <th className="pb-2 pt-1 text-xs font-semibold text-muted-foreground">
                      TARGET
                    </th>
                    <th className="pb-2 pt-1 text-xs font-semibold text-muted-foreground">
                      DETAILS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : auditRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No recent changes in the selected timeframe.
                      </td>
                    </tr>
                  ) : (
                    auditRows.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-b-0">
                        <td className="py-2 align-top">
                          {row.when || "—"}
                        </td>
                        <td className="py-2 align-top">
                          {row.admin || "—"}
                        </td>
                        <td className="py-2 align-top">
                          <code className="text-xs">
                            {row.action || "—"}
                          </code>
                        </td>
                        <td className="py-2 align-top">
                          {row.target || "—"}
                        </td>
                        <td className="py-2 align-top text-muted-foreground">
                          {row.details || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Permissions;
