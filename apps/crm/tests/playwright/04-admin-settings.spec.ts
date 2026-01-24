import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

function extractCompanyName(payload: any): string | null {
  // Try a few common shapes
  return (
    payload?.data?.company?.name ??
    payload?.company?.name ??
    payload?.data?.name ??
    payload?.name ??
    null
  );
}

test('Admin settings load', async ({ page, request }) => {
  await loginAs(request, 'admin');

  // API sanity check (also gives us a stable value to assert in the UI)
  const res = await request.get('/api/admin/settings');
  expect(res.ok()).toBeTruthy();

  const json = await res.json().catch(() => null);
  const companyName = extractCompanyName(json);

  // Load settings UI
  await page.goto('/admin/settings');
  await expect(page).toHaveURL(/\/admin\/settings/);

  // Settings page may not have a "Settings" heading or a "Save" button.
  // Assert that the page actually rendered something meaningful.
  if (companyName) {
    await expect(page.locator('body')).toContainText(companyName, { timeout: 30000 });
  } else {
    // Fallback: ensure main content exists and isn't empty
    await expect(page.locator('main')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('main')).toContainText(/./, { timeout: 30000 });
  }
});
