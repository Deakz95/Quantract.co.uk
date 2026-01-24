import fs from "node:fs";
import path from "node:path";

/**
 * Simple local storage for generated PDFs.
 *
 * Production note: for serverless deployments (e.g. Vercel), replace this with S3/R2/etc.
 */

export function uploadRoot() {
  return process.env.QT_UPLOAD_PATH || path.join(process.cwd(), ".qt-uploads");
}

export function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export function writeUploadBytes(
  relPathOrBytes: string | Buffer,
  bytesOrOpts?: Buffer | { ext?: string; prefix?: string }
): string {
  let relPath: string;
  let bytes: Buffer;

  if (typeof relPathOrBytes === "string") {
    relPath = relPathOrBytes;
    bytes = Buffer.from(bytesOrOpts as Buffer);
  } else {
    bytes = Buffer.from(relPathOrBytes);
    const opts = (bytesOrOpts as any) || {};
    const ext = String(opts.ext || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const prefix = String(opts.prefix || "uploads").replace(/[^a-z0-9_\/-]/gi, "");
    const rand = Math.random().toString(16).slice(2);
    relPath = path.join(prefix, `${Date.now()}-${rand}.${ext}`);
  }

  const root = uploadRoot();
  const full = path.join(root, relPath);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, bytes);
  return relPath;
}

export function readUploadBytes(relPath: string): Buffer | null {
  const full = path.join(uploadRoot(), relPath);
  try {
    return fs.readFileSync(full);
  } catch {
    return null;
  }
}
