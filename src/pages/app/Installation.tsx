// src/pages/app/Installation.tsx

import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

const Installation = () => {
  const [copied, setCopied] = useState(false);

  const trackingCode = `<!-- Modovisa Tracking Code -->
<script>
  (function(m,o,d,o,v,i,s,a){
    m['ModovisaObject']=v;m[v]=m[v]||function(){
    (m[v].q=m[v].q||[]).push(arguments)},m[v].l=1*new Date();
    i=o.createElement(d),s=o.getElementsByTagName(d)[0];
    i.async=1;i.src='https://cdn.modovisa.com/tracker.js';
    s.parentNode.insertBefore(i,s)
  })(window,document,'script','modovisa');
  
  modovisa('init', 'YOUR_TRACKING_TOKEN');
  modovisa('track', 'pageview');
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Installation</h1>
          <p className="text-muted-foreground mt-1">
            Add Modovisa tracking to your website in just a few minutes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Step 1: Copy Your Tracking Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy the tracking code below and paste it into the <code className="bg-muted px-2 py-1 rounded">{'<head>'}</code> section of your website, just before the closing <code className="bg-muted px-2 py-1 rounded">{'</head>'}</code> tag.
            </p>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{trackingCode}</code>
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 2: Platform-Specific Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">WordPress</h3>
              <p className="text-sm text-muted-foreground">
                Go to Appearance → Theme Editor → header.php, and paste the code before the closing {'</head>'} tag. Or use a plugin like "Insert Headers and Footers".
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Shopify</h3>
              <p className="text-sm text-muted-foreground">
                Go to Online Store → Themes → Actions → Edit Code → theme.liquid, and paste the code before the closing {'</head>'} tag.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Webflow</h3>
              <p className="text-sm text-muted-foreground">
                Go to Project Settings → Custom Code → Head Code, and paste the tracking code there.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Custom HTML/React/Next.js</h3>
              <p className="text-sm text-muted-foreground">
                Add the tracking code to your main HTML file or layout component in the {'<head>'} section.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step 3: Verify Installation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              After adding the code, visit your website and check your Modovisa dashboard. You should see your visit appear in the Live Tracking section within a few seconds.
            </p>
            <Button>Go to Live Tracking</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Installation;
