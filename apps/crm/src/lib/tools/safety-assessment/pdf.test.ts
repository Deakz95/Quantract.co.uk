import { describe, it, expect } from "vitest";
import { renderSafetyAssessmentPdf } from "./pdf";
import type { SafetyAssessmentContent } from "./schema";

const mockContent: SafetyAssessmentContent = {
  siteName: "Test Site",
  siteAddress: "456 Test Road",
  assessorName: "John Smith",
  date: "2026-01-15",
  categories: [
    {
      category: "Electrical Safety",
      checks: [
        { item: "Distribution boards secured", status: "pass", notes: "" },
        { item: "No exposed live conductors", status: "fail", notes: "Cable damage in corridor" },
        { item: "RCDs tested", status: "na", notes: "" },
      ],
    },
    {
      category: "Fire Safety",
      checks: [
        { item: "Fire extinguishers in date", status: "pass", notes: "" },
      ],
    },
  ],
  overallRating: "conditional",
  recommendations: ["Repair damaged cable in corridor", "Schedule RCD testing"],
};

describe("renderSafetyAssessmentPdf", () => {
  it("generates valid PDF bytes for issued document", async () => {
    const bytes = await renderSafetyAssessmentPdf(mockContent, {
      title: "Test Safety Assessment",
      version: 1,
      status: "issued",
      issuedAt: "2026-01-15T00:00:00Z",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("generates valid PDF bytes for draft document", async () => {
    const bytes = await renderSafetyAssessmentPdf(mockContent, {
      title: "Draft Assessment",
      version: 1,
      status: "draft",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("handles minimal content without errors", async () => {
    const minimal: SafetyAssessmentContent = {
      siteName: "X",
      siteAddress: "Y",
      assessorName: "Z",
      date: "2026-01-01",
      categories: [{ category: "General", checks: [{ item: "Check", status: "pass", notes: "" }] }],
      overallRating: "safe",
      recommendations: [],
    };

    const bytes = await renderSafetyAssessmentPdf(minimal, { title: "Min", version: 1, status: "issued" });
    expect(bytes.length).toBeGreaterThan(0);
  });
});
