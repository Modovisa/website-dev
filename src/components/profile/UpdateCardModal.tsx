// src/components/profile/UpdateCardModal.tsx

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Starts the embedded “update card” flow.
   * Should render Stripe’s element into the provided container element.
   * Signature expected: start(containerEl)
   */
  start: (container: HTMLElement) => Promise<void> | void;
};

/**
 * Minimal, dependency-free modal used by BillingAndPlans.
 * When opened, it calls `start(containerEl)` to mount Stripe’s element.
 */
export default function UpdateCardModal({ open, onClose, start }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  // Mount Stripe element when the modal opens
  useEffect(() => {
    if (!open) {
      mountedRef.current = false;
      // clear any previous rendered content
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }
    if (open && containerRef.current && !mountedRef.current) {
      mountedRef.current = true;
      Promise.resolve(start(containerRef.current)).catch((err) => {
        console.error("[billing] startUpdateCardEmbedded error:", err);
      });
    }
  }, [open, start]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-card-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 id="update-card-title" className="text-xl font-semibold">
            Update payment method
          </h3>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Button>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          Enter new card details below to continue your upgrade or to keep your subscription active.
        </div>

        {/* Stripe will mount here */}
        <div
          id="react-update-card-stripe-element"
          ref={containerRef}
          className="min-h-[80px]"
        />

        <div id="react-update-card-stripe-debug" className="mt-3 text-xs text-muted-foreground" />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
