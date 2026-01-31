"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogContent } from "@/components/ui/Dialog";
import {
  BadgeCheck,
  FileText,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Briefcase,
  Clock,
  CalendarDays,
  Mail,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Plus,
  Inbox,
  Target,
  Activity,
  Upload,
  FileBarChart,
  CircleUser,
  User,
  HelpCircle,
  LogOut,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";

import { ImpersonationBanner } from "@/components/ImpersonationBanner";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { useBillingStatus } from "@/components/billing/useBillingStatus";

const BRAND_NAME = process.env.NEXT_PUBLIC_QT_BRAND_NAME || "Quantract";
const BRAND_TAGLINE = process.env.NEXT_PUBLIC_QT_BRAND_TAGLINE || "Electrical & Building Services";

export type Role = "admin" | "client" | "engineer";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
  section?: string;
};

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  // Sales
  { label: "Enquiries", href: "/admin/enquiries", icon: Inbox, section: "Sales" },
  { label: "Quotes", href: "/admin/quotes", icon: FileText, section: "Sales" },
  { label: "Deals", href: "/admin/deals", icon: Target, section: "Sales" },
  // Work
  { label: "Jobs", href: "/admin/jobs", icon: Briefcase, section: "Work" },
  { label: "Schedule", href: "/admin/schedule", icon: CalendarDays, section: "Work" },
  { label: "Timesheets", href: "/admin/timesheets", icon: Clock, section: "Work" },
  { label: "Certificates", href: "/admin/certificates", icon: BadgeCheck, section: "Work" },
  // Finance
  { label: "Invoices", href: "/admin/invoices", icon: Receipt, section: "Finance" },
  // People
  { label: "Clients", href: "/admin/clients", icon: Users, section: "People" },
  { label: "Contacts", href: "/admin/contacts", icon: Users, section: "People" },
  { label: "Engineers", href: "/admin/engineers", icon: Users, section: "People" },
  // Tools
  { label: "Tools", href: "/admin/tools", icon: Settings, section: "Tools" },
  // Admin
  { label: "Reports", href: "/admin/reports", icon: FileBarChart, section: "Admin" },
  { label: "Import", href: "/admin/import", icon: Upload, section: "Admin" },
  { label: "Invites", href: "/admin/invites", icon: Mail, section: "Admin" },
  { label: "Settings", href: "/admin/settings", icon: Settings, section: "Admin" },
  // Portal access
  { label: "→ Client Portal", href: "/client", icon: ChevronRight, section: "Portals" },
  { label: "→ Engineer Portal", href: "/engineer", icon: ChevronRight, section: "Portals" },
];

const clientNav: NavItem[] = [
  { label: "My Quotes", href: "/client", icon: FileText },
  { label: "My Invoices", href: "/client/invoices", icon: Receipt },
  { label: "Settings", href: "/client/settings", icon: Settings },
];

const engineerNav: NavItem[] = [
  { label: "Dashboard", href: "/engineer", icon: LayoutDashboard },
  { label: "My Jobs", href: "/engineer/jobs", icon: FileText },
  { label: "Schedule", href: "/engineer/schedule", icon: CalendarDays },
  { label: "Timesheets", href: "/engineer/timesheets", icon: Clock },
  { label: "Settings", href: "/engineer/settings", icon: Settings },
];

function renderNavItems(
  items: NavItem[],
  isActive: (href: string) => boolean,
  onNavigate?: () => void,
) {
  const elements: ReactNode[] = [];
  let lastSection: string | undefined;

  for (const item of items) {
    if (item.section && item.section !== lastSection) {
      lastSection = item.section;
      elements.push(
        <div key={`section-${item.section}`} className="pt-3 pb-1 px-4 text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)]">
          {item.section}
        </div>
      );
    }

    if (item.external) {
      elements.push(
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
          className="nav-item flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <item.icon className="h-4 w-4" />
          {item.label}
          <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
        </a>
      );
    } else {
      elements.push(
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "nav-item flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium",
            isActive(item.href) && "active"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
          {isActive(item.href) && <ChevronRight className="h-4 w-4 ml-auto" />}
        </Link>
      );
    }
  }

  return elements;
}

export function AppShell({
  role,
  title,
  subtitle,
  children,
  hideNav,
}: {
  role: Role;
  title: string;
  subtitle?: string;
  hideNav?: boolean;
  children: ReactNode;
}) {
  const { status: billingStatus } = useBillingStatus();
  const plan = billingStatus?.plan ?? "";
  const isFree = !plan || plan === "free" || plan === "trial";
  const nav = useMemo(() => {
    const base = role === "admin" ? adminNav : role === "engineer" ? engineerNav : clientNav;
    if (role === "admin" && isFree) {
      return base.filter((item) => item.label !== "Deals");
    }
    return base;
  }, [role, isFree]);
  const pathname = usePathname();
  const [newOpen, setNewOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifLogs, setNotifLogs] = useState<Array<{ id: string; channel: string; eventKey: string; recipient: string; status: string; createdAtISO: string; quoteId?: string; invoiceId?: string; jobId?: string }>>([]);

  // Fetch user email from auth endpoint
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && data?.user?.email) {
          setUserEmail(data.user.email);
        }
      } catch {
        // ignore - user may not be authenticated
      }
    };
    void fetchUserEmail();
  }, []);

  // Fetch notification count for admin
  useEffect(() => {
    if (role !== "admin") return;
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/admin/notifications/recent", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setNotifCount(data.unreadCount ?? 0);
          setNotifLogs(data.logs ?? []);
        }
      } catch { /* ignore */ }
    };
    void fetchNotifs();
  }, [role]);

  // Logout function
  const handleLogout = async () => {
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
  };

  useEffect(() => {
    const apply = async () => {
      try {
        if (role !== "admin") return;
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        const s = data?.settings;
        if (!res.ok || !data?.ok || !s) return;

        const root = document.documentElement;
        root.style.setProperty("--qt-theme-primary", String(s.themePrimary || "#3b82f6"));
        root.style.setProperty("--qt-theme-accent", String(s.themeAccent || "#06b6d4"));
        root.style.setProperty("--qt-theme-bg", String(s.themeBg || "#f8fafc"));
        root.style.setProperty("--qt-theme-text", String(s.themeText || "#0f172a"));
        
        // Apply theme to CSS variables
        root.style.setProperty("--primary", String(s.themePrimary || "#3b82f6"));
        root.style.setProperty("--accent", String(s.themeAccent || "#06b6d4"));
        root.style.setProperty("--background", String(s.themeBg || "#f8fafc"));
        root.style.setProperty("--foreground", String(s.themeText || "#0f172a"));
      } catch {
        // ignore
      }
    };
    void apply();
  }, [role]);

  const openAI = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("qt:open-ai"));
    }
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <ImpersonationBanner />
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          {/* Left: Brand */}
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-[var(--muted)] transition-colors"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <Link href={`/${role}`} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-white font-bold text-sm">{BRAND_NAME.slice(0, 1).toUpperCase()}</span>
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-[var(--foreground)]">{BRAND_NAME.toUpperCase()}</div>
                <div className="text-xs text-[var(--muted-foreground)]">{BRAND_TAGLINE}</div>
              </div>
            </Link>
          </div>

          {/* Center: Role Badge */}
          <div className="hidden md:flex items-center gap-2">
            <Badge variant={role === "admin" ? "gradient" : "secondary"}>
              {role === "admin" ? "Admin" : role === "engineer" ? "Engineer" : "Client"} Portal
            </Badge>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Global Search Button - Admin Only */}
            {role === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="gap-2"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-mono rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                  <span className="text-[9px]">Cmd</span>+K
                </kbd>
              </Button>
            )}
            {role === "admin" && (
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => setNotifOpen(!notifOpen)}>
                  <Inbox className="w-4 h-4" />
                  {notifCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {notifCount > 99 ? "99+" : notifCount}
                    </span>
                  )}
                </Button>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                      <div className="p-3 border-b border-[var(--border)]">
                        <div className="text-sm font-semibold text-[var(--foreground)]">Notifications</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{notifCount} in last 24h</div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifLogs.length === 0 ? (
                          <div className="p-4 text-center text-sm text-[var(--muted-foreground)]">No recent notifications</div>
                        ) : (
                          notifLogs.map((log) => {
                            const label = log.eventKey.replace(/_/g, " ").replace(/\./g, " ");
                            const href = log.quoteId ? `/admin/quotes/${log.quoteId}` : log.invoiceId ? `/admin/invoices/${log.invoiceId}` : log.jobId ? `/admin/jobs/${log.jobId}` : "#";
                            return (
                              <Link
                                key={log.id}
                                href={href}
                                onClick={() => setNotifOpen(false)}
                                className="flex items-start gap-3 px-3 py-2.5 hover:bg-[var(--muted)] transition-colors border-b border-[var(--border)] last:border-0"
                              >
                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${log.status === "SENT" ? "bg-green-500" : log.status === "FAILED" ? "bg-red-500" : "bg-gray-400"}`} />
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-[var(--foreground)] truncate capitalize">{label}</div>
                                  <div className="text-xs text-[var(--muted-foreground)] truncate">{log.recipient}</div>
                                  <div className="text-xs text-[var(--muted-foreground)]">{new Date(log.createdAtISO).toLocaleString("en-GB")}</div>
                                </div>
                              </Link>
                            );
                          })
                        )}
                      </div>
                      <Link
                        href="/admin/settings/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="block p-3 text-center text-xs font-semibold text-[var(--primary)] hover:bg-[var(--muted)] border-t border-[var(--border)]"
                      >
                        Notification Settings
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}
            {role === "admin" && (
              <div className="relative">
                <Button variant="ghost" size="sm" onClick={() => setToolsOpen(!toolsOpen)}>
                  <Settings className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Tools</span>
                </Button>
                {toolsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setToolsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden">
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                          Quick Access
                        </div>
                        <Link
                          href="/admin/tools/voltage-drop"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                          onClick={() => setToolsOpen(false)}
                        >
                          <ChevronRight className="w-4 h-4 text-[var(--primary)]" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)]">Voltage Drop</div>
                            <div className="text-xs text-[var(--muted-foreground)]">BS 7671 circuit design</div>
                          </div>
                        </Link>
                        <Link
                          href="/admin/tools/cable-sizing"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                          onClick={() => setToolsOpen(false)}
                        >
                          <ChevronRight className="w-4 h-4 text-[var(--accent)]" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)]">Cable Sizing</div>
                            <div className="text-xs text-[var(--muted-foreground)]">Ampacity &amp; correction factors</div>
                          </div>
                        </Link>
                        <a
                          href="https://apps.quantract.co.uk/point-counter"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                          onClick={() => setToolsOpen(false)}
                        >
                          <ChevronRight className="w-4 h-4 text-[var(--primary)]" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)]">Point Counter</div>
                            <div className="text-xs text-[var(--muted-foreground)]">Count points from drawings</div>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                        </a>
                        <div className="my-2 border-t border-[var(--border)]" />
                        <Link
                          href="/admin/tools"
                          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors text-sm font-semibold text-[var(--primary)]"
                          onClick={() => setToolsOpen(false)}
                        >
                          View All Tools
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">Support</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openAI}>
                  <Sparkles className="w-4 h-4 mr-2 inline" />
                  AI Assistant
                </DropdownMenuItem>
                <a href="mailto:support@quantract.co.uk">
                  <DropdownMenuItem>
                    <Mail className="w-4 h-4 mr-2 inline" />
                    Email Support
                  </DropdownMenuItem>
                </a>
                <a href="https://docs.quantract.co.uk" target="_blank" rel="noopener noreferrer">
                  <DropdownMenuItem>
                    <HelpCircle className="w-4 h-4 mr-2 inline" />
                    Help Centre
                  </DropdownMenuItem>
                </a>
              </DropdownMenuContent>
            </DropdownMenu>
            {role === "admin" && (
              <Button variant="gradient" size="sm" onClick={() => setNewOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">New</span>
              </Button>
            )}

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <CircleUser className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {userEmail && (
                  <>
                    <DropdownMenuLabel className="truncate">{userEmail}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                  </>
                )}
                <Link href={`/${role}/profile`}>
                  <DropdownMenuItem>
                    <User className="w-4 h-4 mr-2 inline" />
                    Profile
                  </DropdownMenuItem>
                </Link>
                <Link href={`/${role}/settings`}>
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2 inline" />
                    Settings
                  </DropdownMenuItem>
                </Link>
                <a href="https://docs.quantract.co.uk" target="_blank" rel="noopener noreferrer">
                  <DropdownMenuItem>
                    <HelpCircle className="w-4 h-4 mr-2 inline" />
                    Help
                  </DropdownMenuItem>
                </a>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700">
                  <LogOut className="w-4 h-4 mr-2 inline" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>


      {/* New Item Dialog */}
      {newOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setNewOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-fade-in">
            <DialogContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">Create New</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">Quick actions to keep things moving.</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setNewOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-6 grid gap-3">
                {[
                  { label: "New Quote", href: "/admin/quotes/new", icon: FileText },
                  { label: "New Enquiry", href: "/admin/enquiries?new=1", icon: Inbox },
                  { label: "New Client", href: "/admin/clients", icon: Users },
                  { label: "New Contact", href: "/admin/contacts?new=1", icon: User },
                  { label: "New Job", href: "/admin/jobs", icon: Briefcase },
                  { label: "New Invoice", href: "/admin/invoices", icon: Receipt },
                ].map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setNewOpen(false)} className="block">
                    <Button variant="secondary" className="w-full justify-start group">
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.label}
                      <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                  </Link>
                ))}
              </div>
            </DialogContent>
          </div>
        </div>
      )}

      {/* Global Search Command Palette - Admin Only */}
      {role === "admin" && (
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      )}

      {/* Mobile Navigation */}
      {mobileNavOpen && !hideNav && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <div 
            className="w-72 h-full bg-[var(--card)] border-r border-[var(--border)] p-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-0.5">
              {renderNavItems(nav, isActive, () => setMobileNavOpen(false))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        {hideNav ? null : (
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              <nav className="space-y-0.5">
                {renderNavItems(nav, isActive)}
              </nav>
            </div>
          </aside>
        )}

        {/* Main Content Area */}
        <main className={cn("lg:col-span-9", hideNav ? "lg:col-span-12" : "")}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{title}</h1>
            {subtitle && <p className="mt-1 text-[var(--muted-foreground)]">{subtitle}</p>}
          </div>
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-[var(--muted-foreground)] sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>Welcome to {BRAND_NAME} - Professional Business Management</span>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-[var(--primary)] transition-colors">
                About
              </Link>
              <Link href="/admin/settings/appearance" className="hover:text-[var(--primary)] transition-colors">
                Customize Theme
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
