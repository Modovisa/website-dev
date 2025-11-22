// src/pages/guides/InstallGuides.tsx

import { GuidesLayout } from "@/components/GuidesLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe2 } from "lucide-react";

const platforms = [
  "WordPress",
  "Shopify",
  "Magento",
  "PrestaShop",
  "BigCommerce",
  "Joomla",
  "Drupal",
  "Wix",
  "Squarespace",
  "Webflow",
  "Ghost",
];

function slugifyPlatform(name: string) {
  return name.toLowerCase();
}

const InstallGuides = () => {
  return (
    <GuidesLayout>
      <div className="container max-w-8xl mx-auto py-12 px-6">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Installation Guides
          </h1>
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Copy-paste snippets and platform-specific setup instructions.
          </Badge>
        </div>

        <Card className="p-8 mb-8">
          <p className="text-lg text-muted-foreground mb-6">
            Choose your CMS or storefront below to see the exact steps and code
            snippet to install Modovisa. Each guide shows you where to paste the
            script and how to verify that tracking is working.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.map((platform) => {
              const slug = slugifyPlatform(platform);
              return (
                <Button
                  key={platform}
                  variant="outline"
                  className="justify-start gap-3 h-auto py-3"
                  asChild
                >
                  <a href={`/guides/install/${slug}`}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted">
                      <Globe2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span>{platform}</span>
                  </a>
                </Button>
              );
            })}
          </div>
        </Card>

        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
            <a href="/guides/setup">← Back to Tracking Setup</a>
          </Button>
          <Button variant="link" asChild>
            <a href="/guides">Back to Guides Home</a>
          </Button>
        </div>
      </div>
    </GuidesLayout>
  );
};

export default InstallGuides;
