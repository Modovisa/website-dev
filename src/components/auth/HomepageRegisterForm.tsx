// src/components/auth/HomepageRegisterForm.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { secureFetch } from "@/lib/auth";

type HomepageRegisterFormProps = {
  onSuccess: () => void | Promise<void>;
};

type AvailabilityState = {
  message: string;
  type: "success" | "error";
};

function validatePassword(pwd: string): boolean {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(pwd);
}

export function HomepageRegisterForm({ onSuccess }: HomepageRegisterFormProps) {
  const [username, setUsername] = useState("");
  const [usernameFeedback, setUsernameFeedback] =
    useState<AvailabilityState | null>(null);

  const [email, setEmail] = useState("");
  const [emailFeedback, setEmailFeedback] =
    useState<AvailabilityState | null>(null);

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUsernameBlur = async () => {
    const value = username.trim();
    if (!value) {
      setUsernameFeedback(null);
      return;
    }

    try {
      const res = await secureFetch("/api/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setUsernameFeedback({
          message: data?.error || "Unable to check username.",
          type: "error",
        });
        return;
      }

      setUsernameFeedback({
        message: data?.available ? "Username available" : "Username taken",
        type: data?.available ? "success" : "error",
      });
    } catch (err) {
      console.error("[homepage-register] username check failed:", err);
      setUsernameFeedback({
        message: "Unable to check username.",
        type: "error",
      });
    }
  };

  const handleEmailBlur = async () => {
    const value = email.trim();
    if (!value) {
      setEmailFeedback(null);
      return;
    }

    try {
      const res = await secureFetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setEmailFeedback({
          message: data?.error || "Unable to check email.",
          type: "error",
        });
        return;
      }

      setEmailFeedback({
        message: data?.available ? "Email available" : "Email taken",
        type: data?.available ? "success" : "error",
      });
    } catch (err) {
      console.error("[homepage-register] email check failed:", err);
      setEmailFeedback({
        message: "Unable to check email.",
        type: "error",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setPasswordError(null);

    if (!termsAccepted) {
      setFormError("You must agree to the Privacy Policy & Terms.");
      return;
    }

    if (!validatePassword(password)) {
      setPasswordError(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      if (window.showGlobalLoadingModal) {
        window.showGlobalLoadingModal("Creating your account...");
      }

      const res = await secureFetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          consent: true,
          consent_at: new Date().toISOString(),
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setFormError(data?.error || "Registration failed. Please try again.");
        return;
      }

      try {
        window.localStorage.setItem("mv_new_signup", "1");
      } catch {
        // ignore
      }

      await onSuccess();
    } catch (err) {
      console.error("[homepage-register] register error:", err);
      setFormError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
      window.hideGlobalLoadingModal?.();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto rounded-3xl bg-card/95 backdrop-blur border shadow-2xl p-8">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">
          Create your Modovisa account
        </h2>
        <p className="text-sm text-muted-foreground">
          Start your free trial and pick a plan after checkout.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="hp-username">Username</Label>
          <Input
            id="hp-username"
            type="text"
            autoComplete="username"
            placeholder="Your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={handleUsernameBlur}
            disabled={isSubmitting}
          />
          {usernameFeedback && (
            <p
              className={`text-xs ${
                usernameFeedback.type === "success"
                  ? "text-emerald-500"
                  : "text-red-500"
              }`}
            >
              {usernameFeedback.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="hp-email">Email</Label>
          <Input
            id="hp-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleEmailBlur}
            disabled={isSubmitting}
          />
          {emailFeedback && (
            <p
              className={`text-xs ${
                emailFeedback.type === "success" ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {emailFeedback.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="hp-password">Password</Label>
          <Input
            id="hp-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters, with uppercase, lowercase, number, and special
            character.
          </p>
          {passwordError && (
            <p className="text-xs text-red-500">{passwordError}</p>
          )}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="hp-terms"
            className="mt-1"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            disabled={isSubmitting}
          />
          <label htmlFor="hp-terms" className="text-xs text-muted-foreground">
            I agree to the{" "}
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="/legal/terms"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Terms of Service
            </a>
            .
          </label>
        </div>

        {formError && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 text-sm font-medium"
          disabled={isSubmitting || !termsAccepted}
        >
          {isSubmitting ? "Creating your account…" : "Continue to checkout"}
        </Button>

        {/* No Google one-tap here on purpose – this is the clean "new user → subscription" flow */}
      </form>
    </div>
  );
}
