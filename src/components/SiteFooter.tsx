// src/components/SiteFooter.tsx

import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Instagram, Twitter } from "lucide-react";
import { Link } from "react-router-dom";

const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="landing-footer bg-muted/40 pt-16 pb-10"
      aria-label="Site footer"
    >
      {/* FULL-WIDTH WRAPPER (no `container`) */}
      <div className="w-full px-4 lg:px-10 2xl:px-16 mx-auto">
        {/* Top: big rounded card like Bootstrap, almost full width */}
        <div className="footer-top relative mx-auto overflow-hidden rounded-[32px] bg-background px-6 py-10 shadow-[0_18px_45px_rgba(58,87,135,0.12)] sm:px-8 lg:px-12">
          <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-5">
            {/* Brand + newsletter */}
            <div>
              <div className="mb-6 flex items-center gap-3">
                <Logo />
              </div>

              <p className="footer-logo-description mb-6 max-w-xs text-sm text-muted-foreground">
                Real-Time Insights – Intuitive Analytics
              </p>

              <form
                className="footer-form max-w-md"
                onSubmit={(e) => e.preventDefault()}
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
                    className="h-10 rounded-r-none border-r-0 text-sm"
                  />
                  <Button
                    type="submit"
                    className="h-10 rounded-l-none px-5 text-sm font-semibold"
                  >
                    Subscribe
                  </Button>
                </div>
              </form>
            </div>

            {/* Product */}
            <div>
              <h3 className="mb-6 text-sm font-semibold">Product</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#pricing"
                    className="transition-colors hover:text-primary"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#features"
                    className="transition-colors hover:text-primary"
                  >
                    Features
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="mb-6 text-sm font-semibold">Resources</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#landingFAQ"
                    className="transition-colors hover:text-primary"
                  >
                    FAQs
                  </a>
                </li>
                <li>
                  <Link
                    to="/docs"
                    className="transition-colors hover:text-primary"
                  >
                    Guides
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="mb-6 text-sm font-semibold">Legal</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/legal/terms-and-conditions"
                    className="transition-colors hover:text-primary"
                  >
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link
                    to="/legal/privacy"
                    className="transition-colors hover:text-primary"
                  >
                    Privacy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="mb-6 text-sm font-semibold">Contact</h3>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li>
                  <Link
                    to="/contact"
                    className="transition-colors hover:text-primary"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="transition-colors hover:text-primary"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar (still centered but can be narrower than the card if you prefer later) */}
        <div className="footer-bottom py-3 md:py-5">
          <div className="flex flex-col items-center justify-between gap-4 text-center text-sm text-muted-foreground md:flex-row md:text-left">
            <div>
              <span className="footer-bottom-text">
                © {year} <span className="font-medium">Modovisa</span>{" "}
                <span>made with ❤️ All Rights Reserved</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://x.com/modovisa"
                title="Modovisa on X"
                target="_blank"
                rel="noreferrer"
                className="text-foreground/80 transition-colors hover:text-primary"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/modovisa/"
                title="Modovisa on Instagram"
                target="_blank"
                rel="noreferrer"
                className="text-foreground/80 transition-colors hover:text-primary"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
