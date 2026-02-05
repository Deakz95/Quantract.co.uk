import { NextResponse } from "next/server";
import { getUserEmail, requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { certificateIsReadyForCompletion } from "@/lib/certificates";
import { getRouteParams } from "@/lib/server/routeParams";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";
import { withRequestLogging } from "@/lib/server/observability";

export const POST = withRequestLogging(async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("engineer");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing engineer context" }, { status: 401 });
  }
  // Rate limit by authenticated user
  const rl = rateLimitEngineerWrite(email);
  if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });
  const { certificateId } = await getRouteParams(ctx);
  const info = await repo.getCertificateForEngineer(certificateId, email);
  if (!info) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (info.certificate.status === "void" || info.certificate.status === "issued") {
    return NextResponse.json({ ok: false, error: "Certificate cannot be completed." }, { status: 400 });
  }
  const readiness = certificateIsReadyForCompletion(info.certificate.data);
  if (!readiness.ok) {
    return NextResponse.json({ ok: false, error: `Missing ${readiness.missing.join(", ")}` }, { status: 400 });
  }
  const cert = await repo.completeCertificate(certificateId, "engineer");
  if (!cert) return NextResponse.json({ ok: false, error: "Unable to complete certificate" }, { status: 400 });
  return NextResponse.json({ ok: true, certificate: cert });
});
