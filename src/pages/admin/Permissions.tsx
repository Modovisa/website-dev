// src/pages/admin/Permissions.tsx

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminLayout } from "@/components/AdminLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, MoreVertical, UserMinus } from "lucide-react";

import { apiBase } from "@/lib/api";
import { adminSecureFetch } from "@/lib/auth/adminAuth";

/* ----------------------------- Types & helpers ----------------------------- */

const API = apiBase();

type AdminRole = {
  id: number;
  name: string;
  built_in?: number | boolean;
};

type RolesResponse = {
  roles?: AdminRole[];
  data?: AdminRole[];
};

type PermissionItem = {
  key: string;
  label?: string;
  desc?: string;
};

type PermissionGroup = {
  key: string;
  title?: string;
  perms?: PermissionItem[];
};

type PermissionSchema = {
  groups?: PermissionGroup[];
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
  when: string;
  admin: string;
  action: string;
  target: string;
  details: string;
};

type AuditResponse = {
  rows?: AuditRow[];
};

function handleUnauthorized() {
  try {
    (window as any).showSessionExpiredModal?.();
  } catch {
    // ignore
  }
  window.location.href = "/mv-admin/login.html";
}

async function adminJson<T = any>(
  url: string,
  init?: RequestInit
): Promise<T> {
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

function initialsFrom(name?: string | null, email?: string | null): string {
  const src = (name || email || "").trim();
  if (!src) return "MV";
  const parts = src.match(/\b\w/g) || [];
  return parts.join("").substring(0, 2).toUpperCase();
}

/* -------------------------------- Component -------------------------------- */

const Permissions = () => {
  const qc = useQueryClient();

  // Roles state
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleSearch, setRoleSearch] = useState("");

  // Permission matrix state
  const [savedPerms, setSavedPerms] = useState<Set<string>>(new Set());
  const [workingPerms, setWorkingPerms] = useState<Set<string>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [permFilter, setPermFilter] = useState("");

  // Members state
  const [newMemberEmail, setNewMemberEmail] = useState("");

  // Audit state
  const [auditWindow, setAuditWindow] = useState<"24h" | "7d" | "30d">("24h");

  // "New Role" dialog state
  const [isNewRoleOpen, setIsNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleError, setNewRoleError] = useState<string | null>(null);

  /* ------------------------------- Data queries ------------------------------ */

  const {
    data: rolesData,
    isLoading: rolesLoading,
  } = useQuery<RolesResponse>({
    queryKey: ["adminPerms:roles"],
    queryFn: () => adminJson<RolesResponse>(`${API}/api/admin/roles`),
  });

  const allRoles: AdminRole[] = useMemo(() => {
    const raw = (rolesData?.roles ?? rolesData?.data ?? []) as AdminRole[];
    if (!roleSearch.trim()) return raw;
    const q = roleSearch.toLowerCase();
    return raw.filter((r) => (r.name || "").toLowerCase().includes(q));
  }, [rolesData, roleSearch]);

  // Auto-select first role when list changes
  useEffect(() => {
    const raw = (rolesData?.roles ?? rolesData?.data ?? []) as AdminRole[];
    if (!raw.length) {
      setSelectedRoleId(null);
      return;
    }
    if (selectedRoleId == null || !raw.some((r) => r.id === selectedRoleId)) {
      setSelectedRoleId(raw[0].id);
    }
  }, [rolesData]);

  const selectedRole = useMemo(
    () => allRoles.find((r) => r.id === selectedRoleId) ?? null,
    [allRoles, selectedRoleId]
  );

  const { data: schemaData, isLoading: schemaLoading } =
    useQuery<PermissionSchema>({
      queryKey: ["adminPerms:schema"],
      queryFn: () =>
        adminJson<PermissionSchema>(`${API}/api/admin/permissions/schema`),
    });

  const { data: rolePermsData, isLoading: permsLoading } =
    useQuery<RolePermsResponse>({
      queryKey: ["adminPerms:rolePerms", selectedRoleId],
      queryFn: () =>
        adminJson<RolePermsResponse>(
          `${API}/api/admin/roles/${selectedRoleId}/permissions`
        ),
      enabled: selectedRoleId != null,
    });

  // Sync set state when backend perms change
  useEffect(() => {
    const perms = (rolePermsData?.permissions ?? []) as string[];
    const next = new Set<string>(perms);
    setSavedPerms(next);
    setWorkingPerms(new Set<string>(next));
    setIsDirty(false);
  }, [rolePermsData]);

  const {
    data: membersData,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useQuery<RoleMembersResponse>({
    queryKey: ["adminPerms:members", selectedRoleId],
    queryFn: () =>
      adminJson<RoleMembersResponse>(
        `${API}/api/admin/roles/${selectedRoleId}/members`
      ),
    enabled: selectedRoleId != null,
  });

  const members: RoleMember[] = membersData?.members ?? [];

  const {
    data: auditData,
    isLoading: auditLoading,
    refetch: refetchAudit,
  } = useQuery<AuditResponse>({
    queryKey: ["adminPerms:audit", auditWindow],
    queryFn: () =>
      adminJson<AuditResponse>(
        `${API}/api/admin/permissions/audit?window=${encodeURIComponent(
          auditWindow
        )}`
      ),
  });

  const auditRows: AuditRow[] = auditData?.rows ?? [];

  /* ------------------------------- Mutations -------------------------------- */

  const seedDefaultsMutation = useMutation({
    mutationFn: async () => {
      return adminJson(`${API}/api/admin/permissions/seed-defaults`, {
        method: "POST",
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["adminPerms:roles"] });
      if (selectedRoleId) {
        await qc.invalidateQueries({
          queryKey: ["adminPerms:rolePerms", selectedRoleId],
        });
        await qc.invalidateQueries({
          queryKey: ["adminPerms:members", selectedRoleId],
        });
      }
      alert("✅ Defaults synced.");
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to sync defaults"));
    },
  });

  const savePermsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;
      const arr = Array.from(workingPerms);
      return adminJson(`${API}/api/admin/roles/${selectedRoleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: arr }),
      });
    },
    onSuccess: () => {
      setSavedPerms(new Set<string>(workingPerms));
      setIsDirty(false);
      alert("✅ Permissions saved.");
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to save permissions"));
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new Error("Please enter a role name.");
      }
      return adminJson<{ id?: number }>(`${API}/api/admin/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
    },
    onSuccess: async (res) => {
      setNewRoleName("");
      setNewRoleError(null);
      setIsNewRoleOpen(false);
      await qc.invalidateQueries({ queryKey: ["adminPerms:roles"] });
      if (res?.id) {
        setSelectedRoleId(res.id);
      }
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      setNewRoleError(err?.message || "Failed to create role");
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!selectedRoleId) return;
      return adminJson(`${API}/api/admin/roles/${selectedRoleId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: async () => {
      setNewMemberEmail("");
      await refetchMembers();
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to add member"));
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (adminId: number) => {
      if (!selectedRoleId) return;
      return adminJson(
        `${API}/api/admin/roles/${selectedRoleId}/members/${adminId}`,
        { method: "DELETE" }
      );
    },
    onSuccess: async () => {
      await refetchMembers();
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to remove member"));
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return;
      return adminJson(`${API}/api/admin/roles/${selectedRoleId}`, {
        method: "DELETE",
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["adminPerms:roles"] });
      setSelectedRoleId(null);
      alert("✅ Role deleted.");
    },
    onError: (err: any) => {
      if (String(err?.message || "").includes("unauthorized")) return;
      alert("❌ " + (err?.message || "Failed to delete role"));
    },
  });

  /* ----------------------------- Local handlers ----------------------------- */

  const markDirty = (next: Set<string>) => {
    const a = Array.from(next).sort();
    const b = Array.from(savedPerms).sort();
    setIsDirty(JSON.stringify(a) !== JSON.stringify(b));
  };

  const handleTogglePerm = (permKey: string, checked: boolean) => {
    setWorkingPerms((prev) => {
      const next = new Set<string>(prev);
      if (checked) next.add(permKey);
      else next.delete(permKey);
      markDirty(next);
      return next;
    });
  };

  const handleRevertPerms = () => {
    const next = new Set<string>(savedPerms);
    setWorkingPerms(next);
    setIsDirty(false);
  };

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (createRoleMutation.isPending) return;
    createRoleMutation.mutate(newRoleName);
  };

  const handleDeleteRole = () => {
    if (!selectedRole) return;
    const confirmText = window.prompt(
      `Type DELETE to remove role "${selectedRole.name}" and unassign all members.`
    );
    if (confirmText !== "DELETE") return;
    deleteRoleMutation.mutate();
  };

  const handleAddMember = () => {
    const email = newMemberEmail.trim();
    if (!email) return;
    addMemberMutation.mutate(email);
  };

  const handleRemoveMember = (id: number) => {
    if (!window.confirm("Remove this admin from the role?")) return;
    removeMemberMutation.mutate(id);
  };

  /* --------------------------- Derived permission UI ------------------------ */

  const filteredGroups: PermissionGroup[] = useMemo(() => {
    const filter = permFilter.toLowerCase().trim();
    const groups = schemaData?.groups ?? [];
    if (!filter) return groups;

    return groups
      .map((g) => {
        const perms = (g.perms ?? []).filter((p) => {
          return (
            (p.key || "").toLowerCase().includes(filter) ||
            (p.label || "").toLowerCase().includes(filter) ||
            (g.title || g.key || "").toLowerCase().includes(filter)
          );
        });
        if (!perms.length) return null;
        return { ...g, perms };
      })
      .filter(Boolean) as PermissionGroup[];
  }, [schemaData, permFilter]);

  const canEditSelectedRole = selectedRole && !selectedRole.built_in;

  /* --------------------------------- Render --------------------------------- */

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Roles &amp; Permissions</h1>
            <p className="text-muted-foreground">
              Control who can manage users, billing, tracking, and more.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  !window.confirm(
                    "Sync default roles and permissions? This may overwrite some existing settings."
                  )
                )
                  return;
                seedDefaultsMutation.mutate();
              }}
              disabled={seedDefaultsMutation.isPending}
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Sync Default Permissions
            </Button>

            {/* New Role dialog */}
            <Dialog
              open={isNewRoleOpen}
              onOpenChange={(open) => {
                setIsNewRoleOpen(open);
                if (!open) {
                  setNewRoleName("");
                  setNewRoleError(null);
                }
              }}
            >
              <Button
                type="button"
                onClick={() => setIsNewRoleOpen(true)}
              >
                + New Role
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Role</DialogTitle>
                  <DialogDescription>
                    Give this role a clear name, like &quot;Ops Admin&quot; or
                    &quot;Billing-only&quot;.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleCreateRoleSubmit}
                  className="space-y-4 pt-2"
                >
                  <div className="space-y-1.5">
                    <label
                      htmlFor="new-role-name"
                      className="text-sm font-medium"
                    >
                      Role name
                    </label>
                    <Input
                      id="new-role-name"
                      placeholder="Ops Admin"
                      autoFocus
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                    />
                    {newRoleError && (
                      <p className="text-xs text-destructive">
                        {newRoleError}
                      </p>
                    )}
                  </div>
                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsNewRoleOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createRoleMutation.isPending ||
                        !newRoleName.trim()
                      }
                    >
                      {createRoleMutation.isPending
                        ? "Creating…"
                        : "Create"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Roles list */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6 space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Roles</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={!selectedRole || !!selectedRole?.built_in}
                  onClick={() => {
                    if (!selectedRole) return;
                    const next = window.prompt(
                      "New role name:",
                      selectedRole.name
                    );
                    if (!next || !next.trim() || next === selectedRole.name)
                      return;
                    adminJson(
                      `${API}/api/admin/roles/${selectedRole.id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: next.trim() }),
                      }
                    )
                      .then(() =>
                        qc.invalidateQueries({
                          queryKey: ["adminPerms:roles"],
                        })
                      )
                      .catch((err) => {
                        if (
                          String(err?.message || "").includes(
                            "unauthorized"
                          )
                        )
                          return;
                        alert(
                          "❌ " +
                            (err?.message || "Failed to rename role")
                        );
                      });
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <Input
                  placeholder="Search roles…"
                  className="pl-9"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
              </div>

              <ScrollArea className="flex-1 rounded border">
                {rolesLoading && (
                  <div className="p-4 text-sm text-muted-foreground">
                    Loading roles…
                  </div>
                )}
                {!rolesLoading && allRoles.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">
                    No roles yet. Create one to begin.
                  </div>
                )}
                <div className="flex flex-col">
                  {allRoles.map((role) => {
                    const isActive = role.id === selectedRoleId;
                    const builtIn = !!role.built_in;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRoleId(role.id)}
                        className={`flex items-center justify-between px-3 py-2 text-left text-sm border-b last:border-b-0 transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">{role.name}</span>
                        {builtIn && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase tracking-wide"
                          >
                            built-in
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive hover:bg-destructive/10"
                  disabled={!selectedRole || !!selectedRole?.built_in}
                  onClick={handleDeleteRole}
                >
                  Delete Role
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsNewRoleOpen(true)}
                >
                  + Add Role
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Middle: Permissions matrix */}
          <Card className="lg:col-span-6">
            <CardContent className="p-6 space-y-4 h-full flex flex-col">
              <div className="space-y-1">
                <h3 className="font-semibold">Permissions</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedRole
                    ? `Editing: ${selectedRole.name}${
                        selectedRole.built_in ? " (built-in)" : ""
                      }`
                    : "Select a role to edit its permissions."}
                </p>
              </div>

              {/* Filter row */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <Input
                    placeholder="Filter permissions… (e.g. user, billing)"
                    className="pl-9"
                    value={permFilter}
                    onChange={(e) => setPermFilter(e.target.value)}
                    disabled={!selectedRole}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPermFilter("")}
                  disabled={!permFilter}
                >
                  Clear
                </Button>
              </div>

              {/* Matrix */}
              <ScrollArea className="flex-1 rounded border">
                <div className="p-4 space-y-3">
                  {(schemaLoading || permsLoading) && (
                    <p className="text-sm text-muted-foreground">
                      Loading permissions…
                    </p>
                  )}
                  {!schemaLoading &&
                    !permsLoading &&
                    selectedRole &&
                    filteredGroups.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No permissions available.
                      </p>
                    )}

                  {!schemaLoading &&
                    !permsLoading &&
                    selectedRole &&
                    filteredGroups.map((group) => {
                      const key = group.key || "group";
                      const groupId = `group-${key}`;
                      const isOpen = true; // keep all expanded (like bootstrap)
                      return (
                        <div
                          key={groupId}
                          className="border rounded-lg overflow-hidden"
                        >
                          <button
                            type="button"
                            className="w-full flex items-center justify-between px-4 py-3 bg-muted/40"
                          >
                            <span className="font-medium text-sm">
                              {group.title || group.key}
                            </span>
                            {isOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          <div className="px-4 pb-3 pt-2 space-y-2">
                            {(group.perms ?? []).map((perm) => {
                              const checked = workingPerms.has(perm.key);
                              return (
                                <div
                                  key={perm.key}
                                  className="flex items-start gap-2"
                                >
                                  <Checkbox
                                    id={perm.key}
                                    checked={checked}
                                    disabled={!canEditSelectedRole}
                                    onCheckedChange={(val) =>
                                      handleTogglePerm(
                                        perm.key,
                                        Boolean(val)
                                      )
                                    }
                                  />
                                  <div className="space-y-0.5">
                                    <label
                                      htmlFor={perm.key}
                                      className="text-sm cursor-pointer"
                                    >
                                      {perm.label || perm.key}
                                    </label>
                                    {perm.desc && (
                                      <p className="text-xs text-muted-foreground">
                                        {perm.desc}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ScrollArea>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-3 border-t mt-3">
                <p className="text-xs text-muted-foreground">
                  {selectedRole
                    ? isDirty
                      ? "Unsaved changes."
                      : "No changes."
                    : "Select a role to begin."}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRevertPerms}
                    disabled={!selectedRole || !isDirty}
                  >
                    Revert
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => savePermsMutation.mutate()}
                    disabled={
                      !selectedRole ||
                      !isDirty ||
                      savePermsMutation.isPending ||
                      !canEditSelectedRole
                    }
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Members */}
          <Card className="lg:col-span-3">
            <CardContent className="p-6 space-y-4 h-full flex flex-col">
              <div>
                <h3 className="font-semibold">Members</h3>
                <p className="text-xs text-muted-foreground">
                  Admins assigned to this role.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Add by email</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    disabled={!selectedRole}
                  />
                  <Button
                    type="button"
                    onClick={handleAddMember}
                    disabled={
                      !selectedRole ||
                      !newMemberEmail.trim() ||
                      addMemberMutation.isPending
                    }
                  >
                    Add
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  User must exist in <code>admin_users</code>.
                </p>
              </div>

              <ScrollArea className="flex-1 rounded border">
                {membersLoading && (
                  <div className="p-4 text-sm text-muted-foreground">
                    Loading members…
                  </div>
                )}
                {!membersLoading && members.length === 0 && (
                  <div className="p-4 text-sm text-muted-foreground">
                    No members assigned to this role.
                  </div>
                )}
                <ul className="divide-y">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {initialsFrom(m.name, m.email)}
                        </div>
                        <div>
                          <div className="font-medium">
                            {m.name || "(No name)"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.email || ""}
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemoveMember(m.id)}
                      >
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Recent changes / audit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Recent Changes</CardTitle>
            <div className="flex items-center gap-2">
              <Select
                value={auditWindow}
                onValueChange={(val) =>
                  setAuditWindow(val as "24h" | "7d" | "30d")
                }
              >
                <SelectTrigger className="w-40">
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
                variant="outline"
                size="icon"
                onClick={() => refetchAudit()}
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2 font-semibold text-muted-foreground">
                      When
                    </th>
                    <th className="py-2 font-semibold text-muted-foreground">
                      Admin
                    </th>
                    <th className="py-2 font-semibold text-muted-foreground">
                      Action
                    </th>
                    <th className="py-2 font-semibold text-muted-foreground">
                      Target
                    </th>
                    <th className="py-2 font-semibold text-muted-foreground">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Loading…
                      </td>
                    </tr>
                  )}
                  {!auditLoading && auditRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No recent changes in the selected timeframe.
                      </td>
                    </tr>
                  )}
                  {!auditLoading &&
                    auditRows.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 align-top">{row.when}</td>
                        <td className="py-2 align-top">{row.admin}</td>
                        <td className="py-2 align-top">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {row.action}
                          </code>
                        </td>
                        <td className="py-2 align-top">{row.target}</td>
                        <td className="py-2 align-top text-muted-foreground">
                          {row.details}
                        </td>
                      </tr>
                    ))}
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
