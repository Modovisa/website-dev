// src/pages/guides/Shopify.tsx

import { GuidesLayout } from "@/components/GuidesLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const Shopify = () => {
  const { trackingToken } = useTrackingScriptToken();
  const tokenPlaceholder = trackingToken || "YOUR_TRACKING_TOKEN";

  const handleCopyToken = () => {
    if (!trackingToken) return;
    navigator.clipboard.writeText(trackingToken);
  };

  return (
    <GuidesLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on Shopify
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Add Modovisa via the official Shopify App Embed — no code required.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The easiest way to enable Modovisa in Shopify is through the official{" "}
              <a
                href="https://apps.shopify.com/modovisa-analytics"
                target="_blank"
                rel="noopener"
                className="text-primary hover:underline font-semibold"
              >
                Modovisa Analytics App
              </a>
              . Once installed, you'll just need to paste your{" "}
              <span className="font-semibold text-foreground">Tracking Token</span>{" "}
              inside the App Embed section.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Works with <span className="font-semibold">Online Store 2.0</span> themes and newer.
                Requires no Liquid edits or code changes — everything is handled through the Theme
                Editor.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Installation Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Step-by-step</h2>

            <ol className="space-y-4 list-decimal list-inside text-muted-foreground">
              <li>
                Sign in at{" "}
                <a
                  href="https://modovisa.com"
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline"
                >
                  modovisa.com
                </a>{" "}
                and copy your{" "}
                <span className="font-semibold text-foreground">Tracking Token</span> for this store
                (found under <em>Account → Tracked Sites</em> or on the{" "}
                <em>Installation</em> page).
                {trackingToken && (
                  <div className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted px-2 py-1 text-xs">
                    <span className="text-muted-foreground">Detected token:</span>
                    <code className="rounded bg-background px-2 py-0.5 text-foreground">
                      {trackingToken}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={handleCopyToken}
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </li>
              <li>
                If you don't have an account yet:
                <ul className="ml-6 mt-2 space-y-1 list-disc">
                  <li>
                    Sign up at{" "}
                    <a
                      href="https://modovisa.com/register"
                      target="_blank"
                      rel="noopener"
                      className="text-primary hover:underline"
                    >
                      modovisa.com/register
                    </a>
                    .
                  </li>
                  <li>
                    Set up your first website to generate a{" "}
                    <span className="font-semibold text-foreground">Tracking Token</span>.
                  </li>
                </ul>
              </li>
              <li>
                Go to the official{" "}
                <a
                  href="https://apps.shopify.com/modovisa-analytics"
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline"
                >
                  Modovisa Analytics App
                </a>{" "}
                on the Shopify App Store and click{" "}
                <span className="font-semibold text-foreground">Install</span>.
              </li>
              <li>After installation, you'll be directed to the Modovisa App page.</li>
              <li>
                Click on the{" "}
                <span className="font-semibold text-foreground">
                  Open Theme editor → App embeds
                </span>{" "}
                button.
              </li>
              <li>
                You'll be directed to the Shopify{" "}
                <span className="font-semibold text-foreground">Theme Editor</span>.
              </li>
              <li>You'll find the Modovisa App embed on the top left.</li>
              <li>
                Find <span className="font-semibold text-foreground">Modovisa Analytics</span> and
                toggle it{" "}
                <span className="inline-flex items-center gap-1">
                  ON
                  <svg
                    width="34"
                    height="22"
                    viewBox="0 0 34 22"
                    xmlns="http://www.w3.org/2000/svg"
                    className="inline-block ml-1"
                  >
                    <rect x="1" y="1" width="32" height="20" rx="6" ry="6" fill="#2B2B2B" />
                    <rect x="18" y="5" width="12" height="12" rx="3" ry="3" fill="#FFFFFF" />
                  </svg>
                </span>
                .
              </li>
              <li>
                Paste your <span className="font-semibold text-foreground">Tracking Token</span> into
                the field labeled{" "}
                <span className="font-semibold text-foreground">
                  &quot;Modovisa tracking token&quot;
                </span>
                .
              </li>
              <li>
                Click <span className="font-semibold text-foreground">Save</span> in the top-right
                corner.
              </li>
            </ol>
          </div>

          {/* Info Alert */}
          <div className="mb-8 flex items-start gap-3 p-4 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              You don't need to add code manually — the app embed handles this automatically once
              enabled. Your <span className="font-semibold">Tracking Token</span> securely links the
              store to your Modovisa dashboard.
            </p>
          </div>

          {/* Video Tutorial */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Video Tutorial</h2>
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src="https://www.youtube.com/embed/dEx_Qy_uy4g?si=gzCmhBmV9raxbD0y"
                  title="Install Modovisa on Shopify"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Verification */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Verify the installation</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>Open your storefront in a new tab.</li>
              <li>
                Open <span className="font-mono text-foreground">DevTools → Network</span> and
                reload. Search for{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modovisa.min.js
                </code>
                .
              </li>
              <li>
                Once detected, go to your Modovisa dashboard →{" "}
                <span className="font-semibold text-foreground">Live Insights</span> to confirm your
                visit appears in real time.
              </li>
            </ul>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
            <a href="/guides">← Back to Guides</a>
          </Button>
          <Button variant="link" asChild>
            <a href="https://support.modovisa.com" target="_blank" rel="noopener">
              Need help? Contact Support
            </a>
          </Button>
        </div>
      </div>
    </GuidesLayout>
  );
};

export default Shopify;
