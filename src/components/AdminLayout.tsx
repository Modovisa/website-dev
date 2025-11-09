import { ReactNode } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { AdminSidebarComponent } from "./AdminSidebarComponent";

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  return (
    <div className="flex h-screen bg-muted/30">
      <AdminSidebarComponent />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center justify-end px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-muted rounded-lg transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
            </button>
            <Link to="/app/profile">
              <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  A
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>

        <footer className="border-t bg-card px-6 py-3 text-sm text-muted-foreground">
          © 2025 Modovisa made with ❤️ All Rights Reserved
        </footer>
      </div>
    </div>
  );
};
