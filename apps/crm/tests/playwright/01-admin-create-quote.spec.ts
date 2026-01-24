import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

test('admin can create a quote (UI smoke)', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@demo.com');

  await page.goto('/admin/quotes/new');
  await expect(page.getByRole('heading', { name: 'Create quote' })).toBeVisible();


  await page.getByPlaceholder('e.g. Jane Smith').fill('Playwright Client');
  await page.getByPlaceholder('e.g. jane@email.com').fill(`client.${Date.now()}@example.com`);

  // Fill first line item
  await page.getByPlaceholder('Description').first().fill('Labour');
  const firstRowNumbers = page.locator('tbody tr').first().locator('input[type="number"]');
  await firstRowNumbers.nth(0).fill('1'); // qty
  await firstRowNumbers.nth(1).fill('100'); // unit price

  await page.getByRole('button', { name: 'Create quote' }).click();

  // We should land on the quote detail page.
  await expect(page.getByRole('heading', { name: 'Quote' })).toBeVisible();
  await expect(page.getByText('Status:')).toBeVisible();
});
