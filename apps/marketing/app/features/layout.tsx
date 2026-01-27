import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features - Quantract | Job Management for Electrical Contractors",
  description: "Professional quotes, job tracking, digital certificates, invoicing, and customer portal. Everything UK electrical contractors need in one platform.",
  openGraph: {
    title: "Features - Quantract",
    description: "Professional quotes, job tracking, digital certificates, invoicing, and customer portal for UK electrical contractors.",
  },
};

export default function FeaturesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
