// src/components/DocsLayout.tsx

import { ReactNode } from "react";
import { DocsSidebar } from "./DocsSidebar";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import { Navbar } from "./Navbar";
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
  
  // Generate breadcrumb from current path
  const pathSegments = location.pathname.split("/").filter(Boolean);
  
  // Create readable labels from path segments
  const getLabel = (segment: string) => {
    return segment
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  
  return (
    <div className="flex h-screen bg-muted/30">
      <DocsSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navbar */}
        <div className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
          <Navbar />
        </div>
        
        {/* Breadcrumb header */}
        <header className="h-16 shrink-0 flex items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="hover:text-foreground transition-colors">
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
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};