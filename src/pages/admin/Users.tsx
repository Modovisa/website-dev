import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Users as UsersIcon, UserPlus, CheckCircle, XCircle, MoreVertical, Ban, ShieldAlert, Power, KeyRound, Eye, Archive, RotateCcw, Clock, Trash2, Printer, FileSpreadsheet, FileText, Copy } from "lucide-react";

const Users = () => {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const stats = [
    { title: "Total Users", value: "37", subtitle: "All time", icon: UsersIcon, color: "text-primary" },
    { title: "New Signups", value: "3", subtitle: "Last 7 days", icon: UserPlus, color: "text-cyan-500" },
    { title: "Paying Subscribers", value: "0", subtitle: "Stripe status = active", icon: CheckCircle, color: "text-success" },
    { title: "Blocked / Suspended", value: "7", subtitle: "Users needing review", icon: XCircle, color: "text-destructive" },
  ];

  const users = [
    { name: "retrorex-team", email: "info@retrorex.ca", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "RT", avatarColor: "bg-orange-100 text-orange-600" },
    { name: "ahmetcandogan666", email: "ahmetcandogan666@gmail.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "A", avatarColor: "bg-gray-100 text-gray-600" },
    { name: "Glamorosi", email: "glamorosi@gmail.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "G", avatarColor: "bg-red-100 text-red-600" },
    { name: "punkpixie018", email: "punkpixie018@gmail.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "P", avatarColor: "bg-pink-100 text-pink-600" },
    { name: "jakkub", email: "jakub.kubzik@gmail.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "J", avatarColor: "bg-gray-100 text-gray-600" },
    { name: "contact.girlsof", email: "contact.girlsof@gmail.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "CG", avatarColor: "bg-blue-100 text-blue-600" },
    { name: "apprev1", email: "apprevtest100@shopify.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "A", avatarColor: "bg-red-100 text-red-600" },
    { name: "apprev", email: "apprevtest1@shopify.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "A", avatarColor: "bg-red-100 text-red-600" },
    { name: "buhlig569@gmail.com", email: "buhlig569@gmail.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Suspended", avatar: "BG", avatarColor: "bg-gray-100 text-gray-600" },
    { name: "flarewand", email: "flarewand@gmail.com", role: "Subscriber", plan: "Free Plan", billing: "N/A", events: "None", status: "Active", avatar: "F", avatarColor: "bg-orange-100 text-orange-600" },
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
                    stat.color === 'text-cyan-500' ? 'bg-cyan-500/10' : 
                    stat.color === 'text-success' ? 'bg-success/10' : 
                    'bg-destructive/10'
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

        {/* Platform Users Table */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Platform Users</h2>

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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex-1 sm:flex-none">
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
                    <Sheet open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                      <SheetTrigger asChild>
                        <Button className="flex-1 sm:flex-none">
                          + Add New User
                        </Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Add User</SheetTitle>
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
                            <Label htmlFor="contact">Contact</Label>
                            <Input id="contact" placeholder="+1 (609) 988-44-11" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="company">Company</Label>
                            <Input id="company" placeholder="Web Developer" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="us">United States</SelectItem>
                                <SelectItem value="uk">United Kingdom</SelectItem>
                                <SelectItem value="ca">Canada</SelectItem>
                                <SelectItem value="au">Australia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="role">User Role</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="subscriber">Subscriber</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="plan">Select Plan</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select Plan" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free Plan</SelectItem>
                                <SelectItem value="basic">Basic Plan</SelectItem>
                                <SelectItem value="premium">Premium Plan</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <Button className="flex-1" onClick={() => setIsAddUserOpen(false)}>
                              Submit
                            </Button>
                            <Button variant="outline" className="flex-1 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700" onClick={() => setIsAddUserOpen(false)}>
                              Cancel
                            </Button>
                          </div>
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
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">PLAN</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">BILLING</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">EVENTS</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">STATUS</th>
                      <th className="pb-3 text-sm font-semibold text-muted-foreground">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-4 pl-2">
                          <input type="checkbox" className="rounded border-input" />
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className={`${user.avatarColor} text-sm font-medium`}>
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 text-sm">{user.role}</td>
                        <td className="py-4 text-sm">{user.plan}</td>
                        <td className="py-4 text-sm">{user.billing}</td>
                        <td className="py-4">
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            {user.events}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                            Set...
                          </Button>
                        </td>
                        <td className="py-4">
                          <Badge className={
                            user.status === 'Active' ? 'bg-success/20 text-success border border-success/30 backdrop-blur-sm hover:bg-success/30' : 
                            user.status === 'Suspended' ? 'bg-warning/20 text-warning border border-warning/30 backdrop-blur-sm hover:bg-warning/30' : 
                            'bg-destructive/20 text-destructive border border-destructive/30 backdrop-blur-sm hover:bg-destructive/30'
                          }>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="text-warning">
                                <Ban className="mr-2 h-4 w-4" />
                                Suspend
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                Block
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-success">
                                <Power className="mr-2 h-4 w-4" />
                                Activate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Account
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-warning">
                                <Archive className="mr-2 h-4 w-4" />
                                Deactivate (soft)
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-success">
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Restore
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-warning">
                                <Clock className="mr-2 h-4 w-4" />
                                Schedule Hard Delete...
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hard Delete Now
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 text-sm gap-4">
                <span className="text-muted-foreground">Showing 1 to 10 of 37 entries</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled>&lt;</Button>
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
      </div>
    </AdminLayout>
  );
};

export default Users;
