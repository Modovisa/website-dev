// src/components/profile/UpgradePlanModal.tsx

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PricingTier, BillingInfo } from "@/hooks/useBilling";

type Props = {
  open: boolean;
  onClose: () => void;
  tiers: PricingTier[];
  currentPlanAmount: number;
  currentInfo?: BillingInfo | null;
  onUpgrade: (args: { tierId: number; interval: "month" | "year" }) => void;
};

const SNAP_STEPS = [
  25_000,
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_000_000,
  5_000_000,
  10_000_000,
  15_000_000,
  20_000_000,
];

export default function UpgradePlanModal({
  open,
  onClose,
  tiers,
  currentPlanAmount,
  currentInfo,
  onUpgrade,
}: Props) {
  const [isYearly, setIsYearly] = useState(false);
  const [events, setEvents] = useState<number>(25_000);

  const idx = useMemo(
    () => Math.max(0, SNAP_STEPS.indexOf(events)),
    [events]
  );
  const percent = useMemo(
    () => (idx / (SNAP_STEPS.length - 1)) * 100,
    [idx]
  );

  const matchedTier = useMemo(
    () =>
      tiers.find((t) => events >= t.min_events && events <= t.max_events) ||
      null,
    [events, tiers]
  );

  const price = useMemo(() => {
    if (!matchedTier) return 0;
    const monthly = matchedTier.monthly_price;
    return isYearly ? Math.ceil(monthly * 0.8) : monthly;
  }, [matchedTier, isYearly]);

  // 🔍 Derive current plan meta from billing info (mirrors renderUpgradeModalFooter)
  const { currentIsFree, currentDisplayAmount, currentIntervalLabel } =
    useMemo(() => {
      if (!currentInfo) {
        return {
          currentIsFree: true,
          currentDisplayAmount: 0,
          currentIntervalLabel: "month",
        };
      }

      const isFreeForever =
        String(currentInfo.is_free_forever) === "1" ||
        currentInfo.is_free_forever === true;
      const name = (currentInfo.plan_name || "").toLowerCase();
      const isFree =
        isFreeForever ||
        currentInfo.price === 0 ||
        currentInfo.interval == null ||
        name.includes("free");

      const amount = isFree ? 0 : currentInfo.price ?? currentPlanAmount;
      const intervalLabel =
        currentInfo.interval === "year"
          ? "year"
          : currentInfo.interval === "month"
          ? "month"
          : "month";

      return {
        currentIsFree: isFree,
        currentDisplayAmount: amount,
        currentIntervalLabel: intervalLabel,
      };
    }, [currentInfo, currentPlanAmount]);

  useEffect(() => {
    if (!open) {
      setIsYearly(false);
      setEvents(25_000);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-3xl rounded-2xl bg-background p-4 shadow-xl">
        <div className="flex justify-end">
          <button
            className="text-muted-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-3xl font-semibold">Upgrade Plan</h2>
          <p className="mt-2 text-muted-foreground">
            Choose the best plan based on your usage needs.
          </p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Pro</CardTitle>

            {/* Interval toggle */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <span className="select-none font-medium">Monthly</span>

              <button
                type="button"
                aria-pressed={isYearly}
                onClick={() => setIsYearly((v) => !v)}
                className={[
                  "relative inline-flex h-8 w-16 items-center rounded-full transition-colors",
                  isYearly ? "bg-primary" : "bg-muted",
                ].join(" ")}
              >
                <span
                  className={[
                    "pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-background border",
                    "border-primary/40 shadow transition-transform",
                    isYearly ? "translate-x-8" : "translate-x-0",
                  ].join(" ")}
                />
              </button>

              <span className="select-none font-medium">Yearly</span>
              <span className="ml-1 select-none rounded bg-success px-2 py-0.5 text-lg font-bold text-primary-foreground">
                Save 20%
              </span>
            </div>

            {/* Slider */}
            <div className="mx-auto mt-6 w-full max-w-xl">
              <div className="relative">
                <div className="my-6 h-3 rounded-full bg-muted" />
                <div
                  className="absolute left-0 top-0 h-3 rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
                <input
                  aria-label="Events per month"
                  type="range"
                  min={0}
                  max={SNAP_STEPS.length - 1}
                  step={1}
                  value={idx}
                  onChange={(e) =>
                    setEvents(SNAP_STEPS[parseInt(e.target.value, 10)])
                  }
                  className="mv-range absolute inset-[5px_0_0] w-full range-primary"
                />
              </div>

              <div className="mt-4 flex items-center justify-between text-base font-semibold">
                <span className="tabular-nums">
                  {events.toLocaleString()}{" "}
                  <span className="text-sm text-muted-foreground">
                    events / mo
                  </span>
                </span>
                <span className="tabular-nums">
                  {isYearly ? (
                    <>
                      <span className="mr-2 line-through opacity-60">
                        ${matchedTier?.monthly_price ?? 0}
                      </span>
                      ${price}
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        / mo
                      </span>
                    </>
                  ) : (
                    <>
                      ${price}
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        / mo
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="text-center">
            <ul className="mb-5 space-y-2 text-sm">
              <li>✔ Forever data retention</li>
              <li>✔ All features available</li>
            </ul>

            <Button
              size="lg"
              className="w-full"
              disabled={!matchedTier}
              onClick={() => {
                if (!matchedTier) return;
                onUpgrade({
                  tierId: matchedTier.id,
                  interval: isYearly ? "year" : "month",
                });
              }}
            >
              Upgrade
            </Button>

            {/* Current plan summary – mirrors bootstrap renderUpgradeModalFooter */}
            <div className="mt-6 text-center text-sm">
              <p className="mb-1 text-muted-foreground">Your current plan:</p>
              <div className="text-3xl font-bold text-primary">
                ${currentDisplayAmount}
                {!currentIsFree && (
                  <span className="ml-1 text-base text-muted-foreground">
                    /{currentIntervalLabel}
                  </span>
                )}
              </div>
              {currentIsFree && (
                <p className="mt-1 text-xs text-muted-foreground">
                  You’re currently on the free plan.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
