import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Quantract",
  description: "Terms of Service for Quantract CRM - Read our terms and conditions for using our platform.",
};

export default function TermsOfServicePage() {
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
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--foreground)]">
              Terms of Service
            </h1>
            <p className="mt-4 text-[var(--muted-foreground)]">
              Last updated: January 27, 2026
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">1. Acceptance of Terms</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                By accessing or using Quantract (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;).
                If you do not agree to these Terms, you may not access or use the Service. These Terms apply to all users,
                including visitors, registered users, and paid subscribers.
              </p>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                We reserve the right to update these Terms at any time. We will notify you of any material changes by posting
                the new Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service after
                such changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">2. Description of Service</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Quantract is a customer relationship management (CRM) and business management platform designed specifically
                for electrical contractors and trade businesses in the United Kingdom. The Service includes:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li>Client and contact management</li>
                <li>Quote and estimate creation</li>
                <li>Job tracking and management</li>
                <li>Invoice generation and payment tracking</li>
                <li>Electrical certification (EIC, EICR, MWC)</li>
                <li>Reporting and analytics</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">3. User Accounts</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                When you create an account with us, you must provide accurate, complete, and current information.
                You are responsible for:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized access or security breach</li>
                <li>Ensuring your contact information remains current and accurate</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                You must be at least 18 years old to use this Service. We reserve the right to suspend or terminate
                accounts that violate these Terms or for any other reason at our reasonable discretion.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">4. Payment Terms</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                Quantract offers subscription-based pricing with the following terms:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Free Trial:</strong> New accounts receive a 14-day free trial with full access to all features</li>
                <li><strong>Subscription Fees:</strong> Fees are charged monthly or annually in advance, depending on your chosen plan</li>
                <li><strong>Auto-Renewal:</strong> Subscriptions automatically renew unless cancelled before the renewal date</li>
                <li><strong>Payment Methods:</strong> We accept major credit/debit cards via Stripe</li>
                <li><strong>Refunds:</strong> Monthly subscriptions are non-refundable. Annual subscriptions may be refunded within 14 days of purchase if you have not substantially used the Service</li>
                <li><strong>Price Changes:</strong> We may change prices with 30 days notice. Price changes take effect at your next billing cycle</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">5. Data Ownership</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                You retain full ownership of all data and content you upload to the Service, including client records,
                quotes, invoices, and certificates. We claim no intellectual property rights over your data.
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li><strong>Your Rights:</strong> You may export your data at any time using our export functionality</li>
                <li><strong>Our License:</strong> You grant us a limited license to store, process, and display your data solely to provide the Service</li>
                <li><strong>Data Retention:</strong> After account cancellation, we retain your data for 30 days to allow for reactivation, then permanently delete it unless legally required to retain</li>
                <li><strong>Data Portability:</strong> You can request a full export of your data in standard formats (CSV, PDF)</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">6. Acceptable Use</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li>Use the Service for any illegal activity or to violate applicable laws or regulations</li>
                <li>Attempt to gain unauthorized access to any part of the Service or other users&apos; accounts</li>
                <li>Interfere with or disrupt the Service, servers, or networks</li>
                <li>Upload or transmit viruses, malware, or other harmful code</li>
                <li>Use the Service to send spam or unsolicited communications</li>
                <li>Resell, redistribute, or sublicense the Service without authorization</li>
                <li>Scrape, harvest, or collect data from the Service using automated means</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">7. Service Availability</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                We strive to maintain 99.9% uptime for the Service. However, we do not guarantee uninterrupted or
                error-free operation. The Service may be temporarily unavailable due to:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li>Scheduled maintenance (we will provide advance notice when possible)</li>
                <li>Emergency maintenance or security updates</li>
                <li>Factors beyond our reasonable control (force majeure)</li>
              </ul>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">8. Limitation of Liability</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                To the maximum extent permitted by UK law, Quantract shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, including but not limited to:
              </p>
              <ul className="text-[var(--muted-foreground)] list-disc list-inside space-y-2 mt-4">
                <li>Loss of profits, revenue, or business opportunities</li>
                <li>Loss of data or corruption of data</li>
                <li>Business interruption</li>
                <li>Cost of substitute services</li>
              </ul>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                Our total liability for any claims arising from these Terms or your use of the Service shall not exceed
                the total amount you paid us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">9. Termination</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                <strong>By You:</strong> You may cancel your subscription at any time through your account settings.
                Cancellation takes effect at the end of your current billing period.
              </p>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                <strong>By Us:</strong> We may suspend or terminate your account immediately if you violate these Terms,
                engage in fraudulent activity, or fail to pay subscription fees. We will provide reasonable notice when possible.
              </p>
              <p className="text-[var(--muted-foreground)] leading-relaxed mt-4">
                Upon termination, your right to use the Service ceases immediately. We will retain your data for 30 days,
                during which you may request an export.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">10. Governing Law</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of England and Wales.
                Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive
                jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section className="bg-[var(--card)] rounded-2xl p-6 sm:p-8 border border-[var(--border)]">
              <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">11. Contact Information</h2>
              <p className="text-[var(--muted-foreground)] leading-relaxed">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="mt-4 p-4 bg-[var(--muted)] rounded-xl">
                <p className="text-[var(--foreground)]">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:legal@quantract.co.uk" className="text-[var(--primary)] hover:underline">
                    legal@quantract.co.uk
                  </a>
                </p>
                <p className="text-[var(--foreground)] mt-2">
                  <strong>Support:</strong>{" "}
                  <a href="mailto:support@quantract.co.uk" className="text-[var(--primary)] hover:underline">
                    support@quantract.co.uk
                  </a>
                </p>
              </div>
            </section>
          </div>

          {/* Footer Navigation */}
          <div className="mt-12 pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link href="/privacy" className="text-[var(--primary)] hover:underline">
              View Privacy Policy
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
