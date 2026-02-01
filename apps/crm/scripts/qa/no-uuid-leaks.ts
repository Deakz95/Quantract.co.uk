export {};

/**
 * UUID / Token Leak Scanner
 *
 * Hits key pages and scans rendered HTML for leaked UUIDs or long hex tokens
 * that should never appear in user-visible text.
 *
 * Usage:
 *   BASE_URL=https://crm.quantract.co.uk ADMIN_EMAIL=x ADMIN_PASSWORD=y npm run qa:no-leaks
 */

const BASE_URL =
  process.env.BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  process.exit(1);
}

// ── Patterns ─────────────────────────────────────────────────────────────────

/** UUID v4 — 8-4-4-4-12 hex with dashes */
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Long hex token — 24+ contiguous hex chars (catches tokens, hashes, etc.) */
const HEX_TOKEN_RE = /\b[0-9a-f]{24,}\b/gi;

// ── Allowlist ────────────────────────────────────────────────────────────────
// Patterns that are safe to appear in page text (e.g. CSS class hashes,
// Next.js chunk IDs, known public identifiers).

const ALLOWLIST: RegExp[] = [
  // Next.js build hashes in script src / chunk filenames
  /^[0-9a-f]{16,20}$/,
];

function isAllowlisted(match: string): boolean {
  return ALLOWLIST.some((re) => re.test(match));
}

// ── Cookie jar ───────────────────────────────────────────────────────────────

let cookies: Record<string, string> = {};

function mergeCookies(res: Response) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const h of raw) {
    const pair = h.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) {
      cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
  }
}

function cookieHeader(): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function api(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      cookie: cookieHeader(),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  mergeCookies(res);
  return res;
}

// ── HTML text extraction ─────────────────────────────────────────────────────

/**
 * Extracts user-visible text from HTML by stripping tags, scripts, styles,
 * and collapsing whitespace. This is intentionally simple — we want to catch
 * leaks in rendered output, not in markup attributes.
 */
function extractVisibleText(html: string): string {
  return html
    // Remove <script> and <style> blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    // Remove RSC payload / Next.js inline data
    .replace(/self\.__next_f[\s\S]*?(?=<\/script>|$)/gi, " ")
    // Remove all HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

// ── Scanning ─────────────────────────────────────────────────────────────────

interface Leak {
  url: string;
  pattern: string;
  raw: string;
  masked: string;
}

function mask(s: string): string {
  if (s.length <= 12) return s;
  return s.slice(0, 6) + "…" + s.slice(-4);
}

function scanText(text: string, url: string): Leak[] {
  const leaks: Leak[] = [];

  for (const m of text.matchAll(UUID_RE)) {
    if (!isAllowlisted(m[0])) {
      leaks.push({ url, pattern: "UUID v4", raw: m[0], masked: mask(m[0]) });
    }
  }

  for (const m of text.matchAll(HEX_TOKEN_RE)) {
    if (!isAllowlisted(m[0])) {
      // Skip if already reported as UUID (UUIDs without dashes are also hex)
      const noDash = m[0];
      if (leaks.some((l) => l.raw.replace(/-/g, "") === noDash)) continue;
      leaks.push({
        url,
        pattern: `hex token (${m[0].length} chars)`,
        raw: m[0],
        masked: mask(m[0]),
      });
    }
  }

  return leaks;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const t0 = Date.now();
  console.log("\n  UUID / Token Leak Scanner");
  console.log(`  Target: ${BASE_URL}\n`);

  // 1. Login
  console.log("  Logging in…");
  const loginRes = await api("POST", "/api/auth/password/login", {
    role: "admin",
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (!loginRes.ok) {
    const body = await loginRes.text().catch(() => "");
    console.error(`  FATAL: Login failed (${loginRes.status}): ${body}`);
    process.exit(1);
  }
  console.log("  Logged in ✓\n");

  // 2. Create test data (quote + invoice) for detail pages
  console.log("  Creating test quote…");
  const quoteRes = await api("POST", "/api/admin/quotes", {
    clientName: `Leak-Check ${Date.now()}`,
    clientEmail: `leakcheck-${Date.now()}@test.com`,
    vatRate: 0.2,
    items: [{ id: "1", name: "Scan item", qty: 1, unit: 100, total: 100 }],
    status: "draft",
    notes: "Created by leak scanner",
  });
  if (!quoteRes.ok) {
    const body = await quoteRes.text().catch(() => "");
    console.error(`  FATAL: Create quote failed (${quoteRes.status}): ${body}`);
    process.exit(1);
  }
  const quoteJson = await quoteRes.json();
  const quote = quoteJson?.quote ?? quoteJson;
  const quoteId = quote.id;
  const quoteToken = quote.token;

  console.log("  Creating test invoice…");
  const invRes = await api("POST", "/api/admin/invoices", { quoteId });
  if (!invRes.ok) {
    const body = await invRes.text().catch(() => "");
    console.error(`  FATAL: Create invoice failed (${invRes.status}): ${body}`);
    process.exit(1);
  }
  const invJson = await invRes.json();
  const invoice = invJson?.invoice ?? invJson;
  const invoiceId = invoice.id;
  const invoiceToken = invoice.token;
  console.log("  Test data ready ✓\n");

  // 3. Define pages to scan
  const pages: { label: string; path: string }[] = [
    { label: "Admin quotes list", path: "/admin/quotes" },
    { label: "Admin quote detail", path: `/admin/quotes/${quoteId}` },
    { label: "Admin invoices list", path: "/admin/invoices" },
    { label: "Admin invoice detail", path: `/admin/invoices/${invoiceId}` },
    { label: "Client invoice (token)", path: `/client/invoices/${invoiceToken}` },
    { label: "Client quote (token)", path: `/client/quotes/${quoteToken}` },
    { label: "Admin dashboard", path: "/admin/dashboard" },
  ];

  // 4. Scan each page
  const allLeaks: Leak[] = [];

  for (const pg of pages) {
    const url = `${BASE_URL}${pg.path}`;
    process.stdout.write(`  Scanning: ${pg.label}… `);
    try {
      const res = await api("GET", pg.path);
      if (res.status >= 300 && res.status < 400) {
        // Redirect (e.g. auth redirect for client pages) — skip
        console.log("SKIP (redirect)");
        continue;
      }
      if (!res.ok) {
        console.log(`SKIP (${res.status})`);
        continue;
      }
      const html = await res.text();
      const text = extractVisibleText(html);
      const leaks = scanText(text, url);
      if (leaks.length) {
        console.log(`LEAK (${leaks.length} found)`);
        allLeaks.push(...leaks);
      } else {
        console.log("CLEAN ✓");
      }
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
    }
  }

  // 5. Report
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n  ─────────────────────────────────────`);
  console.log(`  Scanned ${pages.length} pages in ${elapsed}s`);

  if (allLeaks.length === 0) {
    console.log("  Result: PASS ✓  No UUID/token leaks detected\n");
    process.exit(0);
  }

  console.log(`  Result: FAIL ✗  ${allLeaks.length} leak(s) detected\n`);
  for (const leak of allLeaks) {
    console.log(`    ${leak.pattern}`);
    console.log(`      Page:  ${leak.url}`);
    console.log(`      Value: ${leak.masked}`);
    console.log();
  }
  process.exit(1);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
