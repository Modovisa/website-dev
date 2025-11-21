// src/components/GuidesSidebar.tsx
// @ts-nocheck

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

export const gettingStartedItems = [
  { name: "Welcome", href: "/guides" },
  { name: "Register for an account", href: "/guides/register" },
  { name: "Setup Tracking for your s...", href: "/guides/setup" },
];

export const platforms = [
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

export const GuidesSidebar = () => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isGettingStartedOpen, setIsGettingStartedOpen] = useState(true);
  const [isInstallationOpen, setIsInstallationOpen] = useState(false);

  const handleMouseEnter = () => {
    if (!isLocked) setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isLocked) setIsExpanded(false);
  };

  const toggleLock = () => {
    setIsLocked((prev) => !prev);
    setIsExpanded((prev) => !prev);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-card transition-all duration-300",
        "lg:w-auto",
        isExpanded ? "lg:w-64" : "lg:w-20",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 overflow-hidden">
        <div className="flex min-w-0 items-center gap-3">
          <Logo
            variant="square"
            size="md"
            showBeta={false}
            className="shrink-0"
          />
          <span
            className={cn(
              "text-xl font-bold whitespace-nowrap transition-all duration-300",
              isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 lg:opacity-0 lg:w-0",
            )}
          >
            Modovisa
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLock}
          className={cn(
            "hidden h-8 w-8 shrink-0 transition-all duration-300 lg:flex",
            isExpanded ? "opacity-100 w-8" : "opacity-0 w-0",
          )}
        >
          {isLocked ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {/* Getting Started */}
        <div className="space-y-1">
          <button
            onClick={() => setIsGettingStartedOpen((prev) => !prev)}
            className={cn(
              "flex w-full min-h-[44px] items-center justify-between gap-3 rounded-lg px-3 py-3 transition-all",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Code className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap overflow-hidden",
                  !isExpanded && "lg:hidden",
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
            <div className="ml-3 space-y-1 border-l pl-3">
              {gettingStartedItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
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
            onClick={() => setIsInstallationOpen((prev) => !prev)}
            className={cn(
              "flex w-full min-h-[44px] items-center justify-between gap-3 rounded-lg px-3 py-3 transition-all",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 shrink-0" />
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap overflow-hidden",
                  !isExpanded && "lg:hidden",
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
            <div className="ml-3 space-y-1 border-l pl-3">
              {platforms.map((platform) => {
                const href = `/guides/install/${platform.toLowerCase()}`;
                const active = isActive(href);
                return (
                  <Link
                    key={platform}
                    to={href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
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
