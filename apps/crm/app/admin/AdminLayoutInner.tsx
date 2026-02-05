"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PwaInstallPrompt } from "@/components/client/PwaInstallPrompt";
import { StorageWarningBanner } from "@/components/admin/StorageWarningBanner";

/**
 * Admin pages use <AppShell/> inside each page for the "nice" portal layout.
 * This layout intentionally stays minimal to avoid double side-nav.
 */
export function AdminLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return children;
  return (
    <>
      <StorageWarningBanner />
      <PwaInstallPrompt />
      {children}
    </>
  );
}
