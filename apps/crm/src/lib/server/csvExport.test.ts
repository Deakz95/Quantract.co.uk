/**
 * Tests for CSV Export Utility
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateCSV, downloadCSV, getCSVHeaders } from "./csvExport";

describe("csvExport", () => {
  describe("generateCSV", () => {
    it("should return empty string for empty data", () => {
      expect(generateCSV([])).toBe("");
    });

    it("should generate CSV with auto-detected headers", () => {
      const data = [
        { name: "John", age: 30 },
        { name: "Jane", age: 25 },
      ];

      const csv = generateCSV(data);
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe("name,age");
      expect(lines[1]).toBe("John,30.00");
      expect(lines[2]).toBe("Jane,25.00");
    });

    it("should use custom headers when provided", () => {
      const data = [
        { name: "John", age: 30, email: "john@test.com" },
      ];

      const csv = generateCSV(data, ["name", "email"]);
      const lines = csv.split("\r\n");

      expect(lines[0]).toBe("name,email");
      expect(lines[1]).toBe("John,john@test.com");
    });

    it("should handle null values", () => {
      const data = [{ name: null, value: "test" }];

      const csv = generateCSV(data);
      expect(csv).toContain(",test");
    });

    it("should handle undefined values", () => {
      const data = [{ name: undefined, value: "test" }];

      const csv = generateCSV(data);
      expect(csv).toContain(",test");
    });

    it("should escape fields containing commas", () => {
      const data = [{ description: "Hello, World" }];

      const csv = generateCSV(data);
      expect(csv).toContain('"Hello, World"');
    });

    it("should escape fields containing quotes", () => {
      const data = [{ description: 'He said "Hello"' }];

      const csv = generateCSV(data);
      expect(csv).toContain('"He said ""Hello"""');
    });

    it("should escape fields containing newlines", () => {
      const data = [{ description: "Line1\nLine2" }];

      const csv = generateCSV(data);
      expect(csv).toContain('"Line1\nLine2"');
    });

    it("should escape fields containing carriage returns", () => {
      const data = [{ description: "Line1\rLine2" }];

      const csv = generateCSV(data);
      expect(csv).toContain('"Line1\rLine2"');
    });

    it("should prevent CSV injection with = prefix", () => {
      const data = [{ formula: "=SUM(A1:A10)" }];

      const csv = generateCSV(data);
      expect(csv).toContain("\"'=SUM(A1:A10)\"");
    });

    it("should prevent CSV injection with + prefix", () => {
      const data = [{ formula: "+1234567890" }];

      const csv = generateCSV(data);
      expect(csv).toContain("\"'+1234567890\"");
    });

    it("should prevent CSV injection with - prefix", () => {
      const data = [{ formula: "-100" }];

      const csv = generateCSV(data);
      expect(csv).toContain("\"'-100\"");
    });

    it("should prevent CSV injection with @ prefix", () => {
      const data = [{ formula: "@SUM(A1)" }];

      const csv = generateCSV(data);
      expect(csv).toContain("\"'@SUM(A1)\"");
    });

    it("should format Date objects as ISO date string", () => {
      const date = new Date("2024-03-15T10:30:00Z");
      const data = [{ created: date }];

      const csv = generateCSV(data);
      expect(csv).toContain("2024-03-15");
    });

    it("should format numbers with 2 decimal places", () => {
      const data = [{ amount: 123.456 }];

      const csv = generateCSV(data);
      expect(csv).toContain("123.46");
    });

    it("should handle multiple rows", () => {
      const data = [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
        { id: 3, name: "C" },
      ];

      const csv = generateCSV(data);
      const lines = csv.split("\r\n");

      expect(lines).toHaveLength(4); // header + 3 data rows
    });

    it("should handle boolean values", () => {
      const data = [{ active: true, deleted: false }];

      const csv = generateCSV(data);
      expect(csv).toContain("true");
      expect(csv).toContain("false");
    });

    it("should handle injection in header names", () => {
      const data = [{ "=DANGER": "safe" }];

      const csv = generateCSV(data);
      expect(csv.startsWith("\"'=DANGER\"")).toBe(true);
    });
  });

  describe("downloadCSV", () => {
    let mockLink: any;
    let mockBlob: any;
    let mockUrl: string;

    beforeEach(() => {
      mockUrl = "blob:test-url";
      mockLink = {
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: {},
      };

      mockBlob = {};

      vi.stubGlobal("Blob", vi.fn().mockImplementation(() => mockBlob));
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn().mockReturnValue(mockUrl),
      });
      vi.stubGlobal("document", {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should create a blob with CSV content", () => {
      downloadCSV("test.csv", "a,b,c");

      expect(Blob).toHaveBeenCalledWith(["a,b,c"], { type: "text/csv;charset=utf-8;" });
    });

    it("should create a download link", () => {
      downloadCSV("test.csv", "a,b,c");

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(mockLink.setAttribute).toHaveBeenCalledWith("href", mockUrl);
      expect(mockLink.setAttribute).toHaveBeenCalledWith("download", "test.csv");
    });

    it("should hide the link", () => {
      downloadCSV("test.csv", "a,b,c");

      expect(mockLink.style.visibility).toBe("hidden");
    });

    it("should append, click, and remove link", () => {
      downloadCSV("test.csv", "a,b,c");

      expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
    });
  });

  describe("getCSVHeaders", () => {
    it("should return correct content-type", () => {
      const headers = getCSVHeaders();

      expect(headers["Content-Type"]).toBe("text/csv");
    });

    it("should return content-disposition with timestamp", () => {
      const before = Date.now();
      const headers = getCSVHeaders();
      const after = Date.now();

      expect(headers["Content-Disposition"]).toMatch(/^attachment; filename="export-\d+\.csv"$/);

      // Extract timestamp from filename
      const match = headers["Content-Disposition"].match(/export-(\d+)\.csv/);
      expect(match).not.toBeNull();

      const timestamp = parseInt(match![1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });
});
