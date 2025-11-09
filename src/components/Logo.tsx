// src/components/Logo/tsx

import logoSvg from "@/assets/logo.svg";
import { Badge } from "@/components/ui/badge";

interface LogoProps {
  className?: string;
  showText?: boolean;
  showBeta?: boolean; // New prop to show BETA badge
}

export const Logo = ({ className = "", showText = true, showBeta = true }: LogoProps) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo SVG - 200px wide */}
      <img src={logoSvg} alt="MODOVISA Logo" className="h-auto w-[200px]" />
      
      {/* BETA Badge - matches screenshot style */}
      {showBeta && (
        <Badge 
          variant="secondary" 
          className="bg-primary text-primary-foreground px-3 py-1 text-sm font-semibold"
        >
          BETA
        </Badge>
      )}
      
      {/* Text (commented out as requested, but kept for other pages if needed) */}
      {/* {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight">MODOVISA</span>
          <span className="text-xs text-muted-foreground -mt-1">Intuitive Analytics.</span>
        </div>
      )} */}
    </div>
  );
};