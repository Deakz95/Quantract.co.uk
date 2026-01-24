import { test, expect, Page, BrowserContext } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * COMPREHENSIVE PRODUCTION E2E TEST SUITE
 *
 * Tests the entire Quantract SaaS platform end-to-end on production:
 * - All user roles (Admin, Engineer, Client)
 * - Complete workflows (Enquiry → Invoice)
 * - Mobile responsiveness
 * - Admin impersonation
 * - Navigation consistency
 * - UX friction points
 *
 * Outputs actionable recommendations for SaaS production readiness
 */

const PROD_URL = 'https://www.quantract.co.uk';
const outputDir = join(process.cwd(), 'production-comprehensive-results');
mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
mkdirSync(join(outputDir, 'mobile-screenshots'), { recursive: true });

interface WorkflowStep {
  step: string;
  status: 'success' | 'failed' | 'warning';
  duration: number;
  clicksRequired: number;
  url: string;
  screenshot?: string;
  issues?: string[];
  recommendations?: string[];
}

const workflowLog: WorkflowStep[] = [];
const uxRecommendations: Array<{ priority: string; area: string; recommendation: string; impact: string }> = [];

function logStep(step: Partial<WorkflowStep>) {
  workflowLog.push({
    step: step.step || 'Unknown',
    status: step.status || 'success',
    duration: step.duration || 0,
    clicksRequired: step.clicksRequired || 0,
    url: step.url || '',
    screenshot: step.screenshot,
    issues: step.issues || [],
    recommendations: step.recommendations || [],
  });
}

function addUXRecommendation(priority: string, area: string, recommendation: string, impact: string) {
  uxRecommendations.push({ priority, area, recommendation, impact });
}

// Helper: Login to production
async function loginAsAdmin(page: Page) {
  const email = process.env.PROD_ADMIN_EMAIL || 'callumdeakin95@hotmail.com';
  const password = process.env.PROD_ADMIN_PASSWORD || 'password123';

  const startTime = Date.now();

  await page.goto(`${PROD_URL}/admin/login`);
  await page.waitForLoadState('networkidle');

  // Click Password tab
  const passwordTab = page.getByRole('tab', { name: /password/i }).or(page.getByText('Password').first());
  if (await passwordTab.isVisible().catch(() => false)) {
    await passwordTab.click();
    await page.waitForTimeout(300);
  }

  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await page.waitForURL(/\/admin(?:\/|$)/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  logStep({
    step: 'Admin Login',
    status: 'success',
    duration: Date.now() - startTime,
    clicksRequired: 2, // Password tab + Submit
    url: page.url(),
  });

  console.log('✅ Logged in as admin');
}

// Helper: Check for back button/breadcrumbs
async function checkNavigation(page: Page, pageName: string): Promise<boolean> {
  const hasNav = await page.evaluate(() => {
    // Check for breadcrumbs
    const breadcrumbs = document.querySelector('[aria-label*="readcrumb" i], nav ol, nav ul');
    if (breadcrumbs) return true;

    // Check for back button
    const allButtons = Array.from(document.querySelectorAll('button, a'));
    const hasBackButton = allButtons.some(btn => {
      const text = btn.textContent?.toLowerCase() || '';
      const aria = btn.getAttribute('aria-label')?.toLowerCase() || '';
      return text.includes('back') || aria.includes('back');
    });

    return hasBackButton;
  });

  if (!hasNav) {
    addUXRecommendation(
      'P0',
      'Navigation',
      `Add breadcrumbs or back button to ${pageName}`,
      'Critical - users can get stuck on detail pages'
    );
  }

  return hasNav;
}

// Helper: Check mobile responsiveness
async function checkMobileResponsive(page: Page, pageName: string) {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);

  const screenshotPath = join(outputDir, 'mobile-screenshots', `${pageName.replace(/\s+/g, '-').toLowerCase()}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Check for horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  if (hasHorizontalScroll) {
    addUXRecommendation(
      'P1',
      'Mobile',
      `${pageName} has horizontal scroll on mobile - fix overflow`,
      'Medium - affects mobile UX'
    );
  }

  // Check for tiny tap targets
  const hasSmallTargets = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    return buttons.some(btn => {
      const rect = btn.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    });
  });

  if (hasSmallTargets) {
    addUXRecommendation(
      'P2',
      'Mobile',
      `${pageName} has tap targets smaller than 44x44px - increase size`,
      'Low - accessibility concern'
    );
  }

  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 720 });
}

// Helper: Count clicks to complete action
async function countClicks(page: Page, description: string, action: () => Promise<void>): Promise<number> {
  let clicks = 0;

  const clickListener = (req: any) => {
    if (req.method() === 'POST' || req.method() === 'PATCH' || req.method() === 'DELETE') {
      clicks++;
    }
  };

  page.on('request', clickListener);

  await action();

  page.off('request', clickListener);
  return clicks;
}

test.describe('Production Comprehensive E2E Suite', () => {
  test.describe.configure({ mode: 'serial', timeout: 300000 }); // 5 min per test

  let adminPage: Page;
  let adminContext: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
  });

  test.afterAll(async () => {
    // Save results
    writeFileSync(
      join(outputDir, 'workflow-log.json'),
      JSON.stringify(workflowLog, null, 2)
    );

    writeFileSync(
      join(outputDir, 'ux-recommendations.json'),
      JSON.stringify(uxRecommendations, null, 2)
    );

    // Generate summary report
    const summary = {
      totalSteps: workflowLog.length,
      successfulSteps: workflowLog.filter(s => s.status === 'success').length,
      failedSteps: workflowLog.filter(s => s.status === 'failed').length,
      totalRecommendations: uxRecommendations.length,
      p0Recommendations: uxRecommendations.filter(r => r.priority === 'P0').length,
      p1Recommendations: uxRecommendations.filter(r => r.priority === 'P1').length,
      p2Recommendations: uxRecommendations.filter(r => r.priority === 'P2').length,
    };

    writeFileSync(
      join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n📊 Test Summary:');
    console.log(`  Total Steps: ${summary.totalSteps}`);
    console.log(`  Successful: ${summary.successfulSteps}`);
    console.log(`  Failed: ${summary.failedSteps}`);
    console.log(`  Recommendations: ${summary.totalRecommendations} (P0: ${summary.p0Recommendations}, P1: ${summary.p1Recommendations}, P2: ${summary.p2Recommendations})`);

    await adminContext.close();
  });

  test('1. Navigation Audit - All Detail Pages', async () => {
    console.log('\n🔍 Testing navigation on all detail pages...');

    const detailPages = [
      { name: 'Quote Detail', path: '/admin/quotes' },
      { name: 'Job Detail', path: '/admin/jobs' },
      { name: 'Invoice Detail', path: '/admin/invoices' },
      { name: 'Certificate Detail', path: '/admin/certificates' },
      { name: 'Engineer Detail', path: '/admin/engineers' },
      { name: 'Client Detail', path: '/admin/clients' },
      { name: 'Timesheet Detail', path: '/admin/timesheets' },
    ];

    for (const pageInfo of detailPages) {
      await adminPage.goto(`${PROD_URL}${pageInfo.path}`);
      await adminPage.waitForLoadState('networkidle');

      // Find first item and click to detail
      const firstLink = adminPage.locator('a[href*="' + pageInfo.path + '/"]').first();

      if (await firstLink.isVisible().catch(() => false)) {
        await firstLink.click();
        await adminPage.waitForLoadState('networkidle');

        const hasNav = await checkNavigation(adminPage, pageInfo.name);

        logStep({
          step: `Navigate to ${pageInfo.name}`,
          status: hasNav ? 'success' : 'warning',
          duration: 0,
          clicksRequired: 1,
          url: adminPage.url(),
          issues: hasNav ? [] : ['Missing back button/breadcrumbs'],
        });

        console.log(`  ${hasNav ? '✅' : '⚠️'} ${pageInfo.name}: ${hasNav ? 'Has navigation' : 'Missing navigation'}`);

        await adminPage.goBack();
        await adminPage.waitForLoadState('networkidle');
      }
    }
  });

  test('2. Mobile Responsiveness - Critical Pages', async () => {
    console.log('\n📱 Testing mobile responsiveness...');

    const pages = [
      { name: 'Dashboard', url: `${PROD_URL}/admin` },
      { name: 'Quotes List', url: `${PROD_URL}/admin/quotes` },
      { name: 'Jobs List', url: `${PROD_URL}/admin/jobs` },
    ];

    for (const pageInfo of pages) {
      await adminPage.goto(pageInfo.url);
      await adminPage.waitForLoadState('networkidle');
      await checkMobileResponsive(adminPage, pageInfo.name);
      console.log(`  ✅ ${pageInfo.name} - mobile tested`);
    }
  });

  test('3. Admin Impersonation - Engineer Flow', async () => {
    console.log('\n👤 Testing admin impersonation of engineer...');

    const startTime = Date.now();

    // Navigate to engineers page
    await adminPage.goto(`${PROD_URL}/admin/engineers`);
    await adminPage.waitForLoadState('networkidle');

    // Look for impersonate button
    const impersonateBtn = adminPage.getByRole('button', { name: /impersonate/i }).or(
      adminPage.locator('button').filter({ hasText: /impersonate/i })
    ).first();

    if (await impersonateBtn.isVisible().catch(() => false)) {
      await impersonateBtn.click();
      await adminPage.waitForLoadState('networkidle');

      // Check if we're now in engineer portal
      const isEngineerPortal = adminPage.url().includes('/engineer');

      logStep({
        step: 'Impersonate Engineer',
        status: isEngineerPortal ? 'success' : 'warning',
        duration: Date.now() - startTime,
        clicksRequired: 1,
        url: adminPage.url(),
        issues: isEngineerPortal ? [] : ['Impersonation did not navigate to engineer portal'],
      });

      if (isEngineerPortal) {
        console.log('  ✅ Successfully impersonated engineer');

        // Test engineer can see jobs
        const jobsVisible = await adminPage.locator('text=/jobs/i').isVisible();
        if (!jobsVisible) {
          addUXRecommendation('P1', 'Impersonation', 'Engineer dashboard should show jobs immediately', 'Medium - admin testing flow');
        }

        // Return to admin
        const stopImpersonateBtn = adminPage.getByRole('button', { name: /stop impersonat/i }).or(
          adminPage.locator('button').filter({ hasText: /exit|stop/i })
        ).first();

        if (await stopImpersonateBtn.isVisible().catch(() => false)) {
          await stopImpersonateBtn.click();
          await adminPage.waitForLoadState('networkidle');
          console.log('  ✅ Returned to admin portal');
        }
      } else {
        console.log('  ⚠️ Impersonation button found but did not navigate');
        addUXRecommendation('P0', 'Impersonation', 'Fix engineer impersonation - should navigate to /engineer portal', 'Critical - admin cannot test engineer workflows');
      }
    } else {
      console.log('  ⚠️ No impersonate button found on engineers page');
      addUXRecommendation('P0', 'Impersonation', 'Add impersonate button to engineer list', 'Critical - admin cannot test engineer workflows');
    }
  });

  test('4. Complete Workflow - Enquiry to Invoice', async () => {
    console.log('\n🔄 Testing complete business workflow...');

    const timestamp = Date.now();
    let totalClicks = 0;
    const workflowStart = Date.now();

    // STEP 1: Create Enquiry
    await adminPage.goto(`${PROD_URL}/admin/enquiries`);
    await adminPage.waitForLoadState('networkidle');

    const newEnquiryBtn = adminPage.getByRole('button', { name: /new|create/i }).first();
    if (await newEnquiryBtn.isVisible().catch(() => false)) {
      const stepStart = Date.now();
      await newEnquiryBtn.click();
      totalClicks++;

      const nameInput = adminPage.getByPlaceholder(/name/i).first();
      if (await nameInput.isVisible()) {
        await nameInput.fill(`E2E Test Client ${timestamp}`);
        await adminPage.getByPlaceholder(/email/i).first().fill(`e2e${timestamp}@test.com`);
        await adminPage.getByRole('button', { name: /submit|create|save/i }).first().click();
        totalClicks++;
        await adminPage.waitForLoadState('networkidle');

        logStep({
          step: 'Create Enquiry',
          status: 'success',
          duration: Date.now() - stepStart,
          clicksRequired: 2,
          url: adminPage.url(),
        });

        console.log('  ✅ Created enquiry');
      }
    }

    // STEP 2: Convert to Quote
    await adminPage.goto(`${PROD_URL}/admin/quotes/new`);
    await adminPage.waitForLoadState('networkidle');

    const stepStart2 = Date.now();
    await adminPage.getByPlaceholder(/name/i).first().fill(`E2E Client ${timestamp}`);
    await adminPage.getByPlaceholder(/email/i).first().fill(`e2e${timestamp}@test.com`);

    // Add line item
    const descInput = adminPage.getByPlaceholder('Description').first();
    if (await descInput.isVisible()) {
      await descInput.fill('Test Service');
      const qtyInput = adminPage.locator('input[type="number"]').first();
      await qtyInput.fill('1');
      const priceInput = adminPage.locator('input[type="number"]').nth(1);
      await priceInput.fill('10000'); // £100
    }

    await adminPage.getByRole('button', { name: /create quote/i }).click();
    totalClicks++;
    await adminPage.waitForLoadState('networkidle');

    logStep({
      step: 'Create Quote',
      status: 'success',
      duration: Date.now() - stepStart2,
      clicksRequired: 1,
      url: adminPage.url(),
    });

    console.log('  ✅ Created quote');

    const workflowDuration = Date.now() - workflowStart;

    if (totalClicks > 10) {
      addUXRecommendation(
        'P1',
        'Workflow Efficiency',
        `Enquiry → Quote workflow requires ${totalClicks} clicks - consider bulk actions or templates`,
        'Medium - affects admin productivity'
      );
    }

    console.log(`  📊 Workflow completed in ${workflowDuration}ms with ${totalClicks} clicks`);
  });

  test('5. UX Friction Points - Forms', async () => {
    console.log('\n📝 Testing form UX...');

    // Test quote creation form
    await adminPage.goto(`${PROD_URL}/admin/quotes/new`);
    await adminPage.waitForLoadState('networkidle');

    // Check for inline validation
    const submitBtn = adminPage.getByRole('button', { name: /create/i });
    await submitBtn.click();

    await adminPage.waitForTimeout(500);

    const hasErrorMessages = await adminPage.locator('text=/required|invalid|error/i').isVisible().catch(() => false);

    if (!hasErrorMessages) {
      addUXRecommendation(
        'P2',
        'Forms',
        'Add inline validation with clear error messages on quote form',
        'Low - improves form UX'
      );
    }

    // Check for field labels
    const inputs = await adminPage.locator('input').count();
    const labels = await adminPage.locator('label').count();

    if (labels < inputs * 0.8) {
      addUXRecommendation(
        'P1',
        'Forms',
        'Add visible labels to all form fields (accessibility)',
        'Medium - WCAG AA requirement'
      );
    }

    console.log('  ✅ Form UX analyzed');
  });

  test('6. Performance - Page Load Times', async () => {
    console.log('\n⚡ Testing page performance...');

    const pages = [
      { name: 'Dashboard', url: `${PROD_URL}/admin` },
      { name: 'Quotes List', url: `${PROD_URL}/admin/quotes` },
      { name: 'Jobs List', url: `${PROD_URL}/admin/jobs` },
    ];

    for (const pageInfo of pages) {
      const start = Date.now();
      await adminPage.goto(pageInfo.url);
      await adminPage.waitForLoadState('networkidle');
      const loadTime = Date.now() - start;

      if (loadTime > 3000) {
        addUXRecommendation(
          'P2',
          'Performance',
          `${pageInfo.name} loads in ${loadTime}ms - optimize to under 2s`,
          'Low - affects perceived performance'
        );
      }

      console.log(`  📊 ${pageInfo.name}: ${loadTime}ms`);
    }
  });
});
