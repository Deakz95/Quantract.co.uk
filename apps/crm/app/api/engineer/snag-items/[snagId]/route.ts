import { NextResponse } from "next/server";
import { requireRole, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

const STATUSES = new Set(["open", "in_progress", "resolved"]);

export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ snagId: string }> }) {
  try {
    await requireRole("engineer");
    const email = await getUserEmail();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing engineer email" }, { status: 401 });
    }
    const { snagId } = await getRouteParams(ctx);
    const snagItem = await repo.getSnagItemById(snagId);
    if (!snagItem) {
      return NextResponse.json({ ok: false, error: "Snag item not found" }, { status: 404 });
    }
    const job = await repo.getJobForEngineer(snagItem.jobId, email);
    if (!job) {
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
    }
    const body = (await req.json().catch(() => ({}))) as { status?: string };
    if (typeof body.status !== "string" || !STATUSES.has(body.status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }
    const updated = await repo.updateSnagItem(snagId, { status: body.status as "open" | "in_progress" | "resolved" });
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Unable to update snag item" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, snagItem: updated });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[engineer/snag-items/[snagId]]", e);
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
});
