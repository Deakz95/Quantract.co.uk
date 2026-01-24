import { test, expect, devices } from '@playwright/test';
import { createQuoteViaApi } from './_helpers';

test.use({ ...devices['iPhone 13'] });

test('Client accept + sign on mobile - DEBUG', async ({ page, request }) => {
  const quote = await createQuoteViaApi(request);
  
  // Navigate to quote
  await page.goto(`/client/quotes/${quote.token}`);
  await page.getByRole('button', { name: /accept/i }).click();
  
  // Wait for page to settle
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Take screenshot to see what's visible
  await page.screenshot({ path: 'after-accept-mobile.png', fullPage: true });
  
  // Log current URL
  console.log('Current URL:', page.url());
  
  // Log all visible text
  const bodyText = await page.locator('body').textContent();
  console.log('Page text:', bodyText);
  
  // Log all buttons
  const buttons = await page.locator('button').all();
  console.log('Number of buttons:', buttons.length);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const visible = await buttons[i].isVisible();
    console.log(`Button ${i}: "${text}" - Visible: ${visible}`);
  }
  
  // Log all links
  const links = await page.locator('a').all();
  console.log('Number of links:', links.length);
  for (let i = 0; i < links.length; i++) {
    const text = await links[i].textContent();
    const href = await links[i].getAttribute('href');
    const visible = await links[i].isVisible();
    console.log(`Link ${i}: "${text}" - href: ${href} - Visible: ${visible}`);
  }
  
  // Check for agreement link
  const agreementLink = page.getByRole('link', { name: /agreement|open|sign/i });
  const hasLink = await agreementLink.isVisible({ timeout: 3000 }).catch(() => false);
  console.log('Agreement link visible:', hasLink);
  
  if (hasLink) {
    const linkText = await agreementLink.textContent();
    const linkHref = await agreementLink.getAttribute('href');
    console.log('Agreement link text:', linkText);
    console.log('Agreement link href:', linkHref);
  }
});

test('Client accept + sign on mobile', async ({ page, request }) => {
  const quote = await createQuoteViaApi(request);
  
  // Navigate to quote
  await page.goto(`/client/quotes/${quote.token}`);
  await page.getByRole('button', { name: /accept/i }).click();
  
  // Wait for page to settle after accept
  await page.waitForLoadState('networkidle');
  
  // Check if there's a link to the agreement page
  const agreementLink = page.getByRole('link', { name: /agreement|open agreement/i });
  const hasLink = await agreementLink.isVisible({ timeout: 3000 }).catch(() => false);
  
  if (hasLink) {
    // Navigate to agreement if there's a link
    await agreementLink.click();
    await page.waitForLoadState('networkidle');
  }
  
  // Handle form fields that might be required before signing
  
  // 1. Check for terms/conditions checkbox
  const termsCheckbox = page.getByRole('checkbox', { name: /accept|terms|agree|consent/i });
  const hasTerms = await termsCheckbox.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasTerms) {
    await termsCheckbox.check();
    console.log('✓ Checked terms checkbox');
  }
  
  // 2. Check for signer name input
  const signerNameInput = page.getByPlaceholder(/name|signer|your name/i);
  const hasNameInput = await signerNameInput.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasNameInput) {
    await signerNameInput.fill('Playwright Test Signer');
    console.log('✓ Filled signer name');
  }
  
  // 3. Check for email input
  const emailInput = page.getByPlaceholder(/email|e-mail/i);
  const hasEmailInput = await emailInput.isVisible({ timeout: 2000 }).catch(() => false);
  if (hasEmailInput) {
    await emailInput.fill(quote.clientEmail);
    console.log('✓ Filled email');
  }
  
  // 4. Check for any other required text inputs
  const requiredInputs = page.locator('input[required]:not([type="checkbox"])');
  const count = await requiredInputs.count();
  for (let i = 0; i < count; i++) {
    const input = requiredInputs.nth(i);
    const type = await input.getAttribute('type');
    const placeholder = await input.getAttribute('placeholder') || '';
    
    // Skip if already filled
    const value = await input.inputValue();
    if (value) continue;
    
    // Fill based on type
    if (type === 'email') {
      await input.fill(quote.clientEmail);
    } else if (type === 'text' || !type) {
      await input.fill('Test Value');
    }
    console.log(`✓ Filled required input: ${placeholder || type}`);
  }
  
  // Now wait for sign button to be enabled
  const signButton = page.getByRole('button', { name: /sign/i });
  
  // Wait for button to be visible first
  await expect(signButton).toBeVisible({ timeout: 10000 });
  
  // Wait for button to be enabled (not just visible)
  await expect(signButton).toBeEnabled({ timeout: 30000 });
  
  await signButton.click();
  
  await expect(page.locator('text=Completed')).toBeVisible({ timeout: 10000 });
});
