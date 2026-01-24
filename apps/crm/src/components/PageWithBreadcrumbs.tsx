"use client";

import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { ReactNode } from "react";

/**
 * Wrapper component that adds breadcrumbs to any page
 * Useful for server components that need breadcrumb navigation
 */
export function PageWithBreadcrumbs({ children }: { children: ReactNode }) {
  return (
    <div>
      <Breadcrumbs />
      {children}
    </div>
  );
}
