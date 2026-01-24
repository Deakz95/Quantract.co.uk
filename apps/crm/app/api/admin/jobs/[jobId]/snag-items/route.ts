import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const snagItems = await repo.listSnagItemsForJob(jobId);
  return NextResponse.json({ ok: true, snagItems });
});

export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("admin");
  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as { title?: string; description?: string };
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });
  }
  const created = await repo.createSnagItem({ jobId, title, description: body.description?.trim() || undefined });
  if (!created) {
    return NextResponse.json({ ok: false, error: "Unable to create snag item" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, snagItem: created });
});
