/**
 * Tests for themes module
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  themes,
  getThemeById,
  getDefaultTheme,
  applyThemeToDOM,
  persistTheme,
  loadPersistedTheme,
  THEME_STORAGE_KEY,
  type ThemeConfig,
  type ThemeTokens,
} from "./themes";

describe("themes", () => {
  describe("themes array", () => {
    it("should have multiple themes", () => {
      expect(themes.length).toBeGreaterThan(0);
    });

    it("should have midnight as default theme", () => {
      const midnight = themes.find((t) => t.id === "midnight");
      expect(midnight).toBeDefined();
      expect(midnight?.isDark).toBe(true);
    });

    it("should have unique ids for all themes", () => {
      const ids = themes.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should have required properties on all themes", () => {
      for (const theme of themes) {
        expect(theme.id).toBeTruthy();
        expect(theme.name).toBeTruthy();
        expect(theme.description).toBeTruthy();
        expect(typeof theme.isDark).toBe("boolean");
        expect(theme.preview).toBeTruthy();
        expect(theme.tokens).toBeDefined();
      }
    });

    it("should have all required token properties", () => {
      const requiredTokens: (keyof ThemeTokens)[] = [
        "bg", "surface", "surface2", "border",
        "text", "textMuted",
        "primary", "primaryLight", "primaryDark", "primaryContrast",
        "accent", "accentLight", "accentDark", "accentContrast",
        "success", "successContrast",
        "warning", "warningContrast",
        "danger", "dangerContrast",
        "ring", "shadow", "glassBg", "glassBorder",
      ];

      for (const theme of themes) {
        for (const token of requiredTokens) {
          expect(theme.tokens[token], `${theme.id} missing ${token}`).toBeDefined();
        }
      }
    });
  });

  describe("getThemeById", () => {
    it("should return theme by id", () => {
      const theme = getThemeById("midnight");
      expect(theme).toBeDefined();
      expect(theme?.id).toBe("midnight");
    });

    it("should return undefined for unknown id", () => {
      expect(getThemeById("nonexistent")).toBeUndefined();
    });

    it("should return ocean theme", () => {
      const theme = getThemeById("ocean");
      expect(theme?.name).toBe("Ocean Blue");
    });

    it("should return forest theme", () => {
      const theme = getThemeById("forest");
      expect(theme?.name).toBe("Forest Green");
    });
  });

  describe("getDefaultTheme", () => {
    it("should return midnight theme", () => {
      const theme = getDefaultTheme();
      expect(theme.id).toBe("midnight");
    });

    it("should return a dark theme", () => {
      const theme = getDefaultTheme();
      expect(theme.isDark).toBe(true);
    });
  });

  describe("applyThemeToDOM", () => {
    let mockRoot: {
      style: {
        setProperty: ReturnType<typeof vi.fn>;
      };
      setAttribute: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockRoot = {
        style: {
          setProperty: vi.fn(),
        },
        setAttribute: vi.fn(),
      };

      vi.stubGlobal("document", {
        documentElement: mockRoot,
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should set color-scheme for dark theme", () => {
      const theme = getThemeById("midnight")!;
      applyThemeToDOM(theme);

      expect(mockRoot.style.setProperty).toHaveBeenCalledWith("color-scheme", "dark");
    });

    it("should set color-scheme for light theme", () => {
      const theme = getThemeById("ocean")!;
      applyThemeToDOM(theme);

      expect(mockRoot.style.setProperty).toHaveBeenCalledWith("color-scheme", "light");
    });

    it("should set background CSS variable", () => {
      const theme = getThemeById("midnight")!;
      applyThemeToDOM(theme);

      expect(mockRoot.style.setProperty).toHaveBeenCalledWith("--background", theme.tokens.bg);
    });

    it("should set primary CSS variable", () => {
      const theme = getThemeById("midnight")!;
      applyThemeToDOM(theme);

      expect(mockRoot.style.setProperty).toHaveBeenCalledWith("--primary", theme.tokens.primary);
    });

    it("should set data-palette attribute", () => {
      const theme = getThemeById("ocean")!;
      applyThemeToDOM(theme);

      expect(mockRoot.setAttribute).toHaveBeenCalledWith("data-palette", "ocean");
    });

    it("should set data-theme-mode attribute", () => {
      const theme = getThemeById("midnight")!;
      applyThemeToDOM(theme);

      expect(mockRoot.setAttribute).toHaveBeenCalledWith("data-theme-mode", "dark");
    });

    it("should set legacy qt-theme vars", () => {
      const theme = getThemeById("midnight")!;
      applyThemeToDOM(theme);

      expect(mockRoot.style.setProperty).toHaveBeenCalledWith("--qt-theme-primary", theme.tokens.primary);
      expect(mockRoot.style.setProperty).toHaveBeenCalledWith("--qt-theme-accent", theme.tokens.accent);
    });
  });

  describe("persistTheme", () => {
    let mockLocalStorage: {
      setItem: ReturnType<typeof vi.fn>;
      getItem: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockLocalStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
      };

      vi.stubGlobal("window", { localStorage: mockLocalStorage });
      vi.stubGlobal("localStorage", mockLocalStorage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should save theme id to localStorage", () => {
      persistTheme("ocean");

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "ocean");
    });
  });

  describe("loadPersistedTheme", () => {
    let mockLocalStorage: {
      getItem: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockLocalStorage = {
        getItem: vi.fn(),
      };

      vi.stubGlobal("window", { localStorage: mockLocalStorage });
      vi.stubGlobal("localStorage", mockLocalStorage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should return null when no saved theme", () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      expect(loadPersistedTheme()).toBeNull();
    });

    it("should return theme when saved", () => {
      mockLocalStorage.getItem.mockReturnValue("ocean");

      const theme = loadPersistedTheme();
      expect(theme?.id).toBe("ocean");
    });

    it("should return null for invalid saved theme", () => {
      mockLocalStorage.getItem.mockReturnValue("nonexistent");

      expect(loadPersistedTheme()).toBeNull();
    });
  });

  describe("THEME_STORAGE_KEY", () => {
    it("should be a string constant", () => {
      expect(typeof THEME_STORAGE_KEY).toBe("string");
      expect(THEME_STORAGE_KEY).toBe("qt-palette-theme");
    });
  });
});
