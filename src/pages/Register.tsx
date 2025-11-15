// src/pages/Register.tsx

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap, Code, Users } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GOOGLE_CLIENT_ID =
  "1057403058678-pak64aj4vthcedsnr81r30qbo6pia6d3.apps.googleusercontent.com";

type Feedback = { message: string; type: "success" | "error" | "" };

type RegisterProps = {
  /** "page" = full /register route, "modal" = (optional) modal layout */
  mode?: "page" | "modal";
};

const RegisterInner = ({ mode = "page" }: RegisterProps) => {
  const navigate = useNavigate();

  // Form state
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  // Password validation
  const validatePassword = (pwd: string): boolean => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    return regex.test(pwd);
  };

  /**
   * Shared success path for the /register route:
   *  - mark mv_new_signup = "1"
   *  - go to /app/tracking-setup
   */
  const handlePostSuccess = useCallback(async () => {
    try {
      window.localStorage.setItem("mv_new_signup", "1");
    } catch {
      // ignore
    }

    setLoadingMessage("Setting up your dashboard...");
    setTimeout(() => {
      navigate("/app/tracking-setup");
    }, 150);
  }, [navigate]);

  // Check username availability
  const checkUsername = async () => {
    if (!username.trim()) return;

    try {
      const response = await fetch("https://api.modovisa.com/api/check-username", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });

      const result = await response.json();
      setUsernameFeedback({
        message: result?.available ? "Username available" : "Username taken",
        type: result?.available ? "success" : "error",
      });
    } catch (err) {
      console.error("Username check failed:", err);
    }
  };

  // Check email availability
  const checkEmail = async () => {
    if (!email.trim()) return;

    try {
      const response = await fetch("https://api.modovisa.com/api/check-email", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const result = await response.json();
      setEmailFeedback({
        message: result?.available ? "Email available" : "Email taken",
        type: result?.available ? "success" : "error",
      });
    } catch (err) {
      console.error("Email check failed:", err);
    }
  };

  // Handle manual registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      alert("You must agree to the Privacy Policy & Terms.");
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
      const response = await fetch("https://api.modovisa.com/api/register", {
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
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setIsLoading(false);
        alert(result.error || "Registration failed.");
        return;
      }

      // ✅ simple success path for /register
      await handlePostSuccess();
    } catch (err) {
      console.error("❌ Register error:", err);
      setIsLoading(false);
      alert("Registration failed. Please try again.");
    }
  };

  // Handle Google sign-in response
  const handleGoogleResponse = async (response: any) => {
    if (!termsAccepted) {
      setGoogleError(
        "Please agree to the Privacy Policy and Terms before using Google sign-in.",
      );
      return;
    }

    setGoogleError("");
    setIsLoading(true);
    setLoadingMessage("Signing you in with Google...");

    try {
      const res = await fetch("https://api.modovisa.com/api/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          credential: response?.credential,
          consent: true,
          consent_at: new Date().toISOString(),
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (res.status === 409 && result?.code === "PROVIDER_MISMATCH") {
        setIsLoading(false);
        setGoogleError(
          result.error ||
            "This email is already registered with a password. Please sign in with email/password.",
        );
        return;
      }

      if (result?.temp_token && result?.redirect?.includes("two-step-verification")) {
        sessionStorage.setItem("twofa_temp_token", result.temp_token);
        sessionStorage.setItem("pending_2fa_user_id", result.user_id);
        window.location.href = result.redirect;
        return;
      }

      if (res.ok) {
        setLoadingMessage("Setting up your dashboard...");
        await handlePostSuccess();
      } else {
        setIsLoading(false);
        setGoogleError(result.error || "Google sign-in failed. Try again.");
      }
    } catch (err) {
      console.error("❌ Google login error:", err);
      setIsLoading(false);
      setGoogleError("Google login failed. Try again.");
    }
  };

  // Initialize Google Sign-In
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
        });

        const buttonDiv = document.getElementById("google-signin-button");
        if (buttonDiv) {
          window.google.accounts.id.renderButton(buttonDiv, {
            theme: "outline",
            size: "large",
            width: buttonDiv.offsetWidth,
          });
        }

        if (termsAccepted) {
          window.google.accounts.id.prompt();
        }
      }
    };

    return () => {
      document.head.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger Google prompt when terms are accepted
  useEffect(() => {
    if (termsAccepted && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  }, [termsAccepted]);

  return (
    <div className="w-full max-w-6xl glass-card rounded-3xl shadow-2xl overflow-hidden">
      <div className="grid md:grid-cols-2">
        {/* Left side - Benefits */}
        <div className="hidden md:flex bg-primary/5 p-12 flex-col justify-center space-y-8">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Set up in minutes</h3>
                <p className="text-muted-foreground text-sm">
                  Use our lightweight script or integrate via API. No complex setup
                  required.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Code className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Fits any stack</h3>
                <p className="text-muted-foreground text-sm">
                  Whether you're on WordPress, Shopify, Webflow, or custom code, we've
                  got you covered.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Built for growing teams</h3>
                <p className="text-muted-foreground text-sm">
                  Track visitors across sessions, analyze funnels, and collaborate with
                  your team in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
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
              <p className="mt-2 text-sm text-muted-foreground">{loadingMessage}</p>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
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

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
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
                    emailFeedback.type === "success" ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {emailFeedback.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
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
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordFeedback && (
                <p className="text-sm text-red-600">{passwordFeedback}</p>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                className="mt-1"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                disabled={isLoading}
              />
              <label htmlFor="terms" className="text-sm leading-relaxed">
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

            <Button
              className="w-full h-12 text-base"
              size="lg"
              disabled={!termsAccepted || isLoading}
              type="submit"
            >
              {isLoading ? "Creating..." : "Sign up"}
            </Button>

            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {googleError && (
              <Alert variant="destructive">
                <AlertDescription>{googleError}</AlertDescription>
              </Alert>
            )}

            <div
              id="google-signin-button"
              className={`w-full ${
                !termsAccepted ? "opacity-50 pointer-events-none" : ""
              }`}
              title={
                !termsAccepted
                  ? "Please agree to the Privacy Policy and Terms first"
                  : ""
              }
            />
          </form>
        </div>
      </div>
    </div>
  );
};

const Register = (props: RegisterProps) => {
  const mode = props.mode ?? "page";

  if (mode === "modal") {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <RegisterInner mode="modal" />
      </div>
    );
  }

  return (
    <AnimatedGradientBackground layout="full">
      <RegisterInner mode="page" />
    </AnimatedGradientBackground>
  );
};

// Extend Window interface for Google Sign-In
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default Register;
