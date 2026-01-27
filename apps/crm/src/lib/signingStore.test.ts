/**
 * Tests for signingStore (legacy stub implementation)
 */
import { describe, expect, it } from "vitest";
import {
  getSigningRecord,
  getAllSigningRecords,
  upsertSigningRecord,
  type SigningRecord,
} from "./signingStore";

describe("signingStore (legacy stubs)", () => {
  describe("getSigningRecord", () => {
    it("should always return null (stub)", () => {
      expect(getSigningRecord("quote-123")).toBeNull();
      expect(getSigningRecord("any-id")).toBeNull();
      expect(getSigningRecord("")).toBeNull();
    });
  });

  describe("getAllSigningRecords", () => {
    it("should always return empty array (stub)", () => {
      expect(getAllSigningRecords()).toEqual([]);
      expect(getAllSigningRecords()).toHaveLength(0);
    });
  });

  describe("upsertSigningRecord", () => {
    it("should be a no-op (stub)", () => {
      const record: SigningRecord = {
        quoteId: "quote-123",
        signedAtISO: new Date().toISOString(),
        signerName: "John Doe",
        signerEmail: "john@example.com",
      };

      // Should not throw
      expect(() => upsertSigningRecord(record)).not.toThrow();

      // Should still return null after "upserting"
      expect(getSigningRecord("quote-123")).toBeNull();
    });

    it("should handle record with all fields", () => {
      const record: SigningRecord = {
        quoteId: "quote-456",
        signedAtISO: "2024-01-15T10:00:00Z",
        signerName: "Jane Smith",
        signerEmail: "jane@example.com",
        signatureDataUrl: "data:image/png;base64,abc123",
        userAgent: "Mozilla/5.0",
        ip: "192.168.1.1",
      };

      expect(() => upsertSigningRecord(record)).not.toThrow();
    });

    it("should handle record with minimal fields", () => {
      const record: SigningRecord = {
        quoteId: "quote-789",
        signedAtISO: "2024-01-15T10:00:00Z",
        signerName: "Minimal User",
      };

      expect(() => upsertSigningRecord(record)).not.toThrow();
    });
  });

  describe("SigningRecord type", () => {
    it("should allow creating valid signing records", () => {
      const record: SigningRecord = {
        quoteId: "test-quote",
        signedAtISO: new Date().toISOString(),
        signerName: "Test User",
      };

      expect(record.quoteId).toBe("test-quote");
      expect(record.signerName).toBe("Test User");
      expect(record.signedAtISO).toBeDefined();
    });
  });
});
