import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us - Quantract | Built for UK Electrical Contractors",
  description: "Learn about Quantract - job management software built specifically for UK electrical contractors. UK-based team, BS 7671 compliant, GDPR certified.",
  openGraph: {
    title: "About Quantract",
    description: "Job management software built specifically for UK electrical contractors.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
