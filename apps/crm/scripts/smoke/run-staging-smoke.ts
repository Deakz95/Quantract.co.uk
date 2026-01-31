/**
 * API Smoke Test Suite
 *
 * Runs ordered integration tests against a live CRM instance.
 *
 * Usage:
 *   BASE_URL=https://crm.quantract.co.uk ADMIN_EMAIL=x ADMIN_PASSWORD=y npm run smoke:staging
 */

const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
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
  // getSetCookie() returns an array of raw Set-Cookie header values
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const h of raw) {
    const pair = h.split(";")[0]; // "name=value"
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

async function smoke(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS \u2713  ${label}`);
  } catch (err: any) {
    failed++;
    console.error(`  FAIL \u2717  ${label}: ${err?.message ?? err}`);
  }
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
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

// ---------------------------------------------------------------------------
// State captured across tests
// ---------------------------------------------------------------------------
let clientId: string;
let clientName: string;
let clientEmail: string;
let jobId: string;
let quoteId: string;
let invoiceId: string;
let certificateId: string;

const ts = Date.now();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nSmoke tests against ${BASE_URL}\n`);

  // A) Health ---------------------------------------------------------------
  await smoke("GET /api/health -> 200", async () => {
    const res = await api("GET", "/api/health");
    assert(res.status === 200, `status ${res.status}`);
  });

  // B) Auth -----------------------------------------------------------------
  await smoke("POST /api/auth/password/login -> 200", async () => {
    const res = await api("POST", "/api/auth/password/login", {
      role: "admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert(res.status === 200, `status ${res.status}`);
    assert(Object.keys(cookies).length > 0, "no cookies set");
  });

  // C) CRM Core -------------------------------------------------------------
  clientEmail = `smoke-${ts}@test.quantract.co.uk`;
  clientName = "ZZZ Smoke Test Client";

  await smoke("POST /api/admin/clients -> create client", async () => {
    const res = await api("POST", "/api/admin/clients", {
      name: clientName,
      email: clientEmail,
    });
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const json = await res.json();
    clientId = json.id ?? json.clientId;
    assert(clientId, "no clientId in response");
  });

  await smoke("POST /api/admin/jobs -> create job", async () => {
    const res = await api("POST", "/api/admin/jobs", {
      manual: true,
      clientId,
      title: "Smoke Test Job",
    });
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const json = await res.json();
    jobId = json.id ?? json.jobId;
    assert(jobId, "no jobId in response");
  });

  await smoke("POST /api/admin/quotes -> create quote", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName,
      clientEmail,
      items: [{ description: "Smoke test item", qty: 1, unitPrice: 100 }],
    });
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const json = await res.json();
    quoteId = json.id ?? json.quoteId;
    assert(quoteId, "no quoteId in response");
  });

  await smoke("POST /api/admin/quotes/{id}/invoice -> create invoice", async () => {
    const res = await api("POST", `/api/admin/quotes/${quoteId}/invoice`);
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const json = await res.json();
    invoiceId = json.id ?? json.invoiceId;
    assert(invoiceId, "no invoiceId in response");
  });

  await smoke("GET /api/admin/invoices/{id}/pdf -> PDF", async () => {
    const res = await api("GET", `/api/admin/invoices/${invoiceId}/pdf`);
    assert(res.status === 200, `status ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `content-type: ${ct}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1024, `PDF too small: ${buf.byteLength} bytes`);
  });

  // D) Certificates ---------------------------------------------------------
  await smoke("POST /api/admin/certificates -> create cert", async () => {
    const res = await api("POST", "/api/admin/certificates", {
      jobId,
      type: "EICR",
    });
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const json = await res.json();
    certificateId = json.id ?? json.certificateId;
    assert(certificateId, "no certificateId in response");
  });

  await smoke("PATCH /api/admin/certificates/{id} -> add signatures", async () => {
    const now = new Date().toISOString();
    const res = await api("PATCH", `/api/admin/certificates/${certificateId}`, {
      data: {
        signatures: {
          engineer: { name: "Smoke Engineer", signedAt: now },
          customer: { name: "Smoke Customer", signedAt: now },
        },
      },
    });
    assert(res.status === 200, `status ${res.status}`);
  });

  await smoke("POST /api/admin/certificates/{id}/complete -> 200", async () => {
    const res = await api("POST", `/api/admin/certificates/${certificateId}/complete`);
    assert(res.status === 200, `status ${res.status}`);
  });

  await smoke("POST /api/admin/certificates/{id}/issue -> revision 1", async () => {
    const res = await api("POST", `/api/admin/certificates/${certificateId}/issue`);
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const json = await res.json();
    const revision = json.revision ?? json.revisionNumber ?? 1;
    assert(revision === 1 || revision === "1", `revision: ${revision}`);
  });

  await smoke("GET /api/admin/certificates/{id}/revisions/1/pdf -> PDF", async () => {
    const res = await api(
      "GET",
      `/api/admin/certificates/${certificateId}/revisions/1/pdf`,
    );
    assert(res.status === 200, `status ${res.status}`);
    const ct = res.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `content-type: ${ct}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1024, `PDF too small: ${buf.byteLength} bytes`);
  });

  // Summary -----------------------------------------------------------------
  console.log(`\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
