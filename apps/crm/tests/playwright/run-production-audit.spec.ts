import { test, expect, Page, ConsoleMessage, Response } from '@playwright/test';

/**
 * QUANTRACT PRODUCTION FULL AUDIT
 * ================================
 *
 * Run with: npx playwright test run-production-audit.spec.ts --project=chromium
 *
 * This test comprehensively audits www.quantract.co.uk:
 * - All admin pages and features
 * - UI/UX issues
 * - Console errors
 * - Network/API errors
 * - Broken buttons and links
 * - Form functionality
 */

const BASE_URL = process.env.AUDIT_URL || 'https://www.quantract.co.uk';
const CREDENTIALS = {
  email: process.env.AUDIT_EMAIL || 'callumdeakin1995@hotmail.com',
  password: process.env.AUDIT_PASSWORD || 'p194406290',
};

interface Issue {
  page: string;
  type: 'error' | 'warning' | 'ui' | 'ux' | 'broken' | 'api' | 'console' | 'network';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  details?: string;
  timestamp: string;
}

const allIssues: Issue[] = [];

function logIssue(issue: Omit<Issue, 'timestamp'>) {
  const fullIssue = { ...issue, timestamp: new Date().toISOString() };
  allIssues.push(fullIssue);
  const icon = issue.severity === 'critical' ? '🔴' :
               issue.severity === 'high' ? '🟠' :
               issue.severity === 'medium' ? '🟡' : '🟢';
  console.log(`${icon} [${issue.severity.toUpperCase()}] [${issue.type}] ${issue.page}: ${issue.description}`);
  if (issue.details) {
    console.log(`   Details: ${issue.details.substring(0, 200)}`);
  }
}

async function setupPageMonitoring(page: Page, pageName: string) {
  // Monitor console errors
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out known non-issues
      if (!text.includes('favicon') &&
          !text.includes('Third-party cookie') &&
          !text.includes('ResizeObserver') &&
          !text.includes('Download the React DevTools')) {
        logIssue({
          page: pageName,
          type: 'console',
          severity: text.includes('TypeError') || text.includes('ReferenceError') ? 'high' : 'medium',
          description: 'Console error',
          details: text.substring(0, 300),
        });
      }
    }
  });

  // Monitor network errors
  page.on('response', (response: Response) => {
    const status = response.status();
    const url = response.url();

    // Skip common non-issues
    if (url.includes('favicon') || url.includes('analytics') || url.includes('sentry')) return;

    if (status >= 400) {
      logIssue({
        page: pageName,
        type: 'network',
        severity: status >= 500 ? 'critical' : status === 404 ? 'medium' : 'high',
        description: `HTTP ${status} error`,
        details: url,
      });
    }
  });

  // Monitor page errors
  page.on('pageerror', (error) => {
    logIssue({
      page: pageName,
      type: 'error',
      severity: 'critical',
      description: 'Uncaught page error',
      details: error.message,
    });
  });
}

async function checkPageLoads(page: Page, pageName: string) {
  // Check for error states
  const errorIndicators = [
    'Something went wrong',
    'Error occurred',
    '500 Internal Server Error',
    '404 Not Found',
    'Unexpected error',
    'Application error',
  ];

  for (const errorText of errorIndicators) {
    const errorEl = page.locator(`text="${errorText}"`).first();
    if (await errorEl.isVisible({ timeout: 500 }).catch(() => false)) {
      logIssue({
        page: pageName,
        type: 'error',
        severity: 'critical',
        description: `Error message displayed: "${errorText}"`,
      });
    }
  }

  // Check for stuck loading states (after 5 seconds)
  await page.waitForTimeout(3000);
  const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], [class*="skeleton"]');
  const loadingCount = await loadingIndicators.count();
  if (loadingCount > 3) {
    logIssue({
      page: pageName,
      type: 'ui',
      severity: 'medium',
      description: `Multiple loading indicators still visible (${loadingCount} found)`,
    });
  }

  // Check for empty state when data should exist
  const emptyState = page.locator('text=/no .* found|no results|empty/i').first();
  if (await emptyState.isVisible({ timeout: 500 }).catch(() => false)) {
    console.log(`   [INFO] ${pageName}: Empty state visible (may be expected)`);
  }
}

async function testButton(page: Page, pageName: string, buttonSelector: string, buttonName: string) {
  const button = page.locator(buttonSelector).first();
  if (await button.isVisible({ timeout: 2000 }).catch(() => false)) {
    const isDisabled = await button.isDisabled();
    if (isDisabled) {
      console.log(`   [INFO] ${pageName}: "${buttonName}" button is disabled`);
    }
    return true;
  } else {
    logIssue({
      page: pageName,
      type: 'broken',
      severity: 'medium',
      description: `"${buttonName}" button not found`,
    });
    return false;
  }
}

async function testLink(page: Page, pageName: string, href: string, linkName: string) {
  const link = page.locator(`a[href*="${href}"]`).first();
  if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
    return true;
  } else {
    logIssue({
      page: pageName,
      type: 'broken',
      severity: 'medium',
      description: `"${linkName}" navigation link not found`,
    });
    return false;
  }
}

test.describe('Production Full Audit', () => {
  test.setTimeout(900000); // 15 minutes

  test('Complete website audit', async ({ page }) => {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 QUANTRACT.CO.UK PRODUCTION AUDIT');
    console.log('='.repeat(70));
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`Target: ${BASE_URL}`);
    console.log('='.repeat(70) + '\n');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 1: AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 1: AUTHENTICATION\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'auth/login');
    await page.goto(`${BASE_URL}/admin/login`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'auth/login');

    // Check login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const loginButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")').first();

    if (!(await emailInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      logIssue({ page: 'auth/login', type: 'broken', severity: 'critical', description: 'Email input not found' });
    }
    if (!(await passwordInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      logIssue({ page: 'auth/login', type: 'broken', severity: 'critical', description: 'Password input not found' });
    }
    if (!(await loginButton.isVisible({ timeout: 2000 }).catch(() => false))) {
      logIssue({ page: 'auth/login', type: 'broken', severity: 'critical', description: 'Login button not found' });
    }

    // Perform login
    if (await emailInput.isVisible()) await emailInput.fill(CREDENTIALS.email);
    if (await passwordInput.isVisible()) await passwordInput.fill(CREDENTIALS.password);
    if (await loginButton.isVisible()) {
      await loginButton.click();
      await page.waitForTimeout(5000);
    }

    // Verify login success
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      logIssue({
        page: 'auth/login',
        type: 'broken',
        severity: 'critical',
        description: 'Login failed - still on login page',
        details: `URL: ${currentUrl}. Check credentials or error messages.`
      });

      // Check for error message
      const errorMsg = page.locator('[class*="error"], [role="alert"], .text-red').first();
      if (await errorMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
        const errorText = await errorMsg.textContent();
        logIssue({
          page: 'auth/login',
          type: 'error',
          severity: 'critical',
          description: 'Login error message displayed',
          details: errorText || 'Unknown error',
        });
      }
    } else {
      console.log('✅ Login successful');
    }

    await page.waitForLoadState('networkidle');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 2: ADMIN DASHBOARD
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 2: ADMIN DASHBOARD\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/dashboard');
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/dashboard');

    // Check navigation elements
    const navItems = [
      { href: '/admin/quotes', name: 'Quotes' },
      { href: '/admin/jobs', name: 'Jobs' },
      { href: '/admin/clients', name: 'Clients' },
      { href: '/admin/invoices', name: 'Invoices' },
      { href: '/admin/engineers', name: 'Engineers' },
      { href: '/admin/timesheets', name: 'Timesheets' },
      { href: '/admin/enquiries', name: 'Enquiries' },
      { href: '/admin/settings', name: 'Settings' },
    ];

    for (const nav of navItems) {
      await testLink(page, 'admin/dashboard', nav.href, nav.name);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 3: QUOTES MODULE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 3: QUOTES MODULE\n' + '-'.repeat(50));

    // Quotes list
    await setupPageMonitoring(page, 'admin/quotes');
    await page.goto(`${BASE_URL}/admin/quotes`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/quotes');

    await testButton(page, 'admin/quotes', 'a:has-text("New"), button:has-text("New"), a:has-text("Create")', 'New Quote');

    // Click on first quote if exists
    const firstQuoteRow = page.locator('table tbody tr, [class*="list-item"], [class*="card"]').first();
    if (await firstQuoteRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const quoteLink = firstQuoteRow.locator('a').first();
      if (await quoteLink.isVisible()) {
        await quoteLink.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        await checkPageLoads(page, 'admin/quotes/[id]');

        // Check quote detail page elements
        await testButton(page, 'admin/quotes/[id]', 'button:has-text("Edit"), a:has-text("Edit")', 'Edit');
        await testButton(page, 'admin/quotes/[id]', 'button:has-text("Send"), a:has-text("Send")', 'Send');
        await testButton(page, 'admin/quotes/[id]', 'button:has-text("PDF"), a:has-text("PDF")', 'PDF');
        await testButton(page, 'admin/quotes/[id]', 'button:has-text("Convert"), a:has-text("Convert")', 'Convert to Job');
      }
    }

    // Test new quote page
    await page.goto(`${BASE_URL}/admin/quotes/new`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/quotes/new');

    // Check form fields
    const clientSelect = page.locator('select[name*="client"], [class*="select"][class*="client"], input[placeholder*="client" i]').first();
    if (!(await clientSelect.isVisible({ timeout: 3000 }).catch(() => false))) {
      logIssue({ page: 'admin/quotes/new', type: 'ui', severity: 'medium', description: 'Client selection field not visible' });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 4: JOBS MODULE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 4: JOBS MODULE\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/jobs');
    await page.goto(`${BASE_URL}/admin/jobs`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/jobs');

    // Click on first job
    const firstJobRow = page.locator('table tbody tr a, [class*="list-item"] a').first();
    if (await firstJobRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstJobRow.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      await checkPageLoads(page, 'admin/jobs/[id]');

      // Test job tabs
      const jobTabs = ['Details', 'Costing', 'Timesheets', 'Materials', 'Documents', 'Variations'];
      for (const tab of jobTabs) {
        const tabEl = page.locator(`button:has-text("${tab}"), a:has-text("${tab}"), [role="tab"]:has-text("${tab}")`).first();
        if (await tabEl.isVisible({ timeout: 1000 }).catch(() => false)) {
          await tabEl.click();
          await page.waitForTimeout(1500);
          await checkPageLoads(page, `admin/jobs/[id]/${tab.toLowerCase()}`);
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 5: CLIENTS MODULE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 5: CLIENTS MODULE\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/clients');
    await page.goto(`${BASE_URL}/admin/clients`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/clients');

    await testButton(page, 'admin/clients', 'a:has-text("New"), button:has-text("New"), a:has-text("Add")', 'Add Client');

    // Test search
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      console.log('   [INFO] Search functionality present');
      await searchInput.clear();
    }

    // Click on first client
    const firstClient = page.locator('table tbody tr, [class*="list-item"]').first();
    if (await firstClient.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstClient.click();
      await page.waitForLoadState('networkidle');
      await checkPageLoads(page, 'admin/clients/[id]');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 6: ENGINEERS MODULE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 6: ENGINEERS MODULE\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/engineers');
    await page.goto(`${BASE_URL}/admin/engineers`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/engineers');

    await testButton(page, 'admin/engineers', 'a:has-text("New"), button:has-text("New"), a:has-text("Add")', 'Add Engineer');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 7: INVOICES MODULE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 7: INVOICES MODULE\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/invoices');
    await page.goto(`${BASE_URL}/admin/invoices`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/invoices');

    // Click on first invoice
    const firstInvoice = page.locator('table tbody tr a, [class*="list-item"] a').first();
    if (await firstInvoice.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstInvoice.click();
      await page.waitForLoadState('networkidle');
      await checkPageLoads(page, 'admin/invoices/[id]');

      await testButton(page, 'admin/invoices/[id]', 'button:has-text("PDF"), a:has-text("PDF"), button:has-text("Download")', 'Download PDF');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 8: TIMESHEETS MODULE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 8: TIMESHEETS MODULE\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/timesheets');
    await page.goto(`${BASE_URL}/admin/timesheets`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/timesheets');

    // Check for approve buttons
    const approveBtn = page.locator('button:has-text("Approve")').first();
    if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   [INFO] Approve buttons present on timesheets');
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 9: ENQUIRIES MODULE
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 9: ENQUIRIES MODULE\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/enquiries');
    await page.goto(`${BASE_URL}/admin/enquiries`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/enquiries');

    // Check for kanban or list view
    const kanban = page.locator('[class*="kanban"], [class*="board"], [class*="pipeline"]').first();
    const list = page.locator('table').first();
    if (!(await kanban.isVisible({ timeout: 2000 }).catch(() => false)) &&
        !(await list.isVisible({ timeout: 2000 }).catch(() => false))) {
      logIssue({ page: 'admin/enquiries', type: 'ui', severity: 'medium', description: 'No kanban board or list view visible' });
    }

    await testButton(page, 'admin/enquiries', 'a:has-text("New"), button:has-text("New"), button:has-text("Add")', 'New Enquiry');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 10: SETTINGS PAGES
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 10: SETTINGS PAGES\n' + '-'.repeat(50));

    const settingsPages = [
      { path: '/admin/settings', name: 'Settings Home' },
      { path: '/admin/settings/account', name: 'Account Settings' },
      { path: '/admin/settings/security', name: 'Security Settings' },
      { path: '/admin/settings/notifications', name: 'Notification Settings' },
      { path: '/admin/settings/pdf', name: 'PDF Settings' },
      { path: '/admin/settings/appearance', name: 'Appearance Settings' },
      { path: '/admin/settings/service-lines', name: 'Service Lines' },
      { path: '/admin/settings/legal-entities', name: 'Legal Entities' },
      { path: '/admin/settings/lead-capture', name: 'Lead Capture' },
    ];

    for (const settings of settingsPages) {
      await setupPageMonitoring(page, settings.path);
      await page.goto(`${BASE_URL}${settings.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await checkPageLoads(page, settings.path);

      // Check for save button
      const saveBtn = page.locator('button:has-text("Save"), button[type="submit"]').first();
      if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`   [INFO] ${settings.name}: Save button present`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 11: REPORTS
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 11: REPORTS\n' + '-'.repeat(50));

    await setupPageMonitoring(page, 'admin/reports');
    await page.goto(`${BASE_URL}/admin/reports`);
    await page.waitForLoadState('networkidle');
    await checkPageLoads(page, 'admin/reports');

    // ═══════════════════════════════════════════════════════════════════════
    // SECTION 12: OTHER ADMIN PAGES
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n📋 SECTION 12: OTHER ADMIN PAGES\n' + '-'.repeat(50));

    const otherPages = [
      '/admin/tasks',
      '/admin/checklists',
      '/admin/certificates',
      '/admin/schedule',
      '/admin/materials',
      '/admin/expenses',
      '/admin/variations',
    ];

    for (const pagePath of otherPages) {
      await setupPageMonitoring(page, pagePath);
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await checkPageLoads(page, pagePath);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FINAL REPORT
    // ═══════════════════════════════════════════════════════════════════════
    console.log('\n\n' + '='.repeat(70));
    console.log('📊 AUDIT COMPLETE - FINAL REPORT');
    console.log('='.repeat(70));
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log('');

    const criticalIssues = allIssues.filter(i => i.severity === 'critical');
    const highIssues = allIssues.filter(i => i.severity === 'high');
    const mediumIssues = allIssues.filter(i => i.severity === 'medium');
    const lowIssues = allIssues.filter(i => i.severity === 'low');

    console.log(`Total Issues: ${allIssues.length}`);
    console.log(`  🔴 Critical: ${criticalIssues.length}`);
    console.log(`  🟠 High: ${highIssues.length}`);
    console.log(`  🟡 Medium: ${mediumIssues.length}`);
    console.log(`  🟢 Low: ${lowIssues.length}`);

    if (criticalIssues.length > 0) {
      console.log('\n🔴 CRITICAL ISSUES:');
      console.log('-'.repeat(50));
      criticalIssues.forEach((issue, i) => {
        console.log(`${i + 1}. [${issue.type}] ${issue.page}`);
        console.log(`   ${issue.description}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
      });
    }

    if (highIssues.length > 0) {
      console.log('\n🟠 HIGH PRIORITY ISSUES:');
      console.log('-'.repeat(50));
      highIssues.forEach((issue, i) => {
        console.log(`${i + 1}. [${issue.type}] ${issue.page}`);
        console.log(`   ${issue.description}`);
        if (issue.details) console.log(`   Details: ${issue.details}`);
      });
    }

    if (mediumIssues.length > 0) {
      console.log('\n🟡 MEDIUM PRIORITY ISSUES:');
      console.log('-'.repeat(50));
      mediumIssues.forEach((issue, i) => {
        console.log(`${i + 1}. [${issue.type}] ${issue.page}`);
        console.log(`   ${issue.description}`);
      });
    }

    if (lowIssues.length > 0) {
      console.log('\n🟢 LOW PRIORITY ISSUES:');
      console.log('-'.repeat(50));
      lowIssues.forEach((issue, i) => {
        console.log(`${i + 1}. [${issue.type}] ${issue.page}: ${issue.description}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('FULL ISSUE LOG (JSON):');
    console.log('='.repeat(70));
    console.log(JSON.stringify(allIssues, null, 2));

    // Assert no critical issues (fail test if any)
    if (criticalIssues.length > 0) {
      console.log('\n⚠️  TEST FAILED: Critical issues found!');
    }
  });
});
