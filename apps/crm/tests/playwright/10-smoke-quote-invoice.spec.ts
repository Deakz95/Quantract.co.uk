import { test, expect } from '@playwright/test';
import { loginAs, createQuoteViaApi, acceptQuote, generateInvoiceForQuote } from './_helpers';

test('admin creates a quote (smoke)', async ({ page }) => {
  await loginAs(page, 'admin', 'admin@demo.com');

  await page.goto('/admin/quotes/new');
  // FIX: Use getByRole to target the heading specifically (avoid ambiguous selector)
  await expect(page.getByRole('heading', { name: 'Create quote' })).toBeVisible();

  await page.getByPlaceholder('e.g. Jane Smith').fill(`Playwright Client ${Date.now()}`);
  await page.getByPlaceholder('e.g. jane@email.com').fill(`client.${Date.now()}@example.com`);

  await page.getByPlaceholder('Description').first().fill('Labour');
  const firstRowNumbers = page.locator('tbody tr').first().locator('input[type="number"]');
  await firstRowNumbers.nth(0).fill('1');
  await firstRowNumbers.nth(1).fill('100');

  await page.getByRole('button', { name: 'Create quote' }).click();

  await expect(page.getByRole('heading', { name: 'Quote' })).toBeVisible();
  await expect(page.getByText('Status:')).toBeVisible();
});

test('client accepts quote (smoke)', async ({ page }) => {
  const quote = await createQuoteViaApi(page);

  await page.goto(quote.shareUrl);
  await expect(page.getByRole('heading', { name: 'Your quote' })).toBeVisible();

  await page.getByRole('button', { name: 'Accept quote' }).click();

  const openAgreement = page.getByRole('link', { name: 'Open agreement' });
  await expect(openAgreement).toBeVisible();
});

test('invoice PDF downloads (smoke)', async ({ page }) => {
  const quote = await createQuoteViaApi(page);
  await acceptQuote(page, quote.token);

  const invoice = await generateInvoiceForQuote(page, quote.id);

  const res = await page.request.get(`/api/client/invoices/${invoice.token}/pdf`);
  expect(res.ok()).toBeTruthy();

  const contentType = res.headers()['content-type'];
  expect(contentType).toContain('application/pdf');

  const bytes = await res.body();
  expect(bytes.slice(0, 4).toString()).toBe('%PDF');
});
