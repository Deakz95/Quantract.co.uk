"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  /** Custom breadcrumb items. If provided, auto-generation from pathname is skipped. */
  items?: BreadcrumbItem[];
}

/**
 * Breadcrumbs component for navigation.
 * Can be used in two ways:
 * 1. Without props: Auto-generates breadcrumbs from the current URL path
 * 2. With items prop: Uses custom breadcrumb items for more control over labels
 */
export function Breadcrumbs({ items }: BreadcrumbsProps = {}) {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // If custom items are provided, use them directly
    if (items && items.length > 0) {
      return items;
    }

    // Auto-generate from pathname
    if (!pathname) return [];

    const paths = pathname.split("/").filter(Boolean);
    const autoItems: BreadcrumbItem[] = [];

    // Always start with home/dashboard
    if (paths[0] === "admin") {
      autoItems.push({ label: "Dashboard", href: "/admin" });
    } else if (paths[0] === "client") {
      autoItems.push({ label: "Dashboard", href: "/client" });
    } else if (paths[0] === "engineer") {
      autoItems.push({ label: "Dashboard", href: "/engineer" });
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
      else if (label === "variations") label = "Variations";
      else if (label === "appearance") label = "Appearance";
      else if (label === "account") label = "Account";
      else if (label === "pdf") label = "PDF Settings";
      else if (label === "terms") label = "Terms";
      else if (label === "security") label = "Security";
      else if (label === "subdomain") label = "Subdomain";
      else if (label === "legal-entities") label = "Legal Entities";
      else if (label === "service-lines") label = "Service Lines";
      else if (label === "entitlements") label = "Entitlements";
      else if (label === "notifications") label = "Notifications";
      else if (label === "lead-capture") label = "Lead Capture";
      else if (label.startsWith("Q-")) label = label; // Quote ID
      else if (label.length > 20) {
        // Likely a UUID - show abbreviated
        label = `${label.substring(0, 8)}...`;
      } else {
        // Capitalize first letter
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }

      autoItems.push({ label, href: currentPath });
    }

    return autoItems;
  }, [pathname, items]);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb navigation" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--muted-foreground)]" role="list">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const hasLink = item.href && !isLast;

          return (
            <li key={item.href || item.label} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 flex-shrink-0 text-[var(--muted-foreground)]"
                  aria-hidden="true"
                />
              )}
              {hasLink ? (
                <Link
                  href={item.href!}
                  className="hover:text-[var(--foreground)] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded-sm"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? "font-medium text-[var(--foreground)]" : ""}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
