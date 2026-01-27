import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Quantract",
  description: "Terms and conditions for using Quantract software and services.",
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
