import logoSvg from "@/assets/logo.svg";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export const Logo = ({ className = "", showText = true }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logoSvg} alt="MODOVISA Logo" className="h-12 w-12" />
      {showText && (
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight">MODOVISA</span>
          <span className="text-xs text-muted-foreground -mt-1">Intuitive Analytics.</span>
        </div>
      )}
    </div>
  );
};
