// src/pages/guides/WordPress.tsx

import { GuidesLayout } from "@/components/GuidesLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const WordPress = () => {
  const { trackingToken } = useTrackingScriptToken();
  const tokenPlaceholder = trackingToken || "YOUR_TRACKING_TOKEN";

  const copyScriptToClipboard = () => {
    const code = `<script>
!function(){
  var s=document.createElement("script");
  s.src="https://cdn.modovisa.com/modovisa.min.js";
  s.async=1;
  s.dataset.token="${tokenPlaceholder}";
  document.head.appendChild(s);
}();
</script>
</head>`;
    navigator.clipboard.writeText(code);
  };

  const copyFunctionsToClipboard = () => {
    const code = `function add_modovisa_script_to_head() {
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
add_action('wp_head', 'add_modovisa_script_to_head');`;
    navigator.clipboard.writeText(code);
  };

  return (
    <GuidesLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on WordPress
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Use the Modovisa plugin or add the snippet manually to start tracking in real time.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The easiest way to add Modovisa to WordPress is our official plugin. Paste your{" "}
              <span className="font-semibold text-foreground">Tracking Token</span> into
              the plugin settings and you're done. Admin pages (wp-admin) are automatically excluded from tracking.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Note:</span> The plugin respects logged-in admin contexts and does not track visits to admin pages.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Option 1: Plugin from WordPress.org */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Option 1 — Modovisa WordPress Plugin (Recommended)</h2>
            
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-6">
              <li>In your WordPress dashboard, go to <span className="font-semibold text-foreground">Plugins → Add New</span>.</li>
              <li>Search for <span className="font-semibold text-foreground">"Modovisa Analytics"</span> and install the plugin by Modovisa.</li>
              <li>Activate the plugin and open <span className="font-semibold text-foreground">Settings → Modovisa Analytics</span>.</li>
              <li>Paste your <span className="font-semibold text-foreground">Tracking Token</span> and click <span className="font-semibold text-foreground">Save</span>.</li>
            </ol>

            {/* Video Tutorial */}
            <div className="border border-border rounded-lg overflow-hidden shadow-lg mb-6">
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src="https://www.youtube.com/embed/olSW5JawjzE?si=VMVDmRp1wDDcmtT2"
                  title="Install Modovisa on WordPress"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                If you manage multiple sites, repeat these steps per site. Each site has its own <span className="font-semibold">Tracking Token</span>.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Alternative: ZIP Upload from WordPress.org */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Alternative — Install the plugin by uploading the ZIP</h2>
            <p className="text-muted-foreground mb-4">
              If your site can't install plugins directly from the directory, download the plugin ZIP from WordPress.org and upload it in your dashboard.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Button variant="outline" asChild>
                <a 
                  href="https://wordpress.org/plugins/modovisa-analytics/" 
                  target="_blank" 
                  rel="noopener"
                >
                  Download Modovisa Analytics
                </a>
              </Button>
              <span className="text-sm text-muted-foreground">WordPress.org extension page</span>
            </div>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-4">
              <li>Download the ZIP from the button above (it will be named like <code className="px-2 py-1 bg-muted rounded text-foreground">modovisa-analytics.zip</code>).</li>
              <li>In your WP Admin, go to <span className="font-semibold text-foreground">Plugins → Add New → Upload Plugin</span>.</li>
              <li>Choose the ZIP file and click <span className="font-semibold text-foreground">Install Now</span>, then <span className="font-semibold text-foreground">Activate</span>.</li>
              <li>Open <span className="font-semibold text-foreground">Settings → Modovisa Analytics</span>, paste your <span className="font-semibold text-foreground">Tracking Token</span>, and <span className="font-semibold text-foreground">Save</span>.</li>
            </ol>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                You can update the plugin normally from the <span className="font-semibold">Plugins</span> page when new versions are released.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Option 2: Manual header.php */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Option 2 — Manually via header.php</h2>
            <p className="text-muted-foreground mb-4">
              Go to <span className="font-semibold text-foreground">Appearance → Theme File Editor</span>, open <code className="px-2 py-1 bg-muted rounded text-foreground">header.php</code>, and paste this just before the closing <code className="px-2 py-1 bg-muted rounded text-foreground">&lt;/head&gt;</code> tag:
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
                  onClick={copyScriptToClipboard}
                  className="text-xs"
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
  s.dataset.token="`}<span className="text-green-400">{tokenPlaceholder}</span>{`";
  document.head.appendChild(s);
}();
</script>
</head>`}
                </code>
              </pre>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Option 3: functions.php */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Option 3 — Inject via functions.php (optional)</h2>
            <p className="text-muted-foreground mb-4">
              Add this to your theme's <code className="px-2 py-1 bg-muted rounded text-foreground">functions.php</code> to print the script in <code className="px-2 py-1 bg-muted rounded text-foreground">&lt;head&gt;</code> without editing templates:
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
                  onClick={copyFunctionsToClipboard}
                  className="text-xs"
                >
                  Copy Code
                </Button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-slate-100">
{`function add_modovisa_script_to_head() {
  ?>
  <script>
    !function(){
      var s=document.createElement("script");
      s.src="https://cdn.modovisa.com/modovisa.min.js";
      s.async=1;
      s.dataset.token="`}<span className="text-green-400">{tokenPlaceholder}</span>{`";
      document.head.appendChild(s);
    }();
  </script>
  <?php
}
add_action('wp_head', 'add_modovisa_script_to_head');`}
                </code>
              </pre>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Verification */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Verify the installation</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>Open your site in a new tab, then DevTools → <span className="font-mono text-foreground">Network</span> and search for <code className="px-2 py-1 bg-muted rounded text-foreground">modovisa.min.js</code>.</li>
              <li>Enable "Preserve log" and refresh. You should see the script load on public pages.</li>
              <li>Visit the Modovisa dashboard → <span className="font-semibold text-foreground">Live</span> to see your visit in real time.</li>
            </ul>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
            <a href="/guides">← Back to Docs</a>
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

export default WordPress;