// src/pages/docs/Magento.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const Magento = () => {
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

  return (
    <DocsLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on Magento
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Add the Modovisa tracking script via HTML Head settings to start real-time analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The recommended way to add Modovisa to Magento is through{" "}
              <span className="font-semibold text-foreground">
                Content → Configuration → HTML Head
              </span>
              . Paste your{" "}
              <span className="font-semibold text-foreground">Tracking Token</span>{" "}
              into the &quot;Scripts and Style Sheets&quot; field—no code changes required.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                If you run multiple store views, repeat these steps for each view. Modovisa issues a
                unique <span className="font-semibold">Tracking Token</span> per site.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Installation Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">
              Method – Insert via HTML Head Settings (Recommended)
            </h2>

            <div className="space-y-6">
              <div>
                <p className="mb-4">
                  1. In your Magento Admin, go to{" "}
                  <span className="font-semibold">Content → Configuration</span>.
                </p>
                <div className="border border-border rounded-lg overflow-hidden mb-6">
                  <img
                    src="/assets/img/docs/magento-content-configuration.webp"
                    alt="Magento Design Configuration"
                    className="w-full"
                    loading="lazy"
                  />
                </div>
              </div>

              <div>
                <p className="mb-4">
                  2. Choose your target <span className="font-semibold">Store View</span> (or Global)
                  and click <span className="font-semibold">Edit</span> in the Actions column.
                </p>
                <div className="border border-border rounded-lg overflow-hidden mb-6">
                  <img
                    src="/assets/img/docs/magento-design-configuration.webp"
                    alt="Magento Store View Configuration"
                    className="w-full"
                    loading="lazy"
                  />
                </div>
              </div>

              <div>
                <p className="mb-4">
                  3. Scroll to{" "}
                  <span className="font-semibold">Other Settings → HTML Head</span> and expand it.
                </p>
                <div className="border border-border rounded-lg overflow-hidden mb-6">
                  <img
                    src="/assets/img/docs/magento-scripts-and-style-sheets.webp"
                    alt="Magento HTML Head section"
                    className="w-full"
                    loading="lazy"
                  />
                </div>
              </div>

              <div>
                <p className="mb-4">
                  4. Paste the Modovisa tracking script into{" "}
                  <span className="font-semibold">Scripts and Style Sheets</span>:
                </p>

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

              <p>
                5. Click <span className="font-semibold">Save</span> (top right).
              </p>

              <p>
                6. Flush cache so changes take effect:{" "}
                <span className="font-semibold">
                  System → Tools → Cache Management → Flush Magento Cache
                </span>
                .
              </p>

              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  If you use Full Page Cache, Varnish, or a CDN, purge those as well. In production
                  mode, static content may be cached aggressively.
                </p>
              </div>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Verification */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Verify the installation</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>
                Open your storefront in a new tab → DevTools →{" "}
                <span className="font-mono text-foreground">Network</span>, search for{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modovisa.min.js
                </code>
                .
              </li>
              <li>
                Enable &quot;Preserve log&quot; and refresh—confirm the script loads on public
                pages.
              </li>
              <li>
                In your Modovisa dashboard, go to{" "}
                <span className="font-semibold text-foreground">Live</span> to see your visit in real
                time.
              </li>
            </ul>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
            <a href="/docs">← Back to Docs</a>
          </Button>
          <Button variant="link" asChild>
            <a href="https://support.modovisa.com" target="_blank" rel="noopener">
              Need help? Contact Support
            </a>
          </Button>
        </div>
      </div>
    </DocsLayout>
  );
};

export default Magento;
