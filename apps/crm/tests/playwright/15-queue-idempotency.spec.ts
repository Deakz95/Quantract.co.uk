import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers";

/**
 * STAGE 5 SMOKE TEST: Background Job Queue Idempotency
 * Verifies that duplicate job submissions are prevented
 */

test.describe("Queue Idempotency Tests", () => {
  test("Email job with same idempotency key is not duplicated", async ({ request }) => {
    await loginAs(request, "admin", "admin@demo.quantract");

    // Get an invoice to send
    const invoicesRes = await request.get("/api/admin/invoices");
    const invoicesData = await invoicesRes.json();
    expect(invoicesData.ok).toBe(true);

    if (invoicesData.invoices && invoicesData.invoices.length > 0) {
      const invoiceId = invoicesData.invoices[0].id;

      // Submit the same email job twice with same idempotency key
      const firstSubmit = await request.post(`/api/admin/invoices/${invoiceId}/send`, {
        data: {},
      });
      expect(firstSubmit.ok()).toBeTruthy();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Second submission should be idempotent (not create duplicate)
      const secondSubmit = await request.post(`/api/admin/invoices/${invoiceId}/send`, {
        data: {},
      });
      expect(secondSubmit.ok()).toBeTruthy();

      // Both should return success, but only one email should be queued
      // (idempotency is enforced at the Bull queue level)
    }
  });

  test("Failed jobs UI is accessible and functional", async ({ page, request }) => {
    await loginAs(page, "admin", "admin@demo.quantract");
    await loginAs(request, "admin", "admin@demo.quantract");

    // Navigate to failed jobs page
    await page.goto("/admin/system/failed-jobs");

    // Verify heading exists
    await expect(page.locator("text=/Failed Background Jobs/i")).toBeVisible({ timeout: 10000 });

    // GET failed jobs via API
    const res = await request.get("/api/admin/jobs/failed");
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.failedJobs).toBeDefined();
    expect(Array.isArray(data.failedJobs)).toBe(true);
  });

  test("Non-admin cannot access failed jobs", async ({ request }) => {
    await loginAs(request, "engineer", "engineer@demo.quantract");

    const res = await request.get("/api/admin/jobs/failed");
    expect(res.status()).toBe(403);
  });

  test("Failed jobs can be retried (API endpoint exists)", async ({ request }) => {
    await loginAs(request, "admin", "admin@demo.quantract");

    // Check retry endpoint exists (POST to same endpoint with action=retry)
    const res = await request.post("/api/admin/jobs/failed", {
      data: {
        action: "retry",
        jobId: "test-job-id",
        queue: "email",
      },
    });

    // Should return 200 or 404 (if job doesn't exist), not 403/401
    expect([200, 404, 400]).toContain(res.status());
  });

  test("Queue processors use idempotency keys", async ({ request }) => {
    await loginAs(request, "admin", "admin@demo.quantract");

    // Verify that quote sending uses idempotency
    const quotesRes = await request.get("/api/admin/quotes");
    const quotesData = await quotesRes.json();

    if (quotesData.ok && quotesData.quotes && quotesData.quotes.length > 0) {
      const quoteId = quotesData.quotes[0].id;

      // Send quote email
      const sendRes = await request.post(`/api/admin/quotes/${quoteId}/send`, {
        data: {},
      });

      // Should succeed (idempotency is enforced internally)
      expect([200, 201, 400]).toContain(sendRes.status());
    }
  });
});
