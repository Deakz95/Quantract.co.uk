import { test, expect } from '@playwright/test';
import { createQuoteViaApi } from './_helpers';

test('client can accept quote and sign agreement (UI smoke)', async ({ page }) => {
  const quote = await createQuoteViaApi(page);

  // Client flow is token-secured, no login required.
  await page.goto(quote.shareUrl);
  await expect(page.getByRole('heading', { name: 'Your quote' })).toBeVisible();

  await page.getByRole('button', { name: 'Accept quote' }).click();

  // After accept, the agreement CTA should appear.
  const openAgreement = page.getByRole('link', { name: 'Open agreement' });
  await expect(openAgreement).toBeVisible();

  await openAgreement.click();
  await expect(page.getByRole('heading', { name: 'Works agreement' })).toBeVisible();

  // Sign section
  await page.getByLabel('Full name').fill('Playwright Signer');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Sign agreement' }).click();

  // Confirm signed state
  await expect(page.getByText('Status:')).toBeVisible();
  await expect(page.getByText(/^signed$/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Certificate' })).toBeVisible();
});
