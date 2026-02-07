"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/cn";
import {
  Palette,
  FileText,
  LayoutTemplate,
  Settings,
  Briefcase,
  Receipt,
  PoundSterling,
  Mail,
  Inbox,
  BarChart3,
  User,
  Shield,
  Database,
  ChevronDown,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Settings;
};

type NavSection = {
  heading: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    heading: "Branding",
    items: [
      { label: "Appearance", href: "/admin/settings/appearance", icon: Palette },
      { label: "PDF Settings", href: "/admin/settings/pdf", icon: FileText },
      { label: "PDF Templates", href: "/admin/settings/pdf-templates", icon: LayoutTemplate },
      { label: "Custom Domain", href: "/admin/settings/subdomain", icon: Settings },
    ],
  },
  {
    heading: "Business",
    items: [
      { label: "Legal Entities", href: "/admin/settings/legal-entities", icon: Briefcase },
      { label: "Service Lines", href: "/admin/settings/service-lines", icon: Receipt },
      { label: "Financials", href: "/admin/settings/financials", icon: PoundSterling },
      { label: "Terms & Payments", href: "/admin/settings/terms", icon: FileText },
    ],
  },
  {
    heading: "System",
    items: [
      { label: "Notifications", href: "/admin/settings/notifications", icon: Mail },
      { label: "Lead Capture", href: "/admin/settings/lead-capture", icon: Inbox },
      { label: "Billing", href: "/admin/settings/billing", icon: Receipt },
      { label: "Entitlements", href: "/admin/settings/entitlements", icon: BarChart3 },
      { label: "Account", href: "/admin/settings/account", icon: User },
      { label: "Security", href: "/admin/settings/security", icon: Shield },
      { label: "Storage", href: "/admin/settings/storage", icon: Database },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {sections.map((section) => (
        <div key={section.heading} className="mb-4">
          <div className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {section.heading}
          </div>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[var(--primary)]/10 text-[var(--primary)] border-l-2 border-[var(--primary)] font-medium"
                        : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </>
  );
}

export function AdminSettingsShell({
  title,
  subtitle,
  children,
  isHub,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isHub?: boolean;
}) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const breadcrumbItems: BreadcrumbItem[] = isHub
    ? [
        { label: "Dashboard", href: "/admin" },
        { label: "Settings" },
      ]
    : [
        { label: "Dashboard", href: "/admin" },
        { label: "Settings", href: "/admin/settings" },
        { label: title },
      ];

  return (
    <AppShell role="admin" title={title} subtitle={subtitle} hideNav>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[240px] shrink-0">
          <div className="sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto">
            <div className="flex items-center gap-2 px-3 mb-4">
              <Settings className="w-5 h-5 text-[var(--primary)]" />
              <span className="text-lg font-semibold text-[var(--foreground)]">Settings</span>
            </div>
            <nav>
              <SidebarNav pathname={pathname} />
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Mobile nav toggle */}
          <div className="lg:hidden mb-4">
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] w-full"
            >
              <Settings className="w-4 h-4 text-[var(--primary)]" />
              Settings Navigation
              <ChevronDown
                className={cn(
                  "w-4 h-4 ml-auto transition-transform",
                  mobileNavOpen && "rotate-180"
                )}
              />
            </button>
            {mobileNavOpen && (
              <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                <SidebarNav
                  pathname={pathname}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </div>
            )}
          </div>

          <Breadcrumbs items={breadcrumbItems} />
          {children}
        </div>
      </div>
    </AppShell>
  );
}
