// src/components/Logo.tsx
// @ts-nocheck

import { Link } from "react-router-dom";
import logoSvg from "@/assets/logo.svg";
import logoSquareSvg from "@/assets/logo-square.svg";
import { Badge } from "@/components/ui/badge";

interface LogoProps {
  className?: string;
  showText?: boolean;
  showBeta?: boolean; // Show BETA badge
  variant?: "full" | "square"; // Logo variant: full (default) or square for sidebars
  size?: "sm" | "md" | "lg"; // Size preset
}

export const Logo = ({
  className = "",
  showText = true,
  showBeta = true,
  variant = "full",
  size = "md",
}: LogoProps) => {
  // Determine which logo to use
  const logoSrc = variant === "square" ? logoSquareSvg : logoSvg;

  // Size configurations
  const sizeClasses = {
    sm: variant === "square" ? "w-8 h-8" : "w-32",
    md: variant === "square" ? "w-12 h-12" : "w-[200px]",
    lg: variant === "square" ? "w-16 h-16" : "w-64",
  };

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-3 ${className}`}
      aria-label="Go to homepage"
    >
      {/* Logo SVG */}
      <img
        src={logoSrc}
        alt="MODOVISA Logo"
        className={`h-auto ${sizeClasses[size]}`}
      />

      {/* BETA Badge - only show for full logo variant */}
      {showBeta && variant === "full" && (
        <Badge
          variant="secondary"
          className="rounded-sm bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground"
        >
          BETA
        </Badge>
      )}

      {/* Optional text block (kept off for now) */}
      {/* {showText && variant === "full" && (
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight">MODOVISA</span>
          <span className="text-xs -mt-1 text-muted-foreground">
            Intuitive Analytics.
          </span>
        </div>
      )} */}
    </Link>
  );
};
