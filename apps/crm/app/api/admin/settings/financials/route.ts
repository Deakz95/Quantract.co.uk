import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import * as repo from "@/lib/server/repo";

export const runtime = "nodejs";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_BITS = [1, 2, 4, 8, 16, 32, 64];

function maskToDayNames(mask: number): string[] {
  return DAY_NAMES.filter((_, i) => mask & DAY_BITS[i]);
}

export const GET = withRequestLogging(async function GET() {
  let authCtx;
  try { authCtx = await requireCompanyContext(); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (authCtx.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: authCtx.companyId },
    select: { workingDaysPerMonth: true, workingDaysMask: true },
  });

  return NextResponse.json({
    ok: true,
    settings: {
      workingDaysPerMonth: company?.workingDaysPerMonth ?? 22,
      workingDaysMask: company?.workingDaysMask ?? 31,
    },
  });
});

export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  let authCtx;
  try { authCtx = await requireCompanyContext(); } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (authCtx.role !== "admin") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  // Load current values for audit comparison
  const current = await prisma.company.findUnique({
    where: { id: authCtx.companyId },
    select: { workingDaysPerMonth: true, workingDaysMask: true },
  });
  const oldWdpm = current?.workingDaysPerMonth ?? 22;
  const oldMask = current?.workingDaysMask ?? 31;

  const data: Record<string, number> = {};
  if (typeof body.workingDaysPerMonth === "number") {
    data.workingDaysPerMonth = Math.min(26, Math.max(20, Math.round(body.workingDaysPerMonth)));
  }
  if (typeof body.workingDaysMask === "number") {
    data.workingDaysMask = Math.min(127, Math.max(1, Math.round(body.workingDaysMask))) & 127;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: "no_changes" }, { status: 400 });
  }

  await prisma.company.update({
    where: { id: authCtx.companyId },
    data,
  });

  // Audit events
  const newWdpm = data.workingDaysPerMonth ?? oldWdpm;
  const newMask = data.workingDaysMask ?? oldMask;

  if (data.workingDaysPerMonth !== undefined && newWdpm !== oldWdpm) {
    await repo.recordAuditEvent({
      entityType: "company",
      entityId: authCtx.companyId,
      action: "financials.working_days_updated",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        old: oldWdpm,
        new: newWdpm,
        userId: authCtx.userId,
        companyId: authCtx.companyId,
      },
    });
  }

  if (data.workingDaysMask !== undefined && newMask !== oldMask) {
    await repo.recordAuditEvent({
      entityType: "company",
      entityId: authCtx.companyId,
      action: "financials.working_days_mask_updated",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        oldMask,
        newMask,
        oldDays: maskToDayNames(oldMask),
        newDays: maskToDayNames(newMask),
        userId: authCtx.userId,
        companyId: authCtx.companyId,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    settings: {
      workingDaysPerMonth: newWdpm,
      workingDaysMask: newMask,
    },
  });
});
