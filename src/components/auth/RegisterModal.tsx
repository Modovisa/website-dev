// src/components/auth/RegisterModal.tsx

import { Dialog, DialogContent } from "@/components/ui/dialog";
import Register from "@/pages/Register";
import { useNavigate } from "react-router-dom";
import { routeAfterLoginFromHomepageReact } from "@/services/homepage-checkout.store";

type RegisterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RegisterModal({ open, onOpenChange }: RegisterModalProps) {
  const navigate = useNavigate();

  const handleSuccess = async () => {
    try {
      window.localStorage.setItem("mv_new_signup", "1");
    } catch {}

    onOpenChange(false);

    if (window.showGlobalLoadingModal) {
      window.showGlobalLoadingModal("Preparing checkout...");
    }

    try {
      await routeAfterLoginFromHomepageReact({ navigate });
    } finally {
      window.hideGlobalLoadingModal?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full border-0 bg-transparent p-0 shadow-none">
        <Register mode="modal" onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
