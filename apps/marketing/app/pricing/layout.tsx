import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Quantract | From £19/month",
  description: "Simple, honest pricing for electrical contractors. Start at £19/month with Core, or get everything with Pro at £79/month. 14-day free trial, no credit card required.",
  openGraph: {
    title: "Pricing - Quantract",
    description: "Simple, honest pricing. Start at £19/month. 14-day free trial, no credit card required.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
