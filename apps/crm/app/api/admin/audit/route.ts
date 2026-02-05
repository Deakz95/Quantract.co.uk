export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

/**
 * GET /api/admin/audit
 *
 * Returns paginated audit events with resolved actor/entity names so the
 * front-end never needs to display raw UUIDs.
 *
 * Query params:
 *   entityType  - filter by entity type (or "impersonation" for impersonation logs)
 *   action      - filter by action (substring match)
 *   from        - ISO date lower bound
 *   to          - ISO date upper bound
 *   page        - page number (default 1)
 *   limit       - page size (default 50, max 200)
 */
export const GET = withRequestLogging(async function GET(req: NextRequest) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const url = new URL(req.url);

    // ---- Parse query params ----
    const entityType = url.searchParams.get("entityType") || undefined;
    const action = url.searchParams.get("action") || undefined;
    const from = url.searchParams.get("from") || undefined;
    const to = url.searchParams.get("to") || undefined;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // ---- Build date range ----
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);

    // ---- Determine whether to include impersonation logs ----
    const includeImpersonation = !entityType || entityType === "impersonation";
    const includeAuditEvents = entityType !== "impersonation";

    // ---- Query audit events ----
    let events: any[] = [];
    let auditTotal = 0;

    if (includeAuditEvents) {
      const where: any = { companyId: cid };
      if (entityType) where.entityType = entityType;
      if (action) where.action = { contains: action, mode: "insensitive" };
      if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;

      const [rows, count] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      events = rows.map((r: any) => ({
        id: r.id,
        type: "audit",
        entityType: r.entityType,
        entityId: r.entityId,
        action: r.action,
        actorRole: r.actorRole,
        actor: r.actor,
        meta: r.meta,
        createdAt: r.createdAt,
        quoteId: r.quoteId,
        agreementId: r.agreementId,
        invoiceId: r.invoiceId,
        jobId: r.jobId,
        certificateId: r.certificateId,
      }));
      auditTotal = count;
    }

    // ---- Query impersonation logs (merged into the same stream) ----
    let impersonationEvents: any[] = [];
    let impersonationTotal = 0;

    if (includeImpersonation) {
      const impWhere: any = { companyId: cid };
      if (Object.keys(dateFilter).length > 0) impWhere.startedAt = dateFilter;

      const [impRows, impCount] = await Promise.all([
        prisma.impersonation_logs.findMany({
          where: impWhere,
          include: {
            adminUser: { select: { id: true, name: true, email: true } },
            targetUser: { select: { id: true, name: true, email: true } },
          },
          orderBy: { startedAt: "desc" },
          take: entityType === "impersonation" ? limit : 20,
          skip: entityType === "impersonation" ? skip : 0,
        }),
        prisma.impersonation_logs.count({ where: impWhere }),
      ]);

      impersonationEvents = impRows.map((r: any) => ({
        id: r.id,
        type: "impersonation",
        entityType: "impersonation",
        entityId: r.id,
        action: r.endedAt ? "impersonation_ended" : "impersonation_active",
        actorRole: "admin",
        actor: r.adminUserId,
        meta: {
          targetUserId: r.targetUserId,
          targetName: r.targetUser?.name || r.targetUser?.email || r.targetUserId.slice(0, 8),
          adminName: r.adminUser?.name || r.adminUser?.email || r.adminUserId.slice(0, 8),
          reason: r.reason,
          startedAt: r.startedAt,
          endedAt: r.endedAt,
        },
        createdAt: r.startedAt,
      }));
      impersonationTotal = impCount;
    }

    // ---- Merge & sort by date desc ----
    let allEvents: any[];
    let total: number;

    if (entityType === "impersonation") {
      allEvents = impersonationEvents;
      total = impersonationTotal;
    } else if (entityType && entityType !== "impersonation") {
      allEvents = events;
      total = auditTotal;
    } else {
      // No entityType filter: merge both, re-sort, take page-sized slice
      const merged = [...events, ...impersonationEvents];
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      allEvents = merged.slice(0, limit);
      total = auditTotal + impersonationTotal;
    }

    // ---- Resolve actor names (User IDs -> names) ----
    const actorIds = new Set<string>();
    for (const e of allEvents) {
      if (e.actor) actorIds.add(e.actor);
    }

    const actorNames: Record<string, string> = {};
    if (actorIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: [...actorIds] } },
        select: { id: true, name: true, email: true },
      });
      for (const u of users) {
        actorNames[u.id] = u.name || u.email || u.id.slice(0, 8);
      }
      // Fill fallbacks for any IDs not found
      for (const id of actorIds) {
        if (!actorNames[id]) actorNames[id] = id.slice(0, 8);
      }
    }

    // Also add impersonation actor names from the included relation data
    for (const e of impersonationEvents) {
      if (e.meta?.adminName && e.actor) {
        actorNames[e.actor] = e.meta.adminName;
      }
    }

    // ---- Resolve entity names (entityId -> human-readable label) ----
    const entityIds: Record<string, Set<string>> = {};
    for (const e of allEvents) {
      if (e.entityId && e.entityType !== "impersonation") {
        if (!entityIds[e.entityType]) entityIds[e.entityType] = new Set();
        entityIds[e.entityType].add(e.entityId);
      }
    }

    const entityNames: Record<string, string> = {};

    // Best-effort resolution by entity type
    const resolvers: Array<Promise<void>> = [];

    if (entityIds.quote?.size) {
      resolvers.push(
        prisma.quote
          .findMany({
            where: { id: { in: [...entityIds.quote] }, companyId: cid },
            select: { id: true, quoteNumber: true, reference: true, clientName: true },
          })
          .then((rows: any[]) => {
            for (const r of rows) {
              entityNames[r.id] = r.reference || r.quoteNumber || `Quote ${r.clientName}` || r.id.slice(0, 8);
            }
          })
      );
    }

    if (entityIds.job?.size) {
      resolvers.push(
        prisma.job
          .findMany({
            where: { id: { in: [...entityIds.job] }, companyId: cid },
            select: { id: true, title: true, jobNumber: true },
          })
          .then((rows: any[]) => {
            for (const r of rows) {
              entityNames[r.id] = r.title || (r.jobNumber ? `Job #${r.jobNumber}` : r.id.slice(0, 8));
            }
          })
      );
    }

    if (entityIds.invoice?.size) {
      resolvers.push(
        prisma.invoice
          .findMany({
            where: { id: { in: [...entityIds.invoice] }, companyId: cid },
            select: { id: true, invoiceNumber: true, clientName: true },
          })
          .then((rows: any[]) => {
            for (const r of rows) {
              entityNames[r.id] = r.invoiceNumber || `Invoice for ${r.clientName}` || r.id.slice(0, 8);
            }
          })
      );
    }

    if (entityIds.certificate?.size) {
      resolvers.push(
        prisma.certificate
          .findMany({
            where: { id: { in: [...entityIds.certificate] }, companyId: cid },
            select: { id: true, certificateNumber: true, type: true },
          })
          .then((rows: any[]) => {
            for (const r of rows) {
              entityNames[r.id] = r.certificateNumber || `${r.type} cert` || r.id.slice(0, 8);
            }
          })
      );
    }

    if (entityIds.user?.size) {
      resolvers.push(
        prisma.user
          .findMany({
            where: { id: { in: [...entityIds.user] } },
            select: { id: true, name: true, email: true },
          })
          .then((rows: any[]) => {
            for (const r of rows) {
              entityNames[r.id] = r.name || r.email || r.id.slice(0, 8);
            }
          })
      );
    }

    if (entityIds.agreement?.size) {
      resolvers.push(
        prisma.agreement
          .findMany({
            where: { id: { in: [...entityIds.agreement] }, companyId: cid },
            select: { id: true, signerName: true, status: true },
          })
          .then((rows: any[]) => {
            for (const r of rows) {
              entityNames[r.id] = r.signerName ? `Agreement (${r.signerName})` : `Agreement (${r.status})`;
            }
          })
      );
    }

    await Promise.all(resolvers);

    // Fill fallbacks for any entity IDs not resolved
    for (const e of allEvents) {
      if (e.entityId && !entityNames[e.entityId] && e.entityType !== "impersonation") {
        entityNames[e.entityId] = `${e.entityType} ${e.entityId.slice(0, 8)}`;
      }
    }

    return NextResponse.json({
      ok: true,
      events: allEvents,
      total,
      page,
      pageSize: limit,
      actorNames,
      entityNames,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/audit", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
