import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * UI/UX Audit Script
 *
 * This script:
 * 1. Extracts brand colors from the marketing site
 * 2. Audits all major routes in the web portal
 * 3. Captures screenshots and checks for UI issues
 * 4. Reports contrast and accessibility problems
 */

// Create output directories
const outputDir = join(process.cwd(), 'ui-audit-results');
mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });

test.describe('UI/UX Audit', () => {
  test.describe.configure({ mode: 'serial' });

  test('Extract brand colors from marketing site', async ({ page }) => {
    await page.goto('https://www.quantractelectrical.co.uk/');
    await page.waitForLoadState('networkidle');

    // Extract computed styles from key elements
    const brandColors = await page.evaluate(() => {
      const results: any = {};

      // Find primary button
      const primaryBtn = document.querySelector('[class*="button"], [class*="btn"], a[href*="contact"]');
      if (primaryBtn) {
        const computed = window.getComputedStyle(primaryBtn);
        results.primaryButton = {
          background: computed.backgroundColor,
          color: computed.color,
          border: computed.borderColor,
        };
      }

      // Get body and heading colors
      const body = document.body;
      results.body = {
        background: window.getComputedStyle(body).backgroundColor,
        color: window.getComputedStyle(body).color,
      };

      const h1 = document.querySelector('h1');
      if (h1) {
        results.heading = {
          color: window.getComputedStyle(h1).color,
          fontFamily: window.getComputedStyle(h1).fontFamily,
          fontWeight: window.getComputedStyle(h1).fontWeight,
        };
      }

      // Get navigation colors
      const nav = document.querySelector('nav, header');
      if (nav) {
        results.navigation = {
          background: window.getComputedStyle(nav).backgroundColor,
          color: window.getComputedStyle(nav).color,
        };
      }

      // Get card/section colors
      const card = document.querySelector('[class*="card"], [class*="section"], article');
      if (card) {
        results.card = {
          background: window.getComputedStyle(card).backgroundColor,
          border: window.getComputedStyle(card).borderColor,
        };
      }

      return results;
    });

    console.log('Brand Colors Extracted:', JSON.stringify(brandColors, null, 2));
    writeFileSync(
      join(outputDir, 'brand-colors.json'),
      JSON.stringify(brandColors, null, 2)
    );
  });

  const criticalRoutes = [
    // Admin routes
    { path: '/admin/login', name: 'Admin Login', role: 'public' },
    { path: '/admin', name: 'Admin Dashboard', role: 'admin' },
    { path: '/admin/quotes', name: 'Admin Quotes', role: 'admin' },
    { path: '/admin/jobs', name: 'Admin Jobs', role: 'admin' },
    { path: '/admin/invoices', name: 'Admin Invoices', role: 'admin' },

    // Engineer routes
    { path: '/engineer/login', name: 'Engineer Login', role: 'public' },
    { path: '/engineer', name: 'Engineer Dashboard', role: 'engineer' },
    { path: '/engineer/jobs', name: 'Engineer Jobs', role: 'engineer' },
    { path: '/engineer/timesheets', name: 'Engineer Timesheets', role: 'engineer' },

    // Client routes
    { path: '/client/login', name: 'Client Login', role: 'public' },
    { path: '/client', name: 'Client Dashboard', role: 'client' },
  ];

  for (const route of criticalRoutes) {
    test(`Audit ${route.name} (${route.path})`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route.path}`);
      await page.waitForLoadState('networkidle');

      // Take screenshots
      const screenshotName = route.name.replace(/\s+/g, '-').toLowerCase();
      await page.screenshot({
        path: join(outputDir, 'screenshots', `${screenshotName}-desktop.png`),
        fullPage: true,
      });

      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({
        path: join(outputDir, 'screenshots', `${screenshotName}-mobile.png`),
        fullPage: true,
      });

      // Check for UI issues
      const issues = await page.evaluate(() => {
        const problems: string[] = [];

        // Check for white-on-white or very low contrast
        const allElements = document.querySelectorAll('*');
        const contrastIssues: string[] = [];

        allElements.forEach((el) => {
          if (el.textContent && el.textContent.trim()) {
            const computed = window.getComputedStyle(el);
            const color = computed.color;
            const bgColor = computed.backgroundColor;

            // Check if both are very light (potential white-on-white)
            if (color && bgColor) {
              const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
              const bgRgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

              if (rgbMatch && bgRgbMatch) {
                const [, r, g, b] = rgbMatch.map(Number);
                const [, bgR, bgG, bgB] = bgRgbMatch.map(Number);

                const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
                const bgLuminance = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

                // Both very light or both very dark
                if ((luminance > 200 && bgLuminance > 200) || (luminance < 50 && bgLuminance < 50)) {
                  const text = el.textContent?.trim().substring(0, 50);
                  if (text && text.length > 0) {
                    contrastIssues.push(`Low contrast: "${text}" (${color} on ${bgColor})`);
                  }
                }
              }
            }
          }
        });

        if (contrastIssues.length > 0) {
          problems.push(`Contrast issues found: ${contrastIssues.slice(0, 10).join('; ')}`);
        }

        // Check for missing focus states
        const focusableElements = document.querySelectorAll('button, a, input, select, textarea');
        let missingFocusOutline = 0;
        focusableElements.forEach((el) => {
          const computed = window.getComputedStyle(el, ':focus-visible');
          if (!computed.outlineWidth || computed.outlineWidth === '0px') {
            missingFocusOutline++;
          }
        });
        if (missingFocusOutline > 0) {
          problems.push(`${missingFocusOutline} focusable elements missing visible focus outlines`);
        }

        // Check for inconsistent button styles
        const buttons = document.querySelectorAll('button, [role="button"], a[class*="btn"]');
        const buttonStyles = new Set<string>();
        buttons.forEach((btn) => {
          const computed = window.getComputedStyle(btn);
          const style = `${computed.backgroundColor}-${computed.color}-${computed.borderRadius}`;
          buttonStyles.add(style);
        });
        if (buttonStyles.size > 5) {
          problems.push(`Inconsistent button styles: ${buttonStyles.size} different variations found`);
        }

        return problems;
      });

      if (issues.length > 0) {
        console.log(`Issues on ${route.name}:`, issues);
        writeFileSync(
          join(outputDir, `issues-${screenshotName}.txt`),
          issues.join('\n')
        );
      }
    });
  }
});
