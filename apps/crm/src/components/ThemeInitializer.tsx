"use client";

import { useEffect } from "react";
import { loadPersistedTheme, getDefaultTheme, applyThemeToDOM } from "@/lib/themes";

/**
 * Client component that initializes the theme on app load.
 * This runs once when the app mounts and applies the persisted theme.
 */
export function ThemeInitializer() {
  useEffect(() => {
    const persisted = loadPersistedTheme();
    const theme = persisted || getDefaultTheme();
    applyThemeToDOM(theme);

    // Clean up orphaned legacy key from old theme system
    try { localStorage.removeItem("qt-theme"); } catch { /* ignore */ }
  }, []);

  return null;
}
