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
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { workingDaysPerMonth: true },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      workingDaysPerMonth: company?.workingDaysPerMonth ?? 22,
    },
  });
});

export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  try { await requireRole("admin"); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let companyId: string;
  try { companyId = await requireCompanyId(); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const data: Record<string, number> = {};
  if (typeof body.workingDaysPerMonth === "number") {
    data.workingDaysPerMonth = Math.min(26, Math.max(20, Math.round(body.workingDaysPerMonth)));
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  await prisma.company.update({
    where: { id: companyId },
    data,
  });

  return NextResponse.json({ ok: true, settings: data });
});
