// src/components/profile/BillingAndPlans.tsx

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBilling } from "@/hooks/useBilling";
import UpgradePlanModal from "./UpgradePlanModal";
import InvoicesTable from "./InvoicesTable";

export default function BillingAndPlans() {
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
  } = useBilling();

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

  return (
    <div className="space-y-6">
      <Card id="billing-current-plan">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
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
                <div className="mb-4">
                  <h6 className="mb-1">
                    {isFreeForever ? (
                      <>
                        Your Current Plan is{" "}
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                          Free Forever
                        </span>
                      </>
                    ) : (
                      <>Your Current Plan is {info.plan_name}</>
                    )}
                  </h6>
                </div>

                <div className="mb-4">
                  <h6 className="mb-1">
                    {info.active_until === "Free Forever"
                      ? "Free Forever"
                      : info.active_until
                      ? `Active until ${new Date(info.active_until).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}`
                      : "Active until –"}
                  </h6>
                  <p className="text-muted-foreground">
                    {isFreeForever
                      ? "Enjoy unlimited events and full access — forever free."
                      : isFreePlan
                      ? "We'll notify you when you approach your monthly event limit"
                      : "We will send you a notification upon Subscription expiration"}
                  </p>
                </div>

                {!isFreeForever && (
                  <div className="mb-6">
                    <h6 className="mb-1">
                      {isFreePlan ? (
                        <span>Free</span>
                      ) : (
                        <>
                          ${info.price} Per {info.interval === "year" ? "Year" : "Month"}{" "}
                          {info.is_popular ? (
                            <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                              Popular
                            </span>
                          ) : null}
                        </>
                      )}
                    </h6>
                    <p className="mb-0 text-muted-foreground">
                      {info.plan_name ? info.plan_name : "–"}{" "}
                      {!isFreePlan && info.interval ? (
                        <span className="ml-2 rounded bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                          {info.interval === "year" ? "Yearly" : "Monthly"}
                        </span>
                      ) : null}
                    </p>
                  </div>
                )}
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
                              ? new Date(info.active_until).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  timeZone: "UTC",
                                })
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
                          Your subscription ends in {info.days_left} day(s). Please update
                          or renew.
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
                    Upgrade Plan
                  </Button>
                )}

                {hasActiveSubscription && !info.cancel_at_period_end && (
                  <Button
                    variant="outline"
                    className="text-red-600"
                    onClick={cancelSubscription}
                  >
                    Cancel Subscription
                  </Button>
                )}

                {hasActiveSubscription && info.cancel_at_period_end && (
                  <Button
                    variant="outline"
                    className="text-green-600"
                    onClick={reactivateSubscription}
                  >
                    Reactivate Plan
                  </Button>
                )}

                {hasActiveSubscription && info.scheduled_downgrade && !info.cancel_at_period_end && (
                  <Button variant="outline" onClick={cancelDowngrade}>
                    Cancel Downgrade
                  </Button>
                )}

                {hasActiveSubscription && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      startUpdateCard().then((res) => {
                        if (!res) {
                          alert(
                            "We tried to start the card update flow, but the API route for updating your card is returning an error.\n\n" +
                              "You’ll need to update your card from the classic billing page or fix the backend route `/api/stripe/update-payment-method`."
                          );
                        }
                      });
                    }}
                  >
                    Update Card
                  </Button>
                )}
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
                // Same semantics as Bootstrap: card needs to be refreshed
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

      {/* Update-card container */}
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
