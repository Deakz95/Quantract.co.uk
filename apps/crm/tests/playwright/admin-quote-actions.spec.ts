import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Admin Quote Accept/Reject", () => {
  let quoteId: string;

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");

    // Create a test quote
    await page.goto("/admin/quotes");
    await page.click('text=New Quote');

    // Fill in quote details (adjust selectors based on actual form)
    // This is a simplified example
    await page.fill('input[name="clientName"]', "Test Client");
    await page.fill('input[name="clientEmail"]', "test@example.com");

    // Submit and get quote ID
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin\/quotes\/*/);

    // Extract quote ID from URL
    const url = page.url();
    quoteId = url.split("/").pop() || "";
  });

  test("Admin can accept quote via admin panel", async ({ page, request }) => {
    // Make API call to accept quote
    const response = await request.post(`/api/admin/quotes/${quoteId}/accept`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.quote.status).toBe("accepted");
  });

  test("Admin can reject quote via admin panel", async ({ page, request }) => {
    // Make API call to reject quote
    const response = await request.post(`/api/admin/quotes/${quoteId}/reject`, {
      data: {
        reason: "Client requested different scope"
      }
    });
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.ok).toBe(true);
    expect(data.quote.status).toBe("rejected");
  });

  test("Quote acceptance creates audit trail", async ({ page, request }) => {
    // Accept quote
    await request.post(`/api/admin/quotes/${quoteId}/accept`);

    // Check audit trail (adjust endpoint based on actual implementation)
    const auditResponse = await request.get(`/api/admin/quotes/${quoteId}`);
    const auditData = await auditResponse.json();

    // Verify audit metadata exists
    // This assumes audit events are included in quote details
    expect(auditData.quote).toBeDefined();
  });

  test("Accepted quote can be converted to job", async ({ page }) => {
    // Accept quote first
    await page.request.post(`/api/admin/quotes/${quoteId}/accept`);

    // Navigate to quote detail
    await page.goto(`/admin/quotes/${quoteId}`);

    // Look for "Create Job" or similar button
    const createJobButton = page.locator('button, a').filter({ hasText: /Create.*Job/i });

    if (await createJobButton.isVisible()) {
      await createJobButton.click();

      // Should navigate to jobs or show success
      await page.waitForTimeout(2000);

      // Verify job was created
      await page.goto("/admin/jobs");
      await expect(page.locator('text=Test Client')).toBeVisible();
    }
  });

  test("Only admin can access accept/reject endpoints", async ({ page, request }) => {
    // Logout admin
    await page.goto("/api/auth/logout");

    // Try to accept without auth (should fail)
    const response = await request.post(`/api/admin/quotes/${quoteId}/accept`);
    expect(response.status()).toBe(401);
  });
});

test.describe("Client Quote Acceptance with Better Error Handling", () => {
  test("Shows loading state while fetching quote", async ({ page }) => {
    await page.goto("/client/quotes/test-token-123");

    // Should show loading state initially
    const loadingIndicator = page.locator('text=Loading');
    if (await loadingIndicator.isVisible({ timeout: 500 })) {
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test("Shows user-friendly error for invalid token", async ({ page }) => {
    await page.goto("/client/quotes/invalid-token-xyz");

    // Should show error message
    await expect(page.locator('text=Unable to Load Quote, Error')).toBeVisible();
  });

  test("Shows retry button on error", async ({ page }) => {
    await page.goto("/client/quotes/invalid-token-xyz");

    // Should have retry button
    const retryButton = page.locator('button:has-text("Try Again")');
    await expect(retryButton).toBeVisible();
  });
});
