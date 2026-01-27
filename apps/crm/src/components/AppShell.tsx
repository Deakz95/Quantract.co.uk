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

const BRAND_NAME = process.env.NEXT_PUBLIC_QT_BRAND_NAME || "Quantract";
const BRAND_TAGLINE = process.env.NEXT_PUBLIC_QT_BRAND_TAGLINE || "Electrical & Building Services";

export type Role = "admin" | "client" | "engineer";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Enquiries", href: "/admin/enquiries", icon: Inbox },
  { label: "Quotes", href: "/admin/quotes", icon: FileText },
  { label: "Invoices", href: "/admin/invoices", icon: Receipt },
  { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
  { label: "Deals", href: "/admin/deals", icon: Target },
  { label: "Contacts", href: "/admin/contacts", icon: Users },
  { label: "Clients", href: "/admin/clients", icon: Users },
  { label: "Certificates", href: "/admin/certificates", icon: BadgeCheck },
  { label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
  { label: "Timesheets", href: "/admin/timesheets", icon: Clock },
  { label: "Reports", href: "/admin/reports", icon: FileBarChart },
  { label: "Import", href: "/admin/import", icon: Upload },
  { label: "Engineers", href: "/admin/engineers", icon: Users },
  { label: "Invites", href: "/admin/invites", icon: Mail },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  // Admin portal access
  { label: "→ Client Portal", href: "/client", icon: ChevronRight },
  { label: "→ Engineer Portal", href: "/engineer", icon: ChevronRight },
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
  const nav = useMemo(() => (role === "admin" ? adminNav : role === "engineer" ? engineerNav : clientNav), [role]);
  const pathname = usePathname();
  const [supportOpen, setSupportOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

  // Logout function
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
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
      setSupportOpen(false);
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
                          Contractor Tools
                        </div>
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
                        <a
                          href="https://apps.quantract.co.uk/cable-calculator"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                          onClick={() => setToolsOpen(false)}
                        >
                          <Settings className="w-4 h-4 text-[var(--accent)]" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)]">Cable Calculator</div>
                            <div className="text-xs text-[var(--muted-foreground)]">BS 7671 voltage drop</div>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                        </a>
                        <div className="my-2 border-t border-[var(--border)]" />
                        <div className="px-3 py-2 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                          Certificates
                        </div>
                        <a
                          href="https://certificates.quantract.co.uk"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                          onClick={() => setToolsOpen(false)}
                        >
                          <BadgeCheck className="w-4 h-4 text-[var(--success)]" />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)]">BS 7671 Certificates</div>
                            <div className="text-xs text-[var(--muted-foreground)]">EIC, EICR, MWC generator</div>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-50" />
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setSupportOpen(true)}>
              <Sparkles className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Support</span>
            </Button>
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

      {/* Support Dialog */}
      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSupportOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-fade-in">
            <DialogContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">Support</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">Get help or use our AI assistant.</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSupportOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                <Button variant="gradient" onClick={openAI} className="w-full justify-start">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Open AI assistant
                </Button>
                <a className="block" href="mailto:support@quantract.co.uk">
                  <Button variant="secondary" className="w-full justify-start">
                    <Mail className="w-4 h-4 mr-2" />
                    Email support
                  </Button>
                </a>
              </div>
            </DialogContent>
          </div>
        </div>
      )}

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
                  { label: "New Client", href: "/admin/clients", icon: Users },
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

      {/* Mobile Navigation */}
      {mobileNavOpen && !hideNav && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <div 
            className="w-72 h-full bg-[var(--card)] border-r border-[var(--border)] p-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "nav-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                    isActive(item.href) && "active"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
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
              <nav className="space-y-1">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "nav-item flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                      isActive(item.href) && "active"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {isActive(item.href) && <ChevronRight className="h-4 w-4 ml-auto" />}
                  </Link>
                ))}
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
