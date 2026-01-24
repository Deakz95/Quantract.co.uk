import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;
  const signerName = String(body?.signerName ?? "").trim();
  const signerEmail = body?.signerEmail ? String(body.signerEmail).trim() : undefined;
  const accepted = Boolean(body?.acceptedTerms);
  if (!signerName) return NextResponse.json({
    ok: false,
    error: "Missing signerName"
  }, {
    status: 400
  });
  if (!accepted) return NextResponse.json({
    ok: false,
    error: "You must accept terms"
  }, {
    status: 400
  });
  const fwd = req.headers.get("x-forwarded-for");
  const signerIp = fwd ? fwd.split(",")[0]?.trim() : req.headers.get("x-real-ip") || undefined;
  const signerUserAgent = req.headers.get("user-agent") || undefined;
  const a = await repo.signAgreementByToken(token, {
    signerName,
    signerEmail,
    signerIp,
    signerUserAgent
  });
  if (!a) return NextResponse.json({
    ok: false,
    error: "Not found"
  }, {
    status: 404
  });
  return NextResponse.json({
    ok: true,
    agreement: {
      id: a.id,
      status: a.status,
      signedAtISO: a.signedAtISO,
      signerName: a.signerName
    }
  });
});
