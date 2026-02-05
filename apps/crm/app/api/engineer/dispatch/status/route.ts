import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError, logCriticalAction } from "@/lib/server/observability";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const runtime = "nodejs";

const VALID_STATUSES = ["scheduled", "en_route", "on_site", "in_progress", "completed"] as const;
type DispatchStatus = typeof VALID_STATUSES[number];

// Valid transitions: scheduled → en_route → on_site → in_progress → completed
const ALLOWED_TRANSITIONS: Record<string, DispatchStatus[]> = {
  scheduled: ["en_route", "on_site", "in_progress"],
  en_route: ["on_site", "in_progress"],
  on_site: ["in_progress"],
  in_progress: ["completed"],
};

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "engineer" && role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // Rate limit by authenticated user
    const rl = rateLimitEngineerWrite(authCtx.email);
    if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });

    const prisma = getPrisma();
    const cid = authCtx.companyId;

    const body = await req.json().catch(() => ({}));
    const entryId = String(body.entryId || "").trim();
    const newStatus = String(body.status || "").trim() as DispatchStatus;
    const idempotencyKey = body.idempotencyKey ? String(body.idempotencyKey).trim() : null;

    if (!entryId || !newStatus) {
      return NextResponse.json({ ok: false, error: "entryId and status are required" }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, error: "invalid_status", valid: VALID_STATUSES },
        { status: 400 },
      );
    }

    // Find the engineer by auth email
    const engineer = await prisma.engineer.findFirst({
      where: { companyId: cid, email: authCtx.email },
    });
    if (!engineer) {
      return NextResponse.json({ ok: false, error: "engineer_not_found" }, { status: 404 });
    }

    // Find the schedule entry (must belong to this engineer and company)
    const entry = await prisma.scheduleEntry.findFirst({
      where: { id: entryId, companyId: cid, engineerId: engineer.id, deletedAt: null },
    });
    if (!entry) {
      return NextResponse.json({ ok: false, error: "entry_not_found" }, { status: 404 });
    }

    // Idempotency check: if already at target status, return success
    if (entry.status === newStatus) {
      return NextResponse.json({ ok: true, entry: { id: entry.id, status: entry.status }, idempotent: true });
    }

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[entry.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        { ok: false, error: "invalid_transition", from: entry.status, to: newStatus, allowed },
        { status: 422 },
      );
    }

    // Update status
    const updated = await prisma.scheduleEntry.update({
      where: { id: entryId },
      data: { status: newStatus },
    });

    logCriticalAction({
      name: "dispatch.status.updated",
      companyId: cid,
      metadata: {
        scheduleEntryId: entryId,
        engineerId: engineer.id,
        from: entry.status,
        to: newStatus,
        idempotencyKey,
      },
    });

    return NextResponse.json({
      ok: true,
      entry: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/engineer/dispatch/status", action: "post" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
