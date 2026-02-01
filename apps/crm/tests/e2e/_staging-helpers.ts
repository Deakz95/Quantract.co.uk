import { expect, type Page } from "@playwright/test";

export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || "https://crm.quantract.co.uk";

/**
 * Create a quote via the admin API. Page must already be authenticated
 * (handled by global setup + storageState).
 */
export async function createQuoteViaApi(
  page: Page,
  params?: { clientName?: string; clientEmail?: string }
) {
  const uniq = Date.now();
  const clientName = params?.clientName || `Test Client ${uniq}`;
  const clientEmail = params?.clientEmail || `client${uniq}@example.com`;

  const res = await page.request.post("/api/admin/quotes", {
    data: {
      clientName,
      clientEmail,
      vatRate: 0.2,
      items: [{ id: "1", name: "Line item", qty: 1, unit: 100, total: 100 }],
      status: "draft",
      notes: "Created by Playwright E2E",
    },
  });

  const body = await res.text().catch(() => "");
  expect(res.ok(), `Create quote failed: ${res.status()} ${body}`).toBeTruthy();

  const json = await res.json();
  const quote = json?.quote ?? json;

  if (!quote.shareUrl) quote.shareUrl = `/client/quotes/${quote.token}`;
  if (!quote.clientEmail) quote.clientEmail = clientEmail;
  if (!quote.clientName) quote.clientName = clientName;

  return quote;
}

/**
 * Generate an invoice for a quote via the admin API.
 * Page must already be authenticated as admin.
 */
export async function generateInvoiceForQuote(page: Page, quoteId: string) {
  if (!quoteId) throw new Error("generateInvoiceForQuote: missing quoteId");

  const res = await page.request.post("/api/admin/invoices", {
    data: { quoteId },
  });

  const body = await res.text().catch(() => "");
  expect(
    res.ok(),
    `Create invoice failed: ${res.status()} ${body}`
  ).toBeTruthy();

  const json = await res.json();
  return json?.invoice ?? json;
}
