// src/components/profile/UpgradePlanModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PricingTier } from "@/services/billingService";

/* noUiSlider is loaded globally from /public/nouislider.min.js */
declare global {
  interface Window {
    noUiSlider: any;
  }
}

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
  const [events, setEvents] = useState<number>(SNAP_STEPS[0]);

  const sliderRef = useRef<HTMLDivElement | null>(null);
  const sliderInstRef = useRef<any>(null);

  const matchedTier = useMemo(
    () => tiers.find((t) => events >= t.min_events && events <= t.max_events) || null,
    [events, tiers]
  );

  const price = useMemo(() => {
    if (!matchedTier) return 0;
    const monthly = matchedTier.monthly_price;
    return isYearly ? Math.ceil(monthly * 0.8) : monthly;
  }, [matchedTier, isYearly]);

  // Reset when modal is closed
  useEffect(() => {
    if (!open) {
      setIsYearly(false);
      setEvents(SNAP_STEPS[0]);
      // destroy slider if exists (avoid duplicate instances)
      if (sliderInstRef.current) {
        sliderInstRef.current.destroy();
        sliderInstRef.current = null;
      }
    }
  }, [open]);

  // Initialize noUiSlider on open
  useEffect(() => {
    if (!open || !sliderRef.current) return;
    const noUi = window.noUiSlider;
    if (!noUi) return;

    // start at current events index
    const startIndex = Math.max(0, SNAP_STEPS.findIndex((v) => v === events));

    sliderInstRef.current = noUi.create(sliderRef.current, {
      start: startIndex,
      step: 1,
      range: { min: 0, max: SNAP_STEPS.length - 1 },
      connect: [true, false],
      behaviour: "tap-drag",
      // no tooltips; we render our own labels beneath
    });

    const inst = sliderInstRef.current;

    const onUpdate = (values: string[]) => {
      const idx = Math.round(parseFloat(values[0]));
      const clamped = Math.min(Math.max(idx, 0), SNAP_STEPS.length - 1);
      setEvents(SNAP_STEPS[clamped]);
    };

    inst.on("update", onUpdate);

    // Ensure slider re-renders correctly when modal animates in
    setTimeout(() => inst && inst.updateOptions({}, false), 0);

    return () => {
      if (inst) {
        inst.off("update", onUpdate);
        inst.destroy();
        sliderInstRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

            {/* Monthly / Yearly toggle - consistent spacing & alignment */}
            <div className="mt-3 flex items-center justify-center gap-4">
              <span className={`font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>

              <button
                type="button"
                aria-label="Toggle yearly billing"
                onClick={() => setIsYearly((v) => !v)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  isYearly ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform ${
                    isYearly ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>

              <div className="flex items-center gap-2">
                <span className={`font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>Yearly</span>
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Save 20%</span>
              </div>
            </div>

            {/* noUiSlider (discrete steps) */}
            <div className="mx-auto mt-6 w-full max-w-xl">
              <div ref={sliderRef} className="noUi-target noUi-ltr noUi-horizontal" />

              <div className="mt-4 flex items-center justify-between text-base font-semibold">
                <span>
                  {events.toLocaleString()} <span className="text-sm text-muted-foreground">events / mo</span>
                </span>

                <span className="flex items-baseline gap-2">
                  {isYearly ? (
                    <>
                      <span className="line-through opacity-70">${matchedTier?.monthly_price ?? 0}</span>
                      <span className="text-foreground">${price}</span>
                      <span className="text-sm text-muted-foreground">/ mo</span>
                    </>
                  ) : (
                    <>
                      <span className="text-foreground">${price}</span>
                      <span className="text-sm text-muted-foreground">/ mo</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </CardHeader>

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

            {/* Current plan amount */}
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
