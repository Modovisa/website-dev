// src/pages/docs/Register.tsx

import { DocsLayout } from "@/components/DocsLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

const Register = () => {
  return (
    <DocsLayout>
      <div className="container max-w-6xl mx-auto py-12 px-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Register for an account
          </h1>
          <Badge className="bg-primary/10 text-primary px-6 py-2 text-sm">
            Create your Modovisa account and start tracking visitor journeys in real time.
          </Badge>
        </div>

        {/* Main Content Card */}
        <Card className="p-8 mb-8">
          {/* Introduction */}
          <div className="mb-8">
            <p className="text-lg text-muted-foreground mb-4">
              You can register in two ways: directly from the{" "}
              <a 
                href="https://modovisa.com/register" 
                target="_blank" 
                rel="noopener"
                className="text-primary hover:underline font-semibold"
              >
                Register page
              </a>
              , or from the homepage by choosing a plan in the <span className="font-semibold text-foreground">Pricing</span> section. Both paths create the same Modovisa account.
            </p>

            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                No credit card is required to get started. After sign-up, setup tracking for your site and start live tracking.
              </p>
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Method 1 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Method 1 – Register from the /register page</h2>
            
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-6">
              <li>
                Go to{" "}
                <a href="https://modovisa.com/register" target="_blank" rel="noopener" className="text-primary hover:underline">
                  modovisa.com/register
                </a>
                .
              </li>
              <li>Enter your name, email, and a strong password.</li>
              <li>Click <span className="font-semibold text-foreground">Create account</span>.</li>
              <li>You'll be redirected to the tracking setup page.</li>
            </ol>

            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <img 
                src="/assets/img/docs/register-register-page.webp" 
                alt="Modovisa registration form" 
                className="w-full"
                loading="lazy"
              />
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Method 2 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Method 2 – Register via Pricing plans on the homepage</h2>
            
            <ol className="space-y-3 list-decimal list-inside text-muted-foreground mb-6">
              <li>
                Visit{" "}
                <a href="https://modovisa.com/#landingPricing" target="_blank" rel="noopener" className="text-primary hover:underline">
                  modovisa.com
                </a>{" "}
                and scroll to <span className="font-semibold text-foreground">Pricing</span>.
              </li>
              <li>Click <span className="font-semibold text-foreground">Get Started</span> on a plan that suits your needs.</li>
              <li>Complete sign-up; you'll be presented with the Stripe payment modal.</li>
              <li>After subscribing to the plan you'll be redirected to the tracking setup page.</li>
            </ol>

            <div className="border border-border rounded-lg overflow-hidden shadow-lg">
              <img 
                src="/assets/img/docs/register-pricing-plans.webp" 
                alt="Register via pricing plans" 
                className="w-full"
                loading="lazy"
              />
            </div>
          </div>

          <hr className="my-8 border-border" />

          {/* Tracking Setup */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Tracking Setup</h2>
            <p className="text-muted-foreground">
              After you create your account, we'll take you straight to the <span className="font-semibold text-foreground">Tracking Setup</span> page to add your first website and get your <span className="font-semibold text-foreground">Tracking Token</span>.
            </p>
          </div>

          {/* What happens next */}
          <div>
            <h2 className="text-2xl font-bold mb-4">What happens next?</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li>Your dashboard is created automatically.</li>
              <li>You'll add your first website and get a unique <span className="font-semibold text-foreground">Tracking Token</span>.</li>
              <li>Paste our lightweight tracking snippet into your site's <code className="px-2 py-1 bg-muted rounded text-foreground">&lt;head&gt;</code> to start streaming live data.</li>
            </ul>
          </div>
        </Card>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button variant="outline" asChild>
            <a href="/docs">← Back to Docs</a>
          </Button>
          <Button asChild>
            <a href="/docs/setup-tracking" className="gap-2">
              Next: Set up tracking
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </DocsLayout>
  );
};

export default Register;