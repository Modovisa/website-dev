// src/pages/app/LiveTracking.tsx

import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, ExternalLink, User, Menu, ChevronDown, Monitor } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const LiveTracking = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveVisitorsOpen, setLiveVisitorsOpen] = useState(true);
  const [recentlyLeftOpen, setRecentlyLeftOpen] = useState(true);
  
  const visitors = [
    { id: 1, page: "Contact us | Kosh mArt Hong Kong", session: "1m", type: "new", selected: true },
    { id: 2, page: "Contact us | Kosh mArt Hong Kong", session: "3m", type: "returning", selected: false },
    { id: 3, page: "Contact us | Kosh mArt Hong Kong", session: "3m", type: "new", selected: false },
    { id: 4, page: "Four Darks In Red (1958) by Mark R...", session: "7m", type: "new", selected: false },
  ];

  const recentlyLeft = [
    { id: 1, page: "Contact us - Kosh mArt South Korea...", session: "8m", type: "left" },
    { id: 2, page: "On White II by 박실리 칸딘스키 - 유화...", session: "1m", type: "left" },
    { id: 3, page: "名画、油絵の複製画（レプリカ）...", session: "6s", type: "left" },
    { id: 4, page: "ローヌ川の星月夜 フィンセント...", session: "15m", type: "left" },
  ];

  const journeySteps = [
    {
      id: 1,
      title: "Henri Rousseau Oil Painting Reproductions | Kosh mArt USA",
      url: "https://koshmart.com/reproductions/henri-rousseau",
      time: "4s",
      isActive: true,
    },
    {
      id: 2,
      title: "Surprised by Henri Rousseau - Oil Painting Reproduction | Kosh mArt USA",
      url: "https://koshmart.com/surprised-henri-rousseau-painting-reproduction-hr0001",
      time: "18m",
      isActive: false,
    },
    {
      id: 3,
      title: "Oil Painting Reproductions | Art Reproductions | Kosh mArt USA",
      url: "https://koshmart.com/",
      time: "8s",
      isActive: false,
    },
    {
      id: 4,
      title: "Oil Painting Reproductions | Art Reproductions | Kosh mArt USA",
      url: "https://koshmart.com/",
      time: "22m",
      isActive: false,
    },
  ];

  const VisitorSidebar = () => (
    <div className="w-full h-full bg-background flex flex-col border rounded-md">
      <div className="p-6 space-y-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Visitors</h2>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4">
            Choose Website
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="bg-cyan-100 text-cyan-900 rounded px-4 py-2 text-center text-sm font-medium">
          koshmart.com
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Live Visitors Section */}
        <Collapsible open={liveVisitorsOpen} onOpenChange={setLiveVisitorsOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#71dd37] pulse" />
                  <span className="text-sm font-semibold">Live Visitors</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{visitors.length}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${liveVisitorsOpen ? '' : '-rotate-90'}`} />
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="bg-background">
              {visitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className={`p-1 cursor-pointer transition-colors ${
                    visitor.selected ? 'bg-muted/30' : 'hover:bg-muted/20'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3 rounded-sm border">
                    <Avatar className="h-8 w-8 flex-shrink-0 pulse">
                      <AvatarFallback className="bg-[#71dd37]/10 border-1 border-[#71dd37]">
                        <User className="h-4 w-4 text-[#71dd37]" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm font-medium leading-tight text-foreground">{visitor.page}</p>
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <Badge 
                          className={`text-xs font-medium border-0 rounded-md px-2 py-1 ${
                            visitor.type === 'new' 
                              ? 'bg-[#e7f8e9] text-[#56ca00] hover:bg-[#e7f8e9]' 
                              : 'bg-[#eae8fd] text-[#7367f0] hover:bg-[#eae8fd]'
                          }`}
                        >
                          {visitor.type === 'new' ? 'New Visitor' : 'Returning Visitor'}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 mr-2">
                          Session: {visitor.session}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Recently Left Section */}
        <Collapsible open={recentlyLeftOpen} onOpenChange={setRecentlyLeftOpen}>
          <CollapsibleTrigger className="w-full">
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#ffab00]" />
                  <span className="text-sm font-semibold">Recently left</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-primary">{recentlyLeft.length}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${recentlyLeftOpen ? '' : '-rotate-90'}`} />
                </div>
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="bg-background">
              {recentlyLeft.map((visitor) => (
                <div
                  key={visitor.id}
                  className="p-1 cursor-pointer transition-colors hover:bg-muted/20"
                >
                  <div className="flex items-center gap-3 p-3 rounded-sm border">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-muted border border-border">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-2">
                      <p className="text-sm font-medium leading-tight text-foreground">{visitor.page}</p>
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <Badge variant="secondary" className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1">
                          Left Site
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-medium bg-muted text-foreground hover:bg-muted border-0 rounded-md px-2 py-1 mr-2">
                          Session: {visitor.session}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </ScrollArea>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex h-full overflow-hidden gap-6 pl-10">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-96 mt-8">
          <VisitorSidebar />
        </div>

        {/* Main Content - Visitor Details */}
        <div className="flex-1 overflow-auto pr-6">
          {/* Mobile Menu Button */}
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
                  <p className="font-semibold text-[#ff3e1d]">China, Nanjing</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Referrer:</p>
                  <p className="font-semibold text-[#ff3e1d]">Direct</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Device:</p>
                  <p className="font-semibold text-[#ff3e1d]">Desktop</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Browser:</p>
                  <p className="font-semibold text-[#ff3e1d]">Chrome</p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">What pages have they seen?</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="journey-timeline list-none p-0 m-0">
                  {journeySteps.map((step) => (
                    <li
                      key={step.id}
                      className={`jt-item ${step.isActive ? 'is-active' : 'is-left'} flex items-center m-2 shadow-sm rounded-[14px] border p-3 ${!step.isActive ? 'bg-muted/30' : 'bg-card'}`}
                    >
                      <span className="jt-dot"></span>
                      <div className="flex items-center w-full">
                        <span className="ms-3 me-4">
                          <svg xmlns="http://www.w3.org/2000/svg" width="55" height="55" viewBox="0 0 24 24" className="text-warning">
                            <path fill="currentColor" d="M4 21h16c1.103 0 2-.897 2-2V5c0-1.103-.897-2-2-2H4c-1.103 0-2 .897-2 2v14c0 1.103.897 2 2 2m0-2V7h16l.001 12z"/>
                          </svg>
                        </span>
                        <div className="flex-1 min-w-0 me-2">
                          <span className="font-medium text-base text-foreground">{step.title}</span>
                          <small className="text-sm text-muted-foreground block mt-2">
                            View this page by clicking on the following link:
                          </small>
                          <small className="block mt-2">
                            <a
                              href={step.url}
                              className="text-sm text-[#ff3e1d] hover:underline break-all"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {step.url}
                            </a>
                          </small>
                        </div>
                        <div className="ms-auto flex items-center gap-2">
                          {step.isActive && (
                            <Badge className="text-xs bg-[#e7f8e9] text-[#56ca00] hover:bg-[#e7f8e9] font-medium border-0 rounded-full">
                              Active now
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground font-medium border-0 rounded-full px-3">
                            {step.time}
                          </Badge>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveTracking;