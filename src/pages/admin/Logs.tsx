import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertCircle, AlertTriangle, Radio, XCircle, Printer, FileSpreadsheet, FileText, Copy } from "lucide-react";

const Logs = () => {
  const stats = [
    { title: "Errors (24h)", value: "0", subtitle: "Top source", icon: AlertCircle, color: "text-destructive" },
    { title: "Warnings (24h)", value: "0", subtitle: "Top source", icon: AlertTriangle, color: "text-warning" },
    { title: "API Requests (24h)", value: "0", subtitle: "", icon: Radio, color: "text-primary" },
    { title: "Failed Webhooks (24h)", value: "0", subtitle: "Retry in: 2w", icon: XCircle, color: "text-cyan-500" },
  ];

  const logs = Array.from({ length: 25 }).map((_, idx) => ({
    time: "20 Dec, 11:29 pm",
    level: "error",
    source: "sql.public.delete-tracking-config",
    message: "D1_ERROR: no such column: tracking_token at offset 33: SQLITE_ERROR",
  }));

  const archives = [
    { key: "admin-logs/2025/08/26/7-R-2025-08-26T06-2FTTQ3-2FTQ-23QZ-rlpon.gz", size: "17 kB", uploaded: "9/7/2025, 8:10:41 AM" },
    { key: "admin-logs/2025/08/26/7-R-2025-08-26T06-2FZ-2FTT-2FQ9-49Z-2F-fclpon.gz", size: "18 kB", uploaded: "8/31/2025, 8:31:24 PM" },
    { key: "admin-logs/2025/08/26/7-R-2025-08-26T06-2FTT-09-49-40Z-2F-fclpon.gz", size: "18 kB", uploaded: "8/31/2025, 9:56:38 PM" },
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
                    stat.color === 'text-destructive' ? 'bg-destructive/10' : 
                    stat.color === 'text-warning' ? 'bg-warning/10' : 
                    stat.color === 'text-primary' ? 'bg-primary/10' : 
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

        {/* Application Logs */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Application Logs</h2>
                <Button variant="outline" size="sm">Actions</Button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <Select defaultValue="25">
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input placeholder="Search logs" className="w-full sm:w-64" />
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
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">TIME</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">LEVEL</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">SOURCE</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">MESSAGE</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">META</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-3 pl-2">
                          <input type="checkbox" className="rounded border-input" />
                        </td>
                        <td className="py-3 text-xs">{log.time}</td>
                        <td className="py-3">
                          <Badge variant="destructive" className="text-xs">{log.level}</Badge>
                        </td>
                        <td className="py-3 text-xs max-w-[200px] truncate">{log.source}</td>
                        <td className="py-3 text-xs max-w-[300px] truncate">{log.message}</td>
                        <td className="py-3 text-xs"></td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Button variant="link" size="sm" className="text-primary h-auto p-0 text-xs">View</Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-sm gap-4">
                <span className="text-muted-foreground">Showing 1 to 25 of 79 entries</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm">&lt;</Button>
                  <Button size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <Button variant="outline" size="sm">4</Button>
                  <Button variant="outline" size="sm">&gt;</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archives */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Archives</h2>
                <Button variant="outline" size="sm">Refresh</Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">KEY</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">SIZE</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">UPLOADED</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archives.map((archive, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-3 text-xs font-mono max-w-[400px] truncate">{archive.key}</td>
                        <td className="py-3 text-sm">{archive.size}</td>
                        <td className="py-3 text-sm">{archive.uploaded}</td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="text-xs">Download</Button>
                            <Button variant="outline" size="sm" className="text-destructive text-xs">Delete</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Logs;
