"use client";

import Link from "next/link";
import { CERTIFICATE_TYPES, CERTIFICATE_INFO } from "../lib/certificate-types";

const certIcons: Record<string, React.ReactNode> = {
  EIC: (
    <svg style={{ width: 28, height: 28 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  EICR: (
    <svg style={{ width: 28, height: 28 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  MWC: (
    <svg style={{ width: 28, height: 28 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  FIRE: (
    <svg style={{ width: 28, height: 28 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
    </svg>
  ),
  EML: (
    <svg style={{ width: 28, height: 28 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

export default function CertificatesPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#0A0F1C", color: "#F8FAFC" }}>
      {/* Background grid */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div style={{ position: "relative", zIndex: 1, padding: "48px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              boxShadow: "0 0 40px rgba(59, 130, 246, 0.3)",
            }}
          >
            <svg style={{ width: 36, height: 36, color: "#fff" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "12px" }}>Quantract Certificates</h1>
          <p style={{ color: "#94A3B8", fontSize: "18px", maxWidth: "600px", margin: "0 auto" }}>
            Professional electrical certification with visual board layouts. BS 7671 compliant.
          </p>
        </div>

        {/* Electrical Certificates Section */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#F59E0B",
              marginBottom: "16px",
            }}
          >
            Electrical Installation
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {(["EIC", "EICR", "MWC"] as const).map((type) => (
              <Link key={type} href={`/${type.toLowerCase()}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: "#111827",
                    border: "1px solid #2D3B52",
                    borderRadius: "16px",
                    padding: "24px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#3B82F6";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2D3B52";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      marginBottom: "16px",
                    }}
                  >
                    {certIcons[type]}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#3B82F6", marginBottom: "4px" }}>{type}</div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC", marginBottom: "8px" }}>
                    {CERTIFICATE_INFO[type].name}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.5 }}>
                    {CERTIFICATE_INFO[type].description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Fire & Safety Section */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#EF4444",
              marginBottom: "16px",
            }}
          >
            Fire & Safety Systems
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {(["FIRE", "EML"] as const).map((type) => (
              <Link key={type} href={`/${type.toLowerCase()}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: "#111827",
                    border: "1px solid #2D3B52",
                    borderRadius: "16px",
                    padding: "24px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#EF4444";
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#2D3B52";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "12px",
                      background: "linear-gradient(135deg, #EF4444, #B91C1C)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      marginBottom: "16px",
                    }}
                  >
                    {certIcons[type]}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#EF4444", marginBottom: "4px" }}>{type}</div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC", marginBottom: "8px" }}>
                    {CERTIFICATE_INFO[type].name}
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.5 }}>
                    {CERTIFICATE_INFO[type].description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div
          style={{
            background: "#111827",
            border: "1px solid #2D3B52",
            borderRadius: "16px",
            padding: "32px",
            marginBottom: "48px",
          }}
        >
          <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>Why Quantract Certificates?</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "24px" }}>
            {[
              {
                title: "Visual Board Layouts",
                description: "Interactive visual representations of distribution boards with circuit status",
                icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                ),
              },
              {
                title: "BS 7671 Compliant",
                description: "All certificates follow the latest wiring regulations and British Standards",
                icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
              {
                title: "PDF Export",
                description: "Generate professional PDF certificates ready for clients and records",
                icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                title: "Works Offline",
                description: "Certificates work entirely in your browser - no account required",
                icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                ),
              },
            ].map((feature) => (
              <div key={feature.title}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#1A2235",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#3B82F6",
                    marginBottom: "12px",
                  }}
                >
                  {feature.icon}
                </div>
                <h4 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", color: "#F8FAFC" }}>
                  {feature.title}
                </h4>
                <p style={{ fontSize: "13px", color: "#94A3B8", lineHeight: 1.5 }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: "24px", borderTop: "1px solid #2D3B52" }}>
          <a
            href="https://quantract.co.uk"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              color: "#94A3B8",
              textDecoration: "none",
              fontSize: "14px",
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
