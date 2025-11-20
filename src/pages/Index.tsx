// src/pages/Index.tsx

import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Eye,
  BarChart2,
  Zap,
  Shield,
  Globe,
  Clock,
  Package,
  Briefcase,
  Check,
  MapPin,
  ExternalLink,
  Monitor,
  Users,
  User as UserIcon,
  Feather,
  Globe2,
  ShoppingBag,
  Store,
  LayoutTemplate,
  Frame,
  Square,
  Tags,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { secureFetch } from "@/lib/auth/auth";
import { apiBase } from "@/lib/api";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

import { useLiveSimulation } from "@/hooks/useLiveSimulation";
import type { LiveSimVisitor } from "@/services/liveSimulation.store";

// TypeScript declaration for Gradient + Bootstrap
declare global {
  interface Window {
    Gradient: any;
    bootstrap?: any;
    showGlobalLoadingModal?: (msg?: string) => void;
    hideGlobalLoadingModal?: () => void;
  }
}

/* ------------------------------ SVG icons ---------------------------- */

const IconWindow = ({ className = "h-5 w-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M4 21h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2m0-2V7h16l.001 12z"
    />
  </svg>
);

const IconAddToCart = ({ className = "h-5 w-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle cx="10.5" cy="19.5" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="19.5" r="1.5" fill="currentColor" />
    <path
      fill="currentColor"
      d="M13 13h2v-2.99h2.99v-2H15V5.03h-2v2.98h-2.99v2H13z"
    />
    <path
      fill="currentColor"
      d="M10 17h8a1 1 0 0 0 .93-.64L21.76 9h-2.14l-2.31 6h-6.64L6.18 4.23A2 2 0 0 0 4.33 3H2v2h2.33l4.75 11.38A1 1 0 0 0 10 17"
    />
  </svg>
);

const IconCheckout = ({ className = "h-5 w-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M21.822 7.431A1 1 0 0 0 21 7H7.333L6.179 4.23A1.99 1.99 0 0 0 4.333 3H2v2h2.333l4.744 11.385A1 1 0 0 0 10 17h8c.417 0 .79-.259.937-.648l3-8a1 1 0 0 0-.115-.921M17.307 15h-6.64l-2.5-6h11.39z"
    />
    <circle cx="10.5" cy="19.5" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="19.5" r="1.5" fill="currentColor" />
  </svg>
);

const IconThankYou = ({ className = "h-5 w-5" }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <path
      fill="currentColor"
      d="M12 15c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1"
    />
    <path
      fill="currentColor"
      d="M5 2H2v2h2v17a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4h2V2zm13 18H6V4h12z"
    />
  </svg>
);

/* Helpers for stage ➜ icon + label (used in sidebar + timeline) */
const stageMeta = (stage?: string | null) => {
  if (stage === "cart")
    return {
      Icon: IconAddToCart,
      label: "Product added to cart",
      className: "text-[#56ca00]",
    };
  if (stage === "checkout")
    return {
      Icon: IconCheckout,
      label: "Visitor started checkout",
      className: "text-[#56ca00]",
    };
  if (stage === "thank_you")
    return {
      Icon: IconThankYou,
      label: "Order completed",
      className: "text-[#56ca00]",
    };
  return {
    Icon: IconWindow,
    label: null,
    className: "text-[#ffab00]", // generic page view = orange
  };
};

const deriveStageFromUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const lower = url.toLowerCase();

  if (lower.includes("cart")) return "cart";
  if (lower.includes("checkout")) return "checkout";

  if (
    lower.includes("thank-you") ||
    lower.includes("order-confirmation") ||
    lower.includes("order-received")
  ) {
    return "thank_you";
  }

  return null;
};

const getStageForPage = (page?: { stage?: string | null; url?: string | null }) => {
  if (!page) return null;
  return (page.stage as string | null) ?? deriveStageFromUrl(page.url ?? null);
};

/* ------------------------------------------------------------------ */
/*                        PRICING TYPES & CONSTANTS                    */
/* ------------------------------------------------------------------ */

type PublicPricingTier = {
  id: number;
  name: string;
  min_events: number;
  max_events: number;
  monthly_price: number;
  stripe_price_id_month?: string | null;
  stripe_price_id_year?: string | null;
};

const SNAP_STEPS = [
  25_000,
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_000_000,
  5_000_000,
  10_000_000,
  15_000_000,
  20_000_000,
];

const INTENT_KEY = "intent_upgrade";

// Fallback in case the public tiers endpoint is unavailable.
const FALLBACK_PAID_TIERS: PublicPricingTier[] = [
  {
    id: 2,
    name: "Standard plan",
    min_events: 3_001,
    max_events: 25_000,
    monthly_price: 14,
  },
  {
    id: 3,
    name: "Growth plan",
    min_events: 25_001,
    max_events: 100_000,
    monthly_price: 24,
  },
  {
    id: 4,
    name: "Pro Lite",
    min_events: 100_001,
    max_events: 250_000,
    monthly_price: 34,
  },
  {
    id: 5,
    name: "Pro Core",
    min_events: 250_001,
    max_events: 500_000,
    monthly_price: 59,
  },
  {
    id: 6,
    name: "Pro Advanced",
    min_events: 500_001,
    max_events: 1_000_000,
    monthly_price: 99,
  },
];

/* ------------------------------------------------------------------ */
/*                          TIME FORMAT HELPERS                        */
/* ------------------------------------------------------------------ */

const formatSessionTime = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
};

const formatPageTime = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, "0")}s`;
};

/* ------------------------------------------------------------------ */
/*                       LANDING LIVE DEMO COMPONENT                   */
/* ------------------------------------------------------------------ */

const LandingLiveDemo = () => {
  const {
    visitors,
    // store has these, but we drive selection locally
    selectedVisitor: _storeSelectedVisitor,
    selectedId: _storeSelectedId,
    // NOTE: we intentionally do NOT use selectVisitor here for the homepage demo
    // to avoid freezing the simulation when a visitor is selected.
  } = useLiveSimulation();

  // local selection drives sidebar + right pane
  const [selectedVisitorId, setSelectedVisitorId] = useState<
    string | number | null
  >(null);

  // treat "connected" as true once we see any snapshot
  const connected = visitors.length > 0;

  const activeVisitors = useMemo(
    () => visitors.filter((v) => v.active),
    [visitors],
  );

  const recentVisitors = useMemo(
    () =>
      visitors
        .filter((v) => !v.active)
        .sort((a, b) => (b.leftAt ?? 0) - (a.leftAt ?? 0)),
    [visitors],
  );

  // collapsible + limits
  const INITIAL_ACTIVE_LIMIT = 5;
  const LIMIT_STEP = 5;

  const [liveVisitorsOpen, setLiveVisitorsOpen] = useState(true);
  // Recently left collapsed by default
  const [recentlyLeftOpen, setRecentlyLeftOpen] = useState(false);
  const [activeShowLimit, setActiveShowLimit] = useState(INITIAL_ACTIVE_LIMIT);
  const [recentShowLimit, setRecentShowLimit] = useState(INITIAL_ACTIVE_LIMIT);

  // Auto-select first visitor when stream updates (only if nothing selected yet)
  useEffect(() => {
    if (selectedVisitorId != null) return;

    const firstActive = activeVisitors[0];
    const firstRecent = recentVisitors[0];
    const next = firstActive || firstRecent || null;

    if (next) {
      // purely local selection – do not lock the store
      setSelectedVisitorId(next.id);
    }
  }, [selectedVisitorId, activeVisitors, recentVisitors]);

  // derive selected visitor from local id
  const selectedVisitor: LiveSimVisitor | null = useMemo(() => {
    if (selectedVisitorId == null) {
      return activeVisitors[0] || recentVisitors[0] || null;
    }
    return (
      visitors.find((v) => v.id === selectedVisitorId) ||
      activeVisitors[0] ||
      recentVisitors[0] ||
      null
    );
  }, [selectedVisitorId, visitors, activeVisitors, recentVisitors]);

  // Journey: only pages up to currentPage, newest (active) at the top
  const selectedPagesForTimeline =
    selectedVisitor &&
    Array.isArray((selectedVisitor as any).journey) &&
    (selectedVisitor as any).journey.length > 0
      ? (() => {
          const journey = Array.isArray((selectedVisitor as any).journey)
            ? (selectedVisitor as any).journey
            : [];

          if (!journey.length) {
            return [];
          }

          let lastIndex =
            (selectedVisitor as any).currentPage ?? journey.length - 1;

          if (typeof lastIndex !== "number" || Number.isNaN(lastIndex)) {
            lastIndex = journey.length - 1;
          }

          if (lastIndex < 0) lastIndex = 0;
          if (lastIndex >= journey.length) lastIndex = journey.length - 1;

          const perPage =
            (selectedVisitor as any).perPageSeconds ??
            (selectedVisitor as any).perPageDurations ??
            [];

          return journey
            .slice(0, lastIndex + 1)
            .map((p: any, idx: number) => {
              const timeSpent =
                Array.isArray(perPage) && perPage[idx] != null
                  ? perPage[idx]
                  : 0;

              const isActive = idx === lastIndex && !!selectedVisitor.active;

              return {
                ...p,
                isActive,
                timeSpent,
              };
            })
            .reverse();
        })()
      : [];

  const handleSelectVisitor = (visitor: LiveSimVisitor) => {
    // only local state; do NOT call store.selectVisitor for the demo
    setSelectedVisitorId(visitor.id);
  };

  /* --------------------------- sidebar component --------------------------- */
  const VisitorSidebar = () => (
    <div className="flex h-full w-full flex-col rounded-2xl border bg-background">
      <div className="space-y-4 p-6 pt-8">
        <h2 className="text-2xl font-bold">Visitors</h2>

        {/* Domain pill */}
        <div className="rounded-lg bg-[#dff7fb] px-4 py-3 text-center text-sm font-medium text-[#00b6ff]">
          demomoda.com
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {connected ? "Live simulation connected" : "Connecting…"}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
              connected
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            {connected ? "Live" : "Waiting"}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {activeVisitors.length === 0 && recentVisitors.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-10 w-10 opacity-60" />
            <p className="text-sm">
              {connected
                ? "No visitors yet. Waiting for traffic to arrive..."
                : "Connecting to live simulation..."}
            </p>
          </div>
        ) : (
          <>
            {/* LIVE VISITORS */}
            {activeVisitors.length > 0 ? (
              <Collapsible
                open={liveVisitorsOpen}
                onOpenChange={(open) => {
                  setLiveVisitorsOpen(open);
                }}
              >
                <CollapsibleTrigger className="mb-2 w-full shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                  <div className="border-b bg-[#f9f9f9] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#71dd37] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                        <span className="text-md font-semibold">
                          Live Visitors
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-2 py-1 text-sm font-bold text-primary">
                          {activeVisitors.length}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            liveVisitorsOpen ? "" : "-rotate-90"
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="bg-background">
                    {activeVisitors.slice(0, activeShowLimit).map((visitor) => {
                      const currentPage =
                        visitor.journey[visitor.currentPage ?? 0] ||
                        visitor.journey[0];

                      const { Icon, label, className } = stageMeta(
                        getStageForPage(currentPage as any),
                      );

                      const isNew =
                        (visitor as any).isNew ??
                        (visitor as any).new ??
                        visitor.new ??
                        false;

                      const sessionSeconds =
                        (visitor as any).sessionSeconds ??
                        visitor.duration ??
                        0;

                      const isSelected = selectedVisitorId === visitor.id;

                      return (
                        <div
                          key={visitor.id}
                          className={`cursor-pointer p-1 transition-colors ${
                            isSelected ? "bg-muted/30" : "hover:bg-muted/20"
                          }`}
                          onClick={() => handleSelectVisitor(visitor)}
                        >
                          <div className="flex items-center gap-3 rounded-sm border px-3 py-4 shadow-sm">
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarFallback className="border border-[#71dd37] bg-[#71dd37]/10">
                                <UserIcon className="h-4 w-4 text-[#71dd37]" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="block max-w-[260px] truncate text-sm font-medium leading-tight text-foreground">
                                {currentPage?.title || "(No title)"}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <Badge
                                  className={`whitespace-nowrap rounded-md border-0 px-2 py-1 text-xs font-medium ${
                                    isNew
                                      ? "bg-[#e7f8e9] text-[#56ca00] hover:bg[#e7f8e9]"
                                      : "bg-[#eae8fd] text-[#7367f0] hover:bg-[#eae8fd]"
                                  }`}
                                >
                                  {isNew ? "New Visitor" : "Returning Visitor"}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="mr-2 whitespace-nowrap rounded-md border-0 bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                >
                                  Session: {formatSessionTime(sessionSeconds)}
                                </Badge>
                              </div>

                              {label && (
                                <div className="mt-1 flex items-center gap-2">
                                  <Icon className={`h-5 w-5 ${className}`} />
                                  <small className="text-muted-foreground">
                                    {label}
                                  </small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {activeVisitors.length > activeShowLimit && (
                      <div className="flex justify-center p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setActiveShowLimit((n) => n + LIMIT_STEP)
                          }
                        >
                          Show more ({activeVisitors.length - activeShowLimit})
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              // No active visitors ➜ red header, collapsed, count 0
              <div className="shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                <div className="border-b bg-[#f9f9f9] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#ff3e1d] shadow-[0_0_0_4px_rgba(255,62,29,0.12)]" />
                      <span className="text-md font-semibold">
                        No Live Visitors
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-sm font-bold text-primary">
                        0
                      </span>
                      <ChevronDown className="h-4 w-4 cursor-default text-muted-foreground opacity-40" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RECENTLY LEFT */}
            <Collapsible
              open={recentlyLeftOpen}
              onOpenChange={(open) => {
                setRecentlyLeftOpen(open);
              }}
            >
              <CollapsibleTrigger className="my-2 w-full shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                <div className="border-b bg-[#f3f3f3] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#ffab00] shadow-[0_0_0_4px_rgba(245,158,11,0.12)]" />
                      <span className="text-md font-semibold">
                        Recently left
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-white px-2 py-1 text-sm font-bold text-primary">
                        {recentVisitors.length}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          recentlyLeftOpen ? "" : "-rotate-90"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="bg-background">
                  {recentVisitors.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No recent visitors
                    </div>
                  ) : (
                    <>
                      {recentVisitors.slice(0, recentShowLimit).map((visitor) => {
                        const lastIndex =
                          visitor.currentPage ?? visitor.journey.length - 1;

                        const lastPage =
                          visitor.journey[lastIndex] ||
                          visitor.journey[visitor.journey.length - 1] ||
                          visitor.journey[0];

                        const { Icon, label, className } = stageMeta(
                          getStageForPage(lastPage as any),
                        );

                        const sessionSeconds =
                          (visitor as any).sessionSeconds ??
                          visitor.duration ??
                          0;

                        const isSelected = selectedVisitorId === visitor.id;

                        return (
                          <div
                            key={visitor.id}
                            className={`cursor-pointer p-1 transition-colors ${
                              isSelected ? "bg-muted/30" : "hover:bg-muted/20"
                            }`}
                            onClick={() => handleSelectVisitor(visitor)}
                          >
                            <div className="flex items-center gap-3 rounded-sm border bg-[#f8f8f8] px-3 py-4">
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarFallback className="border border-border bg-muted">
                                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="block max-w-[260px] truncate text-sm font-medium leading-tight text-foreground">
                                  {lastPage?.title || "(No title)"}
                                </p>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <Badge
                                    variant="secondary"
                                    className="whitespace-nowrap rounded-md border-0 bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                  >
                                    Left Site
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="mr-2 whitespace-nowrap rounded-md border-0 bg-muted px-2 py-1 text-xs font-medium text-foreground hover:bg-muted"
                                  >
                                    Session: {formatSessionTime(sessionSeconds)}
                                  </Badge>
                                </div>

                                {label && (
                                  <div className="mt-1 flex items-center gap-2">
                                    <Icon className={`h-5 w-5 ${className}`} />
                                    <small className="text-muted-foreground">
                                      {label}
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {recentVisitors.length > recentShowLimit && (
                        <div className="flex justify-center p-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setRecentShowLimit((n) => n + LIMIT_STEP)
                            }
                          >
                            Show more (
                            {recentVisitors.length - recentShowLimit})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </ScrollArea>
    </div>
  );

  /* ------------------------------ main layout ------------------------------ */
  const selectedLocation =
    selectedVisitor &&
    [selectedVisitor.city, selectedVisitor.country].filter(Boolean).join(", ");

  const selectedReferrer =
    selectedVisitor &&
    ((selectedVisitor as any).referrer ?? selectedVisitor.ref ?? null);

  return (
    <section id="product" className="bg-muted/30 py-20">
      <div className="container mx-auto px-4">
        {/* Top copy block – mirrors Bootstrap text */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Badge className="mb-3 rounded-full" variant="outline">
            Product
          </Badge>
          <h2 className="mb-2 text-3xl font-bold md:text-4xl">
            <span className="relative z-10 gradient-word-subtitle">
              Simple, Intuitive, Powerful
            </span>
          </h2>
          <p className="mt-2 mb-4 text-lg text-muted-foreground md:text-xl">
            &quot;Customer insights – just like that.&quot;
          </p>
          <p className="text-base text-muted-foreground md:text-lg">
            This is a live simulation of Modovisa’s real-time visitor tracking.
          </p>
          <p className="mb-4 text-base text-muted-foreground md:text-lg">
            Want to track visitors on your website like this?
          </p>
          <div className="mt-2">
            <Link to="/register">
              <Button
                size="lg"
                className="h-11 px-8"
                data-modovisa-event="cta-get-started"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Live visitor tracking simulation */}
        <Card className="rounded-3xl border pb-4 shadow-sm">
          <CardContent className="min-h-[660px] p-3 md:p-6">
            <div className="grid h-full gap-4 md:grid-cols-[340px_minmax(0,1fr)] md:gap-6">
              {/* Sidebar – Visitors */}
              <VisitorSidebar />

              {/* Journey / details panel */}
              <div className="flex flex-col rounded-2xl border bg-card">
                <div className="flex items-center gap-3 px-5 pb-3 pt-5">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-2xl font-bold">Who&apos;s this?</h3>
                </div>
                <div className="grid gap-3 px-5 pb-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                    <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location:</p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedLocation || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Referrer:
                      </p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedReferrer || "Direct / None"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                    <Monitor className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Device:</p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedVisitor?.device || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                    <Globe className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Browser:</p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedVisitor?.browser || "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-2">
                  <h4 className="mb-2 text-lg font-semibold">
                    What pages have they seen?
                  </h4>
                </div>

                {/* Journey timeline – mirrored from live tracking */}
                <div className="px-3 pb-4">
                  <div className="max-h-[720px] overflow-y-auto pr-1">
                    {selectedVisitor && selectedPagesForTimeline.length > 0 ? (
                      <ul className="journey-timeline m-0 list-none p-0">
                        {selectedPagesForTimeline.map((page, idx) => {
                          const meta = stageMeta(
                            getStageForPage(page as any),
                          );
                          const isActive = (page as any).isActive;
                          const timeLabel = formatPageTime(
                            (page as any).timeSpent ?? 0,
                          );

                          return (
                            <li
                              key={`${page.url}-${idx}`}
                              className={`jt-item ${
                                isActive ? "is-active" : "is-left"
                              } m-2 flex items-center rounded-md border p-3 ${
                                isActive ? "bg-card shadow-sm" : "bg-muted/30"
                              }`}
                            >
                              <span className="jt-dot"></span>
                              <div className="flex w-full items-center">
                                <span className="me-4">
                                  <meta.Icon
                                    className={`h-[55px] w-[55px] ${meta.className}`}
                                  />
                                </span>
                                <div className="me-2 min-w-0 flex-1">
                                  <span className="text-base font-medium text-foreground">
                                    {page.title || "(No title)"}
                                  </span>
                                  <small className="mt-2 block text-sm text-muted-foreground">
                                    View this page by clicking on the following
                                    link:
                                  </small>
                                  <small className="mt-2 block">
                                    <a
                                      href={page.url || "#"}
                                      className="break-all text-sm text-[#ff3e1d] hover:underline"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {page.url}
                                    </a>
                                  </small>
                                </div>
                                <div className="ms-auto flex items-center gap-2">
                                  {isActive && (
                                    <Badge className="rounded-full border-0 bg-[#e7f8e9] text-xs font-medium text-[#56ca00] hover:bg-[#e7f8e9]">
                                      Active now
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full border-0 bg-muted px-3 text-xs font-medium text-muted-foreground"
                                  >
                                    {timeLabel}
                                  </Badge>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Users className="h-10 w-10 opacity-60" />
                        <p className="text-sm">No page views yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------------ */
/*                                 PAGE                                */
/* ------------------------------------------------------------------ */

type IntegrationItem = {
  name: string;
  label: string;
  Icon: typeof Globe2;
};

const Index = () => {
  const navigate = useNavigate();

  const [isYearly, setIsYearly] = useState(false);
  const [eventIndex, setEventIndex] = useState(0); // index into SNAP_STEPS
  const [tiers, setTiers] = useState<PublicPricingTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const integrationsCanvasRef = useRef<HTMLCanvasElement>(null);
  const gradientInitialized = useRef(false);

  // Initialize gradient - same behavior as Bootstrap version
  useEffect(() => {
    if (gradientInitialized.current) return;

    const initGradient = () => {
      if (typeof window.Gradient !== "undefined") {
        try {
          // Hero background
          if (canvasRef.current) {
            const heroGradient = new window.Gradient();
            heroGradient.initGradient(".gradient-hero");
          }

          // Integrations background
          if (integrationsCanvasRef.current) {
            const integrationsGradient = new window.Gradient();
            integrationsGradient.initGradient(".gradient-integrations");
          }

          gradientInitialized.current = true;
          console.log("✅ Gradient initialized on homepage (hero + integrations)");
        } catch (error) {
          console.error("❌ Gradient init error:", error);
        }
      } else {
        setTimeout(initGradient, 100);
      }
    };

    initGradient();
  }, []);


  // Probe auth state (token / cookie via /api/me)
  useEffect(() => {
    let cancelled = false;

    async function probeLogin() {
      try {
        const res = await secureFetch("/api/me");
        if (!cancelled) setIsLoggedIn(res.ok);
      } catch {
        if (!cancelled) setIsLoggedIn(false);
      }
    }

    probeLogin();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load pricing tiers from the public-safe endpoint
  useEffect(() => {
    let cancelled = false;

    async function loadTiers() {
      setTiersLoading(true);
      try {
        const res = await fetch(
          `${apiBase()}/api/billing-pricing-tiers?public=1`,
          {
            credentials: "include",
            cache: "no-store",
          },
        );
        if (!res.ok) {
          console.error("[landing] failed to fetch pricing tiers:", res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setTiers(
            data.filter(
              (t: any) => Number(t.monthly_price ?? 0) > 0, // strip free tier
            ),
          );
        }
      } catch (err) {
        console.error("[landing] error fetching pricing tiers:", err);
      } finally {
        if (!cancelled) setTiersLoading(false);
      }
    }

    loadTiers();
    return () => {
      cancelled = true;
    };
  }, []);

  const paidTiers = useMemo<PublicPricingTier[]>(() => {
    const source = tiers.length ? tiers : FALLBACK_PAID_TIERS;
    return source.filter((t) => (t.monthly_price ?? 0) > 0);
  }, [tiers]);

  const selectedEvents = SNAP_STEPS[eventIndex] ?? SNAP_STEPS[0];

  const matchedTier = useMemo<PublicPricingTier | null>(() => {
    if (!paidTiers.length) return null;
    const tier =
      paidTiers.find(
        (t) =>
          typeof t.min_events === "number" &&
          typeof t.max_events === "number" &&
          selectedEvents >= t.min_events &&
          selectedEvents <= t.max_events,
      ) ?? paidTiers[0];
    return tier || null;
  }, [paidTiers, selectedEvents]);

  const effectiveMonthlyPrice = useMemo(() => {
    if (!matchedTier) return 0;
    const base = matchedTier.monthly_price ?? 0;
    return isYearly ? Math.ceil(base * 0.8) : base;
  }, [matchedTier, isYearly]);

  // Pro plan CTA behavior
  const handleProPlanClick = async () => {
    try {
      if (matchedTier && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            INTENT_KEY,
            JSON.stringify({
              tier_id: matchedTier.id,
              interval: isYearly ? "year" : "month",
            }),
          );
          window.localStorage.setItem("mv_new_signup", "1");
        } catch {
          // non-fatal
        }
      }

      let loggedIn = isLoggedIn;

      // If the probe hasn't finished yet, do a fresh check
      if (loggedIn === null) {
        const res = await secureFetch("/api/me");
        loggedIn = res.ok;
        setIsLoggedIn(loggedIn);
      }

      if (!loggedIn) {
        setShowRegisterModal(true);
        return;
      }

      if (typeof window.showGlobalLoadingModal === "function") {
        window.showGlobalLoadingModal("Redirecting to your profile...");
      }
      navigate("/app/user-profile");
    } catch (err) {
      console.error(
        "[landing] Pro CTA click error, opening register modal:",
        err,
      );
      setShowRegisterModal(true);
    }
  };

  // Features list to match screenshot
  const features = [
    {
      icon: Eye,
      title: "Real-time visitor monitoring",
      description:
        "Instantly see who is on your site, where they're from, and what they're doing.",
    },
    {
      icon: Zap,
      title: "Easy to integrate",
      description:
        "Set up in minutes with just a single script — no complex configuration needed.",
    },
    {
      icon: MapPin,
      title: "Detailed Page Journey Mapping",
      description:
        "Understand the full path each visitor takes — from landing to exit or purchase.",
    },
    {
      icon: Feather,
      title: "Lightweight",
      description:
        "At under 5KB, it's over 90% smaller than the Google Analytics script — for blazing-fast performance.",
    },
    {
      icon: BarChart2,
      title: "Visual Dashboards",
      description:
        "Clean, intuitive interfaces that show heatmaps, line charts, and world maps — in real-time.",
    },
    {
      icon: Globe,
      title: "Google Analytics alternative",
      description:
        "Privacy-friendly, real-time insights without the bloat or tracking baggage.",
    },
    {
      icon: Clock,
      title: "Custom Event Tracking",
      description:
        "Monitor cart additions, abandonments, button clicks, form completions, and more.",
    },
    {
      icon: Package,
      title: "Free",
      description:
        "No credit card required. We have a fair free plan suitable for small businesses. All core features available at zero cost.",
    },
    {
      icon: Shield,
      title: "Sales attribution and origin mapping",
      description:
        "Track which campaigns, geos, and sources result in actual purchases.",
    },
  ];

  const eventsLabel = `${selectedEvents.toLocaleString()} events / mo`;
  const isPriceLoaded = !!matchedTier && !tiersLoading;

  const integrations: IntegrationItem[] = [
    { name: "wordpress", label: "WordPress", Icon: Globe2 },
    { name: "shopify", label: "Shopify", Icon: ShoppingBag },
    { name: "bigcommerce", label: "BigCommerce", Icon: Store },
    { name: "webflow", label: "Webflow", Icon: LayoutTemplate },
    { name: "framer", label: "Framer", Icon: Frame },
    { name: "square", label: "Square Online", Icon: Square },
    { name: "gtm", label: "Google Tag Manager", Icon: Tags },
  ];

  return (
    <div className="min-h-screen">
      {/* 1. Hero Section */}
      <section className="relative flex items-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className="gradient-canvas gradient-hero"
          style={{ height: "100%", width: "100%" }}
        />

        <div className="pointer-events-none absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px]" />

        <div className="container relative z-10 mx-auto px-4 pt-6 pb-20">
          <Navbar className="mb-16" />

          <div className="mx-auto max-w-4xl space-y-8 py-20 text-center text-white">
            <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
              Intuitive Analytics
              <br />
              <span className="bg-gradient-to-r from-white to_white/60 bg-clip-text text-transparent">
                for Modern Teams
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-xl text-white/80 md:text-2xl">
              Track visitors, analyze behavior, and grow your business with
              beautiful, actionable insights.
            </p>
            <div className="flex flex-col justify-center gap-4 pt-8 sm:flex-row">
              <Link to="/register">
                <Button
                  size="lg"
                  className="h-14 bg-white px-8 text-lg text-primary hover:bg-white/90"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link to="/app/dashboard">
                <Button
                  size="lg"
                  variant="hero"
                  className="h-14 px-8 text-lg"
                >
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Product / Live Tracking Demo section */}
      <LandingLiveDemo />

      {/* 3. Features Section */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-3 rounded-full" variant="outline">
              Features
            </Badge>
            <h2 className="mb-4 text-4xl font-bold">
              <span className="gradient-word-subtitle">
                Everything you need to know about your visitors in Real-time
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Clean, Clear, Insightful!
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-2xl border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Integrations Section */}
      <section
        id="landingIntegrations"
        className="relative overflow-hidden py-24"
      >
        {/* Animated gradient background (same engine as hero) */}
        <canvas
          ref={integrationsCanvasRef}
          className="gradient-canvas gradient-integrations absolute inset-0 -z-20 h-full w-full"
          aria-hidden="true"
        />
        {/* Subtle grid / softener overlay */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-white/[0.05] bg-[size:60px_60px]" />

        <div className="container relative z-10 mx-auto px-4">
          {/* Text card */}
          <div className="integrations-text-wrapper mx-auto mb-12 max-w-4xl bg-white px-8 py-10 text-center">
            <h2 className="mb-3 text-3xl font-bold md:text-4xl">
              <span className="gradient-word-subtitle">
                Integrate into your existing workflow, with ease
              </span>
            </h2>
            <p className="text-lg text-muted-foreground md:text-xl">
              Compatible. Effortless. Ready to go.
            </p>
          </div>

          {/* Logo scroller – same structure as Bootstrap version, using images */}
          <div
            className="integration-scroller relative mx-auto overflow-hidden rounded-2xl bg-white/90 py-4"
            style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
            }}
          >
            <div className="scroll-track integration-logo flex items-center">
              {/* One full loop of logos */}
              <img
                src="/img/homepage/integrations/intergration-wordpress.webp"
                alt="WordPress Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-shopify.webp"
                alt="Shopify Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-bigcommerce.webp"
                alt="BigCommerce Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-webflow.webp"
                alt="Webflow Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-framer.webp"
                alt="Framer Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-square.webp"
                alt="Square Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-gtm.webp"
                alt="GTM Integration"
                loading="lazy"
              />

              {/* Repeat for seamless loop */}
              <img
                src="/img/homepage/integrations/intergration-wordpress.webp"
                alt="WordPress Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-shopify.webp"
                alt="Shopify Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-bigcommerce.webp"
                alt="BigCommerce Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-webflow.webp"
                alt="Webflow Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-framer.webp"
                alt="Framer Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-square.webp"
                alt="Square Integration"
                loading="lazy"
              />
              <img
                src="/img/homepage/integrations/intergration-gtm.webp"
                alt="GTM Integration"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>



      {/* 5. Pricing Section */}
      <section className="bg-background py-24" id="pricing">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <Badge className="mb-3 rounded-full" variant="outline">
              Pricing Plans
            </Badge>
            <h2 className="mb-2 text-3xl font-bold md:text-4xl">
              <span className="relative z-10 gradient-word-subtitle">
                Tailored pricing plans designed for you
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Start for free — upgrade as your needs grow.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            {/* Free Plan */}
            <div className="rounded-2xl border bg-card p-8 transition-all duration-300 hover:shadow-lg">
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Package className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mb-2 text-3xl font-bold">Free</h3>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">
                    Up to{" "}
                    <span className="font-semibold text-foreground">
                      3,000 events
                    </span>{" "}
                    per month
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Forever data retention</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">All features available</p>
                </div>
              </div>

              <Link to="/register" className="block">
                <Button
                  variant="outline"
                  className="h-12 w-full text-base"
                  size="lg"
                >
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="relative rounded-2xl border-2 border-primary bg-card p-8 transition-all duration-300 hover:shadow-xl">
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Briefcase className="h-10 w-10 text-primary" />
                </div>
                <h3 className="mb-6 text-3xl font-bold">Pro</h3>

                {/* Monthly/Yearly Toggle */}
                <div className="mb-6 flex items-center gap-3">
                  <span
                    className={`text-sm ${
                      !isYearly
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Monthly
                  </span>
                  <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                  <span
                    className={`text-sm ${
                      isYearly
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Yearly
                  </span>
                  <Badge
                    variant={isYearly ? "default" : "secondary"}
                    className="text-xs"
                  >
                    Save 20%
                  </Badge>
                </div>

                {/* Price Slider */}
                <div className="mb-8 w-full">
                  <div className="relative mb-4">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                      <div className="rounded bg-foreground px-3 py-1 text-xs font-medium text-background">
                        {eventsLabel}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-background p-4">
                    <Slider
                      value={[eventIndex]}
                      onValueChange={(value) => {
                        const idx = Array.isArray(value) ? value[0] ?? 0 : 0;
                        setEventIndex(
                          Math.min(Math.max(idx, 0), SNAP_STEPS.length - 1),
                        );
                      }}
                      max={SNAP_STEPS.length - 1}
                      step={1}
                      className="mb-4 w-full"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {eventsLabel.replace(" / mo", "")}{" "}
                        <span className="font-medium">events / mo</span>
                      </span>
                      <span className="flex items-center gap-2 text-lg font-bold">
                        {isPriceLoaded && isYearly && matchedTier ? (
                          <>
                            <span className="mr-1 line-through opacity-60">
                              ${matchedTier.monthly_price}
                            </span>
                            <span>
                              ${effectiveMonthlyPrice}
                              <span className="text-sm font-normal text-muted-foreground">
                                {" "}
                                / mo
                              </span>
                            </span>
                          </>
                        ) : isPriceLoaded ? (
                          <>
                            ${effectiveMonthlyPrice}
                            <span className="text-sm font-normal text-muted-foreground">
                              {" "}
                              / mo
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Contact us
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {isYearly && (
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Billed annually
                    </p>
                  )}
                </div>
              </div>

              <div className="mb-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground">Forever data retention</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground">All features available</p>
                </div>
              </div>

              <Button
                className="h-12 w-full text-base"
                size="lg"
                onClick={handleProPlanClick}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section className="bg-muted/30 py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Badge variant="secondary" className="mb-3">
              FAQ
            </Badge>
            <h2 className="mb-4 text-4xl font-bold">
              <span className="gradient-word-subtitle">
                Frequently asked questions
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Answers to commonly asked questions
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem
                value="item-1"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  What is considered an “event”?
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-6 text-muted-foreground">
                  An event is any tracked action taken by a visitor on your
                  website—such as a page view, button click, form submission,
                  or cart activity. You can define custom events to capture the
                  interactions that matter most to your business.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-2"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  How is this different from Google Analytics?
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-6 text-muted-foreground">
                  Modovisa focuses on clarity and actionability with
                  privacy-first insights, beautiful visualizations, and session
                  replay—without the complexity of traditional analytics tools.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Do I need to install any code to get started?
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-6 text-muted-foreground">
                  Yes, you’ll add a lightweight script to your site. It’s
                  optimized for performance and won’t slow down your pages.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Is there a free plan available?
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-6 text-muted-foreground">
                  Absolutely. Our free plan includes generous limits so you can
                  explore the product and get value before upgrading.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-5"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Will using this tool affect my website&apos;s load time?
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-6 text-muted-foreground">
                  No—our script is tiny, loads asynchronously, and is designed
                  to have negligible impact on performance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-6"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Can I track custom events like form submissions or product
                  clicks?
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-6 text-muted-foreground">
                  Yes, you can define and track custom events to measure the
                  interactions that matter most to your business.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      <SiteFooter />

      <RegisterModal
        open={showRegisterModal}
        onOpenChange={setShowRegisterModal}
      />
    </div>
  );
};

export default Index;
