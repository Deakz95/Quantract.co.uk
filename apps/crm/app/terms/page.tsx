import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
            <Badge variant="secondary" className="mt-4">
              Placeholder - Requires Legal Review
            </Badge>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Acceptance of Terms</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  By accessing or using Quantract (&quot;the Service&quot;), you agree to be bound by these
                  Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not
                  access or use the Service.
                </p>
                <p className="text-[var(--foreground)] mt-4">
                  We reserve the right to update these Terms at any time. We will notify you of
                  any material changes by posting the new Terms on this page and updating the
                  &quot;Last updated&quot; date.
                </p>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Please consult with a legal professional to ensure
                  these terms are appropriate for your business and jurisdiction.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. Use of Service</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  You agree to use the Service only for lawful purposes and in accordance with
                  these Terms. You agree not to:
                </p>
                <ul className="text-[var(--foreground)] list-disc list-inside space-y-2 mt-4">
                  <li>Use the Service in any way that violates applicable laws or regulations</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Use the Service to transmit harmful code or malware</li>
                  <li>Resell or redistribute the Service without authorization</li>
                  <li>Use the Service to send spam or unsolicited communications</li>
                </ul>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content that should be reviewed and customized by legal counsel.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. User Accounts</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  When you create an account with us, you must provide accurate and complete
                  information. You are responsible for:
                </p>
                <ul className="text-[var(--foreground)] list-disc list-inside space-y-2 mt-4">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Notifying us immediately of any unauthorized access</li>
                  <li>Ensuring your contact information remains current</li>
                </ul>
                <p className="text-[var(--foreground)] mt-4">
                  We reserve the right to suspend or terminate accounts that violate these Terms
                  or for any other reason at our discretion.
                </p>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Account terms should be tailored to your specific
                  service offerings and business requirements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Intellectual Property</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  The Service and its original content, features, and functionality are owned by
                  Quantract and are protected by international copyright, trademark, and other
                  intellectual property laws.
                </p>
                <p className="text-[var(--foreground)] mt-4">
                  You retain ownership of all data and content you upload to the Service. By
                  uploading content, you grant us a limited license to store, process, and
                  display that content as necessary to provide the Service.
                </p>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Intellectual property terms require careful legal
                  consideration and should be drafted by qualified legal counsel.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Limitation of Liability</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  To the maximum extent permitted by law, Quantract shall not be liable for any
                  indirect, incidental, special, consequential, or punitive damages, including
                  but not limited to:
                </p>
                <ul className="text-[var(--foreground)] list-disc list-inside space-y-2 mt-4">
                  <li>Loss of profits, revenue, or data</li>
                  <li>Business interruption</li>
                  <li>Cost of substitute services</li>
                  <li>Any damages arising from your use of the Service</li>
                </ul>
                <p className="text-[var(--foreground)] mt-4">
                  Our total liability for any claims arising from these Terms or your use of
                  the Service shall not exceed the amount you paid us in the twelve (12) months
                  preceding the claim.
                </p>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Limitation of liability clauses are complex legal
                  provisions that must be drafted by qualified legal counsel and vary by jurisdiction.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>6. Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <div className="mt-4 p-4 bg-[var(--muted)] rounded-xl">
                  <p className="text-[var(--foreground)]">
                    <strong>Email:</strong> legal@quantract.co.uk
                  </p>
                  <p className="text-[var(--foreground)] mt-2">
                    <strong>Address:</strong> [Company Address Placeholder]
                  </p>
                </div>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Update with actual contact details and
                  registered business information.
                </p>
              </CardContent>
            </Card>
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
