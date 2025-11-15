// src/components/auth/RegisterModal.tsx

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { routeAfterLoginFromHomepageReact } from "@/services/homepage-checkout.store";
import { HomepageRegisterForm } from "@/components/auth/HomepageRegisterForm";

type RegisterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RegisterModal({ open, onOpenChange }: RegisterModalProps) {
  const navigate = useNavigate();

  const handleSuccess = async () => {
    // Close the modal
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
      <DialogContent className="max-w-4xl w-full border-0 bg-transparent p-0 shadow-none">
        <HomepageRegisterForm onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
