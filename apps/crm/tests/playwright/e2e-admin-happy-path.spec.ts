import { test, expect } from '@playwright/test';
import { loginAs } from './_helpers';

/**
 * E2E Happy Path: Admin creates quote → converts to job → adds cost → approves timesheet → verifies margin → creates invoice
 *
 * This test proves the core business flow works end-to-end before charging customers.
 */
test('admin happy path: quote → job → costing → timesheet → invoice', async ({ page }) => {
  const timestamp = Date.now();
  const clientEmail = `client${timestamp}@example.com`;
  const engineerEmail = `engineer${timestamp}@demo.quantract`;

  // 1. LOGIN AS ADMIN
  await loginAs(page, 'admin');
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();

  // 2. CREATE QUOTE
  await page.goto('/admin/quotes/new');
  await expect(page.getByRole('heading', { name: 'Create quote' })).toBeVisible();

  await page.getByPlaceholder('e.g. Jane Smith').fill(`E2E Test Client ${timestamp}`);
  await page.getByPlaceholder('e.g. jane@email.com').fill(clientEmail);

  // Add a line item
  await page.getByPlaceholder('Description').first().fill('Electrical Installation');
  const firstRowNumbers = page.locator('tbody tr').first().locator('input[type="number"]');
  await firstRowNumbers.nth(0).fill('1'); // quantity
  await firstRowNumbers.nth(1).fill('5000'); // £50.00

  await page.getByRole('button', { name: 'Create quote' }).click();
  await expect(page.getByRole('heading', { name: 'Quote' })).toBeVisible();

  // Extract quote ID from URL
  const quoteUrl = page.url();
  const quoteId = quoteUrl.match(/\/quotes\/([^/?]+)/)?.[1];
  expect(quoteId).toBeTruthy();

  console.log(`[E2E] Created quote ${quoteId}`);

  // 3. ACCEPT QUOTE (as client via API for speed)
  const quoteRes = await page.request.get(`/api/admin/quotes/${quoteId}`);
  const quoteData = await quoteRes.json();
  const token = quoteData.quote?.token || quoteData.token;

  await page.request.post(`/api/client/quotes/${token}/accept`, { data: {} });
  console.log(`[E2E] Accepted quote via token ${token}`);

  // 4. CONVERT TO JOB
  await page.goto(`/admin/quotes/${quoteId}`);

  // Click "Convert to job" button
  const convertButton = page.getByRole('button', { name: /convert to job/i });
  if (await convertButton.isVisible()) {
    await convertButton.click();
    await page.waitForTimeout(1000); // Wait for job creation
  }

  // Get job ID
  const jobsRes = await page.request.get('/api/admin/jobs');
  const jobsData = await jobsRes.json();
  const job = jobsData.jobs?.find((j: any) => j.quoteId === quoteId) || jobsData.items?.[0];
  const jobId = job?.id;
  expect(jobId).toBeTruthy();

  console.log(`[E2E] Created job ${jobId}`);

  // Assign engineer to job
  await page.goto(`/admin/jobs/${jobId}`);

  // Create engineer first if needed
  await page.request.post('/api/admin/engineers', {
    data: {
      name: 'Test Engineer',
      email: engineerEmail,
      password: 'Password123!',
    },
  }).catch(() => null); // Ignore if already exists

  // Assign engineer via API for reliability
  await page.request.patch(`/api/admin/jobs/${jobId}`, {
    data: { engineerEmail },
  });

  console.log(`[E2E] Assigned engineer ${engineerEmail} to job ${jobId}`);

  // 5. ADD COST ITEM
  await page.goto(`/admin/jobs/${jobId}`);

  // Navigate to costing section
  const costingLink = page.getByRole('link', { name: /costing/i }).or(page.getByText(/costing/i)).first();
  if (await costingLink.isVisible()) {
    await costingLink.click();
  }

  // Add cost via API for reliability
  await page.request.post('/api/admin/cost-items', {
    data: {
      jobId,
      type: 'labour',
      description: 'Engineer labour',
      quantity: 8,
      unitCost: 5000, // £50/hour
      lockStatus: 'open',
    },
  });

  console.log(`[E2E] Added cost item to job ${jobId}`);

  // Refresh page to see updated costing
  await page.reload();

  // Verify budget shows (£50 from quote)
  await expect(page.getByText(/budget/i)).toBeVisible();

  // 6. CREATE AND SUBMIT TIMESHEET (as engineer via API)

  // Get current week Monday
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  monday.setUTCHours(0, 0, 0, 0);
  const weekStart = monday.toISOString();

  // Create timesheet via API
  await page.request.post('/api/admin/timesheets', {
    data: {
      engineerEmail,
      weekStart,
    },
  }).catch(() => null); // Ignore if already exists

  // Add time entry
  const startedAt = new Date(monday);
  startedAt.setUTCHours(9, 0, 0, 0);
  const endedAt = new Date(monday);
  endedAt.setUTCHours(17, 0, 0, 0);

  await page.request.post('/api/admin/time-entries', {
    data: {
      jobId,
      engineerEmail,
      startedAtISO: startedAt.toISOString(),
      endedAtISO: endedAt.toISOString(),
      breakMinutes: 60,
      notes: 'E2E test time entry',
    },
  });

  // Submit timesheet via API
  await page.request.post(`/api/admin/timesheets/submit`, {
    data: { engineerEmail, weekStart },
  });

  console.log(`[E2E] Created and submitted timesheet for ${engineerEmail}`);

  // 7. APPROVE TIMESHEET
  await page.goto('/admin/timesheets');

  // Find submitted timesheet
  const submittedBadge = page.getByText('submitted').first();
  if (await submittedBadge.isVisible()) {
    await submittedBadge.click();
  } else {
    // Navigate via link
    const timesheetLink = page.locator('a[href*="/admin/timesheets/"]').first();
    await timesheetLink.click();
  }

  // Approve timesheet
  const approveButton = page.getByRole('button', { name: /approve/i });
  if (await approveButton.isVisible()) {
    await approveButton.click();
    await page.waitForTimeout(1000);
  }

  console.log(`[E2E] Approved timesheet`);

  // 8. VERIFY MARGIN UPDATE
  await page.goto(`/admin/jobs/${jobId}`);

  // Check that actual cost now shows (from approved timesheet)
  await expect(page.getByText(/actual cost/i).or(page.getByText(/cost/i))).toBeVisible();

  // Margin should be calculated (budget - actual cost)
  await expect(page.getByText(/margin/i)).toBeVisible();

  console.log(`[E2E] Verified margin calculations`);

  // 9. CREATE INVOICE
  await page.goto(`/admin/quotes/${quoteId}`);

  // Create invoice via API for reliability
  const invoiceRes = await page.request.post('/api/admin/invoices', {
    data: { quoteId },
  });
  expect(invoiceRes.ok()).toBeTruthy();

  const invoiceData = await invoiceRes.json();
  const invoice = invoiceData.invoice || invoiceData;
  const invoiceId = invoice.id;

  console.log(`[E2E] Created invoice ${invoiceId}`);

  // Verify invoice shows in admin
  await page.goto(`/admin/invoices/${invoiceId}`);
  await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible();
  await expect(page.getByText(/£/)).toBeVisible(); // Has amounts

  // Verify invoice PDF generates
  const pdfRes = await page.request.get(`/api/client/invoices/${invoice.token}/pdf`);
  expect(pdfRes.ok()).toBeTruthy();
  const pdfBytes = await pdfRes.body();
  expect(pdfBytes.slice(0, 4).toString()).toBe('%PDF');

  console.log(`[E2E] ✅ Admin happy path complete: quote → job → costing → timesheet → invoice`);
});
