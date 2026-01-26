/**
 * Quantract CRM Theme System
 * Complete CSS variable sets for each palette
 */

export interface ThemeTokens {
  // Core backgrounds
  bg: string;
  surface: string;
  surface2: string;
  border: string;

  // Text
  text: string;
  textMuted: string;

  // Primary
  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryContrast: string;

  // Accent
  accent: string;
  accentLight: string;
  accentDark: string;
  accentContrast: string;

  // Semantic
  success: string;
  successContrast: string;
  warning: string;
  warningContrast: string;
  danger: string;
  dangerContrast: string;

  // Effects
  ring: string;
  shadow: string;
  glassBg: string;
  glassBorder: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  preview: string; // Tailwind gradient classes
  tokens: ThemeTokens;
}

/**
 * Compute luminance and return appropriate contrast color
 */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#0f172a" : "#ffffff";
}

/**
 * Lighten a hex color by a percentage
 */
function lighten(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const amt = Math.round(2.55 * percent);
  return `#${Math.min(255, r + amt).toString(16).padStart(2, "0")}${Math.min(255, g + amt).toString(16).padStart(2, "0")}${Math.min(255, b + amt).toString(16).padStart(2, "0")}`;
}

/**
 * Darken a hex color by a percentage
 */
function darken(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const amt = Math.round(2.55 * percent);
  return `#${Math.max(0, r - amt).toString(16).padStart(2, "0")}${Math.max(0, g - amt).toString(16).padStart(2, "0")}${Math.max(0, b - amt).toString(16).padStart(2, "0")}`;
}

export const themes: ThemeConfig[] = [
  {
    id: "midnight",
    name: "Midnight Dark",
    description: "Sleek and modern (Default)",
    isDark: true,
    preview: "from-indigo-500 to-cyan-400",
    tokens: {
      bg: "#0f1115",
      surface: "#1a1f2e",
      surface2: "#232a3b",
      border: "#3f4a5f",
      text: "#f8fafc",
      textMuted: "#94a3b8",
      primary: "#6366f1",
      primaryLight: "#818cf8",
      primaryDark: "#4f46e5",
      primaryContrast: "#ffffff",
      accent: "#22d3ee",
      accentLight: "#67e8f9",
      accentDark: "#06b6d4",
      accentContrast: "#0f172a",
      success: "#10b981",
      successContrast: "#ffffff",
      warning: "#f59e0b",
      warningContrast: "#0f172a",
      danger: "#ef4444",
      dangerContrast: "#ffffff",
      ring: "#6366f1",
      shadow: "rgba(0, 0, 0, 0.3)",
      glassBg: "rgba(30, 41, 59, 0.8)",
      glassBorder: "rgba(51, 65, 85, 0.5)",
    },
  },
  {
    id: "ocean",
    name: "Ocean Blue",
    description: "Professional and calming",
    isDark: false,
    preview: "from-blue-500 to-cyan-500",
    tokens: {
      bg: "#f0f9ff",
      surface: "#ffffff",
      surface2: "#e0f2fe",
      border: "#bae6fd",
      text: "#0c4a6e",
      textMuted: "#0369a1",
      primary: "#3b82f6",
      primaryLight: "#60a5fa",
      primaryDark: "#2563eb",
      primaryContrast: "#ffffff",
      accent: "#06b6d4",
      accentLight: "#22d3ee",
      accentDark: "#0891b2",
      accentContrast: "#ffffff",
      success: "#059669",
      successContrast: "#ffffff",
      warning: "#d97706",
      warningContrast: "#ffffff",
      danger: "#dc2626",
      dangerContrast: "#ffffff",
      ring: "#3b82f6",
      shadow: "rgba(14, 165, 233, 0.15)",
      glassBg: "rgba(255, 255, 255, 0.8)",
      glassBorder: "rgba(186, 230, 253, 0.5)",
    },
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    description: "Warm and energetic",
    isDark: false,
    preview: "from-orange-500 to-pink-500",
    tokens: {
      bg: "#fffbeb",
      surface: "#ffffff",
      surface2: "#fef3c7",
      border: "#fcd34d",
      text: "#78350f",
      textMuted: "#92400e",
      primary: "#f97316",
      primaryLight: "#fb923c",
      primaryDark: "#ea580c",
      primaryContrast: "#ffffff",
      accent: "#ec4899",
      accentLight: "#f472b6",
      accentDark: "#db2777",
      accentContrast: "#ffffff",
      success: "#059669",
      successContrast: "#ffffff",
      warning: "#d97706",
      warningContrast: "#ffffff",
      danger: "#dc2626",
      dangerContrast: "#ffffff",
      ring: "#f97316",
      shadow: "rgba(249, 115, 22, 0.15)",
      glassBg: "rgba(255, 255, 255, 0.8)",
      glassBorder: "rgba(253, 186, 116, 0.5)",
    },
  },
  {
    id: "forest",
    name: "Forest Green",
    description: "Natural and growth",
    isDark: false,
    preview: "from-green-500 to-teal-500",
    tokens: {
      bg: "#ecfdf5",
      surface: "#ffffff",
      surface2: "#d1fae5",
      border: "#6ee7b7",
      text: "#064e3b",
      textMuted: "#047857",
      primary: "#22c55e",
      primaryLight: "#4ade80",
      primaryDark: "#16a34a",
      primaryContrast: "#ffffff",
      accent: "#14b8a6",
      accentLight: "#2dd4bf",
      accentDark: "#0d9488",
      accentContrast: "#ffffff",
      success: "#059669",
      successContrast: "#ffffff",
      warning: "#d97706",
      warningContrast: "#ffffff",
      danger: "#dc2626",
      dangerContrast: "#ffffff",
      ring: "#22c55e",
      shadow: "rgba(34, 197, 94, 0.15)",
      glassBg: "rgba(255, 255, 255, 0.8)",
      glassBorder: "rgba(110, 231, 183, 0.5)",
    },
  },
  {
    id: "purple",
    name: "Purple Haze",
    description: "Creative and premium",
    isDark: false,
    preview: "from-violet-500 to-fuchsia-500",
    tokens: {
      bg: "#faf5ff",
      surface: "#ffffff",
      surface2: "#f3e8ff",
      border: "#d8b4fe",
      text: "#3b0764",
      textMuted: "#6b21a8",
      primary: "#8b5cf6",
      primaryLight: "#a78bfa",
      primaryDark: "#7c3aed",
      primaryContrast: "#ffffff",
      accent: "#d946ef",
      accentLight: "#e879f9",
      accentDark: "#c026d3",
      accentContrast: "#ffffff",
      success: "#059669",
      successContrast: "#ffffff",
      warning: "#d97706",
      warningContrast: "#ffffff",
      danger: "#dc2626",
      dangerContrast: "#ffffff",
      ring: "#8b5cf6",
      shadow: "rgba(139, 92, 246, 0.15)",
      glassBg: "rgba(255, 255, 255, 0.8)",
      glassBorder: "rgba(216, 180, 254, 0.5)",
    },
  },
  {
    id: "rose",
    name: "Rose Gold",
    description: "Elegant and refined",
    isDark: false,
    preview: "from-rose-600 to-pink-400",
    tokens: {
      bg: "#fff1f2",
      surface: "#ffffff",
      surface2: "#ffe4e6",
      border: "#fda4af",
      text: "#4c0519",
      textMuted: "#9f1239",
      primary: "#e11d48",
      primaryLight: "#fb7185",
      primaryDark: "#be123c",
      primaryContrast: "#ffffff",
      accent: "#fb7185",
      accentLight: "#fda4af",
      accentDark: "#f43f5e",
      accentContrast: "#ffffff",
      success: "#059669",
      successContrast: "#ffffff",
      warning: "#d97706",
      warningContrast: "#ffffff",
      danger: "#dc2626",
      dangerContrast: "#ffffff",
      ring: "#e11d48",
      shadow: "rgba(225, 29, 72, 0.15)",
      glassBg: "rgba(255, 255, 255, 0.8)",
      glassBorder: "rgba(253, 164, 175, 0.5)",
    },
  },
  {
    id: "ember",
    name: "Ember Red",
    description: "Bold and powerful",
    isDark: false,
    preview: "from-red-600 to-amber-500",
    tokens: {
      bg: "#fef2f2",
      surface: "#ffffff",
      surface2: "#fee2e2",
      border: "#fca5a5",
      text: "#450a0a",
      textMuted: "#991b1b",
      primary: "#dc2626",
      primaryLight: "#f87171",
      primaryDark: "#b91c1c",
      primaryContrast: "#ffffff",
      accent: "#f59e0b",
      accentLight: "#fbbf24",
      accentDark: "#d97706",
      accentContrast: "#0f172a",
      success: "#059669",
      successContrast: "#ffffff",
      warning: "#d97706",
      warningContrast: "#ffffff",
      danger: "#dc2626",
      dangerContrast: "#ffffff",
      ring: "#dc2626",
      shadow: "rgba(220, 38, 38, 0.15)",
      glassBg: "rgba(255, 255, 255, 0.8)",
      glassBorder: "rgba(252, 165, 165, 0.5)",
    },
  },
  {
    id: "arctic",
    name: "Arctic Frost",
    description: "Clean and minimal",
    isDark: false,
    preview: "from-sky-500 to-slate-400",
    tokens: {
      bg: "#f8fafc",
      surface: "#ffffff",
      surface2: "#f1f5f9",
      border: "#cbd5e1",
      text: "#0f172a",
      textMuted: "#475569",
      primary: "#0ea5e9",
      primaryLight: "#38bdf8",
      primaryDark: "#0284c7",
      primaryContrast: "#ffffff",
      accent: "#64748b",
      accentLight: "#94a3b8",
      accentDark: "#475569",
      accentContrast: "#ffffff",
      success: "#059669",
      successContrast: "#ffffff",
      warning: "#d97706",
      warningContrast: "#ffffff",
      danger: "#dc2626",
      dangerContrast: "#ffffff",
      ring: "#0ea5e9",
      shadow: "rgba(14, 165, 233, 0.1)",
      glassBg: "rgba(255, 255, 255, 0.8)",
      glassBorder: "rgba(203, 213, 225, 0.5)",
    },
  },
];

export const THEME_STORAGE_KEY = "qt-palette-theme";

export function getThemeById(id: string): ThemeConfig | undefined {
  return themes.find((t) => t.id === id);
}

export function getDefaultTheme(): ThemeConfig {
  return themes.find((t) => t.id === "midnight")!;
}

/**
 * Apply theme tokens to document root as CSS variables
 */
export function applyThemeToDOM(theme: ThemeConfig) {
  const root = document.documentElement;
  const t = theme.tokens;

  // Set color-scheme for native UI elements (scrollbars, form controls, etc.)
  root.style.setProperty("color-scheme", theme.isDark ? "dark" : "light");

  // Core backgrounds
  root.style.setProperty("--background", t.bg);
  root.style.setProperty("--foreground", t.text);
  root.style.setProperty("--card", t.surface);
  root.style.setProperty("--card-foreground", t.text);
  root.style.setProperty("--muted", t.surface2);
  root.style.setProperty("--muted-foreground", t.textMuted);
  root.style.setProperty("--border", t.border);

  // Popover (uses surface + text)
  root.style.setProperty("--popover", t.surface);
  root.style.setProperty("--popover-foreground", t.text);

  // Secondary (uses surface2 + text)
  root.style.setProperty("--secondary", t.surface2);
  root.style.setProperty("--secondary-foreground", t.text);

  // Input (uses surface + text)
  root.style.setProperty("--input", t.surface);
  root.style.setProperty("--input-foreground", t.text);

  // Primary colors
  root.style.setProperty("--primary", t.primary);
  root.style.setProperty("--primary-light", t.primaryLight);
  root.style.setProperty("--primary-dark", t.primaryDark);
  root.style.setProperty("--primary-foreground", t.primaryContrast);

  // Accent colors
  root.style.setProperty("--accent", t.accent);
  root.style.setProperty("--accent-light", t.accentLight);
  root.style.setProperty("--accent-dark", t.accentDark);
  root.style.setProperty("--accent-foreground", t.accentContrast);

  // Semantic colors
  root.style.setProperty("--success", t.success);
  root.style.setProperty("--success-foreground", t.successContrast);
  root.style.setProperty("--warning", t.warning);
  root.style.setProperty("--warning-foreground", t.warningContrast);
  root.style.setProperty("--error", t.danger);
  root.style.setProperty("--error-light", lighten(t.danger, 15));
  root.style.setProperty("--error-foreground", t.dangerContrast);

  // Destructive (alias for error, shadcn/radix compat)
  root.style.setProperty("--destructive", t.danger);
  root.style.setProperty("--destructive-foreground", t.dangerContrast);

  // Effects
  root.style.setProperty("--ring", t.ring);
  root.style.setProperty("--shadow-color", t.shadow);
  root.style.setProperty("--glass-bg", t.glassBg);
  root.style.setProperty("--glass-border", t.glassBorder);

  // Legacy qt-theme vars for backwards compatibility
  root.style.setProperty("--qt-theme-primary", t.primary);
  root.style.setProperty("--qt-theme-accent", t.accent);
  root.style.setProperty("--qt-theme-bg", t.bg);
  root.style.setProperty("--qt-theme-text", t.text);

  // Set data attribute for CSS selectors
  root.setAttribute("data-palette", theme.id);
  root.setAttribute("data-theme-mode", theme.isDark ? "dark" : "light");
}

/**
 * Persist theme selection to localStorage
 */
export function persistTheme(themeId: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }
}

/**
 * Load persisted theme from localStorage
 */
export function loadPersistedTheme(): ThemeConfig | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem(THEME_STORAGE_KEY);
  if (!id) return null;
  return getThemeById(id) || null;
}
