// src/pages/guides/Joomla.tsx

import { GuidesLayout } from "@/components/GuidesLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const JOOMLA_ZIP_URL =
  "https://cdn.modovisa.com/joomla/releases/plg_system_modovisa-1.0.1.zip";

const Joomla = () => {
  const { trackingToken } = useTrackingScriptToken();
  const tokenPlaceholder = trackingToken || "YOUR_TRACKING_TOKEN";

  const handleCopyToken = () => {
    if (!trackingToken) return;
    navigator.clipboard.writeText(trackingToken);
  };

  const copyZipUrlToClipboard = () => {
    navigator.clipboard.writeText(JOOMLA_ZIP_URL);
  };

  const copyScriptToClipboard = () => {
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
            Install on Joomla
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Install the Modovisa extension and paste your Tracking Token to start
            real-time analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              This guide walks you through adding Modovisa to a Joomla site using
              the official{" "}
              <span className="font-semibold text-foreground">
                Modovisa extension for Joomla
              </span>
              . You’ll paste your{" "}
              <span className="font-semibold text-foreground">Tracking Token</span>{" "}
              inside the Modovisa plugin settings—no template edits required.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Admin pages aren’t tracked. After enabling the plugin and saving
                your token, clear cache to ensure the script loads on public
                pages.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Steps - Extension from Web */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Step-by-step</h2>

            <ol className="space-y-4 list-decimal list-inside text-muted-foreground">
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
              <li>Sign into your Joomla Admin dashboard.</li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  System → Install → Extensions → Install from Web
                </span>
                .
              </li>
              <li>
                Search for{" "}
                <span className="font-semibold text-foreground">
                  “Modovisa Analytics”
                </span>
                .
              </li>
              <li>
                Click the extension and{" "}
                <span className="font-semibold text-foreground">Install</span> it.
              </li>
              <li>
                Go to{" "}
                  <span className="font-semibold text-foreground">
                    System → Manage → Extensions
                  </span>{" "}
                and make sure it’s{" "}
                <span className="font-semibold text-foreground">Enabled</span>.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  System → Manage → Plugins
                </span>
                .
              </li>
              <li>
                Search for{" "}
                <span className="font-semibold text-foreground">
                  “Modovisa Analytics”
                </span>
                .
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">
                  “Modovisa Analytics”
                </span>
                .
              </li>
              <li>
                <span className="font-semibold text-foreground">Enable</span> the
                plugin.
              </li>
              <li>
                Paste your{" "}
                <span className="font-semibold text-foreground">
                  Tracking Token
                </span>{" "}
                into the plugin settings and{" "}
                <span className="font-semibold text-foreground">Save</span>.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  System → Maintenance → Clear Cache
                </span>{" "}
                and clear site cache.
              </li>
            </ol>
          </div>

          {/* Video Tutorial */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Video: Install Modovisa on Joomla
            </h2>
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src="https://www.youtube.com/embed/j6M0GvVu49s?si=4K-9jIXQ_5PLIXHl"
                  title="Install Modovisa on Joomla"
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

          {/* Alternative — Upload extension ZIP */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Alternative — Upload the extension ZIP (from JED)
            </h2>
            <p className="text-muted-foreground mb-4">
              Download the Modovisa extension from the Joomla Extensions Directory
              (JED), then upload it in your admin.
            </p>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Button variant="outline" asChild>
                <a
                  href="https://extensions.joomla.org/extension/site-management/analytics/modovisa-analytics/"
                  target="_blank"
                  rel="noopener"
                >
                  Open Modovisa Analytics on JED
                </a>
              </Button>
              <span className="text-sm text-muted-foreground">
                Download the ZIP, then upload in your dashboard.
              </span>
            </div>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>
                Download the extension ZIP from the JED page above.
              </li>
              <li>
                In Joomla Admin, go to{" "}
                <span className="font-semibold text-foreground">
                  System → Install → Extensions → Upload Package File
                </span>
                .
              </li>
              <li>
                Choose the downloaded ZIP and click{" "}
                <span className="font-semibold text-foreground">
                  Upload &amp; Install
                </span>
                .
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  System → Manage → Plugins
                </span>
                , search for{" "}
                <span className="font-semibold text-foreground">
                  Modovisa Analytics
                </span>
                , and{" "}
                <span className="font-semibold text-foreground">Enable</span> it.
              </li>
              <li>
                Open the plugin, paste your{" "}
                <span className="font-semibold text-foreground">
                  Tracking Token
                </span>
                , and{" "}
                <span className="font-semibold text-foreground">Save</span>.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  System → Maintenance → Clear Cache
                </span>{" "}
                to purge caches.
              </li>
            </ol>
          </div>

          <hr className="my-8 border-border" />

          {/* Alternative — Install from URL */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Alternative — Install from URL
            </h2>
            <p className="text-muted-foreground mb-4">
              If you prefer, install the plugin directly from our CDN URL.
            </p>

            <div className="bg-slate-900 rounded-lg overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyZipUrlToClipboard}
                  className="text-xs border border-black bg-black text-white hover:bg-white hover:text-black"
                >
                  Copy URL
                </Button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-slate-100">
                  {JOOMLA_ZIP_URL}
                </code>
              </pre>
            </div>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-4">
              <li>
                In Joomla Admin, go to{" "}
                <span className="font-semibold text-foreground">
                  System → Install → Extensions → Install from URL
                </span>
                .
              </li>
              <li>
                Paste the URL above and click{" "}
                <span className="font-semibold text-foreground">
                  Check &amp; Install
                </span>{" "}
                (or{" "}
                <span className="font-semibold text-foreground">Install</span>).
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  System → Manage → Plugins
                </span>
                , search for{" "}
                <span className="font-semibold text-foreground">
                  Modovisa Analytics
                </span>
                , and{" "}
                <span className="font-semibold text-foreground">Enable</span> it.
              </li>
              <li>
                Open the plugin, paste your{" "}
                <span className="font-semibold text-foreground">
                  Tracking Token
                </span>
                , and{" "}
                <span className="font-semibold text-foreground">Save</span>.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  System → Maintenance → Clear Cache
                </span>{" "}
                to purge caches.
              </li>
            </ol>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                After enabling, visit a public page and check DevTools →{" "}
                <span className="font-mono text-foreground">Network</span> for{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modovisa.min.js
                </code>
                . You should also see your visit in the Modovisa{" "}
                <span className="font-semibold text-foreground">Live</span> view
                within seconds.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Advanced: Manual script embed (keeps old functionality) */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Advanced — Manual script embed
            </h2>
            <p className="text-muted-foreground mb-4">
              Prefer to inject the tracking script manually in your template?
              Paste this snippet just before the closing{" "}
              <code className="px-2 py-1 bg-muted rounded text-foreground">
                &lt;/head&gt;
              </code>{" "}
              tag. This is optional if you are already using the Modovisa
              extension.
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
              <li>
                Open your site in a new tab, then DevTools →{" "}
                <span className="font-mono text-foreground">Network</span> and
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
                In the Modovisa dashboard, open{" "}
                <span className="font-semibold text-foreground">Live</span> to
                see your visit in real time.
              </li>
            </ul>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                If you use a page cache/CDN, purge it after enabling the plugin.
                Some templates also have their own asset cache—clear that too.
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

export default Joomla;
