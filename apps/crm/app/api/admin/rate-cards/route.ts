import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

export async function GET() {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const rateCards = await repo.listRateCards();
  return NextResponse.json({ ok: true, rateCards });
}

export async function POST(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as any;
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "Missing name" }, { status: 400 });
  const rateCard = await repo.createRateCard({
    name,
    costRatePerHour: typeof body?.costRatePerHour === "number" ? body.costRatePerHour : undefined,
    chargeRatePerHour: typeof body?.chargeRatePerHour === "number" ? body.chargeRatePerHour : undefined,
    isDefault: Boolean(body?.isDefault),
  });
  if (!rateCard) return NextResponse.json({ ok: false, error: "create_failed" }, { status: 400 });
  return NextResponse.json({ ok: true, rateCard });
}
