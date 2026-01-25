"use client";

import Link from "next/link";

const tools = [
  {
    name: "Point Counter",
    description: "Upload electrical drawings, click to count points, and export totals for estimating.",
    href: "/point-counter",
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    name: "Cable Calculator",
    description: "Calculate cable sizes and voltage drop per BS 7671 for single-phase and three-phase circuits.",
    href: "/cable-calculator",
    icon: (
      <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export default function ToolsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        padding: "48px 20px",
      }}
    >
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <svg style={{ width: 28, height: 28, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            Quantract Tools
          </h1>
          <p style={{ fontSize: "14px", color: "var(--muted-foreground)", margin: 0, maxWidth: "400px", marginLeft: "auto", marginRight: "auto" }}>
            Free utilities for electrical contractors. Calculate cable sizes, count points from drawings, and more.
          </p>
        </div>

        {/* Tools Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
          {tools.map((tool) => (
            <Link key={tool.name} href={tool.href} style={{ textDecoration: "none", color: "inherit" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "16px 20px",
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {tool.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 2px" }}>{tool.name}</h2>
                  <p style={{ fontSize: "13px", color: "var(--muted-foreground)", margin: 0, lineHeight: 1.4 }}>
                    {tool.description}
                  </p>
                </div>
                <svg
                  style={{ width: 18, height: 18, color: "var(--muted-foreground)", flexShrink: 0 }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Back to CRM link */}
        <div style={{ textAlign: "center" }}>
          <a
            href="https://app.quantract.co.uk"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              color: "var(--muted-foreground)",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Quantract CRM
          </a>
        </div>
      </div>
    </main>
  );
}
