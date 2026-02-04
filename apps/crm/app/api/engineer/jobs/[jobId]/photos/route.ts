import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { createDocument, StorageLimitError } from "@/lib/server/documents";

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
 * POST /api/engineer/jobs/[jobId]/photos
 * Upload a photo to a job. Creates a Document record.
 * Accepts multipart/form-data with a 'file' field.
 */
export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "engineer" && role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const { jobId } = await getRouteParams(ctx);
      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      // Verify the engineer is assigned to this job
      const engineer = await prisma.engineer.findFirst({
        where: {
          companyId: authCtx.companyId,
          OR: [
            { email: authCtx.email },
            { users: { some: { id: authCtx.userId } } },
          ],
        },
      });
      if (!engineer) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      const job = await prisma.job.findFirst({
        where: { id: jobId, companyId: authCtx.companyId, engineerId: engineer.id },
        select: { id: true },
      });
      if (!job) {
        return NextResponse.json({ ok: false, error: "Job not found or not assigned to you" }, { status: 404 });
      }

      // Parse multipart form data
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof File)) {
        return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { ok: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, HEIC` },
          { status: 400 },
        );
      }

      // Validate size
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { ok: false, error: "File exceeds 5MB limit" },
          { status: 400 },
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const originalFilename = file.name || "photo.jpg";

      const doc = await createDocument({
        companyId: authCtx.companyId,
        type: "job_photo",
        mimeType: file.type,
        bytes,
        originalFilename,
      });

      return NextResponse.json({ ok: true, document: { id: doc.id, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes } });
    } catch (error: any) {
      if (error instanceof StorageLimitError) {
        return NextResponse.json(
          { ok: false, error: "storage_limit_exceeded", code: "STORAGE_LIMIT_EXCEEDED", bytesUsed: error.bytesUsed, bytesLimit: error.bytesLimit },
          { status: 413 },
        );
      }
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      if (error?.status === 403) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      logError(error, { route: "/api/engineer/jobs/[jobId]/photos", action: "post" });
      return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }
  },
);
