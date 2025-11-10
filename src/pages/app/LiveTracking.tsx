// src/pages/app/LiveTracking.tsx

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, ExternalLink, User, Menu, ChevronDown, Monitor } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { secureFetch } from "@/lib/auth";

// Constants
const ACTIVE_MAX_AGE_MS = 8 * 60 * 1000;     // 8 minutes
const RECENT_MAX_AGE_MS = 20 * 60 * 1000;    // 20 minutes
const REBUCKET_EVERY_MS = 30_000;             // 30 seconds
const WS_PING_INTERVAL = 25_000;              // 25 seconds

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
  status: 'active' | 'left' | 'inactive';
  location: string;
  attribution_source: string;
  device: string;
  browser: string;
  pages: Page[];
  last_seen: string;
  last_activity: string;
}

interface Website {
  id: string;
  website_name: string;
  domain: string;
}

const LiveTracking = () => {
  const navigate = useNavigate();
  
  // Auth guard - check authentication before rendering
  const { isAuthenticated, isLoading: authLoading } = useAuthGuard();
  
  // State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveVisitorsOpen, setLiveVisitorsOpen] = useState(true);
  const [recentlyLeftOpen, setRecentlyLeftOpen] = useState(false);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [currentWebsite, setCurrentWebsite] = useState<Website | null>(null);
  const [visitorDataMap, setVisitorDataMap] = useState<Record<string, Visitor>>({});
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const rebucketTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Utility functions
  const safeURL = (raw: string) => {
    try {
      const u = new URL(String(raw));
      if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    } catch {}
    return "#";
  };

  const getLastTimestamp = (visitor: Visitor) => {
    return new Date(visitor.pages?.at(-1)?.timestamp || visitor.last_activity || 0).getTime();
  };

  const getBucketFor = (now: number, visitor: Visitor) => {
    const age = now - getLastTimestamp(visitor);
    if (age <= ACTIVE_MAX_AGE_MS) return 'active';
    if (age <= RECENT_MAX_AGE_MS) return 'recent';
    return 'expired';
  };

  // Setup WebSocket
  const setupWebSocket = useCallback(async () => {
    if (!currentWebsite) return;

    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    try {
      const tRes = await secureFetch('https://api.modovisa.com/api/ws-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_id: currentWebsite.id })
      });

      if (!tRes.ok) {
        console.error('❌ WS ticket mint failed');
        return;
      }

      const { ticket } = await tRes.json();

      const ws = new WebSocket(`wss://api.modovisa.com/ws/visitor-tracking?ticket=${encodeURIComponent(ticket)}`);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        console.log("✅ Connected to WebSocket");
        
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, WS_PING_INTERVAL);
      });

      ws.addEventListener('message', async (event) => {
        const data = JSON.parse(event.data || "{}");
        
        if (data.type === "pong") return;

        if (data.type === "new_event") {
          const payload = data.payload || {};
          if (String(payload.site_id) !== String(currentWebsite.id)) return;
          if (isSuspended) return;

          try {
            const res = await secureFetch(
              `https://api.modovisa.com/api/visitor/${payload.visitor_id}?session_id=${payload.session_id}&site_id=${payload.site_id}`,
              { method: "GET" }
            );

            if (!res.ok) return;

            const visitor = await res.json();
            
            const latestPage = visitor.pages?.at(-1);
            const latestTime = new Date(latestPage?.timestamp || visitor.last_seen || 0).getTime();
            const now = Date.now();
            const isActiveNow = (now - latestTime) <= ACTIVE_MAX_AGE_MS;

            visitor.status = isActiveNow ? 'active' : 'left';

            if (Array.isArray(visitor.pages) && visitor.pages.length) {
              const lastIndex = visitor.pages.length - 1;
              visitor.pages.forEach((p: Page, i: number) => {
                p.is_active = (i === lastIndex) && isActiveNow;
              });
            }

            setVisitorDataMap(prev => ({ ...prev, [visitor.id]: visitor }));

          } catch (err) {
            console.error("❌ Failed to process live visitor", err);
          }
        }

        if (data.type === "user_status") {
          if (data.status === 'suspended') {
            setIsSuspended(true);
          } else if (data.status === 'active') {
            setIsSuspended(false);
          }
        }
      });

      ws.addEventListener('close', () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        setTimeout(() => setupWebSocket(), 5000);
      });

      ws.addEventListener('error', (err) => {
        console.error("❌ WebSocket error", err);
      });

    } catch (err) {
      console.error("❌ Failed to setup WebSocket", err);
    }
  }, [currentWebsite, isSuspended]);

  // Refresh visitor list
  const refreshVisitorList = useCallback(async () => {
    if (!currentWebsite) return;

    try {
      const res = await secureFetch(
        "https://api.modovisa.com/api/live-visitor-tracking",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ site_id: currentWebsite.id })
        }
      );

      if (res.status === 401) {
        console.warn('Session expired, redirecting to login');
        navigate('/login', { replace: true });
        return;
      }

      const visitors = await res.json();

      if (res.status === 403) {
        const errorText = (visitors?.error || "").toLowerCase();
        if (errorText.includes("suspended")) {
          setIsSuspended(true);
          setupWebSocket();
          return;
        }
        if (errorText.includes("blocked")) {
          console.warn('Account blocked, redirecting to login');
          navigate('/login', { replace: true });
          return;
        }
      }

      if (isSuspended) {
        setIsSuspended(false);
      }

      if (!Array.isArray(visitors)) {
        console.warn("⚠️ Unexpected visitor data format");
        return;
      }

      const now = Date.now();
      const normalizedVisitors: Record<string, Visitor> = {};

      visitors.forEach((v: Visitor) => {
        const lastTs = new Date(v.pages?.at(-1)?.timestamp || v.last_seen || 0).getTime();
        const isActiveNow = (now - lastTs) <= ACTIVE_MAX_AGE_MS;

        v.status = isActiveNow ? 'active' : 'left';

        if (Array.isArray(v.pages) && v.pages.length) {
          const lastIndex = v.pages.length - 1;
          v.pages.forEach((p, i) => {
            p.is_active = (i === lastIndex) && isActiveNow;
          });
        }

        normalizedVisitors[v.id] = v;
      });

      setVisitorDataMap(normalizedVisitors);
      setIsLoading(false);

      if (!selectedVisitorId && Object.keys(normalizedVisitors).length > 0) {
        const firstVisitorId = Object.keys(normalizedVisitors)[0];
        setSelectedVisitorId(firstVisitorId);
      }

    } catch (err) {
      console.error("❌ Failed to refresh visitor list", err);
      setIsLoading(false);
    }
  }, [currentWebsite, isSuspended, selectedVisitorId, navigate, setupWebSocket]);

  // Start rebucket timer
  useEffect(() => {
    if (!currentWebsite) return;

    rebucketTimerRef.current = setInterval(() => {
      const now = Date.now();
      
      setVisitorDataMap(prev => {
        const updated = { ...prev };
        Object.entries(updated).forEach(([id, v]) => {
          const age = now - getLastTimestamp(v);
          if (age > RECENT_MAX_AGE_MS) {
            delete updated[id];
          }
        });
        return updated;
      });

      refreshVisitorList();
    }, REBUCKET_EVERY_MS);

    return () => {
      if (rebucketTimerRef.current) {
        clearInterval(rebucketTimerRef.current);
      }
    };
  }, [currentWebsite, refreshVisitorList]);

  // Load websites on mount
  useEffect(() => {
    const loadWebsites = async () => {
      try {
        const res = await secureFetch('https://api.modovisa.com/api/tracking-websites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.status === 401) {
          // Not authenticated - redirect to login
          console.warn('Not authenticated, redirecting to login');
          navigate('/login', { replace: true });
          return;
        }

        const result = await res.json();

        if (!result.projects || result.projects.length === 0) {
          setIsLoading(false);
          return;
        }

        setWebsites(result.projects);
        
        if (result.projects.length > 0) {
          const firstSite = result.projects[0];
          setCurrentWebsite(firstSite);
          localStorage.setItem('active_website_domain', firstSite.domain);
        }

      } catch (err) {
        console.error("❌ Error loading websites", err);
        setIsLoading(false);
      }
    };

    loadWebsites();
  }, [navigate]);

  // Setup WebSocket and refresh when website changes
  useEffect(() => {
    if (!currentWebsite) return;

    setupWebSocket();
    refreshVisitorList();

    return () => {
      if (wsRef.current) {
        try { wsRef.current.close(); } catch {}
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [currentWebsite, setupWebSocket, refreshVisitorList]);

  // Compute active and recent visitors
  const now = Date.now();
  const activeVisitors: Visitor[] = [];
  const recentVisitors: Visitor[] = [];

  Object.values(visitorDataMap).forEach(v => {
    const bucket = getBucketFor(now, v);
    if (bucket === 'active') activeVisitors.push(v);
    else if (bucket === 'recent') recentVisitors.push(v);
  });

  activeVisitors.sort((a, b) => getLastTimestamp(b) - getLastTimestamp(a));
  recentVisitors.sort((a, b) => getLastTimestamp(b) - getLastTimestamp(a));

  const selectedVisitor = selectedVisitorId ? visitorDataMap[selectedVisitorId] : null;

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-lg text-muted-foreground">Verifying authentication...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Don't render if not authenticated (hook will redirect)
  if (!isAuthenticated) {
    return null;
  }

  const VisitorSidebar = () => (
    <div className="w-full h-full bg-background flex flex-col border rounded-md">
      <div className="p-6 space-y-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Visitors</h2>
          <select
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 rounded-md text-sm font-medium cursor-pointer"
            value={currentWebsite?.id || ''}
            onChange={(e) => {
              const site = websites.find(w => w.id === e.target.value);
              if (site) {
                setCurrentWebsite(site);
                setVisitorDataMap({});
                setSelectedVisitorId(null);
                localStorage.setItem('active_website_domain', site.domain);
              }
            }}
          >
            {websites.map(site => (
              <option key={site.id} value={site.id}>
                {site.website_name}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-cyan-100 text-cyan-900 rounded px-4 py-2 text-center text-sm font-medium">
          {currentWebsite?.domain || 'No website selected'}
        </div>
      </div>

      {isSuspended && (
        <div className="mx-6 mb-4">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded">
            <strong>Live Tracking Suspended</strong>
            <p className="text-sm">You've reached your monthly event limit.</p>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <Collapsible open={liveVisitorsOpen} onOpenChange={setLiveVisitorsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#71dd37] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
                  <span className="text-md font-semibold">Live Visitors</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{activeVisitors.length}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${liveVisitorsOpen ? '' : '-rotate-90'}`} />
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="bg-background">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : activeVisitors.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No active visitors</div>
              ) : (
                activeVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className={`p-1 cursor-pointer transition-colors ${
                      selectedVisitorId === visitor.id ? 'bg-muted/30' : 'hover:bg-muted/20'
                    }`}
                    onClick={() => setSelectedVisitorId(visitor.id)}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-sm border shadow-sm">
                      <Avatar className="h-8 w-8 flex-shrink-0 pulse">
                        <AvatarFallback className="bg-[#71dd37]/10 border-1 border-[#71dd37]">
                          <User className="h-4 w-4 text-[#71dd37]" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium leading-tight text-foreground truncate block max-w-[260px]">
                          {visitor.title || '(No title)'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap justify-between">
                          <Badge 
                            className={`text-xs font-medium border-0 rounded-md px-2 py-1 whitespace-nowrap ${
                              visitor.is_new_visitor
                                ? 'bg-[#e7f8e9] text-[#56ca00] hover:bg-[#e7f8e9]' 
                                : 'bg-[#eae8fd] text-[#7367f0] hover:bg-[#eae8fd]'
                            }`}
                          >
                            {visitor.is_new_visitor ? 'New Visitor' : 'Returning Visitor'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 mr-2 whitespace-nowrap">
                            Session: {visitor.session_time}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={recentlyLeftOpen} onOpenChange={setRecentlyLeftOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#ffab00] shadow-[0_0_0_4px_rgba(245,158,11,0.12)]" />
                  <span className="text-md font-semibold">Recently left</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{recentVisitors.length}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${recentlyLeftOpen ? '' : '-rotate-90'}`} />
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="bg-background">
              {recentVisitors.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No recent visitors</div>
              ) : (
                recentVisitors.map((visitor) => (
                  <div
                    key={visitor.id}
                    className="p-1 cursor-pointer transition-colors hover:bg-muted/20"
                    onClick={() => setSelectedVisitorId(visitor.id)}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-sm border">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-muted border border-border">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium leading-tight text-foreground truncate block max-w-[260px]">
                          {visitor.title || '(No title)'}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap justify-between">
                          <Badge variant="secondary" className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 whitespace-nowrap">
                            Left Site
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 mr-2 whitespace-nowrap">
                            Session: {visitor.session_time}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex h-full overflow-hidden gap-6 pl-10">
        <div className="hidden lg:block w-96 mt-8">
          <VisitorSidebar />
        </div>

        <div className="flex-1 overflow-auto pr-6">
          <div className="lg:hidden p-4 border-b bg-card sticky top-0 z-10">
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

          <div className="p-6 lg:p-8 space-y-6 pt-8">
            {selectedVisitor ? (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-muted">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <h1 className="text-3xl font-bold">Who's this?</h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location:</p>
                      <p className="font-semibold text-[#ff3e1d]">{selectedVisitor.location || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Referrer:</p>
                      <p className="font-semibold text-[#ff3e1d]">{selectedVisitor.attribution_source || 'Direct'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Device:</p>
                      <p className="font-semibold text-[#ff3e1d]">{selectedVisitor.device || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                    <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Browser:</p>
                      <p className="font-semibold text-[#ff3e1d]">{selectedVisitor.browser || 'Unknown'}</p>
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
                        [...selectedVisitor.pages].reverse().map((page, index) => (
                          <li
                            key={index}
                            className={`jt-item ${page.is_active ? 'is-active' : 'is-left'} flex items-center m-2 ${page.is_active ? 'shadow-sm' : ''} rounded-[14px] border p-3 ${!page.is_active ? 'bg-muted/30' : 'bg-card'}`}
                          >
                            <span className="jt-dot"></span>
                            <div className="flex items-center w-full">
                              <span className="ms-3 me-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="55" height="55" viewBox="0 0 24 24" className="text-warning">
                                  <path fill="currentColor" d="M4 21h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2m0-2V7h16l.001 12z"/>
                                </svg>
                              </span>
                              <div className="flex-1 min-w-0 me-2">
                                <span className="font-medium text-base text-foreground">{page.title || '(No title)'}</span>
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
                                <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground font-medium border-0 rounded-full px-3">
                                  {page.time_spent}
                                </Badge>
                              </div>
                            </div>
                          </li>
                        ))
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
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl font-medium text-muted-foreground">
                    {isLoading ? 'Loading visitors...' : 'Select a visitor to view details'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveTracking;