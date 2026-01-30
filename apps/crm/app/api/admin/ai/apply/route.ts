import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { APPLY_ACTIONS, isValidActionId } from "@/lib/ai/applyActions";
import { validateAttrib } from "@/lib/ai/attrib";
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

    const prisma = getPrisma();
    if (!prisma) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    // Paywall: only pro/enterprise can apply
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { plan: true } });
    const plan = (company?.plan ?? "").toLowerCase();
    if (!plan.includes("pro") && !plan.includes("enterprise")) {
      return NextResponse.json({ ok: false, error: "Upgrade required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const actionId = typeof body?.actionId === "string" ? body.actionId : "";
    const attrib = validateAttrib(body?.attrib);

    if (!isValidActionId(actionId)) {
      return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
    }

    const action = APPLY_ACTIONS[actionId];

    // Execute the action — all current actions are company settings updates
    await prisma.company.update({
      where: { id: companyId },
      data: action.payload as any,
    });

    // Audit
    const auditMeta: Record<string, unknown> = { actionId, label: action.label };
    if (attrib) {
      auditMeta.attrib = { source: attrib.source, startedAt: attrib.startedAt, recId: attrib.recId, actionId: attrib.actionId };
    }
    repo.recordAuditEvent({
      entityType: "company" as any,
      entityId: companyId,
      action: "ai.apply_action" as any,
      actorRole: "admin",
      actor: userId,
      meta: auditMeta,
    }).catch(() => {
      console.info("[ai-apply]", JSON.stringify({ actionId, companyId, userId }));
    });

    // Separate attributed audit event for digest funnel reporting
    if (attrib) {
      repo.recordAuditEvent({
        entityType: "company" as any,
        entityId: companyId,
        action: "ai_apply_attributed" as any,
        actorRole: "admin",
        actor: userId,
        meta: {
          source: attrib.source,
          actionId,
          recId: attrib.recId ?? null,
          startedAt: attrib.startedAt,
          appliedAt: Date.now(),
        },
      }).catch(() => {
        console.info("[ai-apply-attrib]", JSON.stringify({ actionId, companyId, userId, source: attrib.source }));
      });
    }

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
