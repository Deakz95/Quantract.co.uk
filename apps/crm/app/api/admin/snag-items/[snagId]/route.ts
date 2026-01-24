import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

const STATUSES = new Set(["open", "in_progress", "resolved"]);

export const PATCH = withRequestLogging(async function PATCH(req: Request, ctx: { params: Promise<{ snagId: string }> }) {
  await requireRole("admin");
  const { snagId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    description?: string | null;
    status?: string;
  };
  const patch: { title?: string; description?: string | null; status?: "open" | "in_progress" | "resolved" } = {};
  if (typeof body.title === "string") patch.title = body.title.trim();
  if (typeof body.description === "string") patch.description = body.description.trim();
  if (body.description === null) patch.description = null;
  if (typeof body.status === "string") {
    if (!STATUSES.has(body.status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status as "open" | "in_progress" | "resolved";
  }
  const updated = await repo.updateSnagItem(snagId, patch);
  if (!updated) {
    return NextResponse.json({ ok: false, error: "Snag item not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, snagItem: updated });
});
