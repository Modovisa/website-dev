// src/pages/admin/Users.tsx

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Users as UsersIcon,
  UserPlus,
  CheckCircle,
  XCircle,
  Ban,
  ShieldAlert,
  Power,
  KeyRound,
  Eye,
  Archive,
  RotateCcw,
  Clock,
  Trash2,
  Printer,
  FileSpreadsheet,
  FileText,
  Copy,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { secureAdminFetch } from "@/lib/auth/adminAuth";

const API = "https://api.modovisa.com";

/* ----------------------------------------------------------------------------
 * Types
 * --------------------------------------------------------------------------*/

type UsersKpiTotals = {
  total_users?: number;
  new_signups_7d?: number;
  paying_users?: number;
  blocked_suspended?: number;
};

type UsersKpiResponse = {
  totals?: UsersKpiTotals;
};

type PlatformUserOverride = {
  override_max_events?: number | null;
  valid_until?: string | null;
  note?: string | null;
};

type PlatformUser = {
  id: number;
  full_name?: string | null;
  email?: string | null;
  avatar?: string | null;
  role?: string | null;
  current_plan?: string | null;
  billing?: string | null;
  events_override?: PlatformUserOverride | null;
  override?: PlatformUserOverride | null;
  status?: string | null;
  [key: string]: any;
};

type UsersListResponse =
  | { users?: PlatformUser[]; data?: PlatformUser[] }
  | any;

type CountryOption = {
  iso_code: string;
  name: string;
};

type UserRoleOption = {
  name: string;
};

type PlanOption = {
  name: string;
};

type AdminSettings = {
  DEACTIVATE_GRACE_DAYS?: number | string;
  HARD_DELETE_GRACE_DAYS?: number | string;
};

type OverrideFormState = {
  type: "unlimited" | "cap";
  cap: string;
  months: string;
  until: string; // local "YYYY-MM-DDTHH:mm"
  note: string;
};

/* ----------------------------------------------------------------------------
 * Helpers
 * --------------------------------------------------------------------------*/

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

function safeStatus(status?: string | null) {
  return (status || "").toLowerCase();
}

function statusBadgeClass(status?: string | null) {
  const s = safeStatus(status);
  if (s === "active")
    return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 backdrop-blur-sm hover:bg-emerald-500/20";
  if (s === "suspended")
    return "bg-amber-500/10 text-amber-600 border border-amber-500/30 backdrop-blur-sm hover:bg-amber-500/20";
  if (s === "blocked")
    return "bg-red-500/10 text-red-600 border border-red-500/30 backdrop-blur-sm hover:bg-red-500/20";
  if (s === "pending")
    return "bg-sky-500/10 text-sky-600 border border-sky-500/30 backdrop-blur-sm hover:bg-sky-500/20";
  if (s === "inactive")
    return "bg-slate-500/10 text-slate-600 border border-slate-500/30 backdrop-blur-sm hover:bg-slate-500/20";
  return "bg-muted text-muted-foreground border border-muted-foreground/20";
}

function initialsFromName(name?: string | null) {
  if (!name) return "??";
  const m = name.match(/\b\w/g);
  if (!m) return name.slice(0, 2).toUpperCase();
  return m.join("").slice(0, 2).toUpperCase();
}

function formatOverrideBadge(o?: PlatformUserOverride | null) {
  if (!o) {
    return {
      label: "None",
      badgeClass: "bg-muted text-muted-foreground border border-muted-foreground/30",
      sub: "",
    };
  }

  const until = o.valid_until
    ? new Date(o.valid_until).toISOString().slice(0, 10)
    : "—";

  if (o.override_max_events == null) {
    return {
      label: "Unlimited",
      badgeClass: "bg-sky-500/10 text-sky-600 border border-sky-500/30",
      sub: `until ${until}`,
    };
  }

  return {
    label: `${Number(o.override_max_events).toLocaleString()} max`,
    badgeClass: "bg-primary/10 text-primary border border-primary/30",
    sub: `until ${until}`,
  };
}

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function localInputToUtcIso(localValue: string) {
  if (!localValue) return null;
  const dt = new Date(localValue);
  if (Number.isNaN(dt.getTime())) return null;
  const utc = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
  return utc.toISOString();
}

/* ----------------------------------------------------------------------------
 * Component
 * --------------------------------------------------------------------------*/

const Users = () => {
  // KPIs
  const [kpis, setKpis] = useState<UsersKpiTotals | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);

  // Users list
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // Filters + pagination
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Add user sheet
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addCountry, setAddCountry] = useState("");
  const [addRole, setAddRole] = useState("");
  const [addPlan, setAddPlan] = useState("");
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Dropdown options
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [roles, setRoles] = useState<UserRoleOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  // Block modal
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockUser, setBlockUser] = useState<PlatformUser | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [blockSubmitting, setBlockSubmitting] = useState(false);

  // Override modal
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideUser, setOverrideUser] = useState<PlatformUser | null>(null);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>({
    type: "unlimited",
    cap: "",
    months: "",
    until: "",
    note: "",
  });
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Admin settings (for deactivate / schedule delete copy)
  const adminSettingsRef = useRef<AdminSettings | null>(null);

  /* ---------------------- API loaders ---------------------- */

  const loadUsersKpis = useCallback(async () => {
    setKpiLoading(true);
    try {
      const res = await secureAdminFetch(
        `${API}/api/admin/users/metrics`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const json = (await res.json().catch(() => ({}))) as UsersKpiResponse;
      if (json.totals) setKpis(json.totals);
    } catch (err) {
      console.warn("[admin users] loadUsersKpis error:", err);
    } finally {
      setKpiLoading(false);
    }
  }, []);

  const loadUsersList = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await secureAdminFetch(
        `${API}/api/admin-platform-users-list`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const json = (await res.json().catch(() => ({}))) as UsersListResponse;
      const rows = Array.isArray(json.users)
        ? json.users
        : Array.isArray(json.data)
        ? json.data
        : [];
      setUsers(rows);
    } catch (err) {
      console.warn("[admin users] loadUsersList error:", err);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadDropdowns = useCallback(async () => {
    try {
      // Countries
      const [countriesRes, rolesRes, plansRes] = await Promise.all([
        secureAdminFetch(`${API}/api/dropdown/countries`, {
          method: "GET",
          cache: "no-store",
        }),
        secureAdminFetch(`${API}/api/dropdown/platform-user-roles`, {
          method: "GET",
          cache: "no-store",
        }),
        secureAdminFetch(`${API}/api/dropdown/plans`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      const [countriesJson, rolesJson, plansJson] = await Promise.all([
        countriesRes.json().catch(() => ({})),
        rolesRes.json().catch(() => ({})),
        plansRes.json().catch(() => ({})),
      ]);

      setCountries(Array.isArray(countriesJson.countries) ? countriesJson.countries : []);
      setRoles(Array.isArray(rolesJson.roles) ? rolesJson.roles : []);
      setPlans(Array.isArray(plansJson.plans) ? plansJson.plans : []);
    } catch (err) {
      console.warn("[admin users] loadDropdowns error:", err);
    }
  }, []);

  const loadAdminSettingsOnce = useCallback(async () => {
    if (adminSettingsRef.current) return adminSettingsRef.current;
    try {
      const res = await secureAdminFetch(`${API}/api/admin/settings`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({}));
      const settings = (json.settings || {}) as AdminSettings;
      adminSettingsRef.current = settings;
      return settings;
    } catch (err) {
      console.warn("[admin users] loadAdminSettings error:", err);
      adminSettingsRef.current = {};
      return {};
    }
  }, []);

  /* ---------------------- Effects ---------------------- */

  useEffect(() => {
    loadUsersKpis();
    loadUsersList();
    loadDropdowns();
  }, [loadUsersKpis, loadUsersList, loadDropdowns]);

  // Reset page when filters/pageSize change
  useEffect(() => {
    setPage(1);
  }, [search, filterRole, filterPlan, filterStatus, pageSize]);

  /* ---------------------- Derived state ---------------------- */

  const stats = useMemo(
    () => [
      {
        key: "total_users",
        title: "Total Users",
        subtitle: "All time",
        value: kpis?.total_users,
        icon: UsersIcon,
        bgClass: "bg-primary/10",
        iconClass: "text-primary",
      },
      {
        key: "new_signups_7d",
        title: "New Signups",
        subtitle: "Last 7 days",
        value: kpis?.new_signups_7d,
        icon: UserPlus,
        bgClass: "bg-cyan-500/10",
        iconClass: "text-cyan-500",
      },
      {
        key: "paying_users",
        title: "Paying Subscribers",
        subtitle: "Stripe status = active",
        value: kpis?.paying_users,
        icon: CheckCircle,
        bgClass: "bg-emerald-500/10",
        iconClass: "text-emerald-500",
      },
      {
        key: "blocked_suspended",
        title: "Blocked / Suspended",
        subtitle: "Users needing review",
        value: kpis?.blocked_suspended,
        icon: XCircle,
        bgClass: "bg-destructive/10",
        iconClass: "text-destructive",
      },
    ],
    [kpis],
  );

  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((u) => {
      const name = (u.full_name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = safeStatus(u.role);
      const plan = (u.current_plan || "").toLowerCase();
      const status = safeStatus(u.status);

      if (s && !name.includes(s) && !email.includes(s)) return false;
      if (filterRole !== "all" && role !== filterRole) return false;
      if (filterPlan !== "all" && plan !== filterPlan) return false;
      if (filterStatus !== "all" && status !== filterStatus) return false;
      return true;
    });
  }, [users, search, filterRole, filterPlan, filterStatus]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredUsers.length / pageSize || 1),
  );
  const currentPage = Math.min(page, totalPages);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, currentPage, pageSize]);

  const showingFrom =
    filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo =
    filteredUsers.length === 0
      ? 0
      : Math.min(filteredUsers.length, currentPage * pageSize);

  const distinctRoles = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((u) => safeStatus(u.role))
            .filter(Boolean),
        ),
      ),
    [users],
  );
  const distinctPlans = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((u) => (u.current_plan || "").toLowerCase())
            .filter(Boolean),
        ),
      ),
    [users],
  );
  const distinctStatuses = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .map((u) => safeStatus(u.status))
            .filter(Boolean),
        ),
      ),
    [users],
  );

  /* ---------------------- Actions ---------------------- */

  const reloadUsersAndKpis = useCallback(async () => {
    await Promise.all([loadUsersList(), loadUsersKpis()]);
  }, [loadUsersList, loadUsersKpis]);

  const handleStatusUpdate = useCallback(
    async (user: PlatformUser, action: "suspend" | "activate") => {
      const status = action === "suspend" ? "suspended" : "active";
      const label =
        action === "suspend" ? "suspend this user" : "activate this user";

      if (
        !window.confirm(
          `Are you sure you want to ${label}?`,
        )
      )
        return;

      try {
        const res = await secureAdminFetch(
          `${API}/api/admin-update-user-status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.id,
              status,
            }),
          },
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Failed to update status");
        }
        window.alert("Status updated.");
        await reloadUsersAndKpis();
      } catch (err: any) {
        console.error("[admin users] handleStatusUpdate error:", err);
        window.alert(
          `Failed to update status: ${err?.message || "Unknown error"}`,
        );
      }
    },
    [reloadUsersAndKpis],
  );

  const handleLifecycleAction = useCallback(
    async (
      user: PlatformUser,
      action: "deactivate" | "restore" | "schedule-delete" | "hard-delete",
    ) => {
      try {
        const settings = await loadAdminSettingsOnce();
        const dGrace = Number(settings.DEACTIVATE_GRACE_DAYS ?? 30);
        const hGrace = Number(settings.HARD_DELETE_GRACE_DAYS ?? 30);

        if (action === "deactivate") {
          const cancelAtPeriodEnd = window.confirm(
            "Cancel Stripe at period end? OK = period-end, Cancel = immediate cancel.",
          );
          if (dGrace > 0) {
            window.alert(
              `After deactivation, this account is restorable for ${dGrace} day(s). It will be scheduled to hard-delete automatically after that period.`,
            );
          } else {
            window.alert(
              "After deactivation, this account will NOT be auto-scheduled for hard delete.",
            );
          }

          const res = await secureAdminFetch(
            `${API}/api/admin/users/${user.id}/deactivate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cancel_at_period_end: !!cancelAtPeriodEnd,
              }),
            },
          );
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || "Failed to deactivate");
          window.alert("User deactivated.");
        }

        if (action === "restore") {
          if (
            !window.confirm(
              "Restore this user to active?",
            )
          )
            return;
          const res = await secureAdminFetch(
            `${API}/api/admin/users/${user.id}/restore`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || "Failed to restore");
          window.alert("User restored.");
        }

        if (action === "schedule-delete") {
          if (
            !window.confirm(
              `Schedule hard delete in ${hGrace} day(s)?`,
            )
          )
            return;
          const res = await secureAdminFetch(
            `${API}/api/admin/users/${user.id}/schedule-delete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );
          const j = await res.json().catch(() => ({}));
          if (!res.ok)
            throw new Error(j.error || "Failed to schedule delete");
          window.alert(`Hard delete scheduled in ${hGrace} day(s).`);
        }

        if (action === "hard-delete") {
          if (
            !window.confirm(
              "PERMANENT: This will delete the user and all their data. Continue?",
            )
          )
            return;
          const reason =
            window.prompt("Optional reason for audit:", "") || "";
          const res = await secureAdminFetch(
            `${API}/api/admin/users/${user.id}/hard-delete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason }),
            },
          );
          const j = await res.json().catch(() => ({}));
          if (!res.ok)
            throw new Error(j.error || "Failed to hard delete");
          window.alert("User deleted permanently.");
        }

        await reloadUsersAndKpis();
      } catch (err: any) {
        console.error("[admin users] handleLifecycleAction error:", err);
        window.alert(
          `Action failed: ${err?.message || "Unknown error"}`,
        );
      }
    },
    [loadAdminSettingsOnce, reloadUsersAndKpis],
  );

  const handleOpenBlock = useCallback((user: PlatformUser) => {
    setBlockUser(user);
    setBlockReason("");
    setBlockOpen(true);
  }, []);

  const handleBlockSubmit = useCallback(async () => {
    if (!blockUser) return;
    setBlockSubmitting(true);
    try {
      const res = await secureAdminFetch(
        `${API}/api/admin-update-user-status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: blockUser.id,
            status: "blocked",
            comment: blockReason || undefined,
          }),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to block user");
      window.alert("User blocked successfully.");
      setBlockOpen(false);
      await reloadUsersAndKpis();
    } catch (err: any) {
      console.error("[admin users] handleBlockSubmit error:", err);
      window.alert(
        `Failed to block user: ${err?.message || "Unknown error"}`,
      );
    } finally {
      setBlockSubmitting(false);
    }
  }, [blockUser, blockReason, reloadUsersAndKpis]);

  const handleOpenOverride = useCallback(
    async (user: PlatformUser) => {
      setOverrideUser(user);
      setOverrideSubmitting(false);
      setOverrideForm({
        type: "unlimited",
        cap: "",
        months: "",
        until: "",
        note: "",
      });

      try {
        const res = await secureAdminFetch(
          `${API}/api/admin/user-event-override?user_id=${encodeURIComponent(
            String(user.id),
          )}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        const j = await res.json().catch(() => ({}));
        const o = (j.override || null) as PlatformUserOverride | null;
        if (o) {
          const type = o.override_max_events == null ? "unlimited" : "cap";
          setOverrideForm({
            type,
            cap:
              o.override_max_events != null
                ? String(o.override_max_events)
                : "",
            months: "",
            until: toLocalInputValue(o.valid_until),
            note: o.note || "",
          });
        }
      } catch (err) {
        console.warn("[admin users] load override error:", err);
      } finally {
        setOverrideOpen(true);
      }
    },
    [],
  );

  const handleSaveOverride = useCallback(async () => {
    if (!overrideUser) return;

    const body: any = {
      user_id: overrideUser.id,
      months: overrideForm.months ? Number(overrideForm.months) : null,
      note: overrideForm.note.trim() || null,
    };

    if (overrideForm.type === "cap") {
      const cap = Number(overrideForm.cap);
      if (!Number.isFinite(cap) || cap <= 0) {
        window.alert("Please enter a valid custom cap.");
        return;
      }
      body.override_max_events = cap;
    } else {
      body.override_max_events = null;
    }

    if (overrideForm.until) {
      const iso = localInputToUtcIso(overrideForm.until);
      if (iso) body.valid_until = iso;
    }

    setOverrideSubmitting(true);
    try {
      const res = await secureAdminFetch(
        `${API}/api/admin/user-event-override`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to save override");
      window.alert("Override saved.");
      setOverrideOpen(false);
      await reloadUsersAndKpis();
    } catch (err: any) {
      console.error("[admin users] handleSaveOverride error:", err);
      window.alert(
        `Failed to save override: ${err?.message || "Unknown error"}`,
      );
    } finally {
      setOverrideSubmitting(false);
    }
  }, [overrideUser, overrideForm, reloadUsersAndKpis]);

  const handleClearOverride = useCallback(async () => {
    if (!overrideUser) return;
    if (
      !window.confirm(
        "Remove this user’s event override?",
      )
    )
      return;

    setOverrideSubmitting(true);
    try {
      const res = await secureAdminFetch(
        `${API}/api/admin/user-event-override?user_id=${encodeURIComponent(
          String(overrideUser.id),
        )}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to clear override");
      window.alert("Override cleared.");
      setOverrideOpen(false);
      await reloadUsersAndKpis();
    } catch (err: any) {
      console.error("[admin users] handleClearOverride error:", err);
      window.alert(
        `Failed to clear override: ${err?.message || "Unknown error"}`,
      );
    } finally {
      setOverrideSubmitting(false);
    }
  }, [overrideUser, reloadUsersAndKpis]);

  const handleAddUserSubmit = useCallback(async () => {
    const errors: Record<string, string> = {};
    if (!addName.trim()) errors.name = "Please enter full name";
    if (!addEmail.trim()) errors.email = "Please enter email";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addEmail.trim())) {
      errors.email = "Invalid email address";
    }

    setAddErrors(errors);
    if (Object.keys(errors).length) return;

    const payload = {
      name: addName.trim(),
      email: addEmail.trim(),
      phone: addPhone.trim() || undefined,
      company: addCompany.trim() || undefined,
      country: addCountry || undefined,
      role: addRole || undefined,
      plan: addPlan || undefined,
    };

    setAddSubmitting(true);
    try {
      const res = await secureAdminFetch(
        `${API}/api/admin-create-user`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to create user");

      window.alert("User created successfully.");
      setIsAddUserOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPhone("");
      setAddCompany("");
      setAddCountry("");
      setAddRole("");
      setAddPlan("");
      setAddErrors({});
      await reloadUsersAndKpis();
    } catch (err: any) {
      console.error("[admin users] add user error:", err);
      window.alert(
        `Failed to create user: ${err?.message || "Unknown error"}`,
      );
    } finally {
      setAddSubmitting(false);
    }
  }, [
    addName,
    addEmail,
    addPhone,
    addCompany,
    addCountry,
    addRole,
    addPlan,
    reloadUsersAndKpis,
  ]);

  const handleViewAccount = useCallback((user: PlatformUser) => {
    if (!user.id) return;
    // For now, mirror bootstrap: go to legacy profile page.
    window.open(`/mv-admin/user-profile?user_id=${user.id}`, "_blank");
  }, []);

  /* ----------------------------------------------------------------------------
   * Render
   * --------------------------------------------------------------------------*/

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* KPIs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.key}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-lg ${stat.bgClass}`}
                  >
                    <stat.icon
                      className={`h-5 w-5 ${stat.iconClass}`}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`${stat.title} info`}
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold">
                    {kpiLoading && !kpis
                      ? "…"
                      : formatNumber(stat.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.subtitle}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Users */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2">
              <CardTitle className="text-lg">
                Platform Users
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage accounts, overrides, and lifecycle actions.
              </p>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {/* Filters + actions row */}
            <div className="flex flex-col gap-4 mb-4">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    entries per page
                  </span>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-end">
                  <div className="flex flex-col md:flex-row gap-3">
                    {/* Role filter */}
                    <Select
                      value={filterRole}
                      onValueChange={setFilterRole}
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {distinctRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Plan filter */}
                    <Select
                      value={filterPlan}
                      onValueChange={setFilterPlan}
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Plans</SelectItem>
                        {distinctPlans.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Status filter */}
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-full md:w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Statuses
                        </SelectItem>
                        {distinctStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <Input
                      placeholder="Search User"
                      className="w-full md:w-64"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                    />

                    <div className="flex gap-2">
                      {/* Export menu – visual mirror, no-op for now */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline">
                            <span className="flex items-center gap-2">
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
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8-4-4m0 0L8 8m4-4v12"
                                />
                              </svg>
                              <span className="hidden sm:inline">
                                Export
                              </span>
                            </span>
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

                      {/* Add User */}
                      <Sheet
                        open={isAddUserOpen}
                        onOpenChange={setIsAddUserOpen}
                      >
                        <SheetTrigger asChild>
                          <Button>
                            <UserPlus className="h-4 w-4 mr-1.5" />
                            <span className="hidden sm:inline">
                              Add New User
                            </span>
                            <span className="sm:hidden">Add</span>
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:w-[460px]">
                          <SheetHeader>
                            <SheetTitle>Add User</SheetTitle>
                            <SheetDescription>
                              Enter details to create a new platform
                              user.
                            </SheetDescription>
                          </SheetHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                              <Label htmlFor="name">
                                Full Name
                              </Label>
                              <Input
                                id="name"
                                placeholder="John Doe"
                                value={addName}
                                onChange={(e) =>
                                  setAddName(e.target.value)
                                }
                              />
                              {addErrors.name && (
                                <p className="text-xs text-destructive">
                                  {addErrors.name}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="email">
                                Email
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="john.doe@example.com"
                                value={addEmail}
                                onChange={(e) =>
                                  setAddEmail(e.target.value)
                                }
                              />
                              {addErrors.email && (
                                <p className="text-xs text-destructive">
                                  {addErrors.email}
                                </p>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="contact">
                                Contact
                              </Label>
                              <Input
                                id="contact"
                                placeholder="+1 (609) 988-44-11"
                                value={addPhone}
                                onChange={(e) =>
                                  setAddPhone(e.target.value)
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="company">
                                Company
                              </Label>
                              <Input
                                id="company"
                                placeholder="Web Developer"
                                value={addCompany}
                                onChange={(e) =>
                                  setAddCompany(e.target.value)
                                }
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Label>Country</Label>
                              <Select
                                value={addCountry}
                                onValueChange={setAddCountry}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">
                                    Select
                                  </SelectItem>
                                  {countries.map((c) => (
                                    <SelectItem
                                      key={c.iso_code}
                                      value={c.iso_code}
                                    >
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <Label>User Role</Label>
                              <Select
                                value={addRole}
                                onValueChange={setAddRole}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">
                                    Select Role
                                  </SelectItem>
                                  {roles.map((r) => (
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

                            <div className="space-y-1.5">
                              <Label>Select Plan</Label>
                              <Select
                                value={addPlan}
                                onValueChange={setAddPlan}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select Plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">
                                    Select Plan
                                  </SelectItem>
                                  {plans.map((p) => (
                                    <SelectItem
                                      key={p.name}
                                      value={p.name.toLowerCase()}
                                    >
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                className="flex-1"
                                disabled={addSubmitting}
                                onClick={handleAddUserSubmit}
                              >
                                {addSubmitting
                                  ? "Submitting…"
                                  : "Submit"}
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                                onClick={() =>
                                  setIsAddUserOpen(false)
                                }
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users table */}
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left">
                      <th className="py-2 pl-3 w-8">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                        />
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold text-muted-foreground">
                        USER
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold text-muted-foreground">
                        ROLE
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold text-muted-foreground">
                        PLAN
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold text-muted-foreground">
                        BILLING
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold text-muted-foreground">
                        EVENTS
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold text-muted-foreground">
                        STATUS
                      </th>
                      <th className="py-2 pr-3 text-xs font-semibold text-muted-foreground">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersLoading && !users.length ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          Loading users…
                        </td>
                      </tr>
                    ) : paginatedUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          No users found for current filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedUsers.map((user) => {
                        const name =
                          user.full_name || "(No name)";
                        const email =
                          user.email || "—";
                        const override =
                          (user.override ||
                            user.events_override) ?? null;
                        const ov = formatOverrideBadge(
                          override,
                        );

                        return (
                          <tr
                            key={user.id}
                            className="border-t last:border-b-0 hover:bg-muted/40 transition-colors"
                          >
                            <td className="py-3 pl-3">
                              <input
                                type="checkbox"
                                className="rounded border-input"
                              />
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  {user.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={user.avatar}
                                      alt={name}
                                      className="h-full w-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                      {initialsFromName(
                                        name,
                                      )}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {name}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-sm">
                              {user.role || "—"}
                            </td>
                            <td className="py-3 pr-3 text-sm">
                              {user.current_plan || "—"}
                            </td>
                            <td className="py-3 pr-3 text-sm">
                              {user.billing || "—"}
                            </td>
                            <td className="py-3 pr-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={`text-[11px] px-2 py-0.5 ${ov.badgeClass}`}
                                >
                                  {ov.label}
                                </Badge>
                                {ov.sub && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {ov.sub}
                                  </span>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-primary hover:bg-primary/10"
                                  onClick={() =>
                                    handleOpenOverride(
                                      user,
                                    )
                                  }
                                >
                                  Set…
                                </Button>
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <Badge
                                className={statusBadgeClass(
                                  user.status,
                                )}
                              >
                                {user.status || "Unknown"}
                              </Badge>
                            </td>
                            <td className="py-3 pr-3">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full"
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle
                                        cx="12"
                                        cy="5"
                                        r="1"
                                      />
                                      <circle
                                        cx="12"
                                        cy="12"
                                        r="1"
                                      />
                                      <circle
                                        cx="12"
                                        cy="19"
                                        r="1"
                                      />
                                    </svg>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-52"
                                >
                                  <DropdownMenuItem
                                    className="text-amber-600"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        user,
                                        "suspend",
                                      )
                                    }
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Suspend
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      handleOpenBlock(user)
                                    }
                                  >
                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                    Block
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-emerald-600"
                                    onClick={() =>
                                      handleStatusUpdate(
                                        user,
                                        "activate",
                                      )
                                    }
                                  >
                                    <Power className="mr-2 h-4 w-4" />
                                    Activate
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    onClick={() =>
                                      window.alert(
                                        "Reset password flow not wired yet.",
                                      )
                                    }
                                  >
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleViewAccount(user)
                                    }
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Account
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="text-amber-600"
                                    onClick={() =>
                                      handleLifecycleAction(
                                        user,
                                        "deactivate",
                                      )
                                    }
                                  >
                                    <Archive className="mr-2 h-4 w-4" />
                                    Deactivate (soft)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-emerald-600"
                                    onClick={() =>
                                      handleLifecycleAction(
                                        user,
                                        "restore",
                                      )
                                    }
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restore
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    className="text-amber-600"
                                    onClick={() =>
                                      handleLifecycleAction(
                                        user,
                                        "schedule-delete",
                                      )
                                    }
                                  >
                                    <Clock className="mr-2 h-4 w-4" />
                                    Schedule Hard Delete…
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() =>
                                      handleLifecycleAction(
                                        user,
                                        "hard-delete",
                                      )
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hard Delete Now
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-xs gap-4">
                <span className="text-muted-foreground">
                  {usersLoading && users.length
                    ? "Refreshing users…"
                    : `Showing ${showingFrom} to ${showingTo} of ${filteredUsers.length} entries`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setPage((p) => Math.max(1, p - 1))
                    }
                  >
                    &lt;
                  </Button>
                  {Array.from({ length: totalPages }).map(
                    (_, i) => {
                      const p = i + 1;
                      return (
                        <Button
                          key={p}
                          size="sm"
                          variant={
                            p === currentPage
                              ? "default"
                              : "outline"
                          }
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      );
                    },
                  )}
                  <Button
                    variant="outline"
                    size="sm"
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

        {/* Block User dialog */}
        <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Block User</DialogTitle>
              <DialogDescription>
                This sets the user&rsquo;s status to{" "}
                <span className="font-semibold">blocked</span>{" "}
                and records an optional admin comment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm">
                Are you sure you want to block{" "}
                <span className="font-semibold">
                  {blockUser?.full_name || "(No name)"}
                </span>
                ?
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="block-reason">
                  Admin Comment (optional)
                </Label>
                <Textarea
                  id="block-reason"
                  rows={3}
                  placeholder="Reason for blocking…"
                  value={blockReason}
                  onChange={(e) =>
                    setBlockReason(e.target.value)
                  }
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setBlockOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={blockSubmitting}
                onClick={handleBlockSubmit}
              >
                {blockSubmitting ? "Blocking…" : "Block User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Grant Events / Override dialog */}
        <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Grant Free Events / Override
              </DialogTitle>
              <DialogDescription>
                Priority:{" "}
                <strong>Free forever</strong> →{" "}
                <strong>Override (this)</strong> → Subscription
                → Free tier.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-sm">
                User:{" "}
                <span className="font-semibold">
                  {overrideUser?.full_name ||
                    overrideUser?.email ||
                    `(id ${overrideUser?.id})`}
                </span>
              </p>

              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={overrideForm.type}
                  onValueChange={(v: "unlimited" | "cap") =>
                    setOverrideForm((prev) => ({
                      ...prev,
                      type: v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unlimited">
                      Unlimited (for N months)
                    </SelectItem>
                    <SelectItem value="cap">
                      Custom cap (max events) until N months
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {overrideForm.type === "cap" && (
                <div className="space-y-1.5">
                  <Label>Custom max events</Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={overrideForm.cap}
                    onChange={(e) =>
                      setOverrideForm((prev) => ({
                        ...prev,
                        cap: e.target.value,
                      }))
                    }
                    placeholder="e.g. 50000"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={overrideForm.months}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({
                      ...prev,
                      months: e.target.value,
                    }))
                  }
                  placeholder="e.g. 3"
                />
                <p className="text-[11px] text-muted-foreground">
                  You can edit/remove later. Leaving months blank
                  is allowed only if you specify an explicit end
                  date.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>End date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={overrideForm.until}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({
                      ...prev,
                      until: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Admin note (optional)</Label>
                <Textarea
                  rows={2}
                  maxLength={500}
                  placeholder="Reason or campaign name…"
                  value={overrideForm.note}
                  onChange={(e) =>
                    setOverrideForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-900">
                Priority:{" "}
                <strong>Free forever</strong> →{" "}
                <strong>Override</strong> → Subscription → Free
                tier.
              </div>
            </div>

            <DialogFooter className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="mr-auto text-destructive border-destructive/30"
                disabled={overrideSubmitting}
                onClick={handleClearOverride}
              >
                Clear Override
              </Button>
              <Button
                variant="outline"
                onClick={() => setOverrideOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={overrideSubmitting}
                onClick={handleSaveOverride}
              >
                {overrideSubmitting ? "Saving…" : "Save Override"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default Users;
