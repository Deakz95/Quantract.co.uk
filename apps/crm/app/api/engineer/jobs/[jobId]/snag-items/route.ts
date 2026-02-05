import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const GET = withRequestLogging(async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing engineer email" }, { status: 401 });
    }
    const { jobId } = await getRouteParams(ctx);
    const job = await repo.getJobForEngineer(jobId, email);
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }
    const snagItems = await repo.listSnagItemsForJob(jobId);
    return NextResponse.json({ ok: true, snagItems });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[engineer/snag-items]", e);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing engineer email" }, { status: 401 });
    }

    // Rate limit by authenticated user
    const rl = rateLimitEngineerWrite(email);
    if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });

    const { jobId } = await getRouteParams(ctx);
    const job = await repo.getJobForEngineer(jobId, email);
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }
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
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[engineer/snag-items]", e);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
});
