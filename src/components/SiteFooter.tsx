import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Instagram, Twitter } from "lucide-react";

const SiteFooter = () => {
  return (
    <footer className="pt-16" aria-label="Site footer">
      <div className="container mx-auto px-4">
        {/* Top card */}
        <div className="rounded-3xl border bg-card shadow-sm p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <Logo />
              <p className="mt-4 text-muted-foreground max-w-xs">
                Real-Time Insights – Intuitive Analytics
              </p>

              <div className="mt-6">
                <label htmlFor="newsletter" className="sr-only">Subscribe to newsletter</label>
                <div className="flex items-center gap-2">
                  <Input id="newsletter" placeholder="Subscribe to newsletter" className="h-11" />
                  <Button className="h-11" aria-label="Subscribe to newsletter">Subscribe</Button>
                </div>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Product</h3>
              <nav className="flex flex-col gap-3 text-muted-foreground">
                <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
                <a href="#features" className="hover:text-foreground transition-colors">Features</a>
              </nav>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Resources</h3>
              <nav className="flex flex-col gap-3 text-muted-foreground">
                <a href="#faqs" className="hover:text-foreground transition-colors">FAQs</a>
                <a href="#guides" className="hover:text-foreground transition-colors">Guides</a>
              </nav>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold mb-4">Legal</h3>
              <nav className="flex flex-col gap-3 text-muted-foreground">
                <a href="#terms" className="hover:text-foreground transition-colors">Terms & Conditions</a>
                <a href="#privacy" className="hover:text-foreground transition-colors">Privacy</a>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-6 rounded-2xl bg-foreground text-background px-6 py-4 flex flex-col md:flex-row items-center justify-between">
          <p className="text-sm">© 2025 Modovisa. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-3 md:mt-0">
            <a href="#twitter" aria-label="Twitter" className="opacity-90 hover:opacity-100 transition-opacity">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#instagram" aria-label="Instagram" className="opacity-90 hover:opacity-100 transition-opacity">
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
