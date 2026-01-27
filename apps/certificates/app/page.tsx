"use client";

import Link from "next/link";
import { CERTIFICATE_INFO } from "../lib/certificate-types";

const certIcons: Record<string, React.ReactNode> = {
  EIC: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  EICR: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  MWC: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  FIRE: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  EML: (
    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

export default function CertificatesPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-[1] py-12 px-6 max-w-[1200px] mx-auto">
        {/* CRM Upsell Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] p-[1px]">
          <div className="rounded-2xl bg-[var(--card)] p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Manage Your Electrical Business
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Store certificates, track jobs, send invoices, and manage clients - all in one place.
                  </p>
                </div>
              </div>
              <a
                href="https://www.quantract.co.uk/auth/signup"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Try Quantract CRM Free
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(59,130,246,0.3)]">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold mb-3">Quantract Certificates</h1>
          <p className="text-[var(--muted-foreground)] text-lg max-w-[600px] mx-auto">
            Professional electrical certification with visual board layouts. BS 7671 compliant.
          </p>
        </div>

        {/* Electrical Certificates Section */}
        <div className="mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--warning)] mb-4">
            Electrical Installation
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(["EIC", "EICR", "MWC"] as const).map((type) => (
              <Link key={type} href={`/${type.toLowerCase()}`} className="no-underline">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:border-[var(--primary)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
                  <div className="w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white mb-4">
                    {certIcons[type]}
                  </div>
                  <div className="text-xs font-semibold text-[var(--primary)] mb-1">{type}</div>
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-2">
                    {CERTIFICATE_INFO[type].name}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {CERTIFICATE_INFO[type].description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Fire & Safety Section */}
        <div className="mb-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--error)] mb-4">
            Fire & Safety Systems
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(["FIRE", "EML"] as const).map((type) => (
              <Link key={type} href={`/${type.toLowerCase()}`} className="no-underline">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:border-[var(--error)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
                  <div className="w-[52px] h-[52px] rounded-xl bg-gradient-to-br from-[var(--error)] to-[#B91C1C] flex items-center justify-center text-white mb-4">
                    {certIcons[type]}
                  </div>
                  <div className="text-xs font-semibold text-[var(--error)] mb-1">{type}</div>
                  <h3 className="text-base font-bold text-[var(--foreground)] mb-2">
                    {CERTIFICATE_INFO[type].name}
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                    {CERTIFICATE_INFO[type].description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 mb-12">
          <h3 className="text-lg font-bold mb-6">Why Quantract Certificates?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Visual Board Layouts",
                description: "Interactive visual representations of distribution boards with circuit status",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                ),
              },
              {
                title: "BS 7671 Compliant",
                description: "All certificates follow the latest wiring regulations and British Standards",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: "PDF Export",
                description: "Generate professional PDF certificates ready for clients and records",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                title: "Works Offline",
                description: "Certificates work entirely in your browser - no account required",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ),
              },
            ].map((feature) => (
              <div key={feature.title}>
                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center text-[var(--primary)] mb-3">
                  {feature.icon}
                </div>
                <h4 className="text-sm font-semibold mb-1 text-[var(--foreground)]">
                  {feature.title}
                </h4>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CRM Benefits Section */}
        <div className="mb-12 rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
          <div className="p-8 text-center border-b border-[var(--border)] bg-gradient-to-br from-[var(--primary)]/5 to-transparent">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
              Ready to streamline your electrical business?
            </h3>
            <p className="text-[var(--muted-foreground)] max-w-lg mx-auto">
              Quantract CRM helps electrical contractors manage jobs, store certificates, send invoices, and track payments - all linked together.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)]">
            {[
              {
                title: "Link to Jobs",
                description: "Certificates auto-attach to jobs for complete audit trails",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
              },
              {
                title: "Cloud Storage",
                description: "All certificates stored securely and accessible anywhere",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
              },
              {
                title: "Client Portal",
                description: "Clients can view and download their certificates online",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div key={item.title} className="p-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center text-[var(--primary)] mx-auto mb-3">
                  {item.icon}
                </div>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mb-1">{item.title}</h4>
                <p className="text-xs text-[var(--muted-foreground)]">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="p-6 bg-[var(--muted)]/30 text-center">
            <a
              href="https://www.quantract.co.uk/auth/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Start Free Trial - No Card Required
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-[var(--border)]">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
            <a
              href="https://www.quantract.co.uk/admin/dashboard"
              className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to CRM Dashboard
            </a>
            <span className="hidden sm:inline text-[var(--border)]">|</span>
            <a
              href="https://www.quantract.co.uk/auth/signup"
              className="inline-flex items-center gap-2 text-[var(--primary)] hover:text-[var(--primary-dark)] font-medium transition-colors"
            >
              Create Free Account
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </a>
          </div>
          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            Quantract Certificates is a free tool for electrical contractors. Upgrade to Quantract CRM for job management, invoicing, and more.
          </p>
        </div>
      </div>
    </main>
  );
}
