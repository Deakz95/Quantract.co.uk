import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const POST = withRequestLogging(async function POST(_req: Request, ctx: { params: Promise<{ billId: string }> }) {
  await requireRole("admin");
  const { billId } = await getRouteParams(ctx);
  const bill = await repo.postSupplierBill(billId);
  if (!bill) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, bill });
});
