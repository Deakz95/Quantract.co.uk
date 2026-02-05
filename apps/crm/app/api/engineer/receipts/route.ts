import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { createDocument, StorageLimitError } from "@/lib/server/documents";
import { randomUUID } from "crypto";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/engineer/receipts
 * Upload a receipt photo/PDF and create an Expense record.
 * Accepts multipart/form-data with a 'file' field + metadata fields.
 */
export const POST = withRequestLogging(
  async function POST(req: Request) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "engineer" && role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      // Rate limit by authenticated user
      const rl = rateLimitEngineerWrite(authCtx.email);
      if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
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
          { ok: false, error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, HEIC, PDF` },
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
      const originalFilename = file.name || "receipt.jpg";

      // Create Document record (enforces storage caps)
      const doc = await createDocument({
        companyId: authCtx.companyId,
        type: "expense_receipt",
        mimeType: file.type,
        bytes,
        originalFilename,
        createdByUserId: authCtx.userId,
      });

      // Read metadata from form fields
      const category = formData.get("category")?.toString() || null;
      const amountStr = formData.get("amount")?.toString();
      const amount = amountStr ? parseInt(amountStr, 10) : null;
      const vatStr = formData.get("vat")?.toString();
      const vatAmount = vatStr ? parseInt(vatStr, 10) : null;
      const supplierName = formData.get("supplierName")?.toString() || null;
      const notes = formData.get("notes")?.toString() || null;
      const jobId = formData.get("jobId")?.toString() || null;

      // Create Expense record linked to the document
      const expense = await prisma.expense.create({
        data: {
          id: randomUUID(),
          companyId: authCtx.companyId,
          status: "UPLOADED",
          category,
          amount,
          vat: vatAmount,
          total: amount,
          supplierName,
          notes,
          jobId,
          documentId: doc.id,
          createdByUserId: authCtx.userId,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        expense: { id: expense.id, documentId: doc.id, status: expense.status },
      });
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
      logError(error, { route: "/api/engineer/receipts", action: "post" });
      return NextResponse.json({ ok: false, error: "Upload failed" }, { status: 500 });
    }
  },
);

/**
 * GET /api/engineer/receipts
 * List expenses created by the authenticated engineer.
 */
export const GET = withRequestLogging(
  async function GET() {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "engineer" && role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const expenses = await prisma.expense.findMany({
        where: {
          companyId: authCtx.companyId,
          createdByUserId: authCtx.userId,
        },
        include: {
          document: { select: { id: true, mimeType: true, originalFilename: true, sizeBytes: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      return NextResponse.json({ ok: true, data: expenses });
    } catch (error: any) {
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      if (error?.status === 403) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
      logError(error, { route: "/api/engineer/receipts", action: "get" });
      return NextResponse.json({ ok: false, error: "Failed to load receipts" }, { status: 500 });
    }
  },
);
