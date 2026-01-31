import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try { await requireRole("admin"); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const client = getPrisma();
  if (!client) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const overheads = await client.companyOverhead.findMany({
    where: { companyId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, overheads });
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try { await requireRole("admin"); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const client = getPrisma();
  if (!client) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const label = String(body.label ?? "").trim();
  if (!label) return NextResponse.json({ ok: false, error: "label_required" }, { status: 400 });

  const amountPence = typeof body.amountPence === "number" ? Math.max(0, Math.round(body.amountPence)) : 0;
  const frequency = ["monthly", "weekly", "annual"].includes(String(body.frequency)) ? String(body.frequency) : "monthly";

  const overhead = await client.companyOverhead.create({
    data: { companyId, label, amountPence, frequency },
  }).catch(() => null);

  if (!overhead) return NextResponse.json({ ok: false, error: "create_failed" }, { status: 400 });
  return NextResponse.json({ ok: true, overhead });
});

export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  try { await requireRole("admin"); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const client = getPrisma();
  if (!client) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim();
  if (typeof body.amountPence === "number") data.amountPence = Math.max(0, Math.round(body.amountPence));
  if (typeof body.frequency === "string" && ["monthly", "weekly", "annual"].includes(body.frequency)) data.frequency = body.frequency;

  const overhead = await client.companyOverhead.updateMany({
    where: { id, companyId },
    data,
  }).catch(() => null);

  if (!overhead) return NextResponse.json({ ok: false, error: "update_failed" }, { status: 400 });
  return NextResponse.json({ ok: true });
});

export const DELETE = withRequestLogging(async function DELETE(req: Request) {
  try { await requireRole("admin"); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const client = getPrisma();
  if (!client) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id_required" }, { status: 400 });

  await client.companyOverhead.deleteMany({ where: { id, companyId } }).catch(() => null);
  return NextResponse.json({ ok: true });
});
