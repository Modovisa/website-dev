// src/pages/admin/Settings.tsx

import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link as LinkIcon } from "lucide-react";
import { secureFetch } from "@/lib/auth/auth";

type UrlPatternRow = {
  id: string | null;
  siteId: number | null;
  pattern: string;
  pageGroup: "cart" | "checkout" | "thankyou" | "product" | "other";
  skip: boolean;
  mask: boolean;
  createdAt: string | null;
};

type TierRow = {
  id: number | null;
  minEvents: number | null;
  maxEvents: number | null;
  monthlyPrice: number | null;
  yearlyPerMonth: number | null;
  yearlyDiscountPercent: number | null;
  featureLabel: string | null;
  planId: number | null;
  stripePriceIdMonth: string | null;
  stripePriceIdYear: string | null;
};

type UserLifecycleState = {
  deactivateGrace: string;
  hardDelete: string;
  usernameCooldown: string;
};

type StripeSettingsState = {
  mode: "test" | "live";
  testPk: string;
  livePk: string;
};

const fallbackUrlPatterns: UrlPatternRow[] = [
  {
    id: "checkout",
    siteId: null,
    pattern: "/checkout",
    pageGroup: "checkout",
    skip: false,
    mask: false,
    createdAt: "2025-01-02 10:15",
  },
  {
    id: "thankyou",
    siteId: null,
    pattern: "/order-received.*",
    pageGroup: "thankyou",
    skip: false,
    mask: false,
    createdAt: "2025-01-02 10:16",
  },
];

const fallbackTiers: TierRow[] = [
  {
    id: 1,
    minEvents: 0,
    maxEvents: 3000,
    monthlyPrice: 0,
    yearlyPerMonth: 0,
    yearlyDiscountPercent: 0,
    featureLabel: "Free plan",
    planId: 1,
    stripePriceIdMonth: null,
    stripePriceIdYear: null,
  },
];

const Settings = () => {
  // global dirty + sticky bar
  const [isDirty, setIsDirty] = useState(false);

  // ----- General / lifecycle + privacy -----
  const [userLifecycle, setUserLifecycle] = useState<UserLifecycleState>({
    deactivateGrace: "",
    hardDelete: "",
    usernameCooldown: "",
  });

  // ----- URL patterns -----
  const [urlPatterns, setUrlPatterns] =
    useState<UrlPatternRow[]>(fallbackUrlPatterns);
  const [urlPatternsLocked, setUrlPatternsLocked] = useState(true);
  const [urlPatternsDirty, setUrlPatternsDirty] = useState(false);

  // ----- Pricing tiers -----
  const [tiers, setTiers] = useState<TierRow[]>(fallbackTiers);
  const [tiersLocked, setTiersLocked] = useState(true);
  const [tiersDirty, setTiersDirty] = useState(false);

  // ----- Stripe keys/mode -----
  const [stripeLocked, setStripeLocked] = useState(true);
  const [stripeDirty, setStripeDirty] = useState(false);
  const [stripeSettings, setStripeSettings] = useState<StripeSettingsState>({
    mode: "test",
    testPk: "",
    livePk: "",
  });

  const touchDirty = () => setIsDirty(true);

  const markStripeDirty = () => {
    setStripeDirty(true);
    touchDirty();
  };

  const markTiersDirty = () => {
    setTiersDirty(true);
    touchDirty();
  };

  const markUrlPatternsDirty = () => {
    setUrlPatternsDirty(true);
    touchDirty();
  };

  // --------------------------------
  // LOAD DATA FROM ADMIN ENDPOINTS
  // --------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadAdminSettings() {
      try {
        const res = await secureFetch("/api/admin/settings");
        if (res.status === 404) {
          console.info("[admin/settings] 404 – leaving defaults.");
          return;
        }
        const j = await res.json();
        if (!res.ok) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        if (cancelled) return;
        const s = j.settings || {};

        setUserLifecycle({
          deactivateGrace:
            s.DEACTIVATE_GRACE_DAYS != null
              ? String(s.DEACTIVATE_GRACE_DAYS)
              : "",
          hardDelete:
            s.HARD_DELETE_GRACE_DAYS != null
              ? String(s.HARD_DELETE_GRACE_DAYS)
              : "",
          usernameCooldown:
            s.USERNAME_COOLDOWN_DAYS != null
              ? String(s.USERNAME_COOLDOWN_DAYS)
              : "",
        });

        setStripeSettings({
          mode: (s.STRIPE_PUBLISHABLE_MODE || "test") as "test" | "live",
          testPk: s.STRIPE_TEST_PUBLISHABLE_KEY || "",
          livePk: s.STRIPE_LIVE_PUBLISHABLE_KEY || "",
        });
      } catch (err) {
        console.error("Failed to load /api/admin/settings", err);
      }
    }

    async function loadUrlPatterns() {
      try {
        const res = await secureFetch("/api/admin/url-patterns");
        const j = await res.json();
        if (!res.ok) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        if (cancelled) return;
        const patterns = (j.patterns || []).map((p: any): UrlPatternRow => ({
          id: p.id ?? null,
          siteId: p.site_id != null ? Number(p.site_id) : null,
          pattern: p.pattern || "",
          pageGroup: (p.page_group || "other") as UrlPatternRow["pageGroup"],
          skip: !!p.skip,
          mask: !!p.mask,
          createdAt: p.created_at || null,
        }));
        setUrlPatterns(patterns.length ? patterns : fallbackUrlPatterns);
      } catch (err) {
        console.error("Failed to load /api/admin/url-patterns", err);
        // fall back to static demo rows
        setUrlPatterns(fallbackUrlPatterns);
      }
    }

    async function loadTiers() {
      try {
        const res = await secureFetch("/api/admin/billing/tiers");
        const j = await res.json();
        if (!res.ok) {
          throw new Error(j.error || `HTTP ${res.status}`);
        }
        if (cancelled) return;
        const mapped: TierRow[] = (j.tiers || []).map((t: any) => ({
          id: t.id ?? null,
          minEvents:
            t.min_events != null ? Number(t.min_events) : (null as number | null),
          maxEvents:
            t.max_events != null ? Number(t.max_events) : (null as number | null),
          monthlyPrice:
            t.monthly_price != null
              ? Number(t.monthly_price)
              : (null as number | null),
          yearlyPerMonth:
            t.yearly_per_month != null
              ? Number(t.yearly_per_month)
              : (null as number | null),
          yearlyDiscountPercent:
            t.yearly_discount_percent != null
              ? Number(t.yearly_discount_percent)
              : (null as number | null),
          featureLabel: t.feature_label ?? null,
          planId: t.plan_id != null ? Number(t.plan_id) : null,
          stripePriceIdMonth: t.stripe_price_id_month || null,
          stripePriceIdYear: t.stripe_price_id_year || null,
        }));
        setTiers(mapped.length ? mapped : fallbackTiers);
      } catch (err) {
        console.error("Failed to load /api/admin/billing/tiers", err);
        setTiers(fallbackTiers);
      }
    }

    loadAdminSettings();
    loadUrlPatterns();
    loadTiers();

    return () => {
      cancelled = true;
    };
  }, []);

  // --------------------------------
  // DISCARD / SAVE (still local only)
  // --------------------------------
  const handleDiscard = () => {
    // Right now this just resets local state to last loaded values.
    // Once we wire real PATCH/POST endpoints, we’ll re-fetch here.
    window.location.reload();
  };

  const handleSave = () => {
    // Placeholder – this is where we’ll POST to:
    // - /api/admin/settings
    // - /api/admin/url-patterns
    // - /api/admin/billing/tiers
    // For now, just clear dirty flags.
    setUrlPatternsDirty(false);
    setTiersDirty(false);
    setStripeDirty(false);
    setIsDirty(false);
  };

  // --------------------------------
  // URL pattern helpers
  // --------------------------------
  const addUrlPatternRow = () => {
    if (urlPatternsLocked) return;
    const next: UrlPatternRow = {
      id: null,
      siteId: null,
      pattern: "",
      pageGroup: "other",
      skip: false,
      mask: false,
      createdAt: null,
    };
    setUrlPatterns((rows) => [...rows, next]);
    markUrlPatternsDirty();
  };

  const updateUrlPattern = (index: number, patch: Partial<UrlPatternRow>) => {
    setUrlPatterns((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
    markUrlPatternsDirty();
  };

  // --------------------------------
  // Tiers helpers
  // --------------------------------
  const addTierRow = () => {
    if (tiersLocked) return;

    const sortedByMax = [...tiers].sort(
      (a, b) => (a.maxEvents ?? 0) - (b.maxEvents ?? 0)
    );
    const last =
      sortedByMax.length > 0
        ? sortedByMax[sortedByMax.length - 1]
        : undefined;

    const start = last?.maxEvents != null ? last.maxEvents + 1 : 0;
    const end = start + 3000;

    const next: TierRow = {
      id: null,
      minEvents: start,
      maxEvents: end,
      monthlyPrice: 0,
      yearlyPerMonth: 0,
      yearlyDiscountPercent: 20,
      featureLabel: "New plan",
      planId: null,
      stripePriceIdMonth: null,
      stripePriceIdYear: null,
    };

    setTiers((rows) => [...rows, next]);
    markTiersDirty();
  };

  const updateTier = (index: number, patch: Partial<TierRow>) => {
    setTiers((rows) =>
      rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
    );
    markTiersDirty();
  };

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Sticky save bar */}
        {isDirty && (
          <div className="sticky top-0 z-30 -mx-4 -mt-4 mb-4 bg-background/90 backdrop-blur border-b px-4 py-3 lg:-mx-8 lg:px-8">
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </div>
        )}

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <form className="space-y-6">
          {/* General */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-lg">General</h2>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company / Brand</Label>
                <Input
                  id="company_name"
                  placeholder="Modovisa"
                  onChange={touchDirty}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support_email">Support Email</Label>
                <Input
                  id="support_email"
                  type="email"
                  placeholder="support@example.com"
                  onChange={touchDirty}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_timezone">Default Timezone</Label>
                <Input
                  id="default_timezone"
                  placeholder="UTC"
                  onChange={touchDirty}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_currency">Default Currency</Label>
                <Input
                  id="default_currency"
                  placeholder="USD"
                  onChange={touchDirty}
                />
              </div>
            </CardContent>
          </Card>

          {/* Maintenance */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-lg">Maintenance</h2>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center">
                <div className="flex items-center gap-3">
                  <Switch id="maintenance_mode" onCheckedChange={touchDirty} />
                  <Label htmlFor="maintenance_mode">
                    Enable maintenance mode
                  </Label>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="maintenance_banner">Banner Text</Label>
                <Input
                  id="maintenance_banner"
                  placeholder="We'll be back soon…"
                  onChange={touchDirty}
                />
              </div>
            </CardContent>
          </Card>

          {/* User lifecycle */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-lg">
                User: Deactivation | Scheduled delete | Username reuse (days)
              </h2>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="deactivate_grace">
                  Deactivation grace (days)
                </Label>
                <Input
                  id="deactivate_grace"
                  type="number"
                  min={0}
                  value={userLifecycle.deactivateGrace}
                  placeholder="30"
                  onChange={(e) => {
                    setUserLifecycle((s) => ({
                      ...s,
                      deactivateGrace: e.target.value,
                    }));
                    touchDirty();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  While deactivated, user can be restored inside this window.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hard_delete_grace">
                  Scheduled hard delete (days)
                </Label>
                <Input
                  id="hard_delete_grace"
                  type="number"
                  min={0}
                  value={userLifecycle.hardDelete}
                  placeholder="30"
                  onChange={(e) => {
                    setUserLifecycle((s) => ({
                      ...s,
                      hardDelete: e.target.value,
                    }));
                    touchDirty();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  When you schedule a delete, it will permanently wipe after
                  this many days.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username_cooldown">
                  Username reuse cooldown (days)
                </Label>
                <Input
                  id="username_cooldown"
                  type="number"
                  min={0}
                  value={userLifecycle.usernameCooldown}
                  placeholder="30"
                  onChange={(e) => {
                    setUserLifecycle((s) => ({
                      ...s,
                      usernameCooldown: e.target.value,
                    }));
                    touchDirty();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Prevents reusing deleted usernames for this period.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Privacy & Retention */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-lg">Privacy &amp; Retention</h2>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center">
                <div className="flex items-center gap-3">
                  <Switch id="ip_anonymization" onCheckedChange={touchDirty} />
                  <Label htmlFor="ip_anonymization">IP anonymization</Label>
                </div>
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-3">
                  <Switch id="pii_redaction" onCheckedChange={touchDirty} />
                  <Label htmlFor="pii_redaction">
                    PII redaction (emails/phone)
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="events_retention_days">
                  Events retention (days)
                </Label>
                <Input
                  id="events_retention_days"
                  type="number"
                  min={0}
                  onChange={touchDirty}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logs_retention_days">
                  Logs retention (days)
                </Label>
                <Input
                  id="logs_retention_days"
                  type="number"
                  min={0}
                  onChange={touchDirty}
                />
              </div>
            </CardContent>
          </Card>

          {/* URL Patterns (lockable) */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-lg">URL Patterns</h2>
              </div>
              <div className="flex items-center gap-2">
                {urlPatternsDirty && !urlPatternsLocked && (
                  <Badge
                    variant="outline"
                    className="bg-amber-100/70 text-amber-800"
                  >
                    Editing (unsaved)
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setUrlPatternsLocked((v) => !v)}
                >
                  {urlPatternsLocked ? "Unlock" : "Lock"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={urlPatternsLocked ? "hidden" : ""}
                  onClick={addUrlPatternRow}
                >
                  + Add Pattern
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {urlPatternsLocked ? (
                  <>
                    Editing is <strong>locked</strong>. Click “Unlock” to make
                    changes.
                  </>
                ) : (
                  <>
                    Add regex-style path matches (e.g.{" "}
                    <code>/checkout</code>, <code>/order-received.*</code>,{" "}
                    <code>^/afrekenen/?$</code>). Leave <strong>Site ID</strong>{" "}
                    empty for a global pattern across all sites, or set a
                    specific site ID to scope it.
                  </>
                )}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="py-2 w-8">↕︎</th>
                      <th className="py-2 min-w-[220px]">
                        ID (text primary key)
                      </th>
                      <th className="py-2 w-28">Site ID</th>
                      <th className="py-2 min-w-[240px]">Pattern</th>
                      <th className="py-2 w-36">Group</th>
                      <th className="py-2 w-16 text-center">Skip</th>
                      <th className="py-2 w-16 text-center">Mask</th>
                      <th className="py-2 w-44">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {urlPatterns.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">⋮⋮</td>
                        <td className="py-2">
                          <Input
                            disabled={urlPatternsLocked}
                            value={row.id ?? ""}
                            onChange={(e) =>
                              updateUrlPattern(idx, {
                                id: e.target.value || null,
                              })
                            }
                            className="h-8 text-xs"
                            placeholder="(auto if blank)"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={urlPatternsLocked}
                            type="number"
                            value={row.siteId ?? ""}
                            onChange={(e) =>
                              updateUrlPattern(idx, {
                                siteId:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                            className="h-8 text-xs"
                            placeholder="(NULL = global)"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={urlPatternsLocked}
                            value={row.pattern}
                            onChange={(e) =>
                              updateUrlPattern(idx, { pattern: e.target.value })
                            }
                            className="h-8 text-xs"
                            placeholder="/checkout or ^/afrekenen/?$"
                          />
                        </td>
                        <td className="py-2">
                          <Select
                            value={row.pageGroup}
                            onValueChange={(v) =>
                              updateUrlPattern(idx, {
                                pageGroup: v as UrlPatternRow["pageGroup"],
                              })
                            }
                            disabled={urlPatternsLocked}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cart">cart</SelectItem>
                              <SelectItem value="checkout">checkout</SelectItem>
                              <SelectItem value="thankyou">thankyou</SelectItem>
                              <SelectItem value="product">product</SelectItem>
                              <SelectItem value="other">other</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            disabled={urlPatternsLocked}
                            checked={row.skip}
                            onChange={(e) =>
                              updateUrlPattern(idx, { skip: e.target.checked })
                            }
                          />
                        </td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            disabled={urlPatternsLocked}
                            checked={row.mask}
                            onChange={(e) =>
                              updateUrlPattern(idx, { mask: e.target.checked })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled
                            value={row.createdAt ?? ""}
                            className="h-8 text-xs"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Groups:</strong> <code>cart</code>,{" "}
                    <code>checkout</code>, <code>thankyou</code>,{" "}
                    <code>product</code>, <code>other</code>.
                  </li>
                  <li>
                    <strong>Skip:</strong> 1 = ignore events on matching paths.{" "}
                    <strong>Mask:</strong> 1 = mask sensitive parts (e.g.,
                    product slugs).
                  </li>
                  <li>
                    ID is text primary key. Leave it empty to auto-generate on
                    save.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Stripe Keys (publishable only) */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/stripe.svg" alt="Stripe" className="h-7 w-auto" />
                <h2 className="font-semibold text-lg">
                  Stripe Keys (Publishable only)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {stripeDirty && !stripeLocked && (
                  <Badge
                    variant="outline"
                    className="bg-amber-100/70 text-amber-800"
                  >
                    Editing (unsaved)
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setStripeLocked((v) => !v)}
                >
                  {stripeLocked ? "Unlock" : "Lock"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {stripeLocked ? (
                  <>
                    Editing is <strong>locked</strong>. Click “Unlock” to make
                    changes.
                  </>
                ) : (
                  <>
                    Store only <strong>publishable</strong> keys here. Secrets
                    stay in Wrangler. The selected mode controls which
                    publishable key is served to the frontend.
                  </>
                )}
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={stripeSettings.mode}
                    onValueChange={(v) => {
                      setStripeSettings((s) => ({
                        ...s,
                        mode: v as "test" | "live",
                      }));
                      markStripeDirty();
                    }}
                    disabled={stripeLocked}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controls which publishable key is returned to the FE.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe_test_pk">Test Publishable Key</Label>
                  <Input
                    id="stripe_test_pk"
                    placeholder="pk_test_..."
                    disabled={stripeLocked}
                    value={stripeSettings.testPk}
                    onChange={(e) => {
                      setStripeSettings((s) => ({
                        ...s,
                        testPk: e.target.value,
                      }));
                      markStripeDirty();
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe_live_pk">Live Publishable Key</Label>
                  <Input
                    id="stripe_live_pk"
                    placeholder="pk_live_..."
                    disabled={stripeLocked}
                    value={stripeSettings.livePk}
                    onChange={(e) => {
                      setStripeSettings((s) => ({
                        ...s,
                        livePk: e.target.value,
                      }));
                      markStripeDirty();
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing → Pricing Tiers (lockable) */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/stripe.svg" alt="Stripe" className="h-7 w-auto" />
                <h2 className="font-semibold text-lg">
                  Stripe: Billing → Pricing Tiers
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {tiersDirty && !tiersLocked && (
                  <Badge
                    variant="outline"
                    className="bg-amber-100/70 text-amber-800"
                  >
                    Editing (unsaved)
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setTiersLocked((v) => !v)}
                >
                  {tiersLocked ? "Unlock" : "Lock"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className={tiersLocked ? "hidden" : ""}
                  onClick={addTierRow}
                >
                  + Add Tier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {tiersLocked ? (
                  <>
                    Editing is <strong>locked</strong>. Click “Unlock” to make
                    changes.
                  </>
                ) : (
                  <>
                    Edit event ranges, prices, labels, and Stripe price IDs.
                    Ranges must not overlap. The free tier (price = 0) cannot
                    have Stripe IDs.
                  </>
                )}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="py-2 w-12">ID</th>
                      <th className="py-2 w-28">Min events</th>
                      <th className="py-2 w-32">Max events</th>
                      <th className="py-2 w-24">Monthly $</th>
                      <th className="py-2 w-28">Yearly $/mo</th>
                      <th className="py-2 w-24">Disc %</th>
                      <th className="py-2 w-40">Feature label</th>
                      <th className="py-2 w-24">Plan ID</th>
                      <th className="py-2 min-w-[220px]">
                        Stripe Price ID (month)
                      </th>
                      <th className="py-2 min-w-[220px]">
                        Stripe Price ID (year)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tiers.map((t, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 text-muted-foreground">
                          {t.id ?? "—"}
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={tiersLocked}
                            type="number"
                            className="h-8 text-xs"
                            value={t.minEvents ?? ""}
                            onChange={(e) =>
                              updateTier(idx, {
                                minEvents:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={tiersLocked}
                            type="number"
                            className="h-8 text-xs"
                            value={t.maxEvents ?? ""}
                            onChange={(e) =>
                              updateTier(idx, {
                                maxEvents:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={tiersLocked}
                            type="number"
                            className="h-8 text-xs"
                            value={t.monthlyPrice ?? ""}
                            onChange={(e) =>
                              updateTier(idx, {
                                monthlyPrice:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled
                            className="h-8 text-xs"
                            value={t.yearlyPerMonth ?? ""}
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={tiersLocked}
                            type="number"
                            className="h-8 text-xs"
                            value={t.yearlyDiscountPercent ?? ""}
                            onChange={(e) =>
                              updateTier(idx, {
                                yearlyDiscountPercent:
                                  e.target.value === ""
                                    ? null
                                    : Number(e.target.value),
                              })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={tiersLocked}
                            className="h-8 text-xs"
                            value={t.featureLabel ?? ""}
                            onChange={(e) =>
                              updateTier(idx, { featureLabel: e.target.value })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled
                            type="number"
                            className="h-8 text-xs"
                            value={t.planId ?? ""}
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={tiersLocked}
                            className="h-8 text-xs font-mono"
                            value={t.stripePriceIdMonth ?? ""}
                            onChange={(e) =>
                              updateTier(idx, {
                                stripePriceIdMonth: e.target.value || null,
                              })
                            }
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            disabled={tiersLocked}
                            className="h-8 text-xs font-mono"
                            value={t.stripePriceIdYear ?? ""}
                            onChange={(e) =>
                              updateTier(idx, {
                                stripePriceIdYear: e.target.value || null,
                              })
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Ordering is by <strong>min_events</strong>. Tiers cannot
                    overlap.
                  </li>
                  <li>
                    <strong>Yearly price (per mo)</strong> is computed on the
                    server and is read-only.
                  </li>
                  <li>
                    Free tier: set <strong>monthly_price = 0</strong> (Stripe
                    IDs must be empty).
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-lg">Security</h2>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center">
                <div className="flex items-center gap-3">
                  <Switch id="force_admin_2fa" onCheckedChange={touchDirty} />
                  <Label htmlFor="force_admin_2fa">
                    Force 2FA for admin accounts
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AdminLayout>
  );
};

export default Settings;
