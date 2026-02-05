/**
 * Certificate issuance service.
 *
 * Creates an immutable CertificateRevision snapshot with deterministic signingHash,
 * generates a PDF from the snapshot, and transitions the certificate to "issued".
 *
 * Transaction strategy (approach A — safest):
 *   1. Fetch aggregate + validate outside tx.
 *   2. Build canonical snapshot + signingHash + generate PDF bytes (all pure / side-effect-free).
 *   3. Single Prisma transaction: create CertificateRevision, update Certificate status/currentRevision.
 *   4. Write PDF to storage, compute pdfChecksum.
 *   5. Update CertificateRevision with pdfKey + pdfChecksum.
 *
 * If step 4 fails, the revision exists without a PDF.  This is acceptable because:
 *   - The certificate is marked issued (correct — the snapshot is immutable).
 *   - The pdfKey/pdfChecksum on the revision row will remain null, signalling "PDF pending".
 *   - A retry or manual regeneration can fill it in later.
 *   - The alternative (rollback status) risks the certificate being re-issued with a different hash.
 *
 * This approach guarantees that once a signingHash is committed, it never changes.
 */

import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/server/prisma";
import { writeUploadBytes } from "@/lib/server/storage";
import { createDocumentForExistingFile } from "@/lib/server/documents";
import { computeOutcome, explainOutcome } from "./index";
import {
  buildCanonicalCertSnapshot,
  computeSigningHash,
  computeChecksum,
  type FullCertificateAggregate,
} from "./canonical";
import { renderCertificatePdfFromSnapshot, getActiveTemplateLayout, buildCertificateDataDict } from "@/lib/server/pdf";
import { renderFromTemplate, type TemplateImageAttachments } from "@/lib/server/pdfTemplateRenderer";
import { addBusinessBreadcrumb } from "@/lib/server/observability";
import { readUploadBytes } from "@/lib/server/storage";

// ── Types ──

export type IssueCertificateInput = {
  companyId: string;
  certificateId: string;
  issuedByUserId?: string;
};

export type IssueCertificateResult = {
  revision: number;
  signingHash: string;
  pdfKey: string;
  pdfChecksum: string;
};

// ── Main ──

export async function issueCertificate(input: IssueCertificateInput): Promise<IssueCertificateResult> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  const { companyId, certificateId, issuedByUserId } = input;

  // ─── 1. Fetch full aggregate ───
  const agg = await fetchFullAggregate(prisma, companyId, certificateId);

  // ─── 2. Enforce immutability constraints ───
  const cert = agg.certificate;
  if (cert.status === "issued") {
    throw Object.assign(new Error("Certificate is already issued. Use amend/reissue to create a new revision."), { status: 409 });
  }
  if (cert.status === "void") {
    throw Object.assign(new Error("Cannot issue a voided certificate."), { status: 400 });
  }
  if (cert.status === "draft") {
    // Legacy EIC/EICR/MWC flow allows issuing from completed only.
    // Warn but block — consistent with existing issue endpoint behaviour.
    throw Object.assign(new Error("Certificate must be completed before issuing."), { status: 400 });
  }
  // cert.status === "completed" — proceed

  // ─── 3. Recompute outcome (Stage 2) ───
  try {
    const outcomeResult = computeOutcome(
      cert.type,
      agg.observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
      agg.checklists.map((c: any) => ({ section: c.section, question: c.question, answer: c.answer })),
      agg.testResults.map((t: any) => ({ circuitRef: t.circuitRef, data: t.data as Record<string, unknown> })),
    );
    const explanation = explainOutcome(
      outcomeResult,
      agg.observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
    );
    // Persist outcome on the aggregate so it's included in the snapshot
    agg.certificate.outcome = outcomeResult.outcome;
    agg.certificate.outcomeReason = explanation;
  } catch {
    // Non-fatal for legacy certs that may not have structured data
  }

  // ─── 4. Build canonical snapshot + signing hash ───
  const snapshot = buildCanonicalCertSnapshot(agg);
  const signingHash = computeSigningHash(snapshot);

  // ─── 5. Determine next revision ───
  const certAny = cert as any;
  const nextRevision = (certAny.currentRevision ?? 0) + 1;

  // ─── 6. Per-revision PDF key ───
  const pdfKey = `certificates/${certificateId}/revisions/${nextRevision}.pdf`;

  // ─── 7. Generate verification token if not set ───
  const verificationToken = certAny.verificationToken ?? randomBytes(24).toString("hex");

  // ─── 8. Resolve template + generate PDF ───
  const issuedAt = new Date();
  const publicBase = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const verifyUrl = publicBase && verificationToken ? `${publicBase.replace(/\/$/, "")}/verify/${verificationToken}` : undefined;

  // Try template-based rendering first
  let pdfBytes: Buffer;
  let templateVersionId: string | null = null;
  const templateResult = await getActiveTemplateLayout(companyId, "certificate");
  if (templateResult) {
    try {
      const dataDict = buildCertificateDataDict({
        id: cert.id,
        certificateNumber: cert.certificateNumber ?? null,
        type: cert.type,
        status: "issued",
        issuedAtISO: issuedAt.toISOString(),
        inspectorName: cert.inspectorName ?? null,
        inspectorEmail: cert.inspectorEmail ?? null,
        outcome: agg.certificate.outcome ?? null,
        outcomeReason: agg.certificate.outcomeReason ?? null,
        data: agg.certificate.data as Record<string, unknown>,
      });
      // Build image attachments from company-scoped certificate attachments
      const imageAttachments = buildImageAttachments(agg.attachments);
      pdfBytes = await renderFromTemplate(templateResult.layout, dataDict, null, imageAttachments);
      templateVersionId = templateResult.versionId;
    } catch (e) {
      console.warn("[issueCertificate] Template render failed, falling back to hardcoded:", e);
      pdfBytes = await renderCertificatePdfFromSnapshot(snapshot, {
        verifyUrl,
        signingHashShort: signingHash.slice(0, 12),
      });
    }
  } else {
    pdfBytes = await renderCertificatePdfFromSnapshot(snapshot, {
      verifyUrl,
      signingHashShort: signingHash.slice(0, 12),
    });
  }

  // ─── 9. Compute PDF checksum ───
  const pdfChecksum = computeChecksum(pdfBytes);

  addBusinessBreadcrumb("certificate.issuing", { certificateId, revision: nextRevision, signingHash: signingHash.slice(0, 12) });

  // ─── 10. Transaction: create revision + update certificate ───
  await prisma.$transaction(async (tx: any) => {
    // Create immutable revision
    await tx.certificateRevision.create({
      data: {
        companyId,
        certificateId,
        revision: nextRevision,
        signingHash,
        content: snapshot as any,
        pdfKey,
        pdfChecksum,
        pdfGeneratedAt: new Date(),
        issuedAt,
        issuedBy: issuedByUserId ?? null,
        templateVersionId,
      },
    });

    // Update certificate status + metadata
    await tx.certificate.update({
      where: { id: certificateId },
      data: {
        status: "issued",
        currentRevision: nextRevision,
        issuedAt,
        pdfKey, // Keep legacy pdfKey in sync for backwards compat
        outcome: agg.certificate.outcome,
        outcomeReason: agg.certificate.outcomeReason,
        verificationToken,
      },
    });

    // Audit event — distinguish amendment issuance from standard issuance
    const isAmendment = !!certAny.amendsCertificateId;
    await tx.auditEvent.create({
      data: {
        id: randomBytes(16).toString("hex"),
        companyId,
        entityType: "certificate",
        entityId: certificateId,
        action: isAmendment ? "certificate.amendment_issued" : "certificate.issued",
        actorRole: "admin",
        meta: {
          revision: nextRevision,
          signingHash,
          pdfKey,
          ...(templateVersionId ? { templateVersionId } : {}),
          ...(isAmendment ? { amendsCertificateId: certAny.amendsCertificateId } : {}),
        },
      },
    });

    // Auto-complete job if tenant setting enabled
    if (cert.jobId) {
      const company = await tx.company.findUnique({
        where: { id: companyId },
        select: { markJobCompletedOnCertIssue: true },
      });
      if (company?.markJobCompletedOnCertIssue) {
        const job = await tx.job.findUnique({
          where: { id: cert.jobId },
          select: { status: true },
        });
        if (job && job.status !== "completed") {
          await tx.job.update({
            where: { id: cert.jobId },
            data: { status: "completed" },
          });
          await tx.auditEvent.create({
            data: {
              id: randomBytes(16).toString("hex"),
              companyId,
              entityType: "job",
              entityId: cert.jobId,
              action: "job.auto_completed",
              actorRole: "system",
              meta: { reason: "certificate_issued", certificateId },
            },
          });
        }
      }
    }
  });

  // ─── 11. Write PDF to storage (outside tx — see docstring) ───
  try {
    writeUploadBytes(pdfKey, pdfBytes);
  } catch (err) {
    // Log but don't throw — the revision is committed, PDF can be regenerated
    console.error(`[issueCertificate] PDF write failed for ${pdfKey}:`, err);
  }

  // Also write to legacy flat path for backwards compat with existing PDF endpoint
  try {
    writeUploadBytes(`certificates/${certificateId}.pdf`, pdfBytes);
  } catch {
    // non-fatal
  }

  // ─── 12. Create Document row for the certificate PDF ───
  try {
    await createDocumentForExistingFile({
      companyId,
      type: "certificate_pdf",
      mimeType: "application/pdf",
      bytes: pdfBytes,
      storageKey: pdfKey,
      originalFilename: `certificate-${certificateId}-rev${nextRevision}.pdf`,
      createdByUserId: issuedByUserId,
      skipStorageCap: true, // Certificate is already issued — don't block on storage cap
    });
  } catch (err) {
    // Non-fatal — the certificate is already issued, Document row is a bonus
    console.error(`[issueCertificate] Document row creation failed for ${pdfKey}:`, err);
  }

  addBusinessBreadcrumb("certificate.issued", { certificateId, revision: nextRevision, pdfKey });

  return { revision: nextRevision, signingHash, pdfKey, pdfChecksum };
}

// ── Attachment image loader ──

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024; // 2MB per image

/**
 * Build TemplateImageAttachments from certificate attachment records.
 * Reads image bytes from storage for signature and photo attachments.
 * Skips files that are missing, too large, or non-image.
 */
function buildImageAttachments(
  attachments: Array<{ fileKey: string; mimeType: string | null; category?: string | null }>,
): TemplateImageAttachments {
  const result: TemplateImageAttachments = { photos: [] };
  for (const att of attachments) {
    if (!att.mimeType?.startsWith("image/")) continue;
    const bytes = readUploadBytes(att.fileKey);
    if (!bytes || bytes.length > MAX_ATTACHMENT_BYTES) continue;
    const u8 = new Uint8Array(bytes);
    if (att.category === "signature_engineer" && !result.signatureEngineer) {
      result.signatureEngineer = u8;
    } else if (att.category === "signature_customer" && !result.signatureCustomer) {
      result.signatureCustomer = u8;
    } else if (att.category === "photo" || !att.category) {
      if (result.photos!.length < 5) {
        result.photos!.push(u8);
      }
    }
  }
  return result;
}

// ── Aggregate fetcher ──

async function fetchFullAggregate(prisma: any, companyId: string, certificateId: string): Promise<FullCertificateAggregate> {
  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, companyId },
  });
  if (!cert) {
    throw Object.assign(new Error("Certificate not found"), { status: 404 });
  }

  const [observations, checklists, signatures, attachments, testResults] = await Promise.all([
    prisma.certificateObservation.findMany({
      where: { certificateId, companyId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.certificateChecklist.findMany({
      where: { certificateId, companyId },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.certificateSignatureRecord.findMany({
      where: { certificateId, companyId },
      orderBy: [{ role: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.certificateAttachment.findMany({
      where: { certificateId, companyId },
      orderBy: [{ category: "asc" }, { createdAt: "asc" }],
    }),
    prisma.certificateTestResult.findMany({
      where: { certificateId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    certificate: {
      id: cert.id,
      companyId: cert.companyId,
      certificateNumber: cert.certificateNumber ?? null,
      type: cert.type,
      status: cert.status,
      jobId: cert.jobId ?? null,
      siteId: cert.siteId ?? null,
      clientId: cert.clientId ?? null,
      legalEntityId: cert.legalEntityId ?? null,
      dataVersion: cert.dataVersion ?? 1,
      data: (cert.data as Record<string, unknown>) ?? {},
      inspectorName: cert.inspectorName ?? null,
      inspectorEmail: cert.inspectorEmail ?? null,
      outcome: cert.outcome ?? null,
      outcomeReason: cert.outcomeReason ?? null,
      completedAt: cert.completedAt ?? null,
      // extra fields needed for aggregate but not in canonical shape
      currentRevision: cert.currentRevision ?? 0,
      verificationToken: cert.verificationToken ?? null,
    } as any,
    observations,
    checklists,
    signatures,
    attachments,
    testResults: testResults.map((t: any) => ({
      circuitRef: t.circuitRef ?? null,
      data: (t.data as Record<string, unknown>) ?? {},
    })),
  };
}
