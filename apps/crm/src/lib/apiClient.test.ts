/**
 * Tests for apiClient module
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ApiError,
  apiRequest,
  requireOk,
  isAbortError,
  getApiErrorMessage,
  createAbortController,
} from "./apiClient";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ApiError", () => {
    it("should create error with status and message", () => {
      const error = new ApiError(404, "Not Found");
      expect(error.status).toBe(404);
      expect(error.message).toBe("Not Found");
    });

    it("should store payload", () => {
      const payload = { error: "Details", message: "More info" };
      const error = new ApiError(400, "Bad Request", payload);
      expect(error.payload).toEqual(payload);
    });

    it("should store URL", () => {
      const error = new ApiError(500, "Server Error", null, "/api/test");
      expect(error.url).toBe("/api/test");
    });

    it("should be instance of Error", () => {
      const error = new ApiError(400, "Test");
      expect(error).toBeInstanceOf(Error);
    });

    it("should handle string payload", () => {
      const error = new ApiError(400, "Error", "Raw error text");
      expect(error.payload).toBe("Raw error text");
    });
  });

  describe("apiRequest", () => {
    it("should make successful request", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => '{"data": "test"}',
      });

      const result = await apiRequest<{ data: string }>("/api/test");
      expect(result).toEqual({ data: "test" });
    });

    it("should add accept header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => "null",
      });

      await apiRequest("/api/test");
      expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
        headers: expect.objectContaining({ accept: "application/json" }),
      }));
    });

    it("should throw ApiError for non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => '{"error": "Invalid input"}',
      });

      await expect(apiRequest("/api/test")).rejects.toThrow(ApiError);
    });

    it("should extract error message from payload", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: new Headers({ "content-type": "application/json" }),
        text: async () => '{"error": "Custom error"}',
      });

      try {
        await apiRequest("/api/test");
      } catch (e) {
        expect((e as ApiError).message).toBe("Custom error");
      }
    });

    it("should handle 204 No Content", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
        text: async () => "",
      });

      const result = await apiRequest("/api/test");
      expect(result).toBeNull();
    });

    it("should handle empty response body", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => "",
      });

      const result = await apiRequest("/api/test");
      expect(result).toBeNull();
    });

    it("should parse JSON without content-type header", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => '{"parsed": true}',
      });

      const result = await apiRequest<{ parsed: boolean }>("/api/test");
      expect(result).toEqual({ parsed: true });
    });

    it("should return text for invalid JSON without content-type", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => "plain text",
      });

      const result = await apiRequest("/api/test");
      expect(result).toBe("plain text");
    });

    it("should merge custom headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => "null",
      });

      await apiRequest("/api/test", {
        headers: { Authorization: "Bearer token" },
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
        headers: expect.objectContaining({
          accept: "application/json",
          Authorization: "Bearer token",
        }),
      }));
    });

    it("should pass through other init options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () => "null",
      });

      await apiRequest("/api/test", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
        method: "POST",
        body: '{"data":"test"}',
      }));
    });
  });

  describe("requireOk", () => {
    it("should not throw for ok payload", () => {
      expect(() => requireOk({ ok: true })).not.toThrow();
    });

    it("should throw ApiError for not-ok payload", () => {
      expect(() => requireOk({ ok: false })).toThrow(ApiError);
    });

    it("should use error from payload", () => {
      try {
        requireOk({ ok: false, error: "Custom error" });
      } catch (e) {
        expect((e as ApiError).message).toBe("Custom error");
      }
    });

    it("should use custom message as fallback", () => {
      try {
        requireOk({ ok: false }, "Fallback message");
      } catch (e) {
        expect((e as ApiError).message).toBe("Fallback message");
      }
    });

    it("should have status 400", () => {
      try {
        requireOk({ ok: false });
      } catch (e) {
        expect((e as ApiError).status).toBe(400);
      }
    });
  });

  describe("isAbortError", () => {
    it("should return true for AbortError", () => {
      const abortError = new DOMException("Aborted", "AbortError");
      expect(isAbortError(abortError)).toBe(true);
    });

    it("should return false for other DOMException", () => {
      const otherError = new DOMException("Other", "NetworkError");
      expect(isAbortError(otherError)).toBe(false);
    });

    it("should return false for regular Error", () => {
      expect(isAbortError(new Error("test"))).toBe(false);
    });

    it("should return false for non-Error", () => {
      expect(isAbortError("error")).toBe(false);
      expect(isAbortError(null)).toBe(false);
      expect(isAbortError(undefined)).toBe(false);
    });
  });

  describe("getApiErrorMessage", () => {
    it("should extract message from ApiError with string payload", () => {
      const error = new ApiError(400, "Message", "String payload");
      expect(getApiErrorMessage(error)).toBe("String payload");
    });

    it("should extract error from ApiError with object payload", () => {
      const error = new ApiError(400, "Message", { error: "Object error" });
      expect(getApiErrorMessage(error)).toBe("Object error");
    });

    it("should extract message from ApiError object payload", () => {
      const error = new ApiError(400, "Message", { message: "Object message" });
      expect(getApiErrorMessage(error)).toBe("Object message");
    });

    it("should use message when no payload", () => {
      const error = new ApiError(400, "Direct message");
      expect(getApiErrorMessage(error)).toBe("Direct message");
    });

    it("should use message for regular Error", () => {
      const error = new Error("Regular error");
      expect(getApiErrorMessage(error)).toBe("Regular error");
    });

    it("should use fallback for non-Error", () => {
      expect(getApiErrorMessage("string")).toBe("Something went wrong");
      expect(getApiErrorMessage(null)).toBe("Something went wrong");
    });

    it("should use custom fallback", () => {
      expect(getApiErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
    });

    it("should prioritize error over message in payload", () => {
      const error = new ApiError(400, "Message", { error: "Error", message: "Message" });
      expect(getApiErrorMessage(error)).toBe("Error");
    });
  });

  describe("createAbortController", () => {
    it("should create AbortController", () => {
      const controller = createAbortController();
      expect(controller).toBeInstanceOf(AbortController);
    });

    it("should have signal property", () => {
      const controller = createAbortController();
      expect(controller.signal).toBeInstanceOf(AbortSignal);
    });

    it("should have abort method", () => {
      const controller = createAbortController();
      expect(typeof controller.abort).toBe("function");
    });
  });
});
