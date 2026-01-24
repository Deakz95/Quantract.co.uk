"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Shell } from "@/components/shell/Shell";

export default function Layout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/engineer/login";
  if (isLogin) return children;

  return (
    <Shell
      role="engineer"
      title="Engineer"
      subtitle="Only jobs assigned to you."
    >
      {children}
    </Shell>
  );
}
