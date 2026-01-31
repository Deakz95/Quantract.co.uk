import { describe, it, expect } from "vitest";
import {
  buildCanonicalCertSnapshot,
  computeSigningHash,
  computeChecksum,
  canonicalJsonString,
  type FullCertificateAggregate,
} from "../canonical";

function makeAggregate(overrides?: Partial<FullCertificateAggregate>): FullCertificateAggregate {
  return {
    certificate: {
      id: "cert-001",
      companyId: "comp-001",
      certificateNumber: "CERT-00001",
      type: "EICR",
      status: "completed",
      jobId: "job-001",
      siteId: "site-001",
      clientId: "client-001",
      legalEntityId: null,
      dataVersion: 1,
      data: { overview: { siteName: "Test Site" }, inspection: {} },
      inspectorName: "John Smith",
      inspectorEmail: "john@example.com",
      outcome: "satisfactory",
      outcomeReason: "All checks passed.",
      completedAt: new Date("2026-01-15T10:00:00Z"),
    },
    observations: [],
    checklists: [],
    signatures: [],
    attachments: [],
    testResults: [],
    ...overrides,
  };
}

describe("canonicalJsonString", () => {
  it("produces same output regardless of key order", () => {
    const a = { z: 1, a: 2, m: 3 };
    const b = { a: 2, m: 3, z: 1 };
    expect(canonicalJsonString(a)).toBe(canonicalJsonString(b));
  });

  it("handles nested objects with stable key order", () => {
    const a = { outer: { z: 1, a: 2 } };
    const b = { outer: { a: 2, z: 1 } };
    expect(canonicalJsonString(a)).toBe(canonicalJsonString(b));
  });

  it("preserves array order", () => {
    const a = { items: [1, 2, 3] };
    const b = { items: [3, 2, 1] };
    expect(canonicalJsonString(a)).not.toBe(canonicalJsonString(b));
  });
});

describe("buildCanonicalCertSnapshot — sorting", () => {
  it("sorts observations by sortOrder asc, createdAt asc, id asc", () => {
    const agg = makeAggregate({
      observations: [
        { code: "C2", location: "B", description: "Second", regulation: null, fixGuidance: null, resolvedAt: null, sortOrder: 2, createdAt: new Date("2026-01-01"), id: "obs-2" },
        { code: "C1", location: "A", description: "First", regulation: null, fixGuidance: null, resolvedAt: null, sortOrder: 1, createdAt: new Date("2026-01-01"), id: "obs-1" },
        { code: "C3", location: "C", description: "Third tie", regulation: null, fixGuidance: null, resolvedAt: null, sortOrder: 2, createdAt: new Date("2026-01-01"), id: "obs-3" },
      ],
    });
    const snapshot = buildCanonicalCertSnapshot(agg);
    expect(snapshot.observations.map((o) => o.code)).toEqual(["C1", "C2", "C3"]);
  });

  it("sorts checklists by section asc, sortOrder asc, id asc", () => {
    const agg = makeAggregate({
      checklists: [
        { section: "testing", question: "Q1", answer: "pass", notes: null, sortOrder: 0, id: "cl-2" },
        { section: "assessment", question: "Q2", answer: "fail", notes: null, sortOrder: 0, id: "cl-1" },
      ],
    });
    const snapshot = buildCanonicalCertSnapshot(agg);
    expect(snapshot.checklists.map((c) => c.section)).toEqual(["assessment", "testing"]);
  });

  it("sorts signatures by role asc, sortOrder asc", () => {
    const agg = makeAggregate({
      signatures: [
        { role: "engineer", signerName: "Eng", signerEmail: null, signatureText: null, signedAt: new Date("2026-01-01"), qualification: null, isPrimary: true, sortOrder: 0, id: "sig-1" },
        { role: "customer", signerName: "Cust", signerEmail: null, signatureText: null, signedAt: new Date("2026-01-01"), qualification: null, isPrimary: true, sortOrder: 0, id: "sig-2" },
      ],
    });
    const snapshot = buildCanonicalCertSnapshot(agg);
    expect(snapshot.signatures.map((s) => s.role)).toEqual(["customer", "engineer"]);
  });

  it("sorts attachments by category asc, createdAt asc", () => {
    const agg = makeAggregate({
      attachments: [
        { name: "photo.jpg", fileKey: "k1", mimeType: "image/jpeg", category: "photo", createdAt: new Date("2026-01-02"), id: "att-2" },
        { name: "drawing.pdf", fileKey: "k2", mimeType: "application/pdf", category: "drawing", createdAt: new Date("2026-01-01"), id: "att-1" },
      ],
    });
    const snapshot = buildCanonicalCertSnapshot(agg);
    expect(snapshot.attachments.map((a) => a.category)).toEqual(["drawing", "photo"]);
  });
});

describe("computeSigningHash — determinism", () => {
  it("produces same hash for same input", () => {
    const agg = makeAggregate();
    const s1 = buildCanonicalCertSnapshot(agg);
    const s2 = buildCanonicalCertSnapshot(agg);
    expect(computeSigningHash(s1)).toBe(computeSigningHash(s2));
  });

  it("produces same hash when observations reordered in input", () => {
    const obs = [
      { code: "C1", location: "A", description: "X", regulation: null, fixGuidance: null, resolvedAt: null, sortOrder: 1, createdAt: new Date("2026-01-01"), id: "obs-1" },
      { code: "C2", location: "B", description: "Y", regulation: null, fixGuidance: null, resolvedAt: null, sortOrder: 2, createdAt: new Date("2026-01-01"), id: "obs-2" },
    ];
    const agg1 = makeAggregate({ observations: [obs[0], obs[1]] });
    const agg2 = makeAggregate({ observations: [obs[1], obs[0]] });
    expect(computeSigningHash(buildCanonicalCertSnapshot(agg1)))
      .toBe(computeSigningHash(buildCanonicalCertSnapshot(agg2)));
  });

  it("produces different hash when data changes", () => {
    const agg1 = makeAggregate();
    const agg2 = makeAggregate({
      certificate: { ...makeAggregate().certificate, outcome: "unsatisfactory" },
    });
    expect(computeSigningHash(buildCanonicalCertSnapshot(agg1)))
      .not.toBe(computeSigningHash(buildCanonicalCertSnapshot(agg2)));
  });

  it("hash is a 64-char hex string (SHA-256)", () => {
    const hash = computeSigningHash(buildCanonicalCertSnapshot(makeAggregate()));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("computeChecksum", () => {
  it("computes SHA-256 of bytes", () => {
    const bytes = Buffer.from("hello world");
    const checksum = computeChecksum(bytes);
    expect(checksum).toMatch(/^[0-9a-f]{64}$/);
  });

  it("same bytes produce same checksum", () => {
    const b1 = Buffer.from("test pdf content");
    const b2 = Buffer.from("test pdf content");
    expect(computeChecksum(b1)).toBe(computeChecksum(b2));
  });

  it("different bytes produce different checksum", () => {
    const b1 = Buffer.from("content A");
    const b2 = Buffer.from("content B");
    expect(computeChecksum(b1)).not.toBe(computeChecksum(b2));
  });
});
