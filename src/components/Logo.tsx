// src/components/Logo.tsx

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
  size = "md"
}: LogoProps) => {
  // Determine which logo to use
  const logoSrc = variant === "square" ? logoSquareSvg : logoSvg;
  
  // Size configurations
  const sizeClasses = {
    sm: variant === "square" ? "w-8 h-8" : "w-32",
    md: variant === "square" ? "w-12 h-12" : "w-[200px]",
    lg: variant === "square" ? "w-16 h-16" : "w-64"
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
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
          className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold"
        >
          BETA
        </Badge>
      )}
      
      {/* Text (commented out as requested, but kept for other pages if needed) */}
      {/* {showText && variant === "full" && (
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight">MODOVISA</span>
          <span className="text-xs text-muted-foreground -mt-1">Intuitive Analytics.</span>
        </div>
      )} */}
    </div>
  );
};