/**
 * Certificate amendment service.
 *
 * Creates a new draft certificate that amends an existing issued certificate.
 * The new cert copies the original's data, job/site/client links, and structured
 * data (observations, checklists, signatures) so the user can edit and re-issue.
 *
 * The original certificate remains unchanged and immutable.
 */

import { randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/server/prisma";
import { addBusinessBreadcrumb } from "@/lib/server/observability";

// ── Types ──

export type CreateAmendmentInput = {
  companyId: string;
  certificateId: string;
  createdByUserId?: string;
};

export type CreateAmendmentResult = {
  amendmentId: string;
};

// ── Main ──

export async function createCertificateAmendment(
  input: CreateAmendmentInput,
): Promise<CreateAmendmentResult> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  const { companyId, certificateId, createdByUserId } = input;

  // Fetch the original certificate
  const original = await prisma.certificate.findFirst({
    where: { id: certificateId, companyId },
    include: {
      observations: { where: { companyId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      checklists: { where: { companyId }, orderBy: [{ section: "asc" }, { sortOrder: "asc" }] },
      signatureRecords: { where: { companyId }, orderBy: [{ role: "asc" }, { sortOrder: "asc" }] },
    },
  });

  if (!original) {
    throw Object.assign(new Error("Certificate not found"), { status: 404 });
  }

  if (original.status !== "issued") {
    throw Object.assign(
      new Error("Only issued certificates can be amended."),
      { status: 400 },
    );
  }

  // Check for existing in-progress amendment (draft/completed)
  const existingAmendment = await prisma.certificate.findFirst({
    where: {
      companyId,
      amendsCertificateId: certificateId,
      status: { in: ["draft", "completed"] },
    },
    select: { id: true, status: true },
  });

  if (existingAmendment) {
    throw Object.assign(
      new Error(
        `An amendment is already in progress (${existingAmendment.status}). Complete or void it before creating another.`,
      ),
      { status: 409 },
    );
  }

  // Create the amendment draft in a transaction
  const amendmentId = crypto.randomUUID();

  await prisma.$transaction(async (tx: any) => {
    // Create the new certificate as a draft amendment
    await tx.certificate.create({
      data: {
        id: amendmentId,
        companyId,
        legalEntityId: original.legalEntityId,
        jobId: original.jobId,
        siteId: original.siteId,
        clientId: original.clientId,
        type: original.type,
        status: "draft",
        certificateNumber: original.certificateNumber,
        inspectorName: original.inspectorName,
        inspectorEmail: original.inspectorEmail,
        dataVersion: original.dataVersion,
        data: original.data as any,
        amendsCertificateId: certificateId,
      },
    });

    // Copy observations
    for (const obs of original.observations) {
      await tx.certificateObservation.create({
        data: {
          companyId,
          certificateId: amendmentId,
          code: obs.code,
          location: obs.location,
          description: obs.description,
          regulation: obs.regulation,
          fixGuidance: obs.fixGuidance,
          resolvedAt: obs.resolvedAt,
          sortOrder: obs.sortOrder,
        },
      });
    }

    // Copy checklists
    for (const cl of original.checklists) {
      await tx.certificateChecklist.create({
        data: {
          companyId,
          certificateId: amendmentId,
          section: cl.section,
          question: cl.question,
          answer: cl.answer,
          notes: cl.notes,
          sortOrder: cl.sortOrder,
        },
      });
    }

    // Copy signature records (clear signed data — they need to re-sign)
    for (const sig of original.signatureRecords) {
      await tx.certificateSignatureRecord.create({
        data: {
          companyId,
          certificateId: amendmentId,
          role: sig.role,
          signerName: sig.signerName,
          signerEmail: sig.signerEmail,
          qualification: sig.qualification,
          sortOrder: sig.sortOrder,
          // Intentionally omit signatureText and signedAt — amendment needs fresh signatures
        },
      });
    }

    // Audit event
    await tx.auditEvent.create({
      data: {
        id: randomBytes(16).toString("hex"),
        companyId,
        entityType: "certificate",
        entityId: amendmentId,
        action: "certificate.amendment_created",
        actorRole: "admin",
        meta: {
          amendsCertificateId: certificateId,
          originalCertificateNumber: original.certificateNumber,
          ...(createdByUserId ? { createdBy: createdByUserId } : {}),
        },
      },
    });
  });

  addBusinessBreadcrumb("certificate.amendment_created", {
    amendmentId,
    originalCertificateId: certificateId,
    originalCertificateNumber: original.certificateNumber,
  });

  return { amendmentId };
}
