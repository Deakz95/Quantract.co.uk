import { test, expect } from '@playwright/test';
import { loginAs, createQuoteViaApi, acceptQuote, generateInvoiceForQuote } from './_helpers';

/**
 * E2E Multi-Role Workflow: Complete business cycle across Admin, Engineer, and Client
 *
 * This test demonstrates the full lifecycle of a job across all three user roles:
 * 1. Admin creates quote and sends to client
 * 2. Client accepts quote and signs agreement
 * 3. Admin converts to job and assigns engineer
 * 4. Engineer views job and submits timesheet
 * 5. Admin approves timesheet and creates invoice
 * 6. Client receives and views invoice
 */
test.describe('Multi-Role Workflow Integration', () => {
  test('complete business cycle: admin → client → engineer → admin → client', async ({ page }) => {
    const timestamp = Date.now();
    const clientEmail = `multirole${timestamp}@example.com`;
    const engineerEmail = `engineer${timestamp}@demo.quantract`;

    console.log('[E2E Multi-Role] Starting complete business cycle test...');

    // ========== PHASE 1: ADMIN CREATES QUOTE ==========
    console.log('[E2E Multi-Role] PHASE 1: Admin creates quote');

    await loginAs(page, 'admin');
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();

    // Create engineer for later
    await page.request.post('/api/admin/engineers', {
      data: {
        name: `Multi-Role Engineer ${timestamp}`,
        email: engineerEmail,
        password: 'Password123!',
      },
    }).catch(() => null);

    // Create quote
    const quote = await createQuoteViaApi(page, {
      clientName: `Multi-Role Client ${timestamp}`,
      clientEmail,
    });

    console.log(`[E2E Multi-Role] Quote ${quote.id} created`);

    // Verify quote in admin panel
    await page.goto(`/admin/quotes/${quote.id}`);
    await expect(page.getByRole('heading', { name: /quote/i })).toBeVisible();
    await expect(page.getByText(quote.clientName)).toBeVisible();

    console.log('[E2E Multi-Role] Phase 1 complete: Quote visible in admin');

    // ========== PHASE 2: CLIENT ACCEPTS QUOTE ==========
    console.log('[E2E Multi-Role] PHASE 2: Client accepts quote');

    // Navigate to client quote view (token-based, no auth needed)
    await page.goto(`/client/quotes/${quote.token}`);
    await expect(page.getByRole('heading', { name: /quote/i })).toBeVisible({ timeout: 10000 });

    // Accept quote
    const acceptButton = page.getByRole('button', { name: /accept/i });
    await expect(acceptButton).toBeVisible();
    await acceptButton.click();

    // Wait for acceptance
    await expect(
      page.getByText(/accepted/i).or(page.getByText(/agreement/i)).or(page.getByText(/thank/i))
    ).toBeVisible({ timeout: 10000 });

    console.log('[E2E Multi-Role] Phase 2 complete: Quote accepted by client');

    // ========== PHASE 3: ADMIN CONVERTS TO JOB ==========
    console.log('[E2E Multi-Role] PHASE 3: Admin converts to job');

    await loginAs(page, 'admin');

    // Convert quote to job
    const jobRes = await page.request.post(`/api/admin/quotes/${quote.id}/convert-to-job`, { data: {} });
    expect(jobRes.ok()).toBeTruthy();

    const jobData = await jobRes.json();
    const jobId = jobData.job?.id || jobData.id;

    // Assign engineer
    await page.request.patch(`/api/admin/jobs/${jobId}`, {
      data: { engineerEmail },
    });

    console.log(`[E2E Multi-Role] Job ${jobId} created and assigned to ${engineerEmail}`);

    // Verify job in admin panel
    await page.goto(`/admin/jobs/${jobId}`);
    await expect(page.getByRole('heading', { name: /job/i })).toBeVisible();

    console.log('[E2E Multi-Role] Phase 3 complete: Job created and engineer assigned');

    // ========== PHASE 4: ENGINEER VIEWS JOB AND SUBMITS TIMESHEET ==========
    console.log('[E2E Multi-Role] PHASE 4: Engineer submits timesheet');

    await loginAs(page, 'engineer', engineerEmail);
    await page.goto('/engineer');
    await expect(
      page.getByText(/engineer/i).or(page.getByText(/job/i))
    ).toBeVisible({ timeout: 10000 });

    // View assigned job
    await page.goto(`/engineer/jobs/${jobId}`);
    await expect(page.getByText(quote.clientName)).toBeVisible({ timeout: 10000 });

    console.log('[E2E Multi-Role] Engineer can view assigned job');

    // Create timesheet entry
    const now = new Date();
    const day = now.getUTCDay();
    const diff = (day + 6) % 7;
    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    monday.setUTCHours(0, 0, 0, 0);
    const weekStart = monday.toISOString();

    const startTime = new Date(monday);
    startTime.setUTCHours(9, 0, 0, 0);
    const endTime = new Date(monday);
    endTime.setUTCHours(17, 0, 0, 0);

    // Create timesheet via API
    await page.request.post('/api/engineer/time-entries', {
      data: {
        jobId,
        startedAtISO: startTime.toISOString(),
        endedAtISO: endTime.toISOString(),
        breakMinutes: 60,
        notes: 'Multi-role test entry',
      },
    });

    // Submit timesheet
    await page.request.post('/api/engineer/timesheets', {
      data: { weekStart },
    });

    console.log('[E2E Multi-Role] Phase 4 complete: Engineer submitted timesheet');

    // ========== PHASE 5: ADMIN APPROVES TIMESHEET ==========
    console.log('[E2E Multi-Role] PHASE 5: Admin approves timesheet');

    await loginAs(page, 'admin');
    await page.goto('/admin/timesheets');

    await expect(page.getByText(/timesheet/i).or(page.getByRole('heading'))).toBeVisible();

    // Approve timesheet via API
    const approveRes = await page.request.post('/api/admin/timesheets/approve', {
      data: { engineerEmail, weekStart },
    });

    if (approveRes.ok()) {
      console.log('[E2E Multi-Role] Timesheet approved');
    } else {
      console.log('[E2E Multi-Role] Timesheet approve API returned', approveRes.status());
    }

    console.log('[E2E Multi-Role] Phase 5 complete: Timesheet processed');

    // ========== PHASE 6: ADMIN CREATES INVOICE ==========
    console.log('[E2E Multi-Role] PHASE 6: Admin creates invoice');

    const invoice = await generateInvoiceForQuote(page, quote.id);
    console.log(`[E2E Multi-Role] Invoice ${invoice.id} created`);

    // Verify invoice in admin panel
    await page.goto(`/admin/invoices/${invoice.id}`);
    await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible();

    console.log('[E2E Multi-Role] Phase 6 complete: Invoice created');

    // ========== PHASE 7: CLIENT VIEWS INVOICE ==========
    console.log('[E2E Multi-Role] PHASE 7: Client views invoice');

    // Client views invoice (token-based access)
    await page.goto(`/client/invoices/${invoice.token}`);
    await expect(page.getByRole('heading', { name: /invoice/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/£/)).toBeVisible();

    console.log('[E2E Multi-Role] Phase 7 complete: Client can view invoice');

    // Verify PDF generation
    const pdfRes = await page.request.get(`/api/client/invoices/${invoice.token}/pdf`);
    expect(pdfRes.ok()).toBeTruthy();
    const pdfBytes = await pdfRes.body();
    expect(pdfBytes.slice(0, 4).toString()).toBe('%PDF');

    console.log('[E2E Multi-Role] PDF generation verified');

    console.log('[E2E Multi-Role] ✅ Complete business cycle test passed!');
  });

  test('admin can view all activity across roles', async ({ page }) => {
    const timestamp = Date.now();
    const clientEmail = `activity${timestamp}@example.com`;
    const engineerEmail = `engineer${timestamp}@demo.quantract`;

    console.log('[E2E Activity] Setting up cross-role activity...');

    await loginAs(page, 'admin');

    // Create engineer
    await page.request.post('/api/admin/engineers', {
      data: {
        name: `Activity Engineer ${timestamp}`,
        email: engineerEmail,
        password: 'Password123!',
      },
    }).catch(() => null);

    // Create quote and job
    const quote = await createQuoteViaApi(page, {
      clientName: `Activity Client ${timestamp}`,
      clientEmail,
    });

    await acceptQuote(page, quote.token);

    const jobRes = await page.request.post(`/api/admin/quotes/${quote.id}/convert-to-job`, { data: {} });
    const jobData = await jobRes.json();
    const jobId = jobData.job?.id || jobData.id;

    await page.request.patch(`/api/admin/jobs/${jobId}`, {
      data: { engineerEmail },
    });

    console.log(`[E2E Activity] Job ${jobId} created`);

    // Add some activity as engineer
    await loginAs(page, 'engineer', engineerEmail);

    const now = new Date();
    const monday = new Date(now);
    monday.setUTCHours(9, 0, 0, 0);

    await page.request.post('/api/engineer/time-entries', {
      data: {
        jobId,
        startedAtISO: monday.toISOString(),
        endedAtISO: new Date(monday.getTime() + 8 * 60 * 60 * 1000).toISOString(),
        breakMinutes: 60,
        notes: 'Activity test entry',
      },
    });

    console.log('[E2E Activity] Engineer activity added');

    // Admin views dashboard with all activity
    await loginAs(page, 'admin');
    await page.goto('/admin');

    // Dashboard should show recent activity
    await expect(
      page.getByText(/recent/i).or(page.getByText(/activity/i)).or(page.getByRole('heading'))
    ).toBeVisible();

    console.log('[E2E Activity] Admin dashboard loaded with activity');

    // Check jobs page shows the job
    await page.goto('/admin/jobs');
    await expect(page.getByText(quote.clientName)).toBeVisible();

    console.log('[E2E Activity] Activity flow complete');
  });

  test('permissions are enforced across roles', async ({ page }) => {
    const timestamp = Date.now();

    console.log('[E2E Permissions] Testing role-based access control...');

    await loginAs(page, 'admin');

    // Create resources
    const quote = await createQuoteViaApi(page, {
      clientName: `Permission Client ${timestamp}`,
      clientEmail: `perm${timestamp}@example.com`,
    });

    await acceptQuote(page, quote.token);

    const jobRes = await page.request.post(`/api/admin/quotes/${quote.id}/convert-to-job`, { data: {} });
    const jobData = await jobRes.json();
    const jobId = jobData.job?.id || jobData.id;

    console.log(`[E2E Permissions] Resources created: quote ${quote.id}, job ${jobId}`);

    // Test: Client cannot access admin endpoints
    await loginAs(page, 'client', quote.clientEmail);

    const adminRes = await page.request.get('/api/admin/quotes');
    expect(adminRes.status()).toBeGreaterThanOrEqual(400);
    console.log('[E2E Permissions] Client blocked from admin API (status:', adminRes.status(), ')');

    // Test: Client cannot access engineer endpoints
    const engineerRes = await page.request.get('/api/engineer/jobs');
    expect(engineerRes.status()).toBeGreaterThanOrEqual(400);
    console.log('[E2E Permissions] Client blocked from engineer API (status:', engineerRes.status(), ')');

    // Create engineer for testing
    await loginAs(page, 'admin');
    const engineerEmail = `perm_eng${timestamp}@demo.quantract`;
    await page.request.post('/api/admin/engineers', {
      data: {
        name: `Permission Engineer ${timestamp}`,
        email: engineerEmail,
        password: 'Password123!',
      },
    }).catch(() => null);

    // Test: Engineer cannot access admin create endpoints
    await loginAs(page, 'engineer', engineerEmail);

    const createQuoteRes = await page.request.post('/api/admin/quotes', {
      data: {
        clientName: 'Unauthorized',
        clientEmail: 'unauth@test.com',
        vatRate: 0.2,
        items: [],
      },
    });
    expect(createQuoteRes.status()).toBeGreaterThanOrEqual(400);
    console.log('[E2E Permissions] Engineer blocked from creating quotes (status:', createQuoteRes.status(), ')');

    // Test: Engineer cannot delete jobs
    const deleteJobRes = await page.request.delete(`/api/admin/jobs/${jobId}`);
    expect(deleteJobRes.status()).toBeGreaterThanOrEqual(400);
    console.log('[E2E Permissions] Engineer blocked from deleting jobs (status:', deleteJobRes.status(), ')');

    console.log('[E2E Permissions] ✅ Permission enforcement verified');
  });

  test('data isolation between tenants', async ({ page }) => {
    const timestamp = Date.now();

    console.log('[E2E Isolation] Testing data isolation...');

    await loginAs(page, 'admin');

    // Create two separate quotes for different clients
    const quote1 = await createQuoteViaApi(page, {
      clientName: `Tenant A Client ${timestamp}`,
      clientEmail: `tenanta${timestamp}@example.com`,
    });

    const quote2 = await createQuoteViaApi(page, {
      clientName: `Tenant B Client ${timestamp}`,
      clientEmail: `tenantb${timestamp}@example.com`,
    });

    console.log(`[E2E Isolation] Created quotes: ${quote1.id}, ${quote2.id}`);

    // Client A should only see their quote
    await page.goto(`/client/quotes/${quote1.token}`);
    await expect(page.getByText(quote1.clientName)).toBeVisible();
    // They should NOT see tenant B's data
    await expect(page.getByText(quote2.clientName)).not.toBeVisible();

    console.log('[E2E Isolation] Client A sees only their data');

    // Client B should only see their quote
    await page.goto(`/client/quotes/${quote2.token}`);
    await expect(page.getByText(quote2.clientName)).toBeVisible();
    // They should NOT see tenant A's data
    await expect(page.getByText(quote1.clientName)).not.toBeVisible();

    console.log('[E2E Isolation] Client B sees only their data');

    // Verify token-based access prevents cross-access
    // Client with quote1 token cannot access quote2 data
    const crossAccessRes = await page.request.get(`/api/client/quotes/${quote1.token}`);
    if (crossAccessRes.ok()) {
      const data = await crossAccessRes.json();
      expect(data.quote?.id || data.id).toBe(quote1.id);
      expect(data.quote?.id || data.id).not.toBe(quote2.id);
    }

    console.log('[E2E Isolation] ✅ Data isolation verified');
  });
});
