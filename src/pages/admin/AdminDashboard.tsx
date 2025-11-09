import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, UserPlus, CheckCircle, XCircle, Clock } from "lucide-react";

const AdminDashboard = () => {
  const stats = [
    { title: "Events Today", value: "--", subtitle: "Today", icon: Activity, color: "text-primary" },
    { title: "New Signups", value: "--", subtitle: "Last 7 days", icon: UserPlus, color: "text-cyan-500" },
    { title: "Active Subscriptions", value: "--", subtitle: "Stripe status = active", icon: CheckCircle, color: "text-success" },
    { title: "Failed Payments", value: "--", subtitle: "Last 7 days", icon: XCircle, color: "text-destructive" },
  ];

  const ingestionHealth = [
    { domain: "prestashop.skollab.io", time: "163h 7m ago", status: "silent" },
    { domain: "modovisa.myshopify.com", time: "160h 5m ago", status: "silent" },
    { domain: "nano-3d.com", time: "83h 51m ago", status: "silent" },
    { domain: "joomla.skollab.io", time: "49h 41m ago", status: "silent" },
    { domain: "estetikglobalserbia.com", time: "34h 21m ago", status: "silent" },
    { domain: "203digital.co.uk", time: "32h 30m ago", status: "silent" },
    { domain: "clearica.com", time: "18h 10m ago", status: "silent" },
  ];

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${stat.color === 'text-primary' ? 'bg-primary/10' : stat.color === 'text-cyan-500' ? 'bg-cyan-500/10' : stat.color === 'text-success' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Timezone Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <button className="text-muted-foreground hover:text-foreground">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Timezone</p>
                <p className="text-xs text-muted-foreground">Used for calendar-day KPIs</p>
                <Select defaultValue="ist">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ist">IST (Asia/Kolkata)</SelectItem>
                    <SelectItem value="utc">UTC</SelectItem>
                    <SelectItem value="est">EST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Center & MRR Growth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Action Center */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Action Center</CardTitle>
              <span className="text-sm text-muted-foreground">Live platform signals</span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium">Ingestion Health (last 60m)</h4>
                    <button className="text-muted-foreground hover:text-foreground">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-muted">7</Badge>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {ingestionHealth.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm truncate flex-1">{item.domain}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                      <Badge variant="destructive" className="text-xs">
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">Dunning & At-Risk Accounts</h4>
                    <button className="text-muted-foreground hover:text-foreground">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                  <Badge variant="secondary" className="bg-muted">0</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">No accounts in dunning right now.</p>
              </div>
            </CardContent>
          </Card>

          {/* MRR Growth */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">MRR Growth</CardTitle>
                <p className="text-sm text-muted-foreground">Monthly Reccuring Revenue</p>
              </div>
              <Select defaultValue="12months">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12months">Last 12 months</SelectItem>
                  <SelectItem value="6months">Last 6 months</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-around gap-2">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} className="flex-1 bg-muted/30 rounded-t h-2"></div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>2024-11</span>
                <span>2025-01</span>
                <span>2025-03</span>
                <span>2025-05</span>
                <span>2025-07</span>
                <span>2025-09</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
