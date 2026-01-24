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
  if (a.status !== "signed") return NextResponse.json({
    ok: false,
    error: "Not signed"
  }, {
    status: 400
  });
  return NextResponse.json({
    ok: true,
    certificate: {
      agreementId: a.id,
      quoteId: a.quoteId,
      signedAtISO: a.signedAtISO,
      signerName: a.signerName,
      signerEmail: a.signerEmail,
      signerIp: a.signerIp,
      signerUserAgent: a.signerUserAgent,
      certificateHash: a.certificateHash,
      templateVersion: a.templateVersion
    }
  });
});
