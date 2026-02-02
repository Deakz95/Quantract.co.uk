/**
 * QA re-test for the 6 fixes from the Pass 2 report.
 * Runs against live staging: crm.quantract.co.uk
 */

const BASE_URL = process.env.BASE_URL || "https://crm.quantract.co.uk";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars");
  process.exit(1);
}

let cookies: Record<string, string> = {};

function mergeCookies(res: Response) {
  const raw = (res.headers as any).getSetCookie?.() ?? [];
  for (const h of raw) {
    const pair = h.split(";")[0];
    const eq = pair.indexOf("=");
    if (eq > 0) cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}

function cookieHeader(): string {
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchJson(path: string, opts?: { method?: string; body?: object; noCookies?: boolean }) {
  const headers: Record<string, string> = {};
  if (!opts?.noCookies) headers["cookie"] = cookieHeader();
  if (opts?.body) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
    redirect: "manual",
  });
  mergeCookies(res);
  let json: any = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
}

async function main() {
  // Login
  console.log("Logging in...");
  const login = await fetchJson("/api/auth/password/login", {
    method: "POST",
    body: { role: "admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    noCookies: true,
  });
  if (login.status !== 200 && !login.json?.ok) {
    console.error("Login failed:", login.status, login.json);
    process.exit(1);
  }
  console.log("Logged in.\n");

  // === FIX 1: Double J- prefix ===
  console.log("Fix 1: Double J- prefix on job names");
  const jobs = await fetchJson("/api/admin/jobs");
  const jobList = Array.isArray(jobs.json) ? jobs.json : (jobs.json?.jobs || []);
  if (jobList.length > 0) {
    const doubleJ = jobList.filter((j: any) =>
      j.jobNumber && /^J-J-/.test(j.jobNumber)
    );
    check("No job numbers have double J- prefix", doubleJ.length === 0,
      doubleJ.length > 0 ? `Found: ${doubleJ.map((j: any) => j.jobNumber).join(", ")}` : undefined);

    // Check cleanJobTitle effect: no titles starting with "J-J-"
    const doubleTitle = jobList.filter((j: any) =>
      (j.title || j.name || "").startsWith("J-J-")
    );
    check("No job titles have double J- prefix", doubleTitle.length === 0,
      doubleTitle.length > 0 ? `Found: ${doubleTitle.map((j: any) => j.title || j.name).slice(0, 3).join(", ")}` : undefined);
    console.log(`  INFO  ${jobList.length} job(s), sample: ${jobList.slice(0, 3).map((j: any) => j.jobNumber).join(", ")}`);
  } else {
    check("Jobs API returns data", false, `status=${jobs.status}`);
  }

  // === FIX 2: Invoice copy toast (API-side check — toast is client-only) ===
  console.log("\nFix 2: Invoice copy toast (client-side only — verify API serves invoices)");
  const invoices = await fetchJson("/api/admin/invoices");
  check("Invoices API returns ok", invoices.json?.ok === true);
  if (invoices.json?.ok && invoices.json.invoices?.length > 0) {
    const inv = invoices.json.invoices[0];
    check("First invoice has token for client link", !!inv.token);
  }

  // === FIX 3: Search shortcut hint (client-side only — verify search API works) ===
  console.log("\nFix 3: Platform shortcut hint (client-side — verify search API)");
  const search = await fetchJson("/api/admin/search?q=test");
  check("Search API responds", search.status === 200);

  // === FIX 4: Client portal duplicate heading (client-side — verify page serves) ===
  console.log("\nFix 4: Client portal heading (verify page serves HTML)");
  const clientPage = await fetch(`${BASE_URL}/client`, {
    headers: { cookie: cookieHeader() },
    redirect: "manual",
  });
  check("Client page serves (200 or 302)", clientPage.status === 200 || clientPage.status === 302);

  // === FIX 5: Troubleshooter in client sidebar ===
  console.log("\nFix 5: Troubleshooter page accessible");
  const troubleshoot = await fetch(`${BASE_URL}/client/troubleshoot`, {
    headers: { cookie: cookieHeader() },
    redirect: "manual",
  });
  check("Troubleshoot page serves (200 or 302)", troubleshoot.status === 200 || troubleshoot.status === 302);

  // === FIX 6: Planner engineer name casing (API check) ===
  console.log("\nFix 6: Planner engineers API");
  const engineers = await fetchJson("/api/admin/engineers");
  check("Engineers API returns ok", engineers.json?.ok === true);
  if (engineers.json?.ok && engineers.json.engineers?.length > 0) {
    check("Engineers have names", engineers.json.engineers.every((e: any) => e.name || e.email));
    console.log(`  INFO  ${engineers.json.engineers.length} engineer(s) returned`);
    for (const e of engineers.json.engineers.slice(0, 5)) {
      console.log(`    - ${e.name || e.email}`);
    }
  }

  // === Timeline humanization check (bonus — verify no raw keys) ===
  console.log("\nBonus: Timeline humanization");
  const timeline = await fetchJson("/api/admin/timeline?jobId=00000000-0000-0000-0000-000000000000");
  check("Timeline API responds (even with fake jobId)", timeline.status === 200);
  if (timeline.json?.ok && timeline.json.items?.length > 0) {
    const rawKeys = timeline.json.items.filter((i: any) =>
      /\.\w+$/.test(i.description) || /^[a-z_]+\s[a-z_.]+$/i.test(i.description)
    );
    check("No raw event keys in timeline descriptions", rawKeys.length === 0,
      rawKeys.length > 0 ? rawKeys.map((i: any) => i.description).join(", ") : undefined);
  }

  // === Dashboard activity — no UUID fragments ===
  console.log("\nBonus: Dashboard activity — no UUID fragments");
  const summary = await fetchJson("/api/admin/dashboard/summary");
  if (summary.json?.activities?.length > 0) {
    const uuidLeaks = summary.json.activities.filter((a: any) =>
      /[0-9a-f]{8}/.test(a.description) && !/INV-|QUO-|J-/.test(a.description)
    );
    check("No UUID fragments in activity descriptions", uuidLeaks.length === 0,
      uuidLeaks.length > 0 ? uuidLeaks.map((a: any) => a.description).slice(0, 3).join("; ") : undefined);
  } else {
    check("Dashboard summary returns activities", !!summary.json?.activities);
  }

  // === Summary ===
  console.log(`\n${"=".repeat(40)}`);
  console.log(`PASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
  console.log(`${"=".repeat(40)}`);

  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
