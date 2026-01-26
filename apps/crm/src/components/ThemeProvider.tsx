"use client";

import { useEffect, createContext, useContext, useState, ReactNode } from "react";
import {
  ThemeConfig,
  themes,
  getThemeById,
  getDefaultTheme,
  applyThemeToDOM,
  persistTheme,
  loadPersistedTheme,
} from "@/lib/themes";

interface ThemeContextValue {
  theme: ThemeConfig | null;
  themes: ThemeConfig[];
  setTheme: (themeOrId: ThemeConfig | string) => void;
  isLoaded: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize theme on mount
    const persisted = loadPersistedTheme();
    const theme = persisted || getDefaultTheme();
    setCurrentTheme(theme);
    applyThemeToDOM(theme);
    setIsLoaded(true);
  }, []);

  const setTheme = (themeOrId: ThemeConfig | string) => {
    const theme =
      typeof themeOrId === "string" ? getThemeById(themeOrId) : themeOrId;
    if (!theme) return;

    setCurrentTheme(theme);
    applyThemeToDOM(theme);
    persistTheme(theme.id);
  };

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themes, setTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
