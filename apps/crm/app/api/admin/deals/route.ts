import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const url = new URL(req.url);
    const groupByStage = url.searchParams.get("groupByStage") === "true";
    const stageId = url.searchParams.get("stageId");
    const ownerId = url.searchParams.get("ownerId");
    const clientId = url.searchParams.get("clientId");
    const contactId = url.searchParams.get("contactId");
    const search = url.searchParams.get("search");

    const where: any = { companyId: authCtx.companyId };

    if (stageId) {
      where.stageId = stageId;
    }
    if (ownerId) {
      where.ownerId = ownerId;
    }
    if (clientId) {
      where.clientId = clientId;
    }
    if (contactId) {
      where.contactId = contactId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (groupByStage) {
      // Return stages with deals grouped by stage for Kanban view
      const stages = await client.dealStage.findMany({
        where: { companyId: authCtx.companyId },
        orderBy: { sortOrder: "asc" },
      });

      const deals = await client.deal.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        include: {
          stage: { select: { id: true, name: true, color: true } },
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          client: { select: { id: true, name: true, email: true } },
          owner: { select: { id: true, name: true, email: true } },
        },
      });

      // Group deals by stageId
      const dealsByStage: Record<string, typeof deals> = {};
      for (const stage of stages) {
        dealsByStage[stage.id] = [];
      }
      for (const deal of deals) {
        if (dealsByStage[deal.stageId]) {
          dealsByStage[deal.stageId].push(deal);
        }
      }

      return NextResponse.json({ ok: true, stages, dealsByStage });
    }

    // Standard list response
    const deals = await client.deal.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        stage: { select: { id: true, name: true, color: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, deals: deals || [] });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/deals", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/deals", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await getAuthContext();
    if (!authCtx) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (authCtx.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    if (!authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 401 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as any;
    const title = String(body?.title ?? "").trim();
    const stageId = String(body?.stageId ?? "").trim();

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "title_required" },
        { status: 400 }
      );
    }

    if (!stageId) {
      return NextResponse.json(
        { ok: false, error: "stage_id_required" },
        { status: 400 }
      );
    }

    // Verify stage exists and belongs to this company
    const stage = await client.dealStage.findFirst({
      where: { id: stageId, companyId: authCtx.companyId },
    });

    if (!stage) {
      return NextResponse.json(
        { ok: false, error: "invalid_stage" },
        { status: 400 }
      );
    }

    // Verify contact if provided
    if (body?.contactId) {
      const contact = await client.contact.findFirst({
        where: { id: body.contactId, companyId: authCtx.companyId },
      });
      if (!contact) {
        return NextResponse.json(
          { ok: false, error: "invalid_contact" },
          { status: 400 }
        );
      }
    }

    // Verify client if provided
    if (body?.clientId) {
      const clientRecord = await client.client.findFirst({
        where: { id: body.clientId, companyId: authCtx.companyId },
      });
      if (!clientRecord) {
        return NextResponse.json(
          { ok: false, error: "invalid_client" },
          { status: 400 }
        );
      }
    }

    // Verify owner if provided
    if (body?.ownerId) {
      const owner = await client.user.findFirst({
        where: { id: body.ownerId, companyId: authCtx.companyId },
      });
      if (!owner) {
        return NextResponse.json(
          { ok: false, error: "invalid_owner" },
          { status: 400 }
        );
      }
    }

    const dealId = randomUUID();
    const created = await client.deal.create({
      data: {
        id: dealId,
        companyId: authCtx.companyId,
        stageId,
        title,
        contactId: body?.contactId || null,
        clientId: body?.clientId || null,
        ownerId: body?.ownerId || null,
        value: body?.value != null ? Number(body.value) : 0,
        probability: body?.probability != null ? Number(body.probability) : (stage.probability || null),
        expectedCloseDate: body?.expectedCloseDate ? new Date(body.expectedCloseDate) : null,
        notes: body?.notes ? String(body.notes).trim() : null,
        source: body?.source ? String(body.source).trim() : "manual",
        updatedAt: new Date(),
      },
      include: {
        stage: { select: { id: true, name: true, color: true } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit event
    await repo.recordAuditEvent({
      entityType: "deal",
      entityId: created.id,
      action: "deal.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: { title, stageId, value: body?.value },
    });

    return NextResponse.json({ ok: true, deal: created });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/deals", action: "create" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/deals", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
