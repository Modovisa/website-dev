// src/pages/guides/SetupTracking.tsx

import { GuidesLayout } from "@/components/GuidesLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Zap, ArrowRight, Globe2 } from "lucide-react";

const platforms = [
  { name: "WordPress", slug: "wordpress" },
  { name: "Shopify", slug: "shopify" },
  { name: "Wix", slug: "wix" },
  { name: "Squarespace", slug: "squarespace" },
  { name: "Webflow", slug: "webflow" },
  { name: "Magento", slug: "magento" },
  { name: "Drupal", slug: "drupal" },
  { name: "Joomla", slug: "joomla" },
  { name: "PrestaShop", slug: "prestashop" },
];

const SetupTracking = () => {
  return (
    <GuidesLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Tracking Setup
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Add your website to generate your Tracking Token and start live analytics.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              After creating your account, you&apos;ll land on the{" "}
              <span className="font-semibold text-foreground">
                Tracking Setup
              </span>{" "}
              page. Add your website details below to create a{" "}
              <span className="font-semibold text-foreground">
                Tracking Token
              </span>{" "}
              and unlock your installation snippet.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                You can add more sites later. Each site has its own Tracking
                Token and dashboard.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Screenshot */}
          <div className="mb-8">
            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <img
                src="/assets/img/guides/tracking-setup.webp"
                alt="Modovisa tracking setup form"
                className="w-full"
                loading="lazy"
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Form fields</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">
                  Website Name
                </span>{" "}
                — Enter the website name for the site you want to track.
              </li>
              <li>
                <span className="font-semibold text-foreground">Domain</span> —{" "}
                <em>Do not include</em>{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  https://
                </code>{" "}
                (e.g.,{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  example.com
                </code>{" "}
                or{" "}
                <code className="px-2 py-1 bg-muted rounded text-foreground">
                  shop.example.com
                </code>
                ).
              </li>
              <li>
                <span className="font-semibold text-foreground">
                  Website Category
                </span>{" "}
                — Select a category that best describes your site.
              </li>
              <li>
                <span className="font-semibold text-foreground">Timezone</span>{" "}
                — Choose the timezone for reporting; you can change it later.
              </li>
            </ul>
          </div>

          {/* Setup Steps */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Set up your site</h2>
            <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
              <li>
                Fill in{" "}
                <span className="font-semibold text-foreground">
                  Website Name
                </span>
                ,{" "}
                <span className="font-semibold text-foreground">Domain</span>,{" "}
                <span className="font-semibold text-foreground">
                  Website Category
                </span>
                , and{" "}
                <span className="font-semibold text-foreground">Timezone</span>.
              </li>
              <li>
                Click{" "}
                <span className="font-semibold text-foreground">
                  Setup Tracking
                </span>
                .
              </li>
              <li>
                We&apos;ll create your site and generate a{" "}
                <span className="font-semibold text-foreground">
                  Tracking Token
                </span>
                .
              </li>
              <li>
                You&apos;ll be taken to the{" "}
                <span className="font-semibold text-foreground">
                  Installation
                </span>{" "}
                step to add the snippet to your site.
              </li>
            </ol>
          </div>

          <div className="mb-8 flex items-start gap-3 p-4 bg-muted rounded-lg">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted-foreground">
              Subdomains count as separate sites (
              <code className="px-2 py-1 bg-muted rounded">
                blog.example.com
              </code>{" "}
              vs{" "}
              <code className="px-2 py-1 bg-muted rounded">
                example.com
              </code>
              ). Track them independently by adding each as a separate site.
            </p>
          </div>

          <hr className="my-8 border-border" />

          {/* Installation Guides */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Installation Guides</h2>
            <p className="text-muted-foreground mb-6">
              Prefer a step-by-step guide for your platform?
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {platforms.map((platform) => (
                <Button
                  key={platform.name}
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  asChild
                >
                  <a href={`/guides/install/${platform.slug}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted">
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>{platform.name}</span>
                  </a>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
            <a href="/guides/register">← Back to Register</a>
          </Button>
          <Button asChild>
            <a href="/guides/install" className="gap-2">
              Next: Installation
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </GuidesLayout>
  );
};

export default SetupTracking;
