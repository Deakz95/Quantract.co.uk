export {};

/**
 * Legal Entity Numbering Verification
 *
 * Creates two legal entities with different prefixes/starting numbers,
 * creates quotes under each, and verifies independent numbering.
 *
 * Usage:
 *   BASE_URL=https://crm.quantract.co.uk ADMIN_EMAIL=x ADMIN_PASSWORD=y npx tsx scripts/smoke/verify-entity-numbering.ts
 */

const BASE_URL = process.env.BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  process.exit(1);
}

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

let passed = 0;
let failed = 0;

async function test(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  PASS ✓  ${label}`);
  } catch (err: any) {
    failed++;
    console.error(`  FAIL ✗  ${label}`);
    console.error(`         ${err?.message ?? err}`);
  }
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

async function api(method: string, path: string, body?: unknown): Promise<Response> {
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
// State
// ---------------------------------------------------------------------------
let entityA_id: string;
let entityB_id: string;
let quoteA_number: string;
let quoteB_number: string;

const ts = Date.now();

// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nLegal Entity Numbering Verification against ${BASE_URL}\n`);

  // 1) Login
  await test("Login", async () => {
    const res = await api("POST", "/api/auth/password/login", {
      role: "admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert(res.status === 200, `login status ${res.status}`);
  });

  // 2) Create Entity A — prefix "SI-", starting at 500
  await test("Create Entity A (SI-, start 500)", async () => {
    const res = await api("POST", "/api/admin/legal-entities", {
      displayName: `Smoke Entity A ${ts}`,
      legalName: `Smoke A Ltd ${ts}`,
      invoiceNumberPrefix: "SI-",
      nextInvoiceNumber: 500,
      quoteNumberPrefix: "SQ-",
      nextQuoteNumber: 500,
      certificateNumberPrefix: "SC-",
      nextCertificateNumber: 500,
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `status ${res.status}: ${JSON.stringify(json)}`);
    entityA_id = json.entity?.id ?? json.id;
    assert(entityA_id, "no entity A id");
    console.log(`           Entity A: ${entityA_id}`);
  });

  // 3) Create Entity B — prefix "BILL-", starting at 1000
  await test("Create Entity B (BILL-, start 1000)", async () => {
    const res = await api("POST", "/api/admin/legal-entities", {
      displayName: `Smoke Entity B ${ts}`,
      legalName: `Smoke B Ltd ${ts}`,
      invoiceNumberPrefix: "BILL-",
      nextInvoiceNumber: 1000,
      quoteNumberPrefix: "EST-",
      nextQuoteNumber: 1000,
      certificateNumberPrefix: "DOC-",
      nextCertificateNumber: 1000,
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `status ${res.status}: ${JSON.stringify(json)}`);
    entityB_id = json.entity?.id ?? json.id;
    assert(entityB_id, "no entity B id");
    console.log(`           Entity B: ${entityB_id}`);
  });

  // 4) Set Entity A as default (so quote creation uses it)
  await test("Set Entity A as default", async () => {
    const res = await api("PATCH", `/api/admin/legal-entities/${entityA_id}`, {
      isDefault: true,
    });
    const json = await res.json();
    assert(res.status === 200, `status ${res.status}: ${JSON.stringify(json)}`);
  });

  // 5) Create quote → should get SQ-000500
  await test("Create quote under Entity A → SQ-000500", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName: "Entity A Client",
      clientEmail: `entity-a-${ts}@test.quantract.co.uk`,
      items: [{ description: "Test A", qty: 1, unitPrice: 100 }],
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `status ${res.status}: ${JSON.stringify(json)}`);
    quoteA_number = json.quote?.quoteNumber;
    assert(quoteA_number, `no quoteNumber in response: ${JSON.stringify(json)}`);
    assert(quoteA_number === "SQ-000500", `expected SQ-000500, got ${quoteA_number}`);
    console.log(`           Quote A: ${quoteA_number}`);
  });

  // 6) Set Entity B as default
  await test("Set Entity B as default", async () => {
    const res = await api("PATCH", `/api/admin/legal-entities/${entityB_id}`, {
      isDefault: true,
    });
    const json = await res.json();
    assert(res.status === 200, `status ${res.status}: ${JSON.stringify(json)}`);
  });

  // 7) Create quote → should get EST-001000
  await test("Create quote under Entity B → EST-001000", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName: "Entity B Client",
      clientEmail: `entity-b-${ts}@test.quantract.co.uk`,
      items: [{ description: "Test B", qty: 1, unitPrice: 200 }],
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `status ${res.status}: ${JSON.stringify(json)}`);
    quoteB_number = json.quote?.quoteNumber;
    assert(quoteB_number, `no quoteNumber: ${JSON.stringify(json)}`);
    assert(quoteB_number === "EST-001000", `expected EST-001000, got ${quoteB_number}`);
    console.log(`           Quote B: ${quoteB_number}`);
  });

  // 8) Verify prefixes differ
  await test("Prefixes differ between A and B", async () => {
    assert(quoteA_number.startsWith("SQ-"), `A prefix wrong: ${quoteA_number}`);
    assert(quoteB_number.startsWith("EST-"), `B prefix wrong: ${quoteB_number}`);
    assert(quoteA_number !== quoteB_number, "numbers should not match");
  });

  // 9) Create a second quote under B → should be EST-001001
  await test("Second quote under Entity B → EST-001001 (incremented)", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName: "Entity B Client 2",
      clientEmail: `entity-b2-${ts}@test.quantract.co.uk`,
      items: [{ description: "Test B2", qty: 1, unitPrice: 300 }],
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const num = json.quote?.quoteNumber;
    assert(num === "EST-001001", `expected EST-001001, got ${num}`);
    console.log(`           Quote B2: ${num}`);
  });

  // 10) Try to set Entity B nextQuoteNumber to 999 (lower than existing 1001) → should reject
  await test("Reject nextQuoteNumber lower than highest existing", async () => {
    const res = await api("PATCH", `/api/admin/legal-entities/${entityB_id}`, {
      nextQuoteNumber: 999,
    });
    assert(res.status === 400, `expected 400, got ${res.status}`);
    const json = await res.json();
    assert(json.error && json.error.includes("greater than"), `expected collision error, got: ${json.error}`);
    console.log(`           Correctly rejected: "${json.error}"`);
  });

  // 11) Try setting it to 2000 (higher) → should succeed
  await test("Accept nextQuoteNumber higher than highest existing", async () => {
    const res = await api("PATCH", `/api/admin/legal-entities/${entityB_id}`, {
      nextQuoteNumber: 2000,
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const json = await res.json();
    assert(json.entity?.nextQuoteNumber === 2000, `expected 2000, got ${json.entity?.nextQuoteNumber}`);
  });

  // 12) Create one more quote under B → should be EST-002000
  await test("Quote after counter jump → EST-002000", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName: "Entity B Jump",
      clientEmail: `entity-b-jump-${ts}@test.quantract.co.uk`,
      items: [{ description: "Jump test", qty: 1, unitPrice: 50 }],
    });
    const json = await res.json();
    assert(res.status === 200 || res.status === 201, `status ${res.status}`);
    const num = json.quote?.quoteNumber;
    assert(num === "EST-002000", `expected EST-002000, got ${num}`);
    console.log(`           Quote after jump: ${num}`);
  });

  // 13) Cleanup — delete test entities (best-effort)
  for (const id of [entityA_id, entityB_id]) {
    if (!id) continue;
    // Unset default first
    await api("PATCH", `/api/admin/legal-entities/${id}`, { isDefault: false }).catch(() => {});
    await api("DELETE", `/api/admin/legal-entities/${id}`).catch(() => {});
  }

  // Summary
  console.log(
    `\n  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}\n`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
