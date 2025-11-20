// src/pages/legal/TermsAndConditions.tsx

import { useEffect } from "react";
import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";

const TermsAndConditions = () => {
  useEffect(() => {
    // Make sure we start at the top when navigating here
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-4 px-4 md:px-8">
          <Link to="/" aria-label="Go to homepage" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to homepage
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-8 max-w-4xl">
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">
                TERMS OF SERVICE
              </h1>
              <p className="text-sm text-muted-foreground">
                <strong>Last updated:</strong> 23 April 2025
              </p>
            </div>

            <div className="space-y-6 text-sm md:text-base leading-relaxed text-muted-foreground">
              {/* Agreement */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Agreement to Our Legal Terms
                </h2>
                <p>
                  We are Magna Norma LLC (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;,
                  &quot;our&quot;), a company registered in the United States.
                </p>
                <p>
                  We operate the website modovisa.com (&quot;Site&quot;), and any related
                  services (collectively, the &quot;Services&quot;).
                </p>
                <p>
                  Modovisa is a privacy-friendly, real-time analytics platform that helps website
                  owners understand their visitors without using invasive tracking. We integrate
                  seamlessly with WordPress, Shopify, Webflow, Framer, and custom-built sites.
                </p>
                <p>Contact us at we.care@modovisa.com.</p>
                <p>
                  By accessing our Services, you agree to these Legal Terms. If you disagree, you
                  must discontinue use immediately.
                </p>
                <p>
                  We may modify these Legal Terms with prior notice. Continued use of Services
                  after changes constitutes acceptance.
                </p>
                <p>The Services are intended for users 18 years and older.</p>
              </section>

              {/* 1. Our Services */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">1. Our Services</h2>
                <p>
                  You are responsible for compliance with your local laws if you access our
                  Services outside the United States.
                </p>
                <p>
                  The Services are not HIPAA, FISMA, or GLBA compliant and must not be used in
                  ways that require such compliance.
                </p>
              </section>

              {/* 2. IP Rights */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  2. Intellectual Property Rights
                </h2>

                <h3 className="text-lg font-semibold text-foreground mb-1">Our Intellectual Property</h3>
                <p>
                  We own or license all content on the Services, protected by copyright, trademark,
                  and other laws.
                </p>
                <p>
                  Content is provided &quot;AS IS&quot; for your personal or internal business use
                  only.
                </p>

                <h3 className="text-lg font-semibold text-foreground mb-1">Your Use of the Services</h3>
                <p>
                  We grant you a limited, non-transferable license to access and use our Services
                  according to these Legal Terms.
                </p>

                <h3 className="text-lg font-semibold text-foreground mb-1">Your Submissions</h3>
                <p>
                  Any feedback you submit becomes our property. You waive any claims related to
                  such feedback.
                </p>
              </section>

              {/* 3. User Representations */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  3. User Representations
                </h2>
                <p>
                  By using the Services, you confirm that your account information is accurate, you
                  are legally capable, and you comply with applicable laws.
                </p>
              </section>

              {/* 4. User Registration */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  4. User Registration
                </h2>
                <p>
                  You are responsible for maintaining the confidentiality of your account
                  credentials.
                </p>
              </section>

              {/* 5. Purchases and Payment */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  5. Purchases and Payment
                </h2>
                <p>
                  All purchases are payable in U.S. Dollars. You agree to provide accurate billing
                  information and authorize recurring charges if subscribing to a plan.
                </p>
              </section>

              {/* 6. Subscriptions */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">6. Subscriptions</h2>

                <h3 className="text-lg font-semibold text-foreground mb-1">Billing and Renewal</h3>
                <p>Subscriptions renew automatically unless cancelled.</p>

                <h3 className="text-lg font-semibold text-foreground mb-1">Cancellation</h3>
                <p>
                  You can cancel via your account dashboard. Cancellations apply to the next
                  billing cycle.
                </p>

                <h3 className="text-lg font-semibold text-foreground mb-1">Fee Changes</h3>
                <p>We may adjust fees with notice according to applicable law.</p>
              </section>

              {/* 7. User Contributions */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  7. User Contributions
                </h2>
                <p>
                  We do not host public user content. Any feedback you submit becomes our property
                  without compensation.
                </p>
              </section>

              {/* 8. Privacy and Data Use */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  8. Privacy and Data Use
                </h2>
                <p>
                  Your use of our Services is subject to our{" "}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                  . We process anonymous visitor data on your behalf. Personal account data is
                  handled in accordance with GDPR, CCPA, and other applicable laws.
                </p>
                <p>
                  We may also process certain usage data in an aggregated and anonymized form. This
                  means that all personally identifiable information is removed or irreversibly
                  altered before analysis. Such anonymized data may be used solely for purposes
                  including improving our services, monitoring platform performance, developing new
                  features, and generating statistical insights. These insights may be shared
                  publicly or with third parties, but will never include any information that can
                  identify you, your website, or your visitors.
                </p>
                <p>
                  <strong>Compliance Disclaimer:</strong> We provide tools and features that may
                  assist you in meeting certain data privacy requirements (including GDPR, CCPA, or
                  other applicable laws), but we do not guarantee that your use of the Services
                  will make you compliant with any such laws. You are solely responsible for
                  ensuring that your collection, processing, and storage of personal data complies
                  with all applicable regulations in your jurisdiction and your users’
                  jurisdictions.
                </p>
              </section>

              {/* 9. International Transfers */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  9. International Transfers
                </h2>
                <p>
                  Our platform utilizes Cloudflare’s global network. Your data may be processed on
                  servers worldwide. We comply with GDPR requirements, including Standard
                  Contractual Clauses where necessary.
                </p>
              </section>

              {/* 10. Data Ownership */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">10. Data Ownership</h2>
                <p>
                  You retain ownership of your visitor data. You grant us a limited license to
                  process and anonymize this data for service improvement. We do not sell personal
                  data.
                </p>
                <p>
                  You retain ownership of your visitor data. You grant us a limited license to
                  process and anonymize this data for the purposes of providing and improving the
                  Services. Anonymized and aggregated datasets created from your data may be used
                  to analyze trends, measure performance, conduct research, and develop features.
                  These datasets will not contain any personally identifiable information and
                  cannot be used to identify you, your account, or your visitors. We do not sell
                  personal data.
                </p>
                <p>
                  You agree that anonymized and aggregated data derived from your use of the
                  Services is our sole property, and you irrevocably waive any and all rights or
                  claims thereto. Determination of what constitutes anonymized or aggregated data
                  shall be at our sole discretion.
                </p>
              </section>

              {/* 11. Prohibited Activities */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  11. Prohibited Activities
                </h2>
                <p>
                  Users must not violate laws, infringe on intellectual property, distribute
                  malware, or engage in unauthorized commercial activities on the platform.
                </p>
              </section>

              {/* 11A. Third-Party Integrations */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  11A. Third-Party Integrations and Dependencies
                </h2>
                <p>
                  We may provide integrations with third-party platforms or services, such as
                  WordPress, Shopify, Webflow, Framer, and others. These integrations are provided
                  “AS IS” without any warranty, guarantee, or representation of compatibility or
                  continued availability. We are not responsible for any malfunction, error, data
                  loss, interruption, or other issues caused by changes, updates, or
                  discontinuation of such third-party platforms, their APIs, or related services.
                  Your continued use of such integrations is at your own risk.
                </p>
              </section>

              {/* 12. Third-Party Websites */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  12. Third-Party Websites and Content
                </h2>
                <p>
                  We are not responsible for any third-party websites or content linked through the
                  Services.
                </p>
              </section>

              {/* 13. Services Management */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  13. Services Management
                </h2>
                <p>
                  We reserve the right to monitor, restrict, and remove access to the Services for
                  any user at our discretion.
                </p>
              </section>

              {/* 14. Privacy Policy */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  14. Privacy Policy
                </h2>
                <p>
                  Our{" "}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>{" "}
                  explains how we collect, use, and protect your personal information.
                </p>
              </section>

              {/* 15. Term and Termination */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  15. Term and Termination
                </h2>
                <p>
                  We reserve the unconditional right, at our sole and absolute discretion, to
                  suspend, disable, restrict, or permanently terminate your access to the Services,
                  your account, or any associated data, at any time, with or without prior notice,
                  and for any reason or no reason at all. This includes, without limitation,
                  situations involving suspected or actual violations of these Legal Terms,
                  non-payment, fraudulent or abusive behaviour, or where continued provision of the
                  Services to you would expose us to legal or reputational risk.
                </p>
                <p>
                  In the event of termination, you will remain responsible for all fees and charges
                  incurred through the termination date. No refunds, credits, or pro-rata payments
                  will be issued for any unused portion of a subscription or service period, except
                  where required by applicable law.
                </p>
                <p>
                  Termination of your account will not affect any rights or obligations that
                  accrued prior to the date of termination, including without limitation our rights
                  to enforce any indemnification obligations, limitations of liability, or other
                  provisions of these Legal Terms that by their nature should survive termination.
                </p>
              </section>

              {/* 16. Modifications and Interruptions */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  16. Modifications and Interruptions
                </h2>
                <p>We may update or discontinue Services at any time without liability.</p>
              </section>

              {/* 16A. Force Majeure */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">16A. Force Majeure</h2>
                <p>
                  We shall not be liable or responsible for any failure or delay in the performance
                  of any obligation under these Terms if such failure or delay is caused by events
                  beyond our reasonable control, including but not limited to acts of God, natural
                  disasters, pandemics, governmental actions, changes in law, strikes, labor
                  disputes, internet or telecommunications failures, hosting outages, cyberattacks,
                  acts of terrorism, war, or any other cause beyond our reasonable control.
                </p>
              </section>

              {/* 17. Governing Law */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">17. Governing Law</h2>
                <p>These Legal Terms are governed by the laws of the United States.</p>
              </section>

              {/* 18. Dispute Resolution */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  18. Dispute Resolution
                </h2>

                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Informal Negotiations
                </h3>
                <p>We will attempt to resolve disputes informally before proceeding to arbitration.</p>

                <h3 className="text-lg font-semibold text-foreground mb-1">Binding Arbitration</h3>
                <p>
                  Any dispute, controversy, or claim arising out of or relating to these Terms or
                  the breach thereof shall be resolved by binding arbitration administered by the
                  American Arbitration Association (AAA) under its Commercial Arbitration Rules.
                  The arbitration shall take place in a mutually agreed location or virtually, in
                  English, and the decision rendered by the arbitrator shall be final and binding.
                </p>

                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Waiver of Class or Consolidated Actions
                </h3>
                <p>
                  To the fullest extent permitted by law, you and we agree that any and all claims
                  or disputes must be brought on an individual basis and not as a plaintiff or
                  class member in any purported class, collective, consolidated, or representative
                  proceeding. Arbitration or litigation of claims on a class, collective, or
                  consolidated basis is not permitted.
                </p>
                <p>
                  All disputes shall be resolved individually, without resort to any form of class
                  action. To the fullest extent permitted by law, any cause of action or claim you
                  may have arising out of or related to the Services must be commenced within one
                  (1) year after the cause of action accrues; otherwise, such cause of action or
                  claim is permanently barred.
                </p>
              </section>

              {/* 19. Disclaimer of Warranties */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  19. Disclaimer of Warranties
                </h2>
                <p>
                  The Services, including all content, data, analytics, software, and features, are
                  provided strictly on an “AS IS,” “AS AVAILABLE,” and “WITH ALL FAULTS” basis,
                  without any warranty or guarantee of any kind, whether express, implied,
                  statutory, or otherwise. To the maximum extent permitted by law, we expressly
                  disclaim all warranties, including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>
                    Any warranties of merchantability, fitness for a particular purpose, title, or
                    non-infringement;
                  </li>
                  <li>
                    Any guarantee that the Services will meet your expectations, achieve any
                    specific results, operate without interruption, be error-free, secure, or free
                    from harmful components;
                  </li>
                  <li>
                    Any assurance regarding the accuracy, reliability, timeliness, completeness, or
                    usefulness of any data, analytics, or insights generated by the Services;
                  </li>
                  <li>
                    Any liability for downtime, service interruptions, delays, failures, or errors
                    caused by circumstances beyond our control, including without limitation acts
                    or omissions of internet service providers, hosting providers, third-party
                    APIs, payment processors, or other third parties.
                  </li>
                </ul>
                <p>
                  You acknowledge that use of the Services is at your sole risk and that you assume
                  full responsibility for any decisions made based on the output of the Services.
                </p>
              </section>

              {/* 20. Limitations of Liability */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  20. Limitations of Liability
                </h2>
                <p>
                  To the fullest extent permitted by law, in no event shall Modovisa, its
                  affiliates, officers, employees, or agents be liable for any indirect, incidental,
                  special, punitive, or consequential damages, including but not limited to loss of
                  profits, data, goodwill, or other intangible losses, whether based in contract,
                  tort, strict liability, or otherwise, arising out of or related to your use of or
                  inability to use the Services, even if we have been advised of the possibility of
                  such damages. Our total liability for all claims under these Terms shall not
                  exceed the greater of $300 USD or the total amount you paid to us in the six (6)
                  months preceding the claim. These limitations shall apply notwithstanding any
                  failure of essential purpose of any remedy and shall survive termination of this
                  agreement.
                </p>
              </section>

              {/* 21. Indemnification */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">21. Indemnification</h2>
                <p>
                  You agree to defend, indemnify, and hold harmless Modovisa, its affiliates, and
                  their respective officers, directors, employees, contractors, agents, licensors,
                  and suppliers from and against any and all claims, actions, demands, liabilities,
                  damages, losses, costs, or expenses (including reasonable attorneys’ fees) arising
                  out of or in any way connected with: (a) your access to or use of the Services;
                  (b) your breach of these Terms; (c) any data, content, or materials you provide;
                  or (d) your violation of any law or the rights of any third party.
                </p>
              </section>

              {/* 22. User Data */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">22. User Data</h2>
                <p>
                  We perform routine data backups but are not responsible for loss or corruption of
                  user data.
                </p>
              </section>

              {/* 23. Electronic Comms */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  23. Electronic Communications and Signatures
                </h2>
                <p>
                  Electronic communications between us satisfy any legal requirement for written
                  communications.
                </p>
              </section>

              {/* 24. California Users */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  24. California Users
                </h2>
                <p>
                  California users may contact the Division of Consumer Services for unresolved
                  complaints.
                </p>
              </section>

              {/* 25. Misc */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">25. Miscellaneous</h2>
                <p>These Legal Terms constitute the full agreement between you and us.</p>
              </section>

              {/* 26. Custom Analytics Data Clause */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  26. Custom Analytics Data Clause
                </h2>
                <p>
                  We own anonymized analytics data collected on our platform and may use it for
                  service improvement and research.
                </p>
                <p>
                  We own anonymized and aggregated analytics data collected on our platform.
                  “Anonymized” means that all personally identifiable information has been removed
                  or irreversibly altered so that the data can no longer be linked to any
                  individual, account, or specific website. We may use such data for service
                  improvement, research, monitoring platform performance, developing features,
                  publishing industry-wide trends, and other lawful purposes.
                </p>
                <p>
                  You agree that anonymized and aggregated data derived from your use of the
                  Services is our sole property, and you irrevocably waive any and all rights or
                  claims thereto. Determination of what constitutes anonymized or aggregated data
                  shall be at our sole discretion.
                </p>
              </section>

              {/* 27. Contact */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-2">27. Contact Us</h2>
                <p>
                  If you have any questions or concerns, contact us at:{" "}
                  <strong>we.care@modovisa.com</strong>
                </p>
              </section>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <SiteFooter />
    </div>
  );
};

export default TermsAndConditions;
