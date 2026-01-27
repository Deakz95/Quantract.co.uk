/**
 * Tests for quoteStore (client-side localStorage store)
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  defaultQuoteSettings,
  getQuoteSettings,
  upsertQuoteSettings,
  lockQuoteSettings,
  rebalanceLastStage,
  clampPct,
  sumStagePct,
  setDepositPct,
  type QuoteSettings,
  type PaymentStage,
} from "./quoteStore";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
});

describe("quoteStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("clampPct", () => {
    it("should clamp to 0-100 range", () => {
      expect(clampPct(50)).toBe(50);
      expect(clampPct(0)).toBe(0);
      expect(clampPct(100)).toBe(100);
    });

    it("should clamp values below 0", () => {
      expect(clampPct(-10)).toBe(0);
      expect(clampPct(-100)).toBe(0);
    });

    it("should clamp values above 100", () => {
      expect(clampPct(150)).toBe(100);
      expect(clampPct(200)).toBe(100);
    });

    it("should round to integers", () => {
      expect(clampPct(50.4)).toBe(50);
      expect(clampPct(50.5)).toBe(51);
      expect(clampPct(50.9)).toBe(51);
    });

    it("should return 0 for NaN", () => {
      expect(clampPct(NaN)).toBe(0);
    });

    it("should return 0 for Infinity", () => {
      expect(clampPct(Infinity)).toBe(0);
      expect(clampPct(-Infinity)).toBe(0);
    });
  });

  describe("defaultQuoteSettings", () => {
    it("should create default settings with correct quoteId", () => {
      const settings = defaultQuoteSettings("quote-123");
      expect(settings.quoteId).toBe("quote-123");
    });

    it("should have 30% deposit by default", () => {
      const settings = defaultQuoteSettings("quote-123");
      expect(settings.depositPct).toBe(30);
    });

    it("should have two stages by default", () => {
      const settings = defaultQuoteSettings("quote-123");
      expect(settings.stages).toHaveLength(2);
    });

    it("should have deposit stage as first", () => {
      const settings = defaultQuoteSettings("quote-123");
      expect(settings.stages[0].id).toBe("deposit");
      expect(settings.stages[0].label).toBe("Deposit");
      expect(settings.stages[0].pct).toBe(30);
    });

    it("should have final stage as second", () => {
      const settings = defaultQuoteSettings("quote-123");
      expect(settings.stages[1].id).toBe("final");
      expect(settings.stages[1].label).toBe("Final");
      expect(settings.stages[1].pct).toBe(70);
    });

    it("should have updatedAtISO timestamp", () => {
      const settings = defaultQuoteSettings("quote-123");
      expect(settings.updatedAtISO).toBeDefined();
      expect(new Date(settings.updatedAtISO!).getTime()).toBeGreaterThan(0);
    });
  });

  describe("sumStagePct", () => {
    it("should sum percentages correctly", () => {
      const stages: PaymentStage[] = [
        { id: "1", label: "Stage 1", pct: 30 },
        { id: "2", label: "Stage 2", pct: 70 },
      ];
      expect(sumStagePct(stages)).toBe(100);
    });

    it("should return 0 for empty array", () => {
      expect(sumStagePct([])).toBe(0);
    });

    it("should clamp individual percentages", () => {
      const stages: PaymentStage[] = [
        { id: "1", label: "Stage 1", pct: -10 },
        { id: "2", label: "Stage 2", pct: 150 },
      ];
      expect(sumStagePct(stages)).toBe(100); // 0 + 100
    });

    it("should handle single stage", () => {
      const stages: PaymentStage[] = [{ id: "1", label: "Stage 1", pct: 100 }];
      expect(sumStagePct(stages)).toBe(100);
    });
  });

  describe("rebalanceLastStage", () => {
    it("should set last stage to make total 100%", () => {
      const stages: PaymentStage[] = [
        { id: "1", label: "Stage 1", pct: 30 },
        { id: "2", label: "Stage 2", pct: 30 },
        { id: "3", label: "Stage 3", pct: 50 }, // Will be adjusted
      ];
      const result = rebalanceLastStage(stages);
      expect(result[2].pct).toBe(40); // 100 - 30 - 30 = 40
    });

    it("should return same array for single stage", () => {
      const stages: PaymentStage[] = [{ id: "1", label: "Stage 1", pct: 50 }];
      const result = rebalanceLastStage(stages);
      expect(result).toEqual(stages);
    });

    it("should return same array for empty array", () => {
      const result = rebalanceLastStage([]);
      expect(result).toEqual([]);
    });

    it("should handle when head stages exceed 100%", () => {
      const stages: PaymentStage[] = [
        { id: "1", label: "Stage 1", pct: 60 },
        { id: "2", label: "Stage 2", pct: 60 },
        { id: "3", label: "Stage 3", pct: 50 },
      ];
      const result = rebalanceLastStage(stages);
      // Head sum = 60 + 60 = 120, which clamps, remaining = 0
      expect(result[2].pct).toBe(0);
    });

    it("should preserve other stage properties", () => {
      const stages: PaymentStage[] = [
        { id: "1", label: "Deposit", pct: 30, due: "On booking" },
        { id: "2", label: "Final", pct: 80, due: "On completion" },
      ];
      const result = rebalanceLastStage(stages);
      expect(result[1].id).toBe("2");
      expect(result[1].label).toBe("Final");
      expect(result[1].due).toBe("On completion");
      expect(result[1].pct).toBe(70);
    });
  });

  describe("setDepositPct", () => {
    it("should update deposit percentage", () => {
      const settings = defaultQuoteSettings("quote-123");
      const updated = setDepositPct(settings, 50);
      expect(updated.depositPct).toBe(50);
    });

    it("should clamp deposit percentage", () => {
      const settings = defaultQuoteSettings("quote-123");
      expect(setDepositPct(settings, -10).depositPct).toBe(0);
      expect(setDepositPct(settings, 150).depositPct).toBe(100);
    });

    it("should update timestamp", () => {
      const settings = defaultQuoteSettings("quote-123");
      const originalTime = settings.updatedAtISO;

      // Small delay to ensure different timestamp
      const updated = setDepositPct(settings, 40);
      expect(updated.updatedAtISO).toBeDefined();
    });

    it("should preserve other settings", () => {
      const settings: QuoteSettings = {
        quoteId: "quote-123",
        depositPct: 30,
        stages: [{ id: "1", label: "Stage", pct: 100 }],
        quoteTotal: 1000,
        locked: true,
      };
      const updated = setDepositPct(settings, 50);
      expect(updated.quoteId).toBe("quote-123");
      expect(updated.stages).toEqual(settings.stages);
      expect(updated.quoteTotal).toBe(1000);
      expect(updated.locked).toBe(true);
    });
  });

  describe("getQuoteSettings", () => {
    it("should return default settings for unknown quote", () => {
      const settings = getQuoteSettings("unknown-quote");
      expect(settings.quoteId).toBe("unknown-quote");
      expect(settings.depositPct).toBe(30);
    });

    it("should return stored settings if available", () => {
      const stored: QuoteSettings[] = [{
        quoteId: "stored-quote",
        depositPct: 50,
        stages: [],
      }];
      localStorageMock.setItem("qt_quote_settings_v1", JSON.stringify(stored));

      const settings = getQuoteSettings("stored-quote");
      expect(settings.depositPct).toBe(50);
    });
  });

  describe("upsertQuoteSettings", () => {
    it("should add new settings", () => {
      const settings: QuoteSettings = {
        quoteId: "new-quote",
        depositPct: 40,
        stages: [],
      };
      upsertQuoteSettings(settings);

      const retrieved = getQuoteSettings("new-quote");
      expect(retrieved.depositPct).toBe(40);
    });

    it("should update existing settings", () => {
      const initial: QuoteSettings = {
        quoteId: "update-quote",
        depositPct: 30,
        stages: [],
      };
      upsertQuoteSettings(initial);

      const updated: QuoteSettings = {
        quoteId: "update-quote",
        depositPct: 60,
        stages: [],
      };
      upsertQuoteSettings(updated);

      const retrieved = getQuoteSettings("update-quote");
      expect(retrieved.depositPct).toBe(60);
    });
  });

  describe("lockQuoteSettings", () => {
    it("should set locked to true", () => {
      const initial: QuoteSettings = {
        quoteId: "lock-quote",
        depositPct: 30,
        stages: [],
      };
      upsertQuoteSettings(initial);

      const locked = lockQuoteSettings("lock-quote");
      expect(locked.locked).toBe(true);
    });

    it("should set lockedAtISO timestamp", () => {
      const initial: QuoteSettings = {
        quoteId: "lock-quote-2",
        depositPct: 30,
        stages: [],
      };
      upsertQuoteSettings(initial);

      const locked = lockQuoteSettings("lock-quote-2");
      expect(locked.lockedAtISO).toBeDefined();
    });

    it("should not overwrite existing lockedAtISO", () => {
      const initial: QuoteSettings = {
        quoteId: "already-locked",
        depositPct: 30,
        stages: [],
        lockedAtISO: "2024-01-01T00:00:00Z",
      };
      upsertQuoteSettings(initial);

      const locked = lockQuoteSettings("already-locked");
      expect(locked.lockedAtISO).toBe("2024-01-01T00:00:00Z");
    });

    it("should persist locked state", () => {
      const initial: QuoteSettings = {
        quoteId: "persist-lock",
        depositPct: 30,
        stages: [],
      };
      upsertQuoteSettings(initial);
      lockQuoteSettings("persist-lock");

      const retrieved = getQuoteSettings("persist-lock");
      expect(retrieved.locked).toBe(true);
    });
  });
});
