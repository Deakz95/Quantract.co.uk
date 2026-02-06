"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AdminPwaInstallPrompt } from "@/components/admin/PwaInstallPrompt";
import { StorageWarningBanner } from "@/components/admin/StorageWarningBanner";

/**
 * Admin pages use <AppShell/> inside each page for the "nice" portal layout.
 * This layout intentionally stays minimal to avoid double side-nav.
 */
export function AdminLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Register service worker for offline shell caching (production only)
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/admin" })
      .catch(() => {
        // SW registration failed — graceful no-op
      });
  }, []);

  if (pathname === "/admin/login") return children;
  return (
    <>
      <StorageWarningBanner />
      <AdminPwaInstallPrompt />
      {children}
    </>
  );
}
