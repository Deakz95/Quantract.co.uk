import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test.describe("Admin Universal Access", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("Admin can access admin portal", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.locator("text=Dashboard")).toBeVisible();
  });

  test("Admin can access client portal", async ({ page }) => {
    await page.goto("/client");
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/login/);
    // Should see client portal content
    await expect(page).toHaveURL(/\/client/);
  });

  test("Admin can access engineer portal", async ({ page }) => {
    await page.goto("/engineer");
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/\/login/);
    // Should see engineer portal content
    await expect(page).toHaveURL(/\/engineer/);
  });

  test("Admin navigation includes portal links", async ({ page }) => {
    await page.goto("/admin");

    // Check for portal access links
    const clientPortalLink = page.locator('a[href="/client"]').filter({ hasText: "Client Portal" });
    const engineerPortalLink = page.locator('a[href="/engineer"]').filter({ hasText: "Engineer Portal" });

    await expect(clientPortalLink).toBeVisible();
    await expect(engineerPortalLink).toBeVisible();
  });

  test("Admin can navigate to client portal from admin nav", async ({ page }) => {
    await page.goto("/admin");

    // Click client portal link
    await page.click('text=→ Client Portal');

    // Should navigate to client portal
    await expect(page).toHaveURL(/\/client/);
  });

  test("Admin can navigate to engineer portal from admin nav", async ({ page }) => {
    await page.goto("/admin");

    // Click engineer portal link
    await page.click('text=→ Engineer Portal');

    // Should navigate to engineer portal
    await expect(page).toHaveURL(/\/engineer/);
  });

  test("Admin navigation shows comprehensive menu", async ({ page }) => {
    await page.goto("/admin");

    // Check for all key admin sections
    const expectedSections = [
      "Dashboard",
      "Enquiries",
      "Quotes",
      "Jobs",
      "Invoices",
      "Planner",
      "Clients",
      "Engineers",
      "Certificates",
      "Timesheets",
      "Invites",
      "Settings"
    ];

    for (const section of expectedSections) {
      await expect(page.locator(`text=${section}`).first()).toBeVisible();
    }
  });
});

test.describe("Client Portal Restrictions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "client");
  });

  test("Client CANNOT access admin portal", async ({ page }) => {
    await page.goto("/admin");
    // Should redirect to client login
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("Client CANNOT access engineer portal", async ({ page }) => {
    await page.goto("/engineer");
    // Should redirect to engineer login
    await expect(page).toHaveURL(/\/engineer\/login/);
  });

  test("Client CAN access client portal", async ({ page }) => {
    await page.goto("/client");
    await expect(page).toHaveURL(/\/client/);
  });
});

test.describe("Engineer Portal Restrictions", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "engineer");
  });

  test("Engineer CANNOT access admin portal", async ({ page }) => {
    await page.goto("/admin");
    // Should redirect to admin login
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("Engineer CANNOT access client portal", async ({ page }) => {
    await page.goto("/client");
    // Should redirect to client login
    await expect(page).toHaveURL(/\/client\/login/);
  });

  test("Engineer CAN access engineer portal", async ({ page }) => {
    await page.goto("/engineer");
    await expect(page).toHaveURL(/\/engineer/);
  });
});
