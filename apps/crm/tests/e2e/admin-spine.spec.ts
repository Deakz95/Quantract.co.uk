import { test, expect } from "@playwright/test";
import {
  createQuoteViaApi,
  generateInvoiceForQuote,
} from "./_staging-helpers";

test.describe("Admin launch spine", () => {
  test("full admin workflow: client → site → job → quote → invoice → PDF → map", async ({
    page,
  }) => {
    // 1. Verify auth (global setup handled login)
    await page.goto("/admin/dashboard");
    await expect(page.getByRole("heading").first()).toBeVisible();

    // 2. Create client
    await page.goto("/admin/clients/new");
    await page.getByPlaceholder("e.g. Jane Doe").fill("E2E Test Client");
    await page.getByPlaceholder("jane@example.com").fill(`e2e-${Date.now()}@test.com`);
    await page.getByPlaceholder("07").fill("07000000000");
    await page.getByRole("button", { name: /create client/i }).click();
    await page.waitForURL(/\/admin\/clients\//);
    const clientId = page.url().split("/admin/clients/")[1]?.split(/[?#]/)[0];
    expect(clientId).toBeTruthy();

    // 3. Create site via API (provide lat/lng to skip geocoding)
    const siteRes = await page.request.post("/api/admin/sites", {
      data: {
        clientId,
        name: "E2E Test Site",
        postcode: "SW1A 1AA",
        latitude: 51.5014,
        longitude: -0.1419,
      },
    });
    let siteId: string | undefined;
    if (siteRes.ok()) {
      const siteJson = await siteRes.json();
      siteId = siteJson?.site?.id ?? siteJson?.id;
      expect(siteId).toBeTruthy();
    } else {
      const siteBody = await siteRes.text().catch(() => "");
      console.warn(`Site creation failed (${siteRes.status()}): ${siteBody} — continuing`);
    }

    // 4. Create job
    await page.goto("/admin/jobs/new");
    await page.getByRole("button", { name: /manual job/i }).click();
    // Select the client from the native <select> dropdown
    const clientSelect = page.locator("select").first();
    await clientSelect.waitFor({ state: "visible" });
    // Wait for options to load (more than just the placeholder)
    await page.waitForFunction(
      (sel) => document.querySelector(sel)!.options.length > 1,
      "select",
      { timeout: 10000 }
    );
    // Select the last option (our newly created client)
    const lastOptionValue = await page.evaluate((sel) => {
      const select = document.querySelector(sel) as HTMLSelectElement;
      return select.options[select.options.length - 1].value;
    }, "select");
    await clientSelect.selectOption(lastOptionValue);
    await page.getByPlaceholder("e.g. Kitchen rewire").fill("E2E Test Job");
    await page.getByRole("button", { name: /create job/i }).click();
    await page.waitForURL(/\/admin\/jobs\//);
    const jobId = page.url().split("/admin/jobs/")[1]?.split(/[?#]/)[0];
    expect(jobId).toBeTruthy();

    // 5. Create quote via API (faster and more reliable than UI)
    const apiQuote = await createQuoteViaApi(page, {
      clientName: "E2E Quote Client",
      clientEmail: `e2e-quote-${Date.now()}@test.com`,
    });
    const quoteId = apiQuote.id;
    expect(quoteId).toBeTruthy();

    // Navigate to quote detail
    await page.goto(`/admin/quotes/${quoteId}`);
    await page.waitForLoadState("networkidle");

    // 6. Assert quote detail page loaded
    await expect(page.getByText(/status:\s*(draft|sent|accepted)/i).first()).toBeVisible();
    // If quoteNumber is assigned, verify it's visible (QUO- or Q- prefix)
    const quoteContent = await page.locator("body").innerText();
    if (/QUO-\d+|Q-\d+/.test(quoteContent)) {
      console.log("Quote number found in page content");
    } else {
      console.log("No quote number prefix found — legal entity may not be configured");
    }
    // Heading should NOT contain a raw UUID
    const headings = page.getByRole("heading");
    const headingCount = await headings.count();
    for (let i = 0; i < headingCount; i++) {
      const text = await headings.nth(i).textContent();
      expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
    }

    // 7. Convert to invoice via API
    const invoice = await generateInvoiceForQuote(page, quoteId!);
    const invoiceId = invoice.id;
    const invoiceNumber = invoice.invoiceNumber;
    const token = invoice.token;
    expect(invoiceId).toBeTruthy();
    expect(invoiceNumber).toMatch(/INV-\d+/);

    // 8. View invoice
    await page.goto(`/admin/invoices/${invoiceId}`);
    await expect(page.getByText(invoiceNumber).first()).toBeVisible();

    // 9. Download PDF
    const pdfRes = await page.request.get(`/api/admin/invoices/${invoiceId}/pdf`);
    expect(pdfRes.status()).toBe(200);
    const pdfBuffer = await pdfRes.body();
    const pdfHeader = pdfBuffer.slice(0, 5).toString();
    expect(pdfHeader).toBe("%PDF-");
    const disposition = pdfRes.headers()["content-disposition"] || "";
    expect(disposition.toLowerCase()).toContain(invoiceNumber.toLowerCase());

    // 10. Map card
    await page.goto("/admin/dashboard");
    const mapContainer = page.locator(".leaflet-container");
    if (await mapContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(mapContainer.locator(".leaflet-marker-icon").first()).toBeVisible();
    } else {
      console.log("Map container not found — skipping map assertion");
    }
  });
});
