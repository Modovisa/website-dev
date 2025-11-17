// src/components/profile/BillingAndPlans.tsx

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { secureFetch } from "@/lib/auth/auth";
import { secureAdminFetch } from "@/lib/auth/adminAuth";

type Mode = "user" | "admin";

type BillingInfo = {
  plan_name?: string;
  plan_id?: string;
  is_free_forever?: boolean | number | string;
  price?: number;
  interval?: "month" | "year" | null;
  active_until?: string | null;
  event_count?: number;
  monthly_event_count?: number;
  yearly_event_count?: number;
  days_used?: number;
  total_days?: number;
  days_left?: number;
  cancel_at_period_end?: boolean;
  scheduled_downgrade?: {
    plan_name: string;
    start_date: string;
  } | null;
};

type PricingTier = {
  id: number;
  plan_id: string;
  name: string;
  max_events: number | null;
  price_month: number;
  price_year: number;
  is_popular?: boolean;
};

type Invoice = {
  id: number;
  invoice_date: string;
  amount: number;
  currency: string;
  status: string;
  invoice_number: string;
  invoice_pdf: string | null;
};

type Props = {
  mode?: Mode;          // "user" (default) or "admin"
  adminUserId?: number; // required when mode="admin"
};

function normalizeFreeForever(value: any): boolean {
  if (value === true) return true;
  if (value === false) return false;
  const s = String(value).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function formatMoney(amount?: number, currency = "USD") {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  } catch {
    return `${amount / 100} ${currency}`;
  }
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "—";
  try {
    return new Date(dateString)
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
      .replace(",", "");
  } catch {
    return dateString;
  }
}

// Shared helpers that switch fetch + URL based on mode
async function fetchBillingInfo(mode: Mode, adminUserId?: number): Promise<BillingInfo | null> {
  const fetchFn = mode === "admin" ? secureAdminFetch : secureFetch;

  const url =
    mode === "admin"
      ? `/api/admin/user-billing-info?user_id=${adminUserId}`
      : `/api/user-billing-info`;

  const res = await fetchFn(url, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Failed to load billing info", res.status, body);
    throw new Error("unauthorized");
  }

  const json = (await res.json().catch(() => ({}))) as any;
  const info =
    json?.billing ??
    json?.data ??
    json?.info ??
    json;

  return (info ?? null) as BillingInfo | null;
}

async function fetchPricingTiers(mode: Mode): Promise<PricingTier[]> {
  const fetchFn = mode === "admin" ? secureAdminFetch : secureFetch;

  const url =
    mode === "admin"
      ? `/api/admin/pricing-tiers`
      : `/api/pricing-tiers`;

  const res = await fetchFn(url, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Failed to load pricing tiers", res.status, body);
    throw new Error("unauthorized");
  }

  const json = (await res.json().catch(() => ({}))) as any;
  const tiers: PricingTier[] =
    json?.tiers ??
    json?.data ??
    json ??
    [];
  return tiers;
}

async function fetchInvoices(mode: Mode, adminUserId?: number): Promise<Invoice[]> {
  const fetchFn = mode === "admin" ? secureAdminFetch : secureFetch;

  const url =
    mode === "admin"
      ? `/api/admin/user-billing-invoices?user_id=${adminUserId}`
      : `/api/user-billing-invoices`;

  const res = await fetchFn(url, { method: "GET" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Failed to load invoices", res.status, body);
    throw new Error("unauthorized");
  }

  const json = (await res.json().catch(() => ({}))) as any;
  const invoices: Invoice[] =
    json?.invoices ??
    json?.data ??
    json ??
    [];
  return invoices;
}

const BillingAndPlans: React.FC<Props> = ({ mode = "user", adminUserId }) => {
  const { toast } = useToast();
  const isAdmin = mode === "admin";

  const billingEnabled = !isAdmin || !!adminUserId;
  const invoicesEnabled = billingEnabled;
  const tiersEnabled = true; // pricing tiers are global

  // ─────────────────────────────
  // Queries
  // ─────────────────────────────
  const {
    data: billingInfo,
    isLoading: billingLoading,
    isError: billingError,
  } = useQuery({
    queryKey: ["billing-info", mode, adminUserId],
    enabled: billingEnabled,
    queryFn: () => fetchBillingInfo(mode, adminUserId),
    retry: false,
    onError: (err: any) => {
      console.error("❌ Failed to load billing info:", err);
      if (!isAdmin) {
        toast({
          title: "Billing unavailable",
          description: "Could not load billing details. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const {
    data: pricingTiers = [],
    isLoading: tiersLoading,
    isError: tiersError,
  } = useQuery({
    queryKey: ["pricing-tiers", mode],
    enabled: tiersEnabled,
    queryFn: () => fetchPricingTiers(mode),
    retry: false,
    onError: (err: any) => {
      console.error("❌ Failed to load pricing tiers:", err);
      if (!isAdmin) {
        toast({
          title: "Pricing unavailable",
          description: "Could not load pricing tiers.",
          variant: "destructive",
        });
      }
    },
  });

  const {
    data: invoices = [],
    isLoading: invoicesLoading,
    isError: invoicesError,
  } = useQuery({
    queryKey: ["billing-invoices", mode, adminUserId],
    enabled: invoicesEnabled,
    queryFn: () => fetchInvoices(mode, adminUserId),
    retry: false,
    onError: (err: any) => {
      console.error("❌ Failed to load invoices:", err);
      if (!isAdmin) {
        toast({
          title: "Invoices unavailable",
          description: "Could not load invoices.",
          variant: "destructive",
        });
      }
    },
  });

  const isFreeForever = normalizeFreeForever(
    billingInfo?.is_free_forever ?? false
  );

  const currentPlanLabel = useMemo(() => {
    if (isFreeForever) return "Free Forever";
    return billingInfo?.plan_name || "Free";
  }, [billingInfo, isFreeForever]);

  const eventsThisPeriod =
    billingInfo?.event_count ??
    billingInfo?.monthly_event_count ??
    billingInfo?.yearly_event_count ??
    0;

  const billingTitle = isAdmin ? "User’s Current Plan" : "Your Current Plan";

  // ─────────────────────────────
  // Render
  // ─────────────────────────────
  return (
    <div className="space-y-6">
      {/* Current plan card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-semibold">
              {billingTitle}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Plan, usage and billing period overview.
            </p>
          </div>
          {billingLoading && <Skeleton className="h-6 w-24" />}
        </CardHeader>
        <CardContent className="space-y-4">
          {billingLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : billingError || !billingInfo ? (
            <p className="text-sm text-muted-foreground">
              Billing info not available.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold">{currentPlanLabel}</span>
                {isFreeForever && (
                  <Badge className="bg-success text-primary-foreground text-xs">
                    Free Forever
                  </Badge>
                )}
                {billingInfo.cancel_at_period_end && (
                  <Badge
                    variant="outline"
                    className="border-warning text-warning text-xs"
                  >
                    Cancels at period end
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  Events this period:{" "}
                  <span className="font-semibold text-foreground">
                    {Number(eventsThisPeriod || 0).toLocaleString()}
                  </span>
                </span>
                {billingInfo.active_until && (
                  <span>
                    Renews on{" "}
                    <span className="font-semibold text-foreground">
                      {formatDate(billingInfo.active_until)}
                    </span>
                  </span>
                )}
                {billingInfo.scheduled_downgrade && (
                  <span>
                    Scheduled downgrade to{" "}
                    <span className="font-semibold">
                      {billingInfo.scheduled_downgrade.plan_name}
                    </span>{" "}
                    on{" "}
                    <span className="font-semibold">
                      {formatDate(billingInfo.scheduled_downgrade.start_date)}
                    </span>
                  </span>
                )}
              </div>

              {!isAdmin && (
                <div className="pt-2">
                  {/* Your existing upgrade / manage buttons can stay here. */}
                  <Button size="sm" className="mr-2">
                    Upgrade / Manage Plan
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing tiers (optional for admin – still useful as context) */}
      {!tiersLoading && !tiersError && pricingTiers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {pricingTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="border rounded-xl p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{tier.name}</span>
                    {tier.is_popular && (
                      <Badge className="bg-primary/10 text-primary text-xs">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>
                      {formatMoney(tier.price_month * 100)} / month
                    </div>
                    <div>
                      {formatMoney(tier.price_year * 100)} / year
                    </div>
                    {tier.max_events && (
                      <div>
                        Up to{" "}
                        <span className="font-semibold">
                          {tier.max_events.toLocaleString()}
                        </span>{" "}
                        events / month
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : invoicesError ? (
            <p className="text-sm text-muted-foreground">
              Failed to load invoices.
            </p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No invoices yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Invoice #
                    </th>
                    <th className="px-4 py-2 text-left font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="px-4 py-2">
                        {formatMoney(inv.amount, inv.currency)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant="outline"
                          className={
                            inv.status === "paid"
                              ? "border-success text-success"
                              : inv.status === "open"
                              ? "border-warning text-warning"
                              : "border-muted-foreground text-muted-foreground"
                          }
                        >
                          {inv.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{inv.invoice_number}</td>
                      <td className="px-4 py-2">
                        {inv.invoice_pdf ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <a
                              href={inv.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View PDF
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingAndPlans;
