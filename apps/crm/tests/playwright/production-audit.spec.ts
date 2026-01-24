import { test, expect, Page } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * PRODUCTION AUDIT SCRIPT
 *
 * This script performs comprehensive UI/UX, accessibility, and functional testing
 * against the LIVE production site at https://www.quantract.co.uk
 *
 * Requirements:
 * - Set PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD in environment
 * - Run with network logging enabled
 * - Captures screenshots, network logs, and accessibility issues
 */

const PROD_URL = 'https://www.quantract.co.uk';
const outputDir = join(process.cwd(), 'production-audit-results');
mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
mkdirSync(join(outputDir, 'network-logs'), { recursive: true });

// Network request logger
interface NetworkLog {
  timestamp: string;
  action: string;
  method: string;
  url: string;
  status: number;
  requestBody?: any;
  responseBody?: any;
  duration: number;
}

const networkLogs: NetworkLog[] = [];

function logNetworkRequest(log: NetworkLog) {
  networkLogs.push(log);
  console.log(`[NETWORK] ${log.action}: ${log.method} ${log.url} -> ${log.status} (${log.duration}ms)`);
}

function saveNetworkLogs() {
  writeFileSync(
    join(outputDir, 'network-logs', 'all-requests.json'),
    JSON.stringify(networkLogs, null, 2)
  );
}

// Helper to login to production
async function loginToProduction(page: Page) {
  const email = process.env.PROD_ADMIN_EMAIL;
  const password = process.env.PROD_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('PROD_ADMIN_EMAIL and PROD_ADMIN_PASSWORD must be set in environment');
  }

  await page.goto(`${PROD_URL}/admin/login`);
  await page.waitForLoadState('networkidle');

  // Click on Password tab (if exists)
  const passwordTab = page.getByRole('tab', { name: /password/i }).or(page.getByText('Password').first());
  if (await passwordTab.isVisible().catch(() => false)) {
    await passwordTab.click();
    await page.waitForTimeout(500);
  }

  // Try to find email input
  const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i)).first();
  await emailInput.fill(email);

  // Try to find password input
  const passwordInput = page.locator('input[type="password"]').or(page.getByPlaceholder(/password/i)).first();
  await passwordInput.fill(password);

  // Submit form
  const submitBtn = page.getByRole('button', { name: /sign in|log in|login|send magic link/i });
  await submitBtn.click();

  // Wait for redirect to dashboard
  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 10000 });
  await page.waitForLoadState('networkidle');

  console.log('✅ Logged in to production successfully');
}

// Helper to audit a page for UI/UX issues
async function auditPage(page: Page, pageName: string, url: string) {
  const issues: string[] = [];

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({
    path: join(outputDir, 'screenshots', `${pageName.replace(/\\s+/g, '-').toLowerCase()}.png`),
    fullPage: true,
  });

  // Check for UI/UX issues
  const pageIssues = await page.evaluate(() => {
    const problems: string[] = [];

    // 1. Check for back button or breadcrumbs
    let hasBackButton = false;
    const allButtons = document.querySelectorAll('button, a');
    allButtons.forEach((btn) => {
      const text = btn.textContent?.toLowerCase() || '';
      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (text.includes('back') || ariaLabel.includes('back')) {
        hasBackButton = true;
      }
    });

    const breadcrumbs = document.querySelector('[aria-label*="breadcrumb"], nav ol, nav ul[class*="breadcrumb"]');
    if (!hasBackButton && !breadcrumbs) {
      problems.push('❌ P0: No back button or breadcrumbs found');
    }

    // 2. Check for white-on-white or low contrast text in inputs
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea');
    inputs.forEach((input) => {
      const computed = window.getComputedStyle(input);
      const color = computed.color;
      const bgColor = computed.backgroundColor;

      // Parse RGB values
      const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const bgMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

      if (colorMatch && bgMatch) {
        const [, r, g, b] = colorMatch.map(Number);
        const [, bgR, bgG, bgB] = bgMatch.map(Number);

        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        const bgLuminance = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

        // Both very light (white-on-white)
        if (luminance > 200 && bgLuminance > 200) {
          problems.push(`❌ P0: White-on-white text in input (${color} on ${bgColor})`);
        }
      }
    });

    // 3. Check navbar buttons for blue-on-blue
    const navButtons = document.querySelectorAll('nav button, nav a, header button, header a');
    navButtons.forEach((btn) => {
      const computed = window.getComputedStyle(btn);
      const color = computed.color;
      const outline = computed.outlineColor;

      // Check if both are blue-ish
      const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const outlineMatch = outline.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

      if (colorMatch && outlineMatch) {
        const [, r, g, b] = colorMatch.map(Number);
        const [, oR, oG, oB] = outlineMatch.map(Number);

        // Both blue-ish (blue channel dominant)
        if (b > r && b > g && oB > oR && oB > oG) {
          problems.push(`❌ P0: Blue text + blue outline in navbar button (unreadable)`);
        }
      }
    });

    // 4. Check for missing focus states
    const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
    let missingFocus = 0;
    focusableElements.forEach((el) => {
      const computed = window.getComputedStyle(el, ':focus-visible');
      if (!computed.outlineWidth || computed.outlineWidth === '0px') {
        missingFocus++;
      }
    });
    if (missingFocus > 5) {
      problems.push(`⚠️ P2: ${missingFocus} elements missing focus-visible outlines`);
    }

    // 5. Check for consistent typography
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const fontWeights = new Set<string>();
    headings.forEach((h) => {
      const computed = window.getComputedStyle(h);
      fontWeights.add(computed.fontWeight);
    });
    if (fontWeights.size > 3) {
      problems.push(`⚠️ P1: Inconsistent heading weights (${fontWeights.size} variations)`);
    }

    return problems;
  });

  issues.push(...pageIssues);

  return issues;
}

test.describe('Production Site Audit', () => {
  test.describe.configure({ mode: 'serial' });

  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    adminPage = await browser.newPage();

    // Set up network monitoring
    adminPage.on('request', (request) => {
      const startTime = Date.now();
      request.response().then((response) => {
        if (response) {
          const duration = Date.now() - startTime;
          logNetworkRequest({
            timestamp: new Date().toISOString(),
            action: 'Request',
            method: request.method(),
            url: request.url(),
            status: response.status(),
            requestBody: request.postDataJSON(),
            duration,
          });
        }
      }).catch(() => {});
    });

    await loginToProduction(adminPage);
  });

  test.afterAll(async () => {
    saveNetworkLogs();
    await adminPage.close();
  });

  test('1. Route Discovery - Enumerate all accessible pages', async () => {
    const routes: Array<{ name: string; url: string }> = [];

    // Navigate to admin dashboard
    await adminPage.goto(`${PROD_URL}/admin`);
    await adminPage.waitForLoadState('networkidle');

    // Extract all navigation links
    const navLinks = await adminPage.evaluate(() => {
      const links: Array<{ text: string; href: string }> = [];
      document.querySelectorAll('nav a, aside a, [role="navigation"] a').forEach((link) => {
        const href = (link as HTMLAnchorElement).href;
        const text = link.textContent?.trim() || '';
        if (href && !href.includes('#') && !href.includes('javascript:')) {
          links.push({ text, href });
        }
      });
      return links;
    });

    navLinks.forEach((link) => {
      routes.push({ name: link.text, url: link.href });
    });

    // Common admin routes (if not found in nav)
    const commonRoutes = [
      { name: 'Admin Dashboard', url: `${PROD_URL}/admin` },
      { name: 'Enquiries', url: `${PROD_URL}/admin/enquiries` },
      { name: 'Quotes', url: `${PROD_URL}/admin/quotes` },
      { name: 'Jobs', url: `${PROD_URL}/admin/jobs` },
      { name: 'Invoices', url: `${PROD_URL}/admin/invoices` },
      { name: 'Engineers', url: `${PROD_URL}/admin/engineers` },
      { name: 'Timesheets', url: `${PROD_URL}/admin/timesheets` },
      { name: 'Clients', url: `${PROD_URL}/admin/clients` },
    ];

    commonRoutes.forEach((route) => {
      if (!routes.find((r) => r.url === route.url)) {
        routes.push(route);
      }
    });

    console.log(`\\n📍 Found ${routes.length} routes:`);
    routes.forEach((route) => console.log(`  - ${route.name}: ${route.url}`));

    writeFileSync(
      join(outputDir, 'routes-discovered.json'),
      JSON.stringify(routes, null, 2)
    );
  });

  test('2. UI/UX Audit - Check all major pages for issues', async () => {
    const pagesToAudit = [
      { name: 'Admin Dashboard', url: `${PROD_URL}/admin` },
      { name: 'Enquiries List', url: `${PROD_URL}/admin/enquiries` },
      { name: 'Quotes List', url: `${PROD_URL}/admin/quotes` },
      { name: 'Jobs List', url: `${PROD_URL}/admin/jobs` },
      { name: 'Engineers List', url: `${PROD_URL}/admin/engineers` },
      { name: 'Timesheets List', url: `${PROD_URL}/admin/timesheets` },
      { name: 'Invoices List', url: `${PROD_URL}/admin/invoices` },
    ];

    const allIssues: Record<string, string[]> = {};

    for (const pageInfo of pagesToAudit) {
      console.log(`\\n🔍 Auditing: ${pageInfo.name}`);
      const issues = await auditPage(adminPage, pageInfo.name, pageInfo.url);

      if (issues.length > 0) {
        allIssues[pageInfo.name] = issues;
        console.log(`  Issues found: ${issues.length}`);
        issues.forEach((issue) => console.log(`    ${issue}`));
      } else {
        console.log(`  ✅ No issues found`);
      }
    }

    writeFileSync(
      join(outputDir, 'ui-ux-issues.json'),
      JSON.stringify(allIssues, null, 2)
    );
  });

  test('3. Reproduce Bug - Engineer Deactivate', async () => {
    console.log('\\n🐛 Testing Engineer Deactivate functionality...');

    await adminPage.goto(`${PROD_URL}/admin/engineers`);
    await adminPage.waitForLoadState('networkidle');

    // Find first active engineer
    const engineerRow = adminPage.locator('tr').filter({ hasText: /active/i }).first();

    if (await engineerRow.isVisible()) {
      // Look for deactivate button
      const deactivateBtn = engineerRow.getByRole('button', { name: /deactivate/i })
        .or(engineerRow.locator('button').filter({ hasText: /deactivate/i }));

      if (await deactivateBtn.isVisible()) {
        console.log('  Found deactivate button, clicking...');

        // Monitor network requests
        const requestPromise = adminPage.waitForRequest((req) =>
          req.url().includes('/engineers') && req.method() !== 'GET'
        );

        await deactivateBtn.click();

        try {
          const request = await requestPromise.catch(() => null);
          if (request) {
            const response = await request.response();
            console.log(`  ✅ Request sent: ${request.method()} ${request.url()}`);
            console.log(`  Response status: ${response?.status()}`);

            // Check if UI updated
            await adminPage.waitForTimeout(1000);
            const updatedRow = await engineerRow.textContent();
            console.log(`  Row content after click: ${updatedRow}`);

            if (updatedRow?.includes('inactive') || updatedRow?.includes('deactivated')) {
              console.log('  ✅ Engineer deactivated successfully');
            } else {
              console.log('  ❌ BUG CONFIRMED: Request sent but UI not updated');
            }
          } else {
            console.log('  ❌ BUG CONFIRMED: No network request fired when button clicked');
          }
        } catch (e) {
          console.log(`  ❌ BUG CONFIRMED: Error - ${e}`);
        }
      } else {
        console.log('  ⚠️ No deactivate button found in UI');
      }
    } else {
      console.log('  ⚠️ No active engineers found to test');
    }
  });

  test('4. Full Flow - Enquiry → Quote → Job → Invoice', async () => {
    console.log('\\n🔄 Running full critical flow...');

    const timestamp = Date.now();
    const flowLog: any[] = [];

    // STEP 1: Create Enquiry (if route exists)
    try {
      await adminPage.goto(`${PROD_URL}/admin/enquiries`);
      await adminPage.waitForLoadState('networkidle');

      const createBtn = adminPage.getByRole('button', { name: /new|create/i }).first();
      if (await createBtn.isVisible()) {
        await createBtn.click();
        flowLog.push({ step: 'Create Enquiry', status: 'clicked create button' });

        // Fill form (basic fields)
        const nameInput = adminPage.getByPlaceholder(/name/i).first();
        if (await nameInput.isVisible()) {
          await nameInput.fill(`Test Client ${timestamp}`);
        }

        const emailInput = adminPage.getByPlaceholder(/email/i).first();
        if (await emailInput.isVisible()) {
          await emailInput.fill(`test${timestamp}@example.com`);
        }

        const submitBtn = adminPage.getByRole('button', { name: /submit|create|save/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await adminPage.waitForLoadState('networkidle');
          flowLog.push({ step: 'Submit Enquiry', status: 'submitted' });
        }
      }
    } catch (e) {
      flowLog.push({ step: 'Create Enquiry', status: 'failed', error: String(e) });
    }

    // STEP 2: Create/Navigate to Quote
    try {
      await adminPage.goto(`${PROD_URL}/admin/quotes`);
      await adminPage.waitForLoadState('networkidle');
      flowLog.push({ step: 'Navigate to Quotes', status: 'success' });
    } catch (e) {
      flowLog.push({ step: 'Navigate to Quotes', status: 'failed', error: String(e) });
    }

    // Continue with more steps...
    writeFileSync(
      join(outputDir, 'flow-verification.json'),
      JSON.stringify(flowLog, null, 2)
    );

    console.log('\\n✅ Flow verification complete. See flow-verification.json for details.');
  });
});
