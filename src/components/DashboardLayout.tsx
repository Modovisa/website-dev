// src/components/DashboardLayout.tsx

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Menu, User, Settings, LogOut } from "lucide-react";

// ---- helpers (kept inline for a simple drop-in) ----
const API = "https://api.modovisa.com";
const DEFAULT_LOGIN_URL = "/login";

async function serverLogout(source = "menu") {
  const url = `${API}/api/logout?aud=user&src=${encodeURIComponent(source)}`;
  try {
    await fetch(url, {
      method: "POST",
      credentials: "include",
      keepalive: true,
      cache: "no-store",
    });
  } catch (e) {
    console.warn("[logout:user] server logout failed, continuing client cleanup:", e);
  }
}

function clearUiCaches() {
  try { localStorage.removeItem("username"); } catch {}
  try { localStorage.removeItem("active_website_domain"); } catch {}
  try { localStorage.removeItem("tracking_token"); } catch {}
  try { sessionStorage.clear(); } catch {}
  try { (window as any).__mvAccess = null; } catch {}
  try {
    const w: any = window as any;
    if (w.ws && typeof w.ws.close === "function") w.ws.close();
  } catch {}
  try { const w: any = window as any; if (w._mvBucketTimer) clearInterval(w._mvBucketTimer); } catch {}
}

function nameToInitials(s: string) {
  const caps = (s.match(/\b\w/g) || []).map((c) => c.toUpperCase()).join("");
  return (caps || "U").slice(0, 2);
}

async function fetchMe(): Promise<{ name: string; email: string } | null> {
  // prefer cached name to keep UI snappy
  const cached = (localStorage.getItem("username") || "").trim();
  let name = cached;

  try {
    const res = await fetch(`${API}/api/me`, { method: "GET", credentials: "include" });
    if (res.ok) {
      const me = await res.json();
      const nm =
        me.username ||
        me.name ||
        (me.email ? String(me.email).split("@")[0] : "User");
      name = nm || name || "User";
      localStorage.setItem("username", name);
      return { name, email: me.email ?? "" };
    }
    // non-200s: fall back to whatever we have
  } catch (e) {
    console.warn("[/api/me] error:", e);
  }

  if (name) return { name, email: "" };
  return { name: "User", email: "" };
}

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [name, setName] = useState<string>("User");
  const [email, setEmail] = useState<string>("");
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  // fetch user + cache
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetchMe();
      if (cancelled || !me) return;
      setName(me.name);
      setEmail(me.email || "");
    })();
    return () => { cancelled = true; };
  }, []);

  // try favicon avatar, else initials
  useEffect(() => {
    const domain = localStorage.getItem("active_website_domain");
    if (!domain) {
      setAvatarSrc(null);
      return;
    }
    const url = `https://${domain}/favicon.ico`;
    const img = new Image();
    img.onload = () => setAvatarSrc(url);
    img.onerror = () => setAvatarSrc(null);
    img.src = url;
  }, [/* update when site changes if you emit an event */]);

  const initials = useMemo(() => nameToInitials(name), [name]);

  const onLogout = async () => {
    await serverLogout("menu");
    clearUiCaches();
    try { new BroadcastChannel("mv-auth").postMessage({ type: "logout" }); } catch {}
    // Hard redirect avoids stale state
    window.location.replace(DEFAULT_LOGIN_URL);
    // If you prefer SPA navigate, comment the line above and use:
    // navigate(DEFAULT_LOGIN_URL, { replace: true });
  };

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b bg-card flex items-center px-4 lg:px-6">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <AppSidebar />
            </SheetContent>
          </Sheet>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Avatar + Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0" aria-label="Account menu">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/50 transition-all overflow-hidden">
                  {avatarSrc ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img src={avatarSrc} className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56 bg-card" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">{name || "User"}</p>
                  {email ? (
                    <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>
                  ) : null}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/app/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/app/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={onLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
};
