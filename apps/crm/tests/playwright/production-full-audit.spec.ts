import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * PRODUCTION FULL AUDIT
 * Comprehensive test of www.quantract.co.uk
 *
 * Tests: UI/UX, Flows, Buttons, Console Errors, API Responses
 */

const BASE_URL = 'https://www.quantract.co.uk';
const CREDENTIALS = {
  email: 'callumdeakin1995@hotmail.com',
  password: 'p194406290',
};

interface Issue {
  page: string;
  type: 'error' | 'warning' | 'ui' | 'ux' | 'broken' | 'api';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  details?: string;
}

const issues: Issue[] = [];
const consoleErrors: { page: string; message: string }[] = [];
const networkErrors: { page: string; url: string; status: number }[] = [];

function logIssue(issue: Issue) {
  issues.push(issue);
  console.log(`[${issue.severity.toUpperCase()}] ${issue.type}: ${issue.description} (${issue.page})`);
}

async function setupConsoleListener(page: Page, pageName: string) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out common non-issues
      if (!text.includes('favicon') && !text.includes('Third-party cookie')) {
        consoleErrors.push({ page: pageName, message: text });
        console.log(`[CONSOLE ERROR] ${pageName}: ${text.substring(0, 200)}`);
      }
    }
  });

  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('favicon')) {
      networkErrors.push({ page: pageName, url: response.url(), status: response.status() });
      console.log(`[NETWORK ERROR] ${pageName}: ${response.status()} - ${response.url()}`);
    }
  });
}

async function checkPageBasics(page: Page, pageName: string) {
  // Check for error states
  const errorText = page.locator('text=/error|something went wrong|500|404/i').first();
  if (await errorText.isVisible({ timeout: 1000 }).catch(() => false)) {
    logIssue({
      page: pageName,
      type: 'error',
      severity: 'critical',
      description: 'Error message displayed on page',
      details: await errorText.textContent() || undefined,
    });
  }

  // Check for loading spinners stuck
  const spinner = page.locator('[class*="spinner"], [class*="loading"], [class*="animate-spin"]').first();
  await page.waitForTimeout(3000);
  if (await spinner.isVisible({ timeout: 500 }).catch(() => false)) {
    logIssue({
      page: pageName,
      type: 'ui',
      severity: 'medium',
      description: 'Loading spinner still visible after 3 seconds',
    });
  }
}

test.describe('Production Full Audit', () => {
  test.setTimeout(600000); // 10 minutes

  test('Complete website audit', async ({ page }) => {
    console.log('='.repeat(60));
    console.log('QUANTRACT.CO.UK PRODUCTION AUDIT');
    console.log('='.repeat(60));

    // ========== 1. LOGIN ==========
    console.log('\n[1/12] TESTING: Authentication & Login');
    await setupConsoleListener(page, 'login');

    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');

    // Check login page loads
    const loginForm = page.locator('form').first();
    if (!(await loginForm.isVisible({ timeout: 10000 }).catch(() => false))) {
      logIssue({
        page: 'login',
        type: 'broken',
        severity: 'critical',
        description: 'Login form not visible',
      });
    }

    // Fill credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible()) {
      await emailInput.fill(CREDENTIALS.email);
    } else {
      logIssue({
        page: 'login',
        type: 'broken',
        severity: 'critical',
        description: 'Email input not found',
      });
    }

    if (await passwordInput.isVisible()) {
      await passwordInput.fill(CREDENTIALS.password);
    } else {
      logIssue({
        page: 'login',
        type: 'broken',
        severity: 'critical',
        description: 'Password input not found',
      });
    }

    // Submit login
    const loginButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForTimeout(3000);
    }

    // Verify login success
    const isLoggedIn = page.url().includes('/admin') && !page.url().includes('/login');
    if (!isLoggedIn) {
      logIssue({
        page: 'login',
        type: 'broken',
        severity: 'critical',
        description: 'Login failed - still on login page',
        details: `Current URL: ${page.url()}`,
      });
      // Try to continue anyway
    }

    await page.waitForLoadState('networkidle');
    console.log(`[LOGIN] Current URL: ${page.url()}`);

    // ========== 2. ADMIN DASHBOARD ==========
    console.log('\n[2/12] TESTING: Admin Dashboard');
    await setupConsoleListener(page, 'dashboard');

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'dashboard');

    // Check dashboard elements
    const dashboardHeading = page.locator('h1, h2').first();
    if (!(await dashboardHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      logIssue({
        page: 'dashboard',
        type: 'ui',
        severity: 'medium',
        description: 'No heading visible on dashboard',
      });
    }

    // Test navigation links
    const navLinks = [
      { name: 'Quotes', href: '/admin/quotes' },
      { name: 'Jobs', href: '/admin/jobs' },
      { name: 'Clients', href: '/admin/clients' },
      { name: 'Invoices', href: '/admin/invoices' },
      { name: 'Engineers', href: '/admin/engineers' },
      { name: 'Timesheets', href: '/admin/timesheets' },
      { name: 'Enquiries', href: '/admin/enquiries' },
      { name: 'Settings', href: '/admin/settings' },
    ];

    for (const link of navLinks) {
      const navLink = page.locator(`a[href*="${link.href}"]`).first();
      if (!(await navLink.isVisible({ timeout: 1000 }).catch(() => false))) {
        logIssue({
          page: 'dashboard',
          type: 'ui',
          severity: 'medium',
          description: `Navigation link "${link.name}" not visible`,
        });
      }
    }

    // ========== 3. QUOTES MODULE ==========
    console.log('\n[3/12] TESTING: Quotes Module');
    await setupConsoleListener(page, 'quotes');

    await page.goto(`${BASE_URL}/admin/quotes`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'quotes');

    // Check quotes list
    const quotesTable = page.locator('table, [class*="list"], [class*="grid"]').first();
    await page.waitForTimeout(2000);

    // Test "New Quote" button
    const newQuoteBtn = page.locator('a:has-text("New"), button:has-text("New"), a:has-text("Create")').first();
    if (await newQuoteBtn.isVisible()) {
      await newQuoteBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      if (!page.url().includes('/new') && !page.url().includes('/create')) {
        // Check if modal opened
        const modal = page.locator('[role="dialog"], [class*="modal"]').first();
        if (!(await modal.isVisible({ timeout: 2000 }).catch(() => false))) {
          logIssue({
            page: 'quotes/new',
            type: 'broken',
            severity: 'high',
            description: 'New Quote button did not navigate or open modal',
          });
        }
      }

      await checkPageBasics(page, 'quotes/new');

      // Check form fields
      const clientField = page.locator('input[name*="client"], select[name*="client"], [class*="select"]').first();
      if (!(await clientField.isVisible({ timeout: 3000 }).catch(() => false))) {
        logIssue({
          page: 'quotes/new',
          type: 'ui',
          severity: 'medium',
          description: 'Client selection field not visible in quote form',
        });
      }
    } else {
      logIssue({
        page: 'quotes',
        type: 'broken',
        severity: 'high',
        description: 'New Quote button not found',
      });
    }

    // Go back to quotes list
    await page.goto(`${BASE_URL}/admin/quotes`);
    await page.waitForLoadState('networkidle');

    // Click on first quote if exists
    const firstQuote = page.locator('table tbody tr, [class*="list-item"], [class*="card"]').first();
    if (await firstQuote.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstQuote.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await checkPageBasics(page, 'quotes/detail');

      // Check quote detail actions
      const actionButtons = ['Edit', 'Send', 'PDF', 'Convert', 'Delete'];
      for (const action of actionButtons) {
        const btn = page.locator(`button:has-text("${action}"), a:has-text("${action}")`).first();
        if (!(await btn.isVisible({ timeout: 1000 }).catch(() => false))) {
          console.log(`[INFO] Quote action "${action}" not visible (may be expected)`);
        }
      }
    }

    // ========== 4. JOBS MODULE ==========
    console.log('\n[4/12] TESTING: Jobs Module');
    await setupConsoleListener(page, 'jobs');

    await page.goto(`${BASE_URL}/admin/jobs`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'jobs');

    // Check jobs list loads
    await page.waitForTimeout(2000);
    const jobsList = page.locator('table, [class*="list"], [class*="grid"]').first();

    // Click on first job if exists
    const firstJob = page.locator('table tbody tr a, [class*="list-item"] a, [class*="card"] a').first();
    if (await firstJob.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstJob.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await checkPageBasics(page, 'jobs/detail');

      // Check job tabs/sections
      const jobTabs = ['Details', 'Costing', 'Timesheets', 'Materials', 'Documents'];
      for (const tab of jobTabs) {
        const tabEl = page.locator(`button:has-text("${tab}"), a:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
        if (await tabEl.isVisible({ timeout: 1000 }).catch(() => false)) {
          await tabEl.click();
          await page.waitForTimeout(1000);
          await checkPageBasics(page, `jobs/detail/${tab.toLowerCase()}`);
        }
      }
    }

    // ========== 5. CLIENTS MODULE ==========
    console.log('\n[5/12] TESTING: Clients Module');
    await setupConsoleListener(page, 'clients');

    await page.goto(`${BASE_URL}/admin/clients`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'clients');

    // Test search
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      await searchInput.clear();
    }

    // Test new client
    const newClientBtn = page.locator('a:has-text("New"), button:has-text("New"), a:has-text("Add")').first();
    if (await newClientBtn.isVisible()) {
      await newClientBtn.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await checkPageBasics(page, 'clients/new');

      // Check form fields
      const nameField = page.locator('input[name*="name"]').first();
      const emailField = page.locator('input[name*="email"], input[type="email"]').first();

      if (!(await nameField.isVisible({ timeout: 2000 }).catch(() => false))) {
        logIssue({
          page: 'clients/new',
          type: 'ui',
          severity: 'medium',
          description: 'Name field not visible in client form',
        });
      }
    }

    // ========== 6. ENGINEERS MODULE ==========
    console.log('\n[6/12] TESTING: Engineers Module');
    await setupConsoleListener(page, 'engineers');

    await page.goto(`${BASE_URL}/admin/engineers`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'engineers');

    // Click on first engineer if exists
    const firstEngineer = page.locator('table tbody tr, [class*="list-item"], [class*="card"]').first();
    if (await firstEngineer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstEngineer.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await checkPageBasics(page, 'engineers/detail');
    }

    // ========== 7. INVOICES MODULE ==========
    console.log('\n[7/12] TESTING: Invoices Module');
    await setupConsoleListener(page, 'invoices');

    await page.goto(`${BASE_URL}/admin/invoices`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'invoices');

    // Click on first invoice if exists
    const firstInvoice = page.locator('table tbody tr a, [class*="list-item"] a').first();
    if (await firstInvoice.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstInvoice.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await checkPageBasics(page, 'invoices/detail');

      // Test PDF button
      const pdfBtn = page.locator('button:has-text("PDF"), a:has-text("PDF"), button:has-text("Download")').first();
      if (await pdfBtn.isVisible()) {
        console.log('[INFO] PDF button found on invoice');
      }
    }

    // ========== 8. TIMESHEETS MODULE ==========
    console.log('\n[8/12] TESTING: Timesheets Module');
    await setupConsoleListener(page, 'timesheets');

    await page.goto(`${BASE_URL}/admin/timesheets`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'timesheets');

    // Check for timesheet data or empty state
    const timesheetContent = page.locator('table, [class*="list"], [class*="empty"]').first();
    if (!(await timesheetContent.isVisible({ timeout: 5000 }).catch(() => false))) {
      logIssue({
        page: 'timesheets',
        type: 'ui',
        severity: 'medium',
        description: 'No timesheet content or empty state visible',
      });
    }

    // ========== 9. ENQUIRIES/LEADS MODULE ==========
    console.log('\n[9/12] TESTING: Enquiries Module');
    await setupConsoleListener(page, 'enquiries');

    await page.goto(`${BASE_URL}/admin/enquiries`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'enquiries');

    // Test kanban/list view
    const kanban = page.locator('[class*="kanban"], [class*="board"], [class*="pipeline"]').first();
    const list = page.locator('table, [class*="list"]').first();

    if (!(await kanban.isVisible({ timeout: 2000 }).catch(() => false)) &&
        !(await list.isVisible({ timeout: 2000 }).catch(() => false))) {
      logIssue({
        page: 'enquiries',
        type: 'ui',
        severity: 'medium',
        description: 'Neither kanban board nor list view visible',
      });
    }

    // ========== 10. SETTINGS PAGES ==========
    console.log('\n[10/12] TESTING: Settings Pages');

    const settingsPages = [
      '/admin/settings',
      '/admin/settings/account',
      '/admin/settings/security',
      '/admin/settings/notifications',
      '/admin/settings/pdf',
      '/admin/settings/appearance',
      '/admin/settings/service-lines',
      '/admin/settings/legal-entities',
      '/admin/settings/lead-capture',
    ];

    for (const settingsPage of settingsPages) {
      await setupConsoleListener(page, settingsPage);
      await page.goto(`${BASE_URL}${settingsPage}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await checkPageBasics(page, settingsPage);

      // Check for form elements or content
      const content = page.locator('form, [class*="settings"], main').first();
      if (!(await content.isVisible({ timeout: 3000 }).catch(() => false))) {
        logIssue({
          page: settingsPage,
          type: 'ui',
          severity: 'medium',
          description: 'Settings page has no visible content',
        });
      }
    }

    // ========== 11. REPORTS ==========
    console.log('\n[11/12] TESTING: Reports');
    await setupConsoleListener(page, 'reports');

    await page.goto(`${BASE_URL}/admin/reports`);
    await page.waitForLoadState('networkidle');
    await checkPageBasics(page, 'reports');

    // Check for report links/sections
    const reportLinks = page.locator('a[href*="report"], [class*="report"]');
    const reportCount = await reportLinks.count();
    console.log(`[INFO] Found ${reportCount} report links`);

    // ========== 12. OTHER PAGES ==========
    console.log('\n[12/12] TESTING: Other Pages');

    const otherPages = [
      '/admin/tasks',
      '/admin/checklists',
      '/admin/certificates',
      '/admin/schedule',
      '/admin/materials',
      '/admin/expenses',
      '/admin/variations',
    ];

    for (const otherPage of otherPages) {
      await setupConsoleListener(page, otherPage);
      await page.goto(`${BASE_URL}${otherPage}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await checkPageBasics(page, otherPage);
    }

    // ========== FINAL REPORT ==========
    console.log('\n' + '='.repeat(60));
    console.log('AUDIT COMPLETE - FINAL REPORT');
    console.log('='.repeat(60));

    console.log(`\nISSUES FOUND: ${issues.length}`);
    console.log(`CONSOLE ERRORS: ${consoleErrors.length}`);
    console.log(`NETWORK ERRORS: ${networkErrors.length}`);

    if (issues.length > 0) {
      console.log('\n--- ISSUES ---');
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      const highIssues = issues.filter(i => i.severity === 'high');
      const mediumIssues = issues.filter(i => i.severity === 'medium');
      const lowIssues = issues.filter(i => i.severity === 'low');

      if (criticalIssues.length > 0) {
        console.log('\n🔴 CRITICAL:');
        criticalIssues.forEach(i => console.log(`  - [${i.page}] ${i.description}`));
      }
      if (highIssues.length > 0) {
        console.log('\n🟠 HIGH:');
        highIssues.forEach(i => console.log(`  - [${i.page}] ${i.description}`));
      }
      if (mediumIssues.length > 0) {
        console.log('\n🟡 MEDIUM:');
        mediumIssues.forEach(i => console.log(`  - [${i.page}] ${i.description}`));
      }
      if (lowIssues.length > 0) {
        console.log('\n🟢 LOW:');
        lowIssues.forEach(i => console.log(`  - [${i.page}] ${i.description}`));
      }
    }

    if (consoleErrors.length > 0) {
      console.log('\n--- CONSOLE ERRORS ---');
      const uniqueErrors = [...new Set(consoleErrors.map(e => `[${e.page}] ${e.message.substring(0, 100)}`))];
      uniqueErrors.forEach(e => console.log(`  - ${e}`));
    }

    if (networkErrors.length > 0) {
      console.log('\n--- NETWORK ERRORS ---');
      networkErrors.forEach(e => console.log(`  - [${e.page}] ${e.status} - ${e.url}`));
    }

    console.log('\n' + '='.repeat(60));

    // Store results for later
    const report = { issues, consoleErrors, networkErrors };
    console.log('\nFULL REPORT JSON:');
    console.log(JSON.stringify(report, null, 2));
  });
});
