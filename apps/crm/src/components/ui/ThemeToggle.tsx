"use client";

import { useEffect, useState } from "react";

// Inline SVG icons to avoid lucide-react compatibility issues
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // Check localStorage first, then system preference
    const stored = localStorage.getItem("qt-theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      // Use system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("qt-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  if (theme === null) {
    // Avoid hydration mismatch
    return (
      <button
        className={`p-2 rounded-xl bg-[var(--muted)] text-[var(--muted-foreground)] ${className}`}
        aria-label="Toggle theme"
      >
        <SunIcon />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl bg-[var(--muted)] hover:bg-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-all duration-200 ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
