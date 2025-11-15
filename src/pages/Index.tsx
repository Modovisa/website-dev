// src/pages/Index.tsx

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  Eye,
  BarChart2,
  Zap,
  Shield,
  Globe,
  Clock,
  Package,
  Briefcase,
  Check,
} from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { secureFetch } from "@/lib/auth";
import { RegisterModal } from "@/components/auth/RegisterModal";

// TypeScript declaration for Gradient
declare global {
  interface Window {
    Gradient: any;
  }
}

type PublicPricingTier = {
  id: number;
  name: string;
  min_events: number;
  max_events: number;
  monthly_price: number;
  stripe_price_id_month?: string | null;
  stripe_price_id_year?: string | null;
};

const SNAP_STEPS = [
  25_000,
  100_000,
  250_000,
  500_000,
  1_000_000,
  2_000_000,
  5_000_000,
  10_000_000,
  15_000_000,
  20_000_000,
];

const INTENT_KEY = "intent_upgrade";

// Fallback in case the public tiers endpoint is unavailable.
// Only used as a safety net; real environments should rely on the API.
const FALLBACK_PAID_TIERS: PublicPricingTier[] = [
  { id: 1, name: "Pro 25k", min_events: 25_000, max_events: 25_000, monthly_price: 14 },
  { id: 2, name: "Pro 50k", min_events: 50_000, max_events: 50_000, monthly_price: 24 },
  { id: 3, name: "Pro 100k", min_events: 100_000, max_events: 100_000, monthly_price: 44 },
  { id: 4, name: "Pro 250k", min_events: 250_000, max_events: 250_000, monthly_price: 99 },
  { id: 5, name: "Pro 500k", min_events: 500_000, max_events: 500_000, monthly_price: 179 },
];

const Index = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [eventIndex, setEventIndex] = useState(0); // index into SNAP_STEPS
  const [tiers, setTiers] = useState<PublicPricingTier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientInitialized = useRef(false);

  // Initialize gradient - exactly like Bootstrap version
  useEffect(() => {
    if (gradientInitialized.current) return;

    const initGradient = () => {
      if (typeof window.Gradient !== "undefined" && canvasRef.current) {
        try {
          const gradient = new window.Gradient();
          gradient.initGradient(".gradient-canvas");
          gradientInitialized.current = true;
          console.log("✅ Gradient initialized");
        } catch (error) {
          console.error("❌ Gradient init error:", error);
        }
      } else {
        console.log("Waiting for Gradient...");
        setTimeout(initGradient, 100);
      }
    };

    initGradient();
  }, []);

  // Load pricing tiers from the public-safe endpoint (mirrors Bootstrap logic)
  useEffect(() => {
    let cancelled = false;

    async function loadTiers() {
      setTiersLoading(true);
      try {
        const res = await secureFetch("/api/billing-pricing-tiers?public=1");
        if (!res.ok) {
          console.error("[landing] failed to fetch pricing tiers:", res.status);
          return;
        }
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setTiers(data);
        }
      } catch (err) {
        console.error("[landing] error fetching pricing tiers:", err);
      } finally {
        if (!cancelled) setTiersLoading(false);
      }
    }

    loadTiers();
    return () => {
      cancelled = true;
    };
  }, []);

  const paidTiers = useMemo<PublicPricingTier[]>(() => {
    const source = tiers.length ? tiers : FALLBACK_PAID_TIERS;
    return source.filter((t) => (t.monthly_price ?? 0) > 0);
  }, [tiers]);

  const selectedEvents = SNAP_STEPS[eventIndex] ?? SNAP_STEPS[0];

  const matchedTier = useMemo<PublicPricingTier | null>(() => {
    if (!paidTiers.length) return null;
    const tier =
      paidTiers.find(
        (t) =>
          typeof t.min_events === "number" &&
          typeof t.max_events === "number" &&
          selectedEvents >= t.min_events &&
          selectedEvents <= t.max_events
      ) ?? paidTiers[0];
    return tier || null;
  }, [paidTiers, selectedEvents]);

  const effectiveMonthlyPrice = useMemo(() => {
    if (!matchedTier) return 0;
    const base = matchedTier.monthly_price ?? 0;
    return isYearly ? Math.ceil(base * 0.8) : base;
  }, [matchedTier, isYearly]);

  // Keep a simple upgrade intent in localStorage, same key as Bootstrap
  useEffect(() => {
    if (!matchedTier || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        INTENT_KEY,
        JSON.stringify({
          tier_id: matchedTier.id,
          interval: isYearly ? "year" : "month",
        })
      );
    } catch (err) {
      console.warn("[landing] unable to persist pricing intent", err);
    }
  }, [matchedTier, isYearly]);

  // 🔐 Pro plan CTA: mirror Bootstrap's homepage-get-started behaviour
  const handleProGetStarted = useCallback(async () => {
    // 1) Persist latest intent explicitly (defensive)
    if (matchedTier && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          INTENT_KEY,
          JSON.stringify({
            tier_id: matchedTier.id,
            interval: isYearly ? "year" : "month",
          })
        );
      } catch (err) {
        console.warn("[landing] unable to persist pricing intent from CTA", err);
      }
    }

    // 2) Probe auth via /api/me (like isLoggedInViaCookie in Bootstrap)
    try {
      const res = await secureFetch("/api/me");
      if (!res.ok) {
        // Not logged in → open register modal
        setShowRegisterModal(true);
        return;
      }

      // Logged in → go straight to profile (no checkout on homepage)
      window.location.href = "/app/user-profile";
    } catch (err) {
      console.error("[landing] /api/me probe failed, falling back to modal", err);
      setShowRegisterModal(true);
    }
  }, [matchedTier, isYearly]);

  const features = [
    {
      icon: Eye,
      title: "Real-Time Tracking",
      description:
        "Watch visitors navigate your site in real-time with detailed session recordings.",
    },
    {
      icon: BarChart2,
      title: "Advanced Analytics",
      description: "Deep insights into user behavior, conversions, and funnel analysis.",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Lightweight script that won't slow down your website performance.",
    },
    {
      icon: Shield,
      title: "Privacy First",
      description: "GDPR compliant with respect for user privacy and data protection.",
    },
    {
      icon: Globe,
      title: "Global Coverage",
      description:
        "Track visitors from anywhere in the world with accurate geolocation.",
    },
    {
      icon: Clock,
      title: "Session Replay",
      description:
        "Replay user sessions to understand exactly how visitors interact.",
    },
  ];

  const eventsLabel = `${selectedEvents.toLocaleString()} events / mo`;

  const isPriceLoaded = !!matchedTier && !tiersLoading;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden flex items-center">
        {/* Canvas directly in section - just like Bootstrap */}
        <canvas
          ref={canvasRef}
          className="gradient-canvas"
          style={{ height: "100%", width: "100%" }}
        />

        {/* Optional grid overlay for texture */}
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:60px_60px] pointer-events-none" />

        {/* Content container - positioned above the canvas */}
        <div className="container relative mx-auto px-4 pt-6 pb-20 z-10">
          {/* Navbar Component */}
          <Navbar className="mb-16" />

          <div className="max-w-4xl mx-auto text-center text-white space-y-8 py-20">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Intuitive Analytics
              <br />
              <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                for Modern Teams
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto">
              Track visitors, analyze behavior, and grow your business with beautiful,
              actionable insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Link to="/register">
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 h-14 px-8 text-lg"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="hero" className="h-14 px-8 text-lg">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      {/* ...unchanged... */}

      {/* Pricing Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Tailored pricing plans designed for you
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start for free — upgrade as your needs grow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="p-8 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300">
              {/* ...free card unchanged... */}
              <Link to="/register" className="block">
                <Button variant="outline" className="w-full h-12 text-base" size="lg">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="p-8 rounded-2xl border-2 border-primary bg-card hover:shadow-xl transition-all duration-300 relative">
              <div className="flex flex-col items-center mb-8">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Briefcase className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-6">Pro</h3>

                {/* Monthly/Yearly Toggle */}
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className={`text-sm ${
                      !isYearly ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Monthly
                  </span>
                  <Switch checked={isYearly} onCheckedChange={setIsYearly} />
                  <span
                    className={`text-sm ${
                      isYearly ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Yearly
                  </span>
                  <Badge
                    variant={isYearly ? "default" : "secondary"}
                    className="text-xs"
                  >
                    Save 20%
                  </Badge>
                </div>

                {/* Price Slider */}
                <div className="mb-8 w-full">
                  {/* ...slider block unchanged... */}
                  {/* (uses eventsLabel, effectiveMonthlyPrice, etc.) */}
                  {/* ... */}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {/* ...Pro features unchanged... */}
              </div>

              {/* 🔑 This is now the ONLY button that opens the register modal */}
              <Button
                className="w-full h-12 text-base"
                size="lg"
                onClick={handleProGetStarted}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA, FAQ, Footer – unchanged */}
      {/* ... */}

      <SiteFooter />

      {/* Register modal (used only for Pro pricing CTA) */}
      <RegisterModal
        open={showRegisterModal}
        onOpenChange={setShowRegisterModal}
      />
    </div>
  );
};

export default Index;
