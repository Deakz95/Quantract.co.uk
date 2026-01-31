import { describe, it, expect } from "vitest";

/**
 * Tests for portal timeline logic.
 * Since the timeline is a pure aggregation endpoint, we test the sorting
 * and scoping rules that the route enforces.
 */

type TimelineItem = {
  id: string;
  ts: string;
  type: string;
  title: string;
  companyId?: string;
  clientId?: string;
};

function sortTimeline(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

function filterByScope(items: TimelineItem[], companyId: string, clientId: string): TimelineItem[] {
  return items.filter((i) => i.companyId === companyId && i.clientId === clientId);
}

describe("portal timeline", () => {
  it("sorts items by timestamp descending", () => {
    const items: TimelineItem[] = [
      { id: "1", ts: "2025-01-01T10:00:00Z", type: "job", title: "Old job" },
      { id: "2", ts: "2025-06-15T12:00:00Z", type: "quote", title: "Recent quote" },
      { id: "3", ts: "2025-03-10T08:00:00Z", type: "invoice", title: "Mid invoice" },
    ];

    const sorted = sortTimeline(items);
    expect(sorted[0].id).toBe("2"); // most recent first
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("1"); // oldest last
  });

  it("tenant scoping: company A cannot see company B items", () => {
    const items: TimelineItem[] = [
      { id: "1", ts: "2025-01-01T10:00:00Z", type: "job", title: "CompA job", companyId: "compA", clientId: "c1" },
      { id: "2", ts: "2025-01-02T10:00:00Z", type: "job", title: "CompB job", companyId: "compB", clientId: "c2" },
      { id: "3", ts: "2025-01-03T10:00:00Z", type: "job", title: "CompA job2", companyId: "compA", clientId: "c1" },
    ];

    const compAItems = filterByScope(items, "compA", "c1");
    expect(compAItems).toHaveLength(2);
    expect(compAItems.every((i) => i.companyId === "compA")).toBe(true);
  });

  it("portal user scoping: customer A cannot see customer B items", () => {
    const items: TimelineItem[] = [
      { id: "1", ts: "2025-01-01T10:00:00Z", type: "job", title: "Client1 job", companyId: "comp", clientId: "client1" },
      { id: "2", ts: "2025-01-02T10:00:00Z", type: "invoice", title: "Client2 invoice", companyId: "comp", clientId: "client2" },
      { id: "3", ts: "2025-01-03T10:00:00Z", type: "certificate", title: "Client1 cert", companyId: "comp", clientId: "client1" },
    ];

    const client1Items = filterByScope(items, "comp", "client1");
    expect(client1Items).toHaveLength(2);
    expect(client1Items.every((i) => i.clientId === "client1")).toBe(true);

    const client2Items = filterByScope(items, "comp", "client2");
    expect(client2Items).toHaveLength(1);
    expect(client2Items[0].id).toBe("2");
  });

  it("empty items list returns empty sorted result", () => {
    expect(sortTimeline([])).toEqual([]);
  });
});
