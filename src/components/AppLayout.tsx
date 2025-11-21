// src/components/AppLayout.tsx

import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import AppNavbar from "./AppNavbar";
import { Sheet, SheetContent } from "./ui/sheet";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <div className="hidden shrink-0 lg:block">
        <AppSidebar />
      </div>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        {/* Navbar (passes opener to trigger the mobile drawer) */}
        <AppNavbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Mobile drawer with the same sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AppSidebar />
          </SheetContent>
        </Sheet>

        {/* Main content (page scrolls naturally) */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer – sits at bottom when short, pushed down when content grows */}
        <footer className="shrink-0 border-t bg-background/80 px-4 py-4 md:px-6 text-sm text-muted-foreground flex items-center justify-center backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <span className="footer-bottom-text">
            © {year} <span className="font-medium">Modovisa</span>{" "}
            <span>made with ❤️ All Rights Reserved</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
