import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quantract Certificates",
  description: "Electrical installation certificates and compliance documentation.",
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
