import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(
  async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const a = await repo.getAgreementByToken(token);
  if (!a) return NextResponse.json({
    ok: false,
    error: "Not found"
  }, {
    status: 404
  });

  await repo.recordAuditEvent({
    entityType: "agreement",
    entityId: a.id,
    action: "agreement.viewed",
    actorRole: "client",
    actor: a.signerEmail ?? a.quoteSnapshot?.clientEmail,
    meta: { token },
  });

  // Only return what's needed client-side.
  return NextResponse.json({
    ok: true,
    agreement: {
      id: a.id,
      status: a.status,
      templateVersion: a.templateVersion,
      quoteSnapshot: a.quoteSnapshot,
      createdAtISO: a.createdAtISO,
      signedAtISO: a.signedAtISO,
      signerName: a.signerName
    }
  });
});
