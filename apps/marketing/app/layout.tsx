import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quantract - Electrical & Building Services Software",
  description: "Professional software for electrical contractors and building services companies.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
