/**
 * Tests for cn utility function (className merger)
 */
import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn - className merger", () => {
  it("should merge simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("base", true && "active")).toBe("base active");
    expect(cn("base", false && "active")).toBe("base");
  });

  it("should handle undefined and null", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("should handle empty strings", () => {
    expect(cn("base", "", "end")).toBe("base end");
  });

  it("should merge tailwind classes correctly", () => {
    // twMerge should handle conflicting classes
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle objects", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("should handle mixed inputs", () => {
    expect(cn("base", ["array"], { obj: true })).toBe("base array obj");
  });

  it("should return empty string for no inputs", () => {
    expect(cn()).toBe("");
  });

  it("should handle complex tailwind merging", () => {
    expect(cn("px-2 py-1", "p-4")).toBe("p-4");
    expect(cn("hover:bg-red-500", "hover:bg-blue-500")).toBe("hover:bg-blue-500");
  });
});
