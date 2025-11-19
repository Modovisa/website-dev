// src/pages/docs/Drupal.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTrackingScriptToken } from "@/hooks/useTrackingScriptToken";

const DRUPAL_RELEASE_URL =
  "https://drupal.org/project/modovisa/releases/1.0.0";
const COMPOSER_CMD = "composer require 'drupal/modovisa:^1.0'";
const DRUSH_SNIPPET = `# Optional: enable via Drush (if available)
drush en modovisa -y
drush cr`;

const Drupal = () => {
  const { trackingToken } = useTrackingScriptToken();

  const handleCopyToken = () => {
    if (!trackingToken) return;
    navigator.clipboard.writeText(trackingToken);
  };

  const copyComposerCommand = () => {
    navigator.clipboard.writeText(COMPOSER_CMD);
  };

  const copyDrushCommands = () => {
    navigator.clipboard.writeText(DRUSH_SNIPPET);
  };

  return (
    <DocsLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on Drupal
          </h1>
          <Badge className="bg-primary/10 text-primary px-6 py-2 text-sm">
            Install the Modovisa module and paste your Tracking Token to start
            real-time analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The recommended way to add Modovisa to Drupal is the official
              module. Download it from Drupal.org, enable it, and paste your{" "}
              <span className="font-semibold text-foreground">
                Tracking Token
              </span>{" "}
              in the configuration screen—no theme/template edits required.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                If your site uses caching (Drupal cache, reverse proxy, or CDN),
                clear it after enabling the module so the script appears on
                public pages.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Steps – Module install */}
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
                Download the module from{" "}
                <a
                  href={DRUPAL_RELEASE_URL}
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline"
                >
                  drupal.org/project/modovisa/releases/1.0.0
                </a>{" "}
                (<code className="px-2 py-1 bg-muted rounded text-foreground">
                  .zip
                </code>{" "}
                or{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  .tar.gz
                </code>
                ).
              </li>
              <li>
                Upload the archive to your site’s{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  modules/contrib
                </code>{" "}
                directory and extract it.
              </li>
              <li>Sign into your Drupal Admin dashboard.</li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  Extend → List
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
                Select the module and click{" "}
                <span className="font-semibold text-foreground">Install</span>.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  Configuration → System → Modovisa
                </span>
                .
              </li>
              <li>
                Paste your{" "}
                <span className="font-semibold text-foreground">
                  Tracking Token
                </span>{" "}
                and click{" "}
                <span className="font-semibold text-foreground">
                  Save configuration
                </span>
                .
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  Configuration → Development → Performance
                </span>{" "}
                and click{" "}
                <span className="font-semibold text-foreground">
                  Clear all caches
                </span>
                .
              </li>
            </ol>
          </div>

          {/* Video Tutorial */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Video: Install Modovisa on Drupal
            </h2>
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  src="https://www.youtube.com/embed/Iet4qLdwCXM?si=yn2JnE1JAw5pAPOp"
                  title="Install Modovisa on Drupal"
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

          {/* Alternative — Composer install */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">
              Alternative — Install via Composer
            </h2>
            <p className="text-muted-foreground mb-4">
              If your Drupal project is managed with Composer, you can add the
              Modovisa module from Drupal.org via CLI, then enable it in the UI
              (or with Drush).
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
                  onClick={copyComposerCommand}
                  className="text-xs border border-black bg-black text-white hover:bg-white hover:text-black"
                >
                  Copy
                </Button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-slate-100">{COMPOSER_CMD}</code>
              </pre>
            </div>

            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-4">
              <li>
                Run the Composer command above from your Drupal project root.
              </li>
              <li>
                In the Drupal admin, go to{" "}
                <span className="font-semibold text-foreground">
                  Extend → List
                </span>
                , search for{" "}
                <span className="font-semibold text-foreground">
                  Modovisa Analytics
                </span>
                , and click{" "}
                <span className="font-semibold text-foreground">Install</span>.
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  Configuration → System → Modovisa
                </span>
                , paste your{" "}
                <span className="font-semibold text-foreground">
                  Tracking Token
                </span>
                , and{" "}
                <span className="font-semibold text-foreground">
                  Save configuration
                </span>
                .
              </li>
              <li>
                Go to{" "}
                <span className="font-semibold text-foreground">
                  Configuration → Development → Performance
                </span>{" "}
                and{" "}
                <span className="font-semibold text-foreground">
                  Clear all caches
                </span>
                .
              </li>
            </ol>

            {/* Optional Drush enable */}
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
                  onClick={copyDrushCommands}
                  className="text-xs border border-black bg-black text-white hover:bg-white hover:text-black"
                >
                  Copy
                </Button>
              </div>
              <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-slate-100">
                  {DRUSH_SNIPPET}
                </code>
              </pre>
            </div>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg mb-4">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                If the machine name differs in your install, enable it from the
                UI via{" "}
                <span className="font-semibold text-foreground">
                  Extend → List
                </span>
                . After enabling, always clear caches so the tracking script is
                served.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Verification */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Verify the installation</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground mb-6">
              <li>
                Open your site in a new tab → DevTools →{" "}
                <span className="font-mono text-foreground">Network</span> →{" "}
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
                Using a CDN or reverse proxy (Varnish/Cloudflare)? Purge it
                after module activation. Some themes also ship their own asset
                cache—clear that too.
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

export default Drupal;
