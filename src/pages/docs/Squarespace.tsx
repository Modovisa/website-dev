// src/pages/docs/Squarespace.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const Squarespace = () => {
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
    <DocsLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on Squarespace
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Add the Modovisa tracking script via Code Injection for site-wide
            analytics (recommended), or per page.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The easiest way to track every page is Squarespace&apos;s{" "}
              <span className="font-semibold text-foreground">
                Code Injection
              </span>{" "}
              (site-wide). Paste your{" "}
              <span className="font-semibold text-foreground">
                Tracking Token
              </span>{" "}
              in the{" "}
              <span className="font-semibold text-foreground">HEADER</span>{" "}
              field and save. You can also add the snippet only to specific
              pages if you prefer.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Make sure you&apos;re editing the correct site and it&apos;s{" "}
                <span className="font-semibold">published</span>. Some
                templates/CDNs may require a quick refresh after saving.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Site-wide Tracking */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Site-wide tracking — Recommended
            </h2>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-6">
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
                Log in to your{" "}
                <span className="font-semibold text-foreground">
                  Squarespace
                </span>{" "}
                admin.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  Website → Pages
                </span>
                .
              </li>
              <li>
                In the left sidebar, open{" "}
                <span className="font-semibold text-foreground">
                  Custom Code → Code Injection
                </span>
                .
              </li>
              <li>
                Paste the Modovisa snippet into the{" "}
                <span className="font-semibold text-foreground">HEADER</span>{" "}
                field (see snippet below).
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">Save</span>.
              </li>
            </ol>

            {/* Code Snippet */}
            <div className="bg-slate-900 rounded-lg overflow-hidden mb-6">
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

            {/* Video Tutorial – Site-wide */}
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src="https://www.youtube.com/embed/NFdnnGeP6Tk?si=1ns5UVwQTwp2HrzA"
                  title="Install Modovisa on Squarespace (site-wide)"
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

          {/* Alternative Single Page */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Alternative — Track a single page
            </h2>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-6">
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
              </li>
              <li>
                Log in to your{" "}
                <span className="font-semibold text-foreground">
                  Squarespace
                </span>{" "}
                admin.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  Website → Pages
                </span>
                .
              </li>
              <li>
                Hover the page you want to track and click the{" "}
                <span className="font-semibold text-foreground">
                  Settings
                </span>{" "}
                (⚙️) icon.
              </li>
              <li>
                Open{" "}
                <span className="font-semibold text-foreground">Advanced</span>.
              </li>
              <li>
                Paste the Modovisa snippet into{" "}
                <span className="font-semibold text-foreground">
                  Page Header Code Injection
                </span>
                .
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">Save</span>.
              </li>
            </ol>

            {/* Video Tutorial – Single page */}
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src="https://www.youtube.com/embed/q_VOo9Sv7I0?si=dok00GWXDJUnnQ4D"
                  title="Install Modovisa on Squarespace (single page)"
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
                Open the published site/page → DevTools →{" "}
                <span className="font-mono text-foreground">Network</span> →
                search for{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modovisa.min.js
                </code>
                .
              </li>
              <li>
                Enable{" "}
                <span className="font-mono text-foreground">Preserve log</span>{" "}
                and refresh—confirm the script loads.
              </li>
              <li>
                Check Modovisa{" "}
                <span className="font-semibold text-foreground">Live</span> to
                see your visit in real time.
              </li>
            </ul>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Using a CDN or caching? After saving, wait a minute or clear
                cache and refresh the live site. Some templates may take a short
                time to propagate changes.
              </p>
            </div>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            asChild
            className="border border-black bg-black text-white hover:bg-white hover:text-black"
          >
            <a href="/docs">← Back to Docs</a>
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
    </DocsLayout>
  );
};

export default Squarespace;
