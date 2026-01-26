import type { Metadata } from "next";
import type { Viewport } from "next/dist/lib/metadata/types/metadata-interface";
import type { ReactNode } from "react";
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { AdminContextBanner } from '@/components/admin/AdminContextBanner';
import "./globals.css";
import "@/lib/env";
import { Toaster } from "@/components/ui/Toaster";
import QuantractAIWidget from "@/components/ai/QuantractAIWidget";
import { NeonAuthUIProvider } from "@neondatabase/auth/react";
import { authClient } from "@/lib/auth/client";
import { ThemeInitializer } from "@/components/ThemeInitializer";
export const metadata: Metadata = {
  title: "Quantract",
  description: "Quotes, agreements, invoices & job management",
  manifest: "/manifest-client.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeInitializer />
        <ImpersonationBanner />
        <AdminContextBanner />
        <NeonAuthUIProvider authClient={authClient}>{children}</NeonAuthUIProvider>
        <QuantractAIWidget />
        <Toaster />
      </body>
    </html>
  );
}
