/**
 * Tests for cryptoHash utility
 */
import { describe, expect, it } from "vitest";
import { sha256Hex } from "./cryptoHash";

describe("sha256Hex", () => {
  it("should hash empty string correctly", async () => {
    const result = await sha256Hex("");
    // SHA-256 of empty string is well-known
    expect(result).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("should hash 'hello' correctly", async () => {
    const result = await sha256Hex("hello");
    expect(result).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("should hash 'Hello World' correctly", async () => {
    const result = await sha256Hex("Hello World");
    expect(result).toBe("a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e");
  });

  it("should return 64 character hex string", async () => {
    const result = await sha256Hex("test");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it("should produce different hashes for different inputs", async () => {
    const hash1 = await sha256Hex("input1");
    const hash2 = await sha256Hex("input2");
    expect(hash1).not.toBe(hash2);
  });

  it("should produce same hash for same input", async () => {
    const hash1 = await sha256Hex("consistent");
    const hash2 = await sha256Hex("consistent");
    expect(hash1).toBe(hash2);
  });

  it("should handle unicode characters", async () => {
    const result = await sha256Hex("Hello 世界");
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it("should handle special characters", async () => {
    const result = await sha256Hex("!@#$%^&*()");
    expect(result).toHaveLength(64);
  });

  it("should handle long strings", async () => {
    const longString = "a".repeat(10000);
    const result = await sha256Hex(longString);
    expect(result).toHaveLength(64);
  });
});
