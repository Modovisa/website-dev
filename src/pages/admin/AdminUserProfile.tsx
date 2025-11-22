// src/pages/admin/AdminUserProfile.tsx

import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { secureAdminFetch } from "@/lib/auth/adminAuth";

const API = "https://api.modovisa.com";

type AdminProfile = {
  id?: number;
  username: string;
  email: string;
  role: string;
  status: string;
  created_at?: string | null;
  last_login_at?: string | null;
  twofa_enabled?: boolean;
};

type MessageState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

function toInitials(name: string) {
  const caps = (name.match(/\b\w/g) || [])
    .map((c) => c.toUpperCase())
    .join("");
  return (caps || "AD").slice(0, 2);
}

function formatDate(v?: string | null) {
  if (!v) return "–";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "–";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function AdminUserProfile() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMessage, setPwMessage] = useState<MessageState>(null);

  // Toggle visibility (match user profile UX)
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordAlert, setShowPasswordAlert] = useState(true);

  // 2FA state
  const [twofaEnabled, setTwofaEnabled] = useState<boolean | null>(null);
  const [twofaBusy, setTwofaBusy] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [otpSecret, setOtpSecret] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [twofaMessage, setTwofaMessage] = useState<MessageState>(null);
  const [show2FASetup, setShow2FASetup] = useState(false);

  const [activeTab, setActiveTab] = useState<"security">("security");

  // Load admin profile
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const res = await secureAdminFetch(`${API}/api/admin-me`, {
          method: "GET",
          cache: "no-store",
        });

        if (res.status === 401) {
          window.location.replace("/mv-admin/login");
          return;
        }

        if (!res.ok) {
          throw new Error(`admin-me failed with ${res.status}`);
        }

        const data = await res.json();

        const p: AdminProfile = {
          id: data.id,
          username: data.username || data.name || "Admin",
          email: data.email || "",
          role: data.role || "admin",
          status: data.status || "active",
          created_at: data.created_at ?? data.createdAt ?? null,
          last_login_at: data.last_login_at ?? data.lastLoginAt ?? null,
          twofa_enabled: !!data.twofa_enabled,
        };

        if (!cancelled) {
          setProfile(p);
          setTwofaEnabled(p.twofa_enabled ?? false);
        }
      } catch (err) {
        console.error("Failed to load admin profile:", err);
        if (!cancelled) {
          setProfileError("Unable to load admin profile.");
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const username = useMemo(
    () => profile?.username || profile?.email?.split("@")[0] || "Admin",
    [profile?.username, profile?.email],
  );

  const initials = useMemo(() => toInitials(username), [username]);

  const statusBadgeVariant =
    profile?.status === "active"
      ? "outline"
      : profile?.status === "suspended"
      ? "destructive"
      : "secondary";

  /* ---------------- Change Password ---------------- */

  const handleChangePassword = async () => {
    setPwMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwMessage({ type: "error", text: "All fields are required." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strong.test(newPassword)) {
      setPwMessage({
        type: "error",
        text:
          "Password must be 8+ chars with uppercase, lowercase, digit, and special character.",
      });
      return;
    }

    setPwBusy(true);
    try {
      const res = await secureAdminFetch(`${API}/api/admin-change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setPwMessage({
          type: "error",
          text: json.error || "Failed to change password.",
        });
        return;
      }

      setPwMessage({
        type: "success",
        text: "Password updated successfully.",
      });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Admin change password error:", err);
      setPwMessage({
        type: "error",
        text: "Unexpected error. Please try again.",
      });
    } finally {
      setPwBusy(false);
    }
  };

  /* ---------------- Two-Factor Authentication ---------------- */

  const handleSetup2fa = async () => {
    setTwofaMessage(null);
    setTwofaBusy(true);
    setQrSvg(null);
    setOtpSecret(null);

    try {
      const res = await secureAdminFetch(`${API}/api/admin-2fa-init`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setTwofaMessage({
          type: "error",
          text: json.error || "Failed to start 2FA setup.",
        });
        return;
      }

      const svg =
        json.qr_svg || json.qr || json.qr_svg_html || json.qrCodeSvg || "";
      const secret = json.secret || json.otp_secret || json.otpSecret || "";

      if (svg) setQrSvg(svg);
      if (secret) setOtpSecret(secret);

      setShow2FASetup(true);
      setTwofaMessage({
        type: "success",
        text: "Scan the QR code with your authenticator app, then enter the 6-digit code below.",
      });
    } catch (err) {
      console.error("Admin 2FA setup error:", err);
      setTwofaMessage({
        type: "error",
        text: "Unexpected error while starting 2FA.",
      });
    } finally {
      setTwofaBusy(false);
    }
  };

  const handleVerify2fa = async () => {
    setTwofaMessage(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setTwofaMessage({
        type: "error",
        text: "Enter a valid 6-digit code.",
      });
      return;
    }

    setTwofaBusy(true);
    try {
      const res = await secureAdminFetch(`${API}/api/admin-2fa-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: otpCode.trim() }),
      });
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setTwofaMessage({
          type: "error",
          text: json.error || "Invalid or expired code.",
        });
        return;
      }

      setTwofaEnabled(true);
      setQrSvg(null);
      setOtpSecret(null);
      setOtpCode("");
      setShow2FASetup(false);
      setTwofaMessage({
        type: "success",
        text: "Two-factor authentication has been enabled.",
      });
    } catch (err) {
      console.error("Admin 2FA verify error:", err);
      setTwofaMessage({
        type: "error",
        text: "Unexpected error while verifying 2FA code.",
      });
    } finally {
      setTwofaBusy(false);
    }
  };

  const handleReset2fa = async () => {
    if (!window.confirm("Disable 2FA for this admin account?")) {
      return;
    }

    setTwofaBusy(true);
    setTwofaMessage(null);

    try {
      const res = await secureAdminFetch(`${API}/api/admin-2fa-reset`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setTwofaMessage({
          type: "error",
          text: json.error || "Failed to reset 2FA.",
        });
        return;
      }

      setTwofaEnabled(false);
      setQrSvg(null);
      setOtpSecret(null);
      setOtpCode("");
      setShow2FASetup(false);
      setTwofaMessage({
        type: "success",
        text: "Two-factor authentication has been disabled.",
      });
    } catch (err) {
      console.error("Admin 2FA reset error:", err);
      setTwofaMessage({
        type: "error",
        text: "Unexpected error while resetting 2FA.",
      });
    } finally {
      setTwofaBusy(false);
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row h-full">
        {/* LEFT SIDEBAR – same structure as user Profile, adapted for admin */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r bg-card p-4 md:p-6">
          <Card className="border-primary/20">
            <CardContent className="pt-6 space-y-6">
              {loadingProfile ? (
                <div className="text-sm text-muted-foreground">
                  Loading admin profile…
                </div>
              ) : profileError ? (
                <div className="text-sm text-red-500">{profileError}</div>
              ) : !profile ? (
                <div className="text-sm text-red-500">
                  No profile information available.
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <Badge
                      variant={statusBadgeVariant}
                      className="capitalize"
                    >
                      {profile.status || "unknown"}
                    </Badge>

                    <div className="text-center">
                      <div className="bg-primary/10 rounded-lg p-3 inline-block mb-2">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                      </div>
                      <p className="text-2xl font-bold capitalize">
                        {profile.role || "admin"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Admin role
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 border-t">
                    <h3 className="font-semibold">Details</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Username:
                        </span>
                        <span className="ml-2 font-medium">@{username}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <span className="ml-2 font-medium">
                          {profile.email || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <span className="ml-2 font-medium capitalize">
                          {profile.status || "unknown"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <span className="ml-2 font-medium">
                          {formatDate(profile.created_at)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Last Login:
                        </span>
                        <span className="ml-2 font-medium">
                          {formatDate(profile.last_login_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT – Tabs, currently only Security (match user Profile structure) */}
        <div className="flex-1 p-4 md:p-8">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "security")}
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-md grid-cols-1">
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="security" className="space-y-6">
              {/* Change Password – visually aligned with user Profile */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <h2 className="text-2xl font-semibold">Change Password</h2>

                  {showPasswordAlert && (
                    <Alert className="bg-warning/10 border-warning/20">
                      <AlertDescription className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-warning mb-1">
                            Ensure that these requirements are met
                          </p>
                          <p className="text-sm text-warning/90">
                            Minimum 8 characters long, uppercase, lowercase,
                            number & symbol
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:bg-transparent"
                          onClick={() => setShowPasswordAlert(false)}
                        >
                          <EyeOff className="h-4 w-4 text-warning opacity-0" />
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
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
                          autoComplete="current-password"
                          disabled={pwBusy}
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
                            onChange={(e) =>
                              setNewPassword(e.target.value)
                            }
                            className="pr-10"
                            autoComplete="new-password"
                            disabled={pwBusy}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() =>
                              setShowNewPassword(!showNewPassword)
                            }
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
                            autoComplete="new-password"
                            disabled={pwBusy}
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

                    <div className="space-y-2">
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={handleChangePassword}
                        disabled={pwBusy}
                      >
                        {pwBusy ? "Changing..." : "Change Password"}
                      </Button>
                      {pwMessage && (
                        <div
                          className={`text-sm ${
                            pwMessage.type === "success"
                              ? "text-emerald-600"
                              : "text-red-500"
                          }`}
                        >
                          {pwMessage.text}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Two-Factor Authentication */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      Two-factor Authentication
                    </h2>
                    <Badge
                      className={
                        twofaEnabled ? "bg-success" : "bg-warning"
                      }
                    >
                      {twofaEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground">
                    Secure your admin account with an authenticator app.
                  </p>

                  {show2FASetup && qrSvg && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="text-center space-y-3">
                        <div
                          className="
                            mx-auto
                            max-w-[220px]
                            [&>img]:w-full
                            [&>img]:h-auto
                            [&>svg]:w-full
                            [&>svg]:h-auto
                          "
                          dangerouslySetInnerHTML={{ __html: qrSvg }}
                        />
                        {otpSecret && (
                          <p className="mt-2 text-sm break-all">
                            Secret: <code>{otpSecret}</code>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {twofaMessage && (
                    <div
                      className={`text-sm ${
                        twofaMessage.type === "success"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {twofaMessage.text}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2 max-w-xs">
                      <Label htmlFor="2fa-code">
                        Enter code from authenticator app
                      </Label>
                      <Input
                        id="2fa-code"
                        type="text"
                        placeholder="123456"
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        maxLength={6}
                        disabled={twofaBusy}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {!twofaEnabled && (
                        <Button
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10"
                          onClick={handleSetup2fa}
                          disabled={twofaBusy}
                        >
                          Show QR Code
                        </Button>
                      )}
                      <Button
                        className="bg-primary hover:bg-primary/90"
                        onClick={handleVerify2fa}
                        disabled={twofaBusy || !otpCode}
                      >
                        Verify Code
                      </Button>
                      {twofaEnabled && (
                        <Button
                          variant="link"
                          className="text-destructive hover:text-destructive/90 p-0"
                          onClick={handleReset2fa}
                          disabled={twofaBusy}
                        >
                          Reset 2FA
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Devices (static demo, same as before) */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Devices</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b text-muted-foreground text-left">
                      <tr>
                        <th className="py-2 pr-4">Browser</th>
                        <th className="py-2 pr-4">Device</th>
                        <th className="py-2 pr-4">Location</th>
                        <th className="py-2">Recent Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b last:border-0">
                        <td className="py-2 pr-4">Chrome on Windows</td>
                        <td className="py-2 pr-4">HP Spectre 360</td>
                        <td className="py-2 pr-4">Switzerland</td>
                        <td className="py-2">10 July 2021, 20:07</td>
                      </tr>
                      <tr className="border-b last:border-0">
                        <td className="py-2 pr-4">Chrome on iPhone</td>
                        <td className="py-2 pr-4">iPhone 12x</td>
                        <td className="py-2 pr-4">Australia</td>
                        <td className="py-2">13 July 2021, 10:10</td>
                      </tr>
                      <tr className="border-b last:border-0">
                        <td className="py-2 pr-4">Chrome on Android</td>
                        <td className="py-2 pr-4">OnePlus 9 Pro</td>
                        <td className="py-2 pr-4">Dubai</td>
                        <td className="py-2">14 July 2021, 15:15</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-4">Chrome on macOS</td>
                        <td className="py-2 pr-4">iMac</td>
                        <td className="py-2 pr-4">India</td>
                        <td className="py-2">16 July 2021, 16:17</td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}
