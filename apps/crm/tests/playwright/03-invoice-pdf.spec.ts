import { test, expect } from '@playwright/test';
import { createQuoteViaApi, acceptQuote, generateInvoiceForQuote } from './_helpers';

test('client can download invoice PDF (smoke)', async ({ page }) => {
  // FIX: Add small delay to avoid rapid-fire login requests
  await page.waitForTimeout(1000);
  
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
