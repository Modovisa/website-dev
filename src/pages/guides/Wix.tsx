// src/pages/guides/Wix.tsx

import { GuidesLayout } from "@/components/GuidesLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const Wix = () => {
  const { trackingToken } = useTrackingScriptToken();
  const tokenPlaceholder = trackingToken || "YOUR_TRACKING_TOKEN";

  const handleCopyToken = () => {
    if (!trackingToken) return;
    navigator.clipboard.writeText(trackingToken);
  };

  const copyToClipboard = () => {
    const code = `<script>
  !function(){
    var s=document.createElement("script");
    s.src="https://cdn.modovisa.com/modovisa.min.js";
    s.async=1;
    s.dataset.token="${tokenPlaceholder}";
    document.head.appendChild(s);
  }();
</script>`;
    navigator.clipboard.writeText(code);
  };

  return (
    <GuidesLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on Wix
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Add the Modovisa tracking script via Wix Custom Code to start
            real-time analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The recommended way to add Modovisa to Wix is via{" "}
              <span className="font-semibold text-foreground">Custom Code</span>{" "}
              in your site's dashboard. Paste your{" "}
              <span className="font-semibold text-foreground">
                Tracking Token
              </span>{" "}
              and load it on all pages in the{" "}
              <span className="font-semibold text-foreground">Head</span>.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Before you begin:</span> Make
                sure your site is{" "}
                <a
                  href="https://support.wix.com/en/article/wix-editor-publishing-your-site"
                  target="_blank"
                  rel="noopener"
                  className="underline font-semibold"
                >
                  published
                </a>{" "}
                and has a{" "}
                <a
                  href="https://support.wix.com/en/article/connecting-a-domain-to-your-site-195136"
                  target="_blank"
                  rel="noopener"
                  className="underline font-semibold"
                >
                  connected domain
                </a>
                .
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Installation Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Step-by-step</h2>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>
                Sign up at{" "}
                <a
                  href="https://modovisa.com"
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline"
                >
                  modovisa.com
                </a>
                .
              </li>
              <li>
                Set up tracking for your website to get your{" "}
                <span className="font-semibold text-foreground">
                  Tracking Token
                </span>
                .
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
                      className="h-7 px-2 text-xs border border-black bg-black text-white hover:bg-white hover:text-black"
                      onClick={handleCopyToken}
                    >
                      Copy
                    </Button>
                  </div>
                )}
              </li>
              <li>
                <a
                  href="https://www.wix.com/my-account/site-selector/?buttonText=Open%20Settings&title=Select%20a%20Site&autoSelectOnSingleSite=true&actionUrl=https://www.wix.com/dashboard/{{metaSiteId}}/settings"
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline"
                >
                  Go to{" "}
                  <span className="font-semibold text-foreground">Settings</span>
                </a>{" "}
                in your site's dashboard.
              </li>
              <li>
                In the{" "}
                <span className="font-semibold text-foreground">Advanced</span>{" "}
                section, click{" "}
                <span className="font-semibold text-foreground">
                  Custom Code
                </span>
                .
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">
                  + Add Custom Code
                </span>{" "}
                (top right).
              </li>
              <li>Paste the Modovisa script below.</li>
              <li>
                Give it a recognizable name (e.g.,{" "}
                <em>Modovisa Analytics</em>).
              </li>
              <li>
                Under{" "}
                <span className="font-semibold text-foreground">
                  Add Code to Pages
                </span>
                , choose{" "}
                <span className="font-semibold text-foreground">All pages</span>{" "}
                and (recommended) "<em>Load code once</em>".
              </li>
              <li>
                Under{" "}
                <span className="font-semibold text-foreground">
                  Place Code in
                </span>
                , select{" "}
                <span className="font-semibold text-foreground">Head</span>.
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">Apply</span>,
                then{" "}
                <span className="font-semibold text-foreground">Publish</span>{" "}
                your site.
              </li>
            </ol>
          </div>

          {/* Code Snippet */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Tracking Script</h2>
            <div className="bg-slate-900 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="text-xs border border-black bg-black text-white hover:bg-white hover:text-black"
                >
                  Copy Code
                </Button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-slate-100">
                  {`<script>
  !function(){
    var s=document.createElement("script");
    s.src="https://cdn.modovisa.com/modovisa.min.js";
    s.async=1;
    s.dataset.token="`}
                  <span className="text-green-400">
                    {tokenPlaceholder}
                  </span>
                  {`";
    document.head.appendChild(s);
  }();
</script>`}
                </code>
              </pre>
            </div>
          </div>

          {/* Video Tutorial */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Video Tutorial</h2>
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src="https://www.youtube.com/embed/NypdehiSXIU"
                  title="Install Modovisa on Wix"
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
            <ul className="space-y-2 list-disc list-inside text-muted-foreground mb-6">
              <li>
                Open your live site (not the editor preview) → DevTools →{" "}
                <span className="font-mono text-foreground">Network</span>,
                search for{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modovisa.min.js
                </code>
                .
              </li>
              <li>
                Enable{" "}
                <span className="font-mono text-foreground">Preserve log</span>{" "}
                and refresh—confirm the script loads on public pages.
              </li>
              <li>
                In your Modovisa dashboard, open{" "}
                <span className="font-semibold text-foreground">Live</span> to
                see your own visit in real time.
              </li>
            </ul>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Using Wix caching or a custom CDN? After adding the code, wait a
                minute and refresh the live site. If still not visible,
                republish the site and clear CDN cache.
              </p>
            </div>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
            <a href="/guides">← Back to Docs</a>
          </Button>
          <Button variant="link" asChild>
            <a
              href="https://support.modovisa.com"
              target="_blank"
              rel="noopener"
            >
              Need help? Contact Support
            </a>
          </Button>
        </div>
      </div>
    </GuidesLayout>
  );
};

export default Wix;
