// src/components/DocsLayout.tsx

import { ReactNode } from "react";
import { DocsSidebar } from "./DocsSidebar";
import { Link } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";

interface DocsLayoutProps {
  children: ReactNode;
}

export const DocsLayout = ({ children }: DocsLayoutProps) => {
  return (
    <div className="flex h-screen bg-muted/30">
      <DocsSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 shrink-0 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/docs" className="hover:text-foreground transition-colors">
              Getting Started
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Documentation</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};