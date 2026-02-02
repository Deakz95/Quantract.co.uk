/**
 * Certificate export bundle generator.
 *
 * Produces a ZIP archive suitable for regulator/audit workflows (NICEIC, NAPIT, etc.)
 * containing PDFs, canonical JSON snapshots, a CSV summary, and a manifest with checksums.
 *
 * schemaVersion "1.0.0" — changes to the JSON/manifest shape that remove or rename fields
 * should bump the major version. Additive fields bump the minor version.
 */

import { createHash } from "node:crypto";
import JSZip from "jszip";
import { getPrisma } from "@/lib/server/prisma";
import { readUploadBytes, writeUploadBytes } from "@/lib/server/storage";
import { renderCertificatePdfFromSnapshot } from "@/lib/server/pdf";
import { computeChecksum } from "./canonical";

// ── Constants ──

const SCHEMA_VERSION = "1.0.0";
const MAX_REVISIONS = 500;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024; // 200 MB safety cap

// ── Types ──

export type ExportFilters = {
  issuedFrom: string; // ISO date yyyy-mm-dd
  issuedTo: string;   // ISO date yyyy-mm-dd
  includeAllRevisions?: boolean;
  types?: string[];
  status?: string[];  // e.g. ["completed", "issued"]
};

export type ExportResult = {
  filename: string;
  bytes: Uint8Array;
};

type RevisionRow = {
  id: string;
  certificateId: string;
  revision: number;
  signingHash: string;
  content: any;
  pdfKey: string | null;
  pdfChecksum: string | null;
  pdfGeneratedAt: Date | null;
  issuedAt: Date;
  issuedBy: string | null;
  certificate: {
    id: string;
    certificateNumber: string | null;
    type: string;
    status: string;
    jobId: string | null;
    outcome: string | null;
    outcomeReason: string | null;
    verificationToken: string | null;
    currentRevision: number;
  };
};

type ManifestFile = {
  path: string;
  sha256: string;
};

// ── Main ──

export async function exportCertificatesZip(opts: {
  companyId: string;
  filters: ExportFilters;
  requestedByUserId?: string;
}): Promise<ExportResult> {
  const { companyId, filters } = opts;

  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  // Parse date boundaries (inclusive)
  const fromDate = new Date(`${filters.issuedFrom}T00:00:00.000Z`);
  const toDate = new Date(`${filters.issuedTo}T23:59:59.999Z`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    throw Object.assign(new Error("Invalid date range"), { status: 400 });
  }
  if (fromDate > toDate) {
    throw Object.assign(new Error("issuedFrom must be before issuedTo"), { status: 400 });
  }

  // ── Query revisions ──
  const whereClause: any = {
    companyId,
    issuedAt: { gte: fromDate, lte: toDate },
    certificate: {
      companyId,
      status: filters.status?.length ? { in: filters.status } : "issued",
      currentRevision: { gt: 0 },
    },
  };

  if (filters.types && filters.types.length > 0) {
    whereClause.certificate.type = { in: filters.types };
  }

  let revisions: RevisionRow[];

  if (filters.includeAllRevisions) {
    // All revisions in range
    revisions = await prisma.certificateRevision.findMany({
      where: whereClause,
      include: {
        certificate: {
          select: {
            id: true,
            certificateNumber: true,
            type: true,
            status: true,
            jobId: true,
            outcome: true,
            outcomeReason: true,
            verificationToken: true,
            currentRevision: true,
          },
        },
      },
      orderBy: [{ issuedAt: "asc" }, { revision: "asc" }],
    }) as any;
  } else {
    // Latest revision per certificate in range.
    // First get distinct certificateIds that have revisions in range
    const allInRange = await prisma.certificateRevision.findMany({
      where: whereClause,
      select: { certificateId: true, revision: true },
      orderBy: [{ certificateId: "asc" }, { revision: "desc" }],
    }) as any[];

    // Pick latest revision per certificateId
    const latestMap = new Map<string, number>();
    for (const r of allInRange) {
      if (!latestMap.has(r.certificateId)) {
        latestMap.set(r.certificateId, r.revision);
      }
    }

    if (latestMap.size === 0) {
      return buildEmptyZip(companyId, filters);
    }

    // Fetch full rows for just those latest revisions
    const orConditions = Array.from(latestMap.entries()).map(([certId, rev]) => ({
      certificateId: certId,
      revision: rev,
    }));

    revisions = await prisma.certificateRevision.findMany({
      where: {
        companyId,
        OR: orConditions,
        certificate: {
          companyId,
          status: filters.status?.length ? { in: filters.status } : "issued",
          currentRevision: { gt: 0 },
        },
      },
      include: {
        certificate: {
          select: {
            id: true,
            certificateNumber: true,
            type: true,
            status: true,
            jobId: true,
            outcome: true,
            outcomeReason: true,
            verificationToken: true,
            currentRevision: true,
          },
        },
      },
      orderBy: [{ issuedAt: "asc" }, { revision: "asc" }],
    }) as any;
  }

  // ── Size guard ──
  if (revisions.length > MAX_REVISIONS) {
    throw Object.assign(
      new Error(
        `Export would include ${revisions.length} revisions, exceeding the limit of ${MAX_REVISIONS}. Narrow your date range or filter by certificate type.`,
      ),
      { status: 400 },
    );
  }

  if (revisions.length === 0) {
    return buildEmptyZip(companyId, filters);
  }

  // ── Build ZIP ──
  const zip = new JSZip();
  const manifestFiles: ManifestFile[] = [];
  const csvRows: string[][] = [];
  const exportedAt = new Date().toISOString();
  let totalBytes = 0;

  for (const rev of revisions) {
    const cert = rev.certificate;
    const safeCertNum = sanitizeFilename(cert.certificateNumber || cert.id.slice(0, 12));
    const baseName = `${safeCertNum}_rev${rev.revision}`;
    const snapshot = rev.content as Record<string, unknown>;

    // ── JSON export ──
    const jsonPayload = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      companyId,
      certificateId: cert.id,
      certificateNumber: cert.certificateNumber ?? null,
      type: cert.type,
      revision: rev.revision,
      issuedAt: rev.issuedAt.toISOString(),
      issuedBy: rev.issuedBy ?? null,
      signingHash: rev.signingHash,
      pdfChecksum: rev.pdfChecksum ?? null,
      verificationToken: cert.verificationToken ?? null,
      outcome: cert.outcome ?? null,
      outcomeReason: cert.outcomeReason ?? null,
      snapshot,
    };

    const jsonBytes = Buffer.from(JSON.stringify(jsonPayload, null, 2), "utf-8");
    const jsonPath = `json/${baseName}.json`;
    zip.file(jsonPath, jsonBytes);
    manifestFiles.push({ path: jsonPath, sha256: sha256(jsonBytes) });
    totalBytes += jsonBytes.byteLength;

    // ── PDF ──
    let pdfBytes = rev.pdfKey ? readUploadBytes(rev.pdfKey) : null;

    if (!pdfBytes) {
      // Self-heal: regenerate from snapshot
      try {
        pdfBytes = await renderCertificatePdfFromSnapshot(snapshot as any);
        if (pdfBytes && rev.pdfKey) {
          writeUploadBytes(rev.pdfKey, pdfBytes);
        }
        // Update revision record with regenerated PDF info
        const checksum = pdfBytes ? computeChecksum(pdfBytes) : null;
        if (pdfBytes) {
          const pdfKey = rev.pdfKey || `certificates/${cert.id}/revisions/${rev.revision}.pdf`;
          if (!rev.pdfKey) {
            writeUploadBytes(pdfKey, pdfBytes);
          }
          await prisma.certificateRevision.update({
            where: { id: rev.id },
            data: {
              pdfKey,
              pdfChecksum: checksum,
              pdfGeneratedAt: new Date(),
            },
          }).catch(() => { /* non-fatal */ });
          // Update manifest entry checksum
          jsonPayload.pdfChecksum = checksum;
        }
      } catch (err) {
        console.error(`[export] PDF regen failed for rev ${rev.id}:`, err);
        // Continue without PDF for this revision
      }
    }

    if (pdfBytes) {
      const pdfPath = `pdf/${baseName}.pdf`;
      zip.file(pdfPath, pdfBytes);
      manifestFiles.push({ path: pdfPath, sha256: sha256(pdfBytes) });
      totalBytes += pdfBytes.byteLength;
    }

    // ── Size cap (checked after each revision to fail fast) ──
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw Object.assign(
        new Error(
          `Export exceeds the ${Math.round(MAX_TOTAL_BYTES / 1024 / 1024)} MB size limit. Narrow your date range or filter by certificate type.`,
        ),
        { status: 400 },
      );
    }

    // ── CSV row ──
    const customerName = extractField(snapshot, "clientName", "data.clientName", "data.overview.clientName") || "";
    const address = extractField(snapshot, "installationAddress", "data.installationAddress", "data.overview.installationAddress") || "";

    csvRows.push([
      csvEscape(cert.certificateNumber ?? ""),
      csvEscape(cert.type),
      String(rev.revision),
      rev.issuedAt.toISOString(),
      csvEscape(cert.outcome ?? ""),
      rev.signingHash,
      rev.pdfChecksum ?? "",
      csvEscape(cert.jobId ?? ""),
      csvEscape(customerName),
      csvEscape(address),
      csvEscape(cert.verificationToken ?? ""),
    ]);
  }

  // ── CSV file ──
  const csvHeader = "certificateNumber,type,revision,issuedAt,outcome,signingHash,pdfChecksum,jobId,customerName,address,verificationToken";
  const csvContent = [csvHeader, ...csvRows.map((r) => r.join(","))].join("\n");
  const csvBytes = Buffer.from(csvContent, "utf-8");
  const csvPath = "csv/summary.csv";
  zip.file(csvPath, csvBytes);
  manifestFiles.push({ path: csvPath, sha256: sha256(csvBytes) });

  // ── Unique certificate count ──
  const uniqueCerts = new Set(revisions.map((r) => r.certificateId));

  // ── Manifest ──
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    companyId,
    filters: {
      issuedFrom: filters.issuedFrom,
      issuedTo: filters.issuedTo,
      includeAllRevisions: filters.includeAllRevisions ?? false,
      ...(filters.types && filters.types.length > 0 ? { types: filters.types } : {}),
    },
    counts: {
      certificates: uniqueCerts.size,
      revisions: revisions.length,
    },
    files: [] as ManifestFile[],
  };

  // Add all files so far to manifest, then compute manifest's own hash
  manifest.files = [...manifestFiles];
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
  const manifestHash = sha256(manifestBytes);
  manifest.files.push({ path: "manifest.json", sha256: manifestHash });

  // Re-serialize with self-referencing hash
  const finalManifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
  zip.file("manifest.json", finalManifestBytes);

  // ── Generate ZIP ──
  const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });

  const dateSlug = `${filters.issuedFrom}_to_${filters.issuedTo}`.replace(/-/g, "");
  const filename = `certificates_export_${dateSlug}.zip`;

  return { filename, bytes: zipBytes };
}

// ── Helpers ──

function sha256(data: Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 60);
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Extract a field from a nested snapshot object.
 * Tries multiple dot-separated paths and returns the first truthy string.
 */
function extractField(snapshot: Record<string, unknown>, ...paths: string[]): string | null {
  for (const path of paths) {
    const parts = path.split(".");
    let current: any = snapshot;
    for (const part of parts) {
      if (current == null || typeof current !== "object") { current = undefined; break; }
      current = current[part];
    }
    if (typeof current === "string" && current.trim()) return current.trim();
  }
  return null;
}

async function buildEmptyZip(companyId: string, filters: ExportFilters): Promise<ExportResult> {
  const zip = new JSZip();
  const exportedAt = new Date().toISOString();

  const csvHeader = "certificateNumber,type,revision,issuedAt,outcome,signingHash,pdfChecksum,jobId,customerName,address,verificationToken";
  const csvBytes = Buffer.from(csvHeader + "\n", "utf-8");
  zip.file("csv/summary.csv", csvBytes);

  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    companyId,
    filters: {
      issuedFrom: filters.issuedFrom,
      issuedTo: filters.issuedTo,
      includeAllRevisions: filters.includeAllRevisions ?? false,
    },
    counts: { certificates: 0, revisions: 0 },
    files: [
      { path: "csv/summary.csv", sha256: sha256(csvBytes) },
      { path: "manifest.json", sha256: "" }, // placeholder
    ],
  };

  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
  manifest.files[1].sha256 = sha256(manifestBytes);
  const finalManifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), "utf-8");
  zip.file("manifest.json", finalManifestBytes);

  const zipBytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const dateSlug = `${filters.issuedFrom}_to_${filters.issuedTo}`.replace(/-/g, "");
  return { filename: `certificates_export_${dateSlug}.zip`, bytes: zipBytes };
}
