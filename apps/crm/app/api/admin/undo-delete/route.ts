import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { verifyUndoToken, type UndoPayload } from "@/lib/server/undoToken";

export async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const body = await req.json().catch(() => null);
    const { token, payload } = (body ?? {}) as { token?: string; payload?: UndoPayload };

    if (!token || !payload?.entityType || !payload?.entityId) {
      return NextResponse.json({ ok: false, error: "missing_params" }, { status: 400 });
    }

    const check = verifyUndoToken(token, payload, authCtx.companyId);
    if (!check.valid) {
      const status = check.error === "forbidden" ? 403 : 410;
      return NextResponse.json({ ok: false, error: check.error }, { status });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { entityType, entityId } = payload;
    const models: Record<string, any> = {
      client: prisma.client,
      quote: prisma.quote,
      job: prisma.job,
      invoice: prisma.invoice,
    };
    const model = models[entityType];
    if (!model) return NextResponse.json({ ok: false, error: "invalid_entity_type" }, { status: 400 });

    await model.update({ where: { id: entityId }, data: { deletedAt: null } });

    await repo.recordAuditEvent({
      entityType: entityType as any,
      entityId,
      action: `${entityType}.restored` as any,
      actorRole: "admin",
      actor: authCtx.userId,
      meta: { companyId: authCtx.companyId },
    }).catch(() => {});

    return NextResponse.json({ ok: true, restored: true });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("POST /api/admin/undo-delete error:", e);
    return NextResponse.json({ ok: false, error: "restore_failed" }, { status: 500 });
  }
}
