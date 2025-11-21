// src/components/DocsLayout.tsx

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Code,
  Download,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Logo } from "./Logo";

const gettingStartedItems = [
  { name: "Welcome", href: "/docs" },
  { name: "Register for an account", href: "/docs/register" },
  { name: "Setup Tracking for your s...", href: "/docs/setup" },
];

const platforms = [
  "WordPress",
  "Shopify",
  "Magento",
  "PrestaShop",
  "BigCommerce",
  "Joomla",
  "Drupal",
  "Wix",
  "Squarespace",
  "Webflow",
  "Ghost",
];

interface DocsSidebarProps {
  variant?: "desktop" | "mobile";
}

export const DocsSidebar = ({ variant = "desktop" }: DocsSidebarProps) => {
  const location = useLocation();
  const isMobileVariant = variant === "mobile";

  const [isExpanded, setIsExpanded] = useState(isMobileVariant);
  const [isLocked, setIsLocked] = useState(isMobileVariant);
  const [isGettingStartedOpen, setIsGettingStartedOpen] = useState(true);
  const [isInstallationOpen, setIsInstallationOpen] = useState(false);

  const handleMouseEnter = () => {
    if (isMobileVariant) return;
    if (!isLocked) setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (isMobileVariant) return;
    if (!isLocked) setIsExpanded(false);
  };

  const toggleLock = () => {
    if (isMobileVariant) return;
    setIsLocked(!isLocked);
    setIsExpanded(!isLocked);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card h-full",
        isMobileVariant
          ? "w-full"
          : "transition-all duration-300 lg:w-auto " +
              (isExpanded ? "lg:w-64" : "lg:w-20"),
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <Logo
            variant="square"
            size="md"
            showBeta={false}
            className="shrink-0"
          />
          <span
            className={cn(
              "text-xl font-bold whitespace-nowrap transition-all duration-300",
              isMobileVariant
                ? "opacity-100 w-auto"
                : isExpanded
                  ? "opacity-100 w-auto"
                  : "opacity-0 w-0 lg:opacity-0 lg:w-0",
            )}
          >
            Modovisa
          </span>
        </div>

        {/* Lock button – desktop only */}
        {!isMobileVariant && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLock}
            className={cn(
              "h-8 w-8 shrink-0 transition-all duration-300 hidden lg:flex",
              isExpanded ? "opacity-100 w-8" : "opacity-0 w-0",
            )}
          >
            {isLocked ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Getting Started */}
        <div className="space-y-1">
          <button
            onClick={() => setIsGettingStartedOpen(!isGettingStartedOpen)}
            className={cn(
              "flex items-center justify-between w-full gap-3 px-3 py-3 rounded-lg transition-all min-h-[44px]",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Code className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap overflow-hidden",
                  !isExpanded && !isMobileVariant && "lg:hidden",
                )}
              >
                Getting Started
              </span>
            </div>
            {isExpanded && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  isGettingStartedOpen && "rotate-180",
                )}
              />
            )}
          </button>

          {isGettingStartedOpen && isExpanded && (
            <div className="ml-3 pl-3 border-l space-y-1">
              {gettingStartedItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        active ? "bg-primary" : "bg-muted-foreground/30",
                      )}
                    />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Installation Guides */}
        <div className="space-y-1">
          <button
            onClick={() => setIsInstallationOpen(!isInstallationOpen)}
            className={cn(
              "flex items-center justify-between w-full gap-3 px-3 py-3 rounded-lg transition-all min-h-[44px]",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap overflow-hidden",
                  !isExpanded && !isMobileVariant && "lg:hidden",
                )}
              >
                Installation Guides
              </span>
            </div>
            {isExpanded && (
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  isInstallationOpen && "rotate-180",
                )}
              />
            )}
          </button>

          {isInstallationOpen && isExpanded && (
            <div className="ml-3 pl-3 border-l space-y-1">
              {platforms.map((platform) => {
                const href = `/docs/install/${platform.toLowerCase()}`;
                const active = isActive(href);
                return (
                  <Link
                    key={platform}
                    to={href}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        active ? "bg-primary" : "bg-muted-foreground/30",
                      )}
                    />
                    <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {platform}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
};
