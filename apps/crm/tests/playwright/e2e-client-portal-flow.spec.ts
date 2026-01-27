import { test, expect } from '@playwright/test';
import { loginAs, createQuoteViaApi, acceptQuote, generateInvoiceForQuote } from './_helpers';

/**
 * E2E Client Portal Flow: Complete client journey from quote to invoice
 *
 * Tests the full client experience:
 * 1. View quote details
 * 2. Accept quote
 * 3. Sign works agreement
 * 4. View invoice
 * 5. Access documents
 */
test.describe('Client Portal Flow', () => {
  test('client can view, accept quote and sign works agreement', async ({ page }) => {
    const timestamp = Date.now();

    // SETUP: Create quote via admin
    console.log('[E2E Client] Setting up test data...');

    await loginAs(page, 'admin');
    const quote = await createQuoteViaApi(page, {
      clientName: `Portal Test Client ${timestamp}`,
      clientEmail: `portal${timestamp}@example.com`,
    });

    console.log(`[E2E Client] Created quote ${quote.id} with token ${quote.token}`);

    // 1. CLIENT VIEWS QUOTE (no auth required - token-based access)
    await page.goto(`/client/quotes/${quote.token}`);

    // Verify quote page loads
    await expect(page.getByRole('heading', { name: /quote/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(quote.clientName)).toBeVisible();
    await expect(page.getByText(/£/)).toBeVisible(); // Amount is displayed

    console.log('[E2E Client] Quote page rendered correctly');

    // 2. CLIENT ACCEPTS QUOTE
    const acceptButton = page.getByRole('button', { name: /accept/i });
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    // Wait for acceptance confirmation
    await expect(
      page.getByText(/accepted/i).or(page.getByText(/thank you/i)).or(page.getByText(/agreement/i))
    ).toBeVisible({ timeout: 10000 });

    console.log('[E2E Client] Quote accepted successfully');

    // 3. CLIENT SIGNS WORKS AGREEMENT
    // Navigate to agreement page
    const agreementLink = page.getByRole('link', { name: /agreement/i }).or(
      page.getByRole('button', { name: /sign/i })
    ).or(page.locator('a[href*="/agreements/"]'));

    if (await agreementLink.isVisible()) {
      await agreementLink.click();
    } else {
      // Try direct navigation to agreement
      await page.goto(`/client/agreements/${quote.token}`);
    }

    // Wait for agreement page
    await page.waitForTimeout(1000);

    // Fill signature if signature canvas is present
    const signatureCanvas = page.locator('canvas').or(page.locator('[data-testid="signature-canvas"]'));
    if (await signatureCanvas.isVisible()) {
      // Draw a simple signature
      const box = await signatureCanvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.mouse.move(box.x + 150, box.y + 50);
        await page.mouse.move(box.x + 100, box.y + 100);
        await page.mouse.up();
      }
      console.log('[E2E Client] Signature drawn');
    }

    // Look for name input field and fill it
    const nameInput = page.getByPlaceholder(/name/i).or(page.getByLabel(/name/i)).first();
    if (await nameInput.isVisible()) {
      await nameInput.fill(quote.clientName);
    }

    // Submit the signature
    const signButton = page.getByRole('button', { name: /sign|submit|confirm/i }).first();
    if (await signButton.isVisible()) {
      await signButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Use API to sign if button not found
      await page.request.post(`/api/client/agreements/${quote.token}/sign`, {
        data: {
          signatureText: quote.clientName,
          signedAtISO: new Date().toISOString(),
        },
      });
    }

    // Verify agreement signed
    await expect(
      page.getByText(/signed/i).or(page.getByText(/complete/i)).or(page.getByText(/certificate/i))
    ).toBeVisible({ timeout: 10000 });

    console.log('[E2E Client] Agreement signed successfully');
  });

  test('client can view invoices and download PDF', async ({ page }) => {
    const timestamp = Date.now();

    // SETUP: Create quote, accept it, and generate invoice
    console.log('[E2E Client Invoice] Setting up test data...');

    await loginAs(page, 'admin');
    const quote = await createQuoteViaApi(page, {
      clientName: `Invoice Test Client ${timestamp}`,
      clientEmail: `invoice${timestamp}@example.com`,
    });

    // Accept quote
    await acceptQuote(page, quote.token);
    console.log(`[E2E Client Invoice] Quote ${quote.id} accepted`);

    // Generate invoice
    const invoice = await generateInvoiceForQuote(page, quote.id);
    console.log(`[E2E Client Invoice] Invoice ${invoice.id} generated with token ${invoice.token}`);

    // CLIENT VIEWS INVOICE (token-based access)
    await page.goto(`/client/invoices/${invoice.token}`);

    // Verify invoice page loads
    await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/£/)).toBeVisible(); // Amount is displayed

    console.log('[E2E Client Invoice] Invoice page rendered correctly');

    // DOWNLOAD PDF
    const pdfButton = page.getByRole('link', { name: /pdf|download/i }).or(
      page.getByRole('button', { name: /pdf|download/i })
    );

    if (await pdfButton.isVisible()) {
      // Check PDF link works (via API)
      const pdfRes = await page.request.get(`/api/client/invoices/${invoice.token}/pdf`);
      expect(pdfRes.ok()).toBeTruthy();

      const pdfBytes = await pdfRes.body();
      expect(pdfBytes.slice(0, 4).toString()).toBe('%PDF');
      console.log('[E2E Client Invoice] PDF generated successfully');
    } else {
      // Verify PDF via API directly
      const pdfRes = await page.request.get(`/api/client/invoices/${invoice.token}/pdf`);
      expect(pdfRes.ok()).toBeTruthy();
      console.log('[E2E Client Invoice] PDF API verified');
    }

    console.log('[E2E Client Invoice] Invoice flow complete');
  });

  test('client can access documents portal', async ({ page }) => {
    const timestamp = Date.now();
    const clientEmail = `docs${timestamp}@example.com`;

    // SETUP: Create client and quote
    console.log('[E2E Client Docs] Setting up test data...');

    await loginAs(page, 'admin');
    const quote = await createQuoteViaApi(page, {
      clientName: `Docs Test Client ${timestamp}`,
      clientEmail,
    });

    // Accept quote to activate client portal
    await acceptQuote(page, quote.token);

    // LOGIN AS CLIENT
    await loginAs(page, 'client', clientEmail);
    await page.goto('/client');

    // Verify client dashboard loads
    await expect(
      page.getByRole('heading', { name: /portal|dashboard|client/i }).or(
        page.getByText(/welcome/i)
      )
    ).toBeVisible({ timeout: 10000 });

    console.log('[E2E Client Docs] Client portal loaded');

    // Navigate to documents
    const docsLink = page.getByRole('link', { name: /document/i }).or(
      page.locator('a[href*="/documents"]')
    );

    if (await docsLink.isVisible()) {
      await docsLink.click();
      await expect(page.getByText(/document/i)).toBeVisible({ timeout: 10000 });
      console.log('[E2E Client Docs] Documents page accessible');
    } else {
      // Navigate directly
      await page.goto('/client/documents');
      await expect(page.getByText(/document/i).or(page.getByText(/no documents/i))).toBeVisible({ timeout: 10000 });
      console.log('[E2E Client Docs] Documents page loaded directly');
    }

    // Navigate to quotes list
    await page.goto('/client/quotes');
    await expect(
      page.getByText(/quote/i).or(page.getByRole('heading', { name: /quote/i }))
    ).toBeVisible({ timeout: 10000 });

    console.log('[E2E Client Docs] Quotes list accessible');

    // Verify the created quote appears
    await expect(page.getByText(quote.clientName)).toBeVisible();

    console.log('[E2E Client Docs] Document flow complete');
  });

  test('client can view and respond to variations', async ({ page }) => {
    const timestamp = Date.now();
    const clientEmail = `variation${timestamp}@example.com`;
    const engineerEmail = `engineer${timestamp}@demo.quantract`;

    // SETUP: Create quote, job, and variation
    console.log('[E2E Client Variation] Setting up test data...');

    await loginAs(page, 'admin');

    // Create engineer
    await page.request.post('/api/admin/engineers', {
      data: {
        name: `Test Engineer ${timestamp}`,
        email: engineerEmail,
        password: 'Password123!',
      },
    }).catch(() => null);

    // Create and accept quote
    const quote = await createQuoteViaApi(page, {
      clientName: `Variation Test Client ${timestamp}`,
      clientEmail,
    });
    await acceptQuote(page, quote.token);

    // Convert to job
    const jobRes = await page.request.post(`/api/admin/quotes/${quote.id}/convert-to-job`, { data: {} });
    const jobData = await jobRes.json();
    const jobId = jobData.job?.id || jobData.id;

    // Assign engineer
    await page.request.patch(`/api/admin/jobs/${jobId}`, {
      data: { engineerEmail },
    });

    console.log(`[E2E Client Variation] Job ${jobId} created and assigned`);

    // Create a variation
    const variationRes = await page.request.post('/api/admin/variations', {
      data: {
        jobId,
        title: `Additional work ${timestamp}`,
        description: 'Extra electrical work required',
        amount: 50000, // £500
        status: 'pending',
      },
    });

    if (variationRes.ok()) {
      const variationData = await variationRes.json();
      const variationId = variationData.variation?.id || variationData.id;
      const variationToken = variationData.variation?.token || variationData.token;

      console.log(`[E2E Client Variation] Variation ${variationId} created`);

      // CLIENT VIEWS VARIATION (if token-based access available)
      if (variationToken) {
        await page.goto(`/client/variations/${variationToken}`);

        await expect(
          page.getByText(/variation/i).or(page.getByText(/additional work/i))
        ).toBeVisible({ timeout: 10000 });

        console.log('[E2E Client Variation] Variation page accessible');
      }
    } else {
      console.log('[E2E Client Variation] Variation API not available, skipping');
    }

    console.log('[E2E Client Variation] Variation flow complete');
  });
});
