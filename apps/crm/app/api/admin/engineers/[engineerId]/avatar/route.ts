import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { createDocument, createSignedUrl, softDeleteDocument, StorageLimitError } from "@/lib/server/documents";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * PUT /api/admin/engineers/[engineerId]/avatar
 * Upload or replace an engineer's profile picture.
 * Accepts multipart/form-data with a 'file' field.
 */
export const PUT = withRequestLogging(
  async function PUT(req: Request, ctx: { params: Promise<{ engineerId: string }> }) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const { engineerId } = await getRouteParams(ctx);
      const cid = authCtx.companyId;
      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const engineer = await prisma.engineer.findFirst({
        where: { id: engineerId, companyId: cid },
        select: { id: true, avatarDocumentId: true },
      });
      if (!engineer) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "no_file_uploaded" }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { ok: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, HEIC` },
          { status: 400 },
        );
      }

      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ ok: false, error: "File exceeds 5MB limit" }, { status: 400 });
      }

      const bytes = Buffer.from(await file.arrayBuffer());

      const doc = await createDocument({
        companyId: cid,
        type: "engineer_avatar",
        mimeType: file.type,
        bytes,
        originalFilename: file.name || "avatar",
        createdByUserId: authCtx.userId,
      });

      // Update engineer to point to new avatar
      await prisma.engineer.update({
        where: { id: engineerId },
        data: { avatarDocumentId: doc.id },
      });

      // Soft-delete old avatar document if replacing
      if (engineer.avatarDocumentId) {
        await softDeleteDocument(engineer.avatarDocumentId, cid).catch(() => null);
      }

      const avatarUrl = createSignedUrl(doc.id, 3600);

      return NextResponse.json({ ok: true, avatarUrl, documentId: doc.id });
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
      logError(error, { route: "/api/admin/engineers/[engineerId]/avatar", action: "put" });
      return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }
  },
);
