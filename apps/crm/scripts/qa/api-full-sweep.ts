export {};

/**
 * API Full Sweep - Comprehensive endpoint discovery + testing
 *
 * Discovers ALL API route.ts files, infers HTTP methods, and tests them
 * against staging with a fixture chain for parameterized routes.
 *
 * Usage:
 *   BASE_URL=https://crm.quantract.co.uk ADMIN_EMAIL=x ADMIN_PASSWORD=y npm run qa:api:full
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, resolve, sep } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const BASE_URL =
  process.env.BASE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD env vars are required");
  process.exit(1);
}

const QA_TAG = "AUTOMATED_QA";
const ts = Date.now();

// ---------------------------------------------------------------------------
// 1. DISCOVERY - scan all route.ts files
// ---------------------------------------------------------------------------
const CRM_ROOT = resolve(__dirname, "../..");
const API_ROOT = join(CRM_ROOT, "app", "api");
const REPORTS_DIR = join(CRM_ROOT, "reports");

interface DiscoveredRoute {
  pathTemplate: string;
  methods: string[];
  source: "scan";
  filePath: string;
  category: string;
  paramNames: string[];
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    try {
      const stat = statSync(full);
      if (stat.isDirectory()) {
        results.push(...walkDir(full));
      } else if (entry === "route.ts") {
        results.push(full);
      }
    } catch {
      // skip permission errors
    }
  }
  return results;
}

function filePathToApiPath(filePath: string): string {
  // Extract the part after /app/api/ and remove /route.ts
  const normalized = filePath.replace(/\\/g, "/");
  const marker = "/app/api/";
  const idx = normalized.indexOf(marker);
  if (idx < 0) return "";
  let apiPath = normalized.slice(idx + "/app/".length); // starts with api/...
  apiPath = apiPath.replace(/\/route\.ts$/, "");
  // Convert [param] to {param}
  apiPath = "/" + apiPath.replace(/\[([^\]]+)\]/g, "{$1}");
  return apiPath;
}

function extractMethods(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, "utf-8");
    const methods: string[] = [];
    for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
      // Match: export const GET, export async function GET, export function GET
      const re = new RegExp(
        `export\\s+(const\\s+${m}|async\\s+function\\s+${m}|function\\s+${m})`,
      );
      if (re.test(content)) methods.push(m);
    }
    return methods.length > 0 ? methods : ["GET"]; // default to GET if can't detect
  } catch {
    return ["GET"];
  }
}

function extractParamNames(pathTemplate: string): string[] {
  const matches = pathTemplate.match(/\{([^}]+)\}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

function categorize(pathTemplate: string): string {
  if (pathTemplate.startsWith("/api/admin/billing")) return "billing";
  if (pathTemplate.startsWith("/api/webhooks/stripe")) return "billing";
  if (pathTemplate.startsWith("/api/auth")) return "auth";
  if (pathTemplate.startsWith("/api/admin")) return "admin";
  if (pathTemplate.startsWith("/api/engineer")) return "engineer";
  if (pathTemplate.startsWith("/api/client")) return "client";
  if (pathTemplate.startsWith("/api/internal")) return "internal";
  if (pathTemplate.startsWith("/api/cron")) return "cron";
  if (pathTemplate.startsWith("/api/public")) return "public";
  if (pathTemplate.startsWith("/api/ai")) return "ai";
  if (pathTemplate.startsWith("/api/geo")) return "geo";
  if (pathTemplate.startsWith("/api/support")) return "support";
  return "other";
}

console.log(`\n  API Full Sweep - ${BASE_URL}\n`);
console.log("  Phase 1: Discovery...");

const routeFiles = walkDir(API_ROOT);
const discovered: DiscoveredRoute[] = [];

for (const fp of routeFiles) {
  const pathTemplate = filePathToApiPath(fp);
  if (!pathTemplate) continue;
  const methods = extractMethods(fp);
  const paramNames = extractParamNames(pathTemplate);
  discovered.push({
    pathTemplate,
    methods,
    source: "scan",
    filePath: fp.replace(/\\/g, "/").replace(/^.*apps\/crm\//, ""),
    category: categorize(pathTemplate),
    paramNames,
  });
}

discovered.sort((a, b) => a.pathTemplate.localeCompare(b.pathTemplate));

// Write discovery JSON
writeFileSync(
  join(REPORTS_DIR, "api-discovery.json"),
  JSON.stringify(discovered, null, 2),
);

const totalEndpointMethods = discovered.reduce(
  (sum, d) => sum + d.methods.length,
  0,
);
console.log(
  `  Discovered: ${discovered.length} route files, ${totalEndpointMethods} endpoint+method combos\n`,
);

// ---------------------------------------------------------------------------
// 2. HTTP HELPERS
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

async function api(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    cookie: cookieHeader(),
    ...extraHeaders,
  };
  if (body) headers["content-type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  mergeCookies(res);
  return res;
}

// ---------------------------------------------------------------------------
// 3. RESULTS TRACKING
// ---------------------------------------------------------------------------
type Outcome = "PASS" | "FAIL" | "SKIP";
type SkipReason =
  | "BILLING_DEFERRED"
  | "NEEDS_FIXTURE"
  | "UNSAFE_SIDE_EFFECT"
  | "NOT_IMPLEMENTED"
  | "CATCH_ALL_ROUTE"
  | "NEEDS_FILE_UPLOAD"
  | "OAUTH_FLOW"
  | "CRON_INTERNAL"
  | "NEEDS_TOKEN"
  | "STREAMING_ENDPOINT"
  | "";

interface TestResult {
  route: string;
  method: string;
  expected: string;
  actual: number | string;
  ms: number;
  outcome: Outcome;
  reason: SkipReason | string;
  filePath: string;
  body?: string;
}

const results: TestResult[] = [];
let passCount = 0;
let failCount = 0;
let skipCount = 0;

function recordPass(
  route: string,
  method: string,
  expected: string,
  actual: number,
  ms: number,
  filePath: string,
) {
  passCount++;
  results.push({ route, method, expected, actual, ms, outcome: "PASS", reason: "", filePath });
  console.log(`  PASS  ${method.padEnd(6)} ${route}  (${ms}ms)`);
}

function recordFail(
  route: string,
  method: string,
  expected: string,
  actual: number | string,
  ms: number,
  filePath: string,
  reason: string,
  body?: string,
) {
  failCount++;
  results.push({ route, method, expected, actual, ms, outcome: "FAIL", reason, filePath, body });
  console.log(`  FAIL  ${method.padEnd(6)} ${route}  -> ${actual} (${reason}) (${ms}ms)`);
}

function recordSkip(
  route: string,
  method: string,
  filePath: string,
  reason: SkipReason,
) {
  skipCount++;
  results.push({
    route,
    method,
    expected: "-",
    actual: "-",
    ms: 0,
    outcome: "SKIP",
    reason,
    filePath,
  });
  console.log(`  SKIP  ${method.padEnd(6)} ${route}  (${reason})`);
}

// ---------------------------------------------------------------------------
// 4. SKIP LISTS
// ---------------------------------------------------------------------------
const BILLING_PATHS = ["/api/admin/billing/", "/api/webhooks/stripe"];
const OAUTH_PATHS = ["/api/admin/xero/oauth/", "/api/auth/{...path}"];
const CRON_PATHS = ["/api/internal/cron/", "/api/cron/"];
const UNSAFE_WRITE_PATHS = [
  "/api/admin/reset-demo-data",
  "/api/tenant/provision",
  "/api/admin/import/execute",
  "/api/admin/invoices/auto-chase/run",
  "/api/admin/leads/scoring/rescore",
  "/api/admin/notifications/test-sms",
  "/api/admin/users/set-password",
];
const FILE_UPLOAD_PATHS = [
  "/api/admin/settings/logo",
  "/api/admin/expenses/upload",
  "/api/admin/expenses/parse",
  "/api/admin/import/upload",
  "/api/admin/import/preview",
];
const STREAMING_PATHS = [
  "/api/ai/chat",
  "/api/support/chat",
];
// Feature-gated endpoints that legitimately return 403 when plan doesn't include them
const FEATURE_GATED_PATHS = [
  "/api/admin/leads/scoring",
  "/api/admin/truck-stock",
  "/api/admin/truck-stock/log",
];
// Redis/BullMQ endpoints that may timeout in staging
const REDIS_QUEUE_PATHS = [
  "/api/admin/jobs/failed",
];
// Auth endpoints that redirect or require specific auth state
const AUTH_REDIRECT_PATHS = [
  "/api/auth/magic-link/verify",
  "/api/auth/session-sync",
  "/api/auth/switch-company",
  "/api/auth/fix-company",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/resend-verification",
  "/api/auth/setup-account",
  "/api/auth/password/change",
];

function shouldSkip(
  pathTemplate: string,
  method: string,
): SkipReason | null {
  if (BILLING_PATHS.some((p) => pathTemplate.startsWith(p)))
    return "BILLING_DEFERRED";
  if (OAUTH_PATHS.some((p) => pathTemplate.startsWith(p)))
    return "OAUTH_FLOW";
  if (pathTemplate === "/api/auth/{...path}") return "CATCH_ALL_ROUTE";
  if (CRON_PATHS.some((p) => pathTemplate.startsWith(p)))
    return "CRON_INTERNAL";
  if (STREAMING_PATHS.some((p) => pathTemplate === p) && method === "POST")
    return "STREAMING_ENDPOINT";
  if (REDIS_QUEUE_PATHS.some((p) => pathTemplate === p))
    return "NEEDS_FIXTURE" as SkipReason; // BullMQ/Redis may not be reachable
  if (
    method !== "GET" &&
    UNSAFE_WRITE_PATHS.some((p) => pathTemplate === p)
  )
    return "UNSAFE_SIDE_EFFECT";
  if (FILE_UPLOAD_PATHS.some((p) => pathTemplate === p))
    return "NEEDS_FILE_UPLOAD";
  return null;
}

// ---------------------------------------------------------------------------
// 5. FIXTURE STATE
// ---------------------------------------------------------------------------
let clientId = "";
let contactId = "";
let jobId = "";
let quoteId = "";
let invoiceId = "";
let invoiceToken = "";
let certificateId = "";
let enquiryId = "";
let siteId = "";
let engineerId = "";
let quoteToken = "";
let dealId = "";
let stageId = "";
let dealStageId = "";
let activityId = "";
let timesheetId = "";
let savedViewId = "";

/** Map of param name -> value for substitution */
function getFixtureMap(): Record<string, string> {
  return {
    clientId,
    contactId,
    jobId,
    quoteId,
    invoiceId,
    certificateId,
    id: "", // generic - resolved per-context
    token: "", // resolved per-context
    stageId,
    dealId,
    dealStageId: dealStageId,
    engineerId,
    activityId,
    viewId: savedViewId,
    revision: "1",
    snagId: "",
    billId: "",
    ruleId: "",
    assetId: "",
    alertId: "",
    entityId: "",
    serviceLineId: "",
    inviteId: "",
    costItemId: "",
    attachmentId: "",
    variationId: "",
    formId: "",
    domainId: "",
    keyId: "",
    importId: "",
    sessionId: "",
    userId: "",
    taskId: "",
    checklistId: "",
    itemId: "",
    paymentId: "",
    certificateId2: certificateId, // for invoice cert link
    tenantSlug: "",
    agreementId: "",
  };
}

/**
 * Resolve a path template to a concrete URL.
 * Returns null if a required param is missing.
 */
function resolvePath(
  pathTemplate: string,
  _method: string,
): string | null {
  const fixtureMap = getFixtureMap();
  let path = pathTemplate;

  // Context-sensitive param resolution
  const contextResolvers: Record<string, () => string> = {
    // /api/admin/jobs/{jobId}/... -> jobId
    // /api/admin/invoices/{invoiceId}/... -> invoiceId
    // etc. Already named correctly in most cases
  };

  // Replace {param} with fixture values
  const params = extractParamNames(pathTemplate);
  for (const p of params) {
    let value = fixtureMap[p] ?? "";

    // Context-sensitive: {stageId} depends on path (always override)
    if (p === "stageId") {
      if (pathTemplate.includes("/deal-stages/")) value = dealStageId;
      else value = stageId;
    }

    // Context-sensitive: {id} depends on the path prefix
    if (p === "id" && !value) {
      if (pathTemplate.includes("/enquiries/")) value = enquiryId;
      else if (pathTemplate.includes("/timesheets/")) value = timesheetId;
      else if (pathTemplate.includes("/rams/")) value = "";
      else if (pathTemplate.includes("/checklist-templates/")) value = "";
      else if (pathTemplate.includes("/expenses/")) value = "";
    }

    // {token} context
    if (p === "token" && !value) {
      if (pathTemplate.includes("/client/invoices/")) value = invoiceToken;
      else if (pathTemplate.includes("/client/quotes/")) value = quoteToken;
      else if (pathTemplate.includes("/client/agreements/")) value = "";
      else if (pathTemplate.includes("/client/variations/")) value = "";
      else if (pathTemplate.includes("/public/invites/")) value = "";
    }

    if (!value) return null; // missing fixture
    path = path.replace(`{${p}}`, value);
  }

  return path;
}

// ---------------------------------------------------------------------------
// 6. FIXTURES SETUP
// ---------------------------------------------------------------------------
async function setupFixtures() {
  console.log("\n  Phase 2: Login + Fixture setup...\n");

  // Login
  {
    const t0 = Date.now();
    const res = await api("POST", "/api/auth/password/login", {
      role: "admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    if (res.status !== 200) {
      const body = await res.text().catch(() => "");
      console.error(`  FATAL: Login failed -> ${res.status}: ${body.slice(0, 300)}`);
      process.exit(1);
    }
    console.log(`  Login OK (${Date.now() - t0}ms)`);
  }

  // Get auth/me for engineerId
  {
    const res = await api("GET", "/api/auth/me");
    if (res.status === 200) {
      const json = await res.json();
      engineerId = json.user?.engineerId ?? json.engineerId ?? "";
    }
  }

  // Create client
  {
    const res = await api("POST", "/api/admin/clients", {
      name: `ZZZ QA Sweep ${ts} [${QA_TAG}]`,
      email: `qa-sweep-${ts}@test.quantract.co.uk`,
    });
    if (res.ok) {
      const json = await res.json();
      clientId = json.client?.id ?? json.id ?? json.clientId ?? "";
    }
    if (clientId) console.log(`  Fixture: clientId = ${clientId}`);
  }

  // Create contact
  if (clientId) {
    const res = await api("POST", "/api/admin/contacts", {
      clientId,
      firstName: "QA",
      lastName: `Sweep ${ts} [${QA_TAG}]`,
      email: `qa-sweep-contact-${ts}@test.quantract.co.uk`,
    });
    if (res.ok) {
      const json = await res.json();
      contactId = json.contact?.id ?? json.id ?? json.contactId ?? "";
    }
    if (contactId) console.log(`  Fixture: contactId = ${contactId}`);
  }

  // Create site
  if (clientId) {
    const res = await api("POST", "/api/admin/sites", {
      clientId,
      name: `QA Site ${ts} [${QA_TAG}]`,
      addressLine1: "10 Downing Street",
      city: "London",
      postcode: "SW1A 2AA",
    });
    if (res.ok) {
      const json = await res.json();
      siteId = json.site?.id ?? json.id ?? json.siteId ?? "";
    }
    if (siteId) console.log(`  Fixture: siteId = ${siteId}`);
  }

  // Get stages
  {
    const res = await api("GET", "/api/admin/stages");
    if (res.ok) {
      const json = await res.json();
      const stages = Array.isArray(json) ? json : json.data ?? json.stages ?? [];
      stageId = stages[0]?.id ?? "";
    }
  }

  // Get deal-stages
  {
    const res = await api("GET", "/api/admin/deal-stages");
    if (res.ok) {
      const json = await res.json();
      const stages = Array.isArray(json) ? json : json.data ?? json.stages ?? [];
      dealStageId = stages[0]?.id ?? "";
    }
  }

  // Create enquiry
  if (stageId) {
    const res = await api("POST", "/api/admin/enquiries", {
      stageId,
      name: `QA Enquiry ${ts} [${QA_TAG}]`,
      email: `qa-enq-${ts}@test.quantract.co.uk`,
    });
    if (res.ok) {
      const json = await res.json();
      enquiryId = json.enquiry?.id ?? json.id ?? json.enquiryId ?? "";
    }
    if (enquiryId) console.log(`  Fixture: enquiryId = ${enquiryId}`);
  }

  // Create job
  if (clientId) {
    const res = await api("POST", "/api/admin/jobs", {
      manual: true,
      clientId,
      title: `QA Sweep Job ${ts} [${QA_TAG}]`,
    });
    if (res.ok) {
      const json = await res.json();
      jobId = json.job?.id ?? json.id ?? json.jobId ?? "";
    }
    if (jobId) console.log(`  Fixture: jobId = ${jobId}`);
  }

  // Create quote
  {
    const res = await api("POST", "/api/admin/quotes", {
      clientName: `ZZZ QA Sweep ${ts} [${QA_TAG}]`,
      clientEmail: `qa-sweep-${ts}@test.quantract.co.uk`,
      notes: `[${QA_TAG}]`,
      items: [{ description: "QA sweep test item", qty: 1, unitPrice: 100 }],
    });
    if (res.ok) {
      const json = await res.json();
      quoteId = json.quote?.id ?? json.id ?? json.quoteId ?? "";
    }
    if (quoteId) console.log(`  Fixture: quoteId = ${quoteId}`);
  }

  // Get quote token
  if (quoteId) {
    const res = await api("GET", `/api/admin/quotes/${quoteId}/token`);
    if (res.ok) {
      const json = await res.json();
      quoteToken = json.token ?? "";
    }
    if (quoteToken) console.log(`  Fixture: quoteToken = ${quoteToken.slice(0, 12)}...`);
  }

  // Convert quote -> invoice
  if (quoteId) {
    const res = await api("POST", `/api/admin/quotes/${quoteId}/invoice`);
    if (res.ok) {
      const json = await res.json();
      invoiceId = json.invoice?.id ?? json.id ?? json.invoiceId ?? "";
    }
    if (invoiceId) console.log(`  Fixture: invoiceId = ${invoiceId}`);
  }

  // Get invoice token
  if (invoiceId) {
    const res = await api("GET", `/api/admin/invoices/${invoiceId}`);
    if (res.ok) {
      const json = await res.json();
      const inv = json.invoice ?? json;
      invoiceToken = inv.token ?? inv.shareToken ?? "";
    }
    if (invoiceToken)
      console.log(`  Fixture: invoiceToken = ${invoiceToken.slice(0, 12)}...`);
  }

  // Create certificate
  if (jobId) {
    const res = await api("POST", "/api/admin/certificates", {
      jobId,
      type: "MWC",
    });
    if (res.ok) {
      const json = await res.json();
      certificateId = json.certificate?.id ?? json.id ?? json.certificateId ?? "";
    }
    if (certificateId)
      console.log(`  Fixture: certificateId = ${certificateId}`);
  }

  // Create deal
  if (dealStageId) {
    const res = await api("POST", "/api/admin/deals", {
      stageId: dealStageId,
      title: `QA Deal ${ts} [${QA_TAG}]`,
      value: 1000,
    });
    if (res.ok) {
      const json = await res.json();
      dealId = json.deal?.id ?? json.id ?? json.dealId ?? "";
    }
    if (dealId) console.log(`  Fixture: dealId = ${dealId}`);
  }

  // Create activity
  if (clientId) {
    const res = await api("POST", "/api/admin/activities", {
      clientId,
      type: "note",
      content: `QA sweep activity [${QA_TAG}]`,
    });
    if (res.ok) {
      const json = await res.json();
      activityId = json.activity?.id ?? json.id ?? json.activityId ?? "";
    }
    if (activityId) console.log(`  Fixture: activityId = ${activityId}`);
  }

  console.log("");
}

// ---------------------------------------------------------------------------
// 7. SMART TEST EXECUTION
// ---------------------------------------------------------------------------

/** Acceptable status codes per method */
function acceptableCodes(
  method: string,
  pathTemplate: string,
): number[] {
  // Feature-gated endpoints legitimately return 403
  if (FEATURE_GATED_PATHS.some((p) => pathTemplate === p))
    return [200, 403];
  // Auth endpoints may redirect or require specific state
  if (AUTH_REDIRECT_PATHS.some((p) => pathTemplate === p))
    return [200, 301, 302, 307, 401, 405];
  // Any auth GET that isn't /me may redirect
  if (pathTemplate.startsWith("/api/auth/") && method === "GET")
    return [200, 301, 302, 307, 401];
  // PDFs on draft certs may 404 (no PDF generated yet)
  if (pathTemplate.endsWith("/pdf")) return [200, 404];
  // CSV
  if (pathTemplate.endsWith(".csv")) return [200];
  // Client portal with token may 404 if token not matching
  if (pathTemplate.startsWith("/api/client/") && pathTemplate.includes("{token}"))
    return [200, 404];
  if (pathTemplate.startsWith("/api/client/") && pathTemplate.includes("{certificateId}"))
    return [200, 404];
  // Engineer portal may 404 if resource not assigned to engineer
  if (pathTemplate.startsWith("/api/engineer/") && pathTemplate.includes("{"))
    return [200, 404];
  // GETs - 200 or 307 redirect for auth
  if (method === "GET") return [200, 304];
  // POST create -> 200 or 201
  if (method === "POST") return [200, 201];
  // PATCH/PUT -> 200
  if (method === "PATCH" || method === "PUT") return [200];
  // DELETE -> 200 or 204
  if (method === "DELETE") return [200, 204];
  return [200];
}

/** For GET-only read tests with retry */
async function testEndpoint(
  route: DiscoveredRoute,
  method: string,
): Promise<void> {
  const skipReason = shouldSkip(route.pathTemplate, method);
  if (skipReason) {
    recordSkip(route.pathTemplate, method, route.filePath, skipReason);
    return;
  }

  // Resolve path
  const resolvedPath = resolvePath(route.pathTemplate, method);
  if (!resolvedPath) {
    recordSkip(route.pathTemplate, method, route.filePath, "NEEDS_FIXTURE");
    return;
  }

  // Skip non-GET methods on parameterized unsafe endpoints
  if (method !== "GET" && isUnsafeWrite(route.pathTemplate, method)) {
    recordSkip(route.pathTemplate, method, route.filePath, "UNSAFE_SIDE_EFFECT");
    return;
  }

  // Add query params where needed
  let urlPath = resolvedPath;
  urlPath = addRequiredQueryParams(urlPath, route.pathTemplate, method);

  const expected = acceptableCodes(method, route.pathTemplate);
  const t0 = Date.now();
  try {
    let res = await api(method, urlPath, getTestBody(route.pathTemplate, method));
    const ms = Date.now() - t0;

    // One retry for idempotent GET
    if (method === "GET" && !expected.includes(res.status)) {
      const t1 = Date.now();
      res = await api(method, urlPath);
      const ms2 = Date.now() - t1;
      if (expected.includes(res.status)) {
        recordPass(route.pathTemplate, method, expected.join("|"), res.status, ms2, route.filePath);
        return;
      }
    }

    if (expected.includes(res.status)) {
      recordPass(route.pathTemplate, method, expected.join("|"), res.status, ms, route.filePath);
    } else {
      const body = await res.text().catch(() => "");
      const snippet = body.length > 300 ? body.slice(0, 300) + "..." : body;
      recordFail(
        route.pathTemplate,
        method,
        expected.join("|"),
        res.status,
        ms,
        route.filePath,
        `expected ${expected.join("|")}, got ${res.status}`,
        snippet,
      );
    }
  } catch (err: any) {
    const ms = Date.now() - t0;
    recordFail(
      route.pathTemplate,
      method,
      expected.join("|"),
      "ERR",
      ms,
      route.filePath,
      err?.message ?? String(err),
    );
  }
}

/** Determine if a write method is unsafe */
function isUnsafeWrite(pathTemplate: string, method: string): boolean {
  if (method === "GET") return false;

  // Safe writes: these are tested explicitly or are read-like POSTs
  const safeWrites = new Set([
    // Already tested in fixture setup, or safe actions
  ]);

  // DELETE is always unsafe unless it's a test fixture
  if (method === "DELETE") return true;

  // POST to action endpoints that send emails, trigger side effects
  const unsafeActions = [
    "/send", "/remind", "/issue", "/reissue", "/complete",
    "/accept", "/reject", "/approve", "/amend",
    "/move", "/move-stage", "/sign", "/pay",
    "/duplicate", "/void", "/revoke", "/restore",
    "/regenerate-pdf", "/post", "/confirm",
    "/rescore", "/start", "/stop",
    "/decision",
  ];
  if (method === "POST" && unsafeActions.some((a) => pathTemplate.endsWith(a))) {
    return true;
  }

  // PATCH on detail endpoints - could mutate data
  if (method === "PATCH") return true;
  if (method === "PUT") return true;

  // POST to list endpoints = create -> skip (fixtures handled separately)
  if (method === "POST") return true;

  return false;
}

function addRequiredQueryParams(
  urlPath: string,
  pathTemplate: string,
  method: string,
): string {
  // Add required query params for endpoints that need them
  if (pathTemplate === "/api/admin/search") return urlPath + "?q=test";
  if (pathTemplate === "/api/admin/schedule") {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const to = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    return `${urlPath}?from=${from}&to=${to}`;
  }
  if (pathTemplate === "/api/admin/planner") {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const to = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    return `${urlPath}?from=${from}&to=${to}`;
  }
  if (pathTemplate === "/api/engineer/schedule") {
    const now = new Date();
    const from = now.toISOString().slice(0, 10);
    const to = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    return `${urlPath}?from=${from}&to=${to}`;
  }
  if (pathTemplate === "/api/engineer/timesheets") {
    const monday = new Date();
    monday.setDate(monday.getDate() - monday.getDay() + 1);
    return `${urlPath}?weekStart=${monday.toISOString().slice(0, 10)}`;
  }
  if (pathTemplate === "/api/admin/certificates/analytics") {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    return `${urlPath}?from=${from}&to=${to}`;
  }
  if (pathTemplate === "/api/admin/reports/revenue" ||
      pathTemplate === "/api/admin/reports/sales" ||
      pathTemplate === "/api/admin/reports/profitability" ||
      pathTemplate === "/api/admin/reports/activity" ||
      pathTemplate === "/api/admin/reports/engineer-utilisation" ||
      pathTemplate === "/api/admin/reports/quote-win-rate" ||
      pathTemplate === "/api/admin/reports/tax-summary" ||
      pathTemplate === "/api/admin/reports/time-vs-estimate") {
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const from = new Date(now.getTime() - 90 * 86400000).toISOString().slice(0, 10);
    return `${urlPath}?from=${from}&to=${to}`;
  }
  if (pathTemplate === "/api/admin/dashboard") {
    return `${urlPath}?period=month`;
  }
  if (pathTemplate === "/api/geo/autocomplete") {
    return `${urlPath}?q=London`;
  }
  if (pathTemplate === "/api/geo/details") {
    return `${urlPath}?placeId=test`;
  }
  if (pathTemplate === "/api/admin/quotes/lookup") {
    return `${urlPath}?number=QUO-001`;
  }
  if (pathTemplate === "/api/admin/notifications/logs") {
    return `${urlPath}?limit=10`;
  }
  if (pathTemplate === "/api/admin/materials/stock-movements") {
    return `${urlPath}?limit=10`;
  }
  if (pathTemplate === "/api/admin/impersonate/status") {
    return urlPath;
  }
  return urlPath;
}

function getTestBody(
  pathTemplate: string,
  method: string,
): unknown | undefined {
  // For GET/DELETE no body needed
  if (method === "GET" || method === "DELETE") return undefined;
  // We skip most writes, so this is mainly for reference
  return undefined;
}

// ---------------------------------------------------------------------------
// 8. MAIN EXECUTION
// ---------------------------------------------------------------------------
async function main() {
  await setupFixtures();

  console.log("  Phase 3: Testing endpoints...\n");

  // Sort: GETs first (read-only), then by category
  const testPlan: Array<{ route: DiscoveredRoute; method: string }> = [];

  for (const route of discovered) {
    for (const method of route.methods) {
      testPlan.push({ route, method });
    }
  }

  // Sort: GETs first, then by path
  testPlan.sort((a, b) => {
    if (a.method === "GET" && b.method !== "GET") return -1;
    if (a.method !== "GET" && b.method === "GET") return 1;
    return a.route.pathTemplate.localeCompare(b.route.pathTemplate);
  });

  for (const { route, method } of testPlan) {
    await testEndpoint(route, method);
  }

  // ---------------------------------------------------------------------------
  // 9. REPORTING
  // ---------------------------------------------------------------------------
  console.log("\n  Phase 4: Generating reports...\n");

  // JSON report
  writeFileSync(
    join(REPORTS_DIR, "api-full-sweep.json"),
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        summary: {
          discovered: discovered.length,
          totalEndpointMethods: totalEndpointMethods,
          tested: passCount + failCount,
          passed: passCount,
          failed: failCount,
          skipped: skipCount,
        },
        results,
      },
      null,
      2,
    ),
  );

  // CSV report
  const csvHeader =
    "route,method,expected,actual,ms,outcome,reason,filePath";
  const csvRows = results.map((r) =>
    [
      `"${r.route}"`,
      r.method,
      `"${r.expected}"`,
      r.actual,
      r.ms,
      r.outcome,
      `"${r.reason}"`,
      `"${r.filePath}"`,
    ].join(","),
  );
  writeFileSync(
    join(REPORTS_DIR, "api-full-sweep.csv"),
    [csvHeader, ...csvRows].join("\n"),
  );

  // Terminal summary
  const skipBreakdown: Record<string, number> = {};
  for (const r of results) {
    if (r.outcome === "SKIP") {
      skipBreakdown[r.reason] = (skipBreakdown[r.reason] || 0) + 1;
    }
  }

  console.log("  =========================================");
  console.log(`  Total discovered:  ${discovered.length} routes (${totalEndpointMethods} endpoint+method)`);
  console.log(`  Tested:            ${passCount + failCount}`);
  console.log(`  Passed:            ${passCount}`);
  console.log(`  Failed:            ${failCount}`);
  console.log(`  Skipped:           ${skipCount}`);
  if (Object.keys(skipBreakdown).length > 0) {
    console.log("    Breakdown:");
    for (const [reason, count] of Object.entries(skipBreakdown).sort(
      (a, b) => b[1] - a[1],
    )) {
      console.log(`      ${reason}: ${count}`);
    }
  }
  console.log("  =========================================");

  // Top 10 failures
  const failures = results.filter((r) => r.outcome === "FAIL");
  if (failures.length > 0) {
    console.log(`\n  Top ${Math.min(10, failures.length)} failures:`);
    for (const f of failures.slice(0, 10)) {
      console.log(`    ${f.method} ${f.route} -> ${f.actual} (${f.reason})`);
      if (f.body) console.log(`      body: ${f.body.slice(0, 150)}`);
    }
  }

  console.log(`\n  Reports written to:`);
  console.log(`    ${join(REPORTS_DIR, "api-discovery.json")}`);
  console.log(`    ${join(REPORTS_DIR, "api-full-sweep.json")}`);
  console.log(`    ${join(REPORTS_DIR, "api-full-sweep.csv")}`);

  console.log(`\n  To cleanup: npm run qa:purge-test-data\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
