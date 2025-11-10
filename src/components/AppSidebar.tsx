// src/components/AppSidebar.tsx

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Eye, BarChart3, Plug, UserPlus, HelpCircle, MessageSquare, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Logo } from "./Logo";

const navigation = [
  { name: "Live Insights", href: "/app/live-tracking", icon: Eye },
  { name: "Dashboard", href: "/app/dashboard", icon: BarChart3 },
  { name: "Installation", href: "/app/installation", icon: Plug },
  { name: "Tracking Setup", href: "/app/tracking-setup", icon: UserPlus },
  { name: "Support", href: "/app/help", icon: HelpCircle },
  { name: "Contact", href: "/app/feedback", icon: MessageSquare },
];

export const AppSidebar = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const handleMouseEnter = () => {
    if (!isLocked) setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isLocked) setIsExpanded(false);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
    setIsExpanded(!isLocked);
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 h-full",
        "lg:w-auto",
        isExpanded ? "lg:w-64" : "lg:w-20"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Updated: Using Logo component with square variant */}
          <Logo 
            variant="square" 
            size="md" 
            showBeta={false}
          />
          <span className={cn("text-xl font-bold", !isExpanded && "lg:hidden")}>Modovisa</span>
        </div>
        {isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLock}
            className="h-8 w-8 hidden lg:flex"
          >
            {isLocked ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all min-h-[44px]",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className={cn("text-sm font-medium whitespace-nowrap overflow-hidden", !isExpanded && "lg:hidden")}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};