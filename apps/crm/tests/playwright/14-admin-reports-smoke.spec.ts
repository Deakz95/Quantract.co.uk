import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers";

/**
 * STAGE 4 SMOKE TEST: Admin Reports
 * Verifies that key report endpoints are accessible and return data
 */

test.describe("Admin Reports Smoke Tests", () => {
  test("Admin can access dashboard report", async ({ page, request }) => {
    await loginAs(page, "admin", "admin@demo.quantract");
    await loginAs(request, "admin", "admin@demo.quantract");

    // GET dashboard report
    const res = await request.get("/api/admin/reports/dashboard");
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.metrics).toBeDefined();
    expect(data.metrics.pipelineValue).toBeDefined();
    expect(data.metrics.activeJobs).toBeDefined();
  });

  test("Admin can access A/R aging report", async ({ request }) => {
    await loginAs(request, "admin", "admin@demo.quantract");

    const res = await request.get("/api/admin/reports/ar-aging");
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.invoices).toBeDefined();
    expect(Array.isArray(data.invoices)).toBe(true);
  });

  test("Admin can access engineer utilisation report", async ({ request }) => {
    await loginAs(request, "admin", "admin@demo.quantract");

    const startDate = "2024-01-01";
    const endDate = "2024-12-31";
    const res = await request.get(
      `/api/admin/reports/engineer-utilisation?startDate=${startDate}&endDate=${endDate}`
    );
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.engineers).toBeDefined();
    expect(Array.isArray(data.engineers)).toBe(true);
  });

  test("Admin can access quote win rate report", async ({ request }) => {
    await loginAs(request, "admin", "admin@demo.quantract");

    const res = await request.get("/api/admin/reports/quote-win-rate");
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.metrics).toBeDefined();
  });

  test("Non-admin cannot access reports", async ({ request }) => {
    await loginAs(request, "client", "client@demo.quantract");

    const res = await request.get("/api/admin/reports/dashboard");
    expect(res.status()).toBe(403);
  });

  test("Unauthenticated user cannot access reports", async ({ request }) => {
    const res = await request.get("/api/admin/reports/dashboard");
    expect(res.status()).toBe(401);
  });
});
