import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quantract Tools",
  description: "Utilities and tools for electrical contractors.",
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
