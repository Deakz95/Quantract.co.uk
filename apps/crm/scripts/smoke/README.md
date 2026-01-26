# Smoke Tests

Automated smoke tests for validating critical Quantract CRM flows before/after deployment.

## Quick Start

```bash
# Run against local dev server
SMOKE_TENANT_SLUG=smoke SMOKE_ALLOWED_DOMAIN=https://example.com npm run smoke
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMOKE_BASE_URL` | No | `http://localhost:3000` | Base URL of the application |
| `SMOKE_TENANT_SLUG` | **Yes** | - | Company slug to test against (e.g., `smoke`, `demo`) |
| `SMOKE_ALLOWED_DOMAIN` | No | `https://example.com` | Domain to use in Origin header for lead capture tests |
| `SMOKE_SESSION_COOKIE` | No | - | Admin session cookie(s) for authenticated tests |
| `SMOKE_ADMIN_EMAIL` | No | - | Admin email (alternative to cookie) |
| `SMOKE_ADMIN_PASSWORD` | No | - | Admin password (alternative to cookie) |
| `DATABASE_URL` | No | - | Database URL for direct Prisma tests |

## Test Suites

### A) Tenant Resolution
- Health endpoint check
- Public API route existence
- Invalid tenant handling

### B) Lead Capture - Public POST
- Valid enquiry submission
- Minimal field submission

### C) Lead Capture - Security
- Domain allowlist enforcement
- Honeypot spam detection
- Rate limiting (429 responses)

### D) Admin Lead Capture APIs (requires auth)
- GET /api/admin/lead-capture/domains
- GET /api/admin/lead-capture/keys
- GET /api/admin/lead-capture/forms
- Domain CRUD with cleanup

### E) Admin Endpoints Health (requires auth)
- Basic HTTP 200 checks on critical admin APIs

### F) Multi-Entity Billing
- Legal entities configuration
- Service lines configuration
- Per-entity invoice numbering (with DB access)

## Running Against Different Environments

### Local Development

```bash
# Start the dev server first
npm run dev

# In another terminal, run smoke tests
SMOKE_TENANT_SLUG=smoke npm run smoke
```

### Staging

```bash
SMOKE_BASE_URL=https://staging.quantract.co.uk \
SMOKE_TENANT_SLUG=demo \
SMOKE_ALLOWED_DOMAIN=https://demo.quantract.co.uk \
SMOKE_SESSION_COOKIE="qt_session_v1=admin:abc123; qt_sid_v1=abc123" \
npm run smoke
```

### Production

```bash
SMOKE_BASE_URL=https://www.quantract.co.uk \
SMOKE_TENANT_SLUG=quantractelectrical \
SMOKE_ALLOWED_DOMAIN=https://quantractelectrical.co.uk \
SMOKE_SESSION_COOKIE="__Host-qt_session_v1=..." \
npm run smoke
```

## Obtaining Session Cookies

To run admin tests, you need to provide session cookies:

1. Open your browser's DevTools (F12)
2. Go to Application → Cookies
3. Find your application's domain
4. Copy the following cookies:
   - `qt_session_v1` (or `__Host-qt_session_v1` in production)
   - `qt_sid_v1` (or `__Host-qt_sid_v1` in production)
   - `qt_company_id` (or `__Host-qt_company_id` in production)

5. Format them as a single string:
   ```
   qt_session_v1=admin:abc123; qt_sid_v1=abc123; qt_company_id=company-uuid
   ```

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Example Output

```
==================================================
QUANTRACT SMOKE TESTS
==================================================

ℹ Smoke Tests starting...
ℹ Base URL: http://localhost:3000
ℹ Tenant: smoke
ℹ Allowed Domain: https://example.com
ℹ Admin Auth: Available
ℹ Database: Available

▶ Tenant Resolution
✓ Health endpoint returns 200 (45ms)
✓ Public enquiries route exists (12ms)
✓ Invalid tenant returns appropriate error (18ms)

▶ Lead Capture - Public POST
✓ Valid enquiry submission succeeds (89ms)
  Created enquiry: abc-123-def
✓ Minimal enquiry (name + email) succeeds (34ms)

▶ Lead Capture - Security
✓ Disallowed origin is rejected (if domains configured) (22ms)
✓ Honeypot field triggers silent rejection (28ms)
✓ Rate limiting triggers after many requests (1245ms)
  Rate limited after 31 requests

▶ Admin Lead Capture APIs
✓ GET /api/admin/lead-capture/domains returns 200 (56ms)
  Found 2 domains
...

==================================================
SMOKE TEST SUMMARY
==================================================
PASSED: 18
FAILED: 0
TOTAL:  18
==================================================
```

## Adding New Tests

Edit `scripts/smoke/run-smoke-tests.ts`:

```typescript
async function testMyNewFeature() {
  log.group("My New Feature");

  await test("Feature X works", async () => {
    const res = await client.get("/api/my-endpoint");
    assertOk(res, "My endpoint");
    const data = await json<{ ok: boolean }>(res);
    assertTruthy(data.ok, "Response is ok");
  });
}

// Add to main():
async function main() {
  // ... existing tests ...
  await testMyNewFeature();
}
```

## Troubleshooting

### "SMOKE_TENANT_SLUG is required"
Set the required environment variable:
```bash
SMOKE_TENANT_SLUG=smoke npm run smoke
```

### Tests failing with 401
Your session cookie may have expired. Get a fresh cookie from the browser.

### Tests failing with 500
The server is returning an error. Check the server logs for details.

### Rate limit test not triggering 429
The rate limit may be configured higher than 35 requests/minute. The test will pass anyway if all requests succeed.

### Database tests skipped
Set `DATABASE_URL` to enable direct Prisma tests:
```bash
DATABASE_URL="postgresql://..." npm run smoke
```
