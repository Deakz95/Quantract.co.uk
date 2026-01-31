import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockGroupBy = vi.fn();

vi.mock("@/lib/server/prisma", () => ({
  getPrisma: () => ({
    certificate: {
      findMany: mockFindMany,
      count: mockCount,
    },
    certificateObservation: {
      groupBy: mockGroupBy,
    },
  }),
}));

// Import after mocks
import { getCertAnalytics } from "../analytics";

const baseInput = {
  companyId: "comp-1",
  from: new Date("2026-01-01T00:00:00Z"),
  to: new Date("2026-01-31T23:59:59Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFindMany.mockResolvedValue([]);
  mockCount.mockResolvedValue(0);
  mockGroupBy.mockResolvedValue([]);
});

describe("getCertAnalytics", () => {
  it("returns zero totals when no certs exist", async () => {
    const result = await getCertAnalytics(baseInput);

    expect(result.totals.issued).toBe(0);
    expect(result.totals.unsatisfactory).toBe(0);
    expect(result.totals.fi).toBe(0);
    expect(result.totals.amendments).toBe(0);
    expect(result.observationStats).toEqual([]);
  });

  it("counts issued certs correctly", async () => {
    mockFindMany.mockResolvedValue([
      { id: "c1", outcome: "satisfactory" },
      { id: "c2", outcome: "satisfactory" },
      { id: "c3", outcome: "satisfactory" },
    ]);

    const result = await getCertAnalytics(baseInput);
    expect(result.totals.issued).toBe(3);
  });

  it("counts unsatisfactory rate correctly", async () => {
    mockFindMany.mockResolvedValue([
      { id: "c1", outcome: "satisfactory" },
      { id: "c2", outcome: "unsatisfactory" },
      { id: "c3", outcome: "unsatisfactory" },
      { id: "c4", outcome: "satisfactory" },
    ]);

    const result = await getCertAnalytics(baseInput);
    expect(result.totals.issued).toBe(4);
    expect(result.totals.unsatisfactory).toBe(2);
  });

  it("counts further_investigation correctly", async () => {
    mockFindMany.mockResolvedValue([
      { id: "c1", outcome: "satisfactory" },
      { id: "c2", outcome: "further_investigation" },
      { id: "c3", outcome: "further_investigation" },
    ]);

    const result = await getCertAnalytics(baseInput);
    expect(result.totals.fi).toBe(2);
  });

  it("counts amendments correctly", async () => {
    mockFindMany.mockResolvedValue([{ id: "c1", outcome: "satisfactory" }]);
    mockCount.mockResolvedValue(3);

    const result = await getCertAnalytics(baseInput);
    expect(result.totals.amendments).toBe(3);
  });

  it("groups observations correctly with percentages", async () => {
    mockFindMany.mockResolvedValue([
      { id: "c1", outcome: "unsatisfactory" },
      { id: "c2", outcome: "unsatisfactory" },
      { id: "c3", outcome: "satisfactory" },
      { id: "c4", outcome: "satisfactory" },
    ]);

    mockGroupBy.mockResolvedValue([
      { code: "C2", _count: { code: 3 } },
      { code: "C3", _count: { code: 2 } },
      { code: "C1", _count: { code: 1 } },
    ]);

    const result = await getCertAnalytics(baseInput);

    expect(result.observationStats).toHaveLength(3);
    expect(result.observationStats[0]).toEqual({ code: "C2", count: 3, percentage: 75 });
    expect(result.observationStats[1]).toEqual({ code: "C3", count: 2, percentage: 50 });
    expect(result.observationStats[2]).toEqual({ code: "C1", count: 1, percentage: 25 });
  });

  it("skips observation query when no certs in range", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await getCertAnalytics(baseInput);

    expect(mockGroupBy).not.toHaveBeenCalled();
    expect(result.observationStats).toEqual([]);
  });

  it("uses correct date range in queries", async () => {
    await getCertAnalytics(baseInput);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "comp-1",
          status: "issued",
          issuedAt: { gte: baseInput.from, lte: baseInput.to },
        }),
      }),
    );
  });
});
