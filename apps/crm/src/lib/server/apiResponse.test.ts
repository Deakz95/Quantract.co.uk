/**
 * Tests for API Response utilities.
 * Tests safe error handling and response formatting.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock NextResponse
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, options) => ({
      data,
      status: options?.status ?? 200,
      headers: options?.headers ?? {},
    })),
  },
}));

// Mock observability
vi.mock("@/lib/server/observability", () => ({
  logError: vi.fn(),
}));

import { safeJson, safeError, SafeErrors, withSafeErrors } from "./apiResponse";
import { logError } from "@/lib/server/observability";
import { NextResponse } from "next/server";

describe("apiResponse.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("USER_MESSAGES", () => {
    const USER_MESSAGES: Record<string, string> = {
      UNAUTHORIZED: "Please log in to continue",
      FORBIDDEN: "You don't have permission to perform this action",
      NOT_FOUND: "The requested resource was not found",
      VALIDATION: "Please check your input and try again",
      RATE_LIMITED: "Too many requests. Please wait and try again",
      INTERNAL: "Something went wrong. Please try again later",
      DATABASE: "A database error occurred. Please try again",
      NETWORK: "A network error occurred. Please try again",
    };

    it("should have user-friendly messages for all error types", () => {
      expect(USER_MESSAGES.UNAUTHORIZED).toBe("Please log in to continue");
      expect(USER_MESSAGES.FORBIDDEN).toBe(
        "You don't have permission to perform this action"
      );
      expect(USER_MESSAGES.NOT_FOUND).toBe(
        "The requested resource was not found"
      );
      expect(USER_MESSAGES.VALIDATION).toBe(
        "Please check your input and try again"
      );
      expect(USER_MESSAGES.RATE_LIMITED).toBe(
        "Too many requests. Please wait and try again"
      );
      expect(USER_MESSAGES.INTERNAL).toBe(
        "Something went wrong. Please try again later"
      );
    });

    it("should not expose technical details", () => {
      Object.values(USER_MESSAGES).forEach((message) => {
        expect(message).not.toContain("stack");
        expect(message).not.toContain("exception");
        expect(message).not.toContain("error:");
        expect(message).not.toContain("at ");
      });
    });
  });

  describe("safeJson", () => {
    it("should create response with default 200 status", () => {
      const data = { ok: true, message: "Success" };
      safeJson(data);

      expect(NextResponse.json).toHaveBeenCalledWith(data, { status: 200 });
    });

    it("should create response with custom status", () => {
      const data = { ok: true };
      safeJson(data, 201);

      expect(NextResponse.json).toHaveBeenCalledWith(data, { status: 201 });
    });

    it("should pass through complex data structures", () => {
      const data = {
        ok: true,
        items: [1, 2, 3],
        nested: { a: { b: "c" } },
      };
      safeJson(data);

      expect(NextResponse.json).toHaveBeenCalledWith(data, { status: 200 });
    });
  });

  describe("safeError", () => {
    const baseContext = {
      route: "/api/test",
      method: "GET",
    };

    it("should log full error to observability", () => {
      const error = new Error("Database connection failed");
      safeError(error, baseContext);

      expect(logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          route: "/api/test",
          method: "GET",
        })
      );
    });

    it("should return sanitized response without stack trace", () => {
      const error = new Error("Database connection failed");
      error.stack = "at something.js:123\nat another.js:456";

      const response = safeError(error, baseContext) as any;

      expect(response.data.error).not.toContain("connection failed");
      expect(response.data.error).not.toContain("stack");
      expect(response.data.ok).toBe(false);
    });

    it("should use default 500 status", () => {
      const error = new Error("Unknown error");
      const response = safeError(error, baseContext) as any;

      expect(response.status).toBe(500);
    });

    it("should use custom status when provided", () => {
      const error = new Error("Not found");
      const response = safeError(error, baseContext, { status: 404 }) as any;

      expect(response.status).toBe(404);
    });

    it("should use custom user message when provided", () => {
      const error = new Error("Technical error details");
      const response = safeError(error, baseContext, {
        userMessage: "Custom message",
      }) as any;

      expect(response.data.error).toBe("Custom message");
    });

    it("should include error code in response", () => {
      const error = new Error("Test error");
      const response = safeError(error, baseContext, {
        code: "VALIDATION",
      }) as any;

      expect(response.data.code).toBe("VALIDATION");
    });

    it("should include requestId when provided", () => {
      const error = new Error("Test error");
      const context = { ...baseContext, requestId: "req-123" };
      const response = safeError(error, context) as any;

      expect(response.data.requestId).toBe("req-123");
    });
  });

  describe("SafeErrors", () => {
    const context = { route: "/api/test" };

    describe("unauthorized", () => {
      it("should return 401 status", () => {
        const response = SafeErrors.unauthorized(context) as any;
        expect(response.status).toBe(401);
      });

      it("should have UNAUTHORIZED code", () => {
        const response = SafeErrors.unauthorized(context) as any;
        expect(response.data.code).toBe("UNAUTHORIZED");
      });

      it("should accept custom message", () => {
        const response = SafeErrors.unauthorized(
          context,
          "Session expired"
        ) as any;
        expect(response.data.error).toBe("Session expired");
      });
    });

    describe("forbidden", () => {
      it("should return 403 status", () => {
        const response = SafeErrors.forbidden(context) as any;
        expect(response.status).toBe(403);
      });

      it("should have FORBIDDEN code", () => {
        const response = SafeErrors.forbidden(context) as any;
        expect(response.data.code).toBe("FORBIDDEN");
      });
    });

    describe("notFound", () => {
      it("should return 404 status", () => {
        const response = SafeErrors.notFound(context) as any;
        expect(response.status).toBe(404);
      });

      it("should have NOT_FOUND code", () => {
        const response = SafeErrors.notFound(context) as any;
        expect(response.data.code).toBe("NOT_FOUND");
      });
    });

    describe("validation", () => {
      it("should return 400 status", () => {
        const response = SafeErrors.validation(context) as any;
        expect(response.status).toBe(400);
      });

      it("should have VALIDATION code", () => {
        const response = SafeErrors.validation(context) as any;
        expect(response.data.code).toBe("VALIDATION");
      });
    });

    describe("rateLimited", () => {
      it("should return 429 status", () => {
        const response = SafeErrors.rateLimited(context) as any;
        expect(response.status).toBe(429);
      });

      it("should have RATE_LIMITED code", () => {
        const response = SafeErrors.rateLimited(context) as any;
        expect(response.data.code).toBe("RATE_LIMITED");
      });
    });

    describe("internal", () => {
      it("should return 500 status", () => {
        const error = new Error("Something broke");
        const response = SafeErrors.internal(error, context) as any;
        expect(response.status).toBe(500);
      });

      it("should have INTERNAL code", () => {
        const error = new Error("Something broke");
        const response = SafeErrors.internal(error, context) as any;
        expect(response.data.code).toBe("INTERNAL");
      });

      it("should log the original error", () => {
        const error = new Error("Database crashed");
        SafeErrors.internal(error, context);

        expect(logError).toHaveBeenCalledWith(
          error,
          expect.objectContaining({ route: "/api/test" })
        );
      });
    });
  });

  describe("withSafeErrors", () => {
    const defaultContext = { route: "/api/test" };

    it("should pass through successful responses", async () => {
      const mockResponse = { ok: true, data: "test" };
      const handler = vi.fn().mockResolvedValue(mockResponse);

      const wrappedHandler = withSafeErrors(handler, defaultContext);
      const mockRequest = new Request("http://localhost/api/test");
      const result = await wrappedHandler(mockRequest);

      expect(result).toBe(mockResponse);
    });

    it("should catch and convert unauthorized errors", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Unauthorized"));

      const wrappedHandler = withSafeErrors(handler, defaultContext);
      const mockRequest = new Request("http://localhost/api/test");
      const result = (await wrappedHandler(mockRequest)) as any;

      expect(result.status).toBe(401);
      expect(result.data.code).toBe("UNAUTHORIZED");
    });

    it("should catch and convert forbidden errors", async () => {
      const handler = vi
        .fn()
        .mockRejectedValue(new Error("Permission denied"));

      const wrappedHandler = withSafeErrors(handler, defaultContext);
      const mockRequest = new Request("http://localhost/api/test");
      const result = (await wrappedHandler(mockRequest)) as any;

      expect(result.status).toBe(403);
    });

    it("should catch and convert not found errors", async () => {
      const handler = vi
        .fn()
        .mockRejectedValue(new Error("Resource not found"));

      const wrappedHandler = withSafeErrors(handler, defaultContext);
      const mockRequest = new Request("http://localhost/api/test");
      const result = (await wrappedHandler(mockRequest)) as any;

      expect(result.status).toBe(404);
    });

    it("should fall back to 500 for unknown errors", async () => {
      const handler = vi
        .fn()
        .mockRejectedValue(new Error("Some random error"));

      const wrappedHandler = withSafeErrors(handler, defaultContext);
      const mockRequest = new Request("http://localhost/api/test");
      const result = (await wrappedHandler(mockRequest)) as any;

      expect(result.status).toBe(500);
    });

    it("should extract request ID from headers", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Error"));

      const wrappedHandler = withSafeErrors(handler, defaultContext);
      const mockRequest = new Request("http://localhost/api/test", {
        headers: { "x-request-id": "req-xyz" },
      });
      await wrappedHandler(mockRequest);

      expect(logError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ requestId: "req-xyz" })
      );
    });
  });
});
