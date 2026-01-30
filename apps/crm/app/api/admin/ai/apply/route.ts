import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { APPLY_ACTIONS, isValidActionId } from "@/lib/ai/applyActions";
import * as repo from "@/lib/server/repo";
import { getPrisma } from "@/lib/server/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ctx = await requireCompanyContext();
    const companyId = ctx.companyId;
    const userId = ctx.userId ?? "";

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "no_company" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const actionId = typeof body?.actionId === "string" ? body.actionId : "";

    if (!isValidActionId(actionId)) {
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
    }

    const action = APPLY_ACTIONS[actionId];
    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Execute the action — all current actions are company settings updates
    await prisma.company.update({
      where: { id: companyId },
      data: action.payload as any,
    });

    // Audit
    repo.recordAuditEvent({
      entityType: "company" as any,
      entityId: companyId,
      action: "ai.apply_action" as any,
      actorRole: "admin",
      actor: userId,
      meta: { actionId, label: action.label },
    }).catch(() => {
      console.info("[ai-apply]", JSON.stringify({ actionId, companyId, userId }));
    });

    return NextResponse.json({ ok: true, actionId, label: action.label });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    console.error("POST /api/admin/ai/apply error:", error);
    return NextResponse.json(
      { ok: false, error: "apply_failed", message: String(error?.message ?? "") },
      { status: 500 },
    );
  }
}
