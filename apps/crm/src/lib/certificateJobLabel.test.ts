import { describe, expect, it } from "vitest";

/**
 * Regression test for P1-E: certificate job picker label formatting.
 *
 * Previously showed raw UUIDs: "Acme Corp - active (a1b2c3d4)"
 * Now shows: "Acme Corp — Site Name — active (#a1b2c3d4)"
 */

type Job = {
  id: string;
  clientName: string;
  status: string;
  siteAddress?: string;
  client?: { id: string; name: string };
  site?: { id: string; name: string; address1?: string };
};

function formatJobLabel(j: Job): string {
  const label = j.client?.name || j.clientName || "Unnamed";
  const site = j.site?.name || j.siteAddress || "";
  const shortId = j.id.slice(0, 8);
  return `${label}${site ? ` — ${site}` : ""} — ${j.status} (#${shortId})`;
}

describe("Certificate job picker label", () => {
  it("shows client name, site, status, and short ID", () => {
    const job: Job = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      clientName: "Acme Corp",
      status: "active",
      client: { id: "c1", name: "Acme Corp" },
      site: { id: "s1", name: "123 Main St" },
    };
    expect(formatJobLabel(job)).toBe("Acme Corp — 123 Main St — active (#a1b2c3d4)");
  });

  it("falls back to clientName when client object is missing", () => {
    const job: Job = {
      id: "bbbbbbbb-0000-0000-0000-000000000000",
      clientName: "Fallback Ltd",
      status: "completed",
    };
    expect(formatJobLabel(job)).toBe("Fallback Ltd — completed (#bbbbbbbb)");
  });

  it("shows Unnamed when no client info is available", () => {
    const job: Job = {
      id: "cccccccc-0000-0000-0000-000000000000",
      clientName: "",
      status: "draft",
    };
    expect(formatJobLabel(job)).toBe("Unnamed — draft (#cccccccc)");
  });

  it("includes site address when site object has name", () => {
    const job: Job = {
      id: "dddddddd-1111-2222-3333-444444444444",
      clientName: "Test Client",
      status: "invoiced",
      site: { id: "s2", name: "Workshop A", address1: "45 Park Rd" },
    };
    expect(formatJobLabel(job)).toBe("Test Client — Workshop A — invoiced (#dddddddd)");
  });

  it("falls back to siteAddress when site object is missing", () => {
    const job: Job = {
      id: "eeeeeeee-0000-0000-0000-000000000000",
      clientName: "Site Test",
      status: "active",
      siteAddress: "99 Oak Lane",
    };
    expect(formatJobLabel(job)).toBe("Site Test — 99 Oak Lane — active (#eeeeeeee)");
  });
});
