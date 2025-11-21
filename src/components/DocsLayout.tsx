// src/components/DocsLayout.tsx
// @ts-nocheck

import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { DocsSidebar } from "./DocsSidebar";
import { DocsNavbar } from "./DocsNavbar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
      <div className="hidden w-64 shrink-0 border-r bg-card lg:block">
        <DocsSidebar />
      </div>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top docs navbar (owns ALL hamburgers on docs pages) */}
        <div className="shrink-0 border-b bg-background/95 px-4 py-3 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <DocsNavbar />
        </div>

        {/* Breadcrumb header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link
                    to="/"
                    className="transition-colors hover:text-foreground"
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
