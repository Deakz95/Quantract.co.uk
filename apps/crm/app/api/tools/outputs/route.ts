export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { TOOL_SLUGS } from "@/lib/tools/types";
import { randomUUID } from "crypto";
import { z } from "zod";

const MAX_JSON_SIZE = 64_000; // 64 KB per field

const createSchema = z.object({
  toolSlug: z.enum(TOOL_SLUGS),
  name: z.string().min(1).max(200),
  inputsJson: z.record(z.string(), z.unknown()).refine(
    (v) => JSON.stringify(v).length <= MAX_JSON_SIZE,
    { message: `inputsJson too large (max ${MAX_JSON_SIZE / 1000} KB)` },
  ),
  outputsJson: z.record(z.string(), z.unknown()).refine(
    (v) => JSON.stringify(v).length <= MAX_JSON_SIZE,
    { message: `outputsJson too large (max ${MAX_JSON_SIZE / 1000} KB)` },
  ),
  jobId: z.string().optional(),
  clientId: z.string().optional(),
  certificateId: z.string().optional(),
});

/**
 * GET /api/tools/outputs
 * List saved tool outputs for the company.
 * Query params: toolSlug, jobId, clientId, certificateId, page, pageSize
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { searchParams } = new URL(req.url);
    const toolSlug = searchParams.get("toolSlug");
    const jobId = searchParams.get("jobId");
    const clientId = searchParams.get("clientId");
    const certificateId = searchParams.get("certificateId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));

    const where: Record<string, unknown> = { companyId: ctx.companyId };
    if (toolSlug) where.toolSlug = toolSlug;
    if (jobId) where.jobId = jobId;
    if (clientId) where.clientId = clientId;
    if (certificateId) where.certificateId = certificateId;

    const [outputs, total] = await Promise.all([
      prisma.toolOutput.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.toolOutput.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      data: outputs,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "forbidden" }, { status: error.status });
    }
    console.error("[GET /api/tools/outputs]", error);
    return NextResponse.json({ ok: false, error: "Failed to load outputs" }, { status: 500 });
  }
}

/**
 * POST /api/tools/outputs
 * Save a tool calculation output, optionally linked to a job/client/certificate.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireCompanyContext();
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { toolSlug, name, inputsJson, outputsJson, jobId, clientId, certificateId } = parsed.data;

    // Validate FK references belong to this company
    if (jobId) {
      const job = await prisma.job.findFirst({ where: { id: jobId, companyId: ctx.companyId }, select: { id: true } });
      if (!job) return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, companyId: ctx.companyId }, select: { id: true } });
      if (!client) return NextResponse.json({ ok: false, error: "Client not found" }, { status: 404 });
    }
    if (certificateId) {
      const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: ctx.companyId }, select: { id: true } });
      if (!cert) return NextResponse.json({ ok: false, error: "Certificate not found" }, { status: 404 });
    }

    const outputId = randomUUID();
    const output = await prisma.toolOutput.create({
      data: {
        id: outputId,
        companyId: ctx.companyId,
        userId: ctx.userId,
        toolSlug,
        name,
        inputsJson,
        outputsJson,
        jobId: jobId ?? null,
        clientId: clientId ?? null,
        certificateId: certificateId ?? null,
      },
    });

    // Audit trail
    await prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        companyId: ctx.companyId,
        entityType: "tool_output",
        entityId: outputId,
        action: "tool_output.saved",
        actorRole: "admin",
        meta: { toolSlug, name, jobId, clientId, certificateId },
      },
    }).catch(() => {});

    return NextResponse.json({ ok: true, data: output }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ ok: false, error: error.message || "forbidden" }, { status: error.status });
    }
    console.error("[POST /api/tools/outputs]", error);
    return NextResponse.json({ ok: false, error: "Failed to save output" }, { status: 500 });
  }
}
