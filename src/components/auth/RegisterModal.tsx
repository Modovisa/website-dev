// src/components/auth/RegisterModal.tsx

import { Dialog, DialogContent } from "@/components/ui/dialog";
import Register from "@/pages/Register";

type RegisterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RegisterModal({ open, onOpenChange }: RegisterModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-full border-0 bg-transparent p-0 shadow-none">
        {/* Use the same Register UI, just in "modal" mode */}
        <Register mode="modal" />
      </DialogContent>
    </Dialog>
  );
}
