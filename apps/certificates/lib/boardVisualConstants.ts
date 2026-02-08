// ── Status colour maps for visual board view ──
// Shared across BreakerCircle, SummaryStatsBar, etc.

import type { LucideIcon } from "lucide-react";
import { Check, X, AlertTriangle, HelpCircle, Minus } from "lucide-react";

// Background colours (used in table view status pills)
export const STATUS_BG: Record<string, string> = {
  Pass: "rgba(16,185,129,0.15)",
  C1: "rgba(153,27,27,0.2)",
  C2: "rgba(239,68,68,0.15)",
  C3: "rgba(245,158,11,0.15)",
  FI: "rgba(37,99,235,0.15)",
  LIM: "rgba(100,116,139,0.15)",
  "N/V": "rgba(100,116,139,0.1)",
  "N/A": "rgba(100,116,139,0.1)",
};

// Text colours (used in table view status pills)
export const STATUS_TEXT: Record<string, string> = {
  Pass: "var(--success)",
  C1: "#991B1B",
  C2: "var(--error)",
  C3: "var(--warning)",
  FI: "#2563EB",
  LIM: "var(--muted-foreground)",
  "N/V": "var(--muted-foreground)",
  "N/A": "var(--muted-foreground)",
};

// Tailwind border classes for breaker circles
export const STATUS_BORDER: Record<string, string> = {
  Pass: "border-emerald-500",
  C1: "border-red-600",
  C2: "border-red-500",
  C3: "border-amber-500",
  FI: "border-blue-500",
  "": "border-gray-600",
  LIM: "border-gray-500",
  "N/A": "border-gray-500",
  "N/V": "border-gray-500",
};

// CSS box-shadow glow strings for hover
export const STATUS_GLOW: Record<string, string> = {
  Pass: "0 0 12px rgba(16,185,129,0.4)",
  C1: "0 0 12px rgba(153,27,27,0.5)",
  C2: "0 0 12px rgba(239,68,68,0.4)",
  C3: "0 0 12px rgba(245,158,11,0.4)",
  FI: "0 0 12px rgba(37,99,235,0.4)",
  "": "0 0 8px rgba(100,116,139,0.2)",
  LIM: "0 0 8px rgba(100,116,139,0.3)",
  "N/A": "0 0 8px rgba(100,116,139,0.2)",
  "N/V": "0 0 8px rgba(100,116,139,0.2)",
};

// Lucide icon for each status
export const STATUS_ICON: Record<string, LucideIcon> = {
  Pass: Check,
  C1: X,
  C2: X,
  C3: AlertTriangle,
  FI: HelpCircle,
  LIM: Minus,
  "N/A": Minus,
  "N/V": Minus,
};

// Statuses that render with dashed borders
export const STATUS_DASHED = new Set(["LIM", "N/A", "N/V"]);

// Solid background colours for status icon dots
export const STATUS_DOT_BG: Record<string, string> = {
  Pass: "bg-emerald-500",
  C1: "bg-red-700",
  C2: "bg-red-500",
  C3: "bg-amber-500",
  FI: "bg-blue-500",
  LIM: "bg-gray-500",
  "N/A": "bg-gray-500",
  "N/V": "bg-gray-500",
};

// Phase colours for 3-phase layout
export const PHASE_COLORS: Record<string, string> = {
  L1: "#EF4444",
  L2: "#F59E0B",
  L3: "#3B82F6",
};
