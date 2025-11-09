// src/components/AdminSidebarComponent.tsx

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Shield, Database, CreditCard, FileText, Lock, Settings, ChevronRight, ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import logoSvg from "@/assets/logo.svg";

const adminNavigation = [
  { name: "Dashboard", href: "/mv-admin/dashboard", icon: Home },
  { name: "Platform Users", href: "/mv-admin/users", icon: Users },
  { name: "Admin Users", href: "/mv-admin/admin-users", icon: Shield },
  { name: "Permissions", href: "/mv-admin/permissions", icon: Lock },
  { name: "Sites", href: "/mv-admin/sites", icon: Database },
  { name: "Billing", href: "/mv-admin/billing", icon: CreditCard },
  { name: "Settings", href: "/mv-admin/settings", icon: Settings },
  { name: "Logs", href: "/mv-admin/logs", icon: FileText },
];

export const AdminSidebarComponent = () => {
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
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r bg-card transition-all duration-300 h-full",
          "lg:w-auto",
          isExpanded ? "lg:w-64" : "lg:w-20"
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoSvg} alt="Modovisa" className="h-10 w-10" />
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
          {adminNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all min-h-[44px]",
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

      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-50">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <img src={logoSvg} alt="Modovisa" className="h-10 w-10" />
              <span className="text-xl font-bold">Modovisa</span>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            {adminNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
};
