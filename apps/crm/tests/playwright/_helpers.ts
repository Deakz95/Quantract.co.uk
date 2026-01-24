import { expect, type APIRequestContext, type Page } from "@playwright/test";

type Role = "admin" | "client" | "engineer";
type ReqLike = Page | APIRequestContext;

function isPage(x: any): x is Page {
  return x && typeof x === "object" && typeof x.goto === "function";
}

/**
 * Apply cookies from an APIRequestContext into a browser Page context.
 * This is the most reliable way to share auth between API + UI in Playwright.
 */
async function applyStorageCookiesToPage(page: Page) {
  const state = await page.request.storageState();
  if (state?.cookies?.length) {
    await page.context().addCookies(state.cookies);
  }
}

export async function loginAs(ctx: ReqLike, role: Role, email?: string) {
  const targetEmail =
    email ||
    (role === "admin" ? "admin@demo.quantract" : `${role}@demo.quantract`);

  const password = "Password123!";

  const request = isPage(ctx) ? ctx.request : ctx;

  console.log("[loginAs] isPage =", isPage(ctx), "role =", role, "email =", targetEmail);

  const res = await request.post("/api/auth/password/login", {
    data: { role, email: targetEmail, password },
  });

  const body = await res.text().catch(() => "");
  expect(res.ok(), `Login failed: ${res.status()} ${body}`).toBeTruthy();

  const setCookie = res.headers()["set-cookie"];
  console.log("[loginAs] set-cookie header =", setCookie ? "(present)" : "(MISSING)");
  if (setCookie) console.log("[loginAs] raw set-cookie =", setCookie);

  if (isPage(ctx)) {
    // Convert Set-Cookie -> cookies for browser context
    const parts = String(setCookie || "").split(/,(?=\s*[^=]+=[^;]+)/g);
    const url = new URL(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000");

    const cookiesToAdd = parts
      .map((p) => p.trim())
      .filter(Boolean)
      .map((cookieStr) => {
        const first = cookieStr.split(";")[0];
        const eq = first.indexOf("=");
        if (eq === -1) return null;
        return {
          name: first.slice(0, eq).trim(),
          value: first.slice(eq + 1).trim(),
          domain: url.hostname,
          path: "/",
        };
      })
      .filter(Boolean) as any[];

    console.log("[loginAs] cookiesToAdd =", cookiesToAdd.map((c) => c.name));

    if (cookiesToAdd.length) {
      await ctx.context().addCookies(cookiesToAdd);
    }

    // 🔍 cookie dump you asked for
    const cookies = await ctx.context().cookies();
    console.log("[loginAs] BROWSER COOKIES:", cookies.map((c) => c.name));
  }

  return res;
}

export async function createQuoteViaApi(
  ctx: ReqLike,
  params?: { clientName?: string; clientEmail?: string }
) {
  await loginAs(ctx, "admin");

  const request = isPage(ctx) ? ctx.request : ctx;

  const uniq = Date.now();
  const clientName = params?.clientName || `Test Client ${uniq}`;
  const clientEmail = params?.clientEmail || `client${uniq}@example.com`;

  const res = await request.post("/api/admin/quotes", {
    data: {
      clientName,
      clientEmail,
      vatRate: 0.2,
      items: [{ id: "1", name: "Line item", qty: 1, unit: 100, total: 100 }],
      status: "draft",
      notes: "Created by Playwright",
    },
  });

  const body = await res.text().catch(() => "");
  expect(res.ok(), `Create quote failed: ${res.status()} ${body}`).toBeTruthy();

  const json = await res.json();

  // Your API returns { ok: true, quote: {...} }
  const quote = json?.quote ?? json;

  // Ensure tests always have this, even if API doesn’t include it
  if (!quote.shareUrl) quote.shareUrl = `/client/quotes/${quote.token}`;

  // Ensure tests always have these too
  if (!quote.clientEmail) quote.clientEmail = clientEmail;
  if (!quote.clientName) quote.clientName = clientName;

  return quote;
}

/**
 * Accept a quote (client action). Works for both Page and APIRequestContext.
 */
export async function acceptQuote(ctx: ReqLike, token: string) {
  if (!token) throw new Error("acceptQuote: missing token");

  // If we have a browser page, do the UI action (most realistic).
  if (isPage(ctx)) {
    await ctx.goto(`/client/quotes/${token}`);
    await expect(ctx.getByRole("heading", { name: /your quote/i })).toBeVisible();
    await ctx.getByRole("button", { name: /accept/i }).click();
    return;
  }

  // API path (no UI)
  const res = await ctx.post(`/api/client/quotes/${token}/accept`, { data: {} });
  const body = await res.text().catch(() => "");
  expect(res.ok(), `Accept quote failed: ${res.status()} ${body}`).toBeTruthy();
}

/**
 * Ensure invoice exists for a quote (admin action).
 */
export async function generateInvoiceForQuote(ctx: ReqLike, quoteId: string) {
  if (!quoteId) throw new Error("generateInvoiceForQuote: missing quoteId");

  await loginAs(ctx, "admin");

  const request = isPage(ctx) ? ctx.request : ctx;

  const res = await request.post("/api/admin/invoices", {
    data: { quoteId },
  });

  const body = await res.text().catch(() => "");
  expect(res.ok(), `Create invoice failed: ${res.status()} ${body}`).toBeTruthy();

  const json = await res.json();
  return json?.invoice ?? json;
}
