import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Globe, ExternalLink, User, Menu, ChevronDown, Monitor } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const LiveTracking = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const visitors = [
    { id: 1, page: "Contact us | Kosh mArt Hong Kong", session: "4s", type: "new", selected: true },
    { id: 2, page: "Contact us | Kosh mArt Hong Kong", session: "42s", type: "new", selected: false },
    { id: 3, page: "Oil Painting Reproductions | Art Rep...", session: "1m", type: "returning", selected: false },
    { id: 4, page: "Mercury Confiding the Infant Bacch...", session: "4m", type: "new", selected: false },
    { id: 5, page: "The Thaw On the Seine, near Vethe...", session: "4m", type: "new", selected: false },
    { id: 6, page: "Contact us | Kosh mArt Hong Kong", session: "4m", type: "new", selected: false },
  ];

  const journeySteps = [
    {
      id: 1,
      title: "Contact us | Kosh mArt Hong Kong",
      url: "https://koshmart.com/hk/contact-us",
      status: "Active now",
      time: "42s",
      isActive: true,
    },
  ];

  const VisitorSidebar = () => (
    <div className="w-full h-full bg-background flex flex-col border-r">
      <div className="p-6 border-b space-y-4">
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
        {/* Live Visitors Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-sm font-semibold">Live Visitors</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">{visitors.length}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* Visitor List */}
        <div className="divide-y">
          {visitors.map((visitor) => (
            <div
              key={visitor.id}
              className={`p-4 cursor-pointer transition-colors ${
                visitor.selected ? 'bg-muted/50' : 'hover:bg-muted/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 space-y-2">
                  <p className="text-sm font-medium leading-tight">{visitor.page}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-xs font-normal ${
                      visitor.type === 'new' 
                        ? 'bg-success/20 text-success hover:bg-success/20' 
                        : 'bg-purple-500/20 text-purple-700 hover:bg-purple-500/20'
                    }`}>
                      {visitor.type === 'new' ? 'New Visitor' : 'Returning Visitor'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs font-normal bg-muted">
                      Session: {visitor.session}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex h-full overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-96">
          <VisitorSidebar />
        </div>

        {/* Main Content - Visitor Details */}
        <div className="flex-1 overflow-auto">
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

          <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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
                  <p className="font-semibold text-destructive">China, Nanjing</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Referrer:</p>
                  <p className="font-semibold text-destructive">Direct</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Device:</p>
                  <p className="font-semibold text-destructive">Desktop</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-card rounded-lg border p-4">
                <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Browser:</p>
                  <p className="font-semibold text-destructive">Chrome</p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl">What pages have they seen?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  {journeySteps.map((step, index) => (
                    <div
                      key={step.id}
                      className="relative pl-24 pb-8 last:pb-0"
                    >
                      {/* Timeline line */}
                      {index < journeySteps.length - 1 && (
                        <div className="absolute left-[9px] top-12 bottom-0 w-0.5 bg-border" />
                      )}
                      
                      {/* Timeline elements */}
                      <div className="absolute left-0 top-0 flex items-start gap-3">
                        {/* Status dot */}
                        <div
                          className={`mt-1 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            step.isActive ? 'bg-success' : 'bg-muted'
                          }`}
                        >
                          <div className={`h-2 w-2 rounded-full ${
                            step.isActive ? 'bg-white' : 'bg-muted-foreground'
                          }`} />
                        </div>
                        
                        {/* Page icon */}
                        <div className="h-16 w-16 rounded border-4 border-orange-400 bg-white flex items-center justify-center flex-shrink-0">
                          <div className="h-8 w-8 bg-orange-400 rounded" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="space-y-2 pt-0">
                        <h4 className="font-medium text-base leading-tight pr-4">{step.title}</h4>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          {step.isActive && (
                            <Badge className="text-xs bg-success text-white hover:bg-success font-normal">
                              Active now
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground font-normal">
                            {step.time}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground pt-1">
                          View this page by clicking on the following link:
                        </p>
                        <a
                          href={step.url}
                          className="text-sm text-destructive hover:underline break-all inline-block"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {step.url}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LiveTracking;
