import { describe, it, expect } from "vitest";
import { renderRamsPdf } from "./pdf";
import type { RamsContent } from "./schema";

const mockContent: RamsContent = {
  projectName: "Test Project",
  projectAddress: "123 Test Street",
  clientName: "Test Client",
  startDate: "2026-01-01",
  endDate: "2026-02-01",
  scopeOfWork: "Electrical installation",
  hazards: [
    { hazard: "Live conductors", risk: "high", persons: "Electricians", controls: "Isolation procedures", residualRisk: "low" },
  ],
  methodStatements: [
    { step: 1, description: "Isolate supply", responsible: "Lead electrician", ppe: "Insulated gloves" },
  ],
  emergencyProcedures: "Call 999. First aider on site.",
  ppeRequired: ["Safety Boots", "Hi-Vis Vest"],
  toolsAndEquipment: ["Multimeter", "Insulated screwdrivers"],
  permits: ["Isolation"],
};

describe("renderRamsPdf", () => {
  it("generates valid PDF bytes for issued document", async () => {
    const bytes = await renderRamsPdf(mockContent, {
      title: "Test RAMS",
      version: 1,
      status: "issued",
      preparedBy: "John Smith",
      reviewedBy: "Jane Doe",
      issuedAt: "2026-01-15T00:00:00Z",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("generates valid PDF bytes for draft document", async () => {
    const bytes = await renderRamsPdf(mockContent, {
      title: "Draft RAMS",
      version: 1,
      status: "draft",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("handles minimal content without errors", async () => {
    const minimal: RamsContent = {
      projectName: "X",
      projectAddress: "Y",
      clientName: "Z",
      startDate: "2026-01-01",
      endDate: "2026-01-02",
      scopeOfWork: "W",
      hazards: [{ hazard: "H", risk: "low", persons: "P", controls: "C", residualRisk: "low" }],
      methodStatements: [{ step: 1, description: "D", responsible: "R", ppe: "P" }],
      emergencyProcedures: "E",
      ppeRequired: ["Boots"],
      toolsAndEquipment: [],
      permits: [],
    };

    const bytes = await renderRamsPdf(minimal, { title: "Min", version: 1, status: "issued" });
    expect(bytes.length).toBeGreaterThan(0);
  });
});
