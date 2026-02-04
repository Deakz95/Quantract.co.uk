import { NextResponse } from "next/server";
import { requireRoles, requireCompanyContext } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";
import { createUndoToken } from "@/lib/server/undoToken";
import { addBusinessBreadcrumb } from "@/lib/server/observability";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await getRouteParams(ctx);
  const job = await repo.getJobById(jobId);
  if (!job) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, job });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;
  const patch: any = {};
  if (typeof body?.engineerEmail === "string") patch.engineerEmail = body.engineerEmail.trim().toLowerCase();
  if (typeof body?.status === "string") patch.status = body.status;
  if (typeof body?.scheduledAtISO === "string") patch.scheduledAtISO = body.scheduledAtISO;
  if (typeof body?.notes === "string") patch.notes = body.notes;

  const job = await repo.updateJob(jobId, patch);
  if (!job) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  addBusinessBreadcrumb("job.updated", { jobId, fields: Object.keys(patch) });
  return NextResponse.json({ ok: true, job });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const { jobId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const job = await prisma.job.findFirst({ where: { id: jobId, companyId: authCtx.companyId, deletedAt: null } });
    if (!job) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    await prisma.job.update({ where: { id: jobId }, data: { deletedAt: new Date() } });
    addBusinessBreadcrumb("job.deleted", { jobId });

    const undo = createUndoToken(authCtx.companyId, authCtx.userId, "job", jobId);

    await repo.recordAuditEvent({
      entityType: "job" as any,
      entityId: jobId,
      action: "job.soft_deleted" as any,
      actorRole: "admin",
      actor: authCtx.userId,
      meta: { companyId: authCtx.companyId },
    }).catch(() => {});

    return NextResponse.json({ ok: true, deleted: true, undo });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("DELETE /api/admin/jobs/[jobId] error:", e);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
