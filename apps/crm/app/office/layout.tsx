"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Head from "next/head";
import { StorageWarningBanner } from "@/components/admin/StorageWarningBanner";

export default function OfficeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/office/login";

  // Login page renders standalone — no shell
  if (isLogin) return children;

  return (
    <>
      <head>
        <link rel="manifest" href="/manifest-office.webmanifest" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <StorageWarningBanner />
      {children}
    </>
  );
}
