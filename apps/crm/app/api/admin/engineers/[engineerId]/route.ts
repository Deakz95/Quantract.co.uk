import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function PATCH(req: Request, ctx: { params: Promise<{ engineerId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { engineerId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;
  const rateCardId = typeof body?.rateCardId === "string" ? body.rateCardId : "";
  const updated = await repo.setEngineerRateCard(engineerId, rateCardId || undefined);
  if (!updated) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 400 });
  return NextResponse.json({ ok: true, engineer: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ engineerId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { engineerId } = await getRouteParams(ctx);
  const deleted = await repo.deactivateEngineer(engineerId);
  if (!deleted) return NextResponse.json({ ok: false, error: "delete_failed" }, { status: 400 });
  return NextResponse.json({ ok: true, deleted: true });
}
