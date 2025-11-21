// src/components/Navbar.tsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogIn, LogOut } from "lucide-react";
import { fullLogout } from "@/lib/auth/logout";

interface NavbarProps {
  className?: string;
  variant?: "default" | "transparent"; // For different page styles
}

const API = "https://api.modovisa.com";

export const Navbar = ({ className = "", variant = "default" }: NavbarProps) => {
  const [isAuthed, setIsAuthed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  // Lightweight auth check: hit /api/me once with cookies
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API}/api/me`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        setIsAuthed(res.ok);
      } catch {
        if (!cancelled) setIsAuthed(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fullLogout("user", { source: "navbar" });
    // fullLogout will redirect (default: /login)
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const offset = 80; // approx navbar height
    const targetY = rect.top + window.scrollY - offset;

    window.scrollTo({
      top: targetY,
      behavior: "smooth",
    });
  };

  const handleSectionClick = (id: string) => {
    if (window.location.pathname !== "/") {
      // Go to homepage first, then scroll
      navigate("/#" + id);
      setTimeout(() => {
        scrollToSection(id);
      }, 50);
    } else {
      scrollToSection(id);
    }
  };

  return (
    <nav className={`glass-nav rounded-md px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        {/* Mobile: Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="text-foreground">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <div className="mt-8 flex flex-col gap-4">
              <button
                type="button"
                onClick={() => handleSectionClick("product")}
                className="text-left text-lg font-medium hover:text-primary transition-colors"
              >
                Product
              </button>
              <button
                type="button"
                onClick={() => handleSectionClick("features")}
                className="text-left text-lg font-medium hover:text-primary transition-colors"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => handleSectionClick("pricing")}
                className="text-left text-lg font-medium hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button
                type="button"
                onClick={() => handleSectionClick("landingFAQ")}
                className="text-left text-lg font-medium hover:text-primary transition-colors"
              >
                FAQs
              </button>

              <Link
                to="/guides"
                className="text-lg font-medium hover:text-primary transition-colors"
              >
                Guides
              </Link>

              <div className="pt-4 border-t">
                {isAuthed ? (
                  <>
                    <Link to="/app/live-tracking">
                      <Button
                        variant="outline"
                        className="mb-2 w-full border-transparent bg-white/50 text-foreground font-semibold transition-colors hover:bg-white/75"
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

        {/* Logo - Desktop: Left aligned, Mobile: Center */}
        <div className="hidden md:block">
          <Logo className="text-foreground" />
        </div>
        <div className="flex flex-1 justify-center md:hidden">
          <Logo className="text-foreground" />
        </div>

        {/* Desktop: Nav Links (centered) */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
          <button
            type="button"
            onClick={() => handleSectionClick("product")}
            className="text-base font-medium text-foreground transition-colors hover:text-primary"
          >
            Product
          </button>
          <button
            type="button"
            onClick={() => handleSectionClick("features")}
            className="text-base font-medium text-foreground transition-colors hover:text-primary"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => handleSectionClick("pricing")}
            className="text-base font-medium text-foreground transition-colors hover:text-primary"
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => handleSectionClick("landingFAQ")}
            className="text-base font-medium text-foreground transition-colors hover:text-primary"
          >
            FAQs
          </button>
          <Link
            to="/guides"
            className="text-base font-medium text-foreground transition-colors hover:text-primary"
          >
            Guides
          </Link>
        </div>

        {/* Desktop: Auth area */}
        <div className="hidden items-center gap-4 md:flex">
          {isAuthed ? (
            <>
              <Link to="/app/live-tracking">
                <Button
                  variant="outline"
                  className="rounded-md border-transparent bg-white/50 px-6 py-2.5 text-base font-semibold text-foreground transition-colors hover:bg-white/75 hover:text-foreground"
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

        {/* Mobile: Auth icon */}
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
