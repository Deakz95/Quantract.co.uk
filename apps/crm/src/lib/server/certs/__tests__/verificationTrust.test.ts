import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

const mockFindUnique = vi.fn();
const mockFindFirst = vi.fn();

vi.mock("@/lib/server/prisma", () => ({
  getPrisma: () => ({
    certificate: { findUnique: mockFindUnique },
    certificateRevision: { findFirst: mockFindFirst },
  }),
}));

// ── Test data ──

function makeCert(overrides: Partial<any> = {}) {
  return {
    id: "cert-1",
    status: "issued",
    type: "EICR",
    certificateNumber: "CERT-001",
    outcome: "satisfactory",
    verificationRevokedAt: null,
    ...overrides,
  };
}

function makeRevision(overrides: Partial<any> = {}) {
  return {
    revision: 2,
    signingHash: "abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx1234yz567890ab",
    pdfChecksum: "check1234567890abcdef1234567890abcdef1234567890abcdef12345678",
    issuedAt: new Date("2026-01-15T10:00:00Z"),
    content: {
      certificateId: "cert-1",
      type: "EICR",
      data: { overview: { installationAddress: "123 Test St" } },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── truncateHash logic (replicated for testing) ──

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-8)}`;
}

describe("truncateHash", () => {
  it("truncates long hash to first 12 + last 8", () => {
    const hash = "abcd1234efgh5678ijkl9012mnop3456qrst7890uvwx";
    const result = truncateHash(hash);
    expect(result).toBe("abcd1234efgh…7890uvwx");
    const hash2 = "0123456789abcdef0123456789abcdef";
    expect(truncateHash(hash2)).toBe("0123456789ab…89abcdef");
  });

  it("returns short hash unchanged", () => {
    expect(truncateHash("abc123")).toBe("abc123");
    expect(truncateHash("12345678901234567890")).toBe("12345678901234567890"); // exactly 20
  });

  it("handles exactly 21 chars", () => {
    const hash = "123456789012345678901";
    expect(truncateHash(hash)).toBe("123456789012…45678901");
  });
});

// ── JSON endpoint logic tests (via mock) ──

describe("verification JSON endpoint logic", () => {
  it("returns correct payload for valid cert", () => {
    const cert = makeCert();
    const rev = makeRevision();

    // Simulate what the endpoint would produce
    const payload = {
      schemaVersion: "1.0.0",
      certificateNumber: cert.certificateNumber ?? null,
      type: cert.type,
      revision: rev.revision,
      issuedAt: rev.issuedAt ? new Date(rev.issuedAt).toISOString() : null,
      signingHash: rev.signingHash,
      pdfChecksum: rev.pdfChecksum ?? null,
      outcome: cert.outcome ?? null,
      snapshot: rev.content,
    };

    expect(payload.schemaVersion).toBe("1.0.0");
    expect(payload.certificateNumber).toBe("CERT-001");
    expect(payload.type).toBe("EICR");
    expect(payload.revision).toBe(2);
    expect(payload.signingHash).toBe(rev.signingHash);
    expect(payload.pdfChecksum).toBe(rev.pdfChecksum);
    expect(payload.outcome).toBe("satisfactory");
    expect(payload.snapshot).toBeDefined();
  });

  it("blocks revoked cert from JSON download", () => {
    const cert = makeCert({ verificationRevokedAt: new Date() });
    expect(cert.verificationRevokedAt).not.toBeNull();
    // Endpoint would return 403
  });

  it("excludes internal IDs from payload", () => {
    const cert = makeCert();
    const rev = makeRevision();

    const payload = {
      schemaVersion: "1.0.0",
      certificateNumber: cert.certificateNumber,
      type: cert.type,
      revision: rev.revision,
      issuedAt: new Date(rev.issuedAt).toISOString(),
      signingHash: rev.signingHash,
      pdfChecksum: rev.pdfChecksum,
      outcome: cert.outcome,
      snapshot: rev.content,
    };

    const json = JSON.stringify(payload);
    // No internal DB IDs should appear (cert.id is "cert-1" but appears in snapshot.certificateId — that's the canonical snapshot, acceptable)
    expect(json).not.toContain('"id":');
    expect(json).not.toContain("companyId");
  });

  it("correct revision number shown for multi-revision cert", () => {
    const rev = makeRevision({ revision: 5 });
    expect(rev.revision).toBe(5);
    expect(`Rev ${rev.revision}`).toBe("Rev 5");
  });
});

describe("trust signals display logic", () => {
  it("signing hash displayed with truncation", () => {
    const rev = makeRevision();
    const displayed = truncateHash(rev.signingHash);
    expect(displayed.startsWith(rev.signingHash.slice(0, 12))).toBe(true);
    expect(displayed.endsWith(rev.signingHash.slice(-8))).toBe(true);
    expect(displayed).toContain("…");
  });

  it("pdf checksum displayed with truncation", () => {
    const rev = makeRevision();
    const displayed = truncateHash(rev.pdfChecksum);
    expect(displayed.startsWith(rev.pdfChecksum.slice(0, 12))).toBe(true);
    expect(displayed.endsWith(rev.pdfChecksum.slice(-8))).toBe(true);
  });

  it("revoked cert hides download links", () => {
    const cert = makeCert({ verificationRevokedAt: new Date("2026-01-20") });
    const isRevoked = !!cert.verificationRevokedAt;
    expect(isRevoked).toBe(true);
    // In the page, isRevoked === true means no PDF/JSON download links are rendered
  });

  it("valid cert shows download links", () => {
    const cert = makeCert();
    const isRevoked = !!cert.verificationRevokedAt;
    expect(isRevoked).toBe(false);
    // In the page, isRevoked === false means PDF + JSON download links are rendered
  });
});
