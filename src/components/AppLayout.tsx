// src/components/AppLayout.tsx

import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import AppNavbar from "./AppNavbar";
import { Sheet, SheetContent } from "./ui/sheet";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar (passes opener to trigger the mobile drawer) */}
        <AppNavbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Mobile drawer with the same sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AppSidebar />
          </SheetContent>
        </Sheet>

        {/* Main content + footer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto">
            {children}
          </main>

          <footer className="shrink-0 border-t bg-background/80 px-4 py-3 md:px-6 text-xs text-muted-foreground flex items-center justify-center">
            <span>
              © 2025 Modovisa. made with ❤️ all rights Reserved.
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
