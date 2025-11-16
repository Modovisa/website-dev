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

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

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

  // 2FA state
  const [twofaEnabled, setTwofaEnabled] = useState<boolean | null>(null);
  const [twofaBusy, setTwofaBusy] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [otpSecret, setOtpSecret] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [twofaMessage, setTwofaMessage] = useState<MessageState>(null);

  // Load admin profile (and initial 2FA status)
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

  const initials = useMemo(
    () => toInitials(profile?.username || "Admin"),
    [profile?.username],
  );

  const statusBadgeVariant =
    profile?.status === "active"
      ? "outline"
      : profile?.status === "suspended"
      ? "destructive"
      : "secondary";

  /* ---------------- Change Password ---------------- */

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwMessage({ type: "error", text: "All fields are required." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwMessage({
        type: "error",
        text: "Password must be at least 8 characters long.",
      });
      return;
    }

    setPwBusy(true);
    try {
      const res = await secureAdminFetch(
        `${API}/api/admin-change-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            old_password: oldPassword,
            new_password: newPassword,
          }),
        },
      );

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
      // Adjust endpoint/response field names to match your backend if needed
      const res = await secureAdminFetch(
        `${API}/api/admin-2fa-init`,
        {
          method: "POST",
        },
      );
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
      const secret =
        json.secret || json.otp_secret || json.otpSecret || "";

      if (svg) setQrSvg(svg);
      if (secret) setOtpSecret(secret);

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
      const res = await secureAdminFetch(
        `${API}/api/admin-2fa-verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ otp: otpCode.trim() }),
        },
      );
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
    if (!window.confirm("Are you sure you want to disable 2FA for this account?")) {
      return;
    }

    setTwofaBusy(true);
    setTwofaMessage(null);

    try {
      const res = await secureAdminFetch(
        `${API}/api/admin-2fa-reset`,
        {
          method: "POST",
        },
      );
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
      <div className="w-full max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {loadingProfile ? (
          <div className="text-sm text-muted-foreground">Loading profile…</div>
        ) : profileError ? (
          <div className="text-sm text-red-500">{profileError}</div>
        ) : !profile ? (
          <div className="text-sm text-red-500">
            No profile information available.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: User card */}
            <Card className="lg:col-span-1">
              <CardContent className="pt-8">
                <div className="flex flex-col items-center space-y-3">
                  <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
                    {initials}
                  </div>
                  <div className="text-center space-y-1">
                    <h2 className="text-lg font-semibold">
                      {profile.username}
                    </h2>
                    <Badge
                      variant={statusBadgeVariant}
                      className="mt-1 capitalize"
                    >
                      {profile.status || "unknown"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-8 border-t pt-4 space-y-2 text-sm">
                  <p>
                    <span className="font-semibold">Username:</span>{" "}
                    <span className="text-muted-foreground">
                      @{profile.username || "username"}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Email:</span>{" "}
                    <span className="text-muted-foreground">
                      {profile.email || "–"}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Role:</span>{" "}
                    <span className="capitalize text-muted-foreground">
                      {profile.role || "admin"}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Created:</span>{" "}
                    <span className="text-muted-foreground">
                      {formatDate(profile.created_at)}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Last Login:</span>{" "}
                    <span className="text-muted-foreground">
                      {formatDate(profile.last_login_at)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* RIGHT: Tabs & Security */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="security" className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="security" className="space-y-6 mt-4">
                  {/* Change Password */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Minimum 8 characters, with at least one uppercase letter
                        and a symbol.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <form
                        className="space-y-4"
                        onSubmit={handleChangePassword}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="oldPassword">Old Password</Label>
                            <Input
                              id="oldPassword"
                              type="password"
                              autoComplete="current-password"
                              value={oldPassword}
                              onChange={(e) =>
                                setOldPassword(e.target.value)
                              }
                              disabled={pwBusy}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              autoComplete="new-password"
                              value={newPassword}
                              onChange={(e) =>
                                setNewPassword(e.target.value)
                              }
                              disabled={pwBusy}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                              Confirm New Password
                            </Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              autoComplete="new-password"
                              value={confirmPassword}
                              onChange={(e) =>
                                setConfirmPassword(e.target.value)
                              }
                              disabled={pwBusy}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Button type="submit" disabled={pwBusy}>
                            {pwBusy ? "Changing…" : "Change Password"}
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
                      </form>
                    </CardContent>
                  </Card>

                  {/* Two-Factor Authentication */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <CardTitle>Two-factor Authentication</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            Secure your admin account with an authenticator app.
                          </p>
                        </div>
                        <Badge
                          variant={
                            twofaEnabled ? "outline" : "secondary"
                          }
                          className="capitalize"
                        >
                          {twofaEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {qrSvg && (
                        <div className="flex flex-col items-center space-y-3">
                          <div
                            className="border rounded-xl p-3 bg-muted"
                            dangerouslySetInnerHTML={{ __html: qrSvg }}
                          />
                          {otpSecret && (
                            <div className="text-xs text-muted-foreground text-center">
                              <p className="mb-1">
                                Or manually enter this key:
                              </p>
                              <code className="break-all text-primary font-semibold">
                                {otpSecret}
                              </code>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2 max-w-xs">
                        <Label htmlFor="otpInput">
                          Code from authenticator app
                        </Label>
                        <Input
                          id="otpInput"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="123456"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(e.target.value.replace(/\D/g, ""))
                          }
                          disabled={twofaBusy}
                        />
                      </div>

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

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSetup2fa}
                          disabled={twofaBusy}
                        >
                          {twofaBusy ? "Working…" : "Show QR Code"}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleVerify2fa}
                          disabled={twofaBusy}
                        >
                          Verify Code
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={handleReset2fa}
                          disabled={twofaBusy}
                        >
                          Reset 2FA
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Devices (static demo) */}
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
                            <td className="py-2 pr-4">
                              Chrome on Windows
                            </td>
                            <td className="py-2 pr-4">
                              HP Spectre 360
                            </td>
                            <td className="py-2 pr-4">Switzerland</td>
                            <td className="py-2">
                              10 July 2021, 20:07
                            </td>
                          </tr>
                          <tr className="border-b last:border-0">
                            <td className="py-2 pr-4">
                              Chrome on iPhone
                            </td>
                            <td className="py-2 pr-4">iPhone 12x</td>
                            <td className="py-2 pr-4">Australia</td>
                            <td className="py-2">
                              13 July 2021, 10:10
                            </td>
                          </tr>
                          <tr className="border-b last:border-0">
                            <td className="py-2 pr-4">
                              Chrome on Android
                            </td>
                            <td className="py-2 pr-4">
                              OnePlus 9 Pro
                            </td>
                            <td className="py-2 pr-4">Dubai</td>
                            <td className="py-2">
                              14 July 2021, 15:15
                            </td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">
                              Chrome on macOS
                            </td>
                            <td className="py-2 pr-4">iMac</td>
                            <td className="py-2 pr-4">India</td>
                            <td className="py-2">
                              16 July 2021, 16:17
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
