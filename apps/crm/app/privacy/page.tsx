import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Quantract",
  description: "Privacy Policy for Quantract CRM - Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="font-bold text-lg text-[var(--foreground)]">Quantract</span>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] mb-6">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              Privacy Policy
            </h1>
            <p className="mt-4 text-[var(--muted-foreground)]">
              Last updated: January 27, 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">1. Information We Collect</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We collect information you provide directly to us when you use Quantract:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Account Information:</strong> Name, email address, company name, phone number, and password</li>
                <li><strong>Business Data:</strong> Client records, quotes, invoices, job details, and certificates you create</li>
                <li><strong>Usage Data:</strong> How you interact with the Service, features used, and pages visited</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we do not store full card numbers)</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers</li>
                <li><strong>Communication Data:</strong> Support requests, feedback, and correspondence with us</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">2. How We Use Your Information</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Provide the Service:</strong> Deliver, maintain, and improve Quantract&apos;s features and functionality</li>
                <li><strong>Customer Support:</strong> Respond to your questions, requests, and provide technical assistance</li>
                <li><strong>Communications:</strong> Send service updates, security alerts, and administrative messages</li>
                <li><strong>Analytics:</strong> Understand how users interact with Quantract to improve the experience</li>
                <li><strong>Marketing:</strong> Send promotional communications (you can opt-out at any time)</li>
                <li><strong>Security:</strong> Detect, prevent, and address fraud, abuse, and security issues</li>
                <li><strong>Legal Compliance:</strong> Comply with applicable laws, regulations, and legal requests</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                <strong>Marketing Opt-Out:</strong> You can unsubscribe from marketing emails at any time by clicking
                the unsubscribe link in any email or contacting us at privacy@quantract.co.uk.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">3. How We Share Information</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We do not sell your personal data. We only share information in the following circumstances:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Service Providers:</strong> With trusted third parties who assist in operating the Service (hosting, payment processing, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law, subpoena, or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                Our service providers include:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-2">
                <li>Neon (database hosting)</li>
                <li>Render (application hosting)</li>
                <li>Stripe (payment processing)</li>
                <li>Resend (email delivery)</li>
                <li>Google Analytics (usage analytics)</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">4. Data Security</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We implement industry-standard security measures to protect your data:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Encryption:</strong> All data is encrypted in transit (TLS/SSL) and at rest (AES-256)</li>
                <li><strong>Secure Infrastructure:</strong> Hosted on secure, SOC 2 compliant servers</li>
                <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms</li>
                <li><strong>Regular Backups:</strong> Automated daily backups with point-in-time recovery</li>
                <li><strong>Security Monitoring:</strong> Continuous monitoring for threats and vulnerabilities</li>
                <li><strong>Incident Response:</strong> Documented procedures for security incidents</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                While we take extensive precautions, no method of transmission over the Internet is 100% secure.
                We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">5. Your Rights (GDPR Compliance)</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Under the UK GDPR and Data Protection Act 2018, you have the following rights:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Right to Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
                <li><strong>Right to Restrict Processing:</strong> Request limitation of how we process your data</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or for marketing</li>
                <li><strong>Rights Related to Automated Decisions:</strong> Not be subject to decisions based solely on automated processing</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                To exercise these rights, contact us at{" "}
                <a href="mailto:privacy@quantract.co.uk" className="text-[var(--primary)] hover:underline">
                  privacy@quantract.co.uk
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">6. Cookies</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We use cookies and similar technologies to operate the Service:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Essential Cookies:</strong> Required for core functionality (authentication, security)</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how you use Quantract (via Google Analytics)</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                You can control cookies through your browser settings. Disabling essential cookies may affect functionality.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">7. Data Retention</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide the Service:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Active Accounts:</strong> Data retained while account is active</li>
                <li><strong>After Cancellation:</strong> Data retained for 30 days to allow reactivation, then deleted</li>
                <li><strong>Legal Requirements:</strong> Some data may be retained longer if required by law</li>
                <li><strong>Backups:</strong> Data may persist in backups for up to 90 days</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">8. International Transfers</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Our primary servers are located in the UK and EU. However, some service providers may process
                data in other countries:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li>We ensure appropriate safeguards are in place (Standard Contractual Clauses, adequacy decisions)</li>
                <li>US-based processors comply with UK GDPR requirements</li>
                <li>We only work with providers that meet our security and privacy standards</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">9. Children&apos;s Privacy</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Quantract is not intended for users under 16 years of age. We do not knowingly collect personal
                information from children. If we learn we have collected data from a child under 16, we will
                delete it promptly. If you believe a child has provided us with personal data, please contact us.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">10. Changes to This Policy</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li>Posting the new Privacy Policy on this page</li>
                <li>Updating the &quot;Last updated&quot; date</li>
                <li>Sending an email notification for significant changes</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                Your continued use of the Service after changes take effect constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">11. Contact Us</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-4 p-4 bg-[var(--muted)] rounded-xl">
                <p className="text-[var(--foreground)]">
                  <strong>Privacy Inquiries:</strong>{" "}
                  <a href="mailto:privacy@quantract.co.uk" className="text-[var(--primary)] hover:underline">
                    privacy@quantract.co.uk
                  </a>
                </p>
                <p className="text-[var(--foreground)] mt-2">
                  <strong>Data Protection Officer:</strong>{" "}
                  <a href="mailto:dpo@quantract.co.uk" className="text-[var(--primary)] hover:underline">
                    dpo@quantract.co.uk
                  </a>
                </p>
                <p className="text-[var(--foreground)] mt-2">
                  <strong>General Support:</strong>{" "}
                  <a href="mailto:support@quantract.co.uk" className="text-[var(--primary)] hover:underline">
                    support@quantract.co.uk
                  </a>
                </p>
              </div>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                You also have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO)
                if you believe your data protection rights have been violated:{" "}
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                  ico.org.uk
                </a>
              </p>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/terms" className="text-[var(--primary)] hover:underline">
              View Terms of Service
            </Link>
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              &copy; {new Date().getFullYear()} Quantract. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-[var(--muted-foreground)]">
              <Link href="/privacy" className="hover:text-[var(--foreground)]">Privacy</Link>
              <Link href="/terms" className="hover:text-[var(--foreground)]">Terms</Link>
              <a href="mailto:hello@quantract.co.uk" className="hover:text-[var(--foreground)]">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
