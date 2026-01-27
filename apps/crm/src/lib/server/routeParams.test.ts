/**
 * Tests for routeParams utility
 */
import { describe, expect, it } from "vitest";
import { getRouteParams, type RouteContext } from "./routeParams";

describe("routeParams", () => {
  describe("getRouteParams", () => {
    it("should resolve sync params", async () => {
      const ctx: RouteContext<{ id: string }> = {
        params: { id: "123" },
      };

      const result = await getRouteParams(ctx);

      expect(result).toEqual({ id: "123" });
    });

    it("should resolve async params (Promise)", async () => {
      const ctx: RouteContext<{ id: string }> = {
        params: Promise.resolve({ id: "456" }),
      };

      const result = await getRouteParams(ctx);

      expect(result).toEqual({ id: "456" });
    });

    it("should handle multiple params", async () => {
      const ctx: RouteContext<{ userId: string; postId: string }> = {
        params: { userId: "user-1", postId: "post-2" },
      };

      const result = await getRouteParams(ctx);

      expect(result).toEqual({ userId: "user-1", postId: "post-2" });
    });

    it("should handle async multiple params", async () => {
      const ctx: RouteContext<{ a: string; b: string; c: string }> = {
        params: Promise.resolve({ a: "1", b: "2", c: "3" }),
      };

      const result = await getRouteParams(ctx);

      expect(result).toEqual({ a: "1", b: "2", c: "3" });
    });

    it("should handle empty params object", async () => {
      const ctx: RouteContext<Record<string, never>> = {
        params: {},
      };

      const result = await getRouteParams(ctx);

      expect(result).toEqual({});
    });

    it("should handle params with special characters", async () => {
      const ctx: RouteContext<{ slug: string }> = {
        params: { slug: "hello-world-123" },
      };

      const result = await getRouteParams(ctx);

      expect(result).toEqual({ slug: "hello-world-123" });
    });

    it("should handle undefined params", async () => {
      const ctx: RouteContext<{ id: string }> = {};

      const result = await getRouteParams(ctx);

      expect(result).toBeUndefined();
    });
  });
});
