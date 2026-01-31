import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test("RAMS – issue and download PDF (smoke)", async ({ page }) => {
  await loginAs(page, "admin");

  // 1. Create a draft RAMS via API with minimum required fields
  const createRes = await page.request.post("/api/admin/rams", {
    data: {
      title: `Smoke Test RAMS ${Date.now()}`,
      type: "rams",
      contentJson: {
        projectName: "Smoke Test Project",
        projectAddress: "1 Test Road",
        clientName: "Smoke Client",
        startDate: "2026-01-01",
        endDate: "2026-02-01",
        scopeOfWork: "Electrical installation smoke test",
        hazards: [
          {
            hazard: "Live conductors",
            risk: "high",
            persons: "Electricians",
            controls: "Isolation",
            residualRisk: "low",
          },
        ],
        methodStatements: [
          {
            step: 1,
            description: "Isolate supply",
            responsible: "Lead electrician",
            ppe: "Insulated gloves",
          },
        ],
        emergencyProcedures: "Call 999",
        ppeRequired: ["Safety Boots"],
        toolsAndEquipment: [],
        permits: [],
      },
    },
  });

  const createBody = await createRes.json();
  expect(createRes.ok(), `Create failed: ${JSON.stringify(createBody)}`).toBeTruthy();
  const docId = createBody.data?.id ?? createBody.id;
  expect(docId).toBeTruthy();

  // 2. Issue the draft
  const issueRes = await page.request.post(`/api/admin/rams/${docId}/issue`);
  const issueBody = await issueRes.json();
  expect(issueRes.ok(), `Issue failed: ${JSON.stringify(issueBody)}`).toBeTruthy();

  // 3. Download PDF and assert response
  const pdfRes = await page.request.get(`/api/admin/rams/${docId}/pdf`);
  expect(pdfRes.status()).toBe(200);
  expect(pdfRes.headers()["content-type"]).toContain("application/pdf");

  const pdfBytes = await pdfRes.body();
  expect(pdfBytes.length).toBeGreaterThan(0);

  // Verify PDF magic bytes
  const header = pdfBytes.slice(0, 5).toString();
  expect(header).toBe("%PDF-");
});
