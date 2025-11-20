// src/components/SiteFooter.tsx

import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Twitter } from "lucide-react";
import { Link } from "react-router-dom";

const SiteFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="landing-footer footer-text bg-muted/40 pt-16 pb-0"
      aria-label="Site footer"
    >
      {/* Outer container controls overall footer width */}
      <div className="mx-auto w-full max-w-[100%] px-4 lg:px-10 2xl:px-16">
        {/* Top: big rounded card */}
        <div className="footer-top relative overflow-hidden rounded-[32px] bg-background px-6 py-10 shadow-[0_18px_45px_rgba(58,87,135,0.12)] sm:px-8 lg:px-12">
          <div className="grid gap-10 md:grid-cols-3 lg:grid-cols-[minmax(0,2.2fr)_repeat(4,minmax(0,1fr))]">
            {/* Brand + newsletter (wider column) */}
            <div className="lg:pr-16">
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
                    to="/legal/privacy-policy"
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
                    to="/contact-us"
                    className="transition-colors hover:text-primary"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact-us"
                    className="transition-colors hover:text-primary"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

       {/* Bottom bar */}
        <div className="footer-bottom mt-6 -mx-4 bg-foreground py-3 md:py-5 lg:-mx-10 2xl:-mx-16">
          <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-4 px-4 text-center text-sm text-background md:flex-row md:px-0 md:text-left">
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
                className="text-background/80 transition-colors hover:text-background"
              >
                <Twitter className="h-5 w-5" />
              </a>

              <a
                href="https://www.reddit.com/r/Modovisa/"
                title="Modovisa on Reddit"
                target="_blank"
                rel="noreferrer"
                className="text-background/80 transition-colors hover:text-background"
              >
                <svg
                  viewBox="-143 145 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                  className="h-5 w-5 fill-current"
                >
                  <g>
                    <path d="M13.4,379.1c-6.2-2.6-13.8-0.4-18.4,5.1s-5.1,13.8-1.1,19.7C-1.4,394.3,5.3,386.2,13.4,379.1z" />
                    <path d="M195.9,325.6c6.4,0,11.5-5.3,11.5-11.7c0-6.4-5.1-11.5-11.5-11.6c-6.4,0-11.6,5.1-11.7,11.5 C184.1,320.3,189.5,325.6,195.9,325.6z" />
                    <path d="M174.7,380.5c-17.5-9.8-36.5-14.6-56.4-16c-23.6-1.7-46.6,1.2-68.5,10.4c-13.7,5.7-25.9,13.5-35.3,25.2 C0.8,417.3,0.3,438,13.2,455.7c6.7,9.2,15.5,16.1,25.4,21.6c21.1,11.6,43.9,16.1,65.1,16.2c22.3,0,41.4-3.2,59.6-10.9 c13.6-5.7,25.9-13.5,35.2-25.3c13.7-17.3,14.1-37.7,1.2-55.6C193.1,392.7,184.4,385.9,174.7,380.5z M48.6,415 c0.2-12,9.8-21.3,21.8-21.1c11.6,0.2,20.9,9.9,20.8,21.6c-0.1,11.8-10,21.2-22,21C57.8,436.2,48.5,426.5,48.6,415z M151.1,466.8 c-7.1,6.5-15.6,10.2-24.8,12.1c-6.6,1.4-13.3,1.9-20,2.9c-11.4-0.6-22.4-2.2-32.6-7.4c-3.8-1.9-7.3-4.4-10.6-7.1 c-3.9-3.3-4.1-8.2-1-11.6c3.1-3.3,7.9-3.2,11.6,0.1c5.5,4.9,12.1,7.2,19.2,8.5c12.4,2.3,24.7,1.8,36.6-2.8c3.9-1.5,7.5-3.9,11-6.4 c3.6-2.6,8.3-2.5,11.1,0.6C154.6,459,154.4,463.8,151.1,466.8z M144.9,436.4c-11.4-0.2-20.9-10-20.7-21.5 c0.2-12,10-21.4,22.2-21.1c11.4,0.3,20.7,10.1,20.5,21.6C166.7,427.5,157,436.7,144.9,436.4z" />
                    <path d="M-143,145v512h512V145H-143z M238,399c-0.1,0.2-0.3,0.5-0.3,0.7c-1.4,8.8-5.6,15.8-12.5,21.4c-0.5,0.4-0.7,1.5-0.6,2.2 c1,12.5-1.6,24.1-7.9,34.9c-8.6,14.7-21.1,25.1-35.8,33.2c-20,11-41.7,16.3-64.4,17.6c-26.1,1.5-51.3-2.4-75.2-13.1 c-16-7.1-30.1-16.9-40.6-31.2c-9.2-12.5-13.8-26.4-12.2-42c0.1-0.8-0.6-1.8-1.3-2.4c-4.1-3.5-7.4-7.6-9.3-12.7 c-1-2.8-1.7-5.7-2.5-8.5c0-2.6,0-5.1,0-7.7c1.6-4.4,2.6-9.1,4.9-13.1c9.2-15.8,29.9-20.6,45.3-10.7c1.6,1,2.7,1,4.3,0.1 c18.4-10.7,38.4-16.2,59.5-18.3c3.1-0.3,6.3-0.5,9.5-0.6c1.6,0,2.3-0.7,2.9-2.2c6.3-18.2,12.8-36.4,19.2-54.6 c0.3-0.8,0.6-1.6,1-2.6c6.8,1.6,13.5,3.2,20.2,4.8c9.1,2.2,18.3,4.3,27.4,6.6c1.7,0.4,2.5,0.2,3.5-1.3c6.7-10.5,19-15,30.8-11.5 c11.6,3.5,19.5,14.3,19.5,26.6c-0.1,13.3-10.5,25.1-23.5,26.6c-14.2,1.7-27.3-7.2-30.2-20.7c-0.6-2.9-1.7-4.1-4.7-4.8 c-10.9-2.4-21.7-5.1-32.9-7.7c-4.8,13.6-9.5,27.1-14.3,40.7c6,0.8,11.8,1.4,17.6,2.3c17.2,2.8,33.4,8.3,48.5,17.1 c1.3,0.8,2.2,0.9,3.6,0c20.1-13,45.9-1.8,50.3,21.8c0.1,0.4,0.3,0.8,0.5,1.1C238,393.5,238,396.2,238,399z" />
                    <path d="M200,379.1c3.6,4,7.4,7.7,10.7,11.8c3.2,4.2,5.9,8.8,8.9,13.1c4-5.5,3.6-13.7-0.8-19.4C214.2,378.8,206.3,376.5,200,379.1z " />
                  </g>
                </svg>
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default SiteFooter;
