// src/pages/app/Installation.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Copy, Check } from "lucide-react";
import { apiBase } from "@/lib/api";
import { secureFetch } from "@/lib/auth/auth";

const API = apiBase();

type TrackingWebsite = {
  id: number;
  domain: string;
  website_name: string;
  timezone: string | null;
};

type ConnectionStatus = "checking" | "active" | "inactive" | "no-activity" | "unknown";
type AppPlatform = "ios" | "android" | "webview";

type CodeSnippetProps = {
  code: string;
};

function CodeSnippet({ code }: CodeSnippetProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div className="rounded-md overflow-hidden border border-border/40">
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: "#313446" }}
      >
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ background: "#ee6a5f" }}
          />
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ background: "#f5be4f" }}
          />
          <span
            className="w-3 h-3 rounded-full inline-block"
            style={{ background: "#62c554" }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="h-7 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre
        className="m-0 p-3 text-xs md:text-sm text-white overflow-x-auto"
        style={{ background: "#24273a" }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  if (hours) return `${hours}h ${remMinutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

const Installation = () => {
  const [websites, setWebsites] = useState<TrackingWebsite[]>([]);
  const [selectedSite, setSelectedSite] = useState<TrackingWebsite | null>(null);

  const [trackingToken, setTrackingToken] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("checking");

  const [siteId, setSiteId] = useState<number | null>(null);
  const [platform, setPlatform] = useState<AppPlatform>("ios");
  const [appKey, setAppKey] = useState<string>("");

  const [overlapUntil, setOverlapUntil] = useState<string | null>(null);
  const [overlapEta, setOverlapEta] = useState<string>("");

  const [tokenCopied, setTokenCopied] = useState(false);

  const handle401 = () => {
    (window as any).logoutAndRedirect?.("401");
  };

    const handleCopyToken = async () => {
    if (!trackingToken) return;
    try {
      await navigator.clipboard.writeText(trackingToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 1200);
    } catch {
      // ignore clipboard errors
    }
  };


  // Load websites / projects
  useEffect(() => {
    let cancelled = false;

    const loadWebsites = async () => {
      try {
        const res = await secureFetch(`${API}/api/tracking-websites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (res.status === 401) {
          handle401();
          return;
        }
        if (!res.ok) throw new Error("Failed to load websites");

        const json = await res.json();
        const list: TrackingWebsite[] = Array.isArray(json.projects)
          ? json.projects
          : [];

        if (cancelled) return;

        setWebsites(list);

        if (!list.length) {
          setSelectedSite(null);
          return;
        }

        let initial: TrackingWebsite | null = list[0] ?? null;

        try {
          const saved = window.localStorage.getItem("active_website_domain");
          if (saved) {
            const match = list.find((p) => p.domain === saved);
            if (match) initial = match;
          }
        } catch {
          // ignore
        }

        setSelectedSite(initial);
      } catch {
        if (!cancelled) {
          setWebsites([]);
          setSelectedSite(null);
        }
      }
    };

    loadWebsites();

    return () => {
      cancelled = true;
    };
  }, []);

  const reloadForSite = useCallback(async () => {
    if (!selectedSite) {
      setTrackingToken("");
      setConnectionStatus("unknown");
      setSiteId(null);
      setAppKey("");
      setOverlapUntil(null);
      return;
    }

    const domain = selectedSite.domain;

    try {
      window.localStorage.setItem("active_website_domain", domain);
    } catch {
      // ignore
    }

    try {
      // 1) tracking token
      const tokenRes = await secureFetch(`${API}/api/tracking-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      if (tokenRes.status === 401) {
        handle401();
        return;
      }
      const tokenJson = await tokenRes.json();
      const token = tokenJson?.tracking_token || "";

      setTrackingToken(token || "");
      setConnectionStatus("checking");

      // 2) connection badge
      if (token) {
        try {
          const connRes = await secureFetch(`${API}/api/check-tracking-connection`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, domain }),
          });
          if (connRes.status === 401) {
            handle401();
            return;
          }
          const connJson = await connRes.json();
          setConnectionStatus(connJson.connected ? "active" : "inactive");
        } catch {
          setConnectionStatus("unknown");
        }
      } else {
        setConnectionStatus("no-activity");
      }

      // 3) site_id for SDK
      let resolvedSiteId: number | null = null;
      try {
        const siteRes = await secureFetch(`${API}/api/tracking-site-id`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });
        if (siteRes.status === 401) {
          handle401();
          return;
        }
        const siteJson = await siteRes.json();
        const sId = siteJson?.site_id ?? null;
        if (typeof sId === "number") {
          resolvedSiteId = sId;
        } else if (sId != null) {
          const parsed = parseInt(String(sId), 10);
          resolvedSiteId = Number.isNaN(parsed) ? null : parsed;
        } else {
          resolvedSiteId = null;
        }
      } catch {
        resolvedSiteId = null;
      }

      setSiteId(resolvedSiteId);

      if (!resolvedSiteId) {
        setAppKey("");
        setOverlapUntil(null);
        return;
      }

      // 4) app ingest key
      try {
        const keyRes = await secureFetch(`${API}/api/app-ingest-key`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            site_id: resolvedSiteId,
            platform,
          }),
        });
        if (keyRes.status === 401) {
          handle401();
          return;
        }
        const keyJson = await keyRes.json();
        setAppKey(keyJson?.app_key || "");
      } catch {
        setAppKey("");
      }

      // 5) overlap meta
      try {
        const rawRes = await secureFetch(`${API}/internal/app-keys/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain,
            site_id: resolvedSiteId,
            platform,
          }),
        });
        if (rawRes.status === 401) {
          handle401();
          return;
        }
        const rawJson = await rawRes.json();
        if (rawJson?.until && rawJson?.next) {
          setOverlapUntil(rawJson.until);
        } else {
          setOverlapUntil(null);
        }
      } catch {
        setOverlapUntil(null);
      }
    } catch {
      setTrackingToken("");
      setConnectionStatus("unknown");
      setSiteId(null);
      setAppKey("");
      setOverlapUntil(null);
    }
  }, [selectedSite, platform]);

  // Reload when site or platform changes
  useEffect(() => {
    reloadForSite();
  }, [reloadForSite]);

  // Overlap countdown
  useEffect(() => {
    if (!overlapUntil) {
      setOverlapEta("");
      return;
    }

    const update = () => {
      const left = Date.parse(overlapUntil) - Date.now();
      setOverlapEta(formatMs(left));
    };

    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [overlapUntil]);

  const tokenPlaceholder = trackingToken || "YOUR_PROJECT_TOKEN";
  const siteIdPlaceholder = siteId?.toString() ?? "YOUR_SITE_ID";
  const appKeyPlaceholder = appKey || "YOUR_PUBLIC_APP_KEY";

  const mainSnippet = useMemo(
    () =>
      `<script>
  !function(){
    var s=document.createElement("script");
    s.src="https://cdn.modovisa.com/modovisa.min.js";
    s.async=1;
    s.dataset.token="${tokenPlaceholder}";
    document.head.appendChild(s);
  }();
</script>`,
    [tokenPlaceholder]
  );

  const wpFunctionsSnippet = useMemo(
    () =>
      `function add_modovisa_script_to_head() {
  ?>
  <script>
    !function(){
      var s=document.createElement("script");
      s.src="https://cdn.modovisa.com/modovisa.min.js";
      s.async=1;
      s.dataset.token="${tokenPlaceholder}";
      document.head.appendChild(s);
    }();
  </script>
  <?php
}
add_action('wp_head', 'add_modovisa_script_to_head');`,
    [tokenPlaceholder]
  );

  const shopwareTwigSnippet = useMemo(
    () =>
      `{% block layout_head_javascript_hmr_mode %}
  {{ parent() }}
  <script>
    !function(){
      var s=document.createElement("script");
      s.src="https://cdn.modovisa.com/modovisa.min.js";
      s.async=1;
      s.dataset.token="${tokenPlaceholder}";
      document.head.appendChild(s);
    }();
  </script>
{% endblock %}`,
    [tokenPlaceholder]
  );

  const drupalModuleSnippet = useMemo(
    () =>
      `/**
 * Implements hook_page_attachments().
 */
function modovisa_page_attachments(array &$attachments) {
  $js = <<<EOT
  !function(){
    var s=document.createElement("script");
    s.src="https://cdn.modovisa.com/modovisa.min.js";
    s.async=1;
    s.dataset.token="${tokenPlaceholder}";
    document.head.appendChild(s);
  }();
  EOT;

  $attachments['#attached']['html_head'][] = [
    [
      '#tag' => 'script',
      '#attributes' => ['type' => 'text/javascript'],
      '#value' => $js,
    ],
    'modovisa_dynamic_script',
  ];
}`,
    [tokenPlaceholder]
  );

  const sdkScriptSnippet = useMemo(
    () => `<script src="${API}/sdk/modovisa-app-sdk.min.js"></script>`,
    []
  );

  const initSnippet = useMemo(
    () =>
      `<script>
  MV.init({
    siteId: "${siteIdPlaceholder}",
    apiBase: "${API}",
    appKey: "${appKeyPlaceholder}"  // optional
  });

  // Examples:
  MV.screen("Home");
  MV.event("signup", { plan: "pro" });
</script>`,
    [siteIdPlaceholder, appKeyPlaceholder]
  );

  const addToCartExample = `<button
  data-modovisa-event="add-to-cart"
  data-modovisa-product-id="sku-101"
  data-modovisa-price="29.99"
>
  Buy Now
</button>`;

  const affiliateExample = `<a
  href="https://partner.com/deal"
  target="_blank"
  rel="noopener noreferrer"
  data-modovisa-event="affiliate-click"
  data-modovisa-partner="PartnerName"
  data-modovisa-campaign="summer-sale"
>
  Check Out the Deal
</a>`;

  const downloadExample = `<a
  href="/downloads/whitepaper.pdf"
  download
  data-modovisa-event="download-pdf"
  data-modovisa-title="Whitepaper 2024"
>
  Download PDF
</a>`;

  const signupExample = `<button
  data-modovisa-event="signup"
  data-modovisa-location="homepage-hero"
>
  Get Started Free
</button>`;

  const selectExample = `<select data-modovisa-event="select-size">
  <option value="S">Small</option>
  <option value="M">Medium</option>
  <option value="L">Large</option>
</select>`;

  const quantityExample = `<input
  type="number"
  min="1"
  value="1"
  data-modovisa-event="quantity-changed"
/>`;

  const connectionMeta = useMemo(() => {
    switch (connectionStatus) {
      case "checking":
        return {
          label: "Checking...",
          className: "bg-slate-800 text-slate-100 border border-slate-600",
        };
      case "active":
        return {
          label: "Active within last 24 hours",
          className:
            "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ml-2 bg-success text-primary-foreground text-xs",
        };
      case "inactive":
      case "no-activity":
        return {
          label: "Inactive (no activity in last 24 hours)",
          className:
            "inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ml-2 bg-warning text-primary-foreground text-xs",
        };
      case "unknown":
      default:
        return {
          label: "Unknown",
          className: "bg-red-500/15 text-red-400 border border-red-500/40",
        };
    }
  }, [connectionStatus]);

  const handleGenerateKey = async () => {
    if (!selectedSite || !siteId) {
      alert("Select a website first.");
      return;
    }
    try {
      const res = await secureFetch(`${API}/internal/app-keys/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, platforms: [platform] }),
      });
      const json = await res.json();
      if (res.status === 401) {
        handle401();
        return;
      }
      if (!res.ok) {
        throw new Error(json?.error || "Failed to generate key");
      }
      await reloadForSite();
    } catch (err: any) {
      alert(err?.message || "Something went wrong while generating the key.");
    }
  };

  const handleRotateKey = async () => {
    if (!selectedSite || !siteId) {
      alert("Select a website first.");
      return;
    }
    const input = window.prompt("Overlap window (minutes)?", "60");
    if (input === null) return;
    const overlapMinutes = Math.max(0, parseInt(input, 10) || 60);

    try {
      const res = await secureFetch(`${API}/internal/app-keys/rotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          platform,
          overlap_minutes: overlapMinutes,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        handle401();
        return;
      }
      if (!res.ok) {
        throw new Error(json?.error || "Failed to rotate key");
      }
      await reloadForSite();
    } catch (err: any) {
      alert(err?.message || "Something went wrong while rotating the key.");
    }
  };

  const handlePromoteKey = async () => {
    if (!selectedSite || !siteId) {
      alert("Select a website first.");
      return;
    }
    try {
      const res = await secureFetch(`${API}/internal/app-keys/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          platform,
        }),
      });
      const json = await res.json();
      if (res.status === 401) {
        handle401();
        return;
      }
      if (!res.ok) {
        throw new Error(json?.error || "Failed to promote key");
      }
      await reloadForSite();
    } catch (err: any) {
      alert(err?.message || "Something went wrong while promoting the key.");
    }
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-8xl mx-auto space-y-10">
        {/* Page header */}
        <header className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Installation</h1>
          <p className="text-sm text-muted-foreground">
            Add the Modovisa tracking script to your site, then follow the
            platform-specific steps below.
          </p>
        </header>

        {/* Installation card: website selector + snippet */}
        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-xl">Add the tracking script</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">
                Takes just 1–3 minutes. Copy the HTML snippet below into the{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  &lt;head&gt;
                </code>{" "}
                of your website so it loads on every page.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="text-xs font-medium text-muted-foreground">
                Website
              </span>

              {websites.length ? (
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  value={selectedSite ? String(selectedSite.id) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    const site = websites.find(
                      (w) => String(w.id) === String(value)
                    );
                    setSelectedSite(site ?? null);
                  }}
                >
                  {websites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.website_name || site.domain}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge
                  variant="outline"
                  className="rounded-full border-destructive/40 bg-destructive/10 text-[11px] font-normal text-destructive"
                >
                  No website connected — set up tracking
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Website details */}
            <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
              <Badge
                variant="outline"
                className="bg-muted/40 font-normal text-xs md:text-[11px]"
              >
                Website:&nbsp;
                <span className="font-semibold text-primary">
                  {selectedSite?.website_name ?? "—"}
                </span>
              </Badge>
              <Badge
                variant="outline"
                className="bg-muted/40 font-normal text-xs md:text-[11px]"
              >
                Domain:&nbsp;
                <span className="font-semibold text-primary">
                  {selectedSite?.domain ?? "—"}
                </span>
              </Badge>
              <Badge
                variant="outline"
                className="bg-muted/40 font-normal text-xs md:text-[11px]"
              >
                Timezone:&nbsp;
                <span className="font-semibold text-primary">
                  {selectedSite?.timezone ?? "—"}
                </span>
              </Badge>

              {trackingToken && (
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/40 text-[11px]"
                >
                  <span className="opacity-80 mr-0.5">Tracking Token:</span>
                  <button
                    type="button"
                    onClick={handleCopyToken}
                    className="font-mono underline-offset-2 hover:underline focus-visible:outline-none"
                  >
                    {trackingToken}
                  </button>
                  {tokenCopied && (
                    <span className="ml-1 text-[10px] opacity-80">Copied</span>
                  )}
                </Badge>
              )}
            </div>

            {!websites.length && (
              <p className="text-xs text-muted-foreground">
                You don&apos;t have any tracking websites yet. Go to your
                Tracking Setup page and connect a domain before installing the
                script.
              </p>
            )}

            {/* Main tracking snippet */}
            <CodeSnippet code={mainSnippet} />

            {/* Connection badge */}
            {selectedSite && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium text-muted-foreground">
                  Connection
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] ${connectionMeta.className}`}
                >
                  {connectionMeta.label}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Installation instructions – platforms */}
        <section className="space-y-6" id="installation-instructions">
          <Badge className="inline-flex items-center px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-sky-500/10 text-sky-600 border border-sky-500/40 rounded-full text-[12px] font-medium">
            Installation Instructions
          </Badge>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left column platforms */}
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="wordpress">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on WordPress
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your WordPress site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> Install a plugin
                      like <strong>Insert Headers and Footers</strong>. After
                      activating it, go to{" "}
                      <strong>
                        Settings → Insert Headers and Footers → Header
                      </strong>{" "}
                      and paste the Modovisa snippet.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 2:</strong> Edit{" "}
                      <code>header.php</code>. Go to{" "}
                      <strong>
                        Appearance → Theme File Editor → header.php
                      </strong>
                      , and paste the snippet just before{" "}
                      <code>&lt;/head&gt;</code>.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 3:</strong> Use{" "}
                      <code>functions.php</code> to inject the script via{" "}
                      <code>wp_head</code>:
                    </p>
                    <CodeSnippet code={wpFunctionsSnippet} />

                    <p className="text-xs md:text-sm">
                      After saving, visit your site and check DevTools →{" "}
                      <strong>Network</strong> to confirm{" "}
                      <code>modovisa.min.js</code> loads on every page.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="shopify">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Shopify
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Shopify store
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> From Shopify
                      Admin go to{" "}
                      <strong>Online Store → Themes → Customize</strong>, then
                      open <strong>Theme Settings → Custom Code</strong> and
                      paste the snippet into the{" "}
                      <strong>Head &lt;/&gt;</strong> code box.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 2:</strong> Go to{" "}
                      <strong>Online Store → Themes → Edit Code</strong>,
                      open <code>layout/theme.liquid</code> and paste the
                      snippet just before <code>&lt;/head&gt;</code>.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      Publish, then open DevTools →{" "}
                      <strong>Network</strong> and confirm{" "}
                      <code>modovisa.min.js</code> loads across pages.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="wix">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Wix
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Wix site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> Go to{" "}
                      <strong>Dashboard → Settings → Custom Code</strong>, click{" "}
                      <strong>+ Add Custom Code</strong>, paste the snippet,
                      choose <strong>All pages</strong> and{" "}
                      <strong>Head</strong>, then apply.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      Publish your site, then use DevTools →{" "}
                      <strong>Network</strong> and refresh. You should see{" "}
                      <code>modovisa.min.js</code> loading from{" "}
                      <code>cdn.modovisa.com</code>.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="squarespace">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Squarespace
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Squarespace site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> Go to{" "}
                      <strong>Settings → Advanced → Code Injection</strong> and
                      paste the Modovisa snippet into the{" "}
                      <strong>Header</strong> field.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      Save, visit your live site and confirm{" "}
                      <code>modovisa.min.js</code> appears in the Network tab.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="webflow">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Webflow
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Webflow site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> In your Webflow
                      project, go to <strong>Settings → Custom Code</strong> and
                      paste the snippet into the <strong>Head Code</strong>{" "}
                      section. Save and publish.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      After publishing, open DevTools and confirm a request to{" "}
                      <code>cdn.modovisa.com/modovisa.min.js</code>.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="magento">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Magento
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Magento store
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> From Magento
                      Admin go to <strong>Content → Configuration</strong> and
                      edit your active store view. Under{" "}
                      <strong>Other Settings → HTML Head</strong>, paste the
                      snippet into <strong>Scripts and Style Sheets</strong>,
                      then save and flush cache.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      Reload your storefront and verify{" "}
                      <code>modovisa.min.js</code> in the Network tab.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Right column platforms */}
            <div className="space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="shopware">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Shopware
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Shopware storefront
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> Override{" "}
                      <code>meta.html.twig</code> and extend the{" "}
                      <code>layout_head_javascript_hmr_mode</code> block to
                      inject the Modovisa script:
                    </p>
                    <CodeSnippet code={shopwareTwigSnippet} />

                    <p className="text-xs md:text-sm">
                      Rebuild storefront assets and clear cache, then verify{" "}
                      <code>modovisa.min.js</code> is loading.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="weebly">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Weebly
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Weebly site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> In the Weebly
                      editor go to <strong>Settings → SEO</strong> and paste
                      the snippet into the <strong>Header Code</strong> field,
                      then save and publish.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      After publishing, confirm{" "}
                      <code>modovisa.min.js</code> in DevTools → Network.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="drupal">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Drupal
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Drupal site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> Add a custom
                      module and use <code>hook_page_attachments()</code> to
                      inject the inline script into the head.
                    </p>
                    <CodeSnippet code={drupalModuleSnippet} />

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 2:</strong> Use a module like{" "}
                      <strong>Header &amp; Footer Scripts</strong> and paste the
                      Modovisa snippet into the header scripts field.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      Clear caches and confirm <code>modovisa.min.js</code>{" "}
                      loads on page views.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="joomla">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Joomla
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Joomla site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> Edit your
                      template&apos;s <code>index.php</code> and paste the
                      snippet just before <code>&lt;/head&gt;</code>.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 2:</strong> Use an extension such as{" "}
                      <strong>Universal Head and Body Code Insert</strong> and
                      place the snippet into the head section.
                    </p>

                    <p className="text-xs md:text-sm">
                      Then verify that <code>modovisa.min.js</code> is
                      requested on your pages.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ghost">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install on Ghost
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script to your Ghost site
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> In Ghost
                      Admin, go to <strong>Settings → Code injection</strong>{" "}
                      and paste the snippet into the{" "}
                      <strong>Site Header</strong> section, then save.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      Hard refresh your site and then refresh the Modovisa
                      Installation page. You should see{" "}
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-500">
                        Active within last 24 hours
                      </span>{" "}
                      against your domain once events start coming in.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="gtm">
                  <AccordionTrigger className="text-sm font-semibold">
                    Install via Google Tag Manager (GTM)
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 text-sm text-muted-foreground">
                    <h3 className="text-base font-semibold">
                      How to add a tracking script via GTM
                    </h3>

                    <p className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs md:text-sm">
                      <strong>Option 1 (recommended):</strong> In GTM, create a{" "}
                      <strong>Custom HTML</strong> tag, paste the Modovisa
                      snippet, and use the <strong>All Pages</strong> trigger.
                      Publish your container.
                    </p>
                    <CodeSnippet code={mainSnippet} />

                    <p className="text-xs md:text-sm">
                      Use GTM&apos;s{" "}
                      <a
                        href="https://tagassistant.google.com/"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Tag Assistant
                      </a>{" "}
                      to preview and confirm the tag is firing, then verify{" "}
                      <code>modovisa.min.js</code> in DevTools.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>

        {/* Custom event tracking guide */}
        <section className="space-y-6" id="custom-event-tracking-guide">
          <hr className="border-border/60" />
          <Badge className="inline-flex items-center px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-amber-500/10 text-amber-600 border border-amber-500/40 rounded-full text-[12px] font-medium">
            Custom Event Instructions
          </Badge>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                How to track custom events with Modovisa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>
                  Custom events let you track important user actions beyond the
                  automatic click and form tracking built into Modovisa.
                </p>
                <p>
                  They&apos;re ideal for tracking{" "}
                  <strong>Add to Cart</strong>, <strong>Downloads</strong>,{" "}
                  <strong>Affiliate Clicks</strong>,{" "}
                  <strong>Signups</strong>, and more.
                </p>
                <ul className="list-disc pl-5">
                  <li>
                    Add <code>data-modovisa-event</code> to any HTML element —
                    this is the <strong>event name</strong>.
                  </li>
                  <li>
                    Attach extra metadata with{" "}
                    <code>data-modovisa-*</code> attributes (e.g. product ID,
                    price, plan).
                  </li>
                  <li>
                    Events show up in your Modovisa dashboard under the{" "}
                    <strong>Events</strong> views.
                  </li>
                </ul>
                <p>
                  Use short, semantic names in{" "}
                  <strong>kebab-case</strong> like{" "}
                  <code>add-to-cart</code>, <code>signup</code>,{" "}
                  <code>cta-click</code>.
                </p>
              </div>

              {/* Examples */}
              <div className="space-y-6">
                <div>
                  <h3 className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Track Add to Cart button
                  </h3>
                  <p className="mt-3">
                    Track when a user clicks an eCommerce &quot;add to cart&quot;
                    button.
                  </p>
                  <div className="mt-3">
                    <CodeSnippet code={addToCartExample} />
                  </div>
                </div>

                <div>
                  <h3 className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Track affiliate link clicks
                  </h3>
                  <p className="mt-3">
                    Use this for outbound links to affiliates or partner
                    campaigns.
                  </p>
                  <div className="mt-3">
                    <CodeSnippet code={affiliateExample} />
                  </div>
                </div>

                <div>
                  <h3 className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Track PDF or resource downloads
                  </h3>
                  <p className="mt-3">
                    Track downloads like whitepapers, guides, and other files.
                  </p>
                  <div className="mt-3">
                    <CodeSnippet code={downloadExample} />
                  </div>
                </div>

                <div>
                  <h3 className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Track signup or CTA buttons
                  </h3>
                  <p className="mt-3">
                    Track conversions from call-to-action buttons or signup
                    flows.
                  </p>
                  <div className="mt-3">
                    <CodeSnippet code={signupExample} />
                  </div>
                </div>

                <div>
                  <h3 className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Track dropdown / variant selection
                  </h3>
                  <p className="mt-3">
                    Track product variant selection (size, color, etc.) via
                    dropdowns.
                  </p>
                  <div className="mt-3">
                    <CodeSnippet code={selectExample} />
                  </div>
                </div>

                <div>
                  <h3 className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Track quantity or input fields
                  </h3>
                  <p className="mt-3">
                    Track changes to inputs like quantity pickers or custom
                    text fields.
                  </p>
                  <div className="mt-3">
                    <CodeSnippet code={quantityExample} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Best practices</h4>
                <ul className="list-disc pl-5">
                  <li>
                    Use short, semantic names like{" "}
                    <code>signup</code>, <code>add-to-cart</code>,{" "}
                    <code>affiliate-click</code>.
                  </li>
                  <li>Stick to kebab-case for event names and values.</li>
                  <li>
                    Use <code>data-modovisa-*</code> attributes to attach
                    structured metadata.
                  </li>
                </ul>
                <p className="text-xs">
                  That&apos;s it — no custom JavaScript needed. Add the
                  attributes and events will automatically appear in your
                  dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* App SDK section */}
        <section className="space-y-6" id="app-sdk-tracking-guide">
          <hr className="border-border/60" />
          <Badge className="inline-flex items-center px-2.5 py-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-purple-500/10 text-purple-600 border border-purple-500/40 rounded-full text-[12px] font-medium">
            App SDK (iOS / Android / WebView / RN)
          </Badge>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Track app screens &amp; events with the Modovisa App SDK
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-muted-foreground">
              <div className="space-y-2">
                <p>
                  The Modovisa App SDK lets you send{" "}
                  <strong>screen views</strong> and{" "}
                  <strong>custom events</strong> from mobile apps or WebViews.
                  It batches automatically, retries on flaky networks and queues
                  offline where possible.
                </p>
                <ul className="list-disc pl-5">
                  <li>Use your Modovisa <strong>Site ID</strong>.</li>
                  <li>
                    (Optional) Use per-platform{" "}
                    <strong>app ingest keys</strong> for governance and
                    rotation.
                  </li>
                </ul>
              </div>

              {/* Step 1 – include SDK */}
              <div className="space-y-3">
                <Badge className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Step 1 — Include the SDK
                </Badge>
                <p>Use the minified build in production:</p>
                <CodeSnippet code={sdkScriptSnippet} />
              </div>

              {/* Step 2 – initialize */}
              <div className="space-y-3">
                <Badge className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Step 2 — Initialize
                </Badge>
                <p>
                  Initialize once on app start. <code>siteId</code> is
                  required; <code>appKey</code> is optional but recommended if
                  you plan to rotate keys per platform.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex overflow-hidden rounded-full border border-border text-xs">
                    {(["ios", "android", "webview"] as AppPlatform[]).map(
                      (p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPlatform(p)}
                          className={[
                            "px-3 py-1.5 font-medium capitalize",
                            platform === p
                              ? "bg-muted text-foreground"
                              : "bg-background text-muted-foreground",
                          ].join(" ")}
                        >
                          {p === "ios"
                            ? "iOS"
                            : p === "android"
                            ? "Android"
                            : "WebView"}
                        </button>
                      )
                    )}
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium">
                    Site ID:{" "}
                    <span className="font-semibold">{siteIdPlaceholder}</span>
                  </span>
                </div>

                <CodeSnippet code={initSnippet} />

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    Current key:{" "}
                    <code className="text-[11px]">{appKeyPlaceholder}</code>
                  </span>
                  {overlapUntil && overlapEta && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-500">
                      Overlap ends in <strong>{overlapEta}</strong>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleGenerateKey}
                  >
                    Generate key
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleRotateKey}
                  >
                    Rotate key
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handlePromoteKey}
                  >
                    Promote now
                  </Button>
                </div>

                <div className="space-y-1 text-xs">
                  <p>
                    <strong>Generate</strong> fills the Current key you can use
                    in app config.
                  </p>
                  <p>
                    <strong>Rotate</strong> stages a new key with an overlap
                    window so both keys are valid while you roll out a new app
                    version.
                  </p>
                  <p>
                    <strong>Promote</strong> moves the staged key to current
                    immediately and ends the overlap early.
                  </p>
                </div>
              </div>

              {/* What to send */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">
                  What to send from your app
                </h4>
                <ul className="list-disc pl-5 text-xs md:text-sm">
                  <li>
                    <code>MV.screen(name)</code> — for navigations / views.
                    Example: <code>MV.screen("Home")</code>
                  </li>
                  <li>
                    <code>MV.event(name, props?)</code> — for actions. Example:{" "}
                    <code>MV.event("signup", &#123; plan: "pro" &#125;)</code>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Tip: stick to a consistent naming convention (e.g.,{" "}
                  <code>TitleCase</code> for screens and{" "}
                  <code>snake_case</code> or <code>kebab-case</code> for event
                  names).
                </p>
              </div>

              {/* Step 4 – verify */}
              <div className="space-y-3">
                <Badge className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  Step 3 — Verify
                </Badge>
                <ol className="list-decimal pl-5 text-xs md:text-sm space-y-1">
                  <li>Run the app with the initialized SDK.</li>
                  <li>
                    Trigger a few <code>MV.screen(...)</code> and{" "}
                    <code>MV.event(...)</code> calls.
                  </li>
                  <li>
                    Check the connection badge at the top of this page and
                    your dashboard events.
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground">
                  If the badge shows &quot;Inactive&quot;, make sure you chose
                  the correct site in the selector and that you&apos;re sending
                  events to this environment.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
};

export default Installation;
