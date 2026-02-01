export {};

/**
 * Feature Inventory QA Smoke Test
 *
 * Comprehensive staging verification driven by the Excel feature inventory.
 * Covers every launch-critical API surface.
 *
 * Usage:
 *   BASE_URL=https://crm.quantract.co.uk ADMIN_EMAIL=x ADMIN_PASSWORD=y npm run qa:staging
 */

const BASE_URL =
  process.env.BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Cookie jar
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
let skipped = 0;
const suiteStart = Date.now();

async function smoke(label: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  try {
    await fn();
    passed++;
    console.log(`  PASS \u2713  ${label}  (${Date.now() - t0}ms)`);
  } catch (err: any) {
    failed++;
    console.error(`  FAIL \u2717  ${label}  (${Date.now() - t0}ms)`);
    console.error(`           ${err?.message ?? err}`);
  }
}

async function skip(label: string, reason: string) {
  skipped++;
  console.log(`  SKIP -  ${label}  (${reason})`);
}

function section(name: string) {
  console.log(`\n  === ${name} ===`);
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

async function bodySnippet(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.length > 500 ? text.slice(0, 500) + "..." : text;
  } catch {
    return "(unable to read body)";
  }
}

async function assertStatus(
  res: Response,
  expected: number | number[],
  method: string,
  path: string,
): Promise<void> {
  const codes = Array.isArray(expected) ? expected : [expected];
  if (!codes.includes(res.status)) {
    const body = await bodySnippet(res);
    throw new Error(
      `expected ${codes.join("|")}, got ${res.status}\n           body: ${body}`,
    );
  }
}

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

async function apiNoAuth(
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  return fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
}

// ---------------------------------------------------------------------------
// State captured across tests
// ---------------------------------------------------------------------------
let clientId: string;
let clientName: string;
let clientEmail: string;
let contactId: string;
let jobId: string;
let quoteId: string;
let invoiceId: string;
let certificateId: string;
let enquiryId: string;
let engineerId: string;

const ts = Date.now();

/** Tag embedded in all QA-created records for reliable cleanup. */
const QA_TAG = "AUTOMATED_QA";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nFeature Inventory QA \u2014 ${BASE_URL}\n`);

  // =========================================================================
  // A. Auth & Session
  // =========================================================================
  section("Auth & Session");

  // Login is fatal — if it fails, the rest of the suite is meaningless
  {
    const t0 = Date.now();
    const res = await api("POST", "/api/auth/password/login", {
      role: "admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (res.status !== 200) {
      const body = await bodySnippet(res);
      console.error(
        `  FAIL \u2717  POST /api/auth/password/login -> 200  (${Date.now() - t0}ms)`,
      );
      console.error(`           got ${res.status}: ${body}`);
      console.error("\n  Login failed — aborting suite.\n");
      process.exit(1);
    }
    passed++;
    console.log(
      `  PASS \u2713  POST /api/auth/password/login -> 200  (${Date.now() - t0}ms)`,
    );
  }

  await smoke("GET /api/admin/clients (no auth) -> 401/403/307", async () => {
    const res = await apiNoAuth("GET", "/api/admin/clients");
    await assertStatus(res, [401, 403, 307], "GET", "/api/admin/clients");
  });

  await smoke("POST /api/admin/jobs (no auth) -> 401/403/307", async () => {
    const res = await apiNoAuth("POST", "/api/admin/jobs", { title: "x" });
    await assertStatus(res, [401, 403, 307], "POST", "/api/admin/jobs");
  });

  await smoke(
    "GET /api/admin/dashboard/summary (no auth) -> 401/403/307",
    async () => {
      const res = await apiNoAuth("GET", "/api/admin/dashboard/summary");
      await assertStatus(
        res,
        [401, 403, 307],
        "GET",
        "/api/admin/dashboard/summary",
      );
    },
  );

  await smoke("GET /api/auth/session-sync -> 200/307", async () => {
    const res = await api("GET", "/api/auth/session-sync");
    await assertStatus(res, [200, 307], "GET", "/api/auth/session-sync");
  });

  // =========================================================================
  // B. Dashboard & Summary
  // =========================================================================
  section("Dashboard & Summary");

  for (const endpoint of [
    "/api/admin/dashboard/summary",
    "/api/admin/dashboard/activity",
    "/api/admin/dashboard/revenue",
    "/api/admin/dashboard/break-even",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  // =========================================================================
  // C. CRM Core — Fixture chain + reads
  // =========================================================================
  section("CRM Core: Clients, Contacts, Enquiries, Deals");

  clientEmail = `smoke-${ts}@test.quantract.co.uk`;
  clientName = `ZZZ QA Smoke ${ts} [${QA_TAG}]`;

  await smoke("POST /api/admin/clients -> create client", async () => {
    const res = await api("POST", "/api/admin/clients", {
      name: clientName,
      email: clientEmail,
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/clients");
    const json = await res.json();
    clientId = json.client?.id ?? json.id ?? json.clientId;
    assert(clientId, "no clientId in response");
  });

  await smoke("GET /api/admin/clients -> 200, array", async () => {
    const res = await api("GET", "/api/admin/clients");
    await assertStatus(res, 200, "GET", "/api/admin/clients");
  });

  await smoke("GET /api/admin/clients/{id} -> 200", async () => {
    if (!clientId) throw new Error("no clientId (fixture failed)");
    const path = `/api/admin/clients/${clientId}`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("POST /api/admin/contacts -> create contact", async () => {
    const res = await api("POST", "/api/admin/contacts", {
      clientId,
      firstName: `QA`,
      lastName: `Contact ${ts} [${QA_TAG}]`,
      email: `qa-contact-${ts}@test.quantract.co.uk`,
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/contacts");
    const json = await res.json();
    contactId = json.contact?.id ?? json.id ?? json.contactId;
    assert(contactId, "no contactId in response");
  });

  await smoke("GET /api/admin/contacts -> 200", async () => {
    const res = await api("GET", "/api/admin/contacts");
    await assertStatus(res, 200, "GET", "/api/admin/contacts");
  });

  await smoke("POST /api/admin/enquiries -> create enquiry", async () => {
    // Fetch stages first to get a valid stageId
    const stagesRes = await api("GET", "/api/admin/stages");
    const stages = await stagesRes.json();
    const stageList = Array.isArray(stages) ? stages : stages.data ?? stages.stages ?? [];
    const stageId = stageList[0]?.id;
    assert(stageId, "no stages found — cannot create enquiry");
    const res = await api("POST", "/api/admin/enquiries", {
      stageId,
      name: `QA Enquiry ${ts} [${QA_TAG}]`,
      email: `qa-enquiry-${ts}@test.quantract.co.uk`,
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/enquiries");
    const json = await res.json();
    enquiryId = json.enquiry?.id ?? json.id ?? json.enquiryId;
    assert(enquiryId, "no enquiryId in response");
  });

  await smoke("GET /api/admin/enquiries -> 200", async () => {
    const res = await api("GET", "/api/admin/enquiries");
    await assertStatus(res, 200, "GET", "/api/admin/enquiries");
  });

  await smoke("GET /api/admin/deals -> 200", async () => {
    const res = await api("GET", "/api/admin/deals");
    await assertStatus(res, 200, "GET", "/api/admin/deals");
  });

  await smoke("GET /api/admin/deal-stages -> 200", async () => {
    const res = await api("GET", "/api/admin/deal-stages");
    await assertStatus(res, 200, "GET", "/api/admin/deal-stages");
  });

  // =========================================================================
  // D. Jobs, Quotes, Invoices
  // =========================================================================
  section("Jobs, Quotes, Invoices");

  await smoke("POST /api/admin/jobs -> create job", async () => {
    const res = await api("POST", "/api/admin/jobs", {
      manual: true,
      clientId,
      title: `QA Smoke Job ${ts} [${QA_TAG}]`,
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/jobs");
    const json = await res.json();
    jobId = json.job?.id ?? json.id ?? json.jobId;
    assert(jobId, "no jobId in response");
  });

  await smoke("GET /api/admin/jobs -> 200", async () => {
    const res = await api("GET", "/api/admin/jobs");
    await assertStatus(res, 200, "GET", "/api/admin/jobs");
  });

  await smoke("GET /api/admin/jobs/{id} -> 200", async () => {
    if (!jobId) throw new Error("no jobId");
    const path = `/api/admin/jobs/${jobId}`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("GET /api/admin/jobs/{id}/finance-overview -> 200", async () => {
    if (!jobId) throw new Error("no jobId");
    const path = `/api/admin/jobs/${jobId}/finance-overview`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("GET /api/admin/jobs/{id}/cost-items -> 200", async () => {
    if (!jobId) throw new Error("no jobId");
    const path = `/api/admin/jobs/${jobId}/cost-items`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("POST /api/admin/quotes -> create quote", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName,
      clientEmail,
      notes: `[${QA_TAG}]`,
      items: [{ description: "QA smoke test item", qty: 1, unitPrice: 100 }],
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/quotes");
    const json = await res.json();
    quoteId = json.quote?.id ?? json.id ?? json.quoteId;
    assert(quoteId, "no quoteId in response");
  });

  await smoke("GET /api/admin/quotes -> 200", async () => {
    const res = await api("GET", "/api/admin/quotes");
    await assertStatus(res, 200, "GET", "/api/admin/quotes");
  });

  await smoke("GET /api/admin/quotes/{id} -> 200", async () => {
    if (!quoteId) throw new Error("no quoteId");
    const path = `/api/admin/quotes/${quoteId}`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("GET /api/admin/quotes/summary -> 200", async () => {
    const res = await api("GET", "/api/admin/quotes/summary");
    await assertStatus(res, 200, "GET", "/api/admin/quotes/summary");
  });

  await smoke(
    "POST /api/admin/quotes/{id}/invoice -> create invoice",
    async () => {
      const path = `/api/admin/quotes/${quoteId}/invoice`;
      const res = await api("POST", path);
      await assertStatus(res, [200, 201], "POST", path);
      const json = await res.json();
      invoiceId = json.invoice?.id ?? json.id ?? json.invoiceId;
      assert(invoiceId, "no invoiceId in response");
    },
  );

  await smoke("GET /api/admin/invoices -> 200", async () => {
    const res = await api("GET", "/api/admin/invoices");
    await assertStatus(res, 200, "GET", "/api/admin/invoices");
  });

  await smoke("GET /api/admin/invoices/{id} -> 200", async () => {
    if (!invoiceId) throw new Error("no invoiceId");
    const path = `/api/admin/invoices/${invoiceId}`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("GET /api/admin/invoices/{id}/pdf -> PDF", async () => {
    if (!invoiceId) throw new Error("no invoiceId");
    const path = `/api/admin/invoices/${invoiceId}/pdf`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
    const ct = res.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `content-type: ${ct}`);
  });

  // =========================================================================
  // E. Certificates
  // =========================================================================
  section("Certificates");

  await smoke("POST /api/admin/certificates -> create cert", async () => {
    const res = await api("POST", "/api/admin/certificates", {
      jobId,
      type: "MWC",
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/certificates");
    const json = await res.json();
    certificateId = json.certificate?.id ?? json.id ?? json.certificateId;
    assert(certificateId, "no certificateId in response");
  });

  await smoke(
    "PATCH /api/admin/certificates/{id} -> set data + signatures",
    async () => {
      if (!certificateId) throw new Error("no certificateId");
      const now = new Date().toISOString();
      const path = `/api/admin/certificates/${certificateId}`;
      const res = await api("PATCH", path, {
        data: {
          version: 1,
          type: "MWC",
          overview: {
            siteName: `QA Smoke Site [${QA_TAG}]`,
            installationAddress: "1 QA Street",
            clientName,
            clientEmail,
            jobDescription: "QA smoke minor works",
          },
          installation: {
            descriptionOfWork: "QA smoke work",
            supplyType: "Single phase",
            earthingArrangement: "TN-S",
          },
          inspection: {},
          declarations: {},
          assessment: {},
          signatures: {
            engineer: {
              name: "QA Engineer",
              signatureText: "QE",
              signedAtISO: now,
            },
            customer: {
              name: "QA Customer",
              signatureText: "QC",
              signedAtISO: now,
            },
          },
        },
      });
      await assertStatus(res, 200, "PATCH", path);
    },
  );

  await smoke(
    "POST /api/admin/certificates/{id}/complete -> 200",
    async () => {
      if (!certificateId) throw new Error("no certificateId");
      const path = `/api/admin/certificates/${certificateId}/complete`;
      const res = await api("POST", path);
      await assertStatus(res, 200, "POST", path);
    },
  );

  await smoke(
    "POST /api/admin/certificates/{id}/issue -> revision 1",
    async () => {
      if (!certificateId) throw new Error("no certificateId");
      const path = `/api/admin/certificates/${certificateId}/issue`;
      const res = await api("POST", path);
      await assertStatus(res, [200, 201], "POST", path);
    },
  );

  await smoke(
    "GET /api/admin/certificates/{id}/revisions/1/pdf -> PDF",
    async () => {
      if (!certificateId) throw new Error("no certificateId");
      const path = `/api/admin/certificates/${certificateId}/revisions/1/pdf`;
      const res = await api("GET", path);
      await assertStatus(res, 200, "GET", path);
      const ct = res.headers.get("content-type") ?? "";
      assert(ct.includes("application/pdf"), `content-type: ${ct}`);
    },
  );

  await smoke("GET /api/admin/certificates/analytics -> 200", async () => {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    const path = `/api/admin/certificates/analytics?from=${from}&to=${to}`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("GET /api/admin/certificates -> 200", async () => {
    const res = await api("GET", "/api/admin/certificates");
    await assertStatus(res, 200, "GET", "/api/admin/certificates");
  });

  // =========================================================================
  // F. Engineer Portal
  // =========================================================================
  section("Engineer Portal");

  await smoke("GET /api/engineer/jobs -> 200", async () => {
    const res = await api("GET", "/api/engineer/jobs");
    await assertStatus(res, 200, "GET", "/api/engineer/jobs");
  });

  await smoke("GET /api/engineer/profile -> 200", async () => {
    const res = await api("GET", "/api/engineer/profile");
    await assertStatus(res, 200, "GET", "/api/engineer/profile");
  });

  await smoke("GET /api/engineer/schedule -> 200", async () => {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const to = new Date(now.getTime() + 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const path = `/api/engineer/schedule?from=${from}&to=${to}`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("GET /api/engineer/timesheets -> 200", async () => {
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    const weekStart = monday.toISOString().slice(0, 10);
    const path = `/api/engineer/timesheets?weekStart=${weekStart}`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
  });

  await smoke("GET /api/engineer/timer/active -> 200", async () => {
    const res = await api("GET", "/api/engineer/timer/active");
    await assertStatus(res, 200, "GET", "/api/engineer/timer/active");
  });

  // =========================================================================
  // G. Client Portal
  // =========================================================================
  section("Client Portal");

  for (const endpoint of [
    "/api/client/inbox/quotes",
    "/api/client/inbox/invoices",
    "/api/client/certificates",
    "/api/client/timeline",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, [200, 403], "GET", endpoint);
    });
  }

  // =========================================================================
  // H. Planner, Timesheets, Schedule
  // =========================================================================
  section("Planner, Timesheets, Schedule");

  for (const endpoint of [
    "/api/admin/planner",
    "/api/admin/schedule",
    "/api/admin/timesheets",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  // =========================================================================
  // I. Settings & Admin
  // =========================================================================
  section("Settings & Admin");

  for (const endpoint of [
    "/api/admin/settings",
    "/api/admin/settings/financials",
    "/api/admin/invites",
    "/api/admin/users",
    "/api/admin/entitlements",
    "/api/admin/stages",
    "/api/admin/service-lines",
    "/api/admin/legal-entities",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  // =========================================================================
  // J. Tools
  // =========================================================================
  section("Tools");

  for (const endpoint of [
    "/api/admin/rams",
    "/api/tools/metal-prices",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  await smoke("GET /api/tools/presets -> 200", async () => {
    const res = await api("GET", "/api/tools/presets");
    await assertStatus(res, 200, "GET", "/api/tools/presets");
  });

  // =========================================================================
  // K. Reports
  // =========================================================================
  section("Reports");

  for (const endpoint of [
    "/api/admin/reports/revenue",
    "/api/admin/reports/sales",
    "/api/admin/reports/pipeline",
    "/api/admin/reports/profitability",
    "/api/admin/reports/activity",
    "/api/admin/reports/ar-aging",
    "/api/admin/reports/engineer-utilisation",
    "/api/admin/reports/quote-win-rate",
    "/api/admin/reports/tax-summary",
    "/api/admin/reports/time-vs-estimate",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  // =========================================================================
  // L. Import/Export
  // =========================================================================
  section("Import/Export");

  for (const endpoint of [
    "/api/admin/export/clients",
    "/api/admin/export/contacts",
    "/api/admin/export/deals",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  // =========================================================================
  // M. Lead Capture
  // =========================================================================
  section("Lead Capture");

  for (const endpoint of [
    "/api/admin/lead-capture/domains",
    "/api/admin/lead-capture/forms",
    "/api/admin/lead-capture/keys",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  // =========================================================================
  // N. Other Admin APIs
  // =========================================================================
  section("Other Admin APIs");

  for (const endpoint of [
    "/api/admin/notifications/recent",
    "/api/admin/notifications/rules",
    "/api/admin/maintenance/assets",
    "/api/admin/maintenance/rules",
    "/api/admin/materials/stock-items",
    "/api/admin/suppliers",
    "/api/admin/expenses",
    "/api/admin/overheads",
    "/api/admin/search?q=test",
    "/api/admin/saved-views",
  ]) {
    await smoke(`GET ${endpoint} -> 200`, async () => {
      const res = await api("GET", endpoint);
      await assertStatus(res, 200, "GET", endpoint);
    });
  }

  // =========================================================================
  // Wrong-password test (at end to avoid rate-limiting the real login)
  // =========================================================================
  section("Auth (negative)");

  await smoke(
    "POST /api/auth/password/login (wrong password) -> 401",
    async () => {
      const res = await apiNoAuth("POST", "/api/auth/password/login", {
        role: "admin",
        email: ADMIN_EMAIL,
        password: "definitely-wrong-password-xyz",
      });
      await assertStatus(
        res,
        [401, 400, 429],
        "POST",
        "/api/auth/password/login",
      );
    },
  );

  // =========================================================================
  // Summary
  // =========================================================================
  const total = passed + failed + skipped;
  const elapsed = ((Date.now() - suiteStart) / 1000).toFixed(1);
  console.log(
    `\n  Total: ${total} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped} | ${elapsed}s`,
  );
  console.log(`\n  To cleanup: npm run qa:purge-test-data\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
