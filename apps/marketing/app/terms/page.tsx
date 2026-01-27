"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function TermsPage() {
  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="nav-logo">
            Quantract
          </Link>
        </div>
      </nav>

      <main className="legal-page">
        <div className="container">
          <Link href="/" className="back-link">
            <ArrowLeft size={16} />
            Back to Home
          </Link>

          <h1>Terms of Service</h1>
          <p className="last-updated">Last updated: January 2026</p>

          <section>
            <h2>1. Agreement to Terms</h2>
            <p>
              By accessing or using Quantract (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you may not access the Service.
            </p>
            <p>
              These Terms apply to all users of the Service, including administrators, team members, and any other users granted access to your account.
            </p>
          </section>

          <section>
            <h2>2. Description of Service</h2>
            <p>
              Quantract provides cloud-based software for electrical contractors and building services companies, including:
            </p>
            <ul>
              <li>Quote and proposal management</li>
              <li>Job and project tracking</li>
              <li>Invoicing and payment processing</li>
              <li>Digital certificate generation</li>
              <li>Customer portal access</li>
              <li>Team management and scheduling</li>
            </ul>
          </section>

          <section>
            <h2>3. Account Registration</h2>
            <p>To use the Service, you must:</p>
            <ul>
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorised use of your account</li>
            </ul>
            <p>
              You are responsible for all activities that occur under your account, including actions by team members you invite.
            </p>
          </section>

          <section>
            <h2>4. Subscription and Payment</h2>
            <h3>4.1 Pricing</h3>
            <p>
              Subscription fees are as listed on our pricing page. Prices are in GBP and exclude VAT unless stated otherwise.
            </p>
            <h3>4.2 Billing</h3>
            <p>
              Subscriptions are billed monthly in advance. Payment is processed automatically via Stripe. Failed payments may result in service suspension.
            </p>
            <h3>4.3 Free Trial</h3>
            <p>
              New accounts receive a 14-day free trial. No credit card is required during the trial. At the end of the trial, you must subscribe to continue using the Service.
            </p>
            <h3>4.4 Refunds</h3>
            <p>
              Subscription fees are non-refundable except where required by law. If you cancel mid-cycle, you retain access until the end of the billing period.
            </p>
          </section>

          <section>
            <h2>5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe the intellectual property rights of others</li>
              <li>Transmit malware, viruses, or harmful code</li>
              <li>Attempt to gain unauthorised access to our systems</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service to send spam or unsolicited communications</li>
              <li>Resell or sublicense access to the Service without our consent</li>
            </ul>
          </section>

          <section>
            <h2>6. Your Data</h2>
            <h3>6.1 Ownership</h3>
            <p>
              You retain ownership of all data you upload to the Service (&quot;Your Data&quot;). We do not claim any ownership rights over Your Data.
            </p>
            <h3>6.2 License to Us</h3>
            <p>
              You grant us a limited license to use, store, and process Your Data solely to provide the Service and as described in our Privacy Policy.
            </p>
            <h3>6.3 Data Export</h3>
            <p>
              You may export Your Data at any time through the Service&apos;s export features. Upon account termination, we will provide a reasonable period to export your data before deletion.
            </p>
            <h3>6.4 Backups</h3>
            <p>
              While we maintain regular backups, we recommend you also maintain your own backups of important data.
            </p>
          </section>

          <section>
            <h2>7. Intellectual Property</h2>
            <p>
              The Service, including its design, features, and content (excluding Your Data), is owned by Quantract Ltd and protected by intellectual property laws.
            </p>
            <p>
              You are granted a limited, non-exclusive, non-transferable license to use the Service in accordance with these Terms.
            </p>
          </section>

          <section>
            <h2>8. Third-Party Services</h2>
            <p>
              The Service may integrate with third-party services (e.g., Xero, Stripe). Your use of these integrations is subject to their respective terms and privacy policies.
            </p>
            <p>
              We are not responsible for the availability, accuracy, or content of third-party services.
            </p>
          </section>

          <section>
            <h2>9. Service Availability</h2>
            <p>
              We aim for high availability but do not guarantee uninterrupted access. The Service may be unavailable due to:
            </p>
            <ul>
              <li>Scheduled maintenance (we&apos;ll provide notice where possible)</li>
              <li>Unplanned outages</li>
              <li>Circumstances beyond our control</li>
            </ul>
          </section>

          <section>
            <h2>10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law:
            </p>
            <ul>
              <li>The Service is provided &quot;as is&quot; without warranties of any kind</li>
              <li>We are not liable for indirect, incidental, or consequential damages</li>
              <li>Our total liability is limited to the amount you paid in the 12 months before the claim</li>
            </ul>
            <p>
              Nothing in these Terms excludes liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.
            </p>
          </section>

          <section>
            <h2>11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless Quantract Ltd and its employees from any claims, damages, or expenses arising from:
            </p>
            <ul>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </section>

          <section>
            <h2>12. Termination</h2>
            <p>
              <strong>By You:</strong> You may cancel your subscription at any time through your account settings. Access continues until the end of the billing period.
            </p>
            <p>
              <strong>By Us:</strong> We may suspend or terminate your account if you breach these Terms, fail to pay, or for any reason with 30 days&apos; notice.
            </p>
            <p>
              Upon termination, your right to use the Service ceases immediately. We will retain Your Data for a reasonable period to allow export.
            </p>
          </section>

          <section>
            <h2>13. Changes to Terms</h2>
            <p>
              We may modify these Terms at any time. Material changes will be communicated via email or in-app notification at least 30 days before taking effect.
            </p>
            <p>
              Continued use of the Service after changes take effect constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2>14. Governing Law</h2>
            <p>
              These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2>15. Contact</h2>
            <p>
              For questions about these Terms:
            </p>
            <p>
              <a href="mailto:legal@quantract.co.uk" className="contact-link">
                <Mail size={16} />
                legal@quantract.co.uk
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-bottom" style={{ borderTop: "none", paddingTop: 0 }}>
            <p className="footer-copy">&copy; {new Date().getFullYear()} Quantract Ltd. All rights reserved.</p>
            <div className="footer-links" style={{ display: "flex", gap: "1rem" }}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .legal-page {
          padding: 6rem 0 4rem;
          min-height: 80vh;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--primary);
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 2rem;
        }
        .back-link:hover {
          text-decoration: underline;
        }
        h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        .last-updated {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 3rem;
        }
        section {
          margin-bottom: 2.5rem;
        }
        h2 {
          font-size: 1.25rem;
          margin-bottom: 1rem;
          color: var(--secondary);
        }
        h3 {
          font-size: 1rem;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: var(--text);
        }
        p {
          color: var(--text);
          margin-bottom: 1rem;
          line-height: 1.7;
        }
        ul {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        li {
          color: var(--text);
          margin-bottom: 0.5rem;
          line-height: 1.7;
        }
        a {
          color: var(--primary);
        }
        .contact-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .footer-links a {
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
        }
        .footer-links a:hover {
          color: white;
        }
      `}</style>
    </>
  );
}
