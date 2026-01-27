"use client";

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function PrivacyPage() {
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

          <h1>Privacy Policy</h1>
          <p className="last-updated">Last updated: January 2026</p>

          <section>
            <h2>1. Who We Are</h2>
            <p>
              Quantract Ltd (&quot;Quantract&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is the data controller for personal data collected through our website and services. We are registered in England and Wales.
            </p>
            <p>
              <strong>Contact:</strong>{" "}
              <a href="mailto:privacy@quantract.co.uk">privacy@quantract.co.uk</a>
            </p>
          </section>

          <section>
            <h2>2. What Data We Collect</h2>
            <p>We collect the following types of personal data:</p>
            <ul>
              <li><strong>Account information:</strong> Name, email address, company name, phone number</li>
              <li><strong>Billing information:</strong> Payment card details (processed by Stripe), billing address</li>
              <li><strong>Usage data:</strong> How you use our services, features accessed, timestamps</li>
              <li><strong>Client data:</strong> Information you store about your customers (job details, contact information, certificates)</li>
              <li><strong>Technical data:</strong> IP address, browser type, device information</li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Data</h2>
            <p>We use your data to:</p>
            <ul>
              <li>Provide and maintain our services</li>
              <li>Process payments and send invoices</li>
              <li>Send service-related communications (account updates, security alerts)</li>
              <li>Provide customer support</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p>We do <strong>not</strong> sell your personal data to third parties.</p>
          </section>

          <section>
            <h2>4. Legal Basis for Processing</h2>
            <p>We process your data based on:</p>
            <ul>
              <li><strong>Contract:</strong> To provide services you have requested</li>
              <li><strong>Legitimate interests:</strong> To improve our services and prevent fraud</li>
              <li><strong>Legal obligation:</strong> To comply with applicable laws</li>
              <li><strong>Consent:</strong> Where you have given explicit consent (e.g., marketing emails)</li>
            </ul>
          </section>

          <section>
            <h2>5. Data Sharing</h2>
            <p>We share data with:</p>
            <ul>
              <li><strong>Payment processors:</strong> Stripe, for processing payments</li>
              <li><strong>Cloud infrastructure:</strong> Neon (database), Render (hosting), AWS (file storage)</li>
              <li><strong>Email services:</strong> For transactional emails and notifications</li>
              <li><strong>Analytics:</strong> To understand usage patterns (anonymised where possible)</li>
            </ul>
            <p>All third parties are required to protect your data and only use it for the purposes we specify.</p>
          </section>

          <section>
            <h2>6. Data Retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide services. After account closure:</p>
            <ul>
              <li>Account data is deleted within 90 days</li>
              <li>Billing records are retained for 7 years (legal requirement)</li>
              <li>Anonymised usage data may be retained indefinitely for analytics</li>
            </ul>
          </section>

          <section>
            <h2>7. Your Rights</h2>
            <p>Under GDPR, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Erasure:</strong> Request deletion of your data</li>
              <li><strong>Portability:</strong> Receive your data in a portable format</li>
              <li><strong>Object:</strong> Object to certain processing activities</li>
              <li><strong>Withdraw consent:</strong> Where processing is based on consent</li>
            </ul>
            <p>To exercise these rights, contact us at <a href="mailto:privacy@quantract.co.uk">privacy@quantract.co.uk</a>.</p>
          </section>

          <section>
            <h2>8. Data Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your data, including:</p>
            <ul>
              <li>Encryption in transit (TLS) and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section>
            <h2>9. Cookies</h2>
            <p>We use essential cookies for:</p>
            <ul>
              <li>Authentication and session management</li>
              <li>Security features</li>
              <li>User preferences</li>
            </ul>
            <p>We do not use advertising or tracking cookies without your consent.</p>
          </section>

          <section>
            <h2>10. International Transfers</h2>
            <p>Your data may be transferred to and processed in countries outside the UK/EEA. When this happens, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses.</p>
          </section>

          <section>
            <h2>11. Changes to This Policy</h2>
            <p>We may update this policy from time to time. Significant changes will be communicated via email or in-app notification.</p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
            <p>For privacy-related questions or concerns:</p>
            <p>
              <a href="mailto:privacy@quantract.co.uk" className="contact-link">
                <Mail size={16} />
                privacy@quantract.co.uk
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
