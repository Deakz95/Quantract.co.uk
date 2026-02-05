"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { PwaInstallPrompt } from "@/components/client/PwaInstallPrompt";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/client/login";
  if (isLogin) return children;

  return (
    <Shell
      role="client"
      title="Client Portal"
      subtitle="View quotes, sign agreements, download invoices and documents."
    >
      <PwaInstallPrompt />
      {children}
    </Shell>
  );
}
