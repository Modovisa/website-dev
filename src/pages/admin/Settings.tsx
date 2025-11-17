// src/pages/admin/Settings.tsx

import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const Settings = () => {
  const urlPatterns = [
    { id: 1, pattern: "partner-account", siteId: "*", pattern2: "*user*right*", group: "*", page: "EDIT", mask: "*", created: "2025-03-09 10:18" },
    { id: 2, pattern: "partner-account-2", siteId: "*", pattern2: "*Slider*", group: "EDIT", page: "*", mask: "*", created: "2025-03-09 10:18" },
    { id: 3, pattern: "partner-account-DEMO", siteId: "*", pattern2: "*user*view*OART*", group: "EDIT", page: "*", mask: "*", created: "2025-03-10 13:10" },
  ];

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform configuration and preferences</p>
        </div>

        {/* General */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">General</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency/Unit</Label>
                <Input id="currency" defaultValue="$" className="w-24" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default-timezone">Default Timezone</Label>
                <Input id="default-timezone" defaultValue="USD" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Maintenance</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="maintenance-mode">Enable maintenance mode</Label>
                <p className="text-sm text-muted-foreground">Never on</p>
              </div>
              <Switch id="maintenance-mode" />
            </div>
          </CardContent>
        </Card>

        {/* User Deactivation & Scheduled delete / Username reuse (days) */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">User: Deactivation | Scheduled delete | Username reuse (days)</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-grace">User grace: in days</Label>
                <div className="flex items-center gap-2">
                  <Input id="user-grace" type="number" defaultValue="5" className="w-24" />
                  <span className="text-sm text-muted-foreground">
                    After user clicks Deactivate, how long do we wait before disabling them?
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delete-after">Delete after (days from deact.)</Label>
                <div className="flex items-center gap-2">
                  <Input id="delete-after" type="number" defaultValue="7" className="w-24" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username-reuse">Username reuse (days)</Label>
                <div className="flex items-center gap-2">
                  <Input id="username-reuse" type="number" defaultValue="1" className="w-24" />
                  <span className="text-sm text-muted-foreground">
                    If a user is deleted, allow a new person to re-use that username after N days.
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Retention */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Privacy & Retention</h3>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="anonymize">7 anonymize.run</Label>
                  <p className="text-sm text-muted-foreground">
                    Leave empty to disable
                  </p>
                  <Input id="anonymize" type="number" defaultValue="0" className="w-24 mt-2" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="redact">98 redaction.crons.pipeline.ps</Label>
                  <p className="text-sm text-muted-foreground">
                    Log-masking (cron)
                  </p>
                  <Input id="redact" type="number" defaultValue="0" className="w-24 mt-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL Patterns */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">🔒 URL Patterns</h3>
              <Button variant="outline" size="sm">🔒 Upload</Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Listing is based on "50 to 164" params. Set up URL patterns.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold text-muted-foreground">#</th>
                    <th className="pb-2 font-semibold text-muted-foreground">ID (PATTERN NAME[ES])</th>
                    <th className="pb-2 font-semibold text-muted-foreground">SITE ID</th>
                    <th className="pb-2 font-semibold text-muted-foreground">PATTERN</th>
                    <th className="pb-2 font-semibold text-muted-foreground">GROUP</th>
                    <th className="pb-2 font-semibold text-muted-foreground">PAGE</th>
                    <th className="pb-2 font-semibold text-muted-foreground">MASK</th>
                    <th className="pb-2 font-semibold text-muted-foreground">CREATED</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {urlPatterns.map((pattern) => (
                    <tr key={pattern.id} className="border-b last:border-0">
                      <td className="py-3">{pattern.id}</td>
                      <td className="py-3">
                        <Input defaultValue={pattern.pattern} className="h-8 text-xs" />
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">{pattern.siteId}</Badge>
                      </td>
                      <td className="py-3">
                        <Input defaultValue={pattern.pattern2} className="h-8 text-xs" />
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">{pattern.group}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">{pattern.page}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">{pattern.mask}</Badge>
                      </td>
                      <td className="py-3 text-muted-foreground">{pattern.created}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Keys */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">stripe Stripe Keys (Publishable only)</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stripe-live">Live</Label>
                <Input 
                  id="stripe-live" 
                  type="password" 
                  defaultValue="••••••••••••••••••••••••••••••••••••••••"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Cannot start subscription on LIVE except by test cards. Don't swap until a test sub runs successfully on live Stripe, backed by current Site-link in production.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stripe Billing & Pricing Tiers */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">stripe Stripe Billing & Pricing Tiers</h3>
              <Button variant="outline" size="sm">🔒 Upload</Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Listing is based on "50 to 164" params. Set up URL patterns.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold text-muted-foreground">#</th>
                    <th className="pb-2 font-semibold text-muted-foreground">MRR</th>
                    <th className="pb-2 font-semibold text-muted-foreground">MAX EVENTS</th>
                    <th className="pb-2 font-semibold text-muted-foreground">MONTHLY MAX</th>
                    <th className="pb-2 font-semibold text-muted-foreground">"YEARLY" MAX(Y)</th>
                    <th className="pb-2 font-semibold text-muted-foreground">TRIAL %</th>
                    <th className="pb-2 font-semibold text-muted-foreground">FEATURE LABEL</th>
                    <th className="pb-2 font-semibold text-muted-foreground">PLAN ID</th>
                    <th className="pb-2 font-semibold text-muted-foreground">STRIPE PRICE ID (MONTHLY)</th>
                    <th className="pb-2 font-semibold text-muted-foreground">STRIPE PRICE ID (YEARLY)</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-3">{idx + 1}</td>
                      <td className="py-3">
                        <Input defaultValue="0" className="h-7 w-16 text-xs" />
                      </td>
                      <td className="py-3">
                        <Input defaultValue={idx === 0 ? "1000" : "10000"} className="h-7 w-20 text-xs" />
                      </td>
                      <td className="py-3">
                        <Input defaultValue={idx === 0 ? "19" : "..."} className="h-7 w-16 text-xs" />
                      </td>
                      <td className="py-3">
                        <Input defaultValue={idx === 0 ? "0" : "..."} className="h-7 w-16 text-xs" />
                      </td>
                      <td className="py-3">
                        <Input defaultValue={idx === 0 ? "25" : "..."} className="h-7 w-16 text-xs" />
                      </td>
                      <td className="py-3">
                        <Input defaultValue={idx === 0 ? "ISO 9001" : "..."} className="h-7 w-32 text-xs" />
                      </td>
                      <td className="py-3">
                        <Badge variant="secondary" className="text-xs">{idx === 0 ? "starter" : "..."}</Badge>
                      </td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">...</td>
                      <td className="py-3 font-mono text-xs text-muted-foreground">...</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-lg">Security</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="2fa-required">Require 2FA for admin accounts</Label>
              </div>
              <Switch id="2fa-required" />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;
