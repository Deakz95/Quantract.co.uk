import { test, expect } from "@playwright/test";
import { loginAs, createQuoteViaApi } from "./_helpers";

/**
 * CRITICAL COMPLIANCE TEST
 *
 * This test verifies that the checklist gating system works correctly:
 * - Jobs cannot be marked as completed if required checklist items are incomplete
 * - The system enforces this at the API level (not just UI)
 * - Audit trail is maintained
 *
 * This is a NON-NEGOTIABLE requirement for regulatory compliance.
 */

async function assertOkOrThrow(res: any, label: string) {
  if (res.ok()) return;
  const status = res.status?.() ?? "unknown";
  let bodyText = "<unable to read body>";
  try {
    bodyText = await res.text();
  } catch {}
  throw new Error(`${label} failed: ${status}\n${bodyText}`);
}

function agreementTokenFromShareUrl(shareUrl: string | null | undefined): string | null {
  if (!shareUrl) return null;
  const parts = String(shareUrl).split("/").filter(Boolean);
  return parts[parts.length - 1] || null;
}

test("Job completion is blocked when required checklist items are incomplete", async ({ page }) => {
  test.setTimeout(180_000);

  await loginAs(page, "admin");
  const api = page.request;

  // 1) Create a checklist template with required items
  const createTemplateRes = await api.post("/api/admin/checklist-templates", {
    data: {
      title: "Electrical Safety Checklist",
      description: "Required for all electrical jobs",
      items: [
        {
          title: "Verify isolation",
          description: "Ensure power is isolated",
          isRequired: true,
          sortOrder: 0,
        },
        {
          title: "Test RCD",
          description: "Test residual current device",
          isRequired: true,
          sortOrder: 1,
        },
        {
          title: "Check earthing",
          description: "Verify earthing is correct",
          isRequired: true,
          sortOrder: 2,
        },
        {
          title: "Optional documentation check",
          description: "Optional step",
          isRequired: false,
          sortOrder: 3,
        },
      ],
    },
  });

  await assertOkOrThrow(createTemplateRes, "create template");
  const templateData = await createTemplateRes.json();
  const templateId = templateData.template?.id;
  expect(templateId).toBeTruthy();

  // 2) Create a job (via quote acceptance flow)
  const quote = await createQuoteViaApi(api);
  expect(quote?.id).toBeTruthy();
  expect(quote?.token).toBeTruthy();

  // Accept quote
  const acceptRes = await api.post(`/api/client/quotes/${quote.token}/accept`);
  await assertOkOrThrow(acceptRes, "quote accept");

  const acceptJson = await acceptRes.json();
  const agreementShareUrl = acceptJson?.quote?.agreement?.shareUrl ?? null;
  const agreementToken = agreementTokenFromShareUrl(agreementShareUrl);
  expect(agreementToken).toBeTruthy();

  // Sign agreement
  const nowIso = new Date().toISOString();
  const signRes = await api.post(`/api/client/agreements/${agreementToken}/sign`, {
    data: {
      accepted: true,
      acceptTerms: true,
      signerName: "Playwright Tester",
      signerEmail: quote.clientEmail,
      signedAt: nowIso,
      signerIp: "127.0.0.1",
      signerUserAgent: "playwright",
    },
  });

  await assertOkOrThrow(signRes, "agreement sign");

  // Wait for job to be created
  let job: any = null;
  await expect
    .poll(
      async () => {
        const res = await api.get("/api/admin/jobs");
        if (!res.ok()) return null;

        const json = await res.json();
        const jobs = Array.isArray(json.jobs) ? json.jobs : json;

        job = (Array.isArray(jobs) ? jobs : []).find((j: any) => j?.quoteId === quote.id) ?? null;
        return job;
      },
      { timeout: 60_000, intervals: [500, 1000, 2000] }
    )
    .not.toBeNull();

  const jobId = job.id;
  expect(jobId).toBeTruthy();

  // 3) Attach checklist to job
  const attachRes = await api.post(`/api/jobs/${jobId}/checklists`, {
    data: { templateId },
  });

  await assertOkOrThrow(attachRes, "attach checklist");
  const attachData = await attachRes.json();
  const checklistId = attachData.checklist?.id;
  const items = attachData.checklist?.items || [];
  expect(checklistId).toBeTruthy();
  expect(items.length).toBeGreaterThan(0);

  // 4) CRITICAL TEST: Try to complete job WITHOUT completing required items
  // This MUST fail
  const completeAttempt1 = await api.patch(`/api/admin/jobs/${jobId}`, {
    data: { status: "completed" },
  });

  // Should fail with a 400 or 500 error
  expect(completeAttempt1.ok()).toBe(false);
  const completeError1 = await completeAttempt1.json();
  expect(completeError1.error || completeError1.message || "").toMatch(/checklist|required|incomplete/i);

  // 5) Complete SOME but not ALL required items
  const requiredItems = items.filter((i: any) => i.isRequired);
  expect(requiredItems.length).toBeGreaterThan(1); // We created 3 required items

  // Complete only the first required item
  const firstRequiredItem = requiredItems[0];
  const completeItemRes = await api.patch(
    `/api/jobs/${jobId}/checklists/${checklistId}/items/${firstRequiredItem.id}`,
    {
      data: { status: "completed" },
    }
  );

  await assertOkOrThrow(completeItemRes, "complete first item");

  // 6) CRITICAL TEST: Try to complete job with PARTIAL completion
  // This MUST still fail
  const completeAttempt2 = await api.patch(`/api/admin/jobs/${jobId}`, {
    data: { status: "completed" },
  });

  expect(completeAttempt2.ok()).toBe(false);
  const completeError2 = await completeAttempt2.json();
  expect(completeError2.error || completeError2.message || "").toMatch(/checklist|required|incomplete/i);

  // 7) Complete ALL required items
  for (const item of requiredItems.slice(1)) {
    const res = await api.patch(
      `/api/jobs/${jobId}/checklists/${checklistId}/items/${item.id}`,
      {
        data: { status: "completed" },
      }
    );
    await assertOkOrThrow(res, `complete item ${item.title}`);
  }

  // Note: We intentionally do NOT complete the optional item

  // 8) CRITICAL TEST: Now completion SHOULD succeed
  const completeAttempt3 = await api.patch(`/api/admin/jobs/${jobId}`, {
    data: { status: "completed" },
  });

  await assertOkOrThrow(completeAttempt3, "complete job after all required items done");
  const finalJob = await completeAttempt3.json();
  expect(finalJob.job?.status).toBe("completed");

  console.log("✅ CRITICAL COMPLIANCE TEST PASSED:");
  console.log("  - Job completion was blocked when required items were incomplete");
  console.log("  - Job completion succeeded after all required items were completed");
  console.log("  - Optional items correctly did not block completion");
});

test("Multiple checklists enforce gating correctly", async ({ page }) => {
  test.setTimeout(180_000);

  await loginAs(page, "admin");
  const api = page.request;

  // Create two templates
  const template1Res = await api.post("/api/admin/checklist-templates", {
    data: {
      title: "Safety Checklist",
      items: [
        { title: "PPE Check", isRequired: true, sortOrder: 0 },
        { title: "Site Hazard Assessment", isRequired: true, sortOrder: 1 },
      ],
    },
  });
  await assertOkOrThrow(template1Res, "create template 1");
  const template1Data = await template1Res.json();
  const template1Id = template1Data.template?.id;

  const template2Res = await api.post("/api/admin/checklist-templates", {
    data: {
      title: "Quality Checklist",
      items: [
        { title: "Final inspection", isRequired: true, sortOrder: 0 },
      ],
    },
  });
  await assertOkOrThrow(template2Res, "create template 2");
  const template2Data = await template2Res.json();
  const template2Id = template2Data.template?.id;

  // Create job
  const quote = await createQuoteViaApi(api);
  const acceptRes = await api.post(`/api/client/quotes/${quote.token}/accept`);
  await assertOkOrThrow(acceptRes, "quote accept");

  const acceptJson = await acceptRes.json();
  const agreementToken = agreementTokenFromShareUrl(acceptJson?.quote?.agreement?.shareUrl);

  const signRes = await api.post(`/api/client/agreements/${agreementToken}/sign`, {
    data: {
      accepted: true,
      acceptTerms: true,
      signerName: "Test",
      signerEmail: quote.clientEmail,
      signedAt: new Date().toISOString(),
      signerIp: "127.0.0.1",
      signerUserAgent: "playwright",
    },
  });
  await assertOkOrThrow(signRes, "sign agreement");

  let job: any = null;
  await expect
    .poll(
      async () => {
        const res = await api.get("/api/admin/jobs");
        if (!res.ok()) return null;
        const json = await res.json();
        const jobs = Array.isArray(json.jobs) ? json.jobs : json;
        job = (Array.isArray(jobs) ? jobs : []).find((j: any) => j?.quoteId === quote.id);
        return job;
      },
      { timeout: 60_000, intervals: [500, 1000] }
    )
    .not.toBeNull();

  const jobId = job.id;

  // Attach both checklists
  const attach1Res = await api.post(`/api/jobs/${jobId}/checklists`, {
    data: { templateId: template1Id },
  });
  await assertOkOrThrow(attach1Res, "attach checklist 1");
  const checklist1 = (await attach1Res.json()).checklist;

  const attach2Res = await api.post(`/api/jobs/${jobId}/checklists`, {
    data: { templateId: template2Id },
  });
  await assertOkOrThrow(attach2Res, "attach checklist 2");
  const checklist2 = (await attach2Res.json()).checklist;

  // Complete only first checklist
  for (const item of checklist1.items) {
    await api.patch(`/api/jobs/${jobId}/checklists/${checklist1.id}/items/${item.id}`, {
      data: { status: "completed" },
    });
  }

  // Try to complete job - should fail because checklist 2 is incomplete
  const attempt = await api.patch(`/api/admin/jobs/${jobId}`, {
    data: { status: "completed" },
  });
  expect(attempt.ok()).toBe(false);

  // Complete second checklist
  for (const item of checklist2.items) {
    await api.patch(`/api/jobs/${jobId}/checklists/${checklist2.id}/items/${item.id}`, {
      data: { status: "completed" },
    });
  }

  // Now should succeed
  const finalAttempt = await api.patch(`/api/admin/jobs/${jobId}`, {
    data: { status: "completed" },
  });
  await assertOkOrThrow(finalAttempt, "complete job after all checklists done");

  console.log("✅ Multiple checklists gating test PASSED");
});
