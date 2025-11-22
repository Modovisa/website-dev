// src/components/auth/HomepageRegisterForm.tsx

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ensureTurnstileLoaded } from "@/lib/turnstile";

const GOOGLE_CLIENT_ID =
  "1057403058678-pak64aj4vthcedsnr81r30qbo6pia6d3.apps.googleusercontent.com";

const TURNSTILE_SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "0x4AAAAAABZpGqOL1fgh-FTY";

type Feedback = { message: string; type: "success" | "error" | "" };

type HomepageRegisterFormProps = {
  // Called after a successful signup / Google login
  // (RegisterModal uses this to trigger the Stripe checkout router)
  onSuccess: () => void | Promise<void>;
};

function validatePassword(pwd: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(pwd);
}

// NOTE: mirror the plain fetch behaviour from /src/pages/Register.tsx
const API_BASE = "https://api.modovisa.com";

export function HomepageRegisterForm({ onSuccess }: HomepageRegisterFormProps) {
  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // 🔁 Keep a ref in sync so the Google callback always sees the latest value
  const termsAcceptedRef = useRef(false);
  useEffect(() => {
    termsAcceptedRef.current = termsAccepted;
  }, [termsAccepted]);

  // Turnstile state
  const [captchaToken, setCaptchaToken] = useState("");

  // Validation feedback
  const [usernameFeedback, setUsernameFeedback] = useState<Feedback>({
    message: "",
    type: "",
  });
  const [emailFeedback, setEmailFeedback] = useState<Feedback>({
    message: "",
    type: "",
  });
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [googleError, setGoogleError] = useState("");

  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  /* ---------------- Username / email availability ---------------- */

  const checkUsername = async () => {
    if (!username.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/check-username`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const result = await response.json().catch(() => ({} as any));
      setUsernameFeedback({
        message: result?.available ? "Username available" : "Username taken",
        type: result?.available ? "success" : "error",
      });
    } catch (err) {
      console.error("[homepage-register] Username check failed:", err);
      setUsernameFeedback({
        message: "Unable to check username.",
        type: "error",
      });
    }
  };

  const checkEmail = async () => {
    if (!email.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/check-email`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json().catch(() => ({} as any));
      setEmailFeedback({
        message: result?.available ? "Email available" : "Email taken",
        type: result?.available ? "success" : "error",
      });
    } catch (err) {
      console.error("[homepage-register] Email check failed:", err);
      setEmailFeedback({
        message: "Unable to check email.",
        type: "error",
      });
    }
  };

  /* ---------------- Turnstile init (same pattern as Register.tsx) --------- */

  useEffect(() => {
    (window as any).onTurnstileSuccess = (token: string) => {
      setCaptchaToken(token);
    };

    ensureTurnstileLoaded();
  }, []);

  /* ---------------- Manual registration (subscription flow) ---------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert("You must agree to the Privacy Policy & Terms.");
      return;
    }

    if (!captchaToken) {
      alert("Please complete the CAPTCHA before continuing.");
      return;
    }

    setPasswordFeedback("");

    if (!validatePassword(password)) {
      setPasswordFeedback(
        "Password must be 8+ chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char.",
      );
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Creating your account...");

    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          consent: true,
          consent_at: new Date().toISOString(),
          captcha_token: captchaToken, // 🔐 Turnstile token
        }),
      });

      const result = await response.json().catch(() => ({} as any));

      if (!response.ok) {
        setIsLoading(false);
        alert(result.error || "Registration failed.");
        return;
      }

      // Mark as new signup so routeAfterLoginFromHomepageReact
      // treats them as "new" (Scenario 1).
      try {
        window.localStorage.setItem("mv_new_signup", "1");
      } catch {
        // ignore
      }

      await onSuccess();
    } catch (err) {
      console.error("[homepage-register] Register error:", err);
      setIsLoading(false);
      alert("Registration failed. Please try again.");
    }
  };

  /* ---------------- Google sign-in (uses same API as /register.tsx) ---------------- */

  const handleGoogleResponse = async (response: any) => {
    // ✅ Use the ref so we don't get a stale false from the initial render
    if (!termsAcceptedRef.current) {
      setGoogleError(
        "Please agree to the Privacy Policy and Terms before using Google sign-in.",
      );
      return;
    }

    setGoogleError("");
    setIsLoading(true);
    setLoadingMessage("Signing you in with Google...");

    try {
      const res = await fetch(`${API_BASE}/api/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credential: response?.credential,
          consent: true,
          consent_at: new Date().toISOString(),
        }),
      });

      const result = await res.json().catch(() => ({} as any));

      // Scenario 7: provider mismatch → show error, no checkout
      if (res.status === 409 && result?.code === "PROVIDER_MISMATCH") {
        setIsLoading(false);
        setGoogleError(
          result.error ||
            "This email is already registered with a password. Please sign in with email/password.",
        );
        return;
      }

      // Scenario 8: 2FA required → hand off to /two-step-verification
      if (
        result?.temp_token &&
        result?.redirect?.includes("two-step-verification")
      ) {
        sessionStorage.setItem("twofa_temp_token", result.temp_token);
        sessionStorage.setItem("pending_2fa_user_id", result.user_id);
        window.location.href = result.redirect;
        return;
      }

      if (res.ok) {
        await onSuccess();
      } else {
        setIsLoading(false);
        setGoogleError(result.error || "Google sign-in failed. Try again.");
      }
    } catch (err) {
      console.error("[homepage-register] Google login error:", err);
      setIsLoading(false);
      setGoogleError("Google login failed. Try again.");
    }
  };

  /* ---------------- Google script + button render ---------------- */

  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      if ((window as any).google?.accounts?.id) {
        const buttonDiv = document.getElementById(
          "google-signin-button-homepage",
        );
        if (buttonDiv) {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
          });

          const width = Math.min(buttonDiv.offsetWidth || 320, 360);

          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: "outline",
            size: "large",
            width,
          });
        }
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
        });

        const buttonDiv = document.getElementById(
          "google-signin-button-homepage",
        );
        if (buttonDiv) {
          const width = Math.min(buttonDiv.offsetWidth || 320, 360);

          (window as any).google.accounts.id.renderButton(buttonDiv, {
            theme: "outline",
            size: "large",
            width,
          });
        }

        if (termsAcceptedRef.current) {
          (window as any).google.accounts.id.prompt();
        }
      }
    };

    return () => {
      // keep script for /register reuse
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Optional: “one-tap” style prompt once terms are accepted
  useEffect(() => {
    if (termsAccepted && (window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.prompt();
    }
  }, [termsAccepted]);

  /* ---------------- UI: clone of Register.tsx right pane ---------------- */

  return (
    <div className="w-full max-w-6xl glass-card rounded-3xl shadow-2xl overflow-hidden">
      <div className="p-12">
        <div className="flex flex-col items-center space-y-2 py-4">
          <Link to="/">
            <Logo showBeta={false} />
          </Link>
          <p className="text-lg font-semibold mb-0">Intuitive Analytics.</p>
          <h1 className="text-2xl font-semibold mb-6 pb-6">
            Create your Modovisa account
          </h1>
        </div>

        {isLoading && (
          <div className="mb-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {loadingMessage}
            </p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username-homepage">Username</Label>
            <Input
              id="username-homepage"
              type="text"
              placeholder="Enter your username"
              className="h-12"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={checkUsername}
              disabled={isLoading}
            />
            {usernameFeedback.message && (
              <p
                className={`text-sm ${
                  usernameFeedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {usernameFeedback.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email-homepage">Email</Label>
            <Input
              id="email-homepage"
              type="email"
              placeholder="Enter your email"
              className="h-12"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={checkEmail}
              disabled={isLoading}
            />
            {emailFeedback.message && (
              <p
                className={`text-sm ${
                  emailFeedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {emailFeedback.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password-homepage">Password</Label>
            <div className="relative">
              <Input
                id="password-homepage"
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
            {passwordFeedback && (
              <p className="text-sm text-red-600">{passwordFeedback}</p>
            )}
          </div>

          {/* Terms */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms-homepage"
              className="mt-1"
              checked={termsAccepted}
              onCheckedChange={(checked) =>
                setTermsAccepted(checked === true)
              }
              disabled={isLoading}
            />
            <label htmlFor="terms-homepage" className="text-sm leading-relaxed">
              I agree to the{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>
            </label>
          </div>

          {/* Turnstile CAPTCHA */}
          <div className="mt-2">
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
              data-callback="onTurnstileSuccess"
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full h-12 text-base"
            size="lg"
            disabled={!termsAccepted || isLoading}
            type="submit"
          >
            {isLoading ? "Creating..." : "Sign up"}
          </Button>

          {/* Already have account */}
          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google errors */}
          {googleError && (
            <Alert variant="destructive">
              <AlertDescription>{googleError}</AlertDescription>
            </Alert>
          )}

          {/* Google button */}
          <div className="w-full flex justify-center">
            <div
              id="google-signin-button-homepage"
              className={`w-full max-w-xs ${
                !termsAccepted ? "opacity-50 pointer-events-none" : ""
              }`}
              title={
                !termsAccepted
                  ? "Please agree to the Privacy Policy and Terms first"
                  : ""
              }
            />
          </div>
        </form>
      </div>
    </div>
  );
}
