// src/pages/auth/ForgotPassword.tsx

import { useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      setIsSubmitted(true);
      // Handle password reset logic here
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
            Enter the email address associated with your account, and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={handleEmailChange}
              className="h-12"
            />
            {isValid && !isSubmitted && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Check className="h-4 w-4" /> Verified. You can submit now.
              </p>
            )}
            {isSubmitted && (
              <p className="text-sm text-green-600 font-medium">
                Check your email for reset instructions!
              </p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base" 
            size="lg"
            disabled={!isValid}
          >
            Send Reset Link
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

export default ForgotPassword;