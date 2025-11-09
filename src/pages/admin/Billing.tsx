import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DollarSign, CheckCircle, AlertCircle, TrendingUp, Printer, FileSpreadsheet, FileText, Copy } from "lucide-react";

const Billing = () => {
  const stats = [
    { title: "MRR", value: "$0.00", subtitle: "ARPU: $0.00", icon: TrendingUp, color: "text-primary" },
    { title: "Active Subs", value: "0", subtitle: "Trials: 0", icon: CheckCircle, color: "text-success" },
    { title: "Past Due", value: "0", subtitle: "Renewals 7d: 0", icon: AlertCircle, color: "text-warning" },
    { title: "Revenue (Month)", value: "$0.00", subtitle: "Churn 30d: 0", icon: DollarSign, color: "text-cyan-500" },
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
                  {idx === 3 && (
                    <Select defaultValue="month">
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="month">Month</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
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

        {/* Subscriptions Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Subscriptions</h2>

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
                  <Input placeholder="Search subscriptions" className="w-full sm:w-64" />
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
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">USER</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">PLAN</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">INTERVAL</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">STATUS</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">STARTED</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">RENEWS</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">MRR</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">LAST INVOICE</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-muted-foreground">
                        No data available in table
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 text-sm">
                <span className="text-muted-foreground">Showing 0 to 0 of 0 entries</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled>&lt;</Button>
                  <Button variant="outline" size="sm" disabled>&gt;</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Billing;
