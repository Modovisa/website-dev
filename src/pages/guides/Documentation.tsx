// src/pages/guides/Documentation.tsx

import { GuidesLayout } from "@/components/GuidesLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Eye, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingLiveDemo } from "@/pages/Index";

const Documentation = () => {
  return (
    <GuidesLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to Modovisa Guides
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Real-time visitor journeys & live analytics—privacy-first, and easy to install.
          </Badge>
        </div>

        {/* Description */}
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <p className="text-lg text-muted-foreground">
            Modovisa shows you <span className="font-semibold text-foreground">who's on your site right now</span>, which pages they're viewing, and the{" "}
            <span className="font-semibold text-foreground">exact journey</span> they take—updated live. No next-day delay. Use it to catch broken funnels,
            measure campaign spikes as they happen, and help customers in the moment.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-16">
          <Card className="p-6 border-border hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Real-time visitor tracking</h3>
                <p className="text-muted-foreground text-sm">
                  Watch active visitors, page transitions, referrers, devices, and countries update every second!
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Eye className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Per-visitor journeys</h3>
                <p className="text-muted-foreground text-sm">
                  Click any visitor to see their path: landing → product → cart → checkout with dwell times per step.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Instant analytics</h3>
                <p className="text-muted-foreground text-sm">
                  Top pages, UTM sources, sessions, referrers, devices, and countries—no sampling, no lag.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-border hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Privacy-first</h3>
                <p className="text-muted-foreground text-sm">
                  Lightweight, fast-loading, and respectful.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Interactive Simulation Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-4 text-center">
            Real Time Visitor Journey Tracking – Interactive Simulation
          </h2>

          <LandingLiveDemo />
        </div>

        {/* Quick Start Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-6">Quick start (~60 seconds)</h2>
          <Card className="p-6 border-border">
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground">
              <li>Register or sign in at modovisa.com</li>
              <li>
                Add your website and copy your <span className="font-mono text-foreground">8ce Token</span>.
              </li>
              <li>
                Paste this snippet into your site's <span className="font-mono text-foreground">&lt;head&gt;</span> (or install a platform plug-in below).
              </li>
              <li>
                <span className="font-semibold text-foreground">Open Live Tracking</span> to watch visitors and journeys roll in—instantly.
              </li>
            </ol>

            <div className="mt-6 bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`<script>
  (function(){
    var s=document.createElement('script');
    s.src='https://cdn.modovisa.com/modovisa.js';
    s.async=1;
    s.dataset.token='YOUR_8CE_TOKEN';
    document.head.appendChild(s);
  })();
</script>`}</pre>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button variant="outline" size="sm">
                Copy Code
              </Button>
            </div>
          </Card>
        </div>

        {/* Install on Platform */}
        <div>
          <h2 className="text-3xl font-bold mb-6">Install on your platform</h2>
          <p className="text-muted-foreground mb-6">
            Prefer a native install? Follow a step-by-step guide for your CMS or storefront:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: "WordPress", icon: "📝" },
              { name: "Shopify", icon: "🛍️" },
              { name: "Wix", icon: "🎨" },
              { name: "Squarespace", icon: "⬜" },
              { name: "Webflow", icon: "🌊" },
              { name: "Magento", icon: "🔷" },
              { name: "Drupal", icon: "💧" },
              { name: "Joomla", icon: "🌟" },
              { name: "PrestaShop", icon: "🛒" },
            ].map((platform) => (
              <Button
                key={platform.name}
                variant="outline"
                className="justify-start gap-2 h-auto py-3"
              >
                <span className="text-xl">{platform.icon}</span>
                <span>{platform.name}</span>
              </Button>
            ))}
          </div>

          <div className="mt-6">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              Next: Register for an account →
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            Need help?{" "}
            <Button variant="link" className="p-0 h-auto font-normal">
              Contact Support
            </Button>
          </p>
        </div>

        {/* Footer Note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            © 2025 Modovisa. made with ❤️ all rights Reserved.
          </p>
        </div>
      </div>
    </GuidesLayout>
  );
};

export default Documentation;