import { describe, it, expect, vi, beforeEach } from "vitest";
import JSZip from "jszip";

// ── Mocks ──

// Mock Prisma
const mockFindMany = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue({});
vi.mock("@/lib/server/prisma", () => ({
  getPrisma: () => ({
    certificateRevision: {
      findMany: mockFindMany,
      update: mockUpdate,
    },
  }),
}));

// Mock storage
const mockReadUploadBytes = vi.fn();
const mockWriteUploadBytes = vi.fn();
vi.mock("@/lib/server/storage", () => ({
  readUploadBytes: (...args: any[]) => mockReadUploadBytes(...args),
  writeUploadBytes: (...args: any[]) => mockWriteUploadBytes(...args),
}));

// Mock PDF renderer
const mockRenderPdf = vi.fn();
vi.mock("@/lib/server/pdf", () => ({
  renderCertificatePdfFromSnapshot: (...args: any[]) => mockRenderPdf(...args),
}));

// Import after mocks
import { exportCertificatesZip, type ExportFilters } from "../export";

// ── Test data ──

function makeRevision(overrides: Partial<any> = {}) {
  return {
    id: "rev-1",
    certificateId: "cert-1",
    revision: 1,
    signingHash: "abc123def456",
    content: {
      certificateId: "cert-1",
      type: "EICR",
      data: { clientName: "John Smith", installationAddress: "123 Test Road" },
    },
    pdfKey: "certificates/cert-1/revisions/1.pdf",
    pdfChecksum: "pdfhash123",
    pdfGeneratedAt: new Date(),
    issuedAt: new Date("2026-01-15T10:00:00Z"),
    issuedBy: "user-1",
    certificate: {
      id: "cert-1",
      certificateNumber: "CERT-001",
      type: "EICR",
      status: "issued",
      jobId: "job-1",
      outcome: "satisfactory",
      outcomeReason: "All tests passed",
      verificationToken: "verify-token-123",
      currentRevision: 1,
    },
    ...overrides,
  };
}

const baseFilters: ExportFilters = {
  issuedFrom: "2026-01-01",
  issuedTo: "2026-01-31",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReadUploadBytes.mockReturnValue(Buffer.from("fake-pdf-bytes"));
  mockRenderPdf.mockResolvedValue(Buffer.from("regenerated-pdf"));
});

// ── Tests ──

describe("exportCertificatesZip", () => {
  it("produces a ZIP with manifest, csv, json, and pdf entries", async () => {
    const rev = makeRevision();
    mockFindMany.mockResolvedValue([rev]);

    const result = await exportCertificatesZip({
      companyId: "comp-1",
      filters: baseFilters,
    });

    expect(result.filename).toMatch(/certificates_export_/);
    expect(result.bytes.byteLength).toBeGreaterThan(0);

    const zip = await JSZip.loadAsync(result.bytes);
    const paths = Object.keys(zip.files);

    expect(paths).toContain("manifest.json");
    expect(paths).toContain("csv/summary.csv");
    expect(paths.some((p) => p.startsWith("json/") && p.endsWith(".json"))).toBe(true);
    expect(paths.some((p) => p.startsWith("pdf/") && p.endsWith(".pdf"))).toBe(true);
  });

  it("manifest has schemaVersion, counts, and file checksums", async () => {
    mockFindMany.mockResolvedValue([makeRevision()]);

    const result = await exportCertificatesZip({
      companyId: "comp-1",
      filters: baseFilters,
    });

    const zip = await JSZip.loadAsync(result.bytes);
    const manifestText = await zip.file("manifest.json")!.async("string");
    const manifest = JSON.parse(manifestText);

    expect(manifest.schemaVersion).toBe("1.0.0");
    expect(manifest.companyId).toBe("comp-1");
    expect(manifest.counts.certificates).toBe(1);
    expect(manifest.counts.revisions).toBe(1);
    expect(manifest.files.length).toBeGreaterThanOrEqual(4); // json, pdf, csv, manifest
    expect(manifest.files.every((f: any) => f.path && f.sha256)).toBe(true);
  });

  it("JSON export contains snapshot and required fields", async () => {
    mockFindMany.mockResolvedValue([makeRevision()]);

    const result = await exportCertificatesZip({
      companyId: "comp-1",
      filters: baseFilters,
    });

    const zip = await JSZip.loadAsync(result.bytes);
    const jsonFiles = Object.keys(zip.files).filter((p) => p.startsWith("json/") && p.endsWith(".json"));
    expect(jsonFiles.length).toBe(1);

    const jsonText = await zip.file(jsonFiles[0])!.async("string");
    const payload = JSON.parse(jsonText);

    expect(payload.schemaVersion).toBe("1.0.0");
    expect(payload.certificateId).toBe("cert-1");
    expect(payload.signingHash).toBe("abc123def456");
    expect(payload.revision).toBe(1);
    expect(payload.snapshot).toBeDefined();
    expect(payload.snapshot.type).toBe("EICR");
  });

  it("CSV summary has correct columns and data", async () => {
    mockFindMany.mockResolvedValue([makeRevision()]);

    const result = await exportCertificatesZip({
      companyId: "comp-1",
      filters: baseFilters,
    });

    const zip = await JSZip.loadAsync(result.bytes);
    const csvText = await zip.file("csv/summary.csv")!.async("string");
    const lines = csvText.trim().split("\n");

    expect(lines[0]).toBe(
      "certificateNumber,type,revision,issuedAt,outcome,signingHash,pdfChecksum,jobId,customerName,address,verificationToken",
    );
    expect(lines.length).toBe(2); // header + 1 row
    expect(lines[1]).toContain("CERT-001");
    expect(lines[1]).toContain("EICR");
    expect(lines[1]).toContain("satisfactory");
  });

  it("returns empty ZIP when no revisions match", async () => {
    // includeAllRevisions path - returns empty array directly
    mockFindMany.mockResolvedValue([]);

    const result = await exportCertificatesZip({
      companyId: "comp-1",
      filters: { ...baseFilters, includeAllRevisions: true },
    });

    const zip = await JSZip.loadAsync(result.bytes);
    const manifestText = await zip.file("manifest.json")!.async("string");
    const manifest = JSON.parse(manifestText);

    expect(manifest.counts.certificates).toBe(0);
    expect(manifest.counts.revisions).toBe(0);
  });

  it("self-heals missing PDF by regenerating from snapshot", async () => {
    const rev = makeRevision({ pdfKey: "certificates/cert-1/revisions/1.pdf" });
    mockFindMany.mockResolvedValue([rev]);
    mockReadUploadBytes.mockReturnValue(null); // PDF missing from storage

    const result = await exportCertificatesZip({
      companyId: "comp-1",
      filters: baseFilters,
    });

    expect(mockRenderPdf).toHaveBeenCalledTimes(1);
    expect(mockWriteUploadBytes).toHaveBeenCalled();

    const zip = await JSZip.loadAsync(result.bytes);
    const pdfFiles = Object.keys(zip.files).filter((p) => p.startsWith("pdf/") && p.endsWith(".pdf"));
    expect(pdfFiles.length).toBe(1);
  });

  it("enforces max revisions limit", async () => {
    const revisions = Array.from({ length: 501 }, (_, i) =>
      makeRevision({ id: `rev-${i}`, certificateId: `cert-${i}` }),
    );
    mockFindMany.mockResolvedValue(revisions);

    await expect(
      exportCertificatesZip({
        companyId: "comp-1",
        filters: { ...baseFilters, includeAllRevisions: true },
      }),
    ).rejects.toThrow(/500/);
  });

  it("respects includeAllRevisions=true", async () => {
    const revs = [
      makeRevision({ id: "rev-1", revision: 1 }),
      makeRevision({ id: "rev-2", revision: 2, signingHash: "hash2" }),
    ];
    mockFindMany.mockResolvedValue(revs);

    const result = await exportCertificatesZip({
      companyId: "comp-1",
      filters: { ...baseFilters, includeAllRevisions: true },
    });

    const zip = await JSZip.loadAsync(result.bytes);
    const jsonFiles = Object.keys(zip.files).filter((p) => p.startsWith("json/") && p.endsWith(".json"));
    expect(jsonFiles.length).toBe(2);
  });

  it("enforces total bytes size cap", async () => {
    // Create a revision with a huge PDF (simulate >200MB)
    const largePdf = Buffer.alloc(210 * 1024 * 1024, 0x41); // 210 MB
    mockReadUploadBytes.mockReturnValue(largePdf);
    mockFindMany.mockResolvedValue([makeRevision()]);

    await expect(
      exportCertificatesZip({
        companyId: "comp-1",
        filters: { ...baseFilters, includeAllRevisions: true },
      }),
    ).rejects.toThrow(/size limit/);
  });

  it("rejects invalid date range", async () => {
    await expect(
      exportCertificatesZip({
        companyId: "comp-1",
        filters: { issuedFrom: "not-a-date", issuedTo: "2026-01-31" },
      }),
    ).rejects.toThrow(/Invalid date/);
  });

  it("rejects reversed date range", async () => {
    await expect(
      exportCertificatesZip({
        companyId: "comp-1",
        filters: { issuedFrom: "2026-02-01", issuedTo: "2026-01-01" },
      }),
    ).rejects.toThrow(/before/);
  });
});
