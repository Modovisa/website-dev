// src/pages/admin/Sites.tsx

import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Database, Activity, AlertCircle, TrendingUp, Printer, FileSpreadsheet, FileText, Copy } from "lucide-react";

const Sites = () => {
  const stats = [
    { title: "Total Sites", value: "50", subtitle: "All connected projects", icon: Database, color: "text-primary" },
    { title: "Active (24h)", value: "9", subtitle: "Any activity in last 24h", icon: Activity, color: "text-success" },
    { title: "Silent (≥60m)", value: "43", subtitle: "Potential ingestion issue", icon: AlertCircle, color: "text-warning" },
    { title: "Events (24h)", value: "893", subtitle: "Top: koshmart.com (458)", icon: TrendingUp, color: "text-cyan-500" },
  ];

  const sites = [
    { domain: "---.com", siteNo: "15", owner: "rezwanhossainajeeb", email: "rezwanhossainajeeb@gmail.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
    { domain: "0jatjy-07.myshopify.com", siteNo: "38", owner: "apprev", email: "apprevtest1@shopify.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "9d 2h 9m ago" },
    { domain: "0jatjy-07.myshopify.com", siteNo: "46", owner: "apprev", email: "apprevtest1@shopify.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
    { domain: "203digital.co.uk", siteNo: "33", owner: "seangiles", email: "sean.giles@gmail.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "1d 8h 34m ago" },
    { domain: "46wmf0-ks.myshopify.com", siteNo: "39", owner: "apprev1", email: "apprevtest100@shopify.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
    { domain: "46wmf0-ks.myshopify.com", siteNo: "40", owner: "apprev", email: "apprevtest1@shopify.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
    { domain: "46wmf0-ks.myshopify.com", siteNo: "43", owner: "apprev", email: "apprevtest1@shopify.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
    { domain: "admin.shopify.com", siteNo: "51", owner: "ahmetcandogan666", email: "ahmetcandogan666@gmail.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
    { domain: "assembleebiblisue34.com", siteNo: "34", owner: "RV", email: "proudn69@gmail.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
    { domain: "assembleebiblisue34.com", siteNo: "35", owner: "RV", email: "proudn69@gmail.com", plan: "Free Plan", status: "Active", events: "0", visitors: "0", lastSeen: "—" },
  ];

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, idx) => (
            <Card key={idx}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-2.5 rounded-lg ${
                    stat.color === 'text-primary' ? 'bg-primary/10' : 
                    stat.color === 'text-success' ? 'bg-success/10' : 
                    stat.color === 'text-warning' ? 'bg-warning/10' : 
                    'bg-cyan-500/10'
                  }`}>
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
        </div>

        {/* Sites Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Sites</h2>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Select defaultValue="10">
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input placeholder="Search sites" className="w-full sm:w-64" />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="mr-2 h-4 w-4" />
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 pl-2">
                        <input type="checkbox" className="rounded border-input" />
                      </th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">SITE</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">OWNER</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">PLAN</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">STATUS</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">EVENTS (24H)</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">VISITORS (24H)</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">LAST SEEN</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-4 pl-2">
                          <input type="checkbox" className="rounded border-input" />
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-sm">{site.domain}</p>
                            <p className="text-xs text-muted-foreground">Site no.: {site.siteNo}</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <div>
                            <p className="font-medium text-sm">{site.owner}</p>
                            <p className="text-xs text-muted-foreground">{site.email}</p>
                          </div>
                        </td>
                        <td className="py-4 text-sm">{site.plan}</td>
                        <td className="py-4">
                          <Badge className="bg-success">{site.status}</Badge>
                        </td>
                        <td className="py-4 text-center text-sm">{site.events}</td>
                        <td className="py-4 text-center text-sm">{site.visitors}</td>
                        <td className="py-4 text-sm text-muted-foreground">{site.lastSeen}</td>
                        <td className="py-4">
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            ⋮
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-sm gap-4">
                <span className="text-muted-foreground">Showing 1 to 10 of 50 entries</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled>&lt;</Button>
                  <Button size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <Button variant="outline" size="sm">4</Button>
                  <Button variant="outline" size="sm">5</Button>
                  <Button variant="outline" size="sm">&gt;</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Sites;
