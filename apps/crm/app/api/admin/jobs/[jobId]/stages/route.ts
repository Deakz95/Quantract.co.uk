import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";

type Ctx = { params: Promise<{ jobId: string }> };

export const GET = withRequestLogging(async function GET(_req: Request, ctx: Ctx) {
  await requireRole("admin");
  const { jobId } = await ctx.params;
  const stages = await repo.listJobStages(jobId);
  return NextResponse.json({
    ok: true,
    stages
  });
});
export const POST = withRequestLogging(async function POST(req: Request, ctx: Ctx) {
  await requireRole("admin");
  const { jobId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as any;
  const template = body?.template === "install" ? "install" : "reactive";
  const stages = await repo.ensureJobStagesTemplate(jobId, template);
  return NextResponse.json({
    ok: true,
    stages
  });
});
