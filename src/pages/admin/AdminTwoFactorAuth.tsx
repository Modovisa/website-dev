// src/pages/admin/AdminTwoFactorAuth.tsx

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const API = "https://api.modovisa.com";

const AdminTwoFactorAuth = () => {
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Guard: if no temp token, bounce back to admin login
  useEffect(() => {
    const tempToken = sessionStorage.getItem("admin_twofa_temp_token");
    if (!tempToken) {
      navigate("/mv-admin/login", { replace: true });
    }

    // Strip any ?otp=XXXX from URL
    try {
      const url = new URL(window.location.href);
      if (url.search) {
        window.history.replaceState(null, "", url.pathname);
      }
    } catch {
      // ignore
    }
  }, [navigate]);

  const applyOtpToDigits = (otp: string) => {
    const cleaned = otp.replace(/\D/g, "").slice(0, 6);
    if (!cleaned) return;

    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = cleaned[i] ?? "";
    }
    setDigits(next);

    // Move focus to last filled box
    const lastIndex = Math.min(cleaned.length - 1, 5);
    if (lastIndex >= 0) {
      inputsRef.current[lastIndex]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    // If user pasted or auto-filled multiple chars into a single box,
    // treat it as a full OTP and spread across inputs.
    if (value.length > 1) {
      applyOtpToDigits(value);
      return;
    }

    // Only allow a single digit per box
    if (!/^\d?$/.test(value)) return;

    const next = [...digits];
    next[index] = value;
    setDigits(next);

    if (value && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]!.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text") || "";
    applyOtpToDigits(text);
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const otp = digits.join("");
    if (otp.length !== 6) {
      setError("Enter a valid 6-digit code.");
      return;
    }

    const tempToken = sessionStorage.getItem("admin_twofa_temp_token");
    const adminId = sessionStorage.getItem("pending_admin_2fa_id");
    if (!tempToken || !adminId) {
      setError("Session expired. Please log in again.");
      navigate("/mv-admin/login", { replace: true });
      return;
    }

    setIsSubmitting(true);
    setLoadingMessage("Verifying your code...");

    try {
      const res = await fetch(`${API}/api/verify-admin-2fa-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tempToken}`, // same as Bootstrap version
        },
        credentials: "include",
        body: JSON.stringify({ otp }),
      });

      const result = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setIsSubmitting(false);
        setLoadingMessage("");
        setError(result.error || "Invalid or expired code.");
        return;
      }

      // Clear any legacy local admin tokens
      try {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_id");
        localStorage.removeItem("admin_name");
      } catch {
        // ignore
      }

      // Clean temp session values
      sessionStorage.removeItem("admin_twofa_temp_token");
      sessionStorage.removeItem("pending_admin_2fa_id");

      setLoadingMessage("Signing you in...");

      setTimeout(() => {
        navigate("/mv-admin/dashboard", { replace: true });
      }, 150);
    } catch (err) {
      console.error("🔐 Admin 2FA error:", err);
      setIsSubmitting(false);
      setLoadingMessage("");
      setError("Unexpected error during 2FA verification. Please try again.");
    }
  };

  // Auto-submit when all 6 digits are filled (same behaviour as app 2FA)
  useEffect(() => {
    const otp = digits.join("");
    if (otp.length === 6 && !isSubmitting) {
      handleSubmit({ preventDefault() {} } as React.FormEvent);
    }
  }, [digits, isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatedGradientBackground layout="full">
      <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl p-10 space-y-6">
        <div className="flex flex-col items-center space-y-2 py-4">
          <Logo showBeta={false} />
          <p className="text-lg font-semibold mb-0">Intuitive Analytics.</p>
          <h1 className="text-2xl font-semibold mt-6">Two Step Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the 6-digit code generated by your authenticator app.
          </p>
        </div>

        {isSubmitting && (
          <div className="text-center py-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {loadingMessage}
            </p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2">
            {digits.map((d, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                className="w-10 h-12 md:w-12 md:h-14 text-center border rounded-md text-lg md:text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-background"
                value={d}
                onChange={(e) => handleChange(idx, e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => handleKeyDown(idx, e)}
              />
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Verifying..." : "Verify my account"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Having trouble?{" "}
            <a
              href="/mv-admin/forgot-password"
              className="text-primary hover:underline"
            >
              Try resetting your password
            </a>
          </div>
        </form>
      </div>
    </AnimatedGradientBackground>
  );
};

export default AdminTwoFactorAuth;
