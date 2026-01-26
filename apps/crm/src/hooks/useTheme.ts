"use client";

import { useEffect, useState, useCallback } from "react";
import {
  themes,
  ThemeConfig,
  getThemeById,
  getDefaultTheme,
  applyThemeToDOM,
  persistTheme,
  loadPersistedTheme,
  THEME_STORAGE_KEY,
} from "@/lib/themes";

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const persisted = loadPersistedTheme();
    const theme = persisted || getDefaultTheme();
    setCurrentTheme(theme);
    applyThemeToDOM(theme);
    setIsLoaded(true);
  }, []);

  const setTheme = useCallback((themeOrId: ThemeConfig | string) => {
    const theme =
      typeof themeOrId === "string" ? getThemeById(themeOrId) : themeOrId;
    if (!theme) return;

    setCurrentTheme(theme);
    applyThemeToDOM(theme);
    persistTheme(theme.id);
  }, []);

  const resetToDefault = useCallback(() => {
    const defaultTheme = getDefaultTheme();
    setTheme(defaultTheme);
  }, [setTheme]);

  return {
    theme: currentTheme,
    themes,
    setTheme,
    resetToDefault,
    isLoaded,
    isDark: currentTheme?.isDark ?? true,
  };
}

/**
 * Hook to initialize theme on app load (use once at root layout)
 */
export function useThemeInit() {
  useEffect(() => {
    const persisted = loadPersistedTheme();
    const theme = persisted || getDefaultTheme();
    applyThemeToDOM(theme);
  }, []);
}
