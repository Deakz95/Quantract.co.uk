import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(
  async function POST(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  await requireRole("admin");
  const { certificateId } = await getRouteParams(ctx);
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : undefined;
  const cert = await repo.reissueCertificateAsNew(certificateId);
  if (!cert) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });

  // Log re-issue reason (CERT-A24)
  if (reason) {
    await repo.recordAuditEvent({
      entityType: "certificate",
      entityId: certificateId,
      action: "certificate.reissued" as any,
      actorRole: "admin",
      meta: { reason, newCertificateId: cert.id },
    }).catch(() => {});
  }

  return NextResponse.json({
    ok: true,
    certificate: cert
  });
});
