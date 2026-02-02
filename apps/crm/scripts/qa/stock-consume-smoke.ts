export {};

/**
 * Stock Consume Loop — Smoke Test
 *
 * Covers the full AI Estimator → Quote → Job → Stock consume pipeline:
 *   A) Quote item stock mapping persistence
 *   B) JobBudgetLine mapping propagation
 *   C) Consume stock endpoint behaviour (happy + idempotent)
 *   D) Insufficient stock behaviour
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 ADMIN_EMAIL=x ADMIN_PASSWORD=y npx tsx scripts/qa/stock-consume-smoke.ts
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

async function assertStatus(
  res: Response,
  expected: number | number[],
  label: string,
): Promise<void> {
  const codes = Array.isArray(expected) ? expected : [expected];
  if (!codes.includes(res.status)) {
    let body = "";
    try { body = (await res.text()).slice(0, 300); } catch {}
    throw new Error(
      `${label}: expected ${codes.join("|")}, got ${res.status}\n           body: ${body}`,
    );
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const ts = Date.now();
const QA_TAG = "AUTOMATED_QA";

let stockItemId: string;
let stockItemName: string;
let quoteId: string;
let clientId: string;
let jobId: string;
let engineerId: string; // userId of the logged-in admin (acts as engineer)
let truckStockRecordId: string; // TruckStock.id for alert tests

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\nStock Consume Loop QA \u2014 ${BASE_URL}\n`);

  // =========================================================================
  // 0. Login
  // =========================================================================
  console.log("  === Auth ===");
  {
    const t0 = Date.now();
    const res = await api("POST", "/api/auth/password/login", {
      role: "admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (res.status !== 200) {
      const body = (await res.text()).slice(0, 300);
      console.error(`  FAIL \u2717  Login -> 200  (${Date.now() - t0}ms)`);
      console.error(`           got ${res.status}: ${body}`);
      console.error("\n  Login failed — aborting suite.\n");
      process.exit(1);
    }
    passed++;
    console.log(`  PASS \u2713  Login -> 200  (${Date.now() - t0}ms)`);
  }

  // Resolve current user id (needed as engineerId for consume-stock)
  await smoke("Resolve current userId via /api/auth/me", async () => {
    const res = await api("GET", "/api/auth/me");
    await assertStatus(res, 200, "GET /api/auth/me");
    const json = await res.json();
    engineerId = json.userId ?? json.user?.id ?? json.id;
    assert(engineerId, "no userId in /api/auth/me response");
  });

  // =========================================================================
  // A. Quote item stock mapping persistence
  // =========================================================================
  console.log("\n  === A. Quote Item Stock Mapping ===");

  stockItemName = `QA Stock Item ${ts} [${QA_TAG}]`;

  await smoke("Create StockItem via POST /api/admin/truck-stock/stock-items", async () => {
    const res = await api("POST", "/api/admin/truck-stock/stock-items", {
      name: stockItemName,
      unit: "pcs",
      sku: `QA-SKU-${ts}`,
    });
    await assertStatus(res, [200, 201], "Create StockItem");
    const json = await res.json();
    stockItemId = json.data?.id ?? json.stockItem?.id ?? json.id;
    assert(stockItemId, "no stockItemId in response");
  });

  // Create a client for the quote
  await smoke("Create client for quote", async () => {
    const res = await api("POST", "/api/admin/clients", {
      name: `QA Stock Client ${ts} [${QA_TAG}]`,
      email: `qa-stock-${ts}@test.quantract.co.uk`,
    });
    await assertStatus(res, [200, 201], "Create client");
    const json = await res.json();
    clientId = json.client?.id ?? json.id ?? json.clientId;
    assert(clientId, "no clientId in response");
  });

  await smoke("Create Quote with stockItemId + stockQty", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName: `QA Stock Client ${ts} [${QA_TAG}]`,
      clientEmail: `qa-stock-${ts}@test.quantract.co.uk`,
      clientId,
      notes: `[${QA_TAG}]`,
      items: [
        {
          description: `QA smoke test item with stock [${QA_TAG}]`,
          qty: 2,
          unitPrice: 50,
          stockItemId,
          stockQty: 3,
        },
      ],
    });
    await assertStatus(res, [200, 201], "Create Quote");
    const json = await res.json();
    quoteId = json.quote?.id ?? json.id ?? json.quoteId;
    assert(quoteId, "no quoteId in response");

    // Verify items preserved stockItemId and stockQty
    const items = json.quote?.items ?? [];
    assert(items.length >= 1, "quote should have at least 1 item");
    const item = items[0];
    assert(item.stockItemId === stockItemId, `stockItemId mismatch: expected ${stockItemId}, got ${item.stockItemId}`);
    assert(item.stockQty === 3, `stockQty mismatch: expected 3, got ${item.stockQty}`);
  });

  await smoke("GET quote confirms stock mapping persisted", async () => {
    const res = await api("GET", `/api/admin/quotes/${quoteId}`);
    await assertStatus(res, 200, "GET Quote");
    const json = await res.json();
    const quote = json.quote ?? json;
    const items = quote.items ?? [];
    assert(items.length >= 1, "quote should have items");
    const item = items[0];
    assert(item.stockItemId === stockItemId, `stockItemId not persisted: ${item.stockItemId}`);
    assert(typeof item.stockQty === "number" && item.stockQty === 3, `stockQty not persisted: ${item.stockQty}`);
  });

  // =========================================================================
  // B. JobBudgetLine mapping propagation
  // =========================================================================
  console.log("\n  === B. JobBudgetLine Propagation ===");

  await smoke("Accept quote -> creates Job with budget lines", async () => {
    const res = await api("POST", `/api/admin/quotes/${quoteId}/accept`);
    await assertStatus(res, [200, 201], "Accept quote");
    const json = await res.json();
    assert(json.ok, `accept failed: ${JSON.stringify(json)}`);
  });

  // Find the job created from this quote
  await smoke("Locate job created from quote", async () => {
    // The accept flow creates a job linked to the quote. Find it.
    const res = await api("GET", `/api/admin/jobs`);
    await assertStatus(res, 200, "GET Jobs");
    const json = await res.json();
    const jobs = json.data ?? json.jobs ?? (Array.isArray(json) ? json : []);
    const job = jobs.find((j: any) => j.quoteId === quoteId);
    assert(job, `no job found for quoteId ${quoteId}`);
    jobId = job.id;
  });

  await smoke("JobBudgetLine contains stockItemId + stockQty", async () => {
    const res = await api("GET", `/api/admin/jobs/${jobId}/cost-items`);
    await assertStatus(res, 200, "GET cost-items");
    const json = await res.json();
    const lines = json.budgetLines ?? json.data ?? json.lines ?? [];
    assert(lines.length >= 1, `expected >=1 budget lines, got ${lines.length}`);
    const line = lines.find((l: any) => l.stockItemId === stockItemId);
    assert(line, `no budget line with stockItemId=${stockItemId}`);
    assert(line.stockQty === 3, `stockQty mismatch on budget line: expected 3, got ${line.stockQty}`);
  });

  // =========================================================================
  // C. Consume stock — happy path + idempotency
  // =========================================================================
  console.log("\n  === C. Consume Stock (Happy Path) ===");

  await smoke("Setup TruckStock with sufficient qty for engineer", async () => {
    // Set qty=10 for this engineer+stockItem (enough for stockQty=3)
    const res = await api("POST", "/api/admin/truck-stock", {
      stockItemId,
      userId: engineerId,
      qty: 10,
      minQty: 2,
    });
    await assertStatus(res, [200, 201], "Set TruckStock");
    const json = await res.json();
    assert(json.ok, "set truck stock failed");
    assert(json.data?.qty === 10, `expected qty=10, got ${json.data?.qty}`);
    truckStockRecordId = json.data?.id;
    assert(truckStockRecordId, "no truckStock id in response");
  });

  await smoke("POST consume-stock deducts qty and creates log", async () => {
    const res = await api("POST", `/api/admin/jobs/${jobId}/consume-stock`, {
      engineerId,
    });
    await assertStatus(res, 200, "Consume stock");
    const json = await res.json();
    assert(json.ok, `consume failed: ${JSON.stringify(json)}`);
    assert(json.stockConsumedAt === true, "stockConsumedAt should be true");
    assert(json.consumed?.length >= 1, "should have consumed items");
    assert(json.insufficient?.length === 0, "should have no insufficient items");

    const consumed = json.consumed.find((c: any) => c.stockItemId === stockItemId);
    assert(consumed, "our stockItem not in consumed list");
    assert(consumed.stockQty === 3, `consumed stockQty mismatch: ${consumed.stockQty}`);
  });

  await smoke("TruckStock qty decreased from 10 to 7", async () => {
    const res = await api("GET", `/api/admin/truck-stock?userId=${engineerId}`);
    await assertStatus(res, 200, "GET TruckStock");
    const json = await res.json();
    const items = json.data ?? [];
    const record = items.find((i: any) => i.stockItemId === stockItemId);
    assert(record, "TruckStock record not found for our stockItem");
    assert(record.qty === 7, `expected qty=7 after consuming 3, got ${record.qty}`);
  });

  await smoke("TruckStockLog has reason=job_consume entry", async () => {
    const res = await api("GET", `/api/admin/truck-stock/log?stockItemId=${stockItemId}&userId=${engineerId}`);
    await assertStatus(res, 200, "GET TruckStockLog");
    const json = await res.json();
    const logs = json.data ?? json.logs ?? [];
    const entry = logs.find((l: any) => l.reason === "job_consume" && l.jobId === jobId);
    assert(entry, "no job_consume log entry found");
    assert(entry.qtyDelta === -3, `expected qtyDelta=-3, got ${entry.qtyDelta}`);
  });

  await smoke("Idempotency: second consume returns alreadyConsumed", async () => {
    const res = await api("POST", `/api/admin/jobs/${jobId}/consume-stock`, {
      engineerId,
    });
    await assertStatus(res, 200, "Second consume");
    const json = await res.json();
    assert(json.ok, "second consume should be ok");
    assert(json.alreadyConsumed === true, "should return alreadyConsumed=true");
  });

  await smoke("Idempotency: qty unchanged after second consume", async () => {
    const res = await api("GET", `/api/admin/truck-stock?userId=${engineerId}`);
    await assertStatus(res, 200, "GET TruckStock after idempotent call");
    const json = await res.json();
    const record = (json.data ?? []).find((i: any) => i.stockItemId === stockItemId);
    assert(record, "TruckStock record not found");
    assert(record.qty === 7, `qty should still be 7, got ${record.qty}`);
  });

  // =========================================================================
  // D. Insufficient stock behaviour
  // =========================================================================
  console.log("\n  === D. Insufficient Stock ===");

  // Create a SECOND quote+job with stockQty > available to test insufficient path
  let quoteId2: string;
  let jobId2: string;

  await smoke("Create second quote with stockQty > available", async () => {
    const res = await api("POST", "/api/admin/quotes", {
      clientName: `QA Stock Client ${ts} [${QA_TAG}]`,
      clientEmail: `qa-stock-${ts}@test.quantract.co.uk`,
      clientId,
      notes: `[${QA_TAG}]`,
      items: [
        {
          description: `QA item needing 99 units [${QA_TAG}]`,
          qty: 1,
          unitPrice: 25,
          stockItemId,
          stockQty: 99, // Way more than the 7 we have
        },
      ],
    });
    await assertStatus(res, [200, 201], "Create second quote");
    const json = await res.json();
    quoteId2 = json.quote?.id ?? json.id ?? json.quoteId;
    assert(quoteId2, "no quoteId2");
  });

  await smoke("Accept second quote -> creates second job", async () => {
    const res = await api("POST", `/api/admin/quotes/${quoteId2!}/accept`);
    await assertStatus(res, [200, 201], "Accept second quote");
    const json = await res.json();
    assert(json.ok, "accept failed");
  });

  await smoke("Locate second job", async () => {
    const res = await api("GET", "/api/admin/jobs");
    await assertStatus(res, 200, "GET Jobs");
    const json = await res.json();
    const jobs = json.data ?? json.jobs ?? (Array.isArray(json) ? json : []);
    const job = jobs.find((j: any) => j.quoteId === quoteId2!);
    assert(job, `no job found for quoteId2 ${quoteId2!}`);
    jobId2 = job.id;
  });

  await smoke("Consume returns insufficient list when stock too low", async () => {
    const res = await api("POST", `/api/admin/jobs/${jobId2!}/consume-stock`, {
      engineerId,
    });
    await assertStatus(res, 200, "Consume with insufficient stock");
    const json = await res.json();
    assert(json.ok, "response should still be ok");
    assert(json.stockConsumedAt === false, "stockConsumedAt should be false");
    assert(json.insufficient?.length >= 1, "should have insufficient items");

    const item = json.insufficient.find((i: any) => i.stockItemId === stockItemId);
    assert(item, "our stockItem not in insufficient list");
    assert(item.stockQty === 99, `insufficient stockQty mismatch: ${item.stockQty}`);
    assert(item.available === 7, `insufficient available mismatch: expected 7, got ${item.available}`);
  });

  await smoke("Job.stockConsumedAt remains null (retryable)", async () => {
    // Verify by trying to consume again — should NOT return alreadyConsumed
    const res = await api("POST", `/api/admin/jobs/${jobId2!}/consume-stock`, {
      engineerId,
    });
    await assertStatus(res, 200, "Retry consume");
    const json = await res.json();
    assert(json.ok, "response should be ok");
    // It should still show insufficient, NOT alreadyConsumed
    assert(!json.alreadyConsumed, "should NOT be alreadyConsumed — stockConsumedAt should be null");
    assert(json.insufficient?.length >= 1, "still insufficient");
  });

  // =========================================================================
  // E. Stock Alerts — threshold → alert, remove → resolve
  // =========================================================================
  console.log("\n  === E. Stock Alerts Lifecycle ===");

  // The TruckStock record currently has qty=7, minQty=2 (from section C).
  // qty > minQty, so no alert should be open.
  await smoke("No open alert when qty (7) > minQty (2)", async () => {
    const res = await api("GET", "/api/admin/stock-alerts?type=truck_stock_low&status=open");
    await assertStatus(res, 200, "GET stock-alerts");
    const json = await res.json();
    const alerts = json.data ?? [];
    const match = alerts.find((a: any) => a.entityId === truckStockRecordId);
    assert(!match, "should NOT have an open alert when qty > minQty");
  });

  // Drop qty to <= minQty to trigger alert creation
  await smoke("Set minQty=8 -> triggers low stock alert (qty=7 <= 8)", async () => {
    const res = await api("PATCH", `/api/admin/truck-stock/${truckStockRecordId}`, {
      minQty: 8,
    });
    await assertStatus(res, 200, "PATCH TruckStock minQty=8");
    const json = await res.json();
    assert(json.ok, "patch failed");
  });

  let alertId: string;
  await smoke("Open alert appears in /api/admin/stock-alerts", async () => {
    const res = await api("GET", "/api/admin/stock-alerts?type=truck_stock_low&status=open");
    await assertStatus(res, 200, "GET stock-alerts");
    const json = await res.json();
    const alerts = json.data ?? [];
    const match = alerts.find((a: any) => a.entityId === truckStockRecordId);
    assert(match, "expected an open alert for this TruckStock record");
    assert(match.status === "open", `expected status=open, got ${match.status}`);
    alertId = match.id;
  });

  await smoke("Dashboard widget lowStockCount incremented", async () => {
    const res = await api("GET", "/api/admin/dashboard/widgets");
    await assertStatus(res, 200, "GET dashboard widgets");
    const json = await res.json();
    // lowStockCount should be >= 1 (our alert + possibly others)
    assert(json.ok, "widgets response not ok");
    assert(
      typeof json.lowStockCount === "number" && json.lowStockCount >= 1,
      `expected lowStockCount >= 1, got ${json.lowStockCount}`,
    );
  });

  // Remove threshold → alert resolves
  await smoke("Set minQty=0 -> resolves alert", async () => {
    const res = await api("PATCH", `/api/admin/truck-stock/${truckStockRecordId}`, {
      minQty: 0,
    });
    await assertStatus(res, 200, "PATCH TruckStock minQty=0");
  });

  await smoke("Alert resolved after minQty cleared", async () => {
    // Check the specific alert is now resolved
    const res = await api("GET", "/api/admin/stock-alerts?type=truck_stock_low&status=open");
    await assertStatus(res, 200, "GET stock-alerts");
    const json = await res.json();
    const alerts = json.data ?? [];
    const match = alerts.find((a: any) => a.entityId === truckStockRecordId);
    assert(!match, "alert should no longer be open after minQty cleared to 0");
  });

  await smoke("Resolved alert visible in resolved filter", async () => {
    const res = await api("GET", "/api/admin/stock-alerts?type=truck_stock_low&status=resolved");
    await assertStatus(res, 200, "GET stock-alerts resolved");
    const json = await res.json();
    const alerts = json.data ?? [];
    const match = alerts.find((a: any) => a.id === alertId);
    assert(match, "resolved alert should still exist in resolved view");
    assert(match.status === "resolved", `expected resolved, got ${match.status}`);
  });

  // =========================================================================
  // F. Ownership enforcement on stock alerts
  // =========================================================================
  console.log("\n  === F. Alert Ownership Enforcement ===");

  await smoke("PATCH alert with non-existent id returns 404", async () => {
    const res = await api("PATCH", "/api/admin/stock-alerts/nonexistent-id-12345", {
      status: "resolved",
    });
    await assertStatus(res, 404, "PATCH non-existent alert");
  });

  await smoke("PATCH with invalid status returns 400", async () => {
    // Re-use the resolved alertId — try setting an invalid status
    const res = await api("PATCH", `/api/admin/stock-alerts/${alertId}`, {
      status: "invalid_status",
    });
    await assertStatus(res, 400, "PATCH invalid status");
  });

  // =========================================================================
  // Cleanup
  // =========================================================================
  console.log("\n  === Cleanup ===");

  await smoke("Cleanup test data", async () => {
    // Best-effort cleanup — delete in reverse dependency order
    // Jobs, quotes, stock items are tagged with QA_TAG in their names/notes

    // Delete jobs via API isn't always available, but the purge script handles it
    // We do what we can via API:
    for (const jId of [jobId2!, jobId].filter(Boolean)) {
      await api("DELETE", `/api/admin/jobs/${jId}`).catch(() => null);
    }
    for (const qId of [quoteId2!, quoteId].filter(Boolean)) {
      await api("DELETE", `/api/admin/quotes/${qId}`).catch(() => null);
    }
    if (clientId) {
      await api("DELETE", `/api/admin/clients/${clientId}`).catch(() => null);
    }
    // Stock item cleanup — soft delete is fine
    if (stockItemId) {
      await api("DELETE", `/api/admin/truck-stock/stock-items/${stockItemId}`).catch(() => null);
    }
  });

  // =========================================================================
  // Summary
  // =========================================================================
  const total = passed + failed;
  const elapsed = ((Date.now() - suiteStart) / 1000).toFixed(1);
  console.log(
    `\n  Total: ${total} | Passed: ${passed} | Failed: ${failed} | ${elapsed}s`,
  );
  if (failed > 0) {
    console.log("  To cleanup leftover data: npm run qa:purge-test-data\n");
  }
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
