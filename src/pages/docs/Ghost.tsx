// src/pages/docs/Ghost.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const Ghost = () => {
  const copyToClipboard = () => {
    const code = `<script>
  !function(){
    var s=document.createElement("script");
    s.src="https://cdn.modovisa.com/modovisa.min.js";
    s.async=1;
    s.dataset.token="YOUR_TRACKING_TOKEN";
    document.head.appendChild(s);
  }();
</script>`;
    navigator.clipboard.writeText(code);
  };

  return (
    <DocsLayout>
      <div className="container max-w-6xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on Ghost
          </h1>
          <Badge className="bg-primary/10 text-primary px-6 py-2 text-sm">
            Add the Modovisa tracking script via Code Injection to start real-time analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The recommended way to add Modovisa to Ghost is through <span className="font-semibold text-foreground">Code Injection</span>.
              Paste your <span className="font-semibold text-foreground">Tracking Token</span> in the <span className="font-semibold text-foreground">Site Header</span> field and it will load on all pages automatically.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Don't have a token yet? Sign in to{" "}
                <a href="https://modovisa.com" target="_blank" rel="noopener" className="font-semibold underline">
                  modovisa.com
                </a>
                , add your site, and copy the token from <em>Account → Tracked Sites</em> or the <em>Installation</em> page.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Installation Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Step-by-step</h2>
            
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>Log in to your Ghost admin panel.</li>
              <li>Navigate to <span className="font-semibold text-foreground">Settings → Code Injection</span>.</li>
              <li>In the <span className="font-semibold text-foreground">Site Header</span> section, paste the Modovisa tracking script below.</li>
              <li>Click <span className="font-semibold text-foreground">Save</span>.</li>
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
    s.dataset.token="`}<span className="text-green-400">YOUR_TRACKING_TOKEN</span>{`";
    document.head.appendChild(s);
  }();
</script>`}
                </code>
              </pre>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Per-Post Tracking */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Alternative — Track specific posts only</h2>
            <p className="text-muted-foreground mb-4">
              If you only want to track certain posts or pages:
            </p>
            
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>Open the post or page editor.</li>
              <li>Click the <span className="font-semibold text-foreground">Settings</span> gear icon.</li>
              <li>Scroll to <span className="font-semibold text-foreground">Code Injection</span>.</li>
              <li>Paste the Modovisa tracking script in the <span className="font-semibold text-foreground">Post Header</span> field.</li>
              <li>Click <span className="font-semibold text-foreground">Update</span>.</li>
            </ol>
          </div>

          <hr className="my-8 border-border" />

          {/* Verification */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Verify the installation</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground mb-6">
              <li>Open your site in a new tab.</li>
              <li>Open <span className="font-mono text-foreground">DevTools → Network</span> and reload. Search for <code className="px-2 py-1 bg-muted rounded text-foreground">modovisa.min.js</code>.</li>
              <li>Enable "Preserve log" and refresh—confirm the script loads on public pages.</li>
              <li>In your Modovisa dashboard, go to <span className="font-semibold text-foreground">Live</span> to see your visit in real time.</li>
            </ul>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Ghost caches aggressively. If the script doesn't appear immediately, wait a few minutes and try again in an incognito window.
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
            <a href="https://support.modovisa.com" target="_blank" rel="noopener">
              Need help? Contact Support
            </a>
          </Button>
        </div>
      </div>
    </DocsLayout>
  );
};

export default Ghost;