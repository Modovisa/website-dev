// src/pages/legal/PrivacyPolicy.tsx
// @ts-nocheck

import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import SiteFooter from "@/components/SiteFooter";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-4 px-4 md:px-8">
          <Link to="/" aria-label="Go to homepage" className="flex items-center gap-2">
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
              <p className="text-xs font-semibold tracking-[0.25em] text-slate-400 mb-2">
                LEGAL
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
                Privacy Policy
              </h1>
              <p className="text-sm text-slate-400">
                Last updated: <span className="font-medium text-slate-200">23 April 2025</span>
              </p>
            </div>

            <div className="prose prose-invert prose-sm md:prose-base max-w-none">
              <h2>1. About Modovisa</h2>
              <p>
                Modovisa provides real-time visitor tracking and analytics services to businesses.
                Our platform helps our customers better understand how users interact with their
                websites. This Privacy Policy explains how we collect, use, and protect personal
                information when you use our services.
              </p>

              <h2>2. Information We Collect</h2>

              <h3>2.1 Customer Information</h3>
              <p>When you create an account with Modovisa, we may collect personal information such as:</p>
              <ul>
                <li>Name</li>
                <li>Email address</li>
                <li>Account credentials (hashed passwords)</li>
                <li>Billing information (if applicable)</li>
              </ul>

              <h3>2.2 Website Visitor Information (Anonymous Data)</h3>
              <p>
                When our tracking script is installed on a customer&apos;s website, we collect anonymous
                data such as:
              </p>
              <ul>
                <li>Page views</li>
                <li>Referring pages</li>
                <li>Device type and browser information</li>
                <li>Approximate geolocation (based on IP address)</li>
                <li>Session duration and interactions (e.g., clicks, scrolls)</li>
              </ul>
              <p>
                We do <strong>not</strong> collect names, email addresses, or personally identifiable
                information about your visitors unless explicitly configured otherwise by the customer.
              </p>
              <p>
                We may process certain website visitor data in an aggregated and anonymized form.{" "}
                <strong>To the fullest extent permitted by law</strong>, this means that all personally
                identifiable information is removed or irreversibly altered before analysis. Anonymized
                data is used solely for purposes such as improving our services, monitoring platform
                performance, developing new features, and generating statistical insights. These insights
                may be shared publicly or with third parties, but they will never include any information
                that can reasonably identify you, your website, or your visitors.
              </p>
              <p>
                Modovisa retains sole discretion to determine whether data has been sufficiently
                anonymized.
              </p>

              <h2>3. How We Use Your Information</h2>
              <p>We use information, including but not limited to, in order to:</p>
              <ul>
                <li>Operate and improve the Modovisa platform</li>
                <li>Provide support and customer service</li>
                <li>Manage billing and account administration</li>
                <li>Enhance security, detect fraud, and ensure compliance</li>
                <li>Generate anonymized analytics reports</li>
              </ul>
              <p>
                This may include creating aggregated, anonymized datasets from usage information to help
                us analyze trends, measure performance, and improve our platform. Such datasets do not
                contain any information that can be used to identify individual users or their visitors.
              </p>

              <h2>4. Data Sharing and Disclosure</h2>
              <p>We do not sell personal information. We may share data with the following parties, subject to applicable law:</p>
              <ul>
                <li>Service providers and contractors (e.g., hosting, billing services)</li>
                <li>Authorities if required by law (e.g., for legal compliance)</li>
                <li>In the event of a business transfer, merger, or acquisition</li>
              </ul>

              <h2>5. International Transfers</h2>
              <p>
                Our services are delivered through Cloudflare&apos;s global network, with servers distributed
                across multiple locations worldwide. As a result, your information may be transferred to,
                stored, or processed in countries other than your country of residence.
              </p>
              <p>
                We ensure that international data transfers comply with applicable data protection laws,
                including the General Data Protection Regulation (GDPR). Where required, we use
                appropriate safeguards such as Standard Contractual Clauses approved by the European
                Commission to protect your personal information when it is transferred outside the
                European Economic Area (EEA), United Kingdom (UK), or Switzerland.
              </p>
              <p>
                For more information about Cloudflare&apos;s network and its data protection practices, please
                visit their{" "}
                <a
                  href="https://www.cloudflare.com/en-in/network/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Global Network Overview
                </a>{" "}
                and{" "}
                <a
                  href="https://www.cloudflare.com/trust-hub/gdpr/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GDPR Compliance Information
                </a>
                .
              </p>
              <p>By using our Services, you consent to such transfers.</p>

              <h2>6. Data Retention</h2>
              <p>
                We retain customer account data for as long as the account is active. Website visitor
                analytics data is retained for a default period of [insert time period, e.g., 12 months],
                after which it is anonymized or deleted.
              </p>

              <h2>7. Security</h2>
              <p>
                We use reasonable technical and organizational measures to protect personal information.
                However, no method of transmission or storage is 100% secure.
              </p>
              <p>You acknowledge that you use the Services at your own risk.</p>

              <h2>8. Your Privacy Rights</h2>

              <h3>8.1 GDPR Rights (EEA and UK)</h3>
              <p>
                If you are located in the EEA or UK, you have rights including the right to access,
                correct, update, or request deletion of your personal information. You also have the
                right to object to or restrict processing, and to lodge a complaint with a data protection
                authority.
              </p>

              <h3>8.2 CCPA Rights (California)</h3>
              <p>
                Under the California Consumer Privacy Act (CCPA), California residents have the right to
                access, delete, and opt out of the sale of their personal information. Although Modovisa
                does not sell personal information, we respect all valid CCPA requests.
              </p>

              <h3>8.3 No Guarantee of Legal Compliance</h3>
              <p>
                While we provide tools to assist with compliance, Modovisa does not guarantee that your
                use of our Services will satisfy legal or regulatory requirements applicable to you. You
                are solely responsible for ensuring that your website, data collection practices, and use
                of the Services comply with all applicable laws, rules, and regulations, including but not
                limited to data protection and privacy laws such as GDPR, CCPA, or HIPAA.
              </p>
              <p>
                This includes any data subject requests, breach notifications, or regulatory reporting
                obligations.
              </p>

              <h2>9. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to facilitate analytics and improve functionality.
                For more information, please see our{" "}
                <Link to="/legal/cookie-policy" className="text-primary hover:underline">
                  Cookie Policy
                </Link>
                .
              </p>

              <h2>9A. Third-Party Services and Integrations</h2>
              <p>
                Our Services may integrate with third-party platforms, plugins, or hosting providers
                (e.g., WordPress, Shopify, Cloudflare). Modovisa is not responsible for the operation,
                availability, or performance of such third-party services. Changes, outages, or
                malfunctions in third-party systems may affect the functionality of our Services, and we
                make no warranties, express or implied, regarding their interoperability or continued
                availability.
              </p>
              <p>Such integrations are provided &apos;as is&apos; and may be modified or discontinued at any time without notice.</p>

              <h2>10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material
                changes by posting the updated policy on our website and updating the &quot;Last updated&quot;
                date at the top of this document.
              </p>

              <h2>11. Force Majeure</h2>
              <p>
                Modovisa shall not be liable for any failure or delay in performance resulting from causes
                beyond our reasonable control, including but not limited to acts of God, natural
                disasters, internet or telecommunications outages, government actions, labor disputes, or
                failures of third-party service providers.
              </p>
              <p>This includes without limitation acts or omissions of third-party service providers.</p>

              <h2>12. Contact Us</h2>
              <p>
                If you have any questions or concerns, contact us at:{" "}
                <strong>we.care@modovisa.com</strong>
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

export default PrivacyPolicy;
