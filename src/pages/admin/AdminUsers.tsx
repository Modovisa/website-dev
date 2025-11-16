// src/pages/admin/AdminUsers.tsx

import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Shield, UserCheck, Lock, Activity } from "lucide-react";

const AdminUsers = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const stats = [
    { title: "Total Admins", value: "1", subtitle: "All roles", icon: Shield, color: "text-primary" },
    { title: "Active Admins", value: "1", subtitle: "Can sign in now", icon: UserCheck, color: "text-success" },
    { title: "2FA Coverage", value: "1/1", percentage: "(100%)", subtitle: "We recommend ≥ 100%", icon: Lock, color: "text-warning" },
    { title: "Admin Actions (24h)", value: "0", subtitle: "From audit trail", icon: Activity, color: "text-cyan-500" },
  ];

  const adminUsers = [
    {
      name: "mv-admin",
      email: "so@modovisa.com",
      role: "superadmin",
      created: "12 May 2025",
      lastLogin: "19 Oct 2025",
      status: "Active",
      avatar: "MA",
    },
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
                  <div className="flex items-baseline gap-1">
                    <p className="text-3xl font-bold">{stat.value}</p>
                    {stat.percentage && <span className="text-sm text-muted-foreground">{stat.percentage}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Users Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Admin Users</h2>

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

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Input placeholder="Search User" className="w-full sm:w-64" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 sm:flex-none">
                      <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Export
                    </Button>
                    <Sheet open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                      <SheetTrigger asChild>
                        <Button className="flex-1 sm:flex-none">
                          + Add New User
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Add New User</SheetTitle>
                          <SheetDescription>
                            Enter user details to add them to the platform
                          </SheetDescription>
                        </SheetHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" placeholder="John Doe" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" placeholder="john.doe@example.com" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="subscriber">Subscriber</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="plan">Plan</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select plan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free Plan</SelectItem>
                                <SelectItem value="basic">Basic Plan</SelectItem>
                                <SelectItem value="premium">Premium Plan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button className="w-full" onClick={() => setIsAddUserOpen(false)}>
                            Add User
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
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
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">ROLE</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">CREATED</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">LAST LOGIN</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">STATUS</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((user, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-4 pl-2">
                          <input type="checkbox" className="rounded border-input" />
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <Badge variant="secondary">{user.role}</Badge>
                        </td>
                        <td className="py-4 text-sm">{user.created}</td>
                        <td className="py-4 text-sm">{user.lastLogin}</td>
                        <td className="py-4">
                          <Badge className="bg-success/20 text-success border border-success/30 backdrop-blur-sm hover:bg-success/30">{user.status}</Badge>
                        </td>
                        <td className="py-4">
                          <Button variant="ghost" size="sm">—</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-4 text-sm">
                <span className="text-muted-foreground">Showing 1 to 1 of 1 entry</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled>&lt;</Button>
                  <Button size="sm">1</Button>
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

export default AdminUsers;
