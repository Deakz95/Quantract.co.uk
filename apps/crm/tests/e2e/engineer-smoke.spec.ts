import { test, expect } from "@playwright/test";

const ERROR_KEYS = /load_failed|forbidden|service_unavailable|user_not_found/i;

test.describe("Engineer portal smoke", () => {
  test("engineer pages load without error keys and session survives portal switch", async ({
    page,
  }) => {
    // 1. Auth handled by global setup

    // 2. Engineer Today
    await page.goto("/engineer/today");
    await page.waitForLoadState("networkidle");
    const todayText = await page.locator("body").innerText();
    expect(todayText).not.toMatch(ERROR_KEYS);

    // 3. Engineer Profile
    await page.goto("/engineer/profile");
    await expect(
      page
        .getByRole("heading")
        .or(page.locator("form"))
        .first()
    ).toBeVisible();
    const profileText = await page.locator("body").innerText();
    expect(profileText).not.toMatch(ERROR_KEYS);

    // 4. Session intact — navigate back to admin
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});
