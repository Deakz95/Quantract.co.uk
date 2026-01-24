import { test, expect } from "@playwright/test";
import { loginAs } from "./_helpers";

test("Admin can create client (smoke)", async ({ page, request }) => {
  // --- Auth (API + UI)
  await loginAs(page, "admin", "admin@demo.quantract");
  await loginAs(request, "admin", "admin@demo.quantract");

  // --- Create client via API (stable, fast)
  const uniq = Date.now();
  const clientName = `Test Client ${uniq}`;
  const clientEmail = `testclient.${uniq}@example.com`;

  const res = await request.post("/api/admin/clients", {
    data: {
      name: clientName,
      email: clientEmail,
    },
  });

  const body = await res.text().catch(() => "");
  expect(res.ok(), `API create failed: ${res.status()} ${body}`).toBeTruthy();

  // --- Go to UI
  await page.goto("/admin/clients");

  /**
   * ===========================
   * HEADING ASSERTION (robust)
   * ===========================
   */

  let headingVerified = false;

  // ---- OPTION A: explicit <h1> (preferred)
  try {
    await expect(page.locator("h1")).toHaveText(/clients/i, { timeout: 5000 });
    headingVerified = true;
  } catch (e) {
    console.warn("[clients-crud] Option A failed (h1)");
  }

  // ---- OPTION B: <main> scoped <h1>
  if (!headingVerified) {
    try {
      await expect(
        page.getByRole("main").locator("h1")
      ).toHaveText(/clients/i, { timeout: 5000 });
      headingVerified = true;
    } catch (e) {
      console.warn("[clients-crud] Option B failed (main > h1)");
    }
  }

  // ---- OPTION C: first matching heading
  if (!headingVerified) {
    await expect(
      page.getByRole("heading", { name: /clients/i }).first()
    ).toBeVisible({ timeout: 5000 });
    headingVerified = true;
  }

  expect(headingVerified).toBeTruthy();

  /**
   * ===========================
   * VERIFY CLIENT APPEARS
   * ===========================
   */

  // Allow UI background refetch
  await page.reload();

  await expect(page.locator("body")).toContainText(clientName, {
    timeout: 30000,
  });
});
