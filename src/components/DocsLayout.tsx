// src/components/DocsLayout.tsx
// @ts-nocheck

import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Menu } from "lucide-react";
import { Navbar } from "./Navbar";
import { DocsSidebar } from "./DocsSidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DocsLayoutProps {
  children: ReactNode;
}

export const DocsLayout = ({ children }: DocsLayoutProps) => {
  const location = useLocation();

  const pathSegments = location.pathname.split("/").filter(Boolean);

  const getLabel = (segment: string) =>
    segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0 border-r bg-card">
        <DocsSidebar variant="desktop" />
      </div>

      {/* Main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar (same as site) */}
        <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6 py-3 flex items-center justify-between">
          {/* Mobile: docs sidebar trigger */}
          <div className="flex items-center gap-3 lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-1">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <DocsSidebar variant="mobile" />
              </SheetContent>
            </Sheet>
          </div>

          {/* Navbar fills the rest */}
          <div className="flex-1">
            <Navbar />
          </div>
        </div>

        {/* Breadcrumb header */}
        <header className="h-16 shrink-0 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/"
                    className="hover:text-foreground transition-colors"
                  >
                    <Home className="h-4 w-4" />
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />

              {pathSegments.map((segment, index) => {
                const path = "/" + pathSegments.slice(0, index + 1).join("/");
                const isLast = index === pathSegments.length - 1;

                return (
                  <BreadcrumbItem key={path}>
                    {isLast ? (
                      <BreadcrumbPage>{getLabel(segment)}</BreadcrumbPage>
                    ) : (
                      <>
                        <BreadcrumbLink asChild>
                          <Link to={path}>{getLabel(segment)}</Link>
                        </BreadcrumbLink>
                        <BreadcrumbSeparator />
                      </>
                    )}
                  </BreadcrumbItem>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
