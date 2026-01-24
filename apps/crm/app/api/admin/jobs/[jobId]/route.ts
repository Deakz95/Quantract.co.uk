import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

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
