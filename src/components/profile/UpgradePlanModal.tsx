// src/components/profile/UpgradePlanModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PricingTier } from "@/services/billingService";

type Props = {
  open: boolean;
  onClose: () => void;
  tiers: PricingTier[];
  currentPlanAmount: number;
  onUpgrade: (args: { tierId: number; interval: "month" | "year" }) => void;
};

const SNAP_STEPS = [
  25_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000, 10_000_000, 15_000_000, 20_000_000,
];

export default function UpgradePlanModal({ open, onClose, tiers, currentPlanAmount, onUpgrade }: Props) {
  const [isYearly, setIsYearly] = useState(false);
  const [events, setEvents] = useState<number>(25_000);

  // match a tier exactly like the bootstrap slider did
  const matchedTier = useMemo(() => {
    return tiers.find((t) => events >= t.min_events && events <= t.max_events) || null;
  }, [events, tiers]);

  const price = useMemo(() => {
    if (!matchedTier) return 0;
    const monthly = matchedTier.monthly_price;
    return isYearly ? Math.ceil(monthly * 0.8) : monthly;
  }, [matchedTier, isYearly]);

  useEffect(() => {
    if (!open) {
      setIsYearly(false);
      setEvents(25_000);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40">
      <div className="w-full max-w-3xl rounded-xl bg-background p-4 shadow-xl">
        <div className="flex justify-end">
          <button className="text-muted-foreground" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold">Upgrade Plan</h2>
          <p className="text-muted-foreground">Choose the best plan based on your usage needs.</p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Pro</CardTitle>

            {/* Monthly / Yearly toggle */}
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="font-medium">Monthly</span>
              <label className="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isYearly}
                  onChange={(e) => setIsYearly(e.target.checked)}
                />
                <span className="relative h-6 w-11 rounded-full bg-muted">
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
                      isYearly ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </span>
              </label>
              <span className="font-medium">
                Yearly <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-sm text-green-700">Save 20%</span>
              </span>
            </div>

            {/* Slider (discrete steps to mirror Bootstrap noUi config) */}
            <div className="mx-auto mt-6 w-full max-w-xl">
              <input
                type="range"
                min={0}
                max={SNAP_STEPS.length - 1}
                step={1}
                value={SNAP_STEPS.indexOf(events)}
                onChange={(e) => setEvents(SNAP_STEPS[parseInt(e.target.value, 10)])}
                className="w-full"
              />
              <div className="mt-3 flex items-center justify-between text-base font-semibold">
                <span>
                  {events.toLocaleString()} <span className="text-sm text-muted-foreground">events / mo</span>
                </span>
                <span>
                  {isYearly ? (
                    <>
                      <span className="mr-2 line-through opacity-70">${matchedTier?.monthly_price ?? 0}</span>${price}
                      <span className="text-sm text-muted-foreground"> / mo</span>
                    </>
                  ) : (
                    <>
                      ${price}
                      <span className="text-sm text-muted-foreground"> / mo</span>
                    </>
                  )}
                </span>
              </div>
            </CardHeader>
          </Card>

          <CardContent className="text-center">
            <ul className="mb-4 space-y-2 text-sm">
              <li>✔ Forever data retention</li>
              <li>✔ All features available</li>
            </ul>

            <Button
              size="lg"
              className="w-full"
              disabled={!matchedTier}
              onClick={() => {
                if (!matchedTier) return;
                onUpgrade({ tierId: matchedTier.id, interval: isYearly ? "year" : "month" });
              }}
            >
              Upgrade
            </Button>

            {/* Current plan amount, for parity with Bootstrap modal footer */}
            <div className="mt-5 text-center text-sm">
              <p className="mb-1 text-muted-foreground">Your current plan:</p>
              <div className="text-primary text-3xl font-bold">
                ${currentPlanAmount}
                <span className="ml-1 text-base text-muted-foreground">/month</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Embedded Stripe container (shown/hidden by hook) */}
      <div id="react-billing-embedded-modal" className="hidden fixed inset-0 z-[60] grid place-items-center bg-black/50">
        <div className="w-full max-w-md rounded-xl bg-background p-6 shadow">
          <div id="react-billing-stripe-element" />
        </div>
      </div>
    </div>
  );
}
