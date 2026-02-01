import { chromium, type FullConfig } from "@playwright/test";
import * as path from "path";

const STORAGE_STATE_PATH = path.join(__dirname, ".auth-storage.json");

export { STORAGE_STATE_PATH };

export default async function globalSetup(config: FullConfig) {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL || "https://crm.quantract.co.uk";
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  let res = await page.request.post("/api/auth/password/login", {
    data: { role: "admin", email, password },
  });

  // Retry on rate limit
  if (res.status() === 429) {
    const retryBody = await res.json().catch(() => ({}));
    const waitSec = Math.min(retryBody.retryAfter || 30, 300);
    console.log(`[global-setup] Rate limited — waiting ${waitSec}s…`);
    await new Promise((r) => setTimeout(r, waitSec * 1000 + 2000));
    res = await page.request.post("/api/auth/password/login", {
      data: { role: "admin", email, password },
    });
  }

  if (!res.ok()) {
    const body = await res.text().catch(() => "");
    throw new Error(`Admin login failed: ${res.status()} ${body}`);
  }

  // Parse and apply cookies
  const setCookie = res.headers()["set-cookie"];
  if (setCookie) {
    const url = new URL(baseURL);
    const parts = String(setCookie).split(/,(?=\s*[^=]+=[^;]+)/g);
    const cookies = parts
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

    if (cookies.length) {
      await context.addCookies(cookies);
    }
  }

  // Save storage state for all tests to reuse
  await context.storageState({ path: STORAGE_STATE_PATH });
  await browser.close();

  console.log("[global-setup] Auth state saved — 1 login call used");
}
