// src/components/Navbar.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    // Shared logout helper: clears caches, broadcasts, hits /api/logout, etc.
    await fullLogout("user", { source: "navbar" });
    // fullLogout will redirect (default: /login)
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
            <div className="flex flex-col gap-4 mt-8">
              <Link
                to="#product"
                className="text-lg font-medium hover:text-primary transition-colors"
              >
                Product
              </Link>
              <Link
                to="#features"
                className="text-lg font-medium hover:text-primary transition-colors"
              >
                Features
              </Link>
              <Link
                to="#pricing"
                className="text-lg font-medium hover:text-primary transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="#faq"
                className="text-lg font-medium hover:text-primary transition-colors"
              >
                FAQs
              </Link>

              <div className="pt-4 border-t">
                {isAuthed ? (
                  <>
                    <Link to="/app/live-tracking">
                      <Button
                        variant="outline"
                        className="w-full mb-2 bg-white/50 hover:bg-white/75 border-transparent text-foreground font-semibold transition-colors"
                      >
                        Live Tracking
                      </Button>
                    </Link>
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/login">
                      <Button variant="outline" className="w-full mb-2">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button className="w-full">
                        Get Started
                      </Button>
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
        <div className="md:hidden flex-1 flex justify-center">
          <Logo className="text-foreground" />
        </div>

        {/* Desktop: Nav Links (centered) */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
          <Link
            to="#product"
            className="text-base font-medium text-foreground hover:text-primary transition-colors"
          >
            Product
          </Link>
          <Link
            to="#features"
            className="text-base font-medium text-foreground hover:text-primary transition-colors"
          >
            Features
          </Link>
          <Link
            to="#pricing"
            className="text-base font-medium text-foreground hover:text-primary transition-colors"
          >
            Pricing
          </Link>
          <Link
            to="#faq"
            className="text-base font-medium text-foreground hover:text-primary transition-colors"
          >
            FAQs
          </Link>
        </div>

        {/* Desktop: Auth area */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthed ? (
            <>
              <Link to="/app/live-tracking">
                <Button
                  variant="outline"
                  className="rounded-md px-6 py-2.5 text-base font-semibold bg-white/50 hover:bg-white/75 border-transparent text-foreground hover:text-foreground transition-colors"
                >
                  Live Tracking
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2.5 text-base font-semibold"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-1" />
                Sign out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button
                variant="ghost"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2.5 text-base font-semibold"
              >
                <LogIn className="h-5 w-5 mr-1" />
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
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <Link to="/login">
              <Button
                size="icon"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md"
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
