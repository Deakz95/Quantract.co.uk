import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockCreate = vi.fn().mockResolvedValue({});
const mockTransaction = vi.fn();

vi.mock("@/lib/server/prisma", () => ({
  getPrisma: () => ({
    certificate: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      create: mockCreate,
    },
    certificateObservation: { create: mockCreate },
    certificateChecklist: { create: mockCreate },
    certificateSignatureRecord: { create: mockCreate },
    auditEvent: { create: mockCreate },
    $transaction: mockTransaction,
  }),
}));

// Import after mocks
import { createCertificateAmendment } from "../amend";

// ── Test data ──

function makeIssuedCert(overrides: Partial<any> = {}) {
  return {
    id: "cert-1",
    companyId: "comp-1",
    legalEntityId: "le-1",
    jobId: "job-1",
    siteId: "site-1",
    clientId: "client-1",
    type: "EICR",
    status: "issued",
    certificateNumber: "CERT-001",
    inspectorName: "John",
    inspectorEmail: "john@example.com",
    dataVersion: 1,
    data: { type: "EICR", overview: { jobReference: "J001" } },
    observations: [
      { id: "obs-1", companyId: "comp-1", certificateId: "cert-1", code: "C3", location: "DB1", description: "Minor", regulation: "411.3", fixGuidance: "Fix", resolvedAt: null, sortOrder: 0 },
    ],
    checklists: [
      { id: "cl-1", companyId: "comp-1", certificateId: "cert-1", section: "visual", question: "Damage?", answer: "pass", notes: "", sortOrder: 0 },
    ],
    signatureRecords: [
      { id: "sig-1", companyId: "comp-1", certificateId: "cert-1", role: "engineer", signerName: "John", signerEmail: "john@example.com", signatureText: "signed", signedAt: new Date(), qualification: "18th Edition", sortOrder: 0 },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: $transaction executes the callback immediately
  mockTransaction.mockImplementation(async (fn: any) => fn({
    certificate: { create: mockCreate, findFirst: mockFindFirst, findMany: mockFindMany },
    certificateObservation: { create: mockCreate },
    certificateChecklist: { create: mockCreate },
    certificateSignatureRecord: { create: mockCreate },
    auditEvent: { create: mockCreate },
  }));
});

// ── Tests ──

describe("createCertificateAmendment", () => {
  it("creates an amendment from an issued certificate", async () => {
    const original = makeIssuedCert();
    mockFindFirst
      .mockResolvedValueOnce(original) // findFirst for original cert (with include)
      .mockResolvedValueOnce(null); // findFirst for existing amendment check

    // The function uses prisma.certificate.findFirst (outside tx) then tx inside $transaction
    // We need to handle the outer findFirst calls and the transaction
    // Re-mock to handle the flow properly
    mockFindFirst.mockReset();
    mockFindFirst
      .mockResolvedValueOnce(original) // outer: find original cert
      .mockResolvedValueOnce(null); // outer: check existing amendment

    const result = await createCertificateAmendment({
      companyId: "comp-1",
      certificateId: "cert-1",
    });

    expect(result.amendmentId).toBeDefined();
    expect(typeof result.amendmentId).toBe("string");
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("rejects non-issued certificate", async () => {
    mockFindFirst.mockResolvedValueOnce(makeIssuedCert({ status: "draft" }));

    await expect(
      createCertificateAmendment({
        companyId: "comp-1",
        certificateId: "cert-1",
      }),
    ).rejects.toThrow(/Only issued/);
  });

  it("rejects when certificate not found", async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    await expect(
      createCertificateAmendment({
        companyId: "comp-1",
        certificateId: "cert-999",
      }),
    ).rejects.toThrow(/not found/);
  });

  it("rejects when an in-progress amendment exists", async () => {
    mockFindFirst
      .mockResolvedValueOnce(makeIssuedCert()) // original cert
      .mockResolvedValueOnce({ id: "amend-1", status: "draft" }); // existing amendment

    await expect(
      createCertificateAmendment({
        companyId: "comp-1",
        certificateId: "cert-1",
      }),
    ).rejects.toThrow(/already in progress/);
  });

  it("rejects void certificate", async () => {
    mockFindFirst.mockResolvedValueOnce(makeIssuedCert({ status: "void" }));

    await expect(
      createCertificateAmendment({
        companyId: "comp-1",
        certificateId: "cert-1",
      }),
    ).rejects.toThrow(/Only issued/);
  });
});
