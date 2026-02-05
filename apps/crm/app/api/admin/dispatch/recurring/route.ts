import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError, logCriticalAction } from "@/lib/server/observability";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

// Pattern format: "weekly:1,3,5" (Mon/Wed/Fri) or "monthly:15" (15th of month)
function isValidPattern(p: string): boolean {
  if (p.startsWith("weekly:")) {
    const days = p.slice(7).split(",").map(Number);
    return days.length > 0 && days.every((d) => d >= 0 && d <= 6);
  }
  if (p.startsWith("monthly:")) {
    const day = Number(p.slice(8));
    return day >= 1 && day <= 31;
  }
  return false;
}

export const GET = withRequestLogging(async function GET(_req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;

    const rules = await prisma.recurringSchedule.findMany({
      where: { companyId: cid },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      rules: rules.map((r: any) => ({
        id: r.id,
        jobId: r.jobId,
        engineerId: r.engineerId,
        pattern: r.pattern,
        startTime: r.startTime,
        durationMinutes: r.durationMinutes,
        validFrom: r.validFrom.toISOString(),
        validUntil: r.validUntil?.toISOString() ?? null,
        notes: r.notes,
      })),
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/dispatch/recurring", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const body = await req.json().catch(() => ({}));

    const engineerId = String(body.engineerId || "").trim();
    const pattern = String(body.pattern || "").trim();
    const startTime = String(body.startTime || "").trim();
    const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : 120;
    const validFrom = body.validFrom ? new Date(body.validFrom) : new Date();
    const validUntil = body.validUntil ? new Date(body.validUntil) : null;
    const jobId = body.jobId ? String(body.jobId).trim() : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!engineerId || !pattern || !startTime) {
      return NextResponse.json({ ok: false, error: "engineerId, pattern, startTime required" }, { status: 400 });
    }

    if (!isValidPattern(pattern)) {
      return NextResponse.json({ ok: false, error: "invalid_pattern" }, { status: 400 });
    }

    // Validate engineer belongs to company
    const eng = await prisma.engineer.findFirst({ where: { id: engineerId, companyId: cid } });
    if (!eng) {
      return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 400 });
    }

    const rule = await prisma.recurringSchedule.create({
      data: {
        id: randomUUID(),
        companyId: cid,
        jobId,
        engineerId,
        pattern,
        startTime,
        durationMinutes,
        validFrom,
        validUntil,
        notes,
      },
    });

    logCriticalAction({
      name: "dispatch.recurring.created",
      companyId: cid,
      metadata: { recurringScheduleId: rule.id, engineerId, pattern },
    });

    return NextResponse.json({ ok: true, rule });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/dispatch/recurring", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
