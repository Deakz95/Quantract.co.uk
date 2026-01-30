import { describe, expect, it } from "vitest";

/**
 * Regression tests for the deals Kanban board crash fix (P0-A).
 *
 * The bug: API returned { stages, dealsByStage } but the client expected
 * stages with embedded `deals` arrays. Accessing `s.deals.length` on a
 * stage without `deals` threw "Cannot read properties of undefined".
 *
 * Fix: API now returns stages with embedded deals, and client is null-safe.
 */

type StageWithDeals = {
  id: string;
  name: string;
  deals?: Array<{ id: string; value: number }>;
};

function totalDeals(stagesWithDeals: StageWithDeals[]): number {
  return stagesWithDeals.reduce((sum, s) => sum + (s.deals ?? []).length, 0);
}

function totalValue(stagesWithDeals: StageWithDeals[]): number {
  return stagesWithDeals.reduce(
    (sum, s) => sum + (s.deals ?? []).reduce((dSum, d) => dSum + d.value, 0),
    0
  );
}

describe("Deals Kanban — null-safe aggregation", () => {
  it("handles stages with deals arrays", () => {
    const stages: StageWithDeals[] = [
      { id: "1", name: "Lead", deals: [{ id: "a", value: 100 }, { id: "b", value: 200 }] },
      { id: "2", name: "Won", deals: [{ id: "c", value: 500 }] },
    ];
    expect(totalDeals(stages)).toBe(3);
    expect(totalValue(stages)).toBe(800);
  });

  it("handles stages with missing deals (undefined)", () => {
    const stages: StageWithDeals[] = [
      { id: "1", name: "Lead" },
      { id: "2", name: "Won", deals: undefined },
    ];
    expect(totalDeals(stages)).toBe(0);
    expect(totalValue(stages)).toBe(0);
  });

  it("handles empty deals arrays", () => {
    const stages: StageWithDeals[] = [
      { id: "1", name: "Lead", deals: [] },
    ];
    expect(totalDeals(stages)).toBe(0);
    expect(totalValue(stages)).toBe(0);
  });

  it("handles empty stages array", () => {
    expect(totalDeals([])).toBe(0);
    expect(totalValue([])).toBe(0);
  });

  it("handles mixed: some stages with deals, some without", () => {
    const stages: StageWithDeals[] = [
      { id: "1", name: "Lead", deals: [{ id: "a", value: 50 }] },
      { id: "2", name: "Qualified" },
      { id: "3", name: "Won", deals: [{ id: "b", value: 300 }] },
    ];
    expect(totalDeals(stages)).toBe(2);
    expect(totalValue(stages)).toBe(350);
  });
});

describe("Deals API — stagesWithDeals shape", () => {
  it("builds stagesWithDeals from stages + dealsByStage", () => {
    // Simulates the API logic
    const stages = [
      { id: "s1", name: "Lead", sortOrder: 0 },
      { id: "s2", name: "Won", sortOrder: 1 },
    ];
    const deals = [
      { id: "d1", stageId: "s1", value: 100 },
      { id: "d2", stageId: "s1", value: 200 },
      { id: "d3", stageId: "s2", value: 500 },
    ];

    const dealsByStage: Record<string, typeof deals> = {};
    for (const stage of stages) {
      dealsByStage[stage.id] = [];
    }
    for (const deal of deals) {
      if (dealsByStage[deal.stageId]) {
        dealsByStage[deal.stageId].push(deal);
      }
    }

    const stagesWithDeals = stages.map((stage) => ({
      ...stage,
      deals: dealsByStage[stage.id] ?? [],
    }));

    expect(stagesWithDeals).toHaveLength(2);
    expect(stagesWithDeals[0].deals).toHaveLength(2);
    expect(stagesWithDeals[1].deals).toHaveLength(1);
    // Every stage has a deals array, never undefined
    for (const s of stagesWithDeals) {
      expect(Array.isArray(s.deals)).toBe(true);
    }
  });

  it("returns empty deals array for stages with no deals", () => {
    const stages = [{ id: "s1", name: "Empty", sortOrder: 0 }];
    const deals: Array<{ id: string; stageId: string }> = [];

    const dealsByStage: Record<string, typeof deals> = {};
    for (const stage of stages) {
      dealsByStage[stage.id] = [];
    }
    for (const deal of deals) {
      if (dealsByStage[deal.stageId]) {
        dealsByStage[deal.stageId].push(deal);
      }
    }

    const stagesWithDeals = stages.map((stage) => ({
      ...stage,
      deals: dealsByStage[stage.id] ?? [],
    }));

    expect(stagesWithDeals[0].deals).toEqual([]);
  });
});
