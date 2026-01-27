import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
            <Badge variant="secondary" className="mt-4">
              Placeholder - Requires Legal Review
            </Badge>
          </div>

          {/* Content Sections */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>1. Information We Collect</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="text-[var(--foreground)] list-disc list-inside space-y-2 mt-4">
                  <li>Account information (name, email address, company details)</li>
                  <li>Business data you enter into the platform (quotes, invoices, client records)</li>
                  <li>Payment and billing information</li>
                  <li>Communications with us (support requests, feedback)</li>
                  <li>Usage data and analytics</li>
                </ul>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Please consult with a legal professional to ensure
                  compliance with applicable data protection regulations including GDPR and UK Data Protection Act.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>2. How We Use Your Information</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  We use the information we collect to:
                </p>
                <ul className="text-[var(--foreground)] list-disc list-inside space-y-2 mt-4">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices, updates, and support messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Analyze usage patterns to improve user experience</li>
                  <li>Protect against fraudulent or illegal activity</li>
                </ul>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content that should be reviewed and customized by legal counsel.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>3. Data Security</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  We take the security of your data seriously and implement appropriate technical
                  and organizational measures to protect your personal information, including:
                </p>
                <ul className="text-[var(--foreground)] list-disc list-inside space-y-2 mt-4">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and audits</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Employee training on data protection</li>
                  <li>Incident response procedures</li>
                </ul>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Specific security measures should be documented
                  accurately based on actual implementations.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>4. Your Rights</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  Depending on your location, you may have certain rights regarding your personal data:
                </p>
                <ul className="text-[var(--foreground)] list-disc list-inside space-y-2 mt-4">
                  <li>Right to access your personal data</li>
                  <li>Right to rectification of inaccurate data</li>
                  <li>Right to erasure (right to be forgotten)</li>
                  <li>Right to restrict processing</li>
                  <li>Right to data portability</li>
                  <li>Right to object to processing</li>
                  <li>Rights related to automated decision-making</li>
                </ul>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Rights vary by jurisdiction and should be
                  accurately described based on applicable laws.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>5. Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-[var(--muted-foreground)]">
                  [PLACEHOLDER - This section requires legal review]
                </p>
                <p className="text-[var(--foreground)]">
                  If you have any questions about this Privacy Policy or our data practices,
                  please contact us:
                </p>
                <div className="mt-4 p-4 bg-[var(--muted)] rounded-xl">
                  <p className="text-[var(--foreground)]">
                    <strong>Email:</strong> privacy@quantract.co.uk
                  </p>
                  <p className="text-[var(--foreground)] mt-2">
                    <strong>Address:</strong> [Company Address Placeholder]
                  </p>
                </div>
                <p className="text-[var(--muted-foreground)] mt-4 text-sm italic">
                  This is placeholder content. Update with actual contact details and
                  Data Protection Officer information if applicable.
                </p>
              </CardContent>
            </Card>
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
