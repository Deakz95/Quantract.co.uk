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
  const lines = await repo.listJobBudgetLines(jobId);
  return NextResponse.json({ ok: true, lines });
}

export async function PUT(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;
  const lines = Array.isArray(body?.lines) ? body.lines : [];
  const updated = await repo.replaceJobBudgetLines(jobId, lines);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 400 });
  return NextResponse.json({ ok: true, lines: updated });
}

export async function POST(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await getRouteParams(ctx);
  const lines = await repo.resetJobBudgetLinesFromQuote(jobId);
  if (!lines) return NextResponse.json({ ok: false, error: "reset_failed" }, { status: 400 });
  return NextResponse.json({ ok: true, lines });
}
