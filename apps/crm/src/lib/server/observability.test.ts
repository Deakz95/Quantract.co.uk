/**
 * Tests for observability module (structured logging)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  logRequest,
  logBusinessEvent,
  logCriticalAction,
  logSecurityEvent,
  logError,
  withRequestLogging,
  type RequestLogEntry,
  type BusinessEvent,
  type CriticalActionEvent,
  type SecurityEvent,
} from "./observability";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

// Mock serverAuth
vi.mock("@/lib/serverAuth", () => ({
  getCompanyId: vi.fn().mockResolvedValue("company-123"),
}));

import * as Sentry from "@sentry/nextjs";

describe("observability", () => {
  let consoleSpy: {
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = {
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.info.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe("logRequest", () => {
    it("should log request info as JSON", () => {
      const entry: RequestLogEntry = {
        route: "/api/test",
        method: "GET",
        status: 200,
        durationMs: 50,
        companyId: "company-1",
      };

      logRequest(entry);

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.info.mock.calls[0][0] as string);
      expect(loggedJson.route).toBe("/api/test");
      expect(loggedJson.status).toBe(200);
      expect(loggedJson.category).toBe("request");
    });

    it("should send slow requests to Sentry", () => {
      const entry: RequestLogEntry = {
        route: "/api/slow",
        status: 200,
        durationMs: 6000, // > 5000ms threshold
      };

      logRequest(entry);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Slow request: /api/slow",
        expect.objectContaining({
          level: "warning",
        })
      );
    });

    it("should not send fast requests to Sentry", () => {
      const entry: RequestLogEntry = {
        route: "/api/fast",
        status: 200,
        durationMs: 100,
      };

      logRequest(entry);

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it("should handle null fields gracefully", () => {
      const entry: RequestLogEntry = {
        route: "/api/test",
        status: 200,
        durationMs: 50,
        companyId: null,
        userId: null,
        requestId: null,
      };

      expect(() => logRequest(entry)).not.toThrow();
    });
  });

  describe("logBusinessEvent", () => {
    it("should log business event as JSON", () => {
      const event: BusinessEvent = {
        name: "invoice.sent",
        companyId: "company-1",
        invoiceId: "inv-123",
      };

      logBusinessEvent(event);

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.info.mock.calls[0][0] as string);
      expect(loggedJson.name).toBe("invoice.sent");
      expect(loggedJson.category).toBe("business_event");
    });

    it("should send webhook failures to Sentry", () => {
      const event: BusinessEvent = {
        name: "webhook.failure",
        metadata: { error: "Connection refused" },
      };

      logBusinessEvent(event);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "Webhook failure",
        expect.objectContaining({
          level: "warning",
        })
      );
    });

    it("should not send other events to Sentry", () => {
      const event: BusinessEvent = {
        name: "invoice.paid",
      };

      logBusinessEvent(event);

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe("logCriticalAction", () => {
    it("should log critical action as JSON", () => {
      const event: CriticalActionEvent = {
        name: "quote.sent",
        companyId: "company-1",
        userId: "user-1",
        actorId: "actor-1",
      };

      logCriticalAction(event);

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.info.mock.calls[0][0] as string);
      expect(loggedJson.name).toBe("quote.sent");
      expect(loggedJson.category).toBe("critical_action");
    });

    it("should always send critical actions to Sentry", () => {
      const event: CriticalActionEvent = {
        name: "user.deleted",
        userId: "user-1",
      };

      logCriticalAction(event);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "critical_action:user.deleted",
        expect.objectContaining({
          level: "info",
        })
      );
    });
  });

  describe("logSecurityEvent", () => {
    it("should log security event as JSON", () => {
      const event: SecurityEvent = {
        name: "auth.login.success",
        userId: "user-1",
        ipAddress: "192.168.1.1",
      };

      logSecurityEvent(event);

      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.info.mock.calls[0][0] as string);
      expect(loggedJson.name).toBe("auth.login.success");
      expect(loggedJson.category).toBe("security");
    });

    it("should log failures as warnings", () => {
      const event: SecurityEvent = {
        name: "auth.login.failure",
        email: "test@example.com",
      };

      logSecurityEvent(event);

      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    it("should send auth failures to Sentry", () => {
      const event: SecurityEvent = {
        name: "auth.login.failure",
        email: "test@example.com",
      };

      logSecurityEvent(event);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "security:auth.login.failure",
        expect.objectContaining({
          level: "warning",
        })
      );
    });

    it("should send rate limit exceeded to Sentry", () => {
      const event: SecurityEvent = {
        name: "auth.rate_limit.exceeded",
        ipAddress: "192.168.1.1",
      };

      logSecurityEvent(event);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "security:auth.rate_limit.exceeded",
        expect.objectContaining({
          level: "warning",
        })
      );
    });

    it("should not send success events to Sentry", () => {
      const event: SecurityEvent = {
        name: "auth.login.success",
        userId: "user-1",
      };

      logSecurityEvent(event);

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe("logError", () => {
    it("should log Error instances", () => {
      const error = new Error("Test error");

      logError(error);

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(loggedJson.error).toBe("Test error");
      expect(loggedJson.category).toBe("application_error");
    });

    it("should send Error to Sentry", () => {
      const error = new Error("Test error");

      logError(error, { userId: "user-1" });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          extra: { userId: "user-1" },
        })
      );
    });

    it("should handle non-Error values", () => {
      logError("string error");

      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        "string error",
        expect.objectContaining({
          level: "error",
        })
      );
    });

    it("should include context in log", () => {
      const error = new Error("Test error");

      logError(error, { route: "/api/test", userId: "user-1" });

      const loggedJson = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
      expect(loggedJson.route).toBe("/api/test");
      expect(loggedJson.userId).toBe("user-1");
    });
  });

  describe("withRequestLogging", () => {
    it("should wrap handler and log request", async () => {
      const handler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
      const wrappedHandler = withRequestLogging(handler);
      const req = new Request("http://localhost/api/test");

      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should log error status when handler throws", async () => {
      const error = { status: 404, message: "Not found" };
      const handler = vi.fn().mockRejectedValue(error);
      const wrappedHandler = withRequestLogging(handler);
      const req = new Request("http://localhost/api/test");

      await expect(wrappedHandler(req)).rejects.toEqual(error);
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should pass through handler response", async () => {
      const handler = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: "test" }), { status: 201 })
      );
      const wrappedHandler = withRequestLogging(handler);
      const req = new Request("http://localhost/api/test");

      const response = await wrappedHandler(req);

      expect(response.status).toBe(201);
    });
  });
});
