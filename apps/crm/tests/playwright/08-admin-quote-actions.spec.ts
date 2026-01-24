import { test, expect } from "@playwright/test";
import { loginAs, createQuoteViaApi } from "./_helpers";

test.describe("Admin Quote Actions", () => {
  test("Admin can accept quote on behalf of client", async ({ page }) => {
    test.setTimeout(90_000);

    await loginAs(page, "admin");
    const api = page.request;

    // 1) Create a quote
    const quote = await createQuoteViaApi(api);
    expect(quote?.id).toBeTruthy();
    expect(quote?.token).toBeTruthy();

    // 2) Navigate to quote detail page
    await page.goto(`/admin/quotes/${quote.id}`, { waitUntil: "networkidle" });

    // 3) Verify Accept Quote button is visible
    const acceptButton = page.locator('button:has-text("Accept Quote")');
    await expect(acceptButton).toBeVisible({ timeout: 10_000 });

    // 4) Click Accept Quote button
    await acceptButton.click();

    // 5) Wait for success toast
    await expect(page.locator('text=/Quote accepted successfully|Agreement created/i')).toBeVisible({ timeout: 10_000 });

    // 6) Verify button is now disabled or hidden (quote is accepted)
    await expect(acceptButton).not.toBeVisible({ timeout: 5_000 });

    // 7) Verify Convert to Job button appears
    const convertButton = page.locator('button:has-text("Convert to Job")');
    await expect(convertButton).toBeVisible({ timeout: 10_000 });

    // 8) Verify green acceptance callout is shown
    await expect(page.locator('text=/Quote Accepted/i')).toBeVisible();
    await expect(page.locator('text=/Agreement:/i')).toBeVisible();
  });

  test("Admin can reject quote on behalf of client", async ({ page }) => {
    test.setTimeout(90_000);

    await loginAs(page, "admin");
    const api = page.request;

    // 1) Create a quote
    const quote = await createQuoteViaApi(api);
    expect(quote?.id).toBeTruthy();

    // 2) Navigate to quote detail page
    await page.goto(`/admin/quotes/${quote.id}`, { waitUntil: "networkidle" });

    // 3) Verify Reject Quote button is visible
    const rejectButton = page.locator('button:has-text("Reject Quote")');
    await expect(rejectButton).toBeVisible({ timeout: 10_000 });

    // 4) Click Reject Quote button
    await rejectButton.click();

    // 5) Wait for confirmation dialog
    await expect(page.locator('text=/Reject this quote/i')).toBeVisible({ timeout: 5_000 });

    // 6) Optionally enter rejection reason
    const reasonTextarea = page.locator('textarea[placeholder*="Price too high"]');
    if (await reasonTextarea.isVisible({ timeout: 2_000 })) {
      await reasonTextarea.fill("Test rejection reason");
    }

    // 7) Confirm rejection
    const confirmButton = page.locator('button:has-text("Reject Quote")').last();
    await confirmButton.click();

    // 8) Wait for success toast
    await expect(page.locator('text=/Quote rejected/i')).toBeVisible({ timeout: 10_000 });

    // 9) Verify both accept and reject buttons are now hidden
    await expect(rejectButton).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Accept Quote")')).not.toBeVisible({ timeout: 5_000 });
  });

  test("Admin can convert accepted quote to job", async ({ page }) => {
    test.setTimeout(120_000);

    await loginAs(page, "admin");
    const api = page.request;

    // 1) Create a quote
    const quote = await createQuoteViaApi(api);
    expect(quote?.id).toBeTruthy();

    // 2) Accept the quote via API
    const acceptRes = await api.post(`/api/admin/quotes/${quote.id}/accept`);
    expect(acceptRes.ok()).toBe(true);

    // 3) Navigate to quote detail page
    await page.goto(`/admin/quotes/${quote.id}`, { waitUntil: "networkidle" });

    // 4) Verify Convert to Job button is visible
    const convertButton = page.locator('button:has-text("Convert to Job")');
    await expect(convertButton).toBeVisible({ timeout: 10_000 });

    // 5) Click Convert to Job button
    await convertButton.click();

    // 6) Wait for success toast and redirect
    await expect(page.locator('text=/Job created from quote|Redirecting/i')).toBeVisible({ timeout: 10_000 });

    // 7) Should redirect to job detail page
    await page.waitForURL(/\/admin\/jobs\/[^/]+/, { timeout: 30_000 });

    // 8) Verify we're on a job detail page
    await expect(page.locator('text=/Job|Status:/i')).toBeVisible({ timeout: 10_000 });
  });

  test("Accept and Reject buttons are hidden after quote is accepted", async ({ page }) => {
    test.setTimeout(90_000);

    await loginAs(page, "admin");
    const api = page.request;

    // 1) Create and accept a quote
    const quote = await createQuoteViaApi(api);
    await api.post(`/api/admin/quotes/${quote.id}/accept`);

    // 2) Navigate to quote detail page
    await page.goto(`/admin/quotes/${quote.id}`, { waitUntil: "networkidle" });

    // 3) Verify Accept and Reject buttons are NOT visible
    await expect(page.locator('button:has-text("Accept Quote")')).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Reject Quote")')).not.toBeVisible({ timeout: 5_000 });

    // 4) Verify Convert to Job button IS visible
    await expect(page.locator('button:has-text("Convert to Job")')).toBeVisible({ timeout: 10_000 });
  });

  test("Accept and Reject buttons are hidden after quote is rejected", async ({ page }) => {
    test.setTimeout(90_000);

    await loginAs(page, "admin");
    const api = page.request;

    // 1) Create and reject a quote
    const quote = await createQuoteViaApi(api);
    await api.post(`/api/admin/quotes/${quote.id}/reject`);

    // 2) Navigate to quote detail page
    await page.goto(`/admin/quotes/${quote.id}`, { waitUntil: "networkidle" });

    // 3) Verify Accept and Reject buttons are NOT visible
    await expect(page.locator('button:has-text("Accept Quote")')).not.toBeVisible({ timeout: 5_000 });
    await expect(page.locator('button:has-text("Reject Quote")')).not.toBeVisible({ timeout: 5_000 });

    // 4) Verify Convert to Job button is NOT visible (quote was rejected)
    await expect(page.locator('button:has-text("Convert to Job")')).not.toBeVisible({ timeout: 5_000 });
  });

  test("Admin context banner appears when viewing client portal", async ({ page }) => {
    test.setTimeout(60_000);

    await loginAs(page, "admin");

    // 1) Navigate to client portal from admin
    await page.goto("/client", { waitUntil: "networkidle" });

    // 2) Verify admin context banner is visible
    await expect(page.locator('text=/Admin View|Viewing as/i')).toBeVisible({ timeout: 10_000 });

    // 3) Verify "Exit Admin View" button exists
    const exitButton = page.locator('button:has-text("Exit")');
    await expect(exitButton).toBeVisible({ timeout: 5_000 });

    // 4) Click exit button
    await exitButton.click();

    // 5) Should redirect back to admin dashboard
    await page.waitForURL(/\/admin/, { timeout: 10_000 });
  });

  test("Breadcrumbs appear on quote detail page", async ({ page }) => {
    test.setTimeout(90_000);

    await loginAs(page, "admin");
    const api = page.request;

    // 1) Create a quote
    const quote = await createQuoteViaApi(api);

    // 2) Navigate to quote detail page
    await page.goto(`/admin/quotes/${quote.id}`, { waitUntil: "networkidle" });

    // 3) Verify breadcrumbs exist
    const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbs).toBeVisible({ timeout: 10_000 });

    // 4) Verify breadcrumb contains "Dashboard" and "Quotes"
    await expect(breadcrumbs).toContainText("Dashboard");
    await expect(breadcrumbs).toContainText("Quotes");
  });
});
