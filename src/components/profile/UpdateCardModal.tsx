// src/components/profile/UpdateCardModal.tsx

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  /**
   * Starts the embedded “update card” flow.
   * Signature: start(containerElOrSelector, onComplete?)
   */
  start: (container: HTMLElement | string, onComplete?: () => void) => Promise<void> | void;
};

export default function UpdateCardModal({ open, onClose, start }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      mountedRef.current = false;
      if (containerRef.current) containerRef.current.innerHTML = "";
      return;
    }
    if (open && containerRef.current && !mountedRef.current) {
      mountedRef.current = true;
      Promise.resolve(start(containerRef.current, () => onClose()))
        .catch((err) => {
          console.error("[billing] startUpdateCardEmbedded error:", err);
          // show a tiny inline debug hint so users know why “nothing happened”
          const dbg = document.getElementById("react-update-card-stripe-debug");
          if (dbg) dbg.textContent = String(err?.message || err || "");
        });
    }
  }, [open, start, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/40" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-xl font-semibold">Update payment method</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Close">✕</Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Enter new card details to continue your upgrade or keep your subscription active.
        </p>

        <div id="react-update-card-stripe-element" ref={containerRef} className="min-h-[80px]" />
        <div id="react-update-card-stripe-debug" className="mt-3 text-xs text-muted-foreground" />

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
