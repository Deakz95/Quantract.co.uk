"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@quantract/ui";

const tools = [
  {
    name: "Point Counter",
    description: "Upload electrical drawings, click to count points, and export totals for estimating.",
    href: "/point-counter",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: "Cable Calculator",
    description: "Calculate cable sizes and voltage drop per BS 7671 for single-phase and three-phase circuits.",
    href: "/cable-calculator",
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default function ToolsPage() {
  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black mb-4">Quantract Tools</h1>
          <p className="text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
            Free utilities for electrical contractors. Calculate cable sizes, count points from drawings, and more.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {tools.map((tool) => (
            <Link key={tool.name} href={tool.href}>
              <Card variant="interactive" className="h-full">
                <CardHeader>
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center text-white mb-4">
                    {tool.icon}
                  </div>
                  <CardTitle className="text-xl">{tool.name}</CardTitle>
                  <CardDescription className="text-base">{tool.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

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
