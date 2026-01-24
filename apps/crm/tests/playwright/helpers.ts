import { expect, type APIRequestContext, type Page } from "@playwright/test";

type Role = "admin" | "client" | "engineer";
type ReqLike = Page | APIRequestContext;

function isPage(x: any): x is Page {
  return x && typeof x === "object" && typeof x.goto === "function";
}

function baseURL() {
  return process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
}

/**
 * Copy Set-Cookie headers from an APIResponse into the browser context
 * so UI navigation is authenticated.
 */
async function applyAuthCookiesToPage(page: Page, res: any) {
  const headers = res.headers?.() ?? {};
  const setCookie = headers["set-cookie"];
  console.log("[loginAs] set-cookie header =", setCookie ? "(present)" : "(missing)");
  if (!setCookie) return;

  console.log("[loginAs] raw set-cookie =", setCookie);

  // `set-cookie` can be a single string containing multiple cookies.
  // Split on commas that start a new cookie (avoid Expires=..., which contains commas).
  const parts = String(setCookie).split(/,(?=\s*[^=]+=[^;]+)/g);

  const url = new URL(baseURL());

  const cookies = parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((cookieStr) => {
      const first = cookieStr.split(";")[0];
      const eq = first.indexOf("=");
      if (eq === -1) return null;

      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();

      return {
        name,
        value,
        domain: url.hostname,
        path: "/",
        // These cookies are HttpOnly in real life; Playwright lets us set them anyway.
        httpOnly: true,
        secure: url.protocol === "https:",
        sameSite: "Lax" as const,
      };
    })
    .filter(Boolean) as any[];

  console.log("[loginAs] cookiesToAdd =", cookies.map((c: any) => c.name));

  if (cookies.length) {
    await page.context().addCookies(cookies);

    // DEBUG: confirm what the browser actually has
    const browserCookies = await page.context().cookies();
    console.log("[loginAs] BROWSER COOKIES:", browserCookies.map((c) => c.name));
  }
}

export async function loginAs(ctx: ReqLike, role: Role, email?: string) {
  const targetEmail =
    email ||
    (role === "admin" ? "admin@demo.quantract" : `${role}@demo.quantract`);

  const password = "Password123!";

  console.log("[loginAs] isPage =", isPage(ctx), "role =", role, "email =", targetEmail);

  const request = isPage(ctx) ? ctx.request : ctx;

  const res = await request.post("/api/auth/password/login", {
    data: { role, email: targetEmail, password },
  });

  const body = await res.text().catch(() => "");
  expect(res.ok(), `Login failed: ${res.status()} ${body}`).toBeTruthy();

  if (isPage(ctx)) {
    await applyAuthCookiesToPage(ctx, res);
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
  const clientEmail = params?.clientEmail || `client.${uniq}@example.com`;

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

  const json = await res.json().catch(() => ({} as any));
  const quote = (json as any)?.quote ?? json;

  if (!quote.shareUrl) quote.shareUrl = `/client/quotes/${quote.token}`;
  if (!quote.clientEmail) quote.clientEmail = clientEmail;
  if (!quote.clientName) quote.clientName = clientName;

  return quote;
}

export async function acceptQuote(ctx: ReqLike, token: string) {
  if (!token) throw new Error("acceptQuote: missing token");

  if (isPage(ctx)) {
    await ctx.goto(`/client/quotes/${token}`);
    await expect(ctx.getByRole("heading", { name: /your quote/i })).toBeVisible();
    await ctx.getByRole("button", { name: /accept/i }).click();
    return;
  }

  const res = await ctx.post(`/api/client/quotes/${token}/accept`, { data: {} });
  const body = await res.text().catch(() => "");
  expect(res.ok(), `Accept quote failed: ${res.status()} ${body}`).toBeTruthy();
}
