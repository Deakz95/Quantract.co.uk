"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@quantract/ui";
import { CERTIFICATE_TYPES, CERTIFICATE_INFO } from "../lib/certificate-types";

const certIcons: Record<string, React.ReactNode> = {
  EIC: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  EICR: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  MWC: (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
};

export default function CertificatesPage() {
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4">BS 7671 Certificates</h1>
          <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
            Generate compliant electrical installation certificates. Fill in the form, download as PDF.
          </p>
        </div>

        {/* Certificate Type Selection */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {CERTIFICATE_TYPES.map((type) => (
            <Link key={type} href={`/${type.toLowerCase()}`}>
              <Card variant="interactive" className="h-full">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white mb-4">
                    {certIcons[type]}
                  </div>
                  <div className="text-xs font-semibold text-[var(--primary)] mb-1">{type}</div>
                  <CardTitle className="text-lg">{CERTIFICATE_INFO[type].name}</CardTitle>
                  <CardDescription>{CERTIFICATE_INFO[type].description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-base">About These Certificates</CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <div className="grid md:grid-cols-2 gap-6 text-sm text-[var(--muted-foreground)]">
              <div>
                <h4 className="font-semibold text-[var(--foreground)] mb-2">What&apos;s included</h4>
                <ul className="space-y-1">
                  <li>• BS 7671:2018+A2:2022 compliant forms</li>
                  <li>• All required sections and fields</li>
                  <li>• Professional PDF output</li>
                  <li>• Works entirely in your browser</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[var(--foreground)] mb-2">Important notes</h4>
                <ul className="space-y-1">
                  <li>• Certificates are not stored online</li>
                  <li>• Download your PDF before leaving</li>
                  <li>• For official use, ensure proper signatures</li>
                  <li>• Consult BS 7671 for requirements</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* Back to CRM link */}
        <div className="text-center">
          <a
            href="https://app.quantract.co.uk"
            className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Quantract CRM
          </a>
        </div>
      </div>
    </main>
  );
}
