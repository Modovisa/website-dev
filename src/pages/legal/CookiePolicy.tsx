// src/pages/legal/CookiePolicy.tsx
// @ts-nocheck

import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import SiteFooter from "@/components/SiteFooter";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-4 px-4 md:px-8">
          <Link
            to="/"
            aria-label="Go to homepage"
            className="flex items-center gap-2"
          >
            <Logo className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center rounded-full border border-black bg-black px-4 py-2 text-xs md:text-sm font-medium text-white transition-colors hover:bg-white hover:text-black"
          >
            Back to homepage
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <section className="py-10 md:py-16">
          <div className="container mx-auto px-4 md:px-8 max-w-5xl">
            {/* Hero / Heading */}
            <div className="mb-8 md:mb-10">
              <p className="text-xs font-semibold tracking-[0.25em] text-muted-foreground mb-2">
                LEGAL
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
                Cookie Policy
              </h1>
              <p className="text-sm text-muted-foreground">
                Last updated:{" "}
                <span className="font-medium text-foreground">23 April 2025</span>
              </p>
            </div>

            {/* Content */}
            <div
              className="
                prose prose-sm md:prose-base max-w-none
                prose-headings:font-semibold
                prose-h2:mt-8 prose-h2:mb-3
                prose-h3:mt-6 prose-h3:mb-2
                prose-p:mt-1 prose-p:mb-3
                prose-ul:mt-1 prose-ul:mb-4
                prose-li:mt-1 prose-li:mb-1
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              "
            >
              <h2>1. Introduction</h2>
              <p>
                This Cookie Policy explains how Modovisa (
                <a
                  href="https://modovisa.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  modovisa.com
                </a>
                ) uses cookies and similar technologies in connection with our
                real-time visitor tracking and analytics services. It should be
                read together with our{" "}
                <Link
                  to="/legal/privacy-policy"
                  className="text-primary hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>

              <h2>2. What Are Cookies?</h2>
              <p>
                Cookies are small text files placed on your device when you visit
                a website. They help websites function, remember user preferences,
                and collect information for analytics. Cookies may be
                session-based (deleted when you close your browser) or persistent
                (stored until they expire or are deleted).
              </p>

              <h2>3. Cookies We Use</h2>
              <p>
                When you use Modovisa or when our tracking script is installed on
                a customer&apos;s website, we may set the following first-party
                cookies:
              </p>
              <ul>
                <li>
                  <strong>modovisa_vid</strong> — Visitor ID, used to recognize
                  repeat visits. Retained for up to 13 months before reset.
                </li>
                <li>
                  <strong>modovisa_session_id</strong> — Session identifier, used
                  to group page views into one browsing session. Expires after 30
                  minutes of inactivity.
                </li>
                <li>
                  <strong>modovisa_original_referrer</strong> — Stores the
                  original traffic source (e.g., search engine, campaign link).
                  Retained for up to 13 months.
                </li>
              </ul>
              <p>
                These cookies are strictly limited to measuring website traffic
                and user journeys. We do <strong>not</strong> use them for
                advertising, behavioral profiling, or cross-site tracking.
              </p>

              <h2>4. Consent</h2>
              <p>
                For visitors located in the European Economic Area (EEA), United
                Kingdom (UK), or other regions where consent is required,
                Modovisa tracking will only start once you explicitly agree to the
                use of cookies. A banner will be shown asking: &quot;We use a
                visitor ID cookie to measure website traffic. Do you
                consent?&quot;
              </p>

              <h2>5. Managing Cookies</h2>
              <p>
                You can control and delete cookies at any time through your
                browser settings. If you choose to disable cookies, some analytics
                functionality may not work correctly.
              </p>

              <h2>6. Data Retention</h2>
              <p>
                Visitor cookies are retained for a maximum of 13 months and then
                reset automatically. Session cookies expire after 30 minutes of
                inactivity.
              </p>

              <h2>7. Third-Party Cookies</h2>
              <p>
                Modovisa does not set third-party advertising cookies. However,
                our platform may integrate with services such as Cloudflare for
                security and performance, which may place their own cookies.
                Please refer to the third party&apos;s cookie policies for
                details.
              </p>

              <h2>8. Your Rights</h2>
              <p>
                Depending on your location, you may have rights under laws such as
                GDPR or CCPA to access, delete, or object to the use of cookies
                associated with your data. To exercise these rights, please
                contact us at <strong>we.care@modovisa.com</strong>.
              </p>

              <h2>9. Updates</h2>
              <p>
                We may update this Cookie Policy from time to time. We will post
                the updated version on this page and update the &quot;Last
                updated&quot; date above.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
};

export default CookiePolicy;
