// src/components/profile/BillingAndPlans.tsx

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBilling } from "@/services/billing.store";
import UpgradePlanModal from "./UpgradePlanModal";
import InvoicesTable from "./InvoicesTable";

export type BillingMode = "user" | "admin";

type BillingAndPlansProps = {
  /**
   * "user"  → normal user sees their own billing
   * "admin" → admin viewing another user's billing
   */
  mode?: BillingMode;

  /**
   * Required when mode === "admin".
   * Ignored in "user" mode.
   */
  adminUserId?: number;
};

/**
 * Shared Billing & Plans component.
 *
 * - In "user" mode it behaves exactly like before (uses /api/user-* under the hood).
 * - In "admin" mode it is intended to call admin-scoped APIs for a specific user.
 */
export default function BillingAndPlans({
  mode = "user",
  adminUserId,
}: BillingAndPlansProps) {
  const isAdmin = mode === "admin";

  const {
    loading,
    info,
    tiers,
    invoices,
    isFreePlan,
    isFreeForever,
    startEmbeddedCheckout,
    startUpdateCard,
    cancelSubscription,
    reactivateSubscription,
    cancelDowngrade,
  } = useBilling({ mode, adminUserId });

  const [showUpgrade, setShowUpgrade] = useState(false);

  const currentPlanAmount = useMemo(
    () => (isFreePlan ? 0 : info?.price || 0),
    [info, isFreePlan]
  );

  const usedDays = info?.days_used ?? 0;
  const totalDays = info?.total_days ?? (info?.interval === "year" ? 365 : 30);
  const percent = Math.min(100, Math.round((usedDays / (totalDays || 1)) * 100));

  const hasActiveSubscription = useMemo(
    () =>
      !!(
        info &&
        !isFreeForever &&
        !isFreePlan &&
        (info.price ?? 0) > 0 &&
        !!info.interval
      ),
    [info, isFreeForever, isFreePlan]
  );

  // Small helpers for wording
  const formattedDate =
    info?.active_until && info.active_until !== "Free Forever"
      ? new Date(info.active_until).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : null;

  const dateLine = (() => {
    if (isFreeForever) return "Free Forever";
    if (!formattedDate) return "Active until –";
    if (info?.cancel_at_period_end) return `Active until ${formattedDate}`;
    return `Renews on ${formattedDate}`;
  })();

  const helperLine = (() => {
    if (isFreeForever) {
      return "Enjoy unlimited events and full access — forever free.";
    }
    if (isFreePlan) {
      return "We'll notify you when you approach your monthly event limit.";
    }
    if (info?.cancel_at_period_end) {
      return "Your plan will automatically revert to the Free plan at the end of this period.";
    }
    return "We'll email you before your subscription renews.";
  })();

  return (
    <div className="space-y-6">
      <Card id="billing-current-plan">
        <CardHeader>
          <CardTitle>
            {isAdmin ? "User’s Current Plan" : "Current Plan"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!info && (
            <div className="py-6 text-muted-foreground">
              {loading ? "Loading…" : "—"}
            </div>
          )}

          {info && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* LEFT BLOCK */}
              <div>
                {/* Plan + interval + popularity */}
                <div className="mb-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                      {isFreeForever
                        ? "Free Forever"
                        : info.plan_name || "Current Plan"}
                    </span>

                    {!isFreeForever && info.interval && (
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                        {info.interval === "year" ? "Yearly" : "Monthly"}
                      </span>
                    )}

                    {!isFreeForever && info.is_popular && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                        Popular
                      </span>
                    )}
                  </div>

                  {/* Price row – always show /month, with yearly hint when needed */}
                  {!isFreeForever && (
                    <div className="text-lg font-semibold">
                      {isFreePlan ? (
                        <span>Free</span>
                      ) : (
                        <>
                          ${info.price}{" "}
                          <span className="text-sm text-muted-foreground">
                            / month
                          </span>
                          {info.interval === "year" && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              (billed yearly)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Date + helper */}
                  <div>
                    <h6 className="mb-1">{dateLine}</h6>
                    <p className="text-sm text-muted-foreground">{helperLine}</p>
                  </div>
                </div>
              </div>

              {/* RIGHT BLOCK */}
              <div>
                {!isFreePlan && (
                  <>
                    {info.cancel_at_period_end ? (
                      <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
                        <div className="font-medium">Needs attention!</div>
                        <div>
                          Your plan will revert to{" "}
                          <span className="rounded bg-gray-200 px-1">Free</span> on{" "}
                          <span className="font-semibold text-red-600">
                            {info.active_until
                              ? new Date(info.active_until).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    timeZone: "UTC",
                                  }
                                )
                              : "—"}
                          </span>
                          .
                        </div>
                      </div>
                    ) : info.days_left != null &&
                      info.days_left <= 7 &&
                      info.days_left > 0 ? (
                      <div className="mb-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm">
                        <div className="font-medium">Heads up!</div>
                        <div>
                          Your subscription ends in {info.days_left} day(s). Please
                          update or renew.
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="mb-2 flex items-center justify-between">
                  <h6 className="mb-1">
                    {isFreePlan ? "Month Progress" : "Billing Period Progress"}
                  </h6>
                  <h6 className="mb-1">
                    {isFreeForever ? "—" : `${usedDays} of ${totalDays} Days`}
                  </h6>
                </div>
                {!isFreeForever ? (
                  <div className="mb-1 h-2 w-full overflow-hidden rounded bg-muted">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                ) : null}

                <div className="mt-2 font-medium">
                  {isFreeForever ? (
                    <>
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700">
                        {info.event_count.toLocaleString()}
                      </span>{" "}
                      events used so far
                    </>
                  ) : (
                    <>
                      <span className="text-xl font-semibold">
                        {info.event_count.toLocaleString()}
                      </span>{" "}
                      events used so far
                    </>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="col-span-full mt-2 flex flex-wrap gap-3">
                {!isFreeForever && (
                  <Button onClick={() => setShowUpgrade(true)} className="mr-2">
                    {isAdmin ? "Upgrade User Plan" : "Upgrade Plan"}
                  </Button>
                )}

                {hasActiveSubscription && !info.cancel_at_period_end && (
                  <Button
                    variant="outline"
                    className="text-red-600"
                    onClick={cancelSubscription}
                  >
                    {isAdmin ? "Cancel User Subscription" : "Cancel Subscription"}
                  </Button>
                )}

                {hasActiveSubscription && info.cancel_at_period_end && (
                  <Button
                    variant="outline"
                    className="text-green-600"
                    onClick={reactivateSubscription}
                  >
                    {isAdmin ? "Reactivate User Plan" : "Reactivate Plan"}
                  </Button>
                )}

                {hasActiveSubscription &&
                  info.scheduled_downgrade &&
                  !info.cancel_at_period_end && (
                    <Button variant="outline" onClick={cancelDowngrade}>
                      {isAdmin ? "Cancel User Downgrade" : "Cancel Downgrade"}
                    </Button>
                  )}

                {/* No standalone "Update Card" button.
                   Card updates only happen via the rare
                   `require_payment_update` path from the upgrade flow. */}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoicesTable rows={invoices} />

      <UpgradePlanModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        tiers={tiers}
        currentPlanAmount={currentPlanAmount}
        currentInfo={info}
        onUpgrade={({ tierId, interval }) => {
          startEmbeddedCheckout(tierId, interval, () => {
            setShowUpgrade(false);
          })
            .then((result) => {
              if (!result) return;

              if (result.mode === "require_payment_update") {
                // Same semantics as Bootstrap: card needs to be refreshed.
                setShowUpgrade(false);

                startUpdateCard().then((updateRes) => {
                  if (!updateRes) {
                    alert(
                      "Your card needs to be updated before upgrading, " +
                        "but the `/api/stripe/update-payment-method` endpoint is returning 404.\n\n" +
                        "React is doing the same thing as the Bootstrap page. " +
                        "To actually fix this you need that backend route to exist or use the classic billing page where it does."
                    );
                  }
                });
              }
            })
            .catch((err: any) => {
              console.error("[billing] startEmbeddedCheckout error:", err);
              alert("We couldn't start the upgrade. Please try again.");
            });
        }}
      />

      {/* Embedded Stripe container */}
      <div
        id="react-billing-embedded-modal"
        className="hidden fixed inset-0 z-[60] grid place-items-center bg-black/50"
      >
        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow">
          <div id="react-billing-stripe-element" />
          <div
            id="react-billing-stripe-debug"
            className="mt-3 text-xs text-muted-foreground"
          />
        </div>
      </div>

      {/* Update-card container (only used via require_payment_update) */}
      <div
        id="react-billing-updatecard-modal"
        className="hidden fixed inset-0 z-[60] grid place-items-center bg-black/50"
      >
        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow">
          <div id="react-billing-updatecard-element" />
        </div>
      </div>
    </div>
  );
}
