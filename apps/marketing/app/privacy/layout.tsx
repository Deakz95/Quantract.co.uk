import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Quantract",
  description: "How Quantract collects, uses, and protects your personal data. GDPR compliant.",
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
