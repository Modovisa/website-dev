// src/pages/docs/Webflow.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const Webflow = () => {
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
            Install on Webflow
          </h1>
          <Badge className="bg-primary/10 text-primary px-6 py-2 text-sm">
            Add the Modovisa tracking script via Project Settings → Custom Code to start real-time analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              The{" "}
              <a 
                href="https://help.webflow.com/hc/en-us/articles/33961357265299-Custom-code-in-head-and-body-tags" 
                target="_blank" 
                rel="noopener"
                className="text-primary hover:underline"
              >
                recommended way
              </a>{" "}
              to add Modovisa in Webflow is via your project's <span className="font-semibold text-foreground">Site settings → Custom code</span> tab. 
              Paste your <span className="font-semibold text-foreground">Tracking Token</span> into the <span className="font-semibold text-foreground">Head code</span> section, then <span className="font-semibold text-foreground">Save changes</span> and <span className="font-semibold text-foreground">Publish</span>.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                Make sure your site is{" "}
                <a 
                  href="https://university.webflow.com/lesson/publish-your-site" 
                  target="_blank" 
                  rel="noopener"
                  className="font-semibold underline"
                >
                  published
                </a>{" "}
                and mapped to your domain. Custom code runs only on the published site, not the Designer preview.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Installation Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Step-by-step</h2>
            
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>Open your Webflow project and go to <span className="font-semibold text-foreground">Site settings</span>.</li>
              <li>Open the <span className="font-semibold text-foreground">Custom code</span> tab.</li>
              <li>In <span className="font-semibold text-foreground">Head code</span>, paste the Modovisa snippet below.</li>
              <li>Click <span className="font-semibold text-foreground">Save changes</span>, then <span className="font-semibold text-foreground">Publish</span> your site.</li>
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

          {/* Video Tutorial */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Video Tutorial</h2>
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src="https://www.youtube.com/embed/Cnl2opiyJ-o?si=715Ooqrf8EWOyN1M"
                  title="Install Modovisa on Webflow"
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
              <li>Open the <span className="font-semibold text-foreground">published</span> site → DevTools → <span className="font-mono text-foreground">Network</span> → search for <code className="px-2 py-1 bg-muted rounded text-foreground">modovisa.min.js</code>.</li>
              <li>Enable "Preserve log" and refresh—confirm the script loads on public pages.</li>
              <li>In Modovisa, open <span className="font-semibold text-foreground">Live</span> to watch your own visit in real time.</li>
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

export default Webflow;