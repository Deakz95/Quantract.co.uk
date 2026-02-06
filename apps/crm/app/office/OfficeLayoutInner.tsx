"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { StorageWarningBanner } from "@/components/admin/StorageWarningBanner";

export function OfficeLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/office/login";

  // Register service worker for PWA support (production only, not on login page)
  useEffect(() => {
    if (
      isLogin ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failed — non-critical, ignore silently
    });
  }, [isLogin]);

  // Login page renders standalone — no shell
  if (isLogin) return children;

  return (
    <>
      <StorageWarningBanner />
      {children}
    </>
  );
}
