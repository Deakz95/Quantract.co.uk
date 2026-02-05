import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistrar } from "./ServiceWorkerRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quantract Tools",
  description:
    "Free electrical contractor tools — cable calculator, point counter, RAMS builder",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quantract Tools",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
