// src/components/AdminLayout.tsx

import { ReactNode, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import AdminNavbar from "./AdminNavbar";
import { Sheet, SheetContent } from "./ui/sheet";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar (passes opener to trigger the mobile drawer) */}
        <AdminNavbar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

        {/* Mobile drawer with the same sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <AdminSidebar />
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>

        <footer className="border-t bg-card px-6 py-3 text-sm text-muted-foreground">
          © 2025 Modovisa made with ❤️ All Rights Reserved
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
