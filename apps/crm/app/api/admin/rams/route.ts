import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { ramsContentSchema } from "@/lib/tools/rams-generator";
import { safetyAssessmentContentSchema } from "@/lib/tools/safety-assessment";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * GET /api/admin/rams
 * List RAMS / Safety Assessment documents for the company.
 * Query params: type ("rams"|"safety-assessment"), page, pageSize, status
 */
export async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office" && role !== "engineer") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const jobId = url.searchParams.get("jobId") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10)));

    const where: Record<string, unknown> = { companyId: authCtx.companyId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (jobId) where.jobId = jobId;

    const [documents, total] = await Promise.all([
      prisma.ramsDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          title: true,
          status: true,
          version: true,
          jobId: true,
          clientId: true,
          preparedBy: true,
          reviewedBy: true,
          issuedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.ramsDocument.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: documents,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "Forbidden" }, { status: err.status });
    }
    console.error("[GET /api/admin/rams]", error);
    return NextResponse.json({ ok: false, error: "Failed to load documents" }, { status: 500 });
  }
}

/**
 * POST /api/admin/rams
 * Create a new draft RAMS or Safety Assessment document.
 * Body: { type, title, contentJson?, jobId?, clientId? }
 */
export async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }

    const type = String(body.type || "").trim();
    if (type !== "rams" && type !== "safety-assessment") {
      return NextResponse.json(
        { ok: false, error: 'type must be "rams" or "safety-assessment"' },
        { status: 400 },
      );
    }

    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json({ ok: false, error: "title is required" }, { status: 400 });
    }

    // Validate contentJson if provided
    let contentJson = body.contentJson ?? null;
    if (contentJson) {
      const schema = type === "rams" ? ramsContentSchema : safetyAssessmentContentSchema;
      const parsed = schema.safeParse(contentJson);
      if (!parsed.success) {
        return NextResponse.json(
          { ok: false, error: "Invalid content", details: parsed.error.flatten().fieldErrors },
          { status: 400 },
        );
      }
      contentJson = parsed.data;
    }

    // Verify job belongs to company if provided
    const jobId = body.jobId ? String(body.jobId).trim() : null;
    if (jobId) {
      const job = await prisma.job.findFirst({
        where: { id: jobId, companyId: authCtx.companyId },
        select: { id: true },
      });
      if (!job) {
        return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
      }
    }

    // Verify client belongs to company if provided
    const clientId = body.clientId ? String(body.clientId).trim() : null;
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, companyId: authCtx.companyId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ ok: false, error: "Client not found" }, { status: 404 });
      }
    }

    const document = await prisma.ramsDocument.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        createdById: authCtx.userId,
        type,
        title,
        status: "draft",
        version: 1,
        contentJson: contentJson ? (contentJson as any) : undefined,
        jobId,
        clientId,
        preparedBy: body.preparedBy ? String(body.preparedBy) : null,
        reviewedBy: body.reviewedBy ? String(body.reviewedBy) : null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, data: document }, { status: 201 });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "Forbidden" }, { status: err.status });
    }
    console.error("[POST /api/admin/rams]", error);
    return NextResponse.json({ ok: false, error: "Failed to create document" }, { status: 500 });
  }
}
