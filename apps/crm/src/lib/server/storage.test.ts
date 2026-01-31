/**
 * Tests for storage utility (local file uploads)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { uploadRoot, ensureDir, writeUploadBytes, readUploadBytes } from "./storage";
import fs from "node:fs";
import path from "node:path";

// Mock fs module
vi.mock("node:fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(),
}));

describe("storage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("uploadRoot", () => {
    it("should return QT_UPLOAD_PATH when set", () => {
      process.env.QT_UPLOAD_PATH = "/custom/upload/path";

      expect(uploadRoot()).toBe("/custom/upload/path");
    });

    it("should return default path when QT_UPLOAD_PATH not set", () => {
      delete process.env.QT_UPLOAD_PATH;

      const result = uploadRoot();
      expect(result).toContain(".qt-uploads");
    });
  });

  describe("ensureDir", () => {
    it("should create directory recursively", () => {
      ensureDir(path.join("/path", "to", "directory"));

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join("/path", "to", "directory"), { recursive: true });
    });
  });

  describe("writeUploadBytes", () => {
    it("should write bytes to specified path", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      const bytes = Buffer.from("test content");

      writeUploadBytes("test/file.txt", bytes);

      expect(fs.mkdirSync).toHaveBeenCalledWith(path.join("/uploads", "test"), { recursive: true });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        path.join("/uploads", "test", "file.txt"),
        expect.any(Buffer)
      );
    });

    it("should generate path when only bytes provided", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      const bytes = Buffer.from("test content");

      const result = writeUploadBytes(bytes, { ext: "pdf", prefix: "docs" });

      expect(result).toMatch(/^docs[/\\\\]\d+-[a-f0-9]+\.pdf$/);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should use default extension and prefix", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      const bytes = Buffer.from("test content");

      const result = writeUploadBytes(bytes);

      expect(result).toMatch(/^uploads[/\\\\]\d+-[a-f0-9]+\.bin$/);
    });

    it("should sanitize extension", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      const bytes = Buffer.from("test content");

      const result = writeUploadBytes(bytes, { ext: "PDF!@#$" });

      expect(result).toMatch(/\.pdf$/);
    });

    it("should sanitize prefix", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      const bytes = Buffer.from("test content");

      const result = writeUploadBytes(bytes, { prefix: "user/uploads" });

      expect(result).toMatch(/^user[/\\\\]uploads[/\\\\]/);
    });

    it("should return relative path", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      const bytes = Buffer.from("test content");

      const result = writeUploadBytes("custom/path.txt", bytes);

      expect(result).toBe("custom/path.txt");
    });
  });

  describe("readUploadBytes", () => {
    it("should read file and return buffer", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      const mockContent = Buffer.from("file content");
      vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

      const result = readUploadBytes("test/file.txt");

      expect(fs.readFileSync).toHaveBeenCalledWith(path.join("/uploads", "test", "file.txt"));
      expect(result).toEqual(mockContent);
    });

    it("should return null when file not found", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const result = readUploadBytes("nonexistent.txt");

      expect(result).toBeNull();
    });

    it("should return null on any read error", () => {
      process.env.QT_UPLOAD_PATH = "/uploads";
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("Permission denied");
      });

      const result = readUploadBytes("protected.txt");

      expect(result).toBeNull();
    });
  });
});
