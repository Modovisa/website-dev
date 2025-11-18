// src/pages/Index.tsx

import { Link, useNavigate } from "react-router-dom";
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
  ShoppingCart,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { useState, useEffect, useRef, useMemo } from "react";
import { secureFetch } from "@/lib/auth/auth";
import { apiBase } from "@/lib/api";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// TypeScript declaration for Gradient + Bootstrap
declare global {
  interface Window {
    Gradient: any;
    bootstrap?: any;
    showGlobalLoadingModal?: (msg?: string) => void;
    hideGlobalLoadingModal?: () => void;
  }
}

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
// Only used as a safety net; real environments should rely on the API.
// IMPORTANT: These IDs now mirror the real D1 table (start at 2).
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
/*                        LANDING LIVE DEMO TYPES                      */
/* ------------------------------------------------------------------ */

type DemoStage = "cart" | "checkout" | "thank_you" | "view";

interface DemoPage {
  title: string;
  url: string;
  stage?: DemoStage;
}

interface DemoVisitor {
  id: string;
  isNew: boolean;
  location: string; // "Tokyo, Japan"
  referrer: string; // "Google / Organic"
  device: string;
  browser: string;
  pages: DemoPage[];
  currentPageIndex: number;
  sessionSeconds: number;
  perPageSeconds: number[];
  pageDurationTargets: number[];
  active: boolean;
  leftAt?: number;
}

/* ------------------------------------------------------------------ */
/*                        LANDING LIVE DEMO DATA                       */
/* ------------------------------------------------------------------ */

const DEMO_LOCATIONS = [
  "Tokyo, Japan",
  "London, United Kingdom",
  "Sydney, Australia",
  "Berlin, Germany",
  "New York, United States",
  "Mumbai, India",
  "Toronto, Canada",
];

const DEMO_REFERRERS = [
  "Google / Organic",
  "Meta Ads",
  "Direct / None",
  "Newsletter",
  "Affiliate Blog",
  "Instagram",
];

const DEMO_DEVICES = ["Desktop", "Mobile", "Tablet"];

const DEMO_BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"];

const DEMO_JOURNEYS: DemoPage[][] = [
  [
    {
      title: "Home",
      url: "https://demomoda.com/",
      stage: "view",
    },
    {
      title: "Summer Dresses Collection",
      url: "https://demomoda.com/collections/summer-dresses",
      stage: "view",
    },
    {
      title: "Linen Wrap Dress",
      url: "https://demomoda.com/products/linen-wrap-dress",
      stage: "cart",
    },
    {
      title: "Cart",
      url: "https://demomoda.com/cart",
      stage: "cart",
    },
    {
      title: "Checkout",
      url: "https://demomoda.com/checkout",
      stage: "checkout",
    },
    {
      title: "Order Received",
      url: "https://demomoda.com/order-received/10493",
      stage: "thank_you",
    },
  ],
  [
    {
      title: "Home",
      url: "https://demomoda.com/",
      stage: "view",
    },
    {
      title: "Mens Sneakers",
      url: "https://demomoda.com/collections/mens-sneakers",
      stage: "view",
    },
    {
      title: "AirFlex Runner",
      url: "https://demomoda.com/products/airflex-runner",
      stage: "cart",
    },
    {
      title: "Cart",
      url: "https://demomoda.com/cart",
      stage: "cart",
    },
    {
      title: "Checkout",
      url: "https://demomoda.com/checkout",
      stage: "checkout",
    },
  ],
  [
    {
      title: "Landing Page",
      url: "https://demomoda.com/",
      stage: "view",
    },
    {
      title: "New Arrivals",
      url: "https://demomoda.com/collections/new-arrivals",
      stage: "view",
    },
    {
      title: "Silk Shirt",
      url: "https://demomoda.com/products/silk-shirt",
      stage: "cart",
    },
    {
      title: "Checkout",
      url: "https://demomoda.com/checkout",
      stage: "checkout",
    },
    {
      title: "Order Completed",
      url: "https://demomoda.com/order-received/10501",
      stage: "thank_you",
    },
  ],
  [
    {
      title: "Home",
      url: "https://demomoda.com/",
      stage: "view",
    },
    {
      title: "Accessories",
      url: "https://demomoda.com/collections/accessories",
      stage: "view",
    },
    {
      title: "Leather Tote Bag",
      url: "https://demomoda.com/products/leather-tote-bag",
      stage: "cart",
    },
    {
      title: "Cart",
      url: "https://demomoda.com/cart",
      stage: "cart",
    },
  ],
];

const randomFrom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

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

const demoStageMeta = (stage?: DemoStage) => {
  if (stage === "cart") {
    return {
      icon: ShoppingCart,
      label: "Product added to cart",
      colorClass: "text-[#56ca00]",
    };
  }
  if (stage === "checkout") {
    return {
      icon: CreditCard,
      label: "Visitor started checkout",
      colorClass: "text-[#56ca00]",
    };
  }
  if (stage === "thank_you") {
    return {
      icon: CheckCircle2,
      label: "Order completed",
      colorClass: "text-[#56ca00]",
    };
  }
  return {
    icon: Monitor,
    label: null,
    colorClass: "text-[#ffab00]",
  };
};

const createDemoVisitor = (idNum: number): DemoVisitor => {
  const journey = randomFrom(DEMO_JOURNEYS);
  const pageDurationTargets = journey.map(() => randInt(8, 18));
  return {
    id: `demo-${idNum}-${Date.now()}`,
    isNew: Math.random() < 0.6,
    location: randomFrom(DEMO_LOCATIONS),
    referrer: randomFrom(DEMO_REFERRERS),
    device: randomFrom(DEMO_DEVICES),
    browser: randomFrom(DEMO_BROWSERS),
    pages: journey,
    currentPageIndex: 0,
    sessionSeconds: 0,
    perPageSeconds: new Array(journey.length).fill(0),
    pageDurationTargets,
    active: true,
    leftAt: undefined,
  };
};

/* ------------------------------------------------------------------ */
/*                       LANDING LIVE DEMO COMPONENT                   */
/* ------------------------------------------------------------------ */

const LandingLiveDemo = () => {
  const [visitors, setVisitors] = useState<DemoVisitor[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const idCounterRef = useRef<number>(1);

  // initialise demo visitors
  useEffect(() => {
    const initial: DemoVisitor[] = [];
    for (let i = 0; i < 4; i++) {
      initial.push(createDemoVisitor(idCounterRef.current++));
    }
    setVisitors(initial);
    if (initial[0]) setSelectedId(initial[0].id);
  }, []);

  // ticking simulation
  useEffect(() => {
    const TICK_MS = 3_000;
    const RECENT_TTL_MS = 45_000;

    const interval = setInterval(() => {
      setVisitors((prev) => {
        const now = Date.now();
        let next = prev.map((v) => {
          // recycle old "recent" visitors
          if (!v.active) {
            if (v.leftAt && now - v.leftAt > RECENT_TTL_MS) {
              return createDemoVisitor(idCounterRef.current++);
            }
            return v;
          }

          const delta = 3; // seconds per tick
          const sessionSeconds = v.sessionSeconds + delta;
          const perPageSeconds = [...v.perPageSeconds];
          let currentPageIndex = v.currentPageIndex;
          let active = v.active;
          let leftAt = v.leftAt;

          perPageSeconds[currentPageIndex] =
            (perPageSeconds[currentPageIndex] ?? 0) + delta;

          const target = v.pageDurationTargets[currentPageIndex] ?? 10;

          // advance page or mark left
          if (perPageSeconds[currentPageIndex] >= target) {
            const isLastPage = currentPageIndex >= v.pages.length - 1;
            if (!isLastPage) {
              currentPageIndex += 1;
            } else {
              let active = true;
              leftAt = now;
            }
          }

          return {
            ...v,
            sessionSeconds,
            perPageSeconds,
            currentPageIndex,
            active,
            leftAt,
          };
        });

        // keep at least 4 active visitors
        const activeCount = next.filter((v) => v.active).length;
        for (let i = 0; i < Math.max(0, 4 - activeCount); i++) {
          next.push(createDemoVisitor(idCounterRef.current++));
        }

        // cap total list length
        if (next.length > 8) {
          next = next.slice(next.length - 8);
        }

        return next;
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, []);

  const activeVisitors = visitors.filter((v) => v.active);
  const recentVisitors = visitors.filter((v) => !v.active);

  const selectedVisitor =
    (selectedId && visitors.find((v) => v.id === selectedId)) ||
    activeVisitors[0] ||
    recentVisitors[0] ||
    null;

  const selectedPagesForTimeline = selectedVisitor
    ? selectedVisitor.pages
        .slice(0, selectedVisitor.currentPageIndex + 1)
        .map((p, idx) => ({
          ...p,
          isActive: idx === selectedVisitor.currentPageIndex && selectedVisitor.active,
          timeSpent: selectedVisitor.perPageSeconds[idx] ?? 0,
        }))
        .reverse()
    : [];

  return (
    <section id="landingProduct" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Top copy block – mirrors Bootstrap text */}
        <div className="flex flex-col items-center text-center mb-10">
          <Badge className="rounded-full mb-3" variant="outline">
            Product
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">
            <span className="relative z-10 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Simple, Intuitive, Powerful
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground mt-2 mb-4">
            &quot;Customer insights – just like that.&quot;
          </p>
          <p className="text-base md:text-lg text-muted-foreground">
            This is a live simulation of Modovisa’s real-time visitor tracking.
          </p>
          <p className="text-base md:text-lg text-muted-foreground mb-4">
            Want to track visitors on your website like this?
          </p>
          <div className="mt-2">
            <Link to="/register">
              <Button
                size="lg"
                className="px-8 h-11"
                data-modovisa-event="cta-get-started"
              >
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Live visitor tracking simulation */}
        <Card className="rounded-3xl shadow-sm border pb-4">
          <CardContent className="p-3 md:p-6">
            <div className="grid gap-4 md:gap-6 md:grid-cols-[340px_minmax(0,1fr)]">
              {/* Sidebar – Visitors */}
              <div className="border rounded-2xl bg-card flex flex-col">
                <div className="px-6 pt-6 pb-4 flex flex-col items-center gap-2">
                  <h3 className="text-xl font-bold">Visitors</h3>
                  <div className="w-full">
                    <div className="bg-[#dff7fb] text-[#055160] rounded-full px-4 py-1 text-center text-sm font-medium">
                      demomoda.com
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-3">
                  {/* Live Visitors header */}
                  <div className="shadow-[0_2px_4px_rgba(0,0,0,0.06)] rounded-xl overflow-hidden mb-3">
                    <div className="p-3 border-b bg-[#f9f9f9] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#71dd37] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                        <span className="text-sm font-semibold">Live Visitors</span>
                      </div>
                      <span className="text-xs font-bold text-primary bg-white rounded-full px-2 py-1">
                        {activeVisitors.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-3 pb-2 flex-1 overflow-hidden">
                  <div className="h-[260px] overflow-y-auto pr-1 space-y-2">
                    {activeVisitors.length === 0 && recentVisitors.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                        <Users className="h-10 w-10 opacity-60" />
                        <p className="text-sm">
                          No visitors yet. Waiting for traffic to arrive...
                        </p>
                      </div>
                    ) : (
                      <>
                        {activeVisitors.map((v) => {
                          const currentPage = v.pages[v.currentPageIndex];
                          const meta = demoStageMeta(currentPage?.stage);
                          const Icon = meta.icon;

                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedId(v.id)}
                              className={`w-full text-left rounded-xl border shadow-sm px-3 py-3 mb-1 transition-colors ${
                                selectedId === v.id
                                  ? "bg-muted/40 border-primary/40"
                                  : "bg-white hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback className="bg-[#71dd37]/10 border border-[#71dd37]">
                                    <UserIcon className="h-4 w-4 text-[#71dd37]" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p className="text-sm font-medium leading-tight truncate">
                                    {currentPage?.title || "(No title)"}
                                  </p>
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <Badge
                                      className={`text-[11px] font-medium border-0 rounded-md px-2 py-0.5 ${
                                        v.isNew
                                          ? "bg-[#e7f8e9] text-[#56ca00]"
                                          : "bg-[#eae8fd] text-[#7367f0]"
                                      }`}
                                    >
                                      {v.isNew ? "New Visitor" : "Returning Visitor"}
                                    </Badge>
                                    <Badge
                                      variant="secondary"
                                      className="text-[11px] bg-muted text-foreground border-0 rounded-md px-2 py-0.5"
                                    >
                                      Session: {formatSessionTime(v.sessionSeconds)}
                                    </Badge>
                                  </div>

                                  {meta.label && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Icon className={`h-4 w-4 ${meta.colorClass}`} />
                                      <small className="text-[11px] text-muted-foreground">
                                        {meta.label}
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {/* Recently left header */}
                        <div className="mt-3 shadow-[0_2px_4px_rgba(0,0,0,0.04)] rounded-xl overflow-hidden">
                          <div className="p-3 border-b bg-[#f3f3f3] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full bg-[#ffab00] shadow-[0_0_0_4px_rgba(245,158,11,0.12)]" />
                              <span className="text-sm font-semibold">Recently left</span>
                            </div>
                            <span className="text-xs font-bold text-primary bg-white rounded-full px-2 py-1">
                              {recentVisitors.length}
                            </span>
                          </div>
                        </div>

                        {recentVisitors.map((v) => {
                          const lastPage = v.pages[v.currentPageIndex] || v.pages[v.pages.length - 1];
                          const meta = demoStageMeta(lastPage?.stage);
                          const Icon = meta.icon;

                          return (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedId(v.id)}
                              className={`w-full text-left rounded-xl border shadow-sm px-3 py-3 mt-1 transition-colors ${
                                selectedId === v.id
                                  ? "bg-muted/40 border-primary/40"
                                  : "bg-[#f8f8f8] hover:bg-muted/30"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarFallback className="bg-muted border border-border">
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p className="text-sm font-medium leading-tight truncate">
                                    {lastPage?.title || "(No title)"}
                                  </p>
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <Badge
                                      variant="secondary"
                                      className="text-[11px] bg-muted text-foreground border-0 rounded-md px-2 py-0.5"
                                    >
                                      Left Site
                                    </Badge>
                                    <Badge
                                      variant="secondary"
                                      className="text-[11px] bg-muted text-foreground border-0 rounded-md px-2 py-0.5"
                                    >
                                      Session: {formatSessionTime(v.sessionSeconds)}
                                    </Badge>
                                  </div>
                                  {meta.label && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Icon className={`h-4 w-4 ${meta.colorClass}`} />
                                      <small className="text-[11px] text-muted-foreground">
                                        {meta.label}
                                      </small>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Journey / details */}
              <div className="rounded-2xl border bg-card flex flex-col">
                <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-muted">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-2xl font-bold">Who&apos;s this?</h3>
                </div>
                <div className="px-5 pb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="flex items-center gap-3 bg-background rounded-lg border p-3">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location:</p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedVisitor?.location || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background rounded-lg border p-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Referrer:</p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedVisitor?.referrer || "Direct"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background rounded-lg border p-3">
                    <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Device:</p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedVisitor?.device || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-background rounded-lg border p-3">
                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Browser:</p>
                      <p className="text-xs font-medium text-[#ff3e1d]">
                        {selectedVisitor?.browser || "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-2">
                  <h4 className="text-lg font-semibold mb-2">
                    What pages have they seen?
                  </h4>
                </div>

                <div className="px-3 pb-4 flex-1 overflow-hidden">
                  <div className="h-[260px] overflow-y-auto pr-1">
                    {selectedVisitor && selectedPagesForTimeline.length > 0 ? (
                      <ul className="list-none p-0 m-0">
                        {selectedPagesForTimeline.map((page, idx) => {
                          const meta = demoStageMeta(page.stage);
                          const Icon = meta.icon;
                          return (
                            <li
                              key={`${page.url}-${idx}`}
                              className={`relative flex items-center m-2 rounded-xl border p-3 bg-card ${
                                page.isActive ? "shadow-sm border-primary/50" : "bg-muted/40"
                              }`}
                            >
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-[2px] bg-muted rounded-full" />
                              <div className="flex items-center w-full pl-4">
                                <span className="mr-4 hidden sm:inline-block">
                                  <Icon
                                    className={`h-[42px] w-[42px] ${meta.colorClass}`}
                                  />
                                </span>
                                <div className="flex-1 min-w-0 mr-2">
                                  <span className="font-medium text-sm text-foreground">
                                    {page.title || "(No title)"}
                                  </span>
                                  <small className="text-xs text-muted-foreground block mt-1">
                                    View this page by clicking on the following link:
                                  </small>
                                  <small className="block mt-1">
                                    <a
                                      href={page.url || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-[#ff3e1d] hover:underline break-all"
                                    >
                                      {page.url}
                                    </a>
                                  </small>
                                </div>
                                <div className="ml-auto flex flex-col items-end gap-1">
                                  {page.isActive && (
                                    <Badge className="text-[11px] bg-[#e7f8e9] text-[#56ca00] hover:bg-[#e7f8e9] font-medium border-0 rounded-full">
                                      Active now
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="secondary"
                                    className="text-[11px] bg-muted text-muted-foreground font-medium border-0 rounded-full px-3"
                                  >
                                    {formatPageTime(page.timeSpent)}
                                  </Badge>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
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

const Index = () => {
  const navigate = useNavigate();

  const [isYearly, setIsYearly] = useState(false);
  const [eventIndex, setEventIndex] = useState(0); // index into SNAP_STEPS
  const [tiers, setTiers] = useState<PublicPricingTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientInitialized = useRef(false);

  // Initialize gradient - same behavior as Bootstrap version
  useEffect(() => {
    if (gradientInitialized.current) return;

    const initGradient = () => {
      if (typeof window.Gradient !== "undefined" && canvasRef.current) {
        try {
          const gradient = new window.Gradient();
          gradient.initGradient(".gradient-canvas");
          gradientInitialized.current = true;
          console.log("✅ Gradient initialized");
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
        // ⚠️ DO NOT use secureFetch here - this endpoint is public
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

  // 🔑 Pro plan CTA behavior:
  // - If NOT logged in → open React RegisterModal
  // - If logged in → redirect to /app/user-profile with loading modal
  // NOTE: Only this click writes intent_upgrade + mv_new_signup for checkout.
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
        // 👉 Open React register modal instead of navigating
        setShowRegisterModal(true);
        return;
      }

      // Logged in: send them to the profile page (like Bootstrap version)
      if (typeof window.showGlobalLoadingModal === "function") {
        window.showGlobalLoadingModal("Redirecting to your profile...");
      }
      navigate("/app/user-profile");
    } catch (err) {
      console.error("[landing] Pro CTA click error, opening register modal:", err);
      setShowRegisterModal(true);
    }
  };

  const features = [
    {
      icon: Eye,
      title: "Real-Time Tracking",
      description:
        "Watch visitors navigate your site in real-time with detailed session recordings.",
    },
    {
      icon: BarChart2,
      title: "Advanced Analytics",
      description: "Deep insights into user behavior, conversions, and funnel analysis.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Lightweight script that won't slow down your website performance.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "GDPR compliant with respect for user privacy and data protection.",
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description:
        "Track visitors from anywhere in the world with accurate geolocation.",
    },
    {
      icon: Clock,
      title: "Session Replay",
      description:
        "Replay user sessions to understand exactly how visitors interact.",
    },
  ];

  const eventsLabel = `${selectedEvents.toLocaleString()} events / mo`;

  const isPriceLoaded = !!matchedTier && !tiersLoading;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden flex items-center">
        {/* Canvas directly in section - just like Bootstrap */}
        <canvas
          ref={canvasRef}
          className="gradient-canvas"
          style={{ height: "100%", width: "100%" }}
        />

        {/* Optional grid overlay for texture */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px] pointer-events-none" />

        {/* Content container - positioned above the canvas */}
        <div className="container relative mx-auto px-4 pt-6 pb-20 z-10">
          {/* Navbar Component */}
          <Navbar className="mb-16" />

          <div className="max-w-4xl mx-auto text-center text-white space-y-8 py-20">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Intuitive Analytics
              <br />
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                for Modern Teams
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto">
              Track visitors, analyze behavior, and grow your business with beautiful,
              actionable insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              {/* Hero CTA: simple link to /register (Free path – no intent set) */}
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 h-14 px-8 text-lg"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link to="/app/dashboard">
                <Button size="lg" variant="hero" className="h-14 px-8 text-lg">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 🔴 NEW: Product / Live Tracking Demo section (mirrors Bootstrap) */}
      <LandingLiveDemo />

      {/* Pricing Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tailored pricing plans designed for you
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start for free — upgrade as your needs grow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col items-center mb-8">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Package className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-2">Free</h3>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
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
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">Forever data retention</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <p className="text-muted-foreground">All features available</p>
                </div>
              </div>

              {/* Free plan Get Started → /register (no intent set) */}
              <Link to="/register" className="block">
                <Button
                  variant="outline"
                  className="w-full h-12 text-base"
                  size="lg"
                >
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl border-2 border-primary bg-card hover:shadow-xl transition-all duration-300 relative">
              <div className="flex flex-col items-center mb-8">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Briefcase className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-6">Pro</h3>

                {/* Monthly/Yearly Toggle */}
                <div className="flex items-center gap-3 mb-6">
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
                      <div className="bg-foreground text-background px-3 py-1 rounded text-xs font-medium whitespace-nowrap">
                        {eventsLabel}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-background">
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
                      className="w-full mb-4"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        {eventsLabel.replace(" / mo", "")}{" "}
                        <span className="font-medium">events / mo</span>
                      </span>
                      <span className="text-lg font-bold flex items-center gap-2">
                        {isPriceLoaded && isYearly && matchedTier ? (
                          <>
                            <span className="mr-1 line-through opacity-60">
                              ${matchedTier.monthly_price}
                            </span>
                            <span>
                              ${effectiveMonthlyPrice}
                              <span className="text-sm text-muted-foreground font-normal">
                                {" "}
                                / mo
                              </span>
                            </span>
                          </>
                        ) : isPriceLoaded ? (
                          <>
                            ${effectiveMonthlyPrice}
                            <span className="text-sm text-muted-foreground font-normal">
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
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      Billed annually
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground">Forever data retention</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground">All features available</p>
                </div>
              </div>

              {/* 🔥 Only this button drives paid checkout intent */}
              <Button
                className="w-full h-12 text-base"
                size="lg"
                onClick={handleProPlanClick}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section – moved below Pricing */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything you need to grow
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for teams who want to understand their users
              better.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-primary relative overflow-hidden">
        {/* Optional grid overlay for texture */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px] pointer-events-none" />

        {/* Content - positioned above the canvas */}
        <div className="container relative mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using Modovisa to understand their users
            better.
          </p>
          {/* Bottom CTA: still goes straight to /register (Free path) */}
          <Link to="/register">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 h-14 px-8 text-lg"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Badge variant="secondary" className="mb-3">
              FAQ
            </Badge>
            <h2 id="faq-heading" className="text-4xl md:text-5xl font-bold mb-3">
              Frequently asked questions
            </h2>
            <p className="text-muted-foreground text-lg">
              Answers to commonly asked questions
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-3">
              <AccordionItem
                value="item-1"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  What is considered an “event”?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  An event is any tracked action taken by a visitor on your
                  website—such as a page view, button click, form submission, or
                  cart activity. You can define custom events to capture the
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
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Modovisa focuses on clarity and actionability with privacy-first
                  insights, beautiful visualizations, and session replay—without the
                  complexity of traditional analytics tools.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-3"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Do I need to install any code to get started?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Yes, you’ll add a lightweight script to your site. It’s optimized for
                  performance and won’t slow down your pages.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-4"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Is there a free plan available?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Absolutely. Our free plan includes generous limits so you can explore
                  the product and get value before upgrading.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-5"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Will using this tool affect my website&apos;s load time?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  No—our script is tiny, loads asynchronously, and is designed to have
                  negligible impact on performance.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="item-6"
                className="rounded-2xl border bg-card px-6"
              >
                <AccordionTrigger className="py-5 text-left">
                  Can I track custom events like form submissions or product clicks?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-0 pb-6">
                  Yes, you can define and track custom events to measure the
                  interactions that matter most to your business.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter />

      {/* 🔐 React Register Modal, reusing the Register page UI */}
      <RegisterModal
        open={showRegisterModal}
        onOpenChange={setShowRegisterModal}
      />
    </div>
  );
};

export default Index;
