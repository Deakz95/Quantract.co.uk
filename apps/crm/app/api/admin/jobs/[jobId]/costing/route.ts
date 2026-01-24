import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await getRouteParams(ctx);
  const url = new URL(req.url);
  const includeUnapproved = url.searchParams.get("include_unapproved") === "1";
  const summary = await repo.getJobCosting(jobId, { includeUnapproved });
  if (!summary) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, costing: summary });
}
