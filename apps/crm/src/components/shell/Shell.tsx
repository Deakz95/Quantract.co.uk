"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Role = "admin" | "client" | "engineer";

const NAV: Record<Role, { label: string; href: string; section?: string }[]> = {
  admin: [
    { label: "Dashboard", href: "/admin" },
    { label: "Enquiries", href: "/admin/enquiries" },
    { label: "Quotes", href: "/admin/quotes" },
    { label: "Jobs", href: "/admin/jobs" },
    { label: "Invoices", href: "/admin/invoices" },
    { label: "Planner", href: "/admin/planner" },
    { label: "Clients", href: "/admin/clients" },
    { label: "Contacts", href: "/admin/contacts" },
    { label: "Deals", href: "/admin/deals" },
    { label: "Engineers", href: "/admin/engineers" },
    { label: "Certificates", href: "/admin/certificates" },
    { label: "Timesheets", href: "/admin/timesheets" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Import", href: "/admin/import" },
    { label: "Invites", href: "/admin/invites" },
    { label: "Settings", href: "/admin/settings" },
    // Admin can access all portals
    { label: "→ Client Portal", href: "/client", section: "portals" },
    { label: "→ Engineer Portal", href: "/engineer", section: "portals" },
  ],
  client: [
    { label: "Dashboard", href: "/client" },
    { label: "Quotes", href: "/client/quotes" },
    { label: "Invoices", href: "/client/invoices" },
    { label: "Documents", href: "/client/documents" },
  ],
  engineer: [
    { label: "Today", href: "/engineer/today" },
    { label: "Schedule", href: "/engineer/schedule" },
    { label: "My Jobs", href: "/engineer/jobs" },
    { label: "Timesheets", href: "/engineer/timesheets" },
    { label: "Profile", href: "/engineer/profile" },
  ],
};

export function Shell({
  role,
  title,
  subtitle,
  children,
}: {
  role: Role;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV[role];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = `/${role}/login`;
  }

  return (
    <div className="min-h-screen bg-[var(--muted)] pb-20 md:pb-0">
      {/* Top bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-extrabold tracking-tight">
            QUANTRACT
          </Link>
          <div className="text-xs font-semibold text-[var(--muted-foreground)]">{role.toUpperCase()}</div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Sidebar */}
          <aside className="hidden md:block md:col-span-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-sm">
              {items.filter(it => !it.section).map((it) => {
                const active = pathname === it.href || (it.href !== `/${role}` && pathname.startsWith(it.href + "/"));
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={cn(
                      "block rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                      active ? "bg-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                    )}
                    style={active ? { color: "#ffffff" } : undefined}
                  >
                    {it.label}
                  </Link>
                );
              })}

              {/* Portal access section (admin only) */}
              {role === "admin" && items.some(it => it.section === "portals") && (
                <>
                  <div className="mt-2 border-t border-[var(--border)] pt-2 px-3">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                      Access Other Portals
                    </div>
                  </div>
                  {items.filter(it => it.section === "portals").map((it) => {
                    const active = pathname === it.href;
                    return (
                      <Link
                        key={it.href}
                        href={it.href}
                        className={cn(
                          "block rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                          active ? "bg-[var(--accent)] text-white" : "text-[var(--accent)] hover:bg-[var(--muted)]"
                        )}
                      >
                        {it.label}
                      </Link>
                    );
                  })}
                </>
              )}

              <div className="mt-2 border-t border-[var(--border)] pt-2">
                <button
                  type="button"
                  onClick={logout}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                >
                  Log out
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="md:col-span-9">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm">
              <div className="mb-5">
                <div className="text-2xl font-extrabold">{title}</div>
                {subtitle ? <div className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</div> : null}
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex max-w-4xl justify-around px-2 py-2">
          {items.filter(it => !it.section).slice(0, 4).map((it) => {
            const active = pathname === it.href || (it.href !== `/${role}` && pathname.startsWith(it.href + "/"));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                  active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
                )}
              >
                {it.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={logout}
            className="flex flex-1 flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </nav>
    </div>
  );
}
