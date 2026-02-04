import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { formatAuditDescription, formatActorLabel } from "@/lib/auditLabels";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const clientId = searchParams.get("clientId");

    if (!jobId && !clientId) {
      return NextResponse.json({ ok: false, error: "jobId or clientId required" }, { status: 400 });
    }

    const companyId = authCtx.companyId;

    const events = await prisma.auditEvent.findMany({
      where: {
        companyId,
        ...(jobId ? { jobId } : {}),
        ...(clientId ? { OR: [
          { quote: { clientId } },
          { invoice: { clientId } },
          { job: { clientId } },
          { certificate: { clientId } },
        ] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        action: true,
        entityType: true,
        actorRole: true,
        createdAt: true,
        meta: true,
        quote: { select: { id: true, clientName: true } },
        invoice: { select: { id: true, invoiceNumber: true, clientName: true } },
        job: { select: { id: true, title: true } },
        certificate: { select: { id: true, certificateNumber: true } },
      },
    });

    const items = events.map((e: any) => {
      const description = formatAuditDescription({
        entityType: e.entityType,
        action: e.action,
        job: e.job,
        quote: e.quote,
        invoice: e.invoice,
        certificate: e.certificate,
      });

      // Resolve actor to human-readable label.
      // meta.actorName is populated by some flows; actorRole is always present.
      const actorName = e.meta?.actorName ?? null;
      const actorId = e.meta?.actor ?? e.meta?.createdBy ?? null;
      const actor = formatActorLabel(e.actorRole, actorName, actorId);

      return {
        id: e.id,
        entityType: e.entityType,
        action: e.action,
        description,
        actor: actor.displayName,
        actorId: actor.actorId,
        timestamp: e.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
