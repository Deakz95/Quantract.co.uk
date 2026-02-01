import { test, expect } from "@playwright/test";
import {
  createQuoteViaApi,
  generateInvoiceForQuote,
} from "./_staging-helpers";

test.describe("Client portal spine", () => {
  test("client invoice view shows invoice number, hides token, and PDF downloads", async ({
    page,
  }) => {
    // 1. Setup — create quote + invoice (auth handled by global setup)
    const quote = await createQuoteViaApi(page);
    const invoice = await generateInvoiceForQuote(page, quote.id);
    const token = invoice.token;
    const invoiceNumber = invoice.invoiceNumber;
    expect(token).toBeTruthy();
    expect(invoiceNumber).toMatch(/INV-\d+/);

    // 2. View invoice via client route (admin has universal access per middleware)
    await page.goto(`/client/invoices/${token}`);
    await expect(
      page.getByRole("heading", { name: /invoice/i }).first()
    ).toBeVisible();

    // 3. No token leak — body should not expose the raw token
    const bodyText = await page.locator("body").innerText();
    expect(bodyText).not.toContain(token);
    // Headings should not contain a UUID pattern
    const headings = page.getByRole("heading");
    const headingCount = await headings.count();
    for (let i = 0; i < headingCount; i++) {
      const text = await headings.nth(i).textContent();
      expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
    }

    // 4. InvoiceNumber visible
    await expect(page.getByText(invoiceNumber).first()).toBeVisible();

    // 5. PDF download
    const pdfRes = await page.request.get(
      `/api/client/invoices/${token}/pdf`
    );
    expect(pdfRes.status()).toBe(200);
    const pdfBuffer = await pdfRes.body();
    const pdfHeader = pdfBuffer.slice(0, 5).toString();
    expect(pdfHeader).toBe("%PDF-");
    const disposition = pdfRes.headers()["content-disposition"] || "";
    expect(disposition.toLowerCase()).toContain(
      invoiceNumber.toLowerCase()
    );
  });
});
