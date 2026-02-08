import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { buildIssueHistory } from "@quantract/shared/certificate-types";

export const runtime = "nodejs";

/** GET: full issue & distribution history for a certificate (CERT-A24) */
export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId } = await getRouteParams(ctx);

    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, companyId: authCtx.companyId },
      select: { id: true },
    });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    // Fetch audit events for this certificate
    const auditRows = await prisma.auditEvent.findMany({
      where: { entityType: "certificate", entityId: certificateId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        action: true,
        actor: true,
        actorRole: true,
        meta: true,
        createdAt: true,
      },
    });

    const auditEvents = auditRows.map((r: any) => ({
      action: r.action as string,
      createdAt: r.createdAt?.toISOString?.() ?? new Date().toISOString(),
      actorName: r.actor ?? undefined,
      meta: (r.meta ?? {}) as Record<string, unknown>,
    }));

    const history = buildIssueHistory(auditEvents);

    return NextResponse.json({ ok: true, history });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
