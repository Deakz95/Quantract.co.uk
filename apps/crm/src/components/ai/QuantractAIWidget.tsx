"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { makeRecId } from "@/lib/ai/recId";
import { storeAttrib, loadAttrib, clearAttrib } from "@/lib/ai/attrib";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { cn } from "@/lib/cn";

type AIRole = "ADMIN" | "ENGINEER" | "CLIENT";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  confidence?: number;
  citations?: Array<{ entityType: string; entityId: string; note: string }>;
  suggestedActions?: Array<{ type: string; label: string; payload?: Record<string, unknown> }>;
  missingData?: string[];
  error?: string;
  mode?: string;
  explain?: {
    mode: string;
    effectiveRole: string;
    accessReason: string;
    dataScope: string;
    canSeeFinancials: boolean;
    restrictionCount: number;
    strictness: string;
  };
}

interface QuantractAIWidgetProps {
  /** Optional externally-provided session (mostly for embedding). */
  session?: { companyId: string | null; userEmail: string | null; role: AIRole } | null;
  apiBaseUrl?: string;
  suggestedPrompts?: string[];
  accentColor?: string;
  position?: "bottom-right" | "bottom-left";
}

const defaultPrompts: Record<string, string[]> = {
  admin: ["Which invoices are overdue?", "What jobs are blocked?", "Unapproved variations?", "Outstanding receivables?"],
  ADMIN: ["Which invoices are overdue?", "What jobs are blocked?", "Unapproved variations?", "Outstanding receivables?"],
  engineer: ["What job am I on today?", "Log 7.5 hours for today", "What certs are needed?", "Show my job stages"],
  ENGINEER: ["What job am I on today?", "Log 7.5 hours for today", "What certs are needed?", "Show my job stages"],
  client: ["Explain my latest invoice", "What variations have I approved?", "Show my job status", "Find my certificates"],
  CLIENT: ["Explain my latest invoice", "What variations have I approved?", "Show my job status", "Find my certificates"],
};

const modePrompts: Record<string, string[]> = {
  ops: ["What jobs are scheduled today?", "Any unassigned jobs?", "Unapproved variations?", "Missing certificates?"],
  finance: ["Which invoices are overdue?", "Show outstanding receivables", "Aged debt report?", "Monthly revenue summary?"],
  client: ["What's my job status?", "Explain my latest invoice", "Show my certificates", "What variations need approval?"],
};

function formatPct(n: number) {
  return `${Math.round(Math.max(0, Math.min(1, n)) * 100)}%`;
}

const CONFIDENCE_RE = /\s*\[confidence:(0\.\d{1,2})\]/;
const ACTION_RE = /\s*\[action:([a-z0-9_]+)\]/;

function parseTitleTags(title: string): { label: string; confidence: number | null; actionId: string | null } {
  let label = title;
  const confMatch = label.match(CONFIDENCE_RE);
  const confidence = confMatch ? parseFloat(confMatch[1]) : null;
  if (confMatch) label = label.replace(CONFIDENCE_RE, "");
  const actMatch = label.match(ACTION_RE);
  const actionId = actMatch ? actMatch[1] : null;
  if (actMatch) label = label.replace(ACTION_RE, "");
  return { label: label.trim(), confidence, actionId };
}

// Keep backward compat alias used nowhere else now
function parseConfidence(title: string): { label: string; confidence: number | null } {
  const { label, confidence } = parseTitleTags(title);
  return { label, confidence };
}

function isPaidPlan(plan: string | undefined | null): boolean {
  if (!plan) return false;
  const p = plan.toLowerCase();
  return p.includes("pro") || p.includes("enterprise");
}

// Minimal client-side analytics — debounced, no third-party deps
const _loggedEvents = new Set<string>();
function trackEvent(event: string, data?: Record<string, unknown>) {
  const key = data ? `${event}:${JSON.stringify(data)}` : event;
  if (_loggedEvents.has(key)) return;
  _loggedEvents.add(key);
  console.info(`[qt-ai-analytics] ${event}`, data ?? "");
}

/** ----------------------------------------------------------------
 * Inline icons (no dependency). All are simple SVGs using currentColor.
 * ---------------------------------------------------------------- */
type IconProps = { className?: string };

function IconRobot(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path
        d="M10 3h4v2h-4V3ZM7 7h10a4 4 0 0 1 4 4v3a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-3a4 4 0 0 1 4-4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M8.5 12h.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M15 12h.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M8 16c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSend(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path
        d="M3 11.5 21 3l-8.5 18-2.2-7.1L3 11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M21 3 10.3 13.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSpinner(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path
        d="M12 3a9 9 0 1 0 9 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconX(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconExpand(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M8 3H3v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 3l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 3h5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 3l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 21H3v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 21l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 21h5v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 21l-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMinimize(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M9 3H3v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 3l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M15 21h6v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21 21l-7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconMessage(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path
        d="M4 5h16v11a3 3 0 0 1-3 3H10l-4 3v-3H7a3 3 0 0 1-3-3V5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7 9h10M7 12h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCheckCircle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M22 12a10 10 0 1 1-10-10 10 10 0 0 1 10 10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M7.5 12.5 10.5 15.5 16.5 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconFile(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path
        d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M14 3v4h4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 11h8M8 15h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconAlertTriangle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path
        d="M12 3 2 21h20L12 3Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 9v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconAlertCircle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M22 12a10 10 0 1 1-10-10 10 10 0 0 1 10 10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 16h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function IconInfo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSparkles(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={props.className} aria-hidden="true">
      <path d="M12 2l1.4 4.3L18 8l-4.6 1.7L12 14l-1.4-4.3L6 8l4.6-1.7L12 2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M19 12l.9 2.6L23 16l-3.1 1.4L19 20l-.9-2.6L15 16l3.1-1.4L19 12Z" stroke="currentColor" strokeWidth="2" />
      <path d="M3 12l.9 2.6L7 16l-3.1 1.4L3 20l-.9-2.6L-1 16l3.1-1.4L3 12Z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** ---------------------------------------------------------------- */

function ExplainPanel({ explain, messageId }: {
  explain: NonNullable<Message["explain"]>;
  messageId: string;
}) {
  const [open, setOpen] = useState(false);

  const modeLabel = explain.mode === "ops" ? "Operations"
    : explain.mode === "finance" ? "Finance"
    : "Client";

  return (
    <div className="mt-2 pt-2 border-t border-[var(--border)]">
      <button
        onClick={() => setOpen(!open)}
        className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1 transition-colors"
        aria-expanded={open}
        aria-controls={`explain-${messageId}`}
      >
        <IconInfo className="h-3 w-3" />
        Details {open ? "\u25BE" : "\u25B8"}
      </button>
      {open && (
        <div id={`explain-${messageId}`} className="mt-1.5 space-y-1 text-[10px] text-[var(--muted-foreground)]">
          <div className="flex items-center gap-2">
            <span className="font-medium">Mode:</span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--muted)] text-[9px]">{modeLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Access:</span>
            <span>{explain.accessReason}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Scope:</span>
            <span>{explain.dataScope}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Financials:</span>
            <span>{explain.canSeeFinancials ? "visible" : "hidden"}</span>
          </div>
          {explain.restrictionCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Restrictions:</span>
              <span>{explain.restrictionCount} topic{explain.restrictionCount !== 1 ? "s" : ""} blocked</span>
            </div>
          )}
          {explain.strictness === "high" && (
            <div className="flex items-center gap-1 text-amber-400">
              <IconAlertTriangle className="h-3 w-3" />
              <span>High strictness — ambiguous queries declined</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function QuantractAIWidget(props: QuantractAIWidgetProps) {
  return (
    <Suspense fallback={null}>
      <QuantractAIWidgetInner {...props} />
    </Suspense>
  );
}

function QuantractAIWidgetInner({
  session: externalSession,
  apiBaseUrl = "/api",
  suggestedPrompts: customPrompts,
  accentColor = "hsl(262, 83%, 58%)",
  position = "bottom-right",
}: QuantractAIWidgetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Suppress on mobile engineer routes
  const [_isMobileWidget, _setIsMobileWidget] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    _setIsMobileWidget(mq.matches);
    const handler = (e: MediaQueryListEvent) => _setIsMobileWidget(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  if (_isMobileWidget && pathname?.startsWith("/engineer")) return null;
  const [isOpen, setIsOpen] = useState(false);
  const deepLinkHandled = useRef(false);

  // Auto-open widget when ?ai=1 is present (deep link from digest email)
  useEffect(() => {
    if (deepLinkHandled.current) return;
    if (searchParams?.get("ai") === "1") {
      deepLinkHandled.current = true;
      setIsOpen(true);
      trackEvent("ai_weekly_digest_deeplink_opened");
      // Store attribution token for apply funnel tracking
      storeAttrib({
        source: "weekly_digest",
        startedAt: Date.now(),
        recId: searchParams.get("aiRec") ?? undefined,
        actionId: searchParams.get("aiAction") ?? undefined,
      });
      trackEvent("ai_weekly_digest_attrib_session_started");
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("qt:open-ai", handler as any);
    return () => window.removeEventListener("qt:open-ai", handler as any);
  }, []);

  // Handle Escape key to close widget
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setIsFullscreen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<QuantractAIWidgetProps["session"]>(externalSession ?? null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [recommendations, setRecommendations] = useState<{
    summary?: string;
    top_recommendations?: Array<{ title: string; why_it_matters: string; steps_in_app: string[]; expected_impact: string; effort: string }>;
    quick_wins?: string[];
    risks_or_gaps?: string[];
    questions?: string[];
  } | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsFetched, setRecsFetched] = useState(false);
  const [expandedRec, setExpandedRec] = useState<number | null>(null);
  const [showRisks, setShowRisks] = useState(false);
  const [recsError, setRecsError] = useState(false);
  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const isFree = !isPaidPlan(aiPlan);
  const [applyingAction, setApplyingAction] = useState<string | null>(null);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [applyError, setApplyError] = useState<string | null>(null);
  const [allowedModes, setAllowedModes] = useState<string[]>([]);
  const [currentMode, setCurrentMode] = useState<string>("auto");

  async function handleApplyAction(actionId: string) {
    setApplyingAction(actionId);
    setApplyError(null);
    try {
      const attrib = loadAttrib();
      const res = await fetch(`${apiBaseUrl}/admin/ai/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ actionId, ...(attrib ? { attrib } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      setAppliedActions((prev) => new Set(prev).add(actionId));
      trackEvent("action.applied", { actionId });
      if (attrib) {
        trackEvent("ai_weekly_digest_attrib_applied", { actionId, recId: attrib.recId });
        clearAttrib();
      }
    } catch {
      setApplyError(actionId);
    } finally {
      setApplyingAction(null);
    }
  }

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (externalSession) return;
    fetch(`${apiBaseUrl}/ai/session`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.authenticated && data?.session) {
          setSession(data.session);
          if (data.allowedModes) setAllowedModes(data.allowedModes);
          if (data.defaultMode) setCurrentMode(data.defaultMode);
        }
      })
      .catch(() => null);
  }, [externalSession, apiBaseUrl]);

  useEffect(() => {
    fetch(`${apiBaseUrl}/ai/status`)
      .then((r) => r.json())
      .then((data) => setAiConfigured(Boolean(data?.configured)))
      .catch(() => setAiConfigured(false));
  }, [apiBaseUrl]);

  // Track widget open (once per page load, admin only)
  useEffect(() => {
    if (!isOpen) return;
    const role = session?.role;
    if (role === "ADMIN" || String(role).toLowerCase() === "admin") {
      trackEvent("widget.opened");
    }
  }, [isOpen, session?.role]);

  // Fetch CRM recommendations on first open (admin only)
  useEffect(() => {
    if (!isOpen || recsFetched || recsLoading) return;
    const role = session?.role;
    if (role !== "ADMIN" && String(role).toLowerCase() !== "admin") return;
    setRecsLoading(true);
    setRecsFetched(true);
    fetch(`${apiBaseUrl}/admin/ai/recommendations`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?._plan) setAiPlan(data._plan);
        if (data?.ok && data?.summary) {
          setRecommendations(data);
          // Inject summary + questions as initial assistant messages
          const msgs: Message[] = [];
          msgs.push({
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.summary,
            timestamp: new Date(),
          });
          if (Array.isArray(data.questions)) {
            for (const q of data.questions) {
              msgs.push({
                id: crypto.randomUUID(),
                role: "assistant",
                content: q,
                timestamp: new Date(),
              });
            }
          }
          setMessages((prev) => (prev.length === 0 ? msgs : prev));
        }
      })
      .catch(() => {
        setRecsError(true);
      })
      .finally(() => setRecsLoading(false));
  }, [isOpen, recsFetched, recsLoading, session?.role, apiBaseUrl]);

  // Auto-expand matching recommendation from deep link (?aiRec=<recId>)
  const deepLinkExpanded = useRef(false);
  useEffect(() => {
    if (deepLinkExpanded.current) return;
    const aiRecParam = searchParams?.get("aiRec");
    if (!aiRecParam || !recommendations?.top_recommendations?.length) return;
    const idx = recommendations.top_recommendations.findIndex(
      (rec) => makeRecId(rec.title) === aiRecParam,
    );
    if (idx !== -1) {
      deepLinkExpanded.current = true;
      setExpandedRec(idx);
      trackEvent("ai_weekly_digest_deeplink_rec_expanded", { recId: aiRecParam });
    }
  }, [searchParams, recommendations]);

  useEffect(() => {
    if (customPrompts?.length) return setPrompts(customPrompts);
    // If we have a mode, use mode-specific prompts
    if (currentMode && currentMode !== "auto" && modePrompts[currentMode]) {
      return setPrompts(modePrompts[currentMode]);
    }
    const role = session?.role;
    if (role) return setPrompts(defaultPrompts[role] ?? []);
    setPrompts([]);
  }, [session?.role, customPrompts, currentMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const positionClasses = position === "bottom-right" ? "right-4 sm:right-6" : "left-4 sm:left-6";
  const panelClasses = isFullscreen
    ? "fixed inset-0 z-[9999]"
    : `fixed bottom-4 sm:bottom-6 ${positionClasses} z-[9999] w-[95vw] sm:w-[420px] h-[80vh] sm:h-[600px] max-h-[calc(100vh-2rem)]`;

  const derivedPrompts = useMemo(() => prompts.slice(0, 4), [prompts]);

  async function handleAction(action: NonNullable<Message["suggestedActions"]>[number]) {
    if (action.type === "NAVIGATE") {
      const path = typeof action.payload?.path === "string" ? (action.payload.path as string) : null;
      if (path) router.push(path);
      return;
    }
    setInput(action.label);
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: content,
          mode: currentMode,
          history: nextMessages
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp.toISOString() })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : "Request failed";
        throw new Error(msg);
      }

      const assistantMessage: Message = {
        id: typeof data?.id === "string" ? data.id : crypto.randomUUID(),
        role: "assistant",
        content: typeof data?.answer === "string" ? data.answer : "I couldn't process that request.",
        timestamp: data?.timestamp ? new Date(data.timestamp) : new Date(),
        confidence: typeof data?.confidence === "number" ? data.confidence : undefined,
        citations: Array.isArray(data?.citations) ? data.citations : undefined,
        suggestedActions: Array.isArray(data?.suggestedActions) ? data.suggestedActions : undefined,
        missingData: Array.isArray(data?.missingData) ? data.missingData : undefined,
        error: typeof data?.error === "string" ? data.error : undefined,
        mode: typeof data?.mode === "string" ? data.mode : undefined,
        explain: data?._explain ?? undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error ? error.message : "An error occurred.",
          timestamp: new Date(),
          error: "REQUEST_FAILED",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          `fixed bottom-4 sm:bottom-6 ${positionClasses} z-[9999] rounded-full shadow-lg flex items-center gap-2 px-4 h-14 transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2`
        )}
        style={{ backgroundColor: accentColor }}
        aria-label="Open AI Assistant"
      >
        <IconMessage className="h-6 w-6 text-white" />
        <span className="text-white text-sm font-semibold">AI</span>
      </button>
    );
  }

  return (
    <div className={panelClasses}>
      <Card className="h-full flex flex-col bg-[var(--background)] border border-[var(--border)] shadow-2xl rounded-2xl overflow-hidden">
        <CardHeader className="px-4 py-3 border-b border-[var(--border)]" style={{ backgroundColor: accentColor }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--background)]/20 flex items-center justify-center">
                <IconRobot className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-white">Quantract AI</CardTitle>
                {allowedModes.length > 1 ? (
                  <div className="flex gap-1 mt-1">
                    {allowedModes.map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setCurrentMode(mode)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                          currentMode === mode
                            ? "bg-white/30 text-white"
                            : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white/80"
                        )}
                      >
                        {mode === "ops" ? "Ops" : mode === "finance" ? "Finance" : "Client"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/70">{session?.role ? `${session.role} Assistant` : "Operations Assistant"}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                className="h-9 w-9 p-0 text-white/80 hover:text-white focus-visible:ring-white"
                onClick={() => setIsFullscreen((v) => !v)}
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <IconMinimize className="h-4 w-4" /> : <IconExpand className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                className="h-9 w-9 p-0 text-white/80 hover:text-white focus-visible:ring-white"
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                aria-label="Close AI Assistant"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full overflow-auto p-4">
            {!aiConfigured && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-200 text-sm">
                <IconAlertTriangle className="h-4 w-4 inline mr-2 align-[-2px]" />
                AI not configured. Set OPENAI_API_KEY.
              </div>
            )}

            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                {recsLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <IconSpinner className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
                    <p className="text-[var(--muted-foreground)] text-sm">Analysing your CRM...</p>
                  </div>
                ) : recsError && !recommendations ? (
                  <div className="flex flex-col items-center gap-3">
                    <IconAlertCircle className="h-8 w-8 text-red-400" />
                    <p className="text-[var(--muted-foreground)] text-sm">Couldn&apos;t load recommendations.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRecsError(false);
                        setRecsFetched(false);
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : recommendations ? (
                  <div className="w-full text-left space-y-4 overflow-auto max-h-full">
                    {/* Summary */}
                    <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                      <p className="text-sm text-[var(--foreground)]">{recommendations.summary}</p>
                    </div>

                    {/* Quick wins as chips */}
                    {recommendations.quick_wins && recommendations.quick_wins.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-2 flex items-center gap-1">
                          <IconCheckCircle className="h-3 w-3" /> Quick wins
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {recommendations.quick_wins.map((qw, i) => (
                            <button
                              key={i}
                              onClick={() => { trackEvent("quickwin.clicked", { item: qw }); void sendMessage(`How do I: ${qw}`); }}
                              className="px-2.5 py-1.5 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs transition-colors text-left"
                            >
                              {qw}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top recommendations as expandable cards */}
                    {recommendations.top_recommendations && recommendations.top_recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-2 flex items-center gap-1">
                          <IconSparkles className="h-3 w-3" /> Recommendations
                        </p>
                        <div className="space-y-2">
                          {recommendations.top_recommendations.map((rec, i) => {
                            const { label: recTitle, confidence: recConf, actionId: recAction } = parseTitleTags(rec.title);
                            const isApplied = recAction ? appliedActions.has(recAction) : false;
                            const isApplying = recAction ? applyingAction === recAction : false;
                            const hasApplyError = recAction ? applyError === recAction : false;
                            return (
                            <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                              <button
                                onClick={() => { setExpandedRec(expandedRec === i ? null : i); if (expandedRec !== i) trackEvent("rec.expanded", { index: i, title: recTitle }); }}
                                className="w-full text-left p-3 flex items-start justify-between gap-2 hover:bg-[var(--muted)] transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-[var(--foreground)]">{recTitle}</div>
                                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-2">
                                    <span>{rec.expected_impact}</span>
                                    {recConf !== null && (
                                      <span className={cn("text-[10px] font-medium", recConf > 0.7 ? "text-green-500" : recConf > 0.5 ? "text-yellow-500" : "text-orange-500")}>
                                        {formatPct(recConf)} confidence
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge className="shrink-0 text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)]">{rec.effort}</Badge>
                              </button>
                              {expandedRec === i && (
                                <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)] pt-2">
                                  <p className="text-xs text-[var(--muted-foreground)]">{rec.why_it_matters}</p>
                                  <div className="space-y-1">
                                    {rec.steps_in_app.map((step, si) => (
                                      <div key={si} className="flex items-start gap-2 text-xs text-[var(--foreground)]">
                                        <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--muted)] flex items-center justify-center text-[10px] font-semibold mt-0.5">{si + 1}</span>
                                        <span>{step}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {recAction && (
                                    <div className="pt-1">
                                      {isFree ? (
                                        <Button
                                          size="sm"
                                          variant="secondary"
                                          onClick={(e) => { e.stopPropagation(); trackEvent("ai_upgrade_to_apply_clicked"); router.push("/admin/billing"); }}
                                          className="text-xs h-7 opacity-80"
                                        >
                                          Upgrade to apply this
                                        </Button>
                                      ) : isApplied ? (
                                        <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium">
                                          <IconCheckCircle className="h-3.5 w-3.5" /> Applied
                                        </span>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="default"
                                          disabled={isApplying}
                                          onClick={(e) => { e.stopPropagation(); void handleApplyAction(recAction); }}
                                          className="text-xs h-7"
                                        >
                                          {isApplying ? <><IconSpinner className="h-3 w-3 animate-spin mr-1" /> Applying...</> : "Apply"}
                                        </Button>
                                      )}
                                      {hasApplyError && (
                                        <span className="ml-2 text-xs text-red-400">Failed — try again</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Risks / gaps — collapsible */}
                    {recommendations.risks_or_gaps && recommendations.risks_or_gaps.length > 0 && (
                      <div>
                        <button
                          onClick={() => { if (!showRisks) trackEvent("risks.opened"); setShowRisks(!showRisks); }}
                          className="text-xs font-semibold text-[var(--muted-foreground)] mb-2 flex items-center gap-1 hover:text-[var(--foreground)] transition-colors"
                        >
                          <IconAlertTriangle className="h-3 w-3" /> Things to watch {showRisks ? "▾" : "▸"}
                        </button>
                        {showRisks && (
                          <div className="space-y-1.5">
                            {recommendations.risks_or_gaps.map((risk, i) => (
                              <div key={i} className="text-xs text-[var(--muted-foreground)] p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                {risk}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Weekly digest note for paid users */}
                    {!isFree && (
                      <p className="text-[10px] text-[var(--muted-foreground)] text-center">You'll receive a weekly setup digest by email.</p>
                    )}

                    {/* Upgrade CTA for free tier */}
                    {isFree && (
                      <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5 p-4 space-y-3">
                        <div className="text-sm font-semibold text-[var(--foreground)]">Unlock Smart CRM Assistant</div>
                        <ul className="text-xs text-[var(--muted-foreground)] space-y-1.5">
                          <li className="flex items-start gap-2"><IconCheckCircle className="h-3.5 w-3.5 text-[var(--primary)] shrink-0 mt-0.5" /> Personalised recommendations based on your CRM usage</li>
                          <li className="flex items-start gap-2"><IconCheckCircle className="h-3.5 w-3.5 text-[var(--primary)] shrink-0 mt-0.5" /> Confidence scoring</li>
                          <li className="flex items-start gap-2"><IconCheckCircle className="h-3.5 w-3.5 text-[var(--primary)] shrink-0 mt-0.5" /> One-click apply actions</li>
                        </ul>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => { trackEvent("ai_upgrade_cta_clicked"); router.push("/admin/billing"); }}
                          className="w-full text-xs"
                        >
                          Upgrade to Pro
                        </Button>
                        <p className="text-[10px] text-[var(--muted-foreground)] text-center">Takes under 1 minute &bull; Cancel anytime</p>
                      </div>
                    )}

                    {/* Prompt suggestions */}
                    {derivedPrompts.length > 0 && (
                      <div className="pt-2 border-t border-[var(--border)]">
                        <p className="text-xs text-[var(--muted-foreground)] mb-2">Or ask me anything:</p>
                        <div className="space-y-1.5">
                          {derivedPrompts.map((prompt) => (
                            <button
                              key={prompt}
                              onClick={() => void sendMessage(prompt)}
                              className="w-full text-left p-2 rounded-lg bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] text-xs transition-colors"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="h-16 w-16 rounded-2xl bg-[var(--card)] flex items-center justify-center mb-4">
                      <IconSparkles className="h-8 w-8 text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-[var(--muted-foreground)] text-sm mb-4">How can I help you today?</p>
                    {derivedPrompts.length > 0 && (
                      <div className="w-full space-y-2">
                        {derivedPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            onClick={() => void sendMessage(prompt)}
                            className="w-full text-left p-2.5 rounded-lg bg-[var(--card)] hover:bg-[var(--muted)] text-[var(--muted-foreground)] text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && (
                      <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                        <IconRobot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl p-3",
                        m.role === "user" ? "text-white" : "bg-[var(--card)] text-[var(--foreground)]"
                      )}
                      style={m.role === "user" ? { backgroundColor: accentColor } : undefined}
                    >
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>

                      {typeof m.confidence === "number" && m.role === "assistant" && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="h-1 flex-1 bg-[var(--muted)] rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                m.confidence > 0.7 ? "bg-green-500" : m.confidence > 0.4 ? "bg-yellow-500" : "bg-red-500"
                              )}
                              style={{ width: `${Math.max(0, Math.min(1, m.confidence)) * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[var(--muted-foreground)]">{formatPct(m.confidence)}</span>
                        </div>
                      )}

                      {m.suggestedActions?.length ? (
                        <div className="mt-2 pt-2 border-t border-[var(--border)]">
                          <p className="text-[10px] text-[var(--muted-foreground)] mb-1 flex items-center gap-1">
                            <IconCheckCircle className="h-3 w-3" /> Actions
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {m.suggestedActions.map((a, i) => (
                              <Badge
                                key={`${a.type}-${i}`}
                                className="text-[10px] bg-[var(--muted)] text-[var(--foreground)] cursor-pointer hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1"
                                onClick={() => void handleAction(a)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    void handleAction(a);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                              >
                                {a.label}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {m.citations?.length ? (
                        <div className="mt-2 pt-2 border-t border-[var(--border)]">
                          <p className="text-[10px] text-blue-300 mb-1 flex items-center gap-1">
                            <IconFile className="h-3 w-3" /> Sources
                          </p>
                          {m.citations.slice(0, 3).map((c, i) => (
                            <div key={`${c.entityType}-${c.entityId}-${i}`} className="text-[10px] text-[var(--muted-foreground)]">
                              <span className="mr-1 rounded border border-[var(--border)] px-1 py-[1px] text-[9px]">{c.entityType}</span>
                              {c.note} ({c.entityId})
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {m.explain && (
                        <ExplainPanel explain={m.explain} messageId={m.id} />
                      )}

                      {m.error ? (
                        <div className="mt-2 flex items-center gap-1 text-red-300 text-[10px]">
                          <IconAlertCircle className="h-3 w-3" /> {m.error}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2">
                    <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                      <IconRobot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-[var(--card)] rounded-2xl p-3">
                      <IconSpinner className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </CardContent>

        <div className="p-3 border-t border-[var(--border)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading || !aiConfigured}
              className="flex-1 h-10 px-3 rounded-lg border bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: accentColor }}
              aria-label="Ask the AI assistant a question"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading || !aiConfigured}
              className="h-10 w-10 p-0"
              style={{ backgroundColor: accentColor }}
            >
              {isLoading ? <IconSpinner className="h-4 w-4 animate-spin" /> : <IconSend className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
