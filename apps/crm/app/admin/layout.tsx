"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * Admin pages use <AppShell/> inside each page for the "nice" portal layout.
 * This layout intentionally stays minimal to avoid double side-nav.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") return children;
  return <>{children}</>;
}
