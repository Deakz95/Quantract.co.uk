import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { invoiceId } = await getRouteParams(ctx);
  const invoice = await repo.getInvoiceById(invoiceId);
  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ invoice });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { invoiceId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => ({}))) as any;
  const status = typeof body.status === "string" ? body.status : undefined;
  if (!status) return NextResponse.json({ error: "missing_status" }, { status: 400 });

  const invoice = await repo.updateInvoiceStatus(invoiceId, status as any);
  if (!invoice) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ invoice });
}
