import { NextResponse } from "next/server";
import { requireRoles, requireCompanyContext } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import { getPrisma } from "@/lib/server/prisma";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

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
  return NextResponse.json({ ok: true, job });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const { jobId } = await getRouteParams(ctx);
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const job = await prisma.job.findUnique({ where: { id: jobId }, select: { id: true, companyId: true } });
    if (!job || job.companyId !== authCtx.companyId) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.auditEvent.deleteMany({ where: { entityType: "job", entityId: jobId } });
      await tx.scheduleEntry.deleteMany({ where: { jobId } });
      await tx.jobBudgetLine.deleteMany({ where: { jobId } });
      await tx.jobStage.deleteMany({ where: { jobId } });
      await tx.timeEntry.deleteMany({ where: { jobId } });
      await tx.snagItem.deleteMany({ where: { jobId } });
      await tx.costItem.deleteMany({ where: { jobId } });
      await tx.comment.deleteMany({ where: { jobId } });
      await tx.task.deleteMany({ where: { jobId } });
      await tx.jobChecklist.deleteMany({ where: { jobId } });
      await tx.variation.deleteMany({ where: { jobId } });
      await tx.job.delete({ where: { id: jobId } });
    });

    await repo.recordAuditEvent({
      entityType: "job" as any,
      entityId: jobId,
      action: "job.deleted" as any,
      actorRole: "admin",
      actor: authCtx.userId,
      meta: { companyId: authCtx.companyId },
    }).catch(() => {});

    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2003") {
      return NextResponse.json({ ok: false, error: "cannot_delete", message: "Cannot delete this job because it is linked to invoices or certificates. Remove linked records first." }, { status: 409 });
    }
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("DELETE /api/admin/jobs/[jobId] error:", e);
    return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 500 });
  }
}
