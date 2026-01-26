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
  }, []);

  return null;
}
