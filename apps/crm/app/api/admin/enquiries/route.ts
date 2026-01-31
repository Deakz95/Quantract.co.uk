import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const enquiries = await client.enquiry.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        pipelineStage: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Map pipelineStage → flat stageName/stageColor for frontend, keep stage for detail page
    const mapped = enquiries.map((e: any) => {
      const { pipelineStage, owner, ...rest } = e;
      return {
        ...rest,
        stage: pipelineStage,
        stageName: pipelineStage?.name ?? "Unknown",
        stageColor: pipelineStage?.color ?? "#6b7280",
        ownerName: owner?.name ?? undefined,
        ownerEmail: owner?.email ?? undefined,
      };
    });

    return NextResponse.json({ ok: true, enquiries: mapped });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/enquiries", action: "list" });

    // Check for missing table errors (migration not applied)
    const errMsg = error instanceof Error ? error.message.toLowerCase() : "";
    if (errMsg.includes("does not exist") || errMsg.includes("table") || errMsg.includes("relation")) {
      return NextResponse.json({ ok: false, error: "Database setup in progress. Please try again later.", enquiries: [] }, { status: 503 });
    }

    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as {
      stageId?: string;
      ownerId?: string;
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      valueEstimate?: number;
    };

    if (!body?.stageId) {
      return NextResponse.json({ ok: false, error: "missing_stage_id" }, { status: 400 });
    }

    const enquiry = await client.enquiry.create({
      data: {
        companyId: authCtx.companyId,
        stageId: body.stageId,
        ownerId: body.ownerId || null,
        name: body.name || null,
        email: body.email || null,
        phone: body.phone || null,
        notes: body.notes || null,
        valueEstimate: body.valueEstimate || null,
      },
      include: {
        pipelineStage: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Map pipelineStage → flat stageName/stageColor for frontend
    const { pipelineStage, owner, ...enquiryRest } = enquiry as any;
    const mappedEnquiry = {
      ...enquiryRest,
      stage: pipelineStage,
      stageName: pipelineStage?.name ?? "Unknown",
      stageColor: pipelineStage?.color ?? "#6b7280",
      ownerName: owner?.name ?? undefined,
      ownerEmail: owner?.email ?? undefined,
    };

    // Audit event for enquiry creation
    await repo.recordAuditEvent({
      entityType: "enquiry",
      entityId: enquiry.id,
      action: "enquiry.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        stageId: body.stageId,
        ownerId: body.ownerId,
        valueEstimate: body.valueEstimate,
      },
    });

    return NextResponse.json({ ok: true, enquiry: mappedEnquiry });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/enquiries", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/enquiries", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
