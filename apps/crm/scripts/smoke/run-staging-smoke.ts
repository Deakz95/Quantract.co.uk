export {};

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
    console.error(`         ${err?.message ?? err}`);
  }
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

/** Read response body as text, truncated for diagnostics. */
async function bodySnippet(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.length > 2000 ? text.slice(0, 2000) + "..." : text;
  } catch {
    return "(unable to read body)";
  }
}

/**
 * Assert status code with diagnostics — on mismatch, prints endpoint,
 * actual status, and first 500 chars of response body.
 */
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
      `${method} ${path} -> expected ${codes.join("|")}, got ${res.status}\n         body: ${body}`,
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

/** Make a request with no auth cookies. */
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
let jobId: string;
let quoteId: string;
let quoteToken: string;
let invoiceId: string;
let invoiceToken: string;
let agreementToken: string;
let certificateId: string;

const ts = Date.now();

/** Tag embedded in all QA-created records for reliable cleanup. */
const QA_TAG = "AUTOMATED_QA";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nSmoke tests against ${BASE_URL}\n`);

  // A) Health ---------------------------------------------------------------
  await smoke("GET /api/health -> 200", async () => {
    const res = await api("GET", "/api/health");
    await assertStatus(res, 200, "GET", "/api/health");
  });

  // A2) Unauthenticated access -> 401 --------------------------------------
  await smoke("GET /api/admin/clients (no auth) -> 401", async () => {
    const res = await apiNoAuth("GET", "/api/admin/clients");
    await assertStatus(res, [401, 403, 307], "GET", "/api/admin/clients");
  });

  await smoke("POST /api/admin/jobs (no auth) -> 401", async () => {
    const res = await apiNoAuth("POST", "/api/admin/jobs", { title: "x" });
    await assertStatus(res, [401, 403, 307], "POST", "/api/admin/jobs");
  });

  await smoke("GET /api/admin/certificates (no auth) -> 401", async () => {
    const res = await apiNoAuth("GET", "/api/admin/certificates");
    await assertStatus(res, [401, 403, 307], "GET", "/api/admin/certificates");
  });

  // B) Auth -----------------------------------------------------------------
  await smoke("POST /api/auth/password/login -> 200", async () => {
    const res = await api("POST", "/api/auth/password/login", {
      role: "admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    await assertStatus(res, 200, "POST", "/api/auth/password/login");
    assert(Object.keys(cookies).length > 0, "no cookies set");
  });

  // C) CRM Core -------------------------------------------------------------
  clientEmail = `smoke-${ts}@test.quantract.co.uk`;
  clientName = `ZZZ Smoke Test Client [${QA_TAG}]`;

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

  await smoke("POST /api/admin/jobs -> create job", async () => {
    const res = await api("POST", "/api/admin/jobs", {
      manual: true,
      clientId,
      title: `Smoke Test Job [${QA_TAG}]`,
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/jobs");
    const json = await res.json();
    jobId = json.job?.id ?? json.id ?? json.jobId;
    assert(jobId, "no jobId in response");
  });

  await smoke("POST /api/admin/quotes -> create quote", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName,
      clientEmail,
      notes: `[${QA_TAG}]`,
      items: [{ description: "Smoke test item", qty: 1, unitPrice: 100 }],
    });
    await assertStatus(res, [200, 201], "POST", "/api/admin/quotes");
    const json = await res.json();
    quoteId = json.quote?.id ?? json.id ?? json.quoteId;
    quoteToken = json.quote?.token ?? json.token ?? "";
    assert(quoteId, "no quoteId in response");
  });

  await smoke("POST /api/admin/quotes/{id}/invoice -> create invoice", async () => {
    const path = `/api/admin/quotes/${quoteId}/invoice`;
    const res = await api("POST", path);
    await assertStatus(res, [200, 201], "POST", path);
    const json = await res.json();
    invoiceId = json.invoice?.id ?? json.id ?? json.invoiceId;
    invoiceToken = json.invoice?.token ?? json.token ?? "";
    assert(invoiceId, "no invoiceId in response");
  });

  await smoke("GET /api/admin/invoices/{id}/pdf -> PDF", async () => {
    const path = `/api/admin/invoices/${invoiceId}/pdf`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
    const ct = res.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `content-type: ${ct}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1024, `PDF too small: ${buf.byteLength} bytes`);
  });

  // D) Certificates ---------------------------------------------------------
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

  await smoke("PATCH /api/admin/certificates/{id} -> set data + signatures", async () => {
    const now = new Date().toISOString();
    const path = `/api/admin/certificates/${certificateId}`;
    const res = await api("PATCH", path, {
      data: {
        version: 1,
        type: "MWC",
        overview: {
          siteName: `Smoke Test Site [${QA_TAG}]`,
          installationAddress: "1 Test Street",
          clientName: clientName,
          clientEmail: clientEmail,
          jobDescription: "Smoke test minor works",
        },
        installation: {
          descriptionOfWork: "Smoke test work",
          supplyType: "Single phase",
          earthingArrangement: "TN-S",
        },
        inspection: {},
        declarations: {},
        assessment: {},
        signatures: {
          engineer: { name: "Smoke Engineer", signatureText: "SE", signedAtISO: now },
          customer: { name: "Smoke Customer", signatureText: "SC", signedAtISO: now },
        },
      },
    });
    await assertStatus(res, 200, "PATCH", path);
  });

  await smoke("POST /api/admin/certificates/{id}/complete -> 200", async () => {
    const path = `/api/admin/certificates/${certificateId}/complete`;
    const res = await api("POST", path);
    await assertStatus(res, 200, "POST", path);
  });

  await smoke("POST /api/admin/certificates/{id}/issue -> revision 1", async () => {
    const path = `/api/admin/certificates/${certificateId}/issue`;
    const res = await api("POST", path);
    await assertStatus(res, [200, 201], "POST", path);
    const json = await res.json();
    const revision = json.revision ?? json.revisionNumber ?? 1;
    assert(revision === 1 || revision === "1", `revision: ${revision}`);
  });

  await smoke("GET /api/admin/certificates/{id}/revisions/1/pdf -> PDF", async () => {
    const path = `/api/admin/certificates/${certificateId}/revisions/1/pdf`;
    const res = await api("GET", path);
    await assertStatus(res, 200, "GET", path);
    const ct = res.headers.get("content-type") ?? "";
    assert(ct.includes("application/pdf"), `content-type: ${ct}`);
    const buf = await res.arrayBuffer();
    assert(buf.byteLength > 1024, `PDF too small: ${buf.byteLength} bytes`);
  });

  // E) Client Portal ---------------------------------------------------------

  // Quote view via token
  if (quoteToken) {
    await smoke("GET /api/client/quotes/{token} -> quote view", async () => {
      const path = `/api/client/quotes/${quoteToken}`;
      const res = await apiNoAuth("GET", path);
      await assertStatus(res, 200, "GET", path);
      const json = await res.json();
      assert(json.ok, "response not ok");
      assert(json.quote, "no quote in response");
    });

    await smoke("POST /api/client/quotes/{token}/accept -> idempotent accept", async () => {
      const path = `/api/client/quotes/${quoteToken}/accept`;
      const res = await apiNoAuth("POST", path);
      await assertStatus(res, 200, "POST", path);
      const json = await res.json();
      assert(json.ok, "response not ok");
      assert(json.quote?.status === "accepted", `status: ${json.quote?.status}`);

      // Second call should also succeed (idempotent)
      const res2 = await apiNoAuth("POST", path);
      await assertStatus(res2, 200, "POST", `${path} (2nd call)`);
      const json2 = await res2.json();
      assert(json2.ok, "2nd accept not ok");

      // Capture agreement token if available
      if (json.quote?.agreement?.shareUrl) {
        const m = String(json.quote.agreement.shareUrl).match(/\/client\/agreements\/(.+)$/);
        if (m) agreementToken = m[1];
      }
    });

    await smoke("GET /api/client/quotes/{token}/pdf -> PDF", async () => {
      const path = `/api/client/quotes/${quoteToken}/pdf`;
      const res = await apiNoAuth("GET", path);
      await assertStatus(res, 200, "GET", path);
      const ct = res.headers.get("content-type") ?? "";
      assert(ct.includes("application/pdf"), `content-type: ${ct}`);
    });
  }

  // Agreement token page
  if (agreementToken) {
    await smoke("GET /api/client/agreements/{token} -> loads", async () => {
      const path = `/api/client/agreements/${agreementToken}`;
      const res = await apiNoAuth("GET", path);
      await assertStatus(res, 200, "GET", path);
      const json = await res.json();
      assert(json.ok, "response not ok");
    });

    await smoke("POST /api/client/agreements/{token}/sign -> idempotent sign", async () => {
      const path = `/api/client/agreements/${agreementToken}/sign`;
      const res = await apiNoAuth("POST", path, {
        signerName: `Smoke Signer [${QA_TAG}]`,
        signerEmail: clientEmail,
        acceptedTerms: true,
      });
      await assertStatus(res, 200, "POST", path);
      const json = await res.json();
      assert(json.ok, "response not ok");
      assert(json.agreement?.status === "signed", `status: ${json.agreement?.status}`);

      // Second call should also succeed (idempotent)
      const res2 = await apiNoAuth("POST", path, {
        signerName: `Smoke Signer [${QA_TAG}]`,
        signerEmail: clientEmail,
        acceptedTerms: true,
      });
      await assertStatus(res2, 200, "POST", `${path} (2nd call)`);
    });
  }

  // Invoice token access
  if (invoiceToken) {
    await smoke("GET /api/client/invoices/{token} -> invoice view", async () => {
      const path = `/api/client/invoices/${invoiceToken}`;
      const res = await apiNoAuth("GET", path);
      await assertStatus(res, 200, "GET", path);
      const json = await res.json();
      assert(json.ok, "response not ok");
      assert(json.invoice, "no invoice in response");
    });

    await smoke("GET /api/client/invoices/{token}/pdf -> PDF", async () => {
      const path = `/api/client/invoices/${invoiceToken}/pdf`;
      const res = await apiNoAuth("GET", path);
      await assertStatus(res, 200, "GET", path);
      const ct = res.headers.get("content-type") ?? "";
      assert(ct.includes("application/pdf"), `content-type: ${ct}`);
    });
  }

  // Summary -----------------------------------------------------------------
  const elapsed = ((Date.now() - suiteStart) / 1000).toFixed(1);
  console.log(
    `\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed} | ${elapsed}s`,
  );
  console.log(`\n  To cleanup: npm run qa:purge-test-data\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
