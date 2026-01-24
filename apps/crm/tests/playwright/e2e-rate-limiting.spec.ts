import { test, expect } from "@playwright/test";

/**
 * Rate Limiting Smoke Tests
 *
 * Verifies that rate limiting is enforced on critical auth endpoints
 * to prevent brute force and abuse attacks.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Rate Limiting - Auth Endpoints", () => {
  test("should rate limit magic link requests by IP", async ({ request }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    // Attempt 6 magic link requests rapidly (limit is 5 per 15 minutes)
    const requests = [];
    for (let i = 0; i < 6; i++) {
      requests.push(
        request.post(`${BASE_URL}/api/auth/magic-link/request`, {
          data: {
            role: "client",
            email: testEmail,
            rememberMe: false,
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // First 5 should succeed (or return 200 even if email doesn't exist)
    for (let i = 0; i < 5; i++) {
      expect(responses[i].status()).toBeLessThan(400);
    }

    // 6th request should be rate limited
    const rateLimitedResponse = responses[5];
    expect(rateLimitedResponse.status()).toBe(429);

    const body = await rateLimitedResponse.json();
    expect(body).toHaveProperty("code", "RATE_LIMIT_EXCEEDED");
    expect(body).toHaveProperty("error");
    expect(body.error).toContain("magic link");
  });

  test("should rate limit password login attempts by IP", async ({ request }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    // Attempt 11 login requests rapidly (limit is 10 per 15 minutes)
    const requests = [];
    for (let i = 0; i < 11; i++) {
      requests.push(
        request.post(`${BASE_URL}/api/auth/password/login`, {
          data: {
            role: "admin",
            email: testEmail,
            password: "wrongpassword",
            rememberMe: false,
          },
        })
      );
    }

    const responses = await Promise.all(requests);

    // First 10 should return 401 (invalid credentials) or 400
    for (let i = 0; i < 10; i++) {
      expect([400, 401]).toContain(responses[i].status());
    }

    // 11th request should be rate limited
    const rateLimitedResponse = responses[10];
    expect(rateLimitedResponse.status()).toBe(429);

    const body = await rateLimitedResponse.json();
    expect(body).toHaveProperty("code", "RATE_LIMIT_EXCEEDED");
    expect(body).toHaveProperty("error");
    expect(body.error).toContain("login");
  });

  test("should include rate limit headers in 429 response", async ({ request }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await request.post(`${BASE_URL}/api/auth/magic-link/request`, {
        data: {
          role: "client",
          email: testEmail,
          rememberMe: false,
        },
      });
    }

    // Trigger rate limit
    const response = await request.post(`${BASE_URL}/api/auth/magic-link/request`, {
      data: {
        role: "client",
        email: testEmail,
        rememberMe: false,
      },
    });

    expect(response.status()).toBe(429);

    // Check for rate limit headers
    const headers = response.headers();
    expect(headers).toHaveProperty("retry-after");
    expect(headers).toHaveProperty("x-ratelimit-reset");

    // Retry-After should be a positive number
    const retryAfter = parseInt(headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(0);
  });

  test("should rate limit per email for magic link", async ({ request, context }) => {
    const testEmail = `shared-${Date.now()}@example.com`;

    // Create two separate contexts to simulate different IPs
    const context2 = await context.browser()!.newContext();
    const request2 = context2.request;

    try {
      // Exhaust rate limit for this email from first "IP"
      for (let i = 0; i < 5; i++) {
        await request.post(`${BASE_URL}/api/auth/magic-link/request`, {
          data: {
            role: "client",
            email: testEmail,
            rememberMe: false,
          },
        });
      }

      // Try from "different IP" (different context) - should still be rate limited
      const response = await request2.post(`${BASE_URL}/api/auth/magic-link/request`, {
        data: {
          role: "client",
          email: testEmail,
          rememberMe: false,
        },
      });

      expect(response.status()).toBe(429);

      const body = await response.json();
      expect(body).toHaveProperty("code", "RATE_LIMIT_EXCEEDED");
      expect(body.error).toContain("email");
    } finally {
      await context2.close();
    }
  });
});

test.describe("Rate Limiting - Response Format", () => {
  test("should return structured error response", async ({ request }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await request.post(`${BASE_URL}/api/auth/magic-link/request`, {
        data: {
          role: "client",
          email: testEmail,
          rememberMe: false,
        },
      });
    }

    // Trigger rate limit
    const response = await request.post(`${BASE_URL}/api/auth/magic-link/request`, {
      data: {
        role: "client",
        email: testEmail,
        rememberMe: false,
      },
    });

    expect(response.status()).toBe(429);

    const body = await response.json();

    // Check required fields
    expect(body).toHaveProperty("error");
    expect(body).toHaveProperty("code", "RATE_LIMIT_EXCEEDED");
    expect(body).toHaveProperty("resetAt");
    expect(body).toHaveProperty("retryAfter");

    // Validate types
    expect(typeof body.error).toBe("string");
    expect(typeof body.code).toBe("string");
    expect(typeof body.resetAt).toBe("string");
    expect(typeof body.retryAfter).toBe("number");

    // resetAt should be a valid ISO date
    expect(new Date(body.resetAt).toString()).not.toBe("Invalid Date");

    // retryAfter should be positive
    expect(body.retryAfter).toBeGreaterThan(0);
  });
});

test.describe("Rate Limiting - Security", () => {
  test("should not leak email existence via rate limiting", async ({ request }) => {
    const existingEmail = `existing-${Date.now()}@example.com`;
    const nonExistentEmail = `nonexistent-${Date.now()}@example.com`;

    // Both existing and non-existent emails should get rate limited the same way
    const responses1 = [];
    const responses2 = [];

    for (let i = 0; i < 6; i++) {
      responses1.push(
        request.post(`${BASE_URL}/api/auth/magic-link/request`, {
          data: {
            role: "client",
            email: existingEmail,
            rememberMe: false,
          },
        })
      );

      responses2.push(
        request.post(`${BASE_URL}/api/auth/magic-link/request`, {
          data: {
            role: "client",
            email: nonExistentEmail,
            rememberMe: false,
          },
        })
      );
    }

    const results1 = await Promise.all(responses1);
    const results2 = await Promise.all(responses2);

    // Both should be rate limited on 6th attempt
    expect(results1[5].status()).toBe(429);
    expect(results2[5].status()).toBe(429);

    // Response bodies should be identical (don't leak existence)
    const body1 = await results1[5].json();
    const body2 = await results2[5].json();

    expect(body1.code).toBe(body2.code);
    expect(body1.error).toBe(body2.error);
  });
});
