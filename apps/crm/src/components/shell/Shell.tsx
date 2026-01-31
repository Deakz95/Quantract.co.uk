"use client";

import type React from "react";
import { useState, useEffect } from "react";
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.message || "Logout failed. Please retry.");
        return;
      }
    } catch {
      // Network error — still redirect since cookies may have been cleared server-side
    }
    window.location.href = `/${role}/login`;
  }

  function isActive(href: string) {
    return pathname === href || (href !== `/${role}` && pathname.startsWith(href + "/"));
  }

  return (
    <div className="min-h-screen bg-[var(--muted)]">
      {/* Top bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setDrawerOpen(!drawerOpen)}
              className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 rounded-xl hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              aria-label="Toggle menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[var(--foreground)]">
                {drawerOpen ? (
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <>
                    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </svg>
            </button>
            <Link href="/" className="font-extrabold tracking-tight">
              QUANTRACT
            </Link>
          </div>
          <div className="text-xs font-semibold text-[var(--muted-foreground)]">{role.toUpperCase()}</div>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 z-40 bg-black/30"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "md:hidden fixed top-14 left-0 bottom-0 z-50 w-64 bg-[var(--background)] border-r border-[var(--border)] shadow-xl transition-transform duration-200 ease-in-out overflow-y-auto",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-3 space-y-1">
          {items.filter(it => !it.section).map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "block rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                isActive(it.href) ? "bg-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
              )}
              style={isActive(it.href) ? { color: "#ffffff" } : undefined}
            >
              {it.label}
            </Link>
          ))}

          {/* Portal access section (admin only) */}
          {role === "admin" && items.some(it => it.section === "portals") && (
            <>
              <div className="mt-2 border-t border-[var(--border)] pt-2 px-4">
                <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                  Access Other Portals
                </div>
              </div>
              {items.filter(it => it.section === "portals").map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "block rounded-xl px-4 py-3 text-sm font-semibold min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                    isActive(it.href) ? "bg-[var(--accent)] text-white" : "text-[var(--accent)] hover:bg-[var(--muted)]"
                  )}
                >
                  {it.label}
                </Link>
              ))}
            </>
          )}

          <div className="mt-2 border-t border-[var(--border)] pt-2">
            <button
              type="button"
              onClick={logout}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] min-h-[44px] flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Sidebar — desktop only */}
          <aside className="hidden md:block md:col-span-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-sm">
              {items.filter(it => !it.section).map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "block rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                    isActive(it.href) ? "bg-[var(--primary)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                  )}
                  style={isActive(it.href) ? { color: "#ffffff" } : undefined}
                >
                  {it.label}
                </Link>
              ))}

              {/* Portal access section (admin only) */}
              {role === "admin" && items.some(it => it.section === "portals") && (
                <>
                  <div className="mt-2 border-t border-[var(--border)] pt-2 px-3">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-1">
                      Access Other Portals
                    </div>
                  </div>
                  {items.filter(it => it.section === "portals").map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={cn(
                        "block rounded-xl px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2",
                        isActive(it.href) ? "bg-[var(--accent)] text-white" : "text-[var(--accent)] hover:bg-[var(--muted)]"
                      )}
                    >
                      {it.label}
                    </Link>
                  ))}
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
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 sm:p-5 shadow-sm">
              <div className="mb-4 sm:mb-5">
                <div className="text-xl sm:text-2xl font-extrabold">{title}</div>
                {subtitle ? <div className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</div> : null}
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
