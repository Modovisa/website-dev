// src/pages/admin/AdminLogin.tsx

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const API = "https://api.modovisa.com";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!emailOrUsername.trim() || !password.trim()) {
      setLoginError("Email/username and password are required.");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Signing you in...");

    try {
      const res = await fetch(`${API}/api/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: emailOrUsername.trim(),
          password: password.trim(),
          remember_me: rememberMe,
        }),
      });

      const json = await res.json().catch(() => ({} as any));

      if (res.status === 401) {
        setIsLoading(false);
        setLoginError(json.error || "Invalid credentials.");
        return;
      }

      if (!res.ok) {
        setIsLoading(false);
        setLoginError(json.error || "Login failed. Please try again.");
        return;
      }

      // 2FA path (mirrors your Bootstrap logic)
      if (json.twofa_required && json.temp_token && json.admin_id) {
        sessionStorage.setItem("admin_twofa_temp_token", json.temp_token);
        sessionStorage.setItem("pending_admin_2fa_id", String(json.admin_id),);
        window.location.href = "/mv-admin/two-step-verification";
        return;
      }

      // No-2FA path: clear any old local admin tokens if they existed
      try {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_id");
        localStorage.removeItem("admin_name");
      } catch {
        // ignore
      }

      // Redirect to last requested admin page or dashboard
      const redirect =
        (location.state as any)?.from || "/mv-admin/dashboard";
      setLoadingMessage("Loading admin dashboard...");
      setTimeout(() => {
        navigate(redirect, { replace: true });
      }, 150);
    } catch (err) {
      console.error("Admin login error", err);
      setIsLoading(false);
      setLoginError("Unexpected error. Please try again.");
    }
  };

  return (
    <AnimatedGradientBackground layout="full">
      <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl p-10 space-y-6">
        <div className="flex flex-col items-center space-y-2 py-4">
          <Link to="/">
            <Logo showBeta={false} />
          </Link>
          <p className="text-lg font-semibold mb-0">Intuitive Analytics.</p>
          <h1 className="text-2xl font-semibold mt-6">
            Sign in to your admin account
          </h1>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {loadingMessage}
            </p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email or Username</Label>
            <Input
              id="admin-email"
              type="text"
              placeholder="Enter your email or username"
              className="h-12"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••"
                className="h-12 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="admin-remember"
                checked={rememberMe}
                onCheckedChange={(checked) =>
                  setRememberMe(checked === true)
                }
                disabled={isLoading}
              />
              <label
                htmlFor="admin-remember"
                className="text-sm font-medium leading-none"
              >
                Remember Me
              </label>
            </div>
            {/* If/when you have a React admin reset page, point here */}
            <a
              href="/mv-admin/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot Password?
            </a>
          </div>

          <Button
            className="w-full h-12 text-base"
            size="lg"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>
      </div>
    </AnimatedGradientBackground>
  );
};

export default AdminLogin;
