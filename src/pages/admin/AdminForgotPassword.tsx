// src/pages/admin/AdminForgotPassword.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ensureTurnstileLoaded } from "@/lib/turnstile";

const API = "https://api.modovisa.com";
const TURNSTILE_SITE_KEY = "0x4AAAAAABZpGqOL1fgh-FTY";

const AdminForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"" | "success" | "error">("");

  /* ---------------- Turnstile loader + render (shared helper) ---------------- */

  useEffect(() => {
    let cancelled = false;

    const renderTurnstile = async () => {
      await ensureTurnstileLoaded();
      if (cancelled) return;
      if (!window.turnstile) return;

      const el = document.getElementById("admin-turnstile");
      if (!el) return;

      // Prevent double-render
      if ((el as any).dataset.rendered) return;

      window.turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY,
        "refresh-expired": "auto",
        callback: (token: string) => {
          if (!cancelled) {
            setCaptchaToken(token);
          }
        },
      });

      (el as any).dataset.rendered = "1";
    };

    renderTurnstile();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------- Submit handler ---------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (!email.trim()) {
      setMessage("Please enter your email address.");
      setMessageType("error");
      return;
    }

    if (!captchaToken) {
      setMessage("Please complete the CAPTCHA.");
      setMessageType("error");
      return;
    }

    setIsSubmitting(true);
    setLoadingMessage("Sending reset link...");

    try {
      const res = await fetch(`${API}/api/admin-reset-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          captcha_token: captchaToken,
        }),
      });

      const result = await res.json().catch(() => ({} as any));

      if (res.ok) {
        setMessage("Check your email for reset instructions!");
        setMessageType("success");
      } else {
        setMessage(result.error || "Failed to send reset email.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("🔐 Admin reset request error:", err);
      setMessage("Unexpected error. Please try again.");
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
      setLoadingMessage("");
    }
  };

  return (
    <AnimatedGradientBackground layout="full">
      <div className="glass-card w-full max-w-lg space-y-6 rounded-3xl p-10 shadow-2xl">
        {/* Header / logo */}
        <div className="flex flex-col items-center space-y-2 py-4">
          <Logo showBeta={false} />
          <p className="mb-0 text-lg font-semibold">Intuitive Analytics.</p>
          <h1 className="mt-6 text-2xl font-semibold">
            Reset your admin password
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Enter the email address associated with your admin account and
            we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {isSubmitting && (
          <div className="py-2 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {loadingMessage}
            </p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="admin-reset-email">Email</Label>
            <Input
              id="admin-reset-email"
              type="email"
              placeholder="Enter your email"
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Turnstile container */}
          <div className="mt-2">
            <div id="admin-turnstile" />
          </div>

          {message && (
            <Alert
              variant={messageType === "success" ? "default" : "destructive"}
            >
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="h-12 w-full text-base"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </Button>

          <div className="text-center text-sm">
            <Link
              to="/mv-admin/login"
              className="inline-flex items-center justify-center text-primary hover:underline"
            >
              ← Back to login
            </Link>
          </div>
        </form>
      </div>
    </AnimatedGradientBackground>
  );
};

export default AdminForgotPassword;
