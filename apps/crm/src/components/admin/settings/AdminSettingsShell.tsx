"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/cn";
import { Palette, FileText, User, Settings, Briefcase, Receipt, BarChart3, Mail, Inbox, PoundSterling } from "lucide-react";

const tabs = [
  { label: "Appearance", href: "/admin/settings/appearance", icon: Palette, desc: "Colors & branding" },
  { label: "PDF Settings", href: "/admin/settings/pdf", icon: FileText, desc: "Document templates" },
  { label: "Legal Entities", href: "/admin/settings/legal-entities", icon: Briefcase, desc: "Billing entities" },
  { label: "Service Lines", href: "/admin/settings/service-lines", icon: Receipt, desc: "Service categories" },
  { label: "Notifications", href: "/admin/settings/notifications", icon: Mail, desc: "SMS & Email" },
  { label: "Lead Capture", href: "/admin/settings/lead-capture", icon: Inbox, desc: "Website forms" },
  { label: "Financials", href: "/admin/settings/financials", icon: PoundSterling, desc: "Overheads & rates" },
  { label: "Billing", href: "/admin/settings/billing", icon: Receipt, desc: "Subscription & plans" },
  { label: "Entitlements", href: "/admin/settings/entitlements", icon: BarChart3, desc: "Limits & usage" },
  { label: "Account", href: "/admin/settings/account", icon: User, desc: "User management" },
];

export function AdminSettingsShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const pathname = usePathname();

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/admin" },
    { label: "Settings", href: "/admin/settings" },
    { label: title },
  ];

  return (
    <AppShell role="admin" title={title} subtitle={subtitle} hideNav>
      <Breadcrumbs items={breadcrumbItems} />
      {/* Settings Navigation */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Settings</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white shadow-lg"
                    : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/50 hover:shadow-md"
                )}
              >
                <t.icon className={cn("w-4 h-4", active ? "text-white" : "text-[var(--muted-foreground)]")} />
                <div>
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className={cn("text-xs", active ? "text-white/80" : "text-[var(--muted-foreground)]")}>
                    {t.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </AppShell>
  );
}
