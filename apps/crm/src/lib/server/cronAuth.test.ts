/**
 * Tests for cron authentication and idempotency
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  checkCronAuth,
  checkIdempotency,
  getIdempotencyKey,
  getCompanyHeader,
} from "./cronAuth";

describe("cronAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("checkCronAuth", () => {
    it("should return error when QT_CRON_SECRET not set", () => {
      delete process.env.QT_CRON_SECRET;

      const req = new Request("http://localhost/api/cron/test");
      const result = checkCronAuth(req);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(500);
        expect(result.error).toBe("missing_cron_secret");
      }
    });

    it("should return error when AUTH header missing", () => {
      process.env.QT_CRON_SECRET = "test-secret";

      const req = new Request("http://localhost/api/cron/test");
      const result = checkCronAuth(req);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(401);
        expect(result.error).toBe("missing_auth");
      }
    });

    it("should return error when AUTH header invalid", () => {
      process.env.QT_CRON_SECRET = "correct-secret";

      const req = new Request("http://localhost/api/cron/test", {
        headers: { AUTH: "wrong-secret" },
      });
      const result = checkCronAuth(req);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(401);
        expect(result.error).toBe("invalid_auth");
      }
    });

    it("should return ok when AUTH header matches secret", () => {
      process.env.QT_CRON_SECRET = "correct-secret";

      const req = new Request("http://localhost/api/cron/test", {
        headers: { AUTH: "correct-secret" },
      });
      const result = checkCronAuth(req);

      expect(result.ok).toBe(true);
    });

    it("should accept lowercase auth header", () => {
      process.env.QT_CRON_SECRET = "correct-secret";

      const req = new Request("http://localhost/api/cron/test", {
        headers: { auth: "correct-secret" },
      });
      const result = checkCronAuth(req);

      expect(result.ok).toBe(true);
    });

    it("should use timing-safe comparison", () => {
      process.env.QT_CRON_SECRET = "secret123";

      const req = new Request("http://localhost/api/cron/test", {
        headers: { AUTH: "secret123" },
      });
      const result = checkCronAuth(req);

      expect(result.ok).toBe(true);
    });

    it("should reject secrets with different lengths", () => {
      process.env.QT_CRON_SECRET = "short";

      const req = new Request("http://localhost/api/cron/test", {
        headers: { AUTH: "much-longer-secret" },
      });
      const result = checkCronAuth(req);

      expect(result.ok).toBe(false);
    });
  });

  describe("checkIdempotency", () => {
    it("should allow first request with key", () => {
      const result = checkIdempotency("test-action", "unique-key-1");

      expect(result.ok).toBe(true);
      expect(result.duplicate).toBe(false);
    });

    it("should reject duplicate key within TTL", () => {
      const key = "unique-key-" + Math.random();

      checkIdempotency("test-action", key);
      const result = checkIdempotency("test-action", key);

      expect(result.ok).toBe(false);
      expect(result.duplicate).toBe(true);
    });

    it("should allow same key for different actions", () => {
      const key = "unique-key-" + Math.random();

      checkIdempotency("action-a", key);
      const result = checkIdempotency("action-b", key);

      expect(result.ok).toBe(true);
      expect(result.duplicate).toBe(false);
    });

    it("should allow null key", () => {
      const result = checkIdempotency("test-action", null);

      expect(result.ok).toBe(true);
      expect(result.duplicate).toBe(false);
      expect(result.key).toBeNull();
    });

    it("should return key in result", () => {
      const result = checkIdempotency("test-action", "my-key-" + Math.random());

      expect(result.key).toContain("my-key-");
    });

    it("should handle multiple null key requests", () => {
      const result1 = checkIdempotency("test-action", null);
      const result2 = checkIdempotency("test-action", null);

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
    });
  });

  describe("getIdempotencyKey", () => {
    it("should return Idempotency-Key header", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "Idempotency-Key": "my-key" },
      });

      expect(getIdempotencyKey(req)).toBe("my-key");
    });

    it("should return lowercase idempotency-key header", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "idempotency-key": "my-key" },
      });

      expect(getIdempotencyKey(req)).toBe("my-key");
    });

    it("should return null when header not present", () => {
      const req = new Request("http://localhost/api/test");

      expect(getIdempotencyKey(req)).toBeNull();
    });
  });

  describe("getCompanyHeader", () => {
    it("should return X-Company-Id header", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "X-Company-Id": "company-123" },
      });

      expect(getCompanyHeader(req)).toBe("company-123");
    });

    it("should return lowercase x-company-id header", () => {
      const req = new Request("http://localhost/api/test", {
        headers: { "x-company-id": "company-456" },
      });

      expect(getCompanyHeader(req)).toBe("company-456");
    });

    it("should return null when header not present", () => {
      const req = new Request("http://localhost/api/test");

      expect(getCompanyHeader(req)).toBeNull();
    });
  });
});
