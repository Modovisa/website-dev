import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, MousePointerClick, TrendingUp } from "lucide-react";

const Dashboard = () => {
  const stats = [
    { name: "Total Visitors", value: "13,508", icon: Users, change: "+12.5%" },
    { name: "Page Views", value: "45,231", icon: Eye, change: "+8.2%" },
    { name: "Avg. Session", value: "4m 32s", icon: MousePointerClick, change: "+2.4%" },
    { name: "Conversion Rate", value: "3.24%", icon: TrendingUp, change: "+0.8%" },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-success mt-1">
                  {stat.change} from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">New visitor from Japan, Osaka</p>
                      <p className="text-xs text-muted-foreground">2 minutes ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { path: "/homepage", views: "1,234" },
                  { path: "/products", views: "892" },
                  { path: "/about", views: "654" },
                  { path: "/contact", views: "432" },
                ].map((page) => (
                  <div key={page.path} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-medium">{page.path}</span>
                    <span className="text-sm text-muted-foreground">{page.views} views</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
