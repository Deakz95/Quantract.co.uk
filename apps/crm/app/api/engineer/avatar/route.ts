import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
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
 * PUT /api/engineer/avatar
 * Upload or replace the logged-in engineer's profile picture.
 */
export const PUT = withRequestLogging(
  async function PUT(req: Request) {
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

      // Resolve engineer for current user
      const engineer = await prisma.engineer.findFirst({
        where: {
          OR: [
            { users: { some: { id: authCtx.userId } } },
            { email: authCtx.email },
          ],
          companyId: cid,
        },
        select: { id: true, avatarDocumentId: true },
      });
      if (!engineer) {
        return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 404 });
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

      await prisma.engineer.update({
        where: { id: engineer.id },
        data: { avatarDocumentId: doc.id },
      });

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
      logError(error, { route: "/api/engineer/avatar", action: "put" });
      return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }
  },
);
