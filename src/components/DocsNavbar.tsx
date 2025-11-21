// src/components/DocsNavbar.tsx
// @ts-nocheck

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Menu, LogIn, LogOut } from "lucide-react";
import { fullLogout } from "@/lib/auth/logout";
import { gettingStartedItems, platforms } from "./DocsSidebar";

const API = "https://api.modovisa.com";

export const DocsNavbar = () => {
  const [isAuthed, setIsAuthed] = useState(false);
  const navigate = useNavigate();

  // Lightweight auth check
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (!cancelled) setIsAuthed(res.ok);
      } catch {
        if (!cancelled) setIsAuthed(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fullLogout("user", { source: "docs-navbar" });
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const offset = 80;
    const targetY = rect.top + window.scrollY - offset;

    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const handleSectionClick = (id: string) => {
    if (window.location.pathname !== "/") {
      navigate("/#" + id);
      setTimeout(() => scrollToSection(id), 50);
    } else {
      scrollToSection(id);
    }
  };

  return (
    <nav className="glass-nav rounded-md px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Mobile: unified hamburger (site + docs nav) */}
        <div className="flex items-center gap-2 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="mr-1">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-4">
              <div className="flex flex-col gap-4 mt-4">
                {/* Site navigation */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Site
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSectionClick("product")}
                      className="text-left text-base font-medium hover:text-primary transition-colors"
                    >
                      Product
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSectionClick("features")}
                      className="text-left text-base font-medium hover:text-primary transition-colors"
                    >
                      Features
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSectionClick("pricing")}
                      className="text-left text-base font-medium hover:text-primary transition-colors"
                    >
                      Pricing
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSectionClick("landingFAQ")}
                      className="text-left text-base font-medium hover:text-primary transition-colors"
                    >
                      FAQs
                    </button>
                    <Link
                      to="/docs"
                      className="text-base font-medium hover:text-primary transition-colors"
                    >
                      Docs home
                    </Link>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t pt-4" />

                {/* Docs navigation */}
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Getting Started
                    </p>
                    <div className="space-y-1">
                      {gettingStartedItems.map((item) => (
                        <Link
                          key={item.name}
                          to={item.href}
                          className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Installation Guides
                    </p>
                    <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                      {platforms.map((platform) => {
                        const href = `/docs/install/${platform.toLowerCase()}`;
                        return (
                          <Link
                            key={platform}
                            to={href}
                            className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            {platform}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Auth actions */}
                <div className="pt-4 border-t">
                  {isAuthed ? (
                    <>
                      <Link to="/app/live-tracking">
                        <Button
                          variant="outline"
                          className="mb-2 w-full border-transparent bg-white/50 text-foreground font-semibold hover:bg-white/75"
                        >
                          Live Tracking
                        </Button>
                      </Link>
                      <Button
                        className="w-full"
                        variant="destructive"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login">
                        <Button variant="outline" className="mb-2 w-full">
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/register">
                        <Button className="w-full">Get Started</Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Logo */}
        <div className="flex flex-1 justify-center md:justify-start">
          <Logo className="text-foreground" />
        </div>

        {/* Desktop auth area */}
        <div className="hidden items-center gap-4 md:flex">
          {isAuthed ? (
            <>
              <Link to="/app/live-tracking">
                <Button
                  variant="outline"
                  className="rounded-md border-transparent bg-white/50 px-6 py-2.5 text-base font-semibold text-foreground hover:bg-white/75"
                >
                  Live Tracking
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="rounded-md bg-primary px-6 py-2.5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={handleLogout}
              >
                <LogOut className="mr-1 h-5 w-5" />
                Sign out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button
                variant="ghost"
                className="rounded-md bg-primary px-6 py-2.5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="mr-1 h-5 w-5" />
                Login/Register
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile auth icon */}
        <div className="md:hidden">
          {isAuthed ? (
            <Button
              size="icon"
              className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <Link to="/login">
              <Button
                size="icon"
                className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <LogIn className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};
