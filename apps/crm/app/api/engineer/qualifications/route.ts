import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { createDocument, createSignedUrl, StorageLimitError } from "@/lib/server/documents";

export const runtime = "nodejs";

const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/** Resolve the engineer record for the logged-in user. */
async function resolveEngineer(prisma: any, userId: string, email: string, companyId: string) {
  return prisma.engineer.findFirst({
    where: {
      OR: [
        { users: { some: { id: userId } } },
        { email },
      ],
      companyId,
    },
    select: { id: true },
  });
}

/**
 * GET /api/engineer/qualifications
 * List the logged-in engineer's qualifications.
 */
export const GET = withRequestLogging(
  async function GET() {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "engineer" && role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const cid = authCtx.companyId;
      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const engineer = await resolveEngineer(prisma, authCtx.userId, authCtx.email, cid);
      if (!engineer) {
        return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 404 });
      }

      const qualifications = await prisma.engineerQualification.findMany({
        where: { engineerId: engineer.id, companyId: cid, deletedAt: null },
        orderBy: { createdAt: "desc" },
        include: {
          document: { select: { id: true, mimeType: true, originalFilename: true, sizeBytes: true } },
        },
      });

      const items = qualifications.map((q: any) => ({
        id: q.id,
        name: q.name,
        type: q.type,
        issuer: q.issuer,
        certificateNumber: q.certificateNumber,
        issueDate: q.issueDate?.toISOString() ?? null,
        expiryDate: q.expiryDate?.toISOString() ?? null,
        notes: q.notes,
        createdAt: q.createdAt.toISOString(),
        document: q.document
          ? { id: q.document.id, mimeType: q.document.mimeType, originalFilename: q.document.originalFilename, sizeBytes: q.document.sizeBytes, url: createSignedUrl(q.document.id, 3600) }
          : null,
      }));

      return NextResponse.json({ ok: true, qualifications: items });
    } catch (error: any) {
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      logError(error, { route: "/api/engineer/qualifications", action: "get" });
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
  },
);

/**
 * POST /api/engineer/qualifications
 * Add a qualification to the logged-in engineer's profile.
 */
export const POST = withRequestLogging(
  async function POST(req: Request) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "engineer" && role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const cid = authCtx.companyId;
      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const engineer = await resolveEngineer(prisma, authCtx.userId, authCtx.email, cid);
      if (!engineer) {
        return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 404 });
      }

      const formData = await req.formData();
      const metadataRaw = formData.get("metadata");
      if (!metadataRaw || typeof metadataRaw !== "string") {
        return NextResponse.json({ ok: false, error: "Missing metadata field" }, { status: 400 });
      }

      let metadata: any;
      try {
        metadata = JSON.parse(metadataRaw);
      } catch {
        return NextResponse.json({ ok: false, error: "Invalid metadata JSON" }, { status: 400 });
      }

      if (!metadata.name || typeof metadata.name !== "string") {
        return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
      }

      let documentId: string | null = null;
      const file = formData.get("file");
      if (file && file instanceof File && file.size > 0) {
        if (!ALLOWED_DOC_TYPES.has(file.type)) {
          return NextResponse.json(
            { ok: false, error: `Invalid file type: ${file.type}. Allowed: PDF, JPEG, PNG, WebP` },
            { status: 400 },
          );
        }
        if (file.size > MAX_SIZE_BYTES) {
          return NextResponse.json({ ok: false, error: "File exceeds 10MB limit" }, { status: 400 });
        }

        const bytes = Buffer.from(await file.arrayBuffer());
        const doc = await createDocument({
          companyId: cid,
          type: "engineer_qualification",
          mimeType: file.type,
          bytes,
          originalFilename: file.name || "certificate",
          createdByUserId: authCtx.userId,
        });
        documentId = doc.id;
      }

      const qualification = await prisma.engineerQualification.create({
        data: {
          companyId: cid,
          engineerId: engineer.id,
          name: metadata.name,
          type: metadata.type || null,
          issuer: metadata.issuer || null,
          certificateNumber: metadata.certificateNumber || null,
          issueDate: metadata.issueDate ? new Date(metadata.issueDate) : null,
          expiryDate: metadata.expiryDate ? new Date(metadata.expiryDate) : null,
          notes: metadata.notes || null,
          documentId,
        },
      });

      return NextResponse.json({
        ok: true,
        qualification: {
          id: qualification.id,
          name: qualification.name,
          type: qualification.type,
          issuer: qualification.issuer,
          certificateNumber: qualification.certificateNumber,
          issueDate: qualification.issueDate?.toISOString() ?? null,
          expiryDate: qualification.expiryDate?.toISOString() ?? null,
          notes: qualification.notes,
          createdAt: qualification.createdAt.toISOString(),
          documentId: qualification.documentId,
        },
      });
    } catch (error: any) {
      if (error instanceof StorageLimitError) {
        return NextResponse.json(
          { ok: false, error: "storage_limit_exceeded", bytesUsed: error.bytesUsed, bytesLimit: error.bytesLimit },
          { status: 413 },
        );
      }
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      logError(error, { route: "/api/engineer/qualifications", action: "post" });
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
  },
);
