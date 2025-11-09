import { Link, useLocation } from "react-router-dom";
import { Eye, BarChart3, Plug, UserPlus, HelpCircle, MessageSquare } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Live Tracking", href: "/live-tracking", icon: Eye },
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Installation", href: "/installation", icon: Plug },
  { name: "Add Website", href: "/tracking-setup", icon: UserPlus },
  { name: "Help", href: "/help", icon: HelpCircle },
  { name: "Feedback", href: "/feedback", icon: MessageSquare },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="flex h-screen w-20 flex-col items-center border-r bg-card py-6 space-y-8">
      <Link to="/" className="flex-shrink-0">
        <Logo showText={false} />
      </Link>

      <nav className="flex flex-1 flex-col items-center space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group relative flex h-14 w-14 items-center justify-center rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="absolute left-full ml-4 hidden group-hover:block rounded-lg bg-popover px-3 py-2 text-sm shadow-lg whitespace-nowrap z-50">
                {item.name}
              </span>
              {isActive && (
                <span className="absolute left-0 h-8 w-1 rounded-r-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
