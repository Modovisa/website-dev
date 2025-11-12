// src/pages/docs/PrestaShop.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Download } from "lucide-react";

const PrestaShop = () => {
  return (
    <DocsLayout>
      <div className="container max-w-6xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Install on PrestaShop
          </h1>
          <Badge className="bg-primary/10 text-primary px-6 py-2 text-sm">
            Add Modovisa via the official PrestaShop module and start real-time analytics — no theme edits required.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              You'll install the <span className="font-semibold text-foreground">Modovisa Analytics</span> module, enable it, and paste your{" "}
              <span className="font-semibold text-foreground">Tracking Token</span>. The module injects the script automatically across your storefront.
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

          {/* Download Section */}
          <div className="mb-8">
            <Button asChild className="gap-2">
              <a 
                href="https://cdn.modovisa.com/prestashop/releases/modovisa-1.0.1.zip" 
                target="_blank" 
                rel="noopener"
              >
                <Download className="h-4 w-4" />
                Download Modovisa Module (v1.0.1)
              </a>
            </Button>
            <p className="text-sm text-muted-foreground mt-2">ZIP file for manual upload</p>
          </div>

          {/* Installation Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Step-by-step</h2>
            
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>
                Sign up at{" "}
                <a href="https://modovisa.com" target="_blank" rel="noopener" className="text-primary hover:underline">
                  modovisa.com
                </a>
                .
              </li>
              <li>Set up tracking for your website to get your <span className="font-semibold text-foreground">Tracking Token</span>.</li>
              <li>
                Download the module:{" "}
                <a 
                  href="https://cdn.modovisa.com/prestashop/releases/modovisa-1.0.1.zip" 
                  target="_blank" 
                  rel="noopener"
                  className="text-primary hover:underline"
                >
                  modovisa-1.0.1.zip
                </a>
                .
              </li>
              <li>Log in to your <span className="font-semibold text-foreground">PrestaShop</span> admin dashboard.</li>
              <li>In the left sidebar, go to <span className="font-semibold text-foreground">Modules → Module Manager</span>.</li>
              <li>Click <span className="font-semibold text-foreground">Upload a module</span> (top right) → <span className="font-semibold text-foreground">Select file</span>.</li>
              <li>Choose the ZIP you downloaded and click <span className="font-semibold text-foreground">Open</span>. The module will auto-install.</li>
              <li>Click <span className="font-semibold text-foreground">Configure</span> on the Modovisa module.</li>
              <li>Enable the module.</li>
              <li>Paste your <span className="font-semibold text-foreground">Tracking Token</span> (from Modovisa → <em>Installation</em> or <em>Account</em>).</li>
              <li>Click <span className="font-semibold text-foreground">Save</span>.</li>
            </ol>
          </div>

          {/* Video Tutorial */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Video Tutorial</h2>
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  src="https://www.youtube.com/embed/POxDTJZS--w?si=phk9Y8WPKh_Ms0MM"
                  title="Install Modovisa on PrestaShop"
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
              <li>Open your storefront → DevTools → <span className="font-mono text-foreground">Network</span>, search for <code className="px-2 py-1 bg-muted rounded text-foreground">modovisa.min.js</code>.</li>
              <li>Enable "Preserve log" and refresh — confirm the script loads on public pages.</li>
              <li>In Modovisa, open <span className="font-semibold text-foreground">Live</span> to see your visit in real time.</li>
            </ul>

            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                If you don't see events, clear the PrestaShop cache (<em>Advanced Parameters → Performance</em>) and any CDN cache, then reload your storefront.
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

export default PrestaShop;