// src/pages/Login.tsx

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GOOGLE_CLIENT_ID = '1057403058678-pak64aj4vthcedsnr81r30qbo6pia6d3.apps.googleusercontent.com';

const Login = () => {
  const navigate = useNavigate();
  
  // Form state
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Error states
  const [loginError, setLoginError] = useState("");
  const [googleError, setGoogleError] = useState("");
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // JIT Consent Modal (for new Google users)
  const [showJitConsent, setShowJitConsent] = useState(false);
  const [jitConsentChecked, setJitConsentChecked] = useState(false);
  const [jitConsentError, setJitConsentError] = useState("");
  const [pendingGoogleResult, setPendingGoogleResult] = useState<any>(null);

  // Helper to derive display name
  const deriveDisplayName = (result: any, emailOrUsername: string): string => {
    return result?.username || result?.name || result?.email?.split('@')[0] || emailOrUsername.split('@')[0] || 'User';
  };

  // Handle manual login (email/password)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);
    setLoadingMessage("Signing you in...");

    try {
      const response = await fetch('https://api.modovisa.com/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          email: emailOrUsername.trim(), 
          password 
        })
      });

      const result = await response.json();

      if (response.ok) {
        // Check if 2FA is required
        if (result.twofa_required) {
          sessionStorage.setItem('twofa_temp_token', result.temp_token);
          sessionStorage.setItem('pending_2fa_user_id', result.user_id);
          setLoadingMessage("Redirecting to verification...");
          window.location.href = '/auth/two-step-verification.html';
          return;
        }

        // Successful login without 2FA
        if (result.ok || result.redirect || result.token) {
          const displayName = deriveDisplayName(result, emailOrUsername);
          localStorage.setItem('username', displayName);
          
          setLoadingMessage("Setting up your dashboard...");
          setTimeout(() => {
            navigate(result.redirect || '/app/live-tracking');
          }, 150);
          return;
        }
      }

      // Login failed
      setIsLoading(false);
      setLoginError(result.error || "Login failed. Please try again.");
      
    } catch (err) {
      console.error("❌ Login error:", err);
      setIsLoading(false);
      setLoginError("Login failed due to an unexpected error.");
    }
  };

  // Handle JIT consent for new Google users
  const handleJitConsentAccept = async () => {
    if (!jitConsentChecked) {
      setJitConsentError("Please check the consent box to continue.");
      return;
    }

    setJitConsentError("");
    setIsLoading(true);
    setLoadingMessage("Recording consent...");

    try {
      const res = await fetch('https://api.modovisa.com/api/consent', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          consent: true, 
          consent_at: new Date().toISOString() 
        })
      });

      if (!res.ok) {
        setIsLoading(false);
        setJitConsentError("Failed to record consent. Please try again.");
        return;
      }

      // Consent recorded successfully
      setShowJitConsent(false);
      setLoadingMessage("Setting up your dashboard...");
      
      // Mark as new signup
      localStorage.setItem('mv_new_signup', '1');

      // Redirect
      const redirect = pendingGoogleResult?.redirect || '/app/live-tracking';
      setTimeout(() => {
        window.location.replace(redirect);
      }, 150);

    } catch (err) {
      console.error("❌ Consent error:", err);
      setIsLoading(false);
      setJitConsentError("Failed to record consent. Please try again.");
    }
  };

  // Handle JIT consent cancel
  const handleJitConsentCancel = async () => {
    // User refused consent - log them out
    try {
      await fetch('https://api.modovisa.com/api/logout', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store'
      });
    } catch (err) {
      console.error("❌ Logout error:", err);
    }

    setShowJitConsent(false);
    setGoogleError("Consent is required to continue. You have not been signed in.");
    setPendingGoogleResult(null);
  };

  // Handle Google sign-in response
  const handleGoogleResponse = async (response: any) => {
    setGoogleError("");
    setIsLoading(true);
    setLoadingMessage("Signing you in with Google...");

    try {
      const res = await fetch('https://api.modovisa.com/api/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          credential: response?.credential
        })
      });

      const result = await res.json().catch(() => ({}));

      // Handle provider mismatch (email already exists with password)
      if (res.status === 409 && result?.code === "PROVIDER_MISMATCH") {
        setIsLoading(false);
        setGoogleError(result.error || "This email is registered with a password. Please sign in with email/password.");
        return;
      }

      // Handle 2FA requirement
      if (result?.temp_token && result?.redirect?.includes("two-step-verification")) {
        sessionStorage.setItem('twofa_temp_token', result.temp_token);
        sessionStorage.setItem('pending_2fa_user_id', result.user_id);
        setLoadingMessage("Redirecting to verification...");
        window.location.href = result.redirect;
        return;
      }

      // Check if this is a new user (requires JIT consent)
      let isNewUser = !!result?.is_new_user;
      
      // If backend doesn't provide is_new_user, check /api/me
      if (!('is_new_user' in result) && res.ok) {
        try {
          const meRes = await fetch('https://api.modovisa.com/api/me', {
            credentials: 'include',
            cache: 'no-store'
          });
          if (meRes.ok) {
            const me = await meRes.json();
            isNewUser = !!me?.is_new_user;
          }
        } catch (err) {
          console.error("❌ Failed to check user status:", err);
        }
      }

      // If new user, show JIT consent modal
      if (isNewUser) {
        setIsLoading(false);
        setPendingGoogleResult(result);
        setShowJitConsent(true);
        return;
      }

      // Existing user - proceed to redirect
      if (res.ok) {
        setLoadingMessage("Setting up your dashboard...");
        const redirect = result.redirect || '/app/live-tracking';
        setTimeout(() => {
          window.location.replace(redirect);
        }, 150);
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

  // Initialize Google Sign-In and One Tap
  useEffect(() => {
    let gsiScript: HTMLScriptElement | null = null;

    const initGoogle = async () => {
      // Load GSI script
      if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        gsiScript = document.createElement('script');
        gsiScript.src = 'https://accounts.google.com/gsi/client';
        gsiScript.async = true;
        gsiScript.defer = true;
        document.head.appendChild(gsiScript);
      }

      // Wait for script to load
      await new Promise<void>((resolve) => {
        const checkGsi = setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(checkGsi);
            resolve();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkGsi);
          resolve();
        }, 5000);
      });

      if (!window.google?.accounts?.id) {
        console.warn("Google Sign-In failed to load");
        return;
      }

      // Initialize GSI
      if (!(window as any).__mv_gsi_initialized) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false
        });
        (window as any).__mv_gsi_initialized = true;
      }

      // Render button
      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv && !(buttonDiv as any).dataset.rendered) {
        buttonDiv.textContent = '';
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: "outline",
          size: "large",
          width: buttonDiv.offsetWidth
        });
        (buttonDiv as any).dataset.rendered = "1";
      }

      // Prompt One Tap
      try {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.log('One Tap not displayed:', notification.getNotDisplayedReason());
          }
          if (notification.isSkippedMoment()) {
            console.log('One Tap skipped:', notification.getSkippedReason());
          }
          if (notification.isDismissedMoment()) {
            console.log('One Tap dismissed:', notification.getDismissedReason());
          }
        });
      } catch (err) {
        console.error("One Tap prompt error:", err);
      }
    };

    initGoogle();

    // Retry One Tap on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.prompt();
        } catch (err) {
          // Silently fail
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (gsiScript && gsiScript.parentNode) {
        gsiScript.parentNode.removeChild(gsiScript);
      }
    };
  }, []);

  return (
    <AnimatedGradientBackground layout="full">
      <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl p-10 space-y-6">
        <div className="flex flex-col items-center space-y-2 py-4">
          <Link to="/">
            <Logo showBeta={false} />
          </Link>
          <p className="text-lg font-semibold mb-0">Intuitive Analytics.</p>
          <h1 className="text-2xl font-semibold mt-6">Sign in to your account</h1>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email or Username</Label>
            <Input
              id="email"
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
          </div>

          {loginError && (
            <Alert variant="destructive">
              <AlertDescription>{loginError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isLoading}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Remember Me
              </label>
            </div>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>

          <Button 
            className="w-full h-12 text-base" 
            size="lg" 
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </Button>

          <div className="text-center text-sm">
            New to Modovisa?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create an account
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

          <div id="google-signin-button" className="w-full"></div>
        </form>
      </div>

      {/* JIT Consent Modal for New Google Users */}
      <Dialog open={showJitConsent} onOpenChange={setShowJitConsent}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Consent required</DialogTitle>
            <DialogDescription>
              We use a visitor ID cookie to measure website traffic. Please confirm that you agree to our{" "}
              <a 
                href="/legal/privacy.html" 
                target="_blank" 
                rel="noopener" 
                className="text-primary hover:underline"
              >
                Privacy Policy
              </a>{" "}
              and{" "}
              <a 
                href="/legal/terms-and-conditions.html" 
                target="_blank" 
                rel="noopener"
                className="text-primary hover:underline"
              >
                Terms of Service
              </a>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-2">
              <Checkbox 
                id="jit-consent" 
                checked={jitConsentChecked}
                onCheckedChange={(checked) => setJitConsentChecked(checked === true)}
              />
              <label
                htmlFor="jit-consent"
                className="text-sm leading-relaxed"
              >
                I agree to the Privacy Policy and Terms of Service
              </label>
            </div>
            
            {jitConsentError && (
              <Alert variant="destructive">
                <AlertDescription>{jitConsentError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              onClick={handleJitConsentAccept}
              disabled={!jitConsentChecked || isLoading}
            >
              Continue
            </Button>
            <Button
              variant="outline"
              onClick={handleJitConsentCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          prompt: (callback?: (notification: any) => void) => void;
        };
      };
    };
  }
}

export default Login;