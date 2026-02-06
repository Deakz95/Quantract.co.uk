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
  ChevronDown,
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
  Building2,
  CheckCircle,
  AlertTriangle,
  Shield,
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

export type Role = "admin" | "client" | "engineer" | "office";
export type UiMode = "simple" | "standard" | "full";

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  external?: boolean;
  section?: string;
  beta?: boolean;
};

type NavSection = {
  id: string;
  title: string;
  items: NavItem[];
  dividerBefore?: boolean;
};

const ADMIN_SECTIONS: NavSection[] = [
  {
    id: "core",
    title: "Core",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Jobs", href: "/admin/jobs", icon: Briefcase },
      { label: "Quotes", href: "/admin/quotes", icon: FileText },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
      { label: "Certificates", href: "/admin/certificates", icon: BadgeCheck },
      { label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
      { label: "Dispatch", href: "/admin/dispatch", icon: Activity },
      { label: "Clients", href: "/admin/clients", icon: Users },
      { label: "Engineers", href: "/admin/engineers", icon: Users },
      { label: "Timesheets", href: "/admin/timesheets", icon: Clock },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    items: [
      { label: "Deals", href: "/admin/deals", icon: Target },
      { label: "Enquiries", href: "/admin/enquiries", icon: Inbox },
      { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    ],
  },
  {
    id: "tools",
    title: "Tools",
    items: [
      { label: "AI Estimator", href: "/admin/tools/ai-estimator", icon: Sparkles },
      { label: "Field Tools", href: "/admin/tools", icon: Settings },
      { label: "Truck Stock", href: "/admin/truck-stock", icon: Briefcase, beta: true },
      { label: "Remote Assist", href: "/admin/remote-assist", icon: Activity, beta: true },
      { label: "Maintenance", href: "/admin/maintenance/alerts", icon: Settings, beta: true },
    ],
  },
  {
    id: "office",
    title: "Office",
    dividerBefore: true,
    items: [
      { label: "Control Room", href: "/admin/office", icon: Building2 },
      { label: "Approvals", href: "/admin/office/approvals", icon: CheckCircle },
      { label: "Compliance", href: "/admin/office/compliance", icon: BadgeCheck },
      { label: "Purchasing", href: "/admin/office/purchasing", icon: Receipt },
    ],
  },
  {
    id: "admin",
    title: "Admin",
    dividerBefore: true,
    items: [
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Roles", href: "/admin/roles", icon: Shield },
      { label: "Audit Log", href: "/admin/audit", icon: FileBarChart },
      { label: "Import", href: "/admin/import", icon: Upload },
      { label: "Invites", href: "/admin/invites", icon: Mail },
    ],
  },
];

// Items visible in each uiMode tier
const SIMPLE_NAV_LABELS = new Set(["Dashboard", "Jobs", "Quotes", "Invoices", "Schedule", "Clients"]);
const STANDARD_NAV_LABELS = new Set([
  ...SIMPLE_NAV_LABELS, "Certificates", "Engineers", "Reports", "Timesheets",
]);
// Sections visible per tier
const SIMPLE_SECTIONS = new Set(["core"]);
const STANDARD_SECTIONS = new Set(["core", "sales"]);

const OFFICE_SECTIONS: NavSection[] = [
  {
    id: "control",
    title: "Control Room",
    items: [
      { label: "Dashboard", href: "/office", icon: Building2 },
      { label: "Dispatch", href: "/office/dispatch", icon: Activity },
    ],
  },
  {
    id: "approvals",
    title: "Approvals",
    items: [
      { label: "Approvals", href: "/office/approvals", icon: CheckCircle },
      { label: "Exports", href: "/office/exports", icon: FileBarChart },
    ],
  },
  {
    id: "compliance",
    title: "Compliance",
    items: [
      { label: "Compliance", href: "/office/compliance", icon: BadgeCheck },
      { label: "Alerts", href: "/office/alerts", icon: AlertTriangle },
    ],
  },
  {
    id: "purchasing",
    title: "Purchasing",
    items: [
      { label: "Purchasing", href: "/office/purchasing", icon: Receipt },
    ],
  },
];

const DEFAULT_OPEN_SECTIONS = new Set(["core"]);
const NAV_VERSION = 2; // bump to reset stale localStorage when defaults change

// Legacy flat array for client/engineer roles (no sections)
const adminNav: NavItem[] = ADMIN_SECTIONS.flatMap((s) => s.items);

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

function renderNavLink(item: NavItem, isActive: (href: string) => boolean, onNavigate?: () => void) {
  if (item.beta) {
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        title="In progress"
        className={cn(
          "nav-item flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium",
          isActive(item.href) && "active"
        )}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
          Beta
        </span>
      </Link>
    );
  }
  if (item.external) {
    return (
      <a
        key={item.href}
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className="nav-item flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <item.icon className="h-4 w-4" />
        {item.label}
        <ChevronRight className="h-3 w-3 ml-auto opacity-50" />
      </a>
    );
  }
  return (
    <Link
      key={item.href}
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "nav-item flex items-center gap-3 rounded-xl px-4 py-2 text-sm font-medium",
        isActive(item.href) && "active"
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
      {isActive(item.href) && <ChevronRight className="h-4 w-4 ml-auto" />}
    </Link>
  );
}

function renderAccordionNav(
  sections: NavSection[],
  isActive: (href: string) => boolean,
  openSections: Record<string, boolean>,
  toggleSection: (id: string) => void,
  onNavigate?: () => void,
) {
  return sections.map((section) => {
    const isOpen = openSections[section.id] ?? false;
    return (
      <div key={section.id}>
        {section.dividerBefore && <div className="my-2 border-t border-[var(--border)]" />}
        <button
          type="button"
          onClick={() => toggleSection(section.id)}
          aria-expanded={isOpen}
          aria-controls={`nav-section-${section.id}`}
          className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors rounded-lg hover:bg-[var(--muted)]/50"
        >
          <span>{section.title}</span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200",
              isOpen ? "" : "-rotate-90"
            )}
          />
        </button>
        <div
          id={`nav-section-${section.id}`}
          className="grid transition-[grid-template-rows,opacity] duration-200"
          style={{
            gridTemplateRows: isOpen ? "1fr" : "0fr",
            opacity: isOpen ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="space-y-0.5 pt-0.5 pb-1">
              {section.items.map((item) => renderNavLink(item, isActive, onNavigate))}
            </div>
          </div>
        </div>
      </div>
    );
  });
}

/** Legacy flat list for client/engineer roles */
function renderFlatNav(items: NavItem[], isActive: (href: string) => boolean, onNavigate?: () => void) {
  return items.map((item) => renderNavLink(item, isActive, onNavigate));
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
  const isPro = plan === "pro_plus" || plan === "enterprise";
  const [uiMode, setUiMode] = useState<UiMode>("full");
  const nav = useMemo(() => {
    if (role === "engineer") return engineerNav;
    return clientNav;
  }, [role]);

  const adminSections = useMemo(() => {
    if (role === "office") return OFFICE_SECTIONS;

    let sections = ADMIN_SECTIONS;

    // Filter by uiMode
    if (uiMode === "simple") {
      sections = sections
        .filter((s) => SIMPLE_SECTIONS.has(s.id))
        .map((s) => ({
          ...s,
          items: s.items.filter((item) => SIMPLE_NAV_LABELS.has(item.label)),
        }));
    } else if (uiMode === "standard") {
      sections = sections
        .filter((s) => STANDARD_SECTIONS.has(s.id))
        .map((s) => ({
          ...s,
          items: s.items.filter((item) => STANDARD_NAV_LABELS.has(item.label)),
        }));
    }

    // Hide Deals for non-pro plans
    if (!isPro) {
      sections = sections.map((s) => ({
        ...s,
        items: s.items.filter((item) => item.label !== "Deals"),
      }));
    }

    // Hide Enquiries in simple and standard modes
    if (uiMode === "simple" || uiMode === "standard") {
      sections = sections.map((s) => ({
        ...s,
        items: s.items.filter((item) => item.label !== "Enquiries"),
      }));
    }

    // Hide Dispatch in simple and standard modes
    if (uiMode === "simple" || uiMode === "standard") {
      sections = sections.map((s) => ({
        ...s,
        items: s.items.filter((item) => item.label !== "Dispatch"),
      }));
    }

    // Hide BETA items in simple and standard modes
    if (uiMode !== "full") {
      sections = sections.map((s) => ({
        ...s,
        items: s.items.filter((item) => !item.beta),
      }));
    }

    return sections.filter((s) => s.items.length > 0);
  }, [uiMode, isPro, role]);
  const pathname = usePathname();
  const [newOpen, setNewOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // Accordion open/close state — persisted to localStorage
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      const init: Record<string, boolean> = {};
      for (const s of ADMIN_SECTIONS) init[s.id] = DEFAULT_OPEN_SECTIONS.has(s.id);
      return init;
    }
    try {
      const stored = localStorage.getItem("qt-nav-open");
      const version = localStorage.getItem("qt-nav-version");
      if (stored && version === String(NAV_VERSION)) return JSON.parse(stored);
    } catch { /* ignore */ }
    const init: Record<string, boolean> = {};
    for (const s of ADMIN_SECTIONS) init[s.id] = DEFAULT_OPEN_SECTIONS.has(s.id);
    try { localStorage.setItem("qt-nav-version", String(NAV_VERSION)); } catch { /* ignore */ }
    return init;
  });

  // Track which sections the user has manually toggled (survives route changes)
  const [manualToggles, setManualToggles] = useState<Set<string>>(new Set());

  // Auto-open the section containing the current route, auto-close others (except CORE + manually toggled)
  useEffect(() => {
    if (role !== "admin" && role !== "office") return;
    const sections = role === "office" ? OFFICE_SECTIONS : ADMIN_SECTIONS;
    const match = sections.find((s) =>
      s.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    );
    setOpenSections((prev) => {
      const next: Record<string, boolean> = {};
      for (const s of sections) {
        if (DEFAULT_OPEN_SECTIONS.has(s.id)) {
          // Always-open sections (CORE) stay open
          next[s.id] = true;
        } else if (match && s.id === match.id) {
          // Active section opens
          next[s.id] = true;
        } else if (manualToggles.has(s.id)) {
          // Manually toggled sections keep their state
          next[s.id] = prev[s.id] ?? false;
        } else {
          // Everything else collapses
          next[s.id] = false;
        }
      }
      try { localStorage.setItem("qt-nav-open", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [pathname, role, manualToggles]);

  const toggleSection = (id: string) => {
    setManualToggles((prev) => new Set(prev).add(id));
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("qt-nav-open", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };
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

  // Fetch notification count for admin/office
  useEffect(() => {
    if (role !== "admin" && role !== "office") return;
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
        if (role !== "admin" && role !== "office") return;
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        const s = data?.company ?? data?.settings;
        if (!res.ok || !data?.ok || !s) return;

        // Apply uiMode
        if (s.uiMode && ["simple", "standard", "full"].includes(s.uiMode)) {
          setUiMode(s.uiMode as UiMode);
        }

        const root = document.documentElement;
        root.style.setProperty("--qt-theme-primary", String(s.themePrimary || "#6366f1"));
        root.style.setProperty("--qt-theme-accent", String(s.themeAccent || "#22d3ee"));
        root.style.setProperty("--qt-theme-bg", String(s.themeBg || "#0f1115"));
        root.style.setProperty("--qt-theme-text", String(s.themeText || "#f8fafc"));

        // Apply theme to CSS variables
        root.style.setProperty("--primary", String(s.themePrimary || "#6366f1"));
        root.style.setProperty("--accent", String(s.themeAccent || "#22d3ee"));
        root.style.setProperty("--background", String(s.themeBg || "#0f1115"));
        root.style.setProperty("--foreground", String(s.themeText || "#f8fafc"));
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
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
              {role === "admin" ? "Admin" : role === "office" ? "Office" : role === "engineer" ? "Engineer" : "Client"}
            </Badge>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Global Search Button - Admin/Office */}
            {(role === "admin" || role === "office") && (
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
            {(role === "admin" || role === "office") && (
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
                  <Activity className="w-4 h-4 mr-1.5" />
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

      {/* Global Search Command Palette - Admin/Office */}
      {(role === "admin" || role === "office") && (
        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      )}

      {/* Mobile Navigation */}
      {mobileNavOpen && !hideNav && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)}>
          <div 
            className="nav-scroll w-72 h-full overflow-y-auto overscroll-contain bg-[var(--card)] border-r border-[var(--border)] p-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-0.5">
              {role === "admin" || role === "office"
                ? renderAccordionNav(adminSections, isActive, openSections, toggleSection, () => setMobileNavOpen(false))
                : renderFlatNav(nav, isActive, () => setMobileNavOpen(false))}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        {hideNav ? null : (
          <aside className="hidden lg:block lg:col-span-3">
            <div className="nav-scroll sticky top-20 max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain">
              <nav className="space-y-0.5">
                {role === "admin" || role === "office"
                  ? renderAccordionNav(adminSections, isActive, openSections, toggleSection)
                  : renderFlatNav(nav, isActive)}
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
