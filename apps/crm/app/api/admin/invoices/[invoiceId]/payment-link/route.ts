import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function POST(_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { invoiceId } = await getRouteParams(ctx);
  const inv = await repo.createPaymentLinkForInvoice(invoiceId);
  if (!inv) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, invoice: inv });
}
