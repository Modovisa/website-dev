// src/pages/docs/BigCommerce.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const BigCommerce = () => {
  const { trackingToken } = useTrackingScriptToken();
  const tokenPlaceholder = trackingToken || "YOUR_TRACKING_TOKEN";

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

  const handleCopyToken = () => {
    if (!trackingToken) return;
    navigator.clipboard.writeText(trackingToken);
  };

  return (
    <DocsLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on BigCommerce
          </h1>
          <Badge className="bg-primary/10 text-primary px-6 py-2 text-sm">
            Add the Modovisa tracking script via Script Manager to start
            real-time analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The recommended way to add Modovisa to BigCommerce is through the{" "}
              <span className="font-semibold text-foreground">
                Script Manager
              </span>
              . This allows you to add your{" "}
              <span className="font-semibold text-foreground">
                Tracking Token
              </span>{" "}
              without editing theme files directly.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Don&apos;t have a token yet? Sign in to{" "}
                <a
                  href="https://modovisa.com"
                  target="_blank"
                  rel="noopener"
                  className="font-semibold underline"
                >
                  modovisa.com
                </a>
                , add your site, and copy the token from{" "}
                <em>Account → Tracked Sites</em> or the <em>Installation</em>{" "}
                page.
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
              <li>Log in to your BigCommerce store control panel.</li>
              <li>
                Navigate to{" "}
                <span className="font-semibold text-foreground">
                  Storefront → Script Manager
                </span>
                .
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">
                  Create a Script
                </span>
                .
              </li>
              <li>
                Enter a name like{" "}
                <span className="font-semibold text-foreground">
                  &quot;Modovisa Analytics&quot;
                </span>
                .
              </li>
              <li>
                For{" "}
                <span className="font-semibold text-foreground">Placement</span>
                , select{" "}
                <span className="font-semibold text-foreground">Head</span>.
              </li>
              <li>
                For{" "}
                <span className="font-semibold text-foreground">Location</span>,
                select{" "}
                <span className="font-semibold text-foreground">
                  All pages
                </span>
                .
              </li>
              <li>
                For{" "}
                <span className="font-semibold text-foreground">
                  Script category
                </span>
                , select{" "}
                <span className="font-semibold text-foreground">
                  Essential
                </span>{" "}
                or{" "}
                <span className="font-semibold text-foreground">
                  Analytics
                </span>
                .
              </li>
              <li>
                For{" "}
                <span className="font-semibold text-foreground">
                  Script type
                </span>
                , select{" "}
                <span className="font-semibold text-foreground">Script</span>.
              </li>
              <li>
                Paste the Modovisa tracking script below into the script
                contents field.
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">Save</span>.
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
    s.dataset.token="`}<span className="text-green-400">
                  {tokenPlaceholder}
                </span>{`";
    document.head.appendChild(s);
  }();
</script>`}
                </code>
              </pre>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Verification */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Verify the installation</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground mb-6">
              <li>Open your storefront in a new tab.</li>
              <li>
                Open{" "}
                <span className="font-mono text-foreground">
                  DevTools → Network
                </span>{" "}
                and reload. Search for{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modovisa.min.js
                </code>
                .
              </li>
              <li>
                Enable &quot;Preserve log&quot; and refresh—confirm the script
                loads on public pages.
              </li>
              <li>
                In your Modovisa dashboard, go to{" "}
                <span className="font-semibold text-foreground">Live</span> to
                see your visit in real time.
              </li>
            </ul>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                If you don&apos;t see events immediately, clear your browser
                cache and try in an incognito window.
              </p>
            </div>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
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

export default BigCommerce;
