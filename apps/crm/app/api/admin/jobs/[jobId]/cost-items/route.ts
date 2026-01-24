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
  const items = await repo.listCostItems(jobId);
  return NextResponse.json({ ok: true, costItems: items });
}

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;
  const description = String(body?.description ?? "").trim();
  const type = String(body?.type ?? "material").trim();
  if (!description) return NextResponse.json({ ok: false, error: "Missing description" }, { status: 400 });
  const item = await repo.addCostItem({
    jobId,
    type: type as any,
    supplier: typeof body?.supplier === "string" ? body.supplier : undefined,
    description,
    quantity: typeof body?.quantity === "number" ? body.quantity : undefined,
    unitCost: typeof body?.unitCost === "number" ? body.unitCost : undefined,
    markupPct: typeof body?.markupPct === "number" ? body.markupPct : undefined,
    stageId: typeof body?.stageId === "string" ? body.stageId : undefined,
    source: typeof body?.source === "string" ? body.source : undefined,
    lockStatus: typeof body?.lockStatus === "string" ? body.lockStatus : undefined,
    incurredAtISO: typeof body?.incurredAtISO === "string" ? body.incurredAtISO : undefined,
  });
  if (!item) return NextResponse.json({ ok: false, error: "Could not create cost item" }, { status: 500 });
  return NextResponse.json({ ok: true, item });
}
