// src/components/SiteFooter.tsx

import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Instagram, Twitter } from "lucide-react";

const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer footer-text mt-20 bg-background" aria-label="Site footer">
      {/* Top block */}
      <div className="footer-top relative z-10 overflow-hidden px-4 pb-10">
        <div className="container mx-auto">
          <div className="grid gap-10 md:gap-12 lg:grid-cols-5">
            {/* Brand + newsletter */}
            <div className="lg:col-span-2">
              <div className="mb-6 flex items-center">
                <Logo />
                <span className="ml-3 text-lg font-semibold tracking-tight">
                  Modovisa
                </span>
              </div>

              <p className="mb-6 max-w-xs text-sm text-muted-foreground">
                Real-Time Insights – Intuitive Analytics
              </p>

              <form
                className="footer-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  // TODO: wire up newsletter submit
                }}
              >
                <label
                  htmlFor="footer-email"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Subscribe to newsletter
                </label>
                <div className="mt-2 flex">
                  <Input
                    id="footer-email"
                    type="email"
                    placeholder="Your email"
                    className="h-10 rounded-none rounded-l-lg border-r-0"
                  />
                  <Button
                    type="submit"
                    className="h-10 rounded-none rounded-r-lg shadow-none"
                  >
                    Subscribe
                  </Button>
                </div>
              </form>
            </div>

            {/* Product */}
            <div>
              <h6 className="mb-6 text-sm font-semibold">Product</h6>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#pricing"
                    className="transition-colors hover:text-foreground"
                    title="Pricing | Modovisa"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="transition-colors hover:text-foreground"
                    title="Features | Modovisa"
                  >
                    Features
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h6 className="mb-6 text-sm font-semibold">Resources</h6>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#landingFAQ"
                    className="transition-colors hover:text-foreground"
                    title="FAQs | Modovisa"
                  >
                    FAQs
                  </a>
                </li>
                <li>
                  <a
                    href="/docs"
                    className="transition-colors hover:text-foreground"
                    title="Guides | Modovisa"
                  >
                    Guides
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h6 className="mb-6 text-sm font-semibold">Legal</h6>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a
                    href="/legal/terms-and-conditions"
                    className="transition-colors hover:text-foreground"
                    title="Terms and Conditions | Modovisa"
                  >
                    Terms &amp; Conditions
                  </a>
                </li>
                <li>
                  <a
                    href="/legal/privacy"
                    className="transition-colors hover:text-foreground"
                    title="Privacy Policy | Modovisa"
                  >
                    Privacy
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h6 className="mb-6 text-sm font-semibold">Contact</h6>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>
                  <a
                    href="/contact"
                    className="transition-colors hover:text-foreground"
                    title="Contact us | Modovisa"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="transition-colors hover:text-foreground"
                    title="Support | Modovisa"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom bg-foreground py-4 text-background md:py-5">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-center text-sm md:flex-row md:text-left">
          <div>
            <span className="footer-bottom-text">
              © {year} <span className="font-semibold">Modovisa</span>{" "}
              <span>made with ❤️ All Rights Reserved</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://x.com/modovisa"
              title="Modovisa at x.com"
              target="_blank"
              rel="noreferrer"
              className="text-background/90 transition-opacity hover:opacity-100"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://www.instagram.com/modovisa/"
              title="Modovisa at Instagram"
              target="_blank"
              rel="noreferrer"
              className="text-background/90 transition-opacity hover:opacity-100"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
