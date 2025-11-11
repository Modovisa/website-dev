// src/pages/app/Profile.tsx

import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, MoreVertical, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Profile = () => {
  const [websites, setWebsites] = useState([
    {
      name: "Koshmart",
      domain: "koshmart.com",
      token: "a0c4f0ca-6381-413f-9428-1c72237316 9a",
      timezone: "Asia/Calcutta",
      initial: "K",
    },
    {
      name: "Koshmart Dev",
      domain: "dev.koshmart.com",
      token: "f315c647-3170-4bac-a5ba-fca0a1df2050",
      timezone: "Europe/London",
      initial: "KD",
    },
  ]);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", timezone: "" });
  
  // Security state
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [showPasswordAlert, setShowPasswordAlert] = useState(true);

  const handleEditClick = (index: number) => {
    setEditingWebsite(index);
    setEditForm({
      name: websites[index].name,
      timezone: websites[index].timezone,
    });
    setEditModalOpen(true);
  };

  const handleSaveChanges = () => {
    if (editingWebsite !== null) {
      const updatedWebsites = [...websites];
      updatedWebsites[editingWebsite] = {
        ...updatedWebsites[editingWebsite],
        name: editForm.name,
        timezone: editForm.timezone,
      };
      setWebsites(updatedWebsites);
    }
    setEditModalOpen(false);
  };

  const handleDeleteClick = (index: number) => {
    const updatedWebsites = websites.filter((_, i) => i !== index);
    setWebsites(updatedWebsites);
  };

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Left sidebar - Profile card */}
        <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r bg-card p-4 md:p-6">
          <Card className="border-primary/20">
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                    K
                  </AvatarFallback>
                </Avatar>
                <Badge className="bg-success">Active</Badge>
                <div className="text-center">
                  <div className="bg-primary/10 rounded-lg p-3 inline-block mb-2">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">13,508</p>
                  <p className="text-sm text-muted-foreground">Events this month</p>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t">
                <h3 className="font-semibold">Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Username:</span>
                    <span className="ml-2 font-medium">koshmart</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">we.care@koshmart.com</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="ml-2">Free</span>
                    <Badge className="ml-2 bg-success text-xs">Forever</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2 font-medium">May 8 2025</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Login:</span>
                    <span className="ml-2 font-medium">Oct 24 2025</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content - Tabs */}
        <div className="flex-1 p-4 md:p-8">
          <Tabs defaultValue="tracked-sites" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="tracked-sites">Tracked Sites</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="billing">Billing & Plans</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="tracked-sites" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Website Tracking List</h2>
                <input
                  type="search"
                  placeholder="Search Websites"
                  className="px-4 py-2 border rounded-lg w-64"
                />
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b bg-muted/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold">WEBSITE NAME</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">DOMAIN</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">TRACKING TOKEN</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">TIMEZONE</th>
                          <th className="px-6 py-4 text-left text-sm font-semibold">ACTION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {websites.map((site, index) => (
                          <tr key={index} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {site.initial}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{site.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">{site.domain}</td>
                            <td className="px-6 py-4">
                              <code className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
                                {site.token}
                              </code>
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="secondary">{site.timezone}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => handleEditClick(index)} className="cursor-pointer">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(index)} 
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing 1 to 2 of 2 entries</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="default" size="sm">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="account" className="space-y-4">
              <h2 className="text-2xl font-bold">Google Account</h2>
              
              <Card>
                <CardContent className="pt-6">
                  <Button variant="outline">
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </CardContent>
              </Card>

              <h2 className="text-2xl font-bold pt-4">Close your account</h2>
              
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Deactivating will disable your account temporarily. Deleting will permanently remove your account and all data.
                  </p>
                  <div className="flex gap-4">
                    <Button variant="outline" className="text-warning border-warning hover:bg-warning/10">
                      Deactivate my account
                    </Button>
                    <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                      Delete my account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              {/* Change Password Section */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <h2 className="text-2xl font-semibold">Change Password</h2>
                  
                  {showPasswordAlert && (
                    <Alert className="bg-warning/10 border-warning/20">
                      <AlertDescription className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-warning mb-1">Ensure that these requirements are met</p>
                          <p className="text-sm text-warning/90">Minimum 8 characters long, uppercase & symbol</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 hover:bg-transparent"
                          onClick={() => setShowPasswordAlert(false)}
                        >
                          <X className="h-4 w-4 text-warning" />
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="old-password">Old Password</Label>
                      <div className="relative">
                        <Input
                          id="old-password"
                          type={showOldPassword ? "text" : "password"}
                          placeholder="Old Password"
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                        >
                          {showOldPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button className="bg-primary hover:bg-primary/90">
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Two-factor Authentication Section */}
              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">Two-factor Authentication</h2>
                    <Badge className="bg-success text-success-foreground">Enabled</Badge>
                  </div>
                  
                  <p className="text-muted-foreground">
                    Secure your account with an authenticator app.
                  </p>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="2fa-code">Enter code from authenticator app</Label>
                      <Input
                        id="2fa-code"
                        type="text"
                        placeholder="123456"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
                        Show QR Code
                      </Button>
                      <Button className="bg-primary hover:bg-primary/90">
                        Verify Code
                      </Button>
                      <Button variant="link" className="text-destructive hover:text-destructive/90 p-0">
                        Reset 2FA
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="billing" className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <h2 className="text-2xl font-semibold mb-6">Current Plan</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left side - Plan details */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">Your Current Plan is</span>
                        <Badge className="bg-success text-success-foreground text-sm px-3 py-1">
                          Free Forever
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">Free Forever</h3>
                        <p className="text-muted-foreground">
                          Enjoy unlimited events and full access — forever free.
                        </p>
                      </div>
                    </div>

                    {/* Right side - Usage stats */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Lifetime Events</h3>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-[hsl(190,100%,45%)] text-white text-lg px-4 py-2 font-bold">
                          6,710
                        </Badge>
                        <span className="text-base">events used so far</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        since May 8, 2025 (6 months 7 days)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Website Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Website</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="website-name" className="text-base">
                Website Name
              </Label>
              <Input
                id="website-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-base font-semibold">
                Timezone
              </Label>
              <Select
                value={editForm.timezone}
                onValueChange={(value) => setEditForm({ ...editForm, timezone: value })}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Calcutta">(GMT+05:30) Asia/Calcutta</SelectItem>
                  <SelectItem value="Europe/London">(GMT+00:00) Europe/London</SelectItem>
                  <SelectItem value="America/New_York">(GMT-05:00) America/New_York</SelectItem>
                  <SelectItem value="America/Los_Angeles">(GMT-08:00) America/Los_Angeles</SelectItem>
                  <SelectItem value="Asia/Tokyo">(GMT+09:00) Asia/Tokyo</SelectItem>
                  <SelectItem value="Australia/Sydney">(GMT+11:00) Australia/Sydney</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground pt-2">
                Date ranges, time ranges, and visitor activity times will follow this timezone. You can change it later if needed.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setEditModalOpen(false)}
              className="bg-muted hover:bg-muted/80"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} className="bg-primary hover:bg-primary/90">
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Profile;