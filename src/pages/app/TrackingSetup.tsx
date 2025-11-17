// src/pages/TrackingSetup.tsx

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { AnimatedGradientBackground } from "@/components/AnimatedGradientBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { secureFetch } from "@/lib/auth/auth";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiBase } from "@/lib/api";

type Category = { value: string; label: string };
type TimezoneOption = { value: string; label: string };

// Mirror Bootstrap categories
const WEBSITE_CATEGORIES: Category[] = [
  { value: "arts_entertainment", label: "Arts & Entertainment" },
  { value: "autos_vehicles", label: "Autos & Vehicles" },
  { value: "beauty_fitness", label: "Beauty & Fitness" },
  { value: "books_literature", label: "Books & Literature" },
  { value: "business_industrial", label: "Business & Industrial" },
  { value: "computers_electronics", label: "Computers & Electronics" },
  { value: "software", label: "Software" },
  { value: "finance", label: "Finance" },
  { value: "food_drink", label: "Food & Drink" },
  { value: "games", label: "Games" },
  { value: "health", label: "Health" },
  { value: "home_garden", label: "Home & Garden" },
  { value: "internet_telecom", label: "Internet & Telecom" },
  { value: "jobs_education", label: "Jobs & Education" },
  { value: "law_government", label: "Law & Government" },
  { value: "news", label: "News" },
  { value: "online_communities", label: "Online Communities" },
  { value: "people_society", label: "People & Society" },
  { value: "pets_animals", label: "Pets & Animals" },
  { value: "real_estate", label: "Real Estate" },
  { value: "reference", label: "Reference" },
  { value: "science", label: "Science" },
  { value: "shopping", label: "Shopping" },
  { value: "affiliate_sites", label: "Affiliate & Review Sites" },
  { value: "sports", label: "Sports" },
  { value: "travel", label: "Travel" },
  { value: "other", label: "Other Business Activity" },
];

// Normalise the domain like the Bootstrap script
function normalizeDomain(input: string): string {
  let v = String(input).trim();
  v = v.replace(/^https?:\/\/+/i, ""); // remove http(s)://
  v = v.replace(/^www\./i, ""); // drop leading www.
  v = v.split("/")[0]; // remove any path
  v = v.split("?")[0].split("#")[0]; // remove query/fragment
  if (v.includes(":")) v = v.split(":")[0]; // drop :port if present
  return v;
}

// Simple domain format check
function looksLikeDomain(domain: string): boolean {
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain);
}

// Build timezone list using Intl where available; fallback to a small set
function buildTimezoneOptions(): TimezoneOption[] {
  try {
    const supported =
      (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;

    const zones =
      supported && supported.length
        ? supported
        : [
            "UTC",
            "Europe/London",
            "America/New_York",
            "Asia/Kolkata",
            "Asia/Tokyo",
          ];

    return zones
      .slice()
      .sort((a, b) => a.localeCompare(b))
      .map((tz) => ({
        value: tz,
        label: tz,
      }));
  } catch {
    const fallback = [
      "UTC",
      "Europe/London",
      "America/New_York",
      "Asia/Kolkata",
      "Asia/Tokyo",
    ];
    return fallback.map((tz) => ({ value: tz, label: tz }));
  }
}

const TrackingSetup = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthGuard();

  const [websiteName, setWebsiteName] = useState("");
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState<string>("");
  const [timezone, setTimezone] = useState<string>("");
  const [timezoneOptions, setTimezoneOptions] = useState<TimezoneOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialise timezone list + default selection (like moment.tz.guess())
  useEffect(() => {
    const options = buildTimezoneOptions();
    setTimezoneOptions(options);

    try {
      const guessed = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (guessed && options.some((o) => o.value === guessed)) {
        setTimezone(guessed);
      } else if (options.length) {
        setTimezone(options[0].value);
      }
    } catch {
      if (options.length) setTimezone(options[0].value);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmedName = websiteName.trim();
    const normDomain = normalizeDomain(domain);
    const tz = timezone;
    const cat = category;

    if (!trimmedName || !normDomain || !tz || !cat) {
      setFormError("All fields are required.");
      return;
    }

    if (!looksLikeDomain(normDomain)) {
      setFormError('Enter a valid domain like "example.com" (no http/https).');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = `${apiBase()}/api/tracking-setup`;

      const res = await secureFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website_name: trimmedName,
          domain: normDomain,
          timezone: tz,
          category: cat,
        }),
      });

      if (res.status === 401) {
        (window as any).logoutAndRedirect?.("401");
        setIsSubmitting(false);
        return;
      }

      const result = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        setFormError(result?.error || "Failed to create tracking setup.");
        setIsSubmitting(false);
        return;
      }

      // store normalized domain for later use (same as Bootstrap version)
      localStorage.setItem("active_website_domain", normDomain);

      // Go to React installation page
      navigate("/app/installation");
    } catch (err) {
      console.error("tracking-setup", err);
      setFormError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  // Don’t render form until auth guard has run
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <AnimatedGradientBackground layout="full">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg glass-card rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="flex flex-col items-center space-y-2 py-4">
              <Link to="/">
                <Logo showBeta={false} />
              </Link>
              <p className="text-lg font-semibold mb-0">Intuitive Analytics.</p>
              <h1 className="text-2xl font-semibold mt-6">Track your website</h1>
            </div>
            <p className="text-center text-muted-foreground text-sm">
              Provide some details about the website you&apos;d like to track.
              <br />
              We&apos;ll use this to generate your personalized tracking script.
            </p>
          </div>

          {formError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {formError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Website Name */}
            <div className="space-y-2">
              <Label htmlFor="website-name" className="font-semibold">
                Website Name
              </Label>
              <Input
                id="website-name"
                type="text"
                placeholder="Enter your website name"
                className="h-12"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                autoFocus
              />
            </div>

            {/* Domain */}
            <div className="space-y-2">
              <Label htmlFor="domain" className="font-semibold">
                Domain
              </Label>
              <div className="flex gap-2">
                <div className="bg-muted rounded-lg px-4 flex items-center text-sm text-muted-foreground border">
                  https://
                </div>
                <Input
                  id="domain"
                  type="text"
                  placeholder="mywebsite.com"
                  className="h-12 flex-1"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  maxLength={100}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Do not include &quot;https://&quot;
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="font-semibold">
                Website Category
              </Label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val)}
              >
                <SelectTrigger id="category" className="h-12">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {WEBSITE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timezone" className="font-semibold">
                Timezone
              </Label>
              <Select
                value={timezone}
                onValueChange={(val) => setTimezone(val)}
              >
                <SelectTrigger id="timezone" className="h-12">
                  <SelectValue placeholder="Select a time zone" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {timezoneOptions.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Date ranges, time ranges, and visitor activity times will follow
                this timezone. You can change it later if needed.
              </p>
            </div>

            {/* Primary action */}
            <Button
              className="w-full h-12 text-base"
              size="lg"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Setting up…" : "Setup Tracking"}
            </Button>

            {/* Set up later */}
            <Link to="/app/live-tracking">
              <Button
                variant="ghost"
                className="w-full mt-4"
                type="button"
                disabled={isSubmitting}
              >
                Set up later
              </Button>
            </Link>
          </form>
        </div>
      </div>
    </AnimatedGradientBackground>
  );
};

export default TrackingSetup;
