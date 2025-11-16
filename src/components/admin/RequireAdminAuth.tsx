// src/components/admin/RequireAdminAuth.tsx

import { ReactNode, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { initAdminAuth } from "@/lib/auth/adminAuth";

export function RequireAdminAuth({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await initAdminAuth();
      if (cancelled) return;

      if (ok) {
        setIsAuthed(true);
      } else {
        // send them to admin login, remember where they came from
        navigate("/mv-admin/login", {
          replace: true,
          state: { from: location.pathname },
        });
      }
      setChecking(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthed) return null;

  return <>{children}</>;
}
