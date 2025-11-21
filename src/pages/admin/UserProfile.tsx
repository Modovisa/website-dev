// src/pages/admin/UserProfile.tsx
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, MoreVertical, Pencil, Trash2, Eye, EyeOff, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// ❌ User guard is for normal app pages only – remove from admin pages
// import { useAuthGuard } from "@/hooks/useAuthGuard";

// 🔐 Admin-only auth helpers
import { adminSecureFetch, initAdminAuth } from "@/lib/auth/adminAuth";

const AdminBillingAndPlansLazy = lazy(
  () => import("@/components/profile/BillingAndPlans")
);

type AdminUserProfile = {
  id: number;
  username?: string;
  email?: string;
  plan?: string;
  is_free_forever?: number | boolean | string;
  created_at?: string;
  last_login_at?: string;
  twofa_enabled?: boolean;
};

type AdminBillingInfo = {
  plan_name?: string;
  plan_features?: string;
  is_free_forever?: number | boolean | string;
  price?: number;
  interval?: "month" | "year" | null;
  is_popular?: boolean;
  active_until?: string | null;
  event_count?: number;
  monthly_event_count?: number;
  yearly_event_count?: number;
  days_used?: number;
  total_days?: number;
  days_left?: number;
  cancel_at_period_end?: boolean;
  scheduled_downgrade?: {
    plan_name: string;
    start_date: string;
  } | null;
};

type AdminWebsite = {
  id: number | string;
  website_name: string;
  domain: string;
  tracking_token: string;
  timezone: string;
};

type UserStatus = "active" | "suspended" | "blocked" | "pending" | "inactive" | "unknown";

const formatDate = (dateString?: string | null) =>
  dateString
    ? new Date(dateString)
        .toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
        .replace(",", "")
    : "–";

const AdminUserProfilePage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const userId = searchParams.get("user_id");

  const [activeTab, setActiveTab] = useState<
    "tracked-sites" | "security" | "billing" | "account"
  >("tracked-sites");

  // Edit/delete sites
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWebsiteId, setEditingWebsiteId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", timezone: "" });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingWebsite, setDeletingWebsite] = useState<{
    id: string | number;
    name: string;
  } | null>(null);

  // Password state
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordAlert, setShowPasswordAlert] = useState(true);

  // ─────────────────────────────
  // Admin auth guard (admin audience)
  // ─────────────────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await initAdminAuth();
      if (!ok && !cancelled) {
        // If admin refresh/init fails, punt to admin login
        window.location.href = "/mv-admin/login.html";
      }
    })().catch((err) => {
      console.warn("Admin auth init failed", err);
      if (!cancelled) {
        window.location.href = "/mv-admin/login.html";
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Queries disabled if no userId
  const enabled = !!userId;

  // ─────────────────────────────
  // Profile
  // ─────────────────────────────
  const { data: profile } = useQuery<AdminUserProfile | null>({
    queryKey: ["admin-user-profile", userId],
    enabled,
    queryFn: async () => {
      const res = await adminSecureFetch(`/api/admin/user-profile?user_id=${userId}`, {
        method: "GET",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("admin user-profile failed", res.status, body);
        throw new Error("Failed to load user profile");
      }

      const json = await res.json().catch(() => null);
      if (!json) return null;

      const user = (json as any).user || (json as any).profile || json;
      return (user ?? null) as AdminUserProfile | null;
    },
  });

  // ─────────────────────────────
  // Status
  // ─────────────────────────────
  const { data: statusData } = useQuery<{ status: UserStatus }>({
    queryKey: ["admin-user-status", userId],
    enabled,
    queryFn: async () => {
      const res = await adminSecureFetch(`/api/admin/user-status?user_id=${userId}`, {
        method: "GET",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("admin user-status failed", res.status, body);
        throw new Error("Failed to load user status");
      }
      return res.json();
    },
  });

  // ─────────────────────────────
  // Billing summary (for left card)
  // ─────────────────────────────
  const { data: billingInfo } = useQuery<AdminBillingInfo | null>({
    queryKey: ["admin-billing-info", userId],
    enabled,
    queryFn: async () => {
      const res = await adminSecureFetch(`/api/admin/user-billing-info?user_id=${userId}`, {
        method: "GET",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("admin user-billing-info failed", res.status, body);
        throw new Error("Failed to load billing info");
      }
      const json = await res.json().catch(() => ({} as any));
      const info =
        json?.billing ??
        json?.data ??
        json?.info ??
        json;
      return (info ?? null) as AdminBillingInfo | null;
    },
  });

  // ─────────────────────────────
  // Tracking websites (match Bootstrap: POST + { projects: [...] })
  // ─────────────────────────────
  const { data: websites = [] } = useQuery<AdminWebsite[]>({
    queryKey: ["admin-tracking-websites", userId],
    enabled,
    queryFn: async () => {
      const res = await adminSecureFetch(
        `/api/admin/tracking-websites?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error("admin tracking-websites failed", res.status, body);
        throw new Error("Failed to load tracking websites");
      }

      const json = await res.json().catch(() => ({} as any));
      const trackingWebsites: AdminWebsite[] =
        json?.projects ??
        json?.websites ??
        json?.data ??
        json ??
        [];
      return trackingWebsites;
    },
  });

  const status: UserStatus = statusData?.status || "unknown";

  const isFreeForever =
    billingInfo &&
    (String(billingInfo.is_free_forever) === "1" ||
      billingInfo.is_free_forever === true);

  const effectivePlanName =
    (isFreeForever && "Free Forever") ||
    billingInfo?.plan_name ||
    profile?.plan ||
    "Free";

  const eventsThisMonth =
    billingInfo?.event_count ??
    billingInfo?.monthly_event_count ??
    billingInfo?.yearly_event_count ??
    0;

  const username = useMemo(
    () => profile?.username || profile?.email?.split("@")[0] || "User",
    [profile]
  );
  const initials = (username[0] || "U").toUpperCase();

  // ─────────────────────────────
  // Mutations
  // ─────────────────────────────
  const toggleFreeForeverMutation = useMutation({
    mutationFn: async (nextValue: boolean) => {
      const res = await adminSecureFetch(`/api/admin/set-free-forever`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(userId),
          is_free_forever: !!nextValue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to update Free Forever status");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-billing-info", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-profile", userId] });
      toast({
        title: "Updated",
        description: "Free Forever status updated.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to update Free Forever status.",
        variant: "destructive",
      });
    },
  });

  const updateWebsiteMutation = useMutation({
    mutationFn: async ({
      id,
      website_name,
      timezone,
    }: {
      id: string | number;
      website_name: string;
      timezone: string;
    }) => {
      const res = await adminSecureFetch(
        `/api/admin/update-tracking-config?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, website_name, timezone }),
        }
      );
      if (!res.ok) throw new Error("Failed to update tracking config");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-tracking-websites", userId],
      });
      toast({
        title: "Saved",
        description: "Website updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to update website.",
        variant: "destructive",
      });
    },
  });

  const deleteWebsiteMutation = useMutation({
    mutationFn: async ({ id }: { id: string | number }) => {
      const res = await adminSecureFetch(
        `/api/admin/delete-tracking-config?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
      if (!res.ok) throw new Error("Failed to delete tracking config");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-tracking-websites", userId],
      });
      toast({
        title: "Deleted",
        description: "Website deleted successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete website.",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({
      old_password,
      new_password,
    }: {
      old_password: string;
      new_password: string;
    }) => {
      const res = await adminSecureFetch(
        `/api/admin/update-password?user_id=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ old_password, new_password }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Password update failed.");
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Password updated successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err?.message || "Failed to update password.",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (website: AdminWebsite) => {
    setEditingWebsiteId(website.id);
    setEditForm({ name: website.website_name, timezone: website.timezone });
    setEditModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (editingWebsiteId == null) return;
    await updateWebsiteMutation.mutateAsync({
      id: editingWebsiteId,
      website_name: editForm.name,
      timezone: editForm.timezone,
    });
    setEditModalOpen(false);
  };

  const handleDeleteClick = (website: AdminWebsite) => {
    setDeletingWebsite({ id: website.id, name: website.website_name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingWebsite) return;
    await deleteWebsiteMutation.mutateAsync({ id: deletingWebsite.id });
    setDeleteModalOpen(false);
    setDeletingWebsite(null);
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    const strong =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strong.test(newPassword)) {
      toast({
        title: "Error",
        description:
          "Password must be 8+ chars with uppercase, lowercase, digit, and special character",
        variant: "destructive",
      });
      return;
    }
    await changePasswordMutation.mutateAsync({
      old_password: oldPassword,
      new_password: newPassword,
    });
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!userId) {
    return (
      <AdminLayout>
        <div className="p-8">
          <p className="text-sm text-destructive">
            No user_id provided in URL.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const statusBadgeClass =
    status === "active"
      ? "bg-success"
      : status === "suspended"
      ? "bg-warning"
      : status === "blocked"
      ? "bg-destructive"
      : status === "pending"
      ? "bg-primary"
      : "bg-secondary";

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Left sidebar */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r bg-card p-4 md:p-6">
          <Card className="border-primary/20">
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <Badge className={statusBadgeClass}>
                  {status === "unknown"
                    ? "Loading…"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>

                <div className="text-center">
                  <div className="bg-primary/10 rounded-lg p-3 inline-block mb-2">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">
                    {Number(eventsThisMonth || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Events this month
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <h3 className="font-semibold">Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Username:</span>
                    <span className="ml-2 font-medium">{username}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">
                      {profile?.email ?? "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    {isFreeForever ? (
                      <Badge className="ml-2 bg-success text-primary-foreground text-xs">
                        Free Forever
                      </Badge>
                    ) : (
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {effectivePlanName}
                      </Badge>
                    )}
                  </div>

                  {/* Admin-only Free Forever toggle */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-muted-foreground text-sm">
                      Free Forever:
                    </span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!isFreeForever}
                        onCheckedChange={(checked) =>
                          toggleFreeForeverMutation.mutate(checked)
                        }
                        disabled={toggleFreeForeverMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(profile?.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Login:</span>
                    <span className="ml-2 font-medium">
                      {formatDate(profile?.last_login_at)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 md:p-8">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-2xl grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="tracked-sites">Tracked Sites</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="billing">Billing & Plans</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            {/* TRACKED SITES */}
            <TabsContent value="tracked-sites" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Website Tracking List</h2>
                <input
                  type="search"
                  placeholder="Search Websites"
                  className="px-4 py-2 border rounded-lg w-64"
                />
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold">
                            WEBSITE NAME
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">
                            DOMAIN
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">
                            TRACKING TOKEN
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">
                            TIMEZONE
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">
                            ACTION
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {websites.map((site) => {
                          const siteInitials =
                            (site.website_name?.match(/\b\w/g) || [])
                              .join("")
                              .substring(0, 2)
                              .toUpperCase() || "W";
                          return (
                            <tr
                              key={site.id}
                              className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {siteInitials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">
                                    {site.website_name}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                {site.domain}
                              </td>
                              <td className="px-6 py-4">
                                <code className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                                  {site.tracking_token}
                                </code>
                              </td>
                              <td className="px-6 py-4">
                                <Badge variant="secondary">
                                  {site.timezone}
                                </Badge>
                              </td>
                              <td className="px-6 py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-40"
                                  >
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleEditClick(site)
                                      }
                                      className="cursor-pointer"
                                    >
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        handleDeleteClick(site)
                                      }
                                      className="cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                        {websites.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-8 text-center text-sm text-muted-foreground"
                            >
                              No tracking websites configured for this
                              user.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing 1 to {websites.length} of {websites.length} entries
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="default" size="sm">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* SECURITY */}
            <TabsContent value="security" className="space-y-6">
              {/* Change Password (admin) */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <h2 className="text-2xl font-semibold">Change Password (Admin)</h2>

                  {showPasswordAlert && (
                    <Alert className="bg-warning/10 border-warning/20">
                      <AlertDescription className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-warning mb-1">
                            Ensure that these requirements are met
                          </p>
                          <p className="text-sm text-warning/90">
                            Minimum 8 characters long, with uppercase,
                            lowercase, digit, and symbol.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:bg-transparent"
                          onClick={() => setShowPasswordAlert(false)}
                        >
                          <X className="h-4 w-4 text-warning" />
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This will change the password for this user account via admin
                      endpoint. Use carefully.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="old-password">Old Password</Label>
                      <div className="relative">
                        <Input
                          id="old-password"
                          type={showOldPassword ? "text" : "password"}
                          placeholder="Old Password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                        >
                          {showOldPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) =>
                              setConfirmPassword(e.target.value)
                            }
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={handlePasswordChange}
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending
                        ? "Changing..."
                        : "Change Password"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 2FA status (read-only for admin) */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      Two-factor Authentication
                    </h2>
                    <Badge
                      className={
                        profile?.twofa_enabled
                          ? "bg-success"
                          : "bg-secondary"
                      }
                    >
                      {profile?.twofa_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground">
                    Read-only view of this user&apos;s 2FA status. Admins
                    cannot directly modify their TOTP secret here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BILLING & PLANS (admin view, shared component) */}
            <TabsContent value="billing" className="space-y-6">
              <Suspense fallback={null}>
                {activeTab === "billing" && userId ? (
                  <AdminBillingAndPlansLazy
                    mode="admin"
                    adminUserId={Number(userId)}
                  />
                ) : null}
              </Suspense>
            </TabsContent>

            {/* ACCOUNT SUMMARY (admin) */}
            <TabsContent value="account" className="space-y-4">
              <h2 className="text-2xl font-bold">Account Overview</h2>

              <Card>
                <CardContent className="pt-6 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      User ID
                    </span>
                    <span className="font-medium">
                      {profile?.id ?? "–"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Status
                    </span>
                    <Badge className={statusBadgeClass}>
                      {status === "unknown"
                        ? "Unknown"
                        : status.charAt(0).toUpperCase() +
                          status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Two-factor Auth
                    </span>
                    <span className="font-medium">
                      {profile?.twofa_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-3">
                    This is a read-only admin view. Suspension / blocking
                    controls (if any) can be wired here later to dedicated
                    admin endpoints.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Website Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Edit Website
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="website-name" className="text-base">
                Website Name
              </Label>
              <Input
                id="website-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-base font-semibold">
                Timezone
              </Label>
              <Select
                value={editForm.timezone}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, timezone: value })
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Calcutta">
                    (GMT+05:30) Asia/Calcutta
                  </SelectItem>
                  <SelectItem value="Europe/London">
                    (GMT+00:00) Europe/London
                  </SelectItem>
                  <SelectItem value="America/New_York">
                    (GMT-05:00) America/New_York
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    (GMT-08:00) America/Los_Angeles
                  </SelectItem>
                  <SelectItem value="Asia/Tokyo">
                    (GMT+09:00) Asia/Tokyo
                  </SelectItem>
                  <SelectItem value="Australia/Sydney">
                    (GMT+11:00) Australia/Sydney
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground pt-2">
                Date ranges, time ranges, and visitor activity times will
                follow this timezone.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              className="bg-muted hover:bg-muted/80"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              className="bg-primary hover:bg-primary/90"
              disabled={updateWebsiteMutation.isPending}
            >
              {updateWebsiteMutation.isPending
                ? "Saving..."
                : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p>
              Are you sure you want to delete{" "}
              <strong>{deletingWebsite?.name}</strong>?<br />
              This will also permanently delete all associated visitor
              data.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteWebsiteMutation.isPending}
            >
              {deleteWebsiteMutation.isPending
                ? "Deleting..."
                : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUserProfilePage;
