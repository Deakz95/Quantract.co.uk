import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us - Quantract | Get in Touch",
  description: "Questions about Quantract? Want a demo? Contact our UK-based team. We reply within 24 hours. Email, phone, or WhatsApp available.",
  openGraph: {
    title: "Contact Quantract",
    description: "Questions about Quantract? Contact our UK-based team. We reply within 24 hours.",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
