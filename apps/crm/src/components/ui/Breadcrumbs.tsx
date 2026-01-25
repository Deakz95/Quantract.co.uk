"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    if (!pathname) return [];

    const paths = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // Always start with home/dashboard
    if (paths[0] === "admin") {
      items.push({ label: "Dashboard", href: "/admin" });
    } else if (paths[0] === "client") {
      items.push({ label: "Dashboard", href: "/client" });
    } else if (paths[0] === "engineer") {
      items.push({ label: "Dashboard", href: "/engineer" });
    }

    // Build breadcrumb path
    let currentPath = "";
    for (let i = 0; i < paths.length; i++) {
      currentPath += `/${paths[i]}`;

      // Skip the first segment (admin/client/engineer) as we already added it
      if (i === 0) continue;

      // Create label from path segment
      let label = paths[i];

      // Handle special cases
      if (label === "quotes") label = "Quotes";
      else if (label === "jobs") label = "Jobs";
      else if (label === "invoices") label = "Invoices";
      else if (label === "clients") label = "Clients";
      else if (label === "engineers") label = "Engineers";
      else if (label === "certificates") label = "Certificates";
      else if (label === "timesheets") label = "Timesheets";
      else if (label === "invites") label = "Invites";
      else if (label === "settings") label = "Settings";
      else if (label === "enquiries") label = "Enquiries";
      else if (label === "schedule") label = "Schedule";
      else if (label === "planner") label = "Planner";
      else if (label.startsWith("Q-")) label = label; // Quote ID
      else if (label.length > 20) {
        // Likely a UUID - show abbreviated
        label = `${label.substring(0, 8)}...`;
      } else {
        // Capitalize first letter
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }

      items.push({ label, href: currentPath });
    }

    return items;
  }, [pathname]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={item.href} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />}
              {isLast ? (
                <span className="font-semibold text-[var(--foreground)]">{item.label}</span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-[var(--foreground)] hover:underline transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
