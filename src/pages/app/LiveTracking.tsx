// src/pages/app/LiveTracking.tsx

import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Globe,
  ExternalLink,
  User,
  Menu,
  ChevronDown,
  Monitor,
  Users,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { secureFetch } from "@/lib/auth/auth";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ----------------------------- constants ----------------------------- */
const ACTIVE_MAX_AGE_MS = 8 * 60 * 1000; // 8 minutes
const RECENT_MAX_AGE_MS = 20 * 60 * 1000; // 20 minutes
const REBUCKET_EVERY_MS = 30_000; // 30 seconds
const WS_PING_INTERVAL = 25_000; // 25 seconds

// Bootstrap-like list cap
const INITIAL_ACTIVE_LIMIT = 15;
const LIMIT_STEP = 15;

/* -------------------------------- types ------------------------------ */
interface Page {
  title: string;
  url: string;
  timestamp: string;
  time_spent: string;
  is_active?: boolean;
  stage?: string | null;
}

interface Visitor {
  id: string;
  title: string;
  session_time: string;
  is_new_visitor: boolean;
  status: "active" | "left" | "inactive";
  location: string;
  attribution_source: string;
  device: string;
  browser: string;
  pages: Page[];
  last_seen: string;
  last_activity: string;
}

interface Website {
  id: string | number;
  website_name: string;
  domain: string;
}

type UserStatus = "active" | "suspended" | "blocked" | "limit_reached" | "unknown";

/* ------------------------- array helper ------------------------- */
const getLastPage = (pages?: Page[]) =>
  pages && pages.length > 0 ? pages[pages.length - 1] : undefined;

/* --------------------------- small components ------------------------ */

const SidebarLoadingSkeleton = () => (
  <div className="px-6 pb-6">
    <div className="space-y-3">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-8 w-full" />
    </div>
    <div className="mt-6 space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="mt-6 space-y-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

const InlineNoVisitors = () => (
  <div className="text-center py-12">
    <Users className="h-16 w-16 text-muted-foreground/70 mx-auto mb-4" />
    <p className="text-base text-muted-foreground">
      No visitors yet. Waiting for traffic to arrive...
    </p>
  </div>
);

/* ------------------------------ SVG icons ---------------------------- */

const IconWindow = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M4 21h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2m0-2V7h16l.001 12z"
    />
  </svg>
);

const IconAddToCart = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
    <circle cx="10.5" cy="19.5" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="19.5" r="1.5" fill="currentColor" />
    <path fill="currentColor" d="M13 13h2v-2.99h2.99v-2H15V5.03h-2v2.98h-2.99v2H13z" />
    <path
      fill="currentColor"
      d="M10 17h8a1 1 0 0 0 .93-.64L21.76 9h-2.14l-2.31 6h-6.64L6.18 4.23A2 2 0 0 0 4.33 3H2v2h2.33l4.75 11.38A1 1 0 0 0 10 17"
    />
  </svg>
);

const IconCheckout = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
    <path
      fill="currentColor"
      d="M21.822 7.431A1 1 0 0 0 21 7H7.333L6.179 4.23A1.99 1.99 0 0 0 4.333 3H2v2h2.333l4.744 11.385A1 1 0 0 0 10 17h8c.417 0 .79-.259.937-.648l3-8a1 1 0 0 0-.115-.921M17.307 15h-6.64l-2.5-6h11.39z"
    />
    <circle cx="10.5" cy="19.5" r="1.5" fill="currentColor" />
    <circle cx="17.5" cy="19.5" r="1.5" fill="currentColor" />
  </svg>
);

const IconThankYou = ({ className = "h-5 w-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
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

/* Helpers for stage ➜ icon + label */
const stageMeta = (stage?: string | null) => {
  if (stage === "cart")
    return { Icon: IconAddToCart, label: "Product added to cart", className: "text-[#56ca00]" };
  if (stage === "checkout")
    return { Icon: IconCheckout, label: "Visitor started checkout", className: "text-[#56ca00]" };
  if (stage === "thank_you")
    return { Icon: IconThankYou, label: "Order completed", className: "text-[#56ca00]" };
  return { Icon: IconWindow, label: null, className: "text-[#ffab00]" }; // page view = orange
};

/* -------------------------------- page -------------------------------- */

const LiveTracking = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthGuard();

  // state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveVisitorsOpen, setLiveVisitorsOpen] = useState(true);
  const [recentlyLeftOpen, setRecentlyLeftOpen] = useState(false);

  // user intent flags (prevents effects from fighting your toggles)
  const [userToggledLive, setUserToggledLive] = useState(false);
  const [userToggledRecent, setUserToggledRecent] = useState(false);

  // "show more" caps
  const [activeShowLimit, setActiveShowLimit] = useState(INITIAL_ACTIVE_LIMIT);
  const [recentShowLimit, setRecentShowLimit] = useState(INITIAL_ACTIVE_LIMIT);

  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [visitorDataMap, setVisitorDataMap] = useState<Record<string, Visitor>>({});
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);

  // full user status + reason (mirrors Bootstrap showStatusBadge)
  const [userStatus, setUserStatus] = useState<UserStatus>("unknown");
  const [statusReason, setStatusReason] = useState<"limit" | "admin" | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const isSuspended = userStatus === "suspended";

  // refs
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rebucketTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // site isolation refs (avoid bleed-through)
  const currentSiteIdRef = useRef<string | number | null>(null);
  const siteEpochRef = useRef(0); // bump on site switch; ignore stale async

  /* ------------------------------ helpers ----------------------------- */
  const safeURL = (raw: string) => {
    try {
      const u = new URL(String(raw));
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch {}
    return "#";
  };

  const getLastTimestamp = (visitor: Visitor) => {
    const lastPage = getLastPage(visitor.pages);
    const ts = lastPage?.timestamp || visitor.last_activity || 0;
    return new Date(ts).getTime();
  };

  const getBucketFor = (now: number, visitor: Visitor) => {
    const age = now - getLastTimestamp(visitor);
    if (age <= ACTIVE_MAX_AGE_MS) return "active";
    if (age <= RECENT_MAX_AGE_MS) return "recent";
    return "expired";
  };

  /* -------------------------- status banner --------------------------- */
  const renderStatusBanner = () => {
    if (userStatus === "blocked") {
      return (
        <div className="mx-6 mb-4">
          <div className="bg-red-50 border border-red-300 text-red-900 px-4 py-3 rounded">
            <p className="font-semibold text-sm mb-1">Account Blocked</p>
            <p className="text-sm">Your account has been permanently blocked.</p>
          </div>
        </div>
      );
    }

    if (userStatus === "suspended") {
      let message = "Live tracking is currently suspended.";

      if (statusReason === "admin") {
        message = "Live tracking has been manually suspended by an administrator.";
      } else if (statusReason === "limit") {
        message = "You've reached your monthly event limit. Upgrade to resume tracking.";
      }

      return (
        <div className="mx-6 mb-4">
          <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-3 rounded">
            <p className="font-semibold text-sm mb-1">Live Tracking Suspended</p>
            <p className="text-sm">{message}</p>
          </div>
        </div>
      );
    }

    if (userStatus === "limit_reached") {
      // kept for parity with Bootstrap, in case you re-use it later
      return (
        <div className="mx-6 mb-4">
          <div className="bg-sky-50 border border-sky-300 text-sky-900 px-4 py-3 rounded">
            <p className="font-semibold text-sm mb-1">Free Plan Limit Reached</p>
            <p className="text-sm">
              You've reached 3,000 events this month. Upgrade to resume live tracking.
            </p>
          </div>
        </div>
      );
    }

    return null;
  };

  /* ---------------------------- websocket ----------------------------- */
  const setupWebSocket = useCallback(async () => {
    if (!currentWebsite) return;

    // bump epoch for this connection
    const myEpoch = ++siteEpochRef.current;
    currentSiteIdRef.current = currentWebsite.id;

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
    }
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

    try {
      const tRes = await secureFetch("https://api.modovisa.com/api/ws-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: currentWebsite.id }),
      });
      if (!tRes.ok) return;

      const { ticket } = await tRes.json();
      const ws = new WebSocket(
        `wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`
      );
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, WS_PING_INTERVAL);
      });

      ws.addEventListener("message", async (event) => {
        if (myEpoch !== siteEpochRef.current) return; // stale connection
        const data = JSON.parse(event.data || "{}");
        if (data.type === "pong") return;

        if (data.type === "new_event") {
          const payload = data.payload || {};
          // hard-guard by current site id
          if (String(payload.site_id) !== String(currentSiteIdRef.current)) return;
          if (isSuspended) return;

          try {
            const res = await secureFetch(
              `https://api.modovisa.com/api/visitor/${payload.visitor_id}?session_id=${payload.session_id}&site_id=${payload.site_id}`,
              { method: "GET" }
            );
            if (!res.ok) return;
            if (myEpoch !== siteEpochRef.current) return; // site switched mid-flight

            const visitor: Visitor = await res.json();

            // normalize activeness + is_active flag
            const latestPage = getLastPage(visitor.pages);
            const latestTime = new Date(
              latestPage?.timestamp || visitor.last_seen || 0
            ).getTime();
            const isActiveNow = Date.now() - latestTime <= ACTIVE_MAX_AGE_MS;

            visitor.status = isActiveNow ? "active" : "left";
            if (Array.isArray(visitor.pages) && visitor.pages.length) {
              const lastIndex = visitor.pages.length - 1;
              visitor.pages.forEach((p: Page, i: number) => {
                p.is_active = i === lastIndex && isActiveNow;
              });
            }

            setVisitorDataMap((prev) => ({ ...prev, [visitor.id]: visitor }));

            // only auto-select if NOTHING is selected
            if (!selectedVisitorId && isActiveNow) {
              setSelectedVisitorId(visitor.id);
            }
          } catch (e) {
            console.error("❌ Failed to process live visitor", e);
          }
        }

        if (data.type === "user_status") {
          // DO + backend both send { type, site_id, payload: { status, reason } }
          const payload = (data.payload || data) as {
            status?: string;
            reason?: string | null;
          };

          const status = (payload.status || "active") as UserStatus;
          const reason =
            payload.reason === "limit" || payload.reason === "admin"
              ? (payload.reason as "limit" | "admin")
              : null;

          setUserStatus(status);
          setStatusReason(status === "suspended" ? reason : null);

          if (status === "blocked") {
            navigate("/login", { replace: true });
          }
        }
      });

      ws.addEventListener("close", () => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // auto-reconnect only if still the same epoch/site
        setTimeout(() => {
          if (myEpoch === siteEpochRef.current) setupWebSocket();
        }, 5000);
      });

      ws.addEventListener("error", () => {});
    } catch (err) {
      console.error("❌ Failed to setup WebSocket", err);
    }
  }, [currentWebsite, isSuspended, selectedVisitorId, navigate]);

  /* -------------------------- initial/refresh -------------------------- */
  const refreshVisitorList = useCallback(async () => {
    if (!currentWebsite) return;
    const myEpoch = siteEpochRef.current;

    try {
      const res = await secureFetch("https://api.modovisa.com/api/live-visitor-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: currentWebsite.id }),
      });

      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }

      const visitors = await res.json();

      if (res.status === 403) {
        const errorText = (visitors?.error || "").toLowerCase();
        const reasonRaw = visitors?.reason as string | undefined;
        const reason =
          reasonRaw === "limit" || reasonRaw === "admin" ? (reasonRaw as "limit" | "admin") : null;

        if (errorText.includes("suspended")) {
          setUserStatus("suspended");
          setStatusReason(reason);
          setupWebSocket(); // keep listening for status changes
          return;
        }
        if (errorText.includes("blocked")) {
          setUserStatus("blocked");
          setStatusReason(null);
          navigate("/login", { replace: true });
          return;
        }
      }

      // If we were suspended but the endpoint now returns 200 again, clear it.
      if (userStatus === "suspended") {
        setUserStatus("active");
        setStatusReason(null);
      }

      if (!Array.isArray(visitors)) {
        console.warn("⚠️ Unexpected visitor data format");
        setIsLoading(false);
        return;
      }

      const now = Date.now();
      const normalized: Record<string, Visitor> = {};
      visitors.forEach((v: Visitor) => {
        const lastPage = getLastPage(v.pages);
        const lastTs = new Date(lastPage?.timestamp || v.last_seen || 0).getTime();
        const isActiveNow = now - lastTs <= ACTIVE_MAX_AGE_MS;

        v.status = isActiveNow ? "active" : "left";
        if (Array.isArray(v.pages) && v.pages.length) {
          const lastIndex = v.pages.length - 1;
          v.pages.forEach((p, i) => {
            p.is_active = i === lastIndex && isActiveNow;
          });
        }
        normalized[v.id] = v;
      });

      // ignore if site switched mid-flight
      if (myEpoch !== siteEpochRef.current) return;

      setVisitorDataMap(normalized);
      setIsLoading(false);

      // only auto-select if nothing selected (keep your choice)
      if (!selectedVisitorId) {
        const firstActive = Object.values(normalized).find((v) => v.status === "active");
        setSelectedVisitorId(firstActive ? firstActive.id : null);
      }
    } catch (err) {
      console.error("❌ Failed to refresh visitor list", err);
      setIsLoading(false);
    }
  }, [currentWebsite, selectedVisitorId, navigate, setupWebSocket, userStatus]);

  /* ------------------------- rebucket timer --------------------------- */
  useEffect(() => {
    if (!currentWebsite) return;

    rebucketTimerRef.current = setInterval(() => {
      const now = Date.now();
      setVisitorDataMap((prev) => {
        const updated = { ...prev };
        Object.entries(updated).forEach(([id, v]) => {
          const age = now - getLastTimestamp(v);
          if (age > RECENT_MAX_AGE_MS) delete updated[id];
        });
        return updated;
      });
      refreshVisitorList();
    }, REBUCKET_EVERY_MS);

    return () => {
      if (rebucketTimerRef.current) clearInterval(rebucketTimerRef.current);
    };
  }, [currentWebsite, refreshVisitorList]);

  /* --------------------------- load websites -------------------------- */
  useEffect(() => {
    const loadWebsites = async () => {
      try {
        const res = await secureFetch("https://api.modovisa.com/api/tracking-websites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }

        const result = await res.json();
        if (!result.projects || result.projects.length === 0) {
          setWebsites([]);
          setCurrentWebsite(null);
          setVisitorDataMap({});
          setIsLoading(false);
          return;
        }

        // 🔒 Force stable ordering: oldest first by id (matches original feel)
        const ordered: Website[] = [...result.projects].sort((a, b) => {
          const aid = Number(a.id);
          const bid = Number(b.id);
          if (Number.isNaN(aid) || Number.isNaN(bid)) {
            return String(a.id).localeCompare(String(b.id));
          }
          return aid - bid;
        });

        setWebsites(ordered);

        const firstSite = ordered[0];
        setIsLoading(true);
        setCurrentWebsite(firstSite);
        currentSiteIdRef.current = firstSite.id;
        localStorage.setItem("active_website_domain", firstSite.domain);
      } catch (err) {
        console.error("❌ Error loading websites", err);
        setIsLoading(false);
      }
    };

    loadWebsites();
  }, [navigate]);

  /* ------------------- reset on site switch + WS hook ----------------- */
  useEffect(() => {
    if (!currentWebsite) return;
    // reset caps & toggles on site switch
    setActiveShowLimit(INITIAL_ACTIVE_LIMIT);
    setRecentShowLimit(INITIAL_ACTIVE_LIMIT);
    setUserToggledLive(false);
    setUserToggledRecent(false);

    setupWebSocket();
    refreshVisitorList();

    return () => {
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {}
      }
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [currentWebsite, setupWebSocket, refreshVisitorList]);

  /* ----------------------- derived lists & flags ---------------------- */
  const nowTs = Date.now();
  const activeVisitors: Visitor[] = [];
  const recentVisitors: Visitor[] = [];

  Object.values(visitorDataMap).forEach((v) => {
    const bucket = getBucketFor(nowTs, v);
    if (bucket === "active") activeVisitors.push(v);
    else if (bucket === "recent") recentVisitors.push(v);
  });

  activeVisitors.sort((a, b) => getLastTimestamp(b) - getLastTimestamp(a));
  recentVisitors.sort((a, b) => getLastTimestamp(b) - getLastTimestamp(a));

  const selectedVisitor = selectedVisitorId ? visitorDataMap[selectedVisitorId] : null;

  /* ---------------------- live/recent open/close UX ------------------- */

  useEffect(() => {
    if (isLoading) return;
    if (activeVisitors.length > 0 && !userToggledLive) {
      setLiveVisitorsOpen(true);
    }
  }, [isLoading, activeVisitors.length, userToggledLive]);

  useEffect(() => {
    if (selectedVisitorId && !visitorDataMap[selectedVisitorId]) {
      setSelectedVisitorId(null);
    }
  }, [selectedVisitorId, visitorDataMap]);

  if (!isAuthenticated) return null;

  /* ----------------------------- sidebar ------------------------------ */
  const VisitorSidebar = () => (
    <div className="w-full bg-background flex flex-col border rounded-md min-h-[calc(100vh-160px)]">
      <div className="p-6 space-y-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Visitors</h2>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-9 px-3">
                {currentWebsite ? currentWebsite.website_name : "Choose Website"}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Choose Website</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {websites.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No websites found
                </div>
              ) : (
                websites.map((site) => (
                  <DropdownMenuItem
                    key={site.id}
                    onClick={() => {
                      // site switch reset
                      setIsLoading(true);
                      setCurrentWebsite(site);
                      currentSiteIdRef.current = site.id;

                      setVisitorDataMap({});
                      setSelectedVisitorId(null);

                      // reset buckets & caps
                      setLiveVisitorsOpen(true);
                      setRecentlyLeftOpen(false);
                      setUserToggledLive(false);
                      setUserToggledRecent(false);
                      setActiveShowLimit(INITIAL_ACTIVE_LIMIT);
                      setRecentShowLimit(INITIAL_ACTIVE_LIMIT);

                      // reset status banner to unknown for new site
                      setUserStatus("unknown");
                      setStatusReason(null);

                      localStorage.setItem("active_website_domain", site.domain);
                    }}
                  >
                    {site.website_name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="bg-[#dff7fb] text-[#055160] rounded px-4 py-2 text-center text-sm font-medium">
          {currentWebsite?.domain || "Loading domain..."}
        </div>
      </div>

      {renderStatusBanner()}

      <ScrollArea className="flex-1">
        {isLoading ? (
          <SidebarLoadingSkeleton />
        ) : (
          <>
            {/* LIVE VISITORS */}
            {activeVisitors.length > 0 ? (
              <Collapsible
                open={liveVisitorsOpen}
                onOpenChange={(open) => {
                  setLiveVisitorsOpen(open);
                  setUserToggledLive(true);
                }}
              >
                <CollapsibleTrigger className="w-full shadow-[0_2px_4px_rgba(0,0,0,0.06)] mb-2">
                  <div className="p-4 border-b bg-[#f9f9f9]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#71dd37] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                        <span className="text-md font-semibold">Live Visitors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary bg-white rounded-full px-2 py-1">
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
                      const lastPage = visitor.pages?.[visitor.pages.length - 1];
                      const { Icon, label, className } = stageMeta(lastPage?.stage);

                      return (
                        <div
                          key={visitor.id}
                          className={`p-1 cursor-pointer transition-colors ${
                            selectedVisitorId === visitor.id ? "bg-muted/30" : "hover:bg-muted/20"
                          }`}
                          onClick={() => setSelectedVisitorId(visitor.id)}
                        >
                          <div className="flex items-center gap-3 px-3 py-4 rounded-sm border shadow-sm">
                            <Avatar className="h-7 w-7 flex-shrink-0 pulse">
                              <AvatarFallback className="bg-[#71dd37]/10 border border-[#71dd37]">
                                <User className="h-4 w-4 text-[#71dd37]" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 space-y-2">
                              <p className="text-sm font-medium leading-tight text-foreground truncate block max-w-[260px]">
                                {visitor.title || "(No title)"}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap justify-between">
                                <Badge
                                  className={`text-xs font-medium border-0 rounded-md px-2 py-1 whitespace-nowrap ${
                                    visitor.is_new_visitor
                                      ? "bg-[#e7f8e9] text-[#56ca00] hover:bg-[#e7f8e9]"
                                      : "bg-[#eae8fd] text-[#7367f0] hover:bg-[#eae8fd]"
                                  }`}
                                >
                                  {visitor.is_new_visitor ? "New Visitor" : "Returning Visitor"}
                                </Badge>
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 mr-2 whitespace-nowrap"
                                >
                                  Session: {visitor.session_time}
                                </Badge>
                              </div>

                              {label && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Icon className={`h-5 w-5 ${className}`} />
                                  <small className="text-muted-foreground">{label}</small>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {activeVisitors.length > activeShowLimit && (
                      <div className="p-3 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveShowLimit((n) => n + LIMIT_STEP)}
                        >
                          Show more ({activeVisitors.length - activeShowLimit})
                        </Button>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                <div className="p-4 border-b bg-[#f9f9f9]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#ff3e1d] shadow-[0_0_0_4px_rgba(255,62,29,0.12)]" />
                      <span className="text-md font-semibold">No Live Visitors</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary bg-white rounded-full px-2 py-1">
                        0
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground opacity-40 pointer-events-none" />
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
                setUserToggledRecent(true);
              }}
            >
              <CollapsibleTrigger className="w-full shadow-[0_2px_4px_rgba(0,0,0,0.06)] my-2">
                <div className="p-4 border-b bg-[#f3f3f3]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#ffab00] shadow-[0_0_0_4px_rgba(245,158,11,0.12)]" />
                      <span className="text-md font-semibold">Recently left</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary bg-white rounded-full px-2 py-1">
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
                    <div className="p-4 text-center text-muted-foreground">No recent visitors</div>
                  ) : (
                    <>
                      {recentVisitors.slice(0, recentShowLimit).map((visitor) => {
                        const lastPage = visitor.pages?.[visitor.pages.length - 1];
                        const { Icon, label, className } = stageMeta(lastPage?.stage);

                        return (
                          <div
                            key={visitor.id}
                            className={`p-1 cursor-pointer transition-colors ${
                              selectedVisitorId === visitor.id ? "bg-muted/30" : "hover:bg-muted/20"
                            }`}
                            onClick={() => setSelectedVisitorId(visitor.id)}
                          >
                            <div className="flex items-center gap-3 px-3 py-4 rounded-sm border bg-[#f8f8f8]">
                              <Avatar className="h-7 w-7 flex-shrink-0">
                                <AvatarFallback className="bg-muted border border-border">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0 space-y-2">
                                <p className="text-sm font-medium leading-tight text-foreground truncate block max-w-[260px]">
                                  {visitor.title || "(No title)"}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap justify-between">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 whitespace-nowrap"
                                  >
                                    Left Site
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 mr-2 whitespace-nowrap"
                                  >
                                    Session: {visitor.session_time}
                                  </Badge>
                                </div>

                                {label && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Icon className={`h-5 w-5 ${className}`} />
                                    <small className="text-muted-foreground">{label}</small>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {recentVisitors.length > recentShowLimit && (
                        <div className="p-3 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRecentShowLimit((n) => n + LIMIT_STEP)}
                          >
                            Show more ({recentVisitors.length - recentShowLimit})
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

  /* ------------------------------ content ----------------------------- */
  return (
    <AppLayout>
      {/* New unified layout: padded container, desktop flex, mobile stacked */}
      <div className="px-4 py-6 md:px-12 md:py-8 max-w-8xl mx-auto lg:flex lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
        {/* Left column: sidebar */}
        <div className="hidden lg:block w-96">
          <VisitorSidebar />
        </div>

        {/* Right column: main panel */}
        <div className="flex-1 min-w-0">
          {/* Mobile sidebar trigger */}
          <div className="lg:hidden mb-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4 mr-2" />
                  Visitors
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <VisitorSidebar />
              </SheetContent>
            </Sheet>
          </div>

          <div className="space-y-6">
            {selectedVisitor ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-3xl font-bold">Who&apos;s this?</h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location:</p>
                      <p className="text-sm font-medium text-[#ff3e1d]">
                        {selectedVisitor.location || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Referrer:</p>
                      <p className="text-sm font-medium text-[#ff3e1d]">
                        {selectedVisitor.attribution_source || "Direct"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Device:</p>
                      <p className="text-sm font-medium text-[#ff3e1d]">
                        {selectedVisitor.device || "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Browser:</p>
                      <p className="text-sm font-medium text-[#ff3e1d]">
                        {selectedVisitor.browser || "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-2xl">What pages have they seen?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="journey-timeline list-none p-0 m-0">
                      {selectedVisitor.pages && selectedVisitor.pages.length > 0 ? (
                        [...selectedVisitor.pages].reverse().map((page, idx) => {
                          const meta = stageMeta(page.stage);
                          return (
                            <li
                              key={idx}
                              className={`jt-item ${
                                page.is_active ? "is-active" : "is-left"
                              } flex items-center m-2 ${
                                page.is_active ? "shadow-sm" : ""
                              } rounded-md border p-3 ${
                                !page.is_active ? "bg-muted/30" : "bg-card"
                              }`}
                            >
                              <span className="jt-dot"></span>
                              <div className="flex items-center w-full">
                                <span className="me-4">
                                  <meta.Icon className={`h-[55px] w-[55px] ${meta.className}`} />
                                </span>
                                <div className="flex-1 min-w-0 me-2">
                                  <span className="font-medium text-base text-foreground">
                                    {page.title || "(No title)"}
                                  </span>
                                  <small className="text-sm text-muted-foreground block mt-2">
                                    View this page by clicking on the following link:
                                  </small>
                                  <small className="block mt-2">
                                    <a
                                      href={safeURL(page.url)}
                                      className="text-sm text-[#ff3e1d] hover:underline break-all"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {page.url}
                                    </a>
                                  </small>
                                </div>
                                <div className="ms-auto flex items-center gap-2">
                                  {page.is_active && (
                                    <Badge className="text-xs bg-[#e7f8e9] text-[#56ca00] hover:bg-[#e7f8e9] font-medium border-0 rounded-full">
                                      Active now
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-muted text-muted-foreground font-medium border-0 rounded-full px-3"
                                  >
                                    {page.time_spent}
                                  </Badge>
                                </div>
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No page views yet
                        </div>
                      )}
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="shadow-none border">
                <CardContent className="flex items-center justify-center h-60">
                  <InlineNoVisitors />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default LiveTracking;
