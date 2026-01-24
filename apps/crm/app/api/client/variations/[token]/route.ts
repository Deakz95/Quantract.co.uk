import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await getRouteParams(ctx);
  const variation = await repo.getVariationByToken(token);
  if (!variation) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  await repo.recordAuditEvent({
    entityType: variation.jobId ? "job" : "quote",
    entityId: variation.jobId ?? variation.quoteId ?? variation.id,
    action: "variation.viewed",
    actorRole: "client",
    meta: { variationId: variation.id, token },
  });
  const { notes, ...safeVariation } = variation;
  return NextResponse.json({ ok: true, variation: safeVariation });
}
