/**
 * Tests for invoiceStore (client-side localStorage store)
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  normalizeInvoice,
  getAllInvoices,
  getInvoice,
  upsertInvoice,
  getInvoicesForQuote,
  ensureNextStageInvoice,
  type Invoice,
  type InvoiceStatus,
} from "./invoiceStore";

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

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).substr(2, 9)),
});

Object.defineProperty(global, "window", {
  value: { localStorage: localStorageMock },
  writable: true,
});

// Mock quoteStore
vi.mock("@/lib/quoteStore", () => ({
  getQuoteSettings: vi.fn().mockReturnValue({
    quoteId: "test-quote",
    depositPct: 30,
    stages: [],
    quoteTotal: 1000,
  }),
}));

describe("invoiceStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("normalizeInvoice", () => {
    it("should normalize minimal invoice", () => {
      const result = normalizeInvoice({ id: "inv-1" });
      expect(result.id).toBe("inv-1");
      expect(result.subtotal).toBe(0);
      expect(result.vat).toBe(0);
      expect(result.total).toBe(0);
      expect(result.status).toBe("draft");
    });

    it("should preserve valid values", () => {
      const result = normalizeInvoice({
        id: "inv-2",
        subtotal: 100,
        vat: 20,
        total: 120,
        status: "paid",
      });
      expect(result.subtotal).toBe(100);
      expect(result.vat).toBe(20);
      expect(result.total).toBe(120);
      expect(result.status).toBe("paid");
    });

    it("should use amount as fallback for total", () => {
      const result = normalizeInvoice({
        id: "inv-3",
        amount: 150,
        subtotal: 100,
        vat: 20,
      });
      // When total is not set, it uses amount
      expect(result.total).toBe(150);
    });

    it("should calculate total from subtotal + vat when neither total nor amount set", () => {
      const result = normalizeInvoice({
        id: "inv-4",
        subtotal: 100,
        vat: 20,
      });
      expect(result.total).toBe(120);
    });

    it("should handle NaN values", () => {
      const result = normalizeInvoice({
        id: "inv-5",
        subtotal: NaN,
        vat: NaN,
        total: NaN,
      });
      expect(result.subtotal).toBe(0);
      expect(result.vat).toBe(0);
      expect(result.total).toBe(0);
    });

    it("should clamp money values to 2 decimal places", () => {
      const result = normalizeInvoice({
        id: "inv-6",
        subtotal: 100.999,
        vat: 20.001,
        total: 121.005,
      });
      expect(result.subtotal).toBe(101);
      expect(result.vat).toBe(20);
      expect(result.total).toBe(121.01);
    });

    it("should set quoteId to null when not provided", () => {
      const result = normalizeInvoice({ id: "inv-7" });
      expect(result.quoteId).toBeNull();
    });

    it("should preserve quoteId when provided", () => {
      const result = normalizeInvoice({ id: "inv-8", quoteId: "quote-123" });
      expect(result.quoteId).toBe("quote-123");
    });

    it("should set createdAtISO when not provided", () => {
      const result = normalizeInvoice({ id: "inv-9" });
      expect(result.createdAtISO).toBeDefined();
      expect(new Date(result.createdAtISO).getTime()).toBeGreaterThan(0);
    });

    it("should preserve createdAtISO when provided", () => {
      const result = normalizeInvoice({
        id: "inv-10",
        createdAtISO: "2024-01-15T10:00:00Z",
      });
      expect(result.createdAtISO).toBe("2024-01-15T10:00:00Z");
    });

    it("should preserve client info", () => {
      const result = normalizeInvoice({
        id: "inv-11",
        clientName: "John Doe",
        clientEmail: "john@example.com",
      });
      expect(result.clientName).toBe("John Doe");
      expect(result.clientEmail).toBe("john@example.com");
    });

    it("should preserve kind", () => {
      const result = normalizeInvoice({
        id: "inv-12",
        kind: "manual",
      });
      expect(result.kind).toBe("manual");
    });
  });

  describe("getAllInvoices", () => {
    it("should return empty array when no invoices", () => {
      expect(getAllInvoices()).toEqual([]);
    });

    it("should return all invoices", () => {
      const invoices: Invoice[] = [
        { id: "1", subtotal: 100, vat: 20, total: 120, status: "draft", createdAtISO: "2024-01-01" },
        { id: "2", subtotal: 200, vat: 40, total: 240, status: "paid", createdAtISO: "2024-01-02" },
      ];
      localStorageMock.setItem("qt_invoices_v1", JSON.stringify(invoices));

      const result = getAllInvoices();
      expect(result).toHaveLength(2);
    });

    it("should normalize loaded invoices", () => {
      const rawInvoices = [{ id: "1" }]; // Minimal data
      localStorageMock.setItem("qt_invoices_v1", JSON.stringify(rawInvoices));

      const result = getAllInvoices();
      expect(result[0].subtotal).toBe(0);
      expect(result[0].status).toBe("draft");
    });
  });

  describe("getInvoice", () => {
    it("should return null for non-existent invoice", () => {
      expect(getInvoice("non-existent")).toBeNull();
    });

    it("should return invoice by id", () => {
      const invoice: Invoice = {
        id: "inv-123",
        subtotal: 100,
        vat: 20,
        total: 120,
        status: "draft",
        createdAtISO: "2024-01-01",
      };
      localStorageMock.setItem("qt_invoices_v1", JSON.stringify([invoice]));

      const result = getInvoice("inv-123");
      expect(result?.id).toBe("inv-123");
      expect(result?.subtotal).toBe(100);
    });
  });

  describe("upsertInvoice", () => {
    it("should add new invoice", () => {
      const invoice: Invoice = {
        id: "new-inv",
        subtotal: 100,
        vat: 20,
        total: 120,
        status: "draft",
        createdAtISO: "2024-01-01",
      };

      upsertInvoice(invoice);

      const result = getInvoice("new-inv");
      expect(result?.subtotal).toBe(100);
    });

    it("should update existing invoice", () => {
      const initial: Invoice = {
        id: "update-inv",
        subtotal: 100,
        vat: 20,
        total: 120,
        status: "draft",
        createdAtISO: "2024-01-01",
      };
      upsertInvoice(initial);

      const updated: Invoice = {
        ...initial,
        status: "paid",
      };
      upsertInvoice(updated);

      const result = getInvoice("update-inv");
      expect(result?.status).toBe("paid");
    });

    it("should normalize invoice before saving", () => {
      const invoice: Invoice = {
        id: "normalize-inv",
        subtotal: 100.999,
        vat: 20,
        total: 120,
        status: "draft",
        createdAtISO: "2024-01-01",
      };

      upsertInvoice(invoice);

      const result = getInvoice("normalize-inv");
      expect(result?.subtotal).toBe(101); // Clamped
    });
  });

  describe("getInvoicesForQuote", () => {
    it("should return empty array when no invoices for quote", () => {
      expect(getInvoicesForQuote("no-quote")).toEqual([]);
    });

    it("should return only invoices for specified quote", () => {
      const invoices: Invoice[] = [
        { id: "1", quoteId: "quote-A", subtotal: 100, vat: 20, total: 120, status: "draft", createdAtISO: "2024-01-01" },
        { id: "2", quoteId: "quote-B", subtotal: 200, vat: 40, total: 240, status: "draft", createdAtISO: "2024-01-02" },
        { id: "3", quoteId: "quote-A", subtotal: 300, vat: 60, total: 360, status: "paid", createdAtISO: "2024-01-03" },
      ];
      localStorageMock.setItem("qt_invoices_v1", JSON.stringify(invoices));

      const result = getInvoicesForQuote("quote-A");
      expect(result).toHaveLength(2);
      expect(result.every((inv) => inv.quoteId === "quote-A")).toBe(true);
    });
  });

  describe("ensureNextStageInvoice", () => {
    it("should return existing invoice if one exists", () => {
      const existing: Invoice = {
        id: "existing-inv",
        quoteId: "quote-123",
        subtotal: 500,
        vat: 100,
        total: 600,
        status: "sent",
        createdAtISO: "2024-01-01",
      };
      localStorageMock.setItem("qt_invoices_v1", JSON.stringify([existing]));

      const result = ensureNextStageInvoice("quote-123");
      expect(result.id).toBe("existing-inv");
      expect(result.subtotal).toBe(500);
    });

    it("should create new invoice when none exists", () => {
      const result = ensureNextStageInvoice("new-quote");
      expect(result.id).toBeDefined();
      expect(result.quoteId).toBe("new-quote");
      expect(result.kind).toBe("quote");
      expect(result.status).toBe("draft");
    });

    it("should use quoteTotal from settings", () => {
      const result = ensureNextStageInvoice("test-quote");
      expect(result.total).toBe(1000); // From mock
    });

    it("should set vat to 0 by default", () => {
      const result = ensureNextStageInvoice("test-quote");
      expect(result.vat).toBe(0);
    });

    it("should persist created invoice", () => {
      ensureNextStageInvoice("persist-quote");

      const invoices = getInvoicesForQuote("persist-quote");
      expect(invoices).toHaveLength(1);
    });
  });

  describe("InvoiceStatus types", () => {
    it("should accept all valid statuses", () => {
      const statuses: InvoiceStatus[] = ["draft", "sent", "unpaid", "paid"];

      for (const status of statuses) {
        const invoice: Invoice = {
          id: `status-${status}`,
          subtotal: 100,
          vat: 20,
          total: 120,
          status,
          createdAtISO: "2024-01-01",
        };
        upsertInvoice(invoice);
        const result = getInvoice(`status-${status}`);
        expect(result?.status).toBe(status);
      }
    });
  });
});
