/**
 * Documents platform — server helpers.
 *
 * Provides functions to create, read, and generate signed URLs for Document records.
 * Documents are the canonical registry for all generated/uploaded files.
 *
 * Storage metering: both createDocument and createDocumentForExistingFile enforce
 * storage caps and atomically increment CompanyStorageUsage within a transaction.
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/server/prisma";
import { writeUploadBytes, readUploadBytes } from "@/lib/server/storage";
import { computeEntitlements } from "@/lib/entitlements";
import { type Module } from "@/lib/billing/plans";

// ── Storage Limit Error ──

export class StorageLimitError extends Error {
  readonly code = "STORAGE_LIMIT_EXCEEDED";
  readonly status = 413;
  readonly bytesUsed: number;
  readonly bytesLimit: number;
  readonly bytesNeeded: number;

  constructor(opts: { bytesUsed: number; bytesLimit: number; bytesNeeded: number }) {
    super(`Storage limit exceeded: ${opts.bytesUsed} + ${opts.bytesNeeded} > ${opts.bytesLimit}`);
    this.name = "StorageLimitError";
    this.bytesUsed = opts.bytesUsed;
    this.bytesLimit = opts.bytesLimit;
    this.bytesNeeded = opts.bytesNeeded;
  }
}

// ── Storage enforcement helpers ──

async function getStorageLimitBytes(tx: any, companyId: string): Promise<number> {
  const company = await tx.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      billing: {
        select: {
          plan: true,
          enabledModules: true,
          extraStorageMB: true,
        },
      },
    },
  });
  if (!company) throw new Error("Company not found");

  const billing = company.billing;
  const entitlements = computeEntitlements(billing?.plan || company.plan, {
    enabledModules: (billing?.enabledModules as Module[]) || [],
    extraStorageMB: billing?.extraStorageMB || 0,
  });

  const limitMb = entitlements.limit_storage_mb as number;
  if (limitMb === Infinity) return Infinity;
  return limitMb * 1024 * 1024; // Convert MB → bytes
}

/**
 * Enforce storage cap within a transaction.
 * Reads current usage + checks against entitlements limit.
 * Throws StorageLimitError if cap would be exceeded.
 */
async function enforceStorageCap(tx: any, companyId: string, additionalBytes: number): Promise<void> {
  const limitBytes = await getStorageLimitBytes(tx, companyId);
  if (limitBytes === Infinity) return; // Enterprise — no cap

  const usage = await tx.companyStorageUsage.findUnique({
    where: { companyId },
    select: { bytesUsed: true },
  });
  const currentBytes = Number(usage?.bytesUsed ?? 0);

  if (currentBytes + additionalBytes > limitBytes) {
    throw new StorageLimitError({
      bytesUsed: currentBytes,
      bytesLimit: limitBytes,
      bytesNeeded: additionalBytes,
    });
  }
}

/**
 * Atomically increment storage usage via upsert.
 */
async function incrementStorageUsage(tx: any, companyId: string, bytes: number): Promise<void> {
  await tx.companyStorageUsage.upsert({
    where: { companyId },
    create: { companyId, bytesUsed: BigInt(bytes) },
    update: { bytesUsed: { increment: BigInt(bytes) } },
  });
}

/**
 * Atomically decrement storage usage via update (clamped to 0).
 * Used when soft-deleting documents so usage stays accurate between reconciliation runs.
 */
export async function decrementStorageUsage(tx: any, companyId: string, bytes: number): Promise<void> {
  const current = await tx.companyStorageUsage.findUnique({
    where: { companyId },
    select: { bytesUsed: true },
  });
  const currentBytes = Number(current?.bytesUsed ?? 0);
  const newBytes = Math.max(0, currentBytes - bytes);
  await tx.companyStorageUsage.upsert({
    where: { companyId },
    create: { companyId, bytesUsed: BigInt(newBytes) },
    update: { bytesUsed: BigInt(newBytes) },
  });
}

/**
 * Soft-delete a document: set deletedAt and decrement storage usage.
 * Returns the updated document or null if not found / already deleted.
 */
export async function softDeleteDocument(
  documentId: string,
  companyId: string,
): Promise<DocumentRecord | null> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  return prisma.$transaction(async (tx: any) => {
    const doc = await tx.document.findFirst({
      where: { id: documentId, companyId, deletedAt: null },
    });
    if (!doc) return null;

    const updated = await tx.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    await decrementStorageUsage(tx, companyId, doc.sizeBytes);
    return updated as DocumentRecord;
  });
}

// ── Types ──

export type CreateDocumentInput = {
  companyId: string;
  type: string;
  mimeType: string;
  bytes: Buffer;
  originalFilename?: string;
  createdByUserId?: string;
  /** Override auto-generated storage key */
  storageKey?: string;
  /** Skip storage cap enforcement (e.g. for system-generated documents) */
  skipStorageCap?: boolean;
};

export type DocumentRecord = {
  id: string;
  companyId: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  storageProvider: string;
  storageKey: string;
  externalUrl: string | null;
  originalFilename: string | null;
  createdByUserId: string | null;
  createdAt: Date;
};

// ── Signing secret ──

function getSigningSecret(): string {
  const secret = process.env.QT_DOCUMENT_SIGNING_SECRET;
  if (!secret) {
    throw new Error("QT_DOCUMENT_SIGNING_SECRET environment variable is required");
  }
  return secret;
}

// ── Helpers ──

function computeSha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// ── Create ──

export async function createDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  const { companyId, type, mimeType, bytes, originalFilename, createdByUserId, storageKey: overrideKey, skipStorageCap } = input;

  const sha256 = computeSha256(bytes);
  const sizeBytes = bytes.length;

  // Write to storage first (outside tx — can be cleaned up if tx fails)
  let storageKey: string;
  if (overrideKey) {
    writeUploadBytes(overrideKey, bytes);
    storageKey = overrideKey;
  } else {
    storageKey = writeUploadBytes(bytes, { ext: mimeType.split("/")[1] || "bin", prefix: `documents/${companyId}` });
  }

  // Transaction: enforce cap → create document → increment usage
  const doc = await prisma.$transaction(async (tx: any) => {
    if (!skipStorageCap) {
      await enforceStorageCap(tx, companyId, sizeBytes);
    }

    const created = await tx.document.create({
      data: {
        companyId,
        type,
        mimeType,
        sizeBytes,
        sha256,
        storageProvider: "internal",
        storageKey,
        originalFilename: originalFilename ?? null,
        createdByUserId: createdByUserId ?? null,
      },
    });

    await incrementStorageUsage(tx, companyId, sizeBytes);
    return created;
  });

  return doc as DocumentRecord;
}

/**
 * Create a Document row for bytes that are already written to storage.
 * Use this when the storage write has already happened (e.g., certificate issuance).
 */
export async function createDocumentForExistingFile(input: {
  companyId: string;
  type: string;
  mimeType: string;
  bytes: Buffer;
  storageKey: string;
  originalFilename?: string;
  createdByUserId?: string;
  skipStorageCap?: boolean;
}): Promise<DocumentRecord> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  const sha256 = computeSha256(input.bytes);
  const sizeBytes = input.bytes.length;

  const doc = await prisma.$transaction(async (tx: any) => {
    if (!input.skipStorageCap) {
      await enforceStorageCap(tx, input.companyId, sizeBytes);
    }

    const created = await tx.document.create({
      data: {
        companyId: input.companyId,
        type: input.type,
        mimeType: input.mimeType,
        sizeBytes,
        sha256,
        storageProvider: "internal",
        storageKey: input.storageKey,
        originalFilename: input.originalFilename ?? null,
        createdByUserId: input.createdByUserId ?? null,
      },
    });

    await incrementStorageUsage(tx, input.companyId, sizeBytes);
    return created;
  });

  return doc as DocumentRecord;
}

/**
 * Create a Document row that references an external URL (BYOS).
 * No storage write, no cap enforcement — the file is hosted externally.
 * The externalUrl must be https to prevent open-redirect abuse.
 */
export async function createExternalDocument(input: {
  companyId: string;
  type: string;
  mimeType: string;
  externalUrl: string;
  originalFilename?: string;
  createdByUserId?: string;
}): Promise<DocumentRecord> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  // Validate https-only scheme
  if (!input.externalUrl.startsWith("https://")) {
    throw new Error("External URL must use HTTPS");
  }

  const doc = await prisma.document.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      mimeType: input.mimeType,
      sizeBytes: 0,
      sha256: "external",
      storageProvider: "external_url",
      storageKey: "external",
      externalUrl: input.externalUrl,
      originalFilename: input.originalFilename ?? null,
      createdByUserId: input.createdByUserId ?? null,
    },
  });

  return doc as DocumentRecord;
}

// ── Read ──

export async function getDocumentBytes(
  documentId: string,
  companyId: string,
): Promise<{ document: DocumentRecord; bytes: Buffer } | null> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  const doc = await prisma.document.findFirst({
    where: { id: documentId, companyId },
  });
  if (!doc) return null;

  const bytes = readUploadBytes(doc.storageKey);
  if (!bytes) return null;

  return { document: doc as DocumentRecord, bytes };
}

// ── Signed URL ──

const DEFAULT_EXPIRY_SECONDS = 300; // 5 minutes

export function createSignedUrl(
  documentId: string,
  expiresInSeconds: number = DEFAULT_EXPIRY_SECONDS,
): string {
  const secret = getSigningSecret();
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = `${documentId}:${expires}`;
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `/api/documents/${documentId}?token=${signature}&expires=${expires}`;
}

export function verifySignedToken(
  documentId: string,
  token: string,
  expires: string,
): boolean {
  const secret = getSigningSecret();
  const expiresNum = parseInt(expires, 10);
  if (isNaN(expiresNum)) return false;

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > expiresNum) return false;

  // Constant-time comparison
  const payload = `${documentId}:${expiresNum}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}
