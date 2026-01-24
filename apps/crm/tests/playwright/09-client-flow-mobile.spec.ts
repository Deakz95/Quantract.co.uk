import { test, expect, devices } from '@playwright/test';
import { createQuoteViaApi } from './_helpers';

test.use({ ...devices['iPhone 13'] });

test('Client accept + sign on mobile', async ({ page, request }) => {
  const quote = await createQuoteViaApi(request);
  
  // Navigate to quote
  await page.goto(`/client/quotes/${quote.token}`);
  
  // Click accept button
  await page.getByRole('button', { name: /accept/i }).click();
  
  // Wait for navigation/update to complete
  await page.waitForLoadState('networkidle');
  
  // FIX: Based on debug output, we need to click "Open agreement" link
  const agreementLink = page.locator('a:has-text("Open agreement")').first();
  await expect(agreementLink).toBeVisible({ timeout: 10000 });
  await agreementLink.click();
  
  // Wait for agreement page to load
  await page.waitForLoadState('networkidle');
  
  // FIX: The critical step - check the terms checkbox!
  // The debug output shows there's a terms checkbox that needs to be checked
  const termsCheckbox = page.locator('input[type="checkbox"]').first();
  await expect(termsCheckbox).toBeVisible({ timeout: 5000 });
  await termsCheckbox.check();
  
  // Now the sign button should be enabled
  const signButton = page.locator('button:has-text("Sign")').first();
  await expect(signButton).toBeVisible({ timeout: 5000 });
  
  // FIX: Wait for button to be enabled after checking terms
  await expect(signButton).toBeEnabled({ timeout: 10000 });
  
  // Click the sign button
  await signButton.click();
  
  // Wait for completion confirmation
  await expect(
    page.locator('text=/completed|success|signed/i').first()
  ).toBeVisible({ timeout: 10000 });
});
