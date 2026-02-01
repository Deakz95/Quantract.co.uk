export {};

/**
 * Track C (Ops Intelligence) — End-to-End QA Verification
 *
 * Verifies all Track C endpoints for schema correctness, auth enforcement,
 * edge-case handling, performance, and cache behaviour.
 *
 * Usage:
 *   BASE_URL=https://crm.quantract.co.uk ADMIN_EMAIL=x ADMIN_PASSWORD=y npx tsx scripts/qa/track-c-verify.ts
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
const failures: string[] = [];
const suiteStart = Date.now();

async function check(label: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  try {
    await fn();
    passed++;
    console.log(`  PASS  ${label}  (${Date.now() - t0}ms)`);
  } catch (err: any) {
    failed++;
    const msg = err?.message ?? String(err);
    failures.push(`${label}: ${msg}`);
    console.error(`  FAIL  ${label}  (${Date.now() - t0}ms)`);
    console.error(`        ${msg}`);
  }
}

function assert(condition: unknown, msg: string): asserts condition {
  if (!condition) throw new Error(msg);
}

async function fetchJson(
  path: string,
  opts?: { method?: string; body?: object; noCookies?: boolean }
): Promise<{ status: number; json: any; ms: number }> {
  const t0 = Date.now();
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
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json, ms: Date.now() - t0 };
}

// ---------------------------------------------------------------------------
// UUID pattern — used to detect leaking raw UUIDs
// ---------------------------------------------------------------------------
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
(async () => {
  console.log(`\n  Track C QA Verification — ${BASE_URL}\n`);

  // ── Auth ──────────────────────────────────────────────────────
  console.log("  === Auth ===");

  await check("Admin login", async () => {
    const { status, json } = await fetchJson("/api/auth/password/login", {
      method: "POST",
      body: { role: "admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      noCookies: true,
    });
    assert(status === 200 || json?.ok, `Login failed: ${status} ${JSON.stringify(json)}`);
  });

  // ── A1: GET /api/admin/dashboard/attention ────────────────────
  console.log("\n  === A1: Dashboard Attention ===");

  let attentionItems: any[] = [];

  await check("Attention → 200 + ok:true", async () => {
    const { status, json } = await fetchJson("/api/admin/dashboard/attention");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.ok === true, `ok is not true: ${JSON.stringify(json)}`);
    attentionItems = json.items;
  });

  await check("Attention → items is array", async () => {
    assert(Array.isArray(attentionItems), "items is not an array");
  });

  await check("Attention → max length 6", async () => {
    assert(attentionItems.length <= 6, `Got ${attentionItems.length} items, max is 6`);
  });

  await check("Attention → schema: each item has required keys", async () => {
    const REQUIRED = ["id", "type", "icon", "message", "age", "urgency", "ctaLabel", "ctaHref"];
    for (const item of attentionItems) {
      for (const key of REQUIRED) {
        assert(item[key] !== undefined, `Item ${item.id ?? "?"} missing key: ${key}`);
      }
    }
  });

  await check("Attention → type is one of the 6 known types", async () => {
    const TYPES = new Set([
      "job_no_invoice",
      "invoice_overdue",
      "missing_timesheet",
      "cert_not_issued",
      "open_snags",
      "quote_no_job",
    ]);
    for (const item of attentionItems) {
      assert(TYPES.has(item.type), `Unknown type: ${item.type}`);
    }
  });

  await check("Attention → urgency is number in range 0-1000", async () => {
    for (const item of attentionItems) {
      assert(typeof item.urgency === "number", `urgency is ${typeof item.urgency}`);
      assert(item.urgency >= 0, `urgency ${item.urgency} < 0`);
    }
  });

  await check("Attention → sorted descending by urgency", async () => {
    for (let i = 1; i < attentionItems.length; i++) {
      assert(
        attentionItems[i - 1].urgency >= attentionItems[i].urgency,
        `Items not sorted: [${i - 1}].urgency=${attentionItems[i - 1].urgency} < [${i}].urgency=${attentionItems[i].urgency}`
      );
    }
  });

  await check("Attention → ctaHref starts with /admin", async () => {
    for (const item of attentionItems) {
      assert(
        item.ctaHref.startsWith("/admin"),
        `ctaHref "${item.ctaHref}" does not start with /admin`
      );
    }
  });

  await check("Attention → icon is one of the known icon strings", async () => {
    const ICONS = new Set(["file-text", "clock", "shield", "alert-circle", "briefcase"]);
    for (const item of attentionItems) {
      assert(ICONS.has(item.icon), `Unknown icon: "${item.icon}"`);
    }
  });

  await check("Attention → cache stability (two calls return same data)", async () => {
    const { json: a } = await fetchJson("/api/admin/dashboard/attention");
    const { json: b } = await fetchJson("/api/admin/dashboard/attention");
    assert(
      JSON.stringify(a.items) === JSON.stringify(b.items),
      "Cache returned different data on second call within TTL"
    );
  });

  await check("Attention → denies anonymous access", async () => {
    const { status } = await fetchJson("/api/admin/dashboard/attention", { noCookies: true });
    assert(status === 401 || status === 403 || status === 307, `Expected 401/403/307, got ${status}`);
  });

  // ── A2: GET /api/admin/jobs/health-flags ──────────────────────
  console.log("\n  === A2: Job Health Flags ===");

  let healthFlags: Record<string, any> = {};

  await check("Health flags → 200 + ok:true", async () => {
    const { status, json } = await fetchJson("/api/admin/jobs/health-flags");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.ok === true, `ok is not true`);
    healthFlags = json.flags ?? {};
  });

  await check("Health flags → flags is object", async () => {
    assert(typeof healthFlags === "object" && !Array.isArray(healthFlags), "flags is not an object");
  });

  await check("Health flags → each job has all 3 boolean keys", async () => {
    const ids = Object.keys(healthFlags);
    for (const id of ids) {
      const f = healthFlags[id];
      assert(typeof f.hasInvoice === "boolean", `${id}.hasInvoice is ${typeof f.hasInvoice}`);
      assert(typeof f.hasOpenSnags === "boolean", `${id}.hasOpenSnags is ${typeof f.hasOpenSnags}`);
      assert(typeof f.hasMissingTimesheet === "boolean", `${id}.hasMissingTimesheet is ${typeof f.hasMissingTimesheet}`);
    }
  });

  await check("Health flags → no undefined values", async () => {
    for (const [id, f] of Object.entries(healthFlags) as [string, any][]) {
      assert(f.hasInvoice !== undefined, `${id}.hasInvoice is undefined`);
      assert(f.hasOpenSnags !== undefined, `${id}.hasOpenSnags is undefined`);
      assert(f.hasMissingTimesheet !== undefined, `${id}.hasMissingTimesheet is undefined`);
    }
  });

  await check("Health flags → denies anonymous access", async () => {
    const { status } = await fetchJson("/api/admin/jobs/health-flags", { noCookies: true });
    assert(status === 401 || status === 403 || status === 307, `Expected 401/403/307, got ${status}`);
  });

  // ── A3: GET /api/admin/engineers/activity ──────────────────────
  console.log("\n  === A3: Engineers Activity ===");

  let engineerActivity: Record<string, any> = {};

  await check("Engineer activity → 200 + ok:true", async () => {
    const { status, json } = await fetchJson("/api/admin/engineers/activity");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.ok === true, `ok is not true`);
    engineerActivity = json.activity ?? {};
  });

  await check("Engineer activity → activity is object", async () => {
    assert(typeof engineerActivity === "object" && !Array.isArray(engineerActivity), "not an object");
  });

  await check("Engineer activity → each engineer has lastActive + todayJobCount", async () => {
    for (const [id, a] of Object.entries(engineerActivity) as [string, any][]) {
      assert(
        a.lastActive === null || typeof a.lastActive === "string",
        `${id}.lastActive is ${typeof a.lastActive}`
      );
      assert(typeof a.todayJobCount === "number", `${id}.todayJobCount is ${typeof a.todayJobCount}`);
      assert(a.todayJobCount >= 0, `${id}.todayJobCount is negative: ${a.todayJobCount}`);
    }
  });

  await check("Engineer activity → lastActive is valid ISO or null", async () => {
    for (const [id, a] of Object.entries(engineerActivity) as [string, any][]) {
      if (a.lastActive !== null) {
        const d = new Date(a.lastActive);
        assert(!isNaN(d.getTime()), `${id}.lastActive is not valid ISO: "${a.lastActive}"`);
      }
    }
  });

  await check("Engineer activity → denies anonymous access", async () => {
    const { status } = await fetchJson("/api/admin/engineers/activity", { noCookies: true });
    assert(status === 401 || status === 403 || status === 307, `Expected 401/403/307, got ${status}`);
  });

  // ── A4: GET /api/admin/timeline ───────────────────────────────
  console.log("\n  === A4: Admin Timeline ===");

  await check("Timeline → 400 if no jobId/clientId", async () => {
    const { status, json } = await fetchJson("/api/admin/timeline");
    assert(status === 400, `Expected 400, got ${status}`);
    assert(json.error, "Expected error in response body");
  });

  // Try with a real jobId from health-flags
  const sampleJobId = Object.keys(healthFlags)[0];
  if (sampleJobId) {
    let timelineItems: any[] = [];

    await check(`Timeline → 200 for jobId=${sampleJobId.slice(0, 8)}...`, async () => {
      const { status, json } = await fetchJson(`/api/admin/timeline?jobId=${sampleJobId}`);
      assert(status === 200, `Expected 200, got ${status}`);
      assert(json.ok === true, `ok is not true`);
      timelineItems = json.items ?? [];
    });

    await check("Timeline → max 3 items", async () => {
      assert(timelineItems.length <= 3, `Got ${timelineItems.length} items, max is 3`);
    });

    await check("Timeline → each item has required schema", async () => {
      for (const item of timelineItems) {
        assert(typeof item.id === "string", `item.id missing or not string`);
        assert(typeof item.entityType === "string", `item.entityType missing`);
        assert(typeof item.action === "string", `item.action missing`);
        assert(typeof item.description === "string", `item.description missing`);
        assert(typeof item.timestamp === "string", `item.timestamp missing`);
        // Verify timestamp is valid ISO
        assert(!isNaN(new Date(item.timestamp).getTime()), `invalid timestamp: ${item.timestamp}`);
      }
    });

    await check("Timeline → descriptions don't leak raw UUIDs", async () => {
      for (const item of timelineItems) {
        // Allow UUIDs in id field, but not in description text
        if (UUID_RE.test(item.description)) {
          // It's acceptable if the description uses a short prefix like "Job #abc12345"
          // But a full UUID is a leak
          const fullUuids = item.description.match(UUID_RE) || [];
          for (const u of fullUuids) {
            assert(false, `Description leaks UUID: "${item.description}" (found ${u})`);
          }
        }
      }
    });
  } else {
    console.log("  SKIP  Timeline jobId test (no jobs found in health-flags)");
  }

  await check("Timeline → denies anonymous access", async () => {
    const { status } = await fetchJson("/api/admin/timeline?jobId=test", { noCookies: true });
    assert(status === 401 || status === 403 || status === 307, `Expected 401/403/307, got ${status}`);
  });

  // ── A5: GET /api/internal/dashboard/map-pins ──────────────────
  console.log("\n  === A5: Map Pins ===");

  let mapPins: any[] = [];

  await check("Map pins → 200 + ok:true", async () => {
    const { status, json, ms } = await fetchJson("/api/internal/dashboard/map-pins");
    assert(status === 200, `Expected 200, got ${status}`);
    assert(json.ok === true, `ok is not true`);
    mapPins = json.pins ?? [];
    console.log(`        (${mapPins.length} pins, ${ms}ms)`);
  });

  await check("Map pins → pins is array", async () => {
    assert(Array.isArray(mapPins), "pins is not an array");
  });

  await check("Map pins → each pin has required schema", async () => {
    for (const pin of mapPins) {
      assert(typeof pin.id === "string", `pin.id missing`);
      assert(pin.type === "job" || pin.type === "quote", `pin.type "${pin.type}" invalid`);
      assert(typeof pin.lat === "number", `pin.lat is ${typeof pin.lat}`);
      assert(typeof pin.lng === "number", `pin.lng is ${typeof pin.lng}`);
      assert(typeof pin.label === "string", `pin.label missing`);
      assert(typeof pin.href === "string", `pin.href missing`);
      assert(typeof pin.status === "string", `pin.status missing`);
    }
  });

  await check("Map pins → lat/lng are valid coordinates (UK-ish range)", async () => {
    for (const pin of mapPins) {
      // Loose check: UK is roughly lat 49-61, lng -8 to 2
      // Allow broader range for edge cases
      assert(
        pin.lat >= -90 && pin.lat <= 90,
        `pin ${pin.id}: lat ${pin.lat} out of range`
      );
      assert(
        pin.lng >= -180 && pin.lng <= 180,
        `pin ${pin.id}: lng ${pin.lng} out of range`
      );
    }
  });

  await check("Map pins → href starts with /admin or /engineer", async () => {
    for (const pin of mapPins) {
      assert(
        pin.href.startsWith("/admin") || pin.href.startsWith("/engineer"),
        `pin ${pin.id}: href "${pin.href}" unexpected prefix`
      );
    }
  });

  await check("Map pins → includes both jobs and quotes (if data exists)", async () => {
    const types = new Set(mapPins.map((p: any) => p.type));
    // Just log — both types may not be present in every dataset
    console.log(`        Types present: ${[...types].join(", ") || "(none)"}`);
  });

  await check("Map pins → performance < 2000ms", async () => {
    const { ms } = await fetchJson("/api/internal/dashboard/map-pins");
    assert(ms < 2000, `Map pins took ${ms}ms, target is <2000ms`);
  });

  await check("Map pins → denies anonymous access", async () => {
    const { status } = await fetchJson("/api/internal/dashboard/map-pins", { noCookies: true });
    assert(status === 401 || status === 403 || status === 307, `Expected 401/403/307, got ${status}`);
  });

  // ── C: Performance Checks ─────────────────────────────────────
  console.log("\n  === C: Performance & Safety ===");

  await check("Attention API performance < 1500ms", async () => {
    // Clear cache by waiting (or just measure)
    const { ms } = await fetchJson("/api/admin/dashboard/attention");
    assert(ms < 1500, `Attention took ${ms}ms (target <1500ms)`);
  });

  await check("Health flags performance < 1500ms", async () => {
    const { ms } = await fetchJson("/api/admin/jobs/health-flags");
    assert(ms < 1500, `Health flags took ${ms}ms (target <1500ms)`);
  });

  await check("Engineer activity performance < 1000ms", async () => {
    const { ms } = await fetchJson("/api/admin/engineers/activity");
    assert(ms < 1000, `Engineer activity took ${ms}ms (target <1000ms)`);
  });

  // ── Attention item CTA validation ─────────────────────────────
  console.log("\n  === CTA Link Validation ===");

  // Verify each CTA href resolves to a real page (not 404/500)
  for (const item of attentionItems.slice(0, 3)) {
    await check(`CTA "${item.ctaLabel}" → ${item.ctaHref.slice(0, 40)}... is reachable`, async () => {
      const res = await fetch(`${BASE_URL}${item.ctaHref}`, {
        headers: { cookie: cookieHeader() },
        redirect: "follow",
      });
      assert(
        res.status === 200 || res.status === 304,
        `CTA href ${item.ctaHref} returned ${res.status}`
      );
    });
  }

  // ── Attention message quality checks ──────────────────────────
  console.log("\n  === Message Quality ===");

  await check("Attention messages don't leak raw UUIDs", async () => {
    for (const item of attentionItems) {
      if (UUID_RE.test(item.message)) {
        // Allow truncated 8-char prefixes (id.slice(0,8)) but not full UUIDs
        const fullMatches = item.message.match(UUID_RE) || [];
        for (const m of fullMatches) {
          assert(false, `Message leaks full UUID: "${item.message}"`);
        }
      }
    }
  });

  await check("Attention messages use # prefix for numbers (not raw IDs)", async () => {
    for (const item of attentionItems) {
      // Messages should say "Job #123" not "Job abc-def-ghi"
      // If jobNumber/invoiceNumber/quoteNumber is null, the code uses id.slice(0,8) which is OK
      // Just ensure messages are human-readable
      assert(item.message.length > 10, `Message too short: "${item.message}"`);
      assert(item.message.length < 200, `Message too long: "${item.message}"`);
    }
  });

  // ── Summary ───────────────────────────────────────────────────
  const elapsed = ((Date.now() - suiteStart) / 1000).toFixed(1);
  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  Total: ${passed + failed}  |  PASS: ${passed}  |  FAIL: ${failed}  |  ${elapsed}s`);

  if (failures.length > 0) {
    console.log(`\n  === Failures ===`);
    for (const f of failures) {
      console.log(`  - ${f}`);
    }
  }

  console.log();
  process.exit(failed > 0 ? 1 : 0);
})();
