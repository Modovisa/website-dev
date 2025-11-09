// src/pages/auth/ResetPassword.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ResetPassword = () => {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle password reset logic here
    if (newPassword === confirmPassword) {
      // Submit new password
      console.log("Password reset submitted");
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
          <h1 className="text-2xl font-semibold mt-6">Reset your password</h1>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Your new password must be different from previously used passwords
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base" 
            size="lg"
            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
          >
            Set new password
          </Button>

          <div className="text-center">
            <Link 
              to="/login" 
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>←</span> Back to login
            </Link>
          </div>
        </form>
      </div>
    </AnimatedGradientBackground>
  );
};

export default ResetPassword;