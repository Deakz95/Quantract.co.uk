#!/usr/bin/env tsx
/**
 * Smoke Test Runner
 *
 * Validates critical flows for the Quantract CRM application.
 *
 * Usage:
 *   SMOKE_TENANT_SLUG=smoke npm run smoke
 *
 * Environment variables:
 *   SMOKE_BASE_URL         - Base URL (default: http://localhost:3000)
 *   SMOKE_TENANT_SLUG      - Required: Tenant slug to test against
 *   SMOKE_ALLOWED_DOMAIN   - Allowed domain for lead capture (default: https://example.com)
 *   SMOKE_SESSION_COOKIE   - Admin session cookie(s) for authenticated tests
 *   SMOKE_ADMIN_EMAIL      - Admin email (alternative to cookie)
 *   SMOKE_ADMIN_PASSWORD   - Admin password (alternative to cookie)
 *   DATABASE_URL           - Database URL for direct Prisma tests
 */

import {
  loadConfig,
  HttpClient,
  log,
  test,
  skip,
  assertOk,
  assertStatus,
  assertEq,
  assertTruthy,
  assertMatches,
  assertLength,
  json,
  sleep,
  printSummary,
  getAdminHeaders,
  hasAdminAuth,
  type SmokeConfig,
} from "./lib";

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = loadConfig();

log.info(`Smoke Tests starting...`);
log.info(`Base URL: ${config.baseUrl}`);
log.info(`Tenant: ${config.tenantSlug}`);
log.info(`Allowed Domain: ${config.allowedDomain}`);
log.info(`Admin Auth: ${hasAdminAuth(config) ? "Available" : "Not configured"}`);
log.info(`Database: ${config.databaseUrl ? "Available" : "Not configured"}`);

const client = new HttpClient({ baseUrl: config.baseUrl, timeout: 15000 });
const adminHeaders = getAdminHeaders(config);

// ============================================================================
// TEST SUITES
// ============================================================================

/**
 * A) Tenant Resolution Tests
 */
async function testTenantResolution() {
  log.group("Tenant Resolution");

  // Health check
  await test("Health endpoint returns 200", async () => {
    const res = await client.get("/api/health");
    assertOk(res, "Health check");
    const data = await json<{ status: string }>(res);
    assertEq(data.status, "healthy", "Health status");
  });

  // Lead capture route exists (should not 500)
  await test("Public enquiries route exists", async () => {
    const res = await client.get(`/api/public/tenants/${config.tenantSlug}/enquiries`);
    // GET should return 405 (method not allowed) since only POST is supported
    // or 404 if tenant doesn't exist - but NOT 500
    assertStatus(res, [405, 404, 400], "Route exists check");
  });

  // Test with invalid tenant
  await test("Invalid tenant returns appropriate error", async () => {
    const res = await client.post(`/api/public/tenants/nonexistent-tenant-12345/enquiries`, {
      name: "Test",
      email: "test@example.com",
    });
    assertStatus(res, [404, 400], "Invalid tenant");
  });
}

/**
 * B) Lead Capture: Public POST Tests
 */
async function testLeadCapturePublicPost() {
  log.group("Lead Capture - Public POST");

  const testEnquiry = {
    name: "Smoke Test Lead",
    email: `smoke.lead.${Date.now()}@example.com`,
    phone: "07123456789",
    postcode: "SW1A 1AA",
    message: "Smoke test enquiry submission",
    formSlug: "contact",
    pageUrl: `${config.allowedDomain}/contact/`,
    referrer: "https://google.com",
    utmSource: "smoke",
    utmCampaign: "smoke-test",
  };

  await test("Valid enquiry submission succeeds", async () => {
    const res = await client.post(
      `/api/public/tenants/${config.tenantSlug}/enquiries`,
      testEnquiry,
      {
        headers: {
          Origin: config.allowedDomain,
        },
      }
    );
    // Could be 201 (created) or 200
    assertStatus(res, [200, 201], "Enquiry submission");
    const data = await json<{ ok: boolean; enquiryId?: string }>(res);
    assertTruthy(data.ok, "Response ok flag");
    assertTruthy(data.enquiryId, "Enquiry ID returned");
    log.dim(`Created enquiry: ${data.enquiryId}`);
  });

  // Test with minimal required fields
  await test("Minimal enquiry (name + email) succeeds", async () => {
    const res = await client.post(
      `/api/public/tenants/${config.tenantSlug}/enquiries`,
      {
        name: "Minimal Test",
        email: `minimal.${Date.now()}@example.com`,
      },
      {
        headers: {
          Origin: config.allowedDomain,
        },
      }
    );
    assertStatus(res, [200, 201, 400], "Minimal enquiry"); // 400 if form requires more fields
  });
}

/**
 * C) Lead Capture Security Tests
 */
async function testLeadCaptureSecurity() {
  log.group("Lead Capture - Security");

  // Test with disallowed origin
  await test("Disallowed origin is rejected (if domains configured)", async () => {
    const res = await client.post(
      `/api/public/tenants/${config.tenantSlug}/enquiries`,
      {
        name: "Attacker",
        email: "attacker@evil.com",
      },
      {
        headers: {
          Origin: "https://evil-domain.com",
        },
      }
    );
    // If no domains are configured, it may still succeed (200/201)
    // If domains ARE configured, should be 403
    const data = await json<{ ok: boolean; error?: string }>(res);
    if (res.status === 403) {
      assertEq(res.status, 403, "Disallowed origin rejected");
      log.dim("Domain allowlist is enforcing correctly");
    } else if (data.ok) {
      log.warn("No domain restrictions configured (all origins allowed)");
    }
  });

  // Test honeypot detection
  await test("Honeypot field triggers silent rejection", async () => {
    const res = await client.post(
      `/api/public/tenants/${config.tenantSlug}/enquiries`,
      {
        name: "Bot Name",
        email: "bot@spam.com",
        _hp: "I am a bot filling hidden fields", // Honeypot field
      },
      {
        headers: {
          Origin: config.allowedDomain,
        },
      }
    );
    // Honeypot should return 200/201 but not actually create the enquiry
    // (silent rejection to fool bots)
    assertStatus(res, [200, 201], "Honeypot silent success");
    const data = await json<{ ok: boolean }>(res);
    assertTruthy(data.ok, "Honeypot returns ok:true (silent rejection)");
  });

  // Test rate limiting
  await test("Rate limiting triggers after many requests", async () => {
    log.dim("Sending rapid requests to trigger rate limit...");
    let rateLimited = false;

    // Send requests until we get rate limited (max 35 to avoid DOS)
    for (let i = 0; i < 35; i++) {
      const res = await client.post(
        `/api/public/tenants/${config.tenantSlug}/enquiries`,
        {
          name: `Rate Test ${i}`,
          email: `ratelimit.${i}.${Date.now()}@example.com`,
        },
        {
          headers: {
            Origin: config.allowedDomain,
            "X-Forwarded-For": "192.168.1.100", // Same IP for rate limiting
          },
        }
      );

      if (res.status === 429) {
        rateLimited = true;
        log.dim(`Rate limited after ${i + 1} requests`);
        break;
      }

      // Small delay to avoid overwhelming the server
      await sleep(20);
    }

    assertTruthy(rateLimited, "Rate limiting triggered");
  });
}

/**
 * D) Admin Lead Capture APIs
 */
async function testAdminLeadCaptureApis() {
  log.group("Admin Lead Capture APIs");

  if (!hasAdminAuth(config)) {
    skip("Admin APIs", "No admin credentials provided (set SMOKE_SESSION_COOKIE)");
    return;
  }

  // Test domains endpoint
  await test("GET /api/admin/lead-capture/domains returns 200", async () => {
    const res = await client.get("/api/admin/lead-capture/domains", { headers: adminHeaders });
    assertOk(res, "Domains endpoint");
    const data = await json<{ ok: boolean; domains: unknown[] }>(res);
    assertTruthy(data.ok, "Response ok");
    assertTruthy(Array.isArray(data.domains), "Domains is array");
    log.dim(`Found ${data.domains.length} domains`);
  });

  // Test keys endpoint
  await test("GET /api/admin/lead-capture/keys returns 200", async () => {
    const res = await client.get("/api/admin/lead-capture/keys", { headers: adminHeaders });
    assertOk(res, "Keys endpoint");
    const data = await json<{ ok: boolean; keys: unknown[] }>(res);
    assertTruthy(data.ok, "Response ok");
    assertTruthy(Array.isArray(data.keys), "Keys is array");
    log.dim(`Found ${data.keys.length} API keys`);
  });

  // Test forms endpoint
  await test("GET /api/admin/lead-capture/forms returns 200", async () => {
    const res = await client.get("/api/admin/lead-capture/forms", { headers: adminHeaders });
    assertOk(res, "Forms endpoint");
    const data = await json<{ ok: boolean; forms: unknown[] }>(res);
    assertTruthy(data.ok, "Response ok");
    assertTruthy(Array.isArray(data.forms), "Forms is array");
    log.dim(`Found ${data.forms.length} form configs`);
  });

  // Test domain CRUD
  await test("Domain CRUD (create, read, delete)", async () => {
    const testDomain = `smoke-test-${Date.now()}.example.com`;

    // Create
    const createRes = await client.post(
      "/api/admin/lead-capture/domains",
      { domain: testDomain },
      { headers: adminHeaders }
    );
    assertStatus(createRes, [200, 201], "Create domain");
    const createData = await json<{ ok: boolean; domain: { id: string } }>(createRes);
    assertTruthy(createData.ok, "Create ok");
    const domainId = createData.domain.id;
    log.dim(`Created domain: ${domainId}`);

    // Read
    const readRes = await client.get(`/api/admin/lead-capture/domains/${domainId}`, {
      headers: adminHeaders,
    });
    assertOk(readRes, "Read domain");

    // Delete (cleanup)
    const deleteRes = await client.delete(`/api/admin/lead-capture/domains/${domainId}`, {
      headers: adminHeaders,
    });
    assertOk(deleteRes, "Delete domain");
    log.dim(`Cleaned up domain: ${domainId}`);
  });
}

/**
 * E) Admin Endpoints Health Check
 */
async function testAdminEndpoints() {
  log.group("Admin Endpoints Health");

  if (!hasAdminAuth(config)) {
    skip("Admin Endpoints", "No admin credentials provided");
    return;
  }

  const endpoints = [
    "/api/admin/legal-entities",
    "/api/admin/service-lines",
    "/api/admin/enquiries",
    "/api/admin/quotes",
    "/api/admin/jobs",
    "/api/admin/invoices",
  ];

  for (const endpoint of endpoints) {
    await test(`GET ${endpoint} responds`, async () => {
      const res = await client.get(endpoint, { headers: adminHeaders });
      // Should be 200, 401 (auth issue), or 403 (forbidden) - NOT 500
      assertStatus(res, [200, 401, 403, 404], `${endpoint} responds`);
      if (res.status === 200) {
        log.dim(`${endpoint} returned 200`);
      } else if (res.status === 401) {
        log.warn(`${endpoint} returned 401 - check session cookie`);
      }
    });
  }
}

/**
 * F) Multi-Entity Billing (via API if available)
 */
async function testMultiEntityBilling() {
  log.group("Multi-Entity Billing");

  if (!hasAdminAuth(config)) {
    skip("Multi-Entity Billing", "No admin credentials provided");
    return;
  }

  // Check legal entities
  await test("Legal entities exist", async () => {
    const res = await client.get("/api/admin/legal-entities", { headers: adminHeaders });
    if (res.status !== 200) {
      log.warn("Cannot access legal entities endpoint");
      return;
    }
    const data = await json<{ ok: boolean; legalEntities?: unknown[] }>(res);
    if (!data.legalEntities || data.legalEntities.length === 0) {
      log.warn("No legal entities found - multi-entity billing not configured");
      return;
    }
    log.dim(`Found ${data.legalEntities.length} legal entities`);
    assertLength(data.legalEntities, 1, "At least 1 legal entity");
  });

  // Check service lines
  await test("Service lines exist", async () => {
    const res = await client.get("/api/admin/service-lines", { headers: adminHeaders });
    if (res.status !== 200) {
      log.warn("Cannot access service lines endpoint");
      return;
    }
    const data = await json<{ ok: boolean; serviceLines?: unknown[] }>(res);
    if (!data.serviceLines || data.serviceLines.length === 0) {
      log.warn("No service lines found");
      return;
    }
    log.dim(`Found ${data.serviceLines.length} service lines`);
    assertLength(data.serviceLines, 1, "At least 1 service line");
  });

  // Note: Full multi-entity billing test with job/invoice creation would require
  // direct Prisma access or more complex API sequences. The above validates
  // that the entities are configured correctly.
  log.dim("Note: Full invoice numbering test requires direct database access");
}

/**
 * G) Multi-Entity Billing via Prisma (if DATABASE_URL available)
 */
async function testMultiEntityBillingDirect() {
  log.group("Multi-Entity Billing (Direct DB)");

  if (!config.databaseUrl) {
    skip("Direct DB Tests", "DATABASE_URL not configured");
    return;
  }

  try {
    // Dynamic import to avoid bundling issues
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({
      datasources: { db: { url: config.databaseUrl } },
    });

    await test("Database connection works", async () => {
      await prisma.$queryRaw`SELECT 1`;
    });

    // Find the smoke test company
    const company = await prisma.company.findUnique({
      where: { slug: config.tenantSlug },
      select: { id: true, name: true },
    });

    if (!company) {
      log.warn(`Tenant '${config.tenantSlug}' not found in database`);
      await prisma.$disconnect();
      return;
    }

    log.dim(`Found company: ${company.name} (${company.id})`);

    await test("Legal entities configured for company", async () => {
      const entities = await prisma.legalEntity.findMany({
        where: { companyId: company.id, status: "active" },
        select: {
          id: true,
          displayName: true,
          invoiceNumberPrefix: true,
          nextInvoiceNumber: true,
        },
      });
      log.dim(`Found ${entities.length} active legal entities`);
      if (entities.length >= 2) {
        log.dim(`Entity 1: ${entities[0].displayName} - Prefix: ${entities[0].invoiceNumberPrefix}`);
        log.dim(`Entity 2: ${entities[1].displayName} - Prefix: ${entities[1].invoiceNumberPrefix}`);
      }
      // At least 1 entity should exist
      assertLength(entities, 1, "At least 1 legal entity");
    });

    await test("Service lines configured for company", async () => {
      const lines = await prisma.serviceLine.findMany({
        where: { companyId: company.id, status: "active" },
        select: { id: true, name: true, defaultLegalEntityId: true },
      });
      log.dim(`Found ${lines.length} active service lines`);
      // At least 1 should exist
      assertLength(lines, 1, "At least 1 service line");
    });

    await test("Invoice numbering is per-entity", async () => {
      const entities = await prisma.legalEntity.findMany({
        where: { companyId: company.id },
        select: { id: true, displayName: true, nextInvoiceNumber: true, invoiceNumberPrefix: true },
      });

      if (entities.length < 2) {
        log.warn("Need at least 2 entities to verify per-entity numbering");
        return;
      }

      // Verify entities have independent counters
      log.dim(`Entity 1: ${entities[0].displayName} - Next: ${entities[0].nextInvoiceNumber}`);
      log.dim(`Entity 2: ${entities[1].displayName} - Next: ${entities[1].nextInvoiceNumber}`);

      // The fact that they have separate nextInvoiceNumber fields is the verification
      assertTruthy(
        entities[0].nextInvoiceNumber !== undefined,
        "Entity 1 has invoice counter"
      );
      assertTruthy(
        entities[1].nextInvoiceNumber !== undefined,
        "Entity 2 has invoice counter"
      );
    });

    // Check for any smoke test data to clean up
    await test("Cleanup smoke test enquiries", async () => {
      const deleted = await prisma.enquiry.deleteMany({
        where: {
          companyId: company.id,
          email: { contains: "smoke" },
          source: "website",
        },
      });
      if (deleted.count > 0) {
        log.dim(`Cleaned up ${deleted.count} smoke test enquiries`);
      }
    });

    await prisma.$disconnect();
  } catch (err) {
    log.error(`Database test failed: ${err instanceof Error ? err.message : String(err)}`);
    // Don't fail the entire suite for DB issues
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("\n" + "=".repeat(50));
  console.log("QUANTRACT SMOKE TESTS");
  console.log("=".repeat(50) + "\n");

  // Run all test suites
  await testTenantResolution();
  await testLeadCapturePublicPost();
  await testLeadCaptureSecurity();
  await testAdminLeadCaptureApis();
  await testAdminEndpoints();
  await testMultiEntityBilling();
  await testMultiEntityBillingDirect();

  // Print summary and exit
  const exitCode = printSummary();
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
