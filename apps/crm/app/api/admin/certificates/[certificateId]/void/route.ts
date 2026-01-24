import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const POST = withRequestLogging(async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  await requireRole("admin");
  const { certificateId } = await getRouteParams(ctx);
  const cert = await repo.voidCertificate(certificateId);
  if (!cert) return NextResponse.json({
    ok: false,
    error: "not_found"
  }, {
    status: 404
  });
  return NextResponse.json({
    ok: true,
    certificate: cert
  });
});
